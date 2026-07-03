/**
 * Date helpers shared across screens. The API speaks ISO strings; the UI shows
 * the Brazilian DD/MM/AAAA formats from the Figma design.
 */

/**
 * Returns a person's age in years for the "NN anos" subtitles.
 */
export function ageInYears(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const hadBirthday =
    now.getMonth() > birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
  if (!hadBirthday) age -= 1;
  return age;
}

/**
 * Converts an ISO date (from the API) to the DD/MM/AAAA display format.
 */
export function isoToBrDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

/**
 * Converts a DD/MM/AAAA string to the ISO format the API expects, or null when
 * the value is not a complete valid date.
 */
export function brDateToIso(text: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return null;
  const [, day, month, year] = match;
  const iso = `${year}-${month}-${day}`;
  return Number.isNaN(new Date(iso).getTime()) ? null : iso;
}

/**
 * Formats typed digits as a DD/MM/AAAA date, inserting the slashes as the
 * user types.
 */
export function maskBrDate(text: string): string {
  const digits = text.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/**
 * Formats an ISO timestamp as the design's "16/06/2026, 11:52:21".
 */
export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number): string => String(value).padStart(2, "0");
  return (
    `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}, ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}
