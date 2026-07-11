const REQUIRED_VARS = ["DATABASE_URL", "JWT_SECRET"] as const;

const MIN_PRODUCTION_SECRET_LENGTH = 32;

/**
 * Validates the environment at startup so a misconfigured deployment fails
 * fast with a clear message instead of surfacing as opaque runtime errors
 * (e.g. a missing JWT_SECRET otherwise turns every authenticated request into
 * a 401). Requires DATABASE_URL and JWT_SECRET; in production the secret must
 * also be at least 32 characters, since a short or default secret makes every
 * session token forgeable.
 */
export function assertEnv(env: NodeJS.ProcessEnv = process.env): void {
  const missing = REQUIRED_VARS.filter((name) => !env[name]);
  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  if (
    env.NODE_ENV === "production" &&
    (env.JWT_SECRET as string).length < MIN_PRODUCTION_SECRET_LENGTH
  ) {
    throw new Error(
      `JWT_SECRET must be at least ${MIN_PRODUCTION_SECRET_LENGTH} characters in production`,
    );
  }
}
