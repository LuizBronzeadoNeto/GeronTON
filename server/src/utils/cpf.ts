const CPF_LENGTH = 11;

/**
 * Strips punctuation from a CPF and returns its 11 digits, or null when the
 * value is not a string or does not hold exactly 11 digits.
 *
 * Profiles store the normalized form so "111.444.777-35" and "11144477735"
 * cannot both be registered as different elders.
 */
export function normalizeCpf(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length === CPF_LENGTH ? digits : null;
}

/**
 * Computes one CPF check digit over the first `length` digits, using the
 * descending weights of the Receita Federal algorithm.
 */
function checkDigit(digits: string, length: number): number {
  let sum = 0;
  for (let index = 0; index < length; index += 1) {
    sum += Number(digits[index]) * (length + 1 - index);
  }
  const remainder = (sum * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

/**
 * Validates a normalized CPF's two check digits.
 *
 * Sequences of a single repeated digit ("00000000000", "11111111111", ...)
 * satisfy the checksum but are never issued, and are exactly what people type
 * when a form demands a CPF they do not have, so they are rejected explicitly.
 */
export function isValidCpf(digits: string): boolean {
  if (digits.length !== CPF_LENGTH || !/^\d+$/.test(digits)) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  return (
    checkDigit(digits, 9) === Number(digits[9]) &&
    checkDigit(digits, 10) === Number(digits[10])
  );
}
