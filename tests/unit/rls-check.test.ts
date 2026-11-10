import { describe, it, expect } from "vitest";
import {
  EXPECTED_PUBLIC_TABLES,
  SafeRlsCheckError,
  assertLoopbackDatabaseUrl,
  evaluatePublicRlsCatalog,
  formatRlsReport,
  formatSafeRlsError,
  parseCheckRlsArgs,
  type RlsCatalogRow,
} from "@/lib/rls-check.mjs";

function makeCompliantRows(): RlsCatalogRow[] {
  return EXPECTED_PUBLIC_TABLES.map((table) => ({
    table_name: table,
    rls_enabled: true,
    force_rls: false,
    policy_count: 0,
  }));
}

describe("Public RLS Catalog Verification", () => {
  it("passes when all five expected tables have RLS enabled and zero policies", () => {
    const result = evaluatePublicRlsCatalog(makeCompliantRows());
    expect(result.ok).toBe(true);
    expect(result.failures).toEqual([]);
    expect(result.results).toHaveLength(EXPECTED_PUBLIC_TABLES.length);
    for (const r of result.results) {
      expect(r.status).toBe("PASS");
      expect(r.rls_enabled).toBe(true);
      expect(r.policy_count).toBe(0);
    }

    const report = formatRlsReport(result, "unit-test");
    expect(report).toContain("PASS:");
    expect(report).toContain("_prisma_migrations");
  });

  it("fails when an expected table is missing", () => {
    const rows = makeCompliantRows().filter((r) => r.table_name !== "Component");
    const result = evaluatePublicRlsCatalog(rows);

    expect(result.ok).toBe(false);
    expect(result.failures).toContain('Missing expected public table: "Component"');
  });

  it("fails when an expected table has RLS disabled", () => {
    const rows = makeCompliantRows().map((r) =>
      r.table_name === "Version" ? { ...r, rls_enabled: false } : r
    );
    const result = evaluatePublicRlsCatalog(rows);

    expect(result.ok).toBe(false);
    expect(result.failures).toContain(
      'Expected public table "Version" has RLS disabled'
    );
  });

  it("fails when an expected table has an unexpected policy", () => {
    const rows = makeCompliantRows().map((r) =>
      r.table_name === "Workspace" ? { ...r, policy_count: 1 } : r
    );
    const result = evaluatePublicRlsCatalog(rows);

    expect(result.ok).toBe(false);
    expect(result.failures[0]).toContain(
      'table "Workspace" has unexpected policy count (1)'
    );
  });

  it("fails when an additional public table has RLS disabled", () => {
    const rows = [
      ...makeCompliantRows(),
      {
        table_name: "AuditLog",
        rls_enabled: false,
        force_rls: false,
        policy_count: 0,
      },
    ];
    const result = evaluatePublicRlsCatalog(rows);

    expect(result.ok).toBe(false);
    expect(result.failures).toContain(
      'Additional public table "AuditLog" has RLS disabled'
    );
  });

  it("passes when an additional public table also has RLS enabled", () => {
    const rows = [
      ...makeCompliantRows(),
      {
        table_name: "AuditLog",
        rls_enabled: true,
        force_rls: false,
        policy_count: 0,
      },
    ];
    const result = evaluatePublicRlsCatalog(rows);

    expect(result.ok).toBe(true);
    expect(result.failures).toEqual([]);
  });
});

describe("check-rls CLI argument, loopback, and error-sanitization guards", () => {
  it("defaults to replay mode and accepts --replay or --live independently", () => {
    expect(parseCheckRlsArgs([])).toBe("replay");
    expect(parseCheckRlsArgs(["--replay"])).toBe("replay");
    expect(parseCheckRlsArgs(["--live"])).toBe("live");
  });

  it("rejects unknown flags and combined --replay --live flags", () => {
    expect(() => parseCheckRlsArgs(["--unknown"])).toThrow(/Unknown argument/);
    expect(() => parseCheckRlsArgs(["--replay", "--live"])).toThrow(
      /Cannot combine/
    );
  });

  it("allows loopback URLs and rejects remote URLs without leaking credentials or host", () => {
    expect(() =>
      assertLoopbackDatabaseUrl(
        "postgresql://postgres:postgres@127.0.0.1:54321/postgres"
      )
    ).not.toThrow();

    try {
      assertLoopbackDatabaseUrl(
        "postgresql://postgres:supersecret@db.prod.supabase.co:5432/postgres"
      );
      expect.unreachable("Should have thrown on non-loopback target");
    } catch (err) {
      const msg = formatSafeRlsError(err);
      expect(msg).toContain("not loopback");
      expect(msg).not.toContain("supersecret");
      expect(msg).not.toContain("db.prod.supabase.co");
      expect(msg).not.toContain("5432");
    }
  });

  it("sanitizes driver connection errors without leaking host, port, username, password, or URI", () => {
    const connRefused = Object.assign(
      new Error("connect ECONNREFUSED 10.0.4.22:5432"),
      { code: "ECONNREFUSED" }
    );
    expect(formatSafeRlsError(connRefused)).toBe(
      "Database connection failed (ECONNREFUSED)."
    );

    const nestedAggregate = new AggregateError(
      [
        Object.assign(new Error("connect ECONNREFUSED ::1:6543"), {
          code: "ECONNREFUSED",
        }),
      ],
      "AggregateError"
    );
    expect(formatSafeRlsError(nestedAggregate)).toBe(
      "Database connection failed (ECONNREFUSED)."
    );

    const authError = Object.assign(
      new Error(
        'password authentication failed for user "postgres.secretprojectref" using password'
      ),
      { code: "28P01" }
    );
    const sanitizedAuth = formatSafeRlsError(authError);
    expect(sanitizedAuth).toBe("Database connection failed (28P01).");
    expect(sanitizedAuth).not.toContain("secretprojectref");
    expect(sanitizedAuth).not.toContain("postgres");

    const queryError = Object.assign(
      new Error('permission denied for table "Secret"'),
      { code: "42501" }
    );
    expect(formatSafeRlsError(queryError)).toBe("Database query failed (42501).");

    const rawUriLeak = Object.assign(
      new Error(
        "Failed connecting to postgresql://admin:topsecretpass@private.db.internal:5432/prod"
      ),
      { code: "CUSTOM_UNLISTED_CODE" }
    );
    const sanitizedLeak = formatSafeRlsError(rawUriLeak);
    expect(sanitizedLeak).toBe("Database verification failed.");
    expect(sanitizedLeak).not.toContain("topsecretpass");
    expect(sanitizedLeak).not.toContain("private.db.internal");
    expect(sanitizedLeak).not.toContain("5432");
    expect(sanitizedLeak).not.toContain("CUSTOM_UNLISTED_CODE");

    const controlledErr = new SafeRlsCheckError(
      "Controlled validation failure without secrets"
    );
    expect(formatSafeRlsError(controlledErr)).toBe(
      "Controlled validation failure without secrets"
    );
  });
});
