/**
 * Pure catalog validation, CLI argument parsing, loopback guards, and error
 * sanitization helpers for the repeatable RLS regression check.
 *
 * Security invariants:
 * - Default-deny RLS blocks ordinary anon/authenticated Supabase Data API access.
 * - Server-side Prisma currently connects as the privileged `postgres` role and bypasses RLS.
 * - Clerk authentication and server-side ownership checks remain mandatory across endpoints.
 * - This check verifies current catalog invariants (and isolated migration replay); it does not
 *   verify all database security properties or establish whether historical unauthorized access
 *   never occurred prior to RLS enforcement.
 */

export const EXPECTED_PUBLIC_TABLES = [
  "User",
  "Workspace",
  "Version",
  "Component",
  "_prisma_migrations",
];

export const CATALOG_RLS_SQL = `
  SELECT
    c.relname AS table_name,
    c.relrowsecurity AS rls_enabled,
    c.relforcerowsecurity AS force_rls,
    COALESCE(p.policy_count, 0)::int AS policy_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN (
    SELECT tablename, count(*)::int AS policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY tablename
  ) p ON p.tablename = c.relname
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p')
  ORDER BY c.relname;
`;

const EXPECTED_TABLE_SET = new Set(EXPECTED_PUBLIC_TABLES);
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

const CONNECTION_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EPIPE",
  "EAI_AGAIN",
  "08001",
  "08003",
  "08004",
  "08006",
  "08P01",
  "28P01",
  "28000",
  "3D000",
  "53300",
  "57P01",
  "57P02",
  "57P03",
]);

const QUERY_ERROR_CODES = new Set(["42501", "42P01", "42703", "57014"]);

/**
 * Controlled error class carrying intentionally safe, credential-free validation messages.
 */
export class SafeRlsCheckError extends Error {
  constructor(message) {
    super(message);
    this.name = "SafeRlsCheckError";
  }
}

/**
 * Evaluate pg_class / pg_policies catalog rows against default-deny RLS invariants.
 * Never queries or accepts application row data.
 *
 * @param {Array<{ table_name: string, rls_enabled: boolean, force_rls?: boolean, policy_count: number }>} rows
 */
export function evaluatePublicRlsCatalog(rows) {
  if (!Array.isArray(rows)) {
    throw new SafeRlsCheckError("Catalog result must be an array of table rows.");
  }

  const byTable = new Map();
  const failures = [];
  const results = [];

  for (const row of rows) {
    if (!row || typeof row.table_name !== "string") {
      failures.push("Invalid catalog row missing table_name.");
      continue;
    }
    byTable.set(row.table_name, {
      table_name: row.table_name,
      rls_enabled: row.rls_enabled === true,
      force_rls: row.force_rls === true,
      policy_count: Number(row.policy_count ?? 0),
    });
  }

  for (const table of EXPECTED_PUBLIC_TABLES) {
    const row = byTable.get(table);
    if (!row) {
      const reason = `Missing expected public table: "${table}"`;
      failures.push(reason);
      results.push({
        table_name: table,
        expected: true,
        present: false,
        rls_enabled: false,
        force_rls: false,
        policy_count: 0,
        status: "FAIL",
        reasons: [reason],
      });
      continue;
    }

    const rowReasons = [];
    if (!row.rls_enabled) {
      rowReasons.push(`Expected public table "${table}" has RLS disabled`);
    }
    if (!Number.isInteger(row.policy_count) || row.policy_count !== 0) {
      rowReasons.push(
        `Expected public table "${table}" has unexpected policy count (${row.policy_count}); expected 0 policies`
      );
    }

    failures.push(...rowReasons);
    results.push({
      table_name: table,
      expected: true,
      present: true,
      rls_enabled: row.rls_enabled,
      force_rls: row.force_rls,
      policy_count: row.policy_count,
      status: rowReasons.length === 0 ? "PASS" : "FAIL",
      reasons: rowReasons,
    });
  }

  for (const [table, row] of byTable.entries()) {
    if (EXPECTED_TABLE_SET.has(table)) continue;

    const rowReasons = [];
    if (!row.rls_enabled) {
      rowReasons.push(`Additional public table "${table}" has RLS disabled`);
    }

    failures.push(...rowReasons);
    results.push({
      table_name: table,
      expected: false,
      present: true,
      rls_enabled: row.rls_enabled,
      force_rls: row.force_rls,
      policy_count: row.policy_count,
      status: rowReasons.length === 0 ? "PASS" : "FAIL",
      reasons: rowReasons,
    });
  }

  return {
    ok: failures.length === 0,
    failures,
    results,
  };
}

/**
 * Parse and strictly validate CLI flags (`--replay` default, or `--live`).
 *
 * @param {string[]} args
 * @returns {"replay" | "live"}
 */
export function parseCheckRlsArgs(args) {
  let hasReplay = false;
  let hasLive = false;

  for (const arg of args) {
    if (arg === "--replay") {
      hasReplay = true;
    } else if (arg === "--live") {
      hasLive = true;
    } else {
      throw new SafeRlsCheckError(
        `Unknown argument "${arg}". Supported flags: --replay (default), --live.`
      );
    }
  }

  if (hasReplay && hasLive) {
    throw new SafeRlsCheckError("Cannot combine --replay and --live flags.");
  }

  return hasLive ? "live" : "replay";
}

/**
 * Ensure a replay target URL is strictly loopback before invoking migrations.
 * Never includes connection strings, hosts, or ports in error messages.
 *
 * @param {string} targetUrl
 */
export function assertLoopbackDatabaseUrl(targetUrl) {
  let parsed;
  try {
    parsed = new URL(targetUrl);
  } catch {
    throw new SafeRlsCheckError("Refusing replay: invalid target database URL syntax.");
  }

  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new SafeRlsCheckError("Refusing replay: unexpected database protocol.");
  }

  if (!LOOPBACK_HOSTS.has(parsed.hostname)) {
    throw new SafeRlsCheckError(
      "Refusing replay: target database host is not loopback."
    );
  }

  const port = Number(parsed.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new SafeRlsCheckError(
      "Refusing replay: target database port is missing or invalid."
    );
  }
}

function extractAllowlistedErrorCode(err) {
  if (!err || typeof err !== "object") return null;

  if (typeof err.code === "string") {
    const code = err.code.trim().toUpperCase();
    if (CONNECTION_ERROR_CODES.has(code) || QUERY_ERROR_CODES.has(code)) {
      return code;
    }
  }

  if (Array.isArray(err.errors)) {
    for (const inner of err.errors) {
      const nestedCode = extractAllowlistedErrorCode(inner);
      if (nestedCode) return nestedCode;
    }
  }

  return null;
}

/**
 * Produce a strictly sanitized error string without exposing hosts, ports,
 * usernames, passwords, connection strings, or raw driver error text.
 *
 * @param {unknown} err
 * @returns {string}
 */
export function formatSafeRlsError(err) {
  if (err instanceof SafeRlsCheckError) {
    return err.message
      .replace(/[a-zA-Z][a-zA-Z0-9+.-]*:\/\/\S+/g, "[redacted]")
      .replace(/\b\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?\b/g, "[redacted]");
  }

  const code = extractAllowlistedErrorCode(err);
  if (code && CONNECTION_ERROR_CODES.has(code)) {
    return `Database connection failed (${code}).`;
  }
  if (code && QUERY_ERROR_CODES.has(code)) {
    return `Database query failed (${code}).`;
  }

  return "Database verification failed.";
}

/**
 * Format table names, RLS flags, policy counts, and failure reasons only.
 *
 * @param {ReturnType<typeof evaluatePublicRlsCatalog>} evaluation
 * @param {string} modeLabel
 * @returns {string}
 */
export function formatRlsReport(evaluation, modeLabel) {
  const lines = [`[RLS Check: ${modeLabel}]`];
  for (const r of evaluation.results) {
    if (!r.present) {
      lines.push(`  FAIL  ${r.table_name}: missing`);
      continue;
    }
    const kind = r.expected ? "expected" : "additional";
    lines.push(
      `  ${r.status}  ${r.table_name} [${kind}] (rls_enabled=${r.rls_enabled}, force_rls=${r.force_rls}, policy_count=${r.policy_count})`
    );
  }

  if (!evaluation.ok) {
    lines.push("Failures:");
    for (const f of evaluation.failures) {
      lines.push(`  - ${f}`);
    }
  } else {
    lines.push(
      `PASS: All ${EXPECTED_PUBLIC_TABLES.length} expected public tables exist with RLS enabled and 0 policies.`
    );
  }

  return lines.join("\n");
}
