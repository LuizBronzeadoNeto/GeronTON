const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * How many weeks back the adherence metric looks. Eight matches the length
 * of the field experiment.
 */
export const ADHERENCE_WEEKS = 8;

export interface WeeklyAdherence {
  /** Weeks in the window with at least one check-in. */
  weeksWithCheckIn: number;
  /**
   * Weeks counted, which is less than ADHERENCE_WEEKS for a recently
   * registered elder, so nobody gets penalized for weeks before they existed.
   */
  weeksObserved: number;
  /** Whether there was a check-in in the last 7 days. */
  checkedInThisWeek: boolean;
}

/**
 * Weekly check-in adherence for one elder. Weeks are rolling 7-day windows
 * counted back from now (the same way the omission monitor counts), and a
 * week counts once no matter how many check-ins it had.
 */
export function weeklyAdherence(
  createdAt: Date,
  checkInDates: Date[],
  now = new Date(),
  weeks = ADHERENCE_WEEKS,
): WeeklyAdherence {
  const age = Math.max(0, now.getTime() - createdAt.getTime());
  const weeksObserved = Math.min(weeks, Math.max(1, Math.ceil(age / WEEK_MS)));

  const covered = new Set<number>();
  for (const date of checkInDates) {
    const elapsed = now.getTime() - date.getTime();
    if (elapsed < 0) continue;
    const week = Math.floor(elapsed / WEEK_MS);
    if (week < weeksObserved) covered.add(week);
  }

  return {
    weeksWithCheckIn: covered.size,
    weeksObserved,
    checkedInThisWeek: covered.has(0),
  };
}
