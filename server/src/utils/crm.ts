const UFS = [
  "AC",
  "AL",
  "AM",
  "AP",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MG",
  "MS",
  "MT",
  "PA",
  "PB",
  "PE",
  "PI",
  "PR",
  "RJ",
  "RN",
  "RO",
  "RR",
  "RS",
  "SC",
  "SE",
  "SP",
  "TO",
];

const NUMBER_FIRST = /^(\d{4,7})-?([A-Z]{2})$/;
const UF_FIRST = /^([A-Z]{2})-?(\d{4,7})$/;

/**
 * Normalizes a professional's CRM to the canonical "NNNNNN-UF" form, accepting
 * the shapes people actually type ("CRM/PB 12345", "12345 pb", "12345-PB"), or
 * null when the value cannot be read as one.
 *
 * Both orderings are accepted because both are in common use: councils write
 * "CRM/PB 12345" with the state first, while the number-then-state form is what
 * people type from memory.
 *
 * Validation is deliberately shallow: registration numbers are issued per state
 * with no national check digit, so there is nothing to verify arithmetically.
 * The UF is checked against the 27 federative units because a typo there would
 * otherwise create a second, silently distinct identity for the same doctor.
 * Uniqueness is what this value is for.
 */
export function normalizeCrm(raw: unknown): string | null {
  if (typeof raw !== "string") return null;

  const compact = raw
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/^CRM\/?/, "");

  const numberFirst = NUMBER_FIRST.exec(compact);
  const ufFirst = numberFirst ? null : UF_FIRST.exec(compact);

  const number = numberFirst?.[1] ?? ufFirst?.[2];
  const uf = numberFirst?.[2] ?? ufFirst?.[1];

  if (!number || !uf || !UFS.includes(uf)) return null;

  return `${number}-${uf}`;
}
