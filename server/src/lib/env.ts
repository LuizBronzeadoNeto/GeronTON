const REQUIRED_VARS = ["DATABASE_URL", "JWT_SECRET"] as const;

const VALID_NODE_ENVS = ["development", "test", "production"] as const;

const MIN_PRODUCTION_SECRET_LENGTH = 32;

/**
 * Secrets shipped in the tracked `.env.example` files. They are public by
 * definition, so a deployment still using one has no signing secret at all.
 */
const PUBLISHED_SECRETS = [
  "resenha",
  "replace-with-a-random-string-of-at-least-32-characters",
];

/**
 * Validates the environment at startup so a misconfigured deployment fails
 * fast with a clear message instead of surfacing as opaque runtime errors
 * (e.g. a missing JWT_SECRET otherwise turns every authenticated request into
 * a 401). Requires DATABASE_URL and JWT_SECRET.
 *
 * NODE_ENV is checked against the known values because every production-only
 * rule below keys off it: a typo such as "prodution" would silently downgrade
 * the deployment to development rules rather than fail.
 *
 * In production the secret must also be at least 32 characters and must not be
 * one of the example values, since a short, default or published secret makes
 * every session token forgeable.
 */
export function assertEnv(env: NodeJS.ProcessEnv = process.env): void {
  const missing = REQUIRED_VARS.filter((name) => !env[name]);
  if (missing.length) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }

  if (
    env.NODE_ENV &&
    !VALID_NODE_ENVS.includes(env.NODE_ENV as (typeof VALID_NODE_ENVS)[number])
  ) {
    throw new Error(
      `NODE_ENV must be one of ${VALID_NODE_ENVS.join(", ")} when set, got "${env.NODE_ENV}"`,
    );
  }

  if (env.NODE_ENV !== "production") {
    return;
  }

  const secret = env.JWT_SECRET as string;

  if (secret.length < MIN_PRODUCTION_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must be at least ${MIN_PRODUCTION_SECRET_LENGTH} characters in production`,
    );
  }

  if (PUBLISHED_SECRETS.includes(secret)) {
    throw new Error(
      "JWT_SECRET is one of the published example values; generate a new one with `openssl rand -base64 48`",
    );
  }
}
