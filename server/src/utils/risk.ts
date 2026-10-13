import type { CheckIn, Intercorrence } from "@prisma/client";

export type RiskLevel = "low" | "moderate" | "high" | "unknown";

export interface RiskStatus {
  status: RiskLevel;
  score: number;
  criticalEvents: string[];
}

/**
 * A clinical warning derived from a check-in's optional vital signs by the
 * statistical-deviation (outlier) filter of the screening algorithm. These are
 * persisted as alerts on the profile so the care team sees them on the
 * dashboard; `sarcopenia_risk` additionally adds points to the weekly score.
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
 * acute confusion), plus chest pain and choking, which are emergencies
 * whatever severity the caregiver picked. Registering one of these elevates
 * the elderly person to critical status regardless of the severity selected.
 */
export const CRITICAL_EVENT_TYPES: ReadonlySet<string> = new Set([
  "fever",
  "breathing_difficulties",
  "bleeding",
  "confusion",
  "chest_pain",
  "choking",
]);

/**
 * Whether an intercorrence counts as critical: the caregiver's own flag, or an
 * event type that is critical whatever they selected.
 */
export function isCriticalIntercorrence(event: {
  eventType: string;
  isCritical: boolean;
}): boolean {
  return event.isCritical || CRITICAL_EVENT_TYPES.has(event.eventType);
}

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
 * Below this both blood-pressure numbers are in cmHg, as in the spoken
 * Brazilian "12 por 8".
 */
const CMHG_LIMIT = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A weekly check-in older than this no longer describes how the elder is now,
 * so it stops counting towards the risk status.
 */
export const STALE_CHECKIN_DAYS = 14;

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
 * Extracts a systolic/diastolic pair in mmHg from a free-text blood-pressure
 * entry ("140/90", "12x8", "12 por 8"). Readings written in cmHg are scaled to
 * mmHg. Returns null unless both numbers are present.
 */
function parsePressure(
  value: string | null,
): { systolic: number; diastolic: number } | null {
  if (!value) return null;
  const match = value.match(
    /(\d+(?:[.,]\d+)?)\s*(?:[/x]|por)\s*(\d+(?:[.,]\d+)?)/i,
  );
  if (!match) return null;
  const systolic = Number(match[1].replace(",", "."));
  const diastolic = Number(match[2].replace(",", "."));
  const scale = systolic < CMHG_LIMIT && diastolic < CMHG_LIMIT ? 10 : 1;
  return { systolic: systolic * scale, diastolic: diastolic * scale };
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
        message: `Pressão arterial ${pressure.systolic}/${pressure.diastolic}, ${limit}`,
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
  if (recentIntercorrences.some(isCriticalIntercorrence)) {
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
 * forces at least "moderate", and the more severe status always prevails. A
 * check-in older than STALE_CHECKIN_DAYS is ignored, so a family that stopped
 * reporting does not keep showing an old "stable". With no recent check-in and
 * no intercorrences there is nothing to assess and the status is "unknown".
 */
export function computeRiskStatus(
  latestCheckIn: CheckIn | null,
  recentIntercorrences: Intercorrence[],
  now = new Date(),
): RiskStatus {
  const checkIn =
    latestCheckIn &&
    now.getTime() - latestCheckIn.date.getTime() <= STALE_CHECKIN_DAYS * DAY_MS
      ? latestCheckIn
      : null;

  if (!checkIn && recentIntercorrences.length === 0) {
    return { status: "unknown", score: 0, criticalEvents: [] };
  }

  const evaluation = checkIn ? evaluateCheckIn(checkIn) : null;
  const score = evaluation?.score ?? 0;
  const weeklyLevel = levelFromScore(score);
  const acuteLevel = acuteEventFloor(recentIntercorrences);
  const status =
    LEVEL_ORDER[acuteLevel] > LEVEL_ORDER[weeklyLevel]
      ? acuteLevel
      : weeklyLevel;

  return { status, score, criticalEvents: evaluation?.criticalEvents ?? [] };
}
