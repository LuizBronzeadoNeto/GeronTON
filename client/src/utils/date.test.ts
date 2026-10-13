import { describe, it, expect } from "@jest/globals";
import { ageInYears, daysSince, formatDay } from "./date";

describe("date helpers", () => {
  it("formats a timestamp as the local day", () => {
    const iso = new Date(2026, 9, 12, 23, 30).toISOString();
    expect(formatDay(iso)).toBe("12/10/2026");
  });

  it("counts whole days since a timestamp", () => {
    const now = new Date(2026, 9, 13, 9, 0);
    expect(daysSince(new Date(2026, 9, 13, 8, 0).toISOString(), now)).toBe(0);
    expect(daysSince(new Date(2026, 9, 10, 20, 0).toISOString(), now)).toBe(3);
  });

  it("reads a date-only birth date without a timezone shift", () => {
    // Behind UTC, a UTC-midnight date parsed as local time lands on the day
    // before, which made the age flip a day early.
    const timezone = process.env.TZ;
    process.env.TZ = "America/Sao_Paulo";
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
    const day = String(tomorrow.getDate()).padStart(2, "0");
    const iso = `${tomorrow.getFullYear() - 80}-${month}-${day}T00:00:00.000Z`;
    expect(ageInYears(iso)).toBe(79);
    process.env.TZ = timezone;
  });
});
