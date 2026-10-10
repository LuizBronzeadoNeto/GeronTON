import { describe, it, expect } from "@jest/globals";
import { weeklyAdherence } from "../src/utils/adherence.js";

const NOW = new Date("2026-10-10T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * DAY);
}

describe("weeklyAdherence", () => {
  it("counts each week with a check-in once", () => {
    const checkIns = [daysAgo(1), daysAgo(2), daysAgo(9), daysAgo(30)];

    expect(weeklyAdherence(daysAgo(100), checkIns, NOW)).toEqual({
      weeksWithCheckIn: 3,
      weeksObserved: 8,
      checkedInThisWeek: true,
    });
  });

  it("ignores check-ins older than the window", () => {
    const result = weeklyAdherence(
      daysAgo(200),
      [daysAgo(60), daysAgo(90)],
      NOW,
    );

    expect(result.weeksWithCheckIn).toBe(0);
    expect(result.checkedInThisWeek).toBe(false);
  });

  it("only counts the weeks since a new elder was registered", () => {
    const result = weeklyAdherence(daysAgo(10), [daysAgo(3)], NOW);

    expect(result.weeksObserved).toBe(2);
    expect(result.weeksWithCheckIn).toBe(1);
  });

  it("counts at least the current week for an elder registered today", () => {
    expect(weeklyAdherence(NOW, [], NOW)).toEqual({
      weeksWithCheckIn: 0,
      weeksObserved: 1,
      checkedInThisWeek: false,
    });
  });
});
