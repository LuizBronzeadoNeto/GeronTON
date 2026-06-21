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
