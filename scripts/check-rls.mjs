#!/usr/bin/env node
/**
 * Repeatable, read-only Row-Level Security (RLS) regression check.
 *
 * Security invariants:
 * - Default-deny RLS blocks ordinary anon/authenticated Supabase Data API table access.
 * - Server-side Prisma currently connects as the privileged `postgres` role and bypasses RLS.
 * - Clerk authentication and server-side ownership checks remain mandatory across endpoints.
 * - This check verifies current catalog invariants (and isolated migration replay); it does not
 *   verify all database security properties or establish whether historical unauthorized access
 *   never occurred prior to RLS enforcement.
 *
 * Usage:
 *   node scripts/check-rls.mjs           # Isolated PGlite migration replay (default, zero secrets)
 *   node scripts/check-rls.mjs --replay  # Same isolated replay check
 *   node scripts/check-rls.mjs --live    # Read-only catalog check against live DIRECT_URL/DATABASE_URL
 */

import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { execFile as execFileCallback } from "node:child_process";
import {
  CATALOG_RLS_SQL,
  SafeRlsCheckError,
  assertLoopbackDatabaseUrl,
  evaluatePublicRlsCatalog,
  formatRlsReport,
  formatSafeRlsError,
  parseCheckRlsArgs,
} from "../lib/rls-check.mjs";

const execFile = promisify(execFileCallback);

const MIGRATION_TIMEOUT_MS = 30_000;
const PG_CONNECT_TIMEOUT_MS = 10_000;
const PG_STATEMENT_TIMEOUT_MS = 10_000;

function resolveLocalPrismaCliPath() {
  const prismaCliPath = path.resolve(
    process.cwd(),
    "node_modules",
    "prisma",
    "build",
    "index.js"
  );
  if (!fs.existsSync(prismaCliPath)) {
    throw new SafeRlsCheckError(
      "Local Prisma CLI not found at node_modules/prisma/build/index.js; run npm ci first."
    );
  }
  return prismaCliPath;
}

async function resolveLiveConnectionString() {
  for (const key of ["DIRECT_URL", "DATABASE_URL"]) {
    const val = process.env[key]?.trim();
    if (val) return { key, value: val };
  }

  const { default: dotenv } = await import("dotenv");
  const envFiles = [".env.local", ".env"].filter((f) =>
    fs.existsSync(path.resolve(process.cwd(), f))
  );

  // Load local env files strictly without overriding explicit process environment variables.
  for (const file of envFiles) {
    dotenv.config({
      path: path.resolve(process.cwd(), file),
      quiet: true,
      override: false,
    });
  }

  for (const key of ["DIRECT_URL", "DATABASE_URL"]) {
    const val = process.env[key]?.trim();
    if (val) return { key, value: val };
  }

  throw new SafeRlsCheckError(
    "Neither DIRECT_URL nor DATABASE_URL is configured for --live RLS verification."
  );
}

async function runReplayCheck() {
  const prismaCliPath = resolveLocalPrismaCliPath();
  const { PGlite } = await import("@electric-sql/pglite");
  const { PGLiteSocketServer } = await import("@electric-sql/pglite-socket");

  let db = null;
  let server = null;

  try {
    db = new PGlite();
    await db.waitReady;

    server = new PGLiteSocketServer({
      db,
      host: "127.0.0.1",
      port: 0,
      maxConnections: 10,
    });
    await server.start();

    const serverConn = server.getServerConn();
    const replayUrl = `postgresql://postgres:postgres@${serverConn}/postgres?sslmode=disable`;
    assertLoopbackDatabaseUrl(replayUrl);

    const replayEnv = {
      ...process.env,
      DIRECT_URL: replayUrl,
      DATABASE_URL: replayUrl,
      SHADOW_DATABASE_URL: replayUrl,
      PRISMA_HIDE_UPDATE_MESSAGE: "true",
    };

    try {
      await execFile(process.execPath, [prismaCliPath, "migrate", "deploy"], {
        env: replayEnv,
        timeout: MIGRATION_TIMEOUT_MS,
        killSignal: "SIGTERM",
      });
    } catch (err) {
      const code =
        typeof err === "object" && err !== null && "code" in err && err.code !== undefined
          ? ` (exit=${String(err.code)})`
          : "";
      throw new SafeRlsCheckError(`Isolated Prisma migration replay failed${code}.`);
    }

    const res = await db.query(CATALOG_RLS_SQL);
    const evaluation = evaluatePublicRlsCatalog(res.rows);
    console.log(formatRlsReport(evaluation, "isolated-replay (PGlite)"));
    return evaluation.ok;
  } finally {
    if (server) {
      await server.stop().catch(() => {});
    }
    if (db) {
      await db.close().catch(() => {});
    }
  }
}

async function runLiveCheck() {
  const { default: pg } = await import("pg");
  const { key, value } = await resolveLiveConnectionString();

  const client = new pg.Client({
    connectionString: value,
    connectionTimeoutMillis: PG_CONNECT_TIMEOUT_MS,
    query_timeout: PG_STATEMENT_TIMEOUT_MS,
    statement_timeout: PG_STATEMENT_TIMEOUT_MS,
  });

  await client.connect();
  try {
    await client.query("BEGIN READ ONLY");
    await client.query(`SET LOCAL statement_timeout = ${PG_STATEMENT_TIMEOUT_MS}`);
    const res = await client.query(CATALOG_RLS_SQL);
    await client.query("ROLLBACK");

    const evaluation = evaluatePublicRlsCatalog(res.rows);
    console.log(formatRlsReport(evaluation, `live-readonly (${key})`));
    return evaluation.ok;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    await client.end().catch(() => {});
  }
}

async function main() {
  const mode = parseCheckRlsArgs(process.argv.slice(2));
  const ok = mode === "live" ? await runLiveCheck() : await runReplayCheck();
  if (!ok) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(formatSafeRlsError(err));
  process.exit(1);
});
