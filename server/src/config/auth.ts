export const SALT_ROUNDS = Number(process.env.SALT_ROUNDS ?? 12);

/**
 * Shortest password accepted when creating an account. Registration is open to
 * anyone, so this is the only thing standing between the sign-up form and a
 * one-character password guarding an elder's health record. Existing accounts
 * are unaffected; the rule applies at creation.
 */
export const MIN_PASSWORD_LENGTH = 8;
