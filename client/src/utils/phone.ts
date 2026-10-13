/**
 * Formats typed digits as a Brazilian phone, "(83) 99999-1234" for mobiles or
 * "(83) 3222-1100" for landlines, as the user types. The server keeps only
 * the digits, so the mask is purely for reading.
 */
export function maskPhone(text: string): string {
  const digits = text.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  const ddd = digits.slice(0, 2);
  const number = digits.slice(2);
  if (number.length <= 4) return `(${ddd}) ${number}`;
  const split = number.length > 8 ? 5 : number.length - 4;
  return `(${ddd}) ${number.slice(0, split)}-${number.slice(split)}`;
}
