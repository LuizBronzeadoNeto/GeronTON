/**
 * CPF helpers for the identification screen. The API speaks bare digits; the UI
 * shows the Brazilian 000.000.000-00 format, mirroring how date.ts splits ISO
 * dates from their DD/MM/AAAA display form.
 */

const CPF_DIGITS = 11;

/**
 * Formats typed digits as a CPF, inserting the dots and dash as the user types.
 */
export function maskCpf(text: string): string {
  const digits = text.replace(/\D/g, "").slice(0, CPF_DIGITS);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/**
 * Strips the mask, returning the 11 digits the API expects or null when the
 * field does not hold a complete CPF yet. Only length is checked here: the
 * check digits are verified by the backend, so the two implementations cannot
 * drift into disagreeing about what is valid.
 */
export function cpfToDigits(text: string): string | null {
  const digits = text.replace(/\D/g, "");
  return digits.length === CPF_DIGITS ? digits : null;
}
