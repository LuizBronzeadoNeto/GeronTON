import type { CheckIn, Intercorrence } from "@prisma/client";

export type RiskLevel = "low" | "moderate" | "high" | "unknown";

export interface RiskStatus {
  status: RiskLevel;
  score: number;
}

/**
 * A warning from an optional measurement crossing a fixed limit in the
 * care-support heuristic (docs/heuristica.md). Warnings are persisted as
 * alerts on the dashboard; `sarcopenia_risk` also adds weekly points.
 *
 * The message only states what was measured and which limit it crossed. The
 * system flags a reason to get in touch with the family, it doesn't diagnose,
 * so words like "hipertensão" or "sarcopenia" stay out of the text.
 */
export interface ClinicalFlag {
  type: "clinical_warning" | "metabolic_decompensation" | "sarcopenia_risk";
  message: string;
}

export interface CheckInEvaluation {
  score: number;
  flags: ClinicalFlag[];
  criticalEvents: string[];
}

/**
 * Acute-event keys a weekly check-in may report ("Intercorrências na semana").
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

/**
 * Weekly events tagged as critical for follow-up: each adds 5 points and
 * raises a visual flag on the dashboard. A single event does not force the
 * high level. These tags support care organization, not diagnosis.
 */
export const CRITICAL_WEEKLY_EVENTS: ReadonlySet<string> = new Set([
  "fever",
  "breathing_difficulty",
  "fall_with_injury",
  "active_bleeding",
  "acute_confusion",
]);

/**
 * Adds 5 points for critical tags, 3 for a fall without injury and 2 otherwise
 * (pain or cough among the accepted events). Weights need professional
 * validation; see docs/heuristica.md.
 */
function weeklyEventPoints(event: string): number {
  if (CRITICAL_WEEKLY_EVENTS.has(event)) return 5;
  if (event === "fall_without_injury") return 3;
  return 2;
}

/**
 * Intercorrence types that force the high follow-up level regardless of the
 * caregiver's severity choice. Unlike weekly event tags, these set a floor
 * without adding points. This rule needs professional validation.
 */
export const CRITICAL_EVENT_TYPES: ReadonlySet<string> = new Set([
  "fever",
  "breathing_difficulties",
  "bleeding",
  "confusion",
]);

const MODERATE_THRESHOLD = 6;
const HIGH_THRESHOLD = 12;

const SATURATION_HYPOXIA_LIMIT = 92;
const CALF_SARCOPENIA_LIMIT_CM = 31;
const SYSTOLIC_HYPERTENSION_LIMIT = 140;
const DIASTOLIC_HYPERTENSION_LIMIT = 90;
const SYSTOLIC_HYPOTENSION_LIMIT = 90;
const DIASTOLIC_HYPOTENSION_LIMIT = 60;
const GLYCEMIA_DECOMPENSATION_LIMIT = 200;

/**
 * Extracts the first numeric value from a free-text vital-sign entry ("95%",
 * "30,5 cm"), accepting a decimal comma. Returns null when there is none.
 */
function parseMeasurement(value: string | null): number | null {
  if (!value) return null;
  const match = value.match(/\d+(?:[.,]\d+)?/);
  return match ? Number(match[0].replace(",", ".")) : null;
}

/**
 * Extracts a systolic/diastolic pair from a free-text blood-pressure entry
 * ("140/90", "120x80"). Returns null unless both numbers are present.
 * No unit conversion is applied: "12x8" remains 12 and 8.
 */
function parsePressure(
  value: string | null,
): { systolic: number; diastolic: number } | null {
  if (!value) return null;
  const match = value.match(/(\d+(?:[.,]\d+)?)\s*[/xX]\s*(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  return {
    systolic: Number(match[1].replace(",", ".")),
    diastolic: Number(match[2].replace(",", ".")),
  };
}

/**
 * Compares optional measurements with fixed limits: saturation < 92% adds
 * 4 points; calf circumference < 31 cm adds 2 points and a warning. Pressure
 * (systolic > 140 or diastolic > 90, or systolic < 90 or diastolic < 60) and
 * glycemia > 200 mg/dL only raise warnings. The calf limit and its 2-point
 * contribution match a condition within IVCF-20's combined capacity item;
 * that full item is not implemented here. Applying these rules in GeronTON
 * needs professional validation; see docs/heuristica.md. This does not diagnose.
 */
function evaluateVitalSigns(checkIn: CheckIn): {
  points: number;
  flags: ClinicalFlag[];
} {
  let points = 0;
  const flags: ClinicalFlag[] = [];

  const saturation = parseMeasurement(checkIn.saturation);
  if (saturation !== null && saturation < SATURATION_HYPOXIA_LIMIT) {
    points += 4;
  }

  const calf = parseMeasurement(checkIn.calfCircumference);
  if (calf !== null && calf < CALF_SARCOPENIA_LIMIT_CM) {
    points += 2;
    flags.push({
      type: "sarcopenia_risk",
      message: `Panturrilha esquerda com ${checkIn.calfCircumference}, abaixo de ${CALF_SARCOPENIA_LIMIT_CM} cm`,
    });
  }

  const pressure = parsePressure(checkIn.pressure);
  if (pressure) {
    const hypertension =
      pressure.systolic > SYSTOLIC_HYPERTENSION_LIMIT ||
      pressure.diastolic > DIASTOLIC_HYPERTENSION_LIMIT;
    const hypotension =
      pressure.systolic < SYSTOLIC_HYPOTENSION_LIMIT ||
      pressure.diastolic < DIASTOLIC_HYPOTENSION_LIMIT;
    if (hypertension || hypotension) {
      const limit = hypertension
        ? `acima de ${SYSTOLIC_HYPERTENSION_LIMIT}/${DIASTOLIC_HYPERTENSION_LIMIT}`
        : `abaixo de ${SYSTOLIC_HYPOTENSION_LIMIT}/${DIASTOLIC_HYPOTENSION_LIMIT}`;
      flags.push({
        type: "clinical_warning",
        message: `Pressão arterial ${checkIn.pressure}, ${limit}`,
      });
    }
  }

  const glycemia = parseMeasurement(checkIn.glycemia);
  if (glycemia !== null && glycemia > GLYCEMIA_DECOMPENSATION_LIMIT) {
    flags.push({
      type: "metabolic_decompensation",
      message: `Glicemia ${checkIn.glycemia}, acima de ${GLYCEMIA_DECOMPENSATION_LIMIT} mg/dL`,
    });
  }

  return { points, flags };
}

/**
 * Sums weekly points for care organization and returns measurement warnings
 * and critical weekly events for the dashboard. IVCF-20 informs some aspects
 * tracked, such as mood and mobility, but this check-in uses adapted questions,
 * its own score composition and cut-offs. It is not an IVCF-20 result or a
 * diagnostic tool. Applying the weights needs professional validation;
 * see docs/heuristica.md.
 */
export function evaluateCheckIn(checkIn: CheckIn): CheckInEvaluation {
  let score = 0;

  if (checkIn.skinIssues) score += 3;
  if (!checkIn.bowelRegular) score += 2;
  if (!checkIn.sleepWell) score += 2;
  if (checkIn.unstableGait) score += 4;

  for (const event of checkIn.weeklyEvents) {
    score += weeklyEventPoints(event);
  }

  const vitals = evaluateVitalSigns(checkIn);
  score += vitals.points;

  if (checkIn.appetite === "bad") score += 3;
  else if (checkIn.appetite === "regular") score += 1;
  if (checkIn.chokingIncident) score += 5;
  if (!checkIn.hydrationGoal) score += 2;
  if (!checkIn.medsOnTime) score += 3;

  if (checkIn.mood === "sad" || checkIn.mood === "very_sad") score += 2;
  else if (checkIn.mood === "neutral") score += 1;
  if (!checkIn.sunExposure) score += 1;
  if (!checkIn.selfExpression) score += 1;
  if (!checkIn.stimulation) score += 1;

  return {
    score,
    flags: vitals.flags,
    criticalEvents: checkIn.weeklyEvents.filter((event) =>
      CRITICAL_WEEKLY_EVENTS.has(event),
    ),
  };
}

/**
 * Maps weekly points to a follow-up level: stable (low) up to 5, attention
 * (moderate) from 6 to 11 and critical (high) from 12. These cut-offs need
 * professional validation; see docs/heuristica.md.
 */
function levelFromScore(score: number): RiskLevel {
  if (score >= HIGH_THRESHOLD) return "high";
  if (score >= MODERATE_THRESHOLD) return "moderate";
  return "low";
}

/**
 * Sets a minimum follow-up level without changing weekly points: a critical
 * intercorrence or a listed critical type forces "high"; any other event
 * forces at least "moderate"; no events means a "low" floor. This care-support
 * rule needs professional validation and does not diagnose severity.
 */
function acuteEventFloor(recentIntercorrences: Intercorrence[]): RiskLevel {
  if (
    recentIntercorrences.some(
      (event) => event.isCritical || CRITICAL_EVENT_TYPES.has(event.eventType),
    )
  ) {
    return "high";
  }
  return recentIntercorrences.length > 0 ? "moderate" : "low";
}

const LEVEL_ORDER: Record<RiskLevel, number> = {
  unknown: 0,
  low: 1,
  moderate: 2,
  high: 3,
};

/**
 * Combines the latest check-in (without an expiry rule) with intercorrences
 * selected by the caller, typically over 30 days. Returns the higher of the
 * weekly level and the intercorrence floor, keeping the weekly score. With
 * neither source the status is "unknown". Supports care organization, not
 * diagnosis; see docs/heuristica.md.
 */
export function computeRiskStatus(
  latestCheckIn: CheckIn | null,
  recentIntercorrences: Intercorrence[],
): RiskStatus {
  if (!latestCheckIn && recentIntercorrences.length === 0) {
    return { status: "unknown", score: 0 };
  }

  const score = latestCheckIn ? evaluateCheckIn(latestCheckIn).score : 0;
  const weeklyLevel = levelFromScore(score);
  const acuteLevel = acuteEventFloor(recentIntercorrences);
  const status =
    LEVEL_ORDER[acuteLevel] > LEVEL_ORDER[weeklyLevel]
      ? acuteLevel
      : weeklyLevel;

  return { status, score };
}
