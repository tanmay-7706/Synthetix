export const EXPECTED_PUBLIC_TABLES: readonly string[];
export const CATALOG_RLS_SQL: string;

export class SafeRlsCheckError extends Error {
  constructor(message: string);
}

export interface RlsCatalogRow {
  table_name: string;
  rls_enabled: boolean;
  force_rls?: boolean;
  policy_count: number;
}

export interface RlsTableEvaluation {
  table_name: string;
  expected: boolean;
  present: boolean;
  rls_enabled: boolean;
  force_rls: boolean;
  policy_count: number;
  status: "PASS" | "FAIL";
  reasons: string[];
}

export interface RlsCatalogEvaluation {
  ok: boolean;
  failures: string[];
  results: RlsTableEvaluation[];
}

export function evaluatePublicRlsCatalog(
  rows: RlsCatalogRow[]
): RlsCatalogEvaluation;

export function parseCheckRlsArgs(args: string[]): "replay" | "live";

export function assertLoopbackDatabaseUrl(targetUrl: string): void;

export function formatSafeRlsError(err: unknown): string;

export function formatRlsReport(
  evaluation: RlsCatalogEvaluation,
  modeLabel: string
): string;
