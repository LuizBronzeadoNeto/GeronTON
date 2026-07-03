import type { CheckIn, Intercorrence } from "@prisma/client";

export type RiskLevel = "low" | "moderate" | "high" | "unknown";

export interface RiskStatus {
  status: RiskLevel;
  score: number;
}

/**
 * Acute-event keys a weekly check-in may report ("Intercorrências na semana").
 * The first five are the clinically critical ones and weigh double.
 */
export const WEEKLY_EVENTS = [
  "fever",
  "breathing_difficulty",
  "fall_with_injury",
  "active_bleeding",
  "acute_confusion",
  "pain",
  "cough",
  "fall_without_injury",
] as const;

export const CRITICAL_WEEKLY_EVENTS: ReadonlySet<string> = new Set([
  "fever",
  "breathing_difficulty",
  "fall_with_injury",
  "active_bleeding",
  "acute_confusion",
]);

const MODERATE_THRESHOLD = 3;
const HIGH_THRESHOLD = 6;

/**
 * Scores a single weekly check-in across the wizard's domains. Critical acute
 * events weigh double, as do the severe answers (bad appetite, choking, missed
 * medication, very sad mood, high stress); every other warning sign adds one
 * point.
 */
function scoreCheckIn(checkIn: CheckIn): number {
  let score = 0;

  for (const event of checkIn.weeklyEvents) {
    score += CRITICAL_WEEKLY_EVENTS.has(event) ? 2 : 1;
  }

  if (checkIn.skinIssues) score += 1;
  if (!checkIn.bowelRegular) score += 1;
  if (!checkIn.sleepWell) score += 1;
  if (checkIn.unstableGait) score += 1;

  if (checkIn.appetite === "bad") score += 2;
  else if (checkIn.appetite === "regular") score += 1;
  if (checkIn.chokingIncident) score += 2;
  if (checkIn.breathShortness) score += 1;
  if (!checkIn.hydrationGoal) score += 1;
  if (!checkIn.medsOnTime) score += 2;

  if (checkIn.mood === "very_sad") score += 2;
  else if (checkIn.mood === "sad") score += 1;
  if (checkIn.stressLevel >= 4) score += 2;
  else if (checkIn.stressLevel === 3) score += 1;
  if (!checkIn.sunExposure) score += 1;
  if (!checkIn.selfExpression) score += 1;
  if (!checkIn.stimulation) score += 1;

  if (!checkIn.dailyBath) score += 1;
  if (!checkIn.oralHygiene) score += 1;
  if (!checkIn.groomedNails) score += 1;

  return score;
}

/**
 * Computes a profile's risk status from its most recent weekly check-in and its
 * recent intercorrences (the caller decides the window, typically 30 days).
 * Critical intercorrences add three points each, non-critical ones add one, and
 * the total maps to a level: 0–2 low, 3–5 moderate, 6+ high. With no check-in
 * and no intercorrences there is nothing to assess and the status is "unknown".
 */
export function computeRiskStatus(
  latestCheckIn: CheckIn | null,
  recentIntercorrences: Intercorrence[],
): RiskStatus {
  if (!latestCheckIn && recentIntercorrences.length === 0) {
    return { status: "unknown", score: 0 };
  }

  let score = latestCheckIn ? scoreCheckIn(latestCheckIn) : 0;
  for (const intercorrence of recentIntercorrences) {
    score += intercorrence.isCritical ? 3 : 1;
  }

  if (score >= HIGH_THRESHOLD) return { status: "high", score };
  if (score >= MODERATE_THRESHOLD) return { status: "moderate", score };
  return { status: "low", score };
}
