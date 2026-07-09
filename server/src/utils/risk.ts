import type { CheckIn, Intercorrence } from "@prisma/client";

export type RiskLevel = "low" | "moderate" | "high" | "unknown";

export interface RiskStatus {
  status: RiskLevel;
  score: number;
}

/**
 * A clinical warning derived from a check-in's optional vital signs by the
 * statistical-deviation (outlier) filter of the screening algorithm. These are
 * persisted as alerts on the profile so the care team sees them on the
 * dashboard; `sarcopenia_risk` additionally adds points to the weekly score.
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
 * Weekly events carrying the native critical tag of the screening algorithm:
 * each adds 5 points, accumulation forces the score into the critical range and
 * their presence raises a visual flag on the triage dashboard.
 */
export const CRITICAL_WEEKLY_EVENTS: ReadonlySet<string> = new Set([
  "fever",
  "breathing_difficulty",
  "fall_with_injury",
  "active_bleeding",
  "acute_confusion",
]);

/**
 * Points added per weekly event: 5 for the native critical tags, 3 for a fall
 * without injury (mechanical frailty) and 2 for pain or cough (declining
 * comfort / early dysphagia risk).
 */
function weeklyEventPoints(event: string): number {
  if (CRITICAL_WEEKLY_EVENTS.has(event)) return 5;
  if (event === "fall_without_injury") return 3;
  return 2;
}

/**
 * Acute-event types the interface maps as immediate high risk, mirroring the
 * weekly native critical tags (fever, shortness of breath, active bleeding,
 * acute confusion). Registering one of these elevates the elderly person to
 * critical status regardless of the severity the caregiver selected.
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
 * ("140/90", "12x8"). Returns null unless both numbers are present.
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
 * Statistical-deviation (outlier) filter for the optional vital signs, which
 * never enter the linear sum directly: saturation below 92% adds 4 points
 * (imminent hypoxia) and a left calf circumference below 31 cm adds 2 points
 * plus a sarcopenia/protein-malnutrition flag (IVCF-20). Blood pressure beyond
 * 140/90 or below 90/60 and glycemia above 200 mg/dL only raise clinical
 * warning flags, without scoring.
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
      message: `Risco de sarcopenia/desnutrição proteica: circunferência da panturrilha ${checkIn.calfCircumference} (< ${CALF_SARCOPENIA_LIMIT_CM} cm)`,
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
      flags.push({
        type: "clinical_warning",
        message: `Aviso clínico: pressão arterial ${checkIn.pressure} fora dos parâmetros (${hypertension ? "hipertensão" : "hipotensão"})`,
      });
    }
  }

  const glycemia = parseMeasurement(checkIn.glycemia);
  if (glycemia !== null && glycemia > GLYCEMIA_DECOMPENSATION_LIMIT) {
    flags.push({
      type: "metabolic_decompensation",
      message: `Descompensação metabólica: glicemia ${checkIn.glycemia} acima de ${GLYCEMIA_DECOMPENSATION_LIMIT} mg/dL`,
    });
  }

  return { points, flags };
}

/**
 * Evaluates a weekly check-in with the functional risk screening algorithm
 * (IVCF-20 + SUS care-pathway guidelines): a cumulative score weighted by
 * clinical severity across the health/vital-signs, nutrition/medication and
 * behavioral/stimulation domains, plus the vital-sign outlier filter. Returns
 * the total functional score (S_total), the clinical warning flags to persist
 * and the native-critical weekly events for the dashboard's visual flag.
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
 * Maps a total functional score to a state: stable (low) up to 5, attention
 * (moderate) from 6 to 11 and critical (high) from 12.
 */
function levelFromScore(score: number): RiskLevel {
  if (score >= HIGH_THRESHOLD) return "high";
  if (score >= MODERATE_THRESHOLD) return "moderate";
  return "low";
}

/**
 * Acute-event subsystem: the classification produced by recent intercorrences,
 * which follows the severity selected by the caregiver (or the intrinsically
 * critical event types) and overrides the weekly score. A critical event forces
 * "high"; any other event forces at least "moderate"; with none there is no
 * override ("low" floor).
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
 * Computes a profile's risk status from its most recent weekly check-in and its
 * recent intercorrences (the caller decides the window, typically 30 days). The
 * weekly score maps to a state (0–5 low, 6–11 moderate, 12+ high) and acute
 * events act as a floor on top of it: a critical one forces "high", any other
 * forces at least "moderate", and the more severe status always prevails. With
 * no check-in and no intercorrences there is nothing to assess and the status
 * is "unknown".
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
