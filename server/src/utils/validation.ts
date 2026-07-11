/**
 * Returns the names of the required fields that are absent from `body` (missing,
 * null, or an empty string). Used for the MVP's light request validation so each
 * route can report which fields are required without repeating the checks.
 */
export function missingFields(
  body: Record<string, unknown> | undefined,
  fields: string[],
): string[] {
  return fields.filter((field) => {
    const value = body?.[field];
    return value === undefined || value === null || value === "";
  });
}

/**
 * Normalizes an optional free-text field: returns the value when it is a
 * non-empty string, and null otherwise (missing, empty, or not a string).
 */
export function optionalText(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

/**
 * Parses a route id parameter: the id as a number when the raw value is a
 * positive integer string, and null otherwise, so routes can respond 400
 * instead of passing NaN to Prisma (which would surface as a 500).
 */
export function parseId(raw: unknown): number | null {
  if (typeof raw !== "string") return null;
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}
