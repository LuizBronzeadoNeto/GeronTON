import type { CheckIn, Intercorrence } from "@prisma/client";

export type RiskLevel = "low" | "moderate" | "high" | "unknown";

export interface RiskStatus {
  status: RiskLevel;
  score: number;
}

const MODERATE_THRESHOLD = 3;
const HIGH_THRESHOLD = 6;

/**
 * Scores a single weekly check-in. Falls and weight loss scale with severity
 * (repeated falls / ≥3 kg lost weigh double); choking and signs of violence are
 * treated as severe flags; the remaining yes/no answers add one point each.
 */
function scoreCheckIn(checkIn: CheckIn): number {
  let score = 0;

  if (checkIn.falls >= 2) score += 2;
  else if (checkIn.falls === 1) score += 1;

  if (checkIn.weightLoss >= 3) score += 2;
  else if (checkIn.weightLoss > 0) score += 1;

  if (checkIn.choking) score += 2;
  if (checkIn.violenceSign) score += 2;

  if (checkIn.gaitImpairment) score += 1;
  if (checkIn.irregularSleep) score += 1;
  if (checkIn.socialIsolation) score += 1;
  if (checkIn.failedComms) score += 1;
  if (checkIn.memoryLoss) score += 1;

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
