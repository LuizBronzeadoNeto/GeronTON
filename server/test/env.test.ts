import { describe, it, expect } from "@jest/globals";
import { assertEnv } from "../src/lib/env.js";

const VALID = {
  DATABASE_URL: "postgres://user:password@localhost:5432/geronton",
  JWT_SECRET: "a".repeat(32),
} as NodeJS.ProcessEnv;

describe("assertEnv", () => {
  it("accepts a complete environment", () => {
    expect(() => assertEnv(VALID)).not.toThrow();
  });

  it("names every missing required variable", () => {
    expect(() => assertEnv({} as NodeJS.ProcessEnv)).toThrow(
      "Missing required environment variables: DATABASE_URL, JWT_SECRET",
    );
  });

  it("treats an empty value as missing", () => {
    expect(() => assertEnv({ ...VALID, JWT_SECRET: "" })).toThrow(
      "Missing required environment variables: JWT_SECRET",
    );
  });

  it("rejects a short secret in production", () => {
    expect(() =>
      assertEnv({ ...VALID, NODE_ENV: "production", JWT_SECRET: "short" }),
    ).toThrow("JWT_SECRET must be at least 32 characters in production");
  });

  it("accepts a short secret outside production", () => {
    expect(() => assertEnv({ ...VALID, JWT_SECRET: "dev" })).not.toThrow();
  });
});
