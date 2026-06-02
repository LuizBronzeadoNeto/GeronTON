import { Pool } from "pg";

/**
 * Shared Postgres connection pool. Uses DATABASE_URL when set, otherwise falls
 * back to the standard PG* environment variables (PGHOST, PGUSER, PGPASSWORD,
 * PGDATABASE, PGPORT).
 */
export const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {},
);

export type Role = "cuidador" | "profissional";

export interface UserRow {
  id: number;
  email: string;
  password: string;
  role: Role;
}
