import type { CheckIn, Intercorrence } from "@prisma/client";
import { weeklyEventLabel } from "./labels.js";

export type RiskLevel = "low" | "moderate" | "high" | "unknown";

export interface RiskStatus {
  status: RiskLevel;
  score: number;
  criticalEvents: string[];
  /**
   * Why the status is what it is, in plain words: the recent events and the
   * check-in answers that added points, e.g. "Apetite ruim (+3)".
   */
  reasons: string[];
}

/**
 * One check-in answer that added to the weekly score, and by how much.
 */
export interface RiskFactor {
  label: string;
  points: number;
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
  factors: RiskFactor[];
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
 * caregiver's severity choice: the weekly critical tags (fever, shortness of
 * breath, active bleeding, acute confusion) plus chest pain and choking, which
 * are emergencies whatever severity was picked. Unlike weekly event tags,
 * these set a floor without adding points. This rule needs professional
 * validation.
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
 * entry ("140/90", "12x8", "12 por 8"). Readings written in cmHg (both numbers
 * below CMHG_LIMIT) are scaled to mmHg. Returns null unless both numbers are
 * present.
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
 * Compares optional measurements with fixed limits: saturation < 92% adds
 * 4 points; calf circumference < 31 cm adds 2 points and a warning. Pressure
 * (systolic > 140 or diastolic > 90, or systolic < 90 or diastolic < 60) and
 * glycemia > 200 mg/dL only raise warnings. The calf limit and its 2-point
 * contribution match a condition within IVCF-20's combined capacity item;
 * that full item is not implemented here. Applying these rules in GeronTON
 * needs professional validation; see docs/heuristica.md. This does not diagnose.
 */
function evaluateVitalSigns(checkIn: CheckIn): {
  factors: RiskFactor[];
  flags: ClinicalFlag[];
} {
  const factors: RiskFactor[] = [];
  const flags: ClinicalFlag[] = [];

  const saturation = parseMeasurement(checkIn.saturation);
  if (saturation !== null && saturation < SATURATION_HYPOXIA_LIMIT) {
    factors.push({
      label: `Saturação abaixo de ${SATURATION_HYPOXIA_LIMIT}%`,
      points: 4,
    });
  }

  const calf = parseMeasurement(checkIn.calfCircumference);
  if (calf !== null && calf < CALF_SARCOPENIA_LIMIT_CM) {
    factors.push({
      label: `Panturrilha abaixo de ${CALF_SARCOPENIA_LIMIT_CM} cm`,
      points: 2,
    });
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

  return { factors, flags };
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
  const factors: RiskFactor[] = [];
  const add = (applies: boolean, points: number, label: string) => {
    if (applies) factors.push({ label, points });
  };

  add(checkIn.skinIssues, 3, "Mancha ou vermelhidão na pele");
  add(!checkIn.bowelRegular, 2, "Intestino irregular");
  add(!checkIn.sleepWell, 2, "Noites mal dormidas");
  add(checkIn.unstableGait, 4, "Andando com mais dificuldade");
  for (const event of checkIn.weeklyEvents) {
    add(true, weeklyEventPoints(event), `${weeklyEventLabel(event)} na semana`);
  }

  const vitals = evaluateVitalSigns(checkIn);
  factors.push(...vitals.factors);

  add(checkIn.appetite === "bad", 3, "Apetite ruim");
  add(checkIn.appetite === "regular", 1, "Apetite regular");
  add(checkIn.chokingIncident, 5, "Engasgo ao comer ou beber");
  add(!checkIn.hydrationGoal, 2, "Não bebeu água suficiente");
  add(!checkIn.medsOnTime, 3, "Remédios fora do horário ou recusados");
  add(checkIn.mood === "sad" || checkIn.mood === "very_sad", 2, "Humor triste");
  add(checkIn.mood === "neutral", 1, "Humor neutro");
  add(!checkIn.sunExposure, 1, "Não tomou sol nem saiu do quarto");
  add(!checkIn.selfExpression, 1, "Dificuldade para se expressar");
  add(!checkIn.stimulation, 1, "Sem estímulos na semana");

  return {
    score: factors.reduce((sum, factor) => sum + factor.points, 0),
    factors,
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
  if (recentIntercorrences.some(isCriticalIntercorrence)) {
    return "high";
  }
  return recentIntercorrences.length > 0 ? "moderate" : "low";
}

/**
 * The acute-event part of the explanation, matching acuteEventFloor.
 */
function acuteReason(recentIntercorrences: Intercorrence[]): string | null {
  if (recentIntercorrences.some(isCriticalIntercorrence)) {
    return "Intercorrência crítica nos últimos 30 dias";
  }
  return recentIntercorrences.length > 0
    ? "Intercorrência nos últimos 30 dias"
    : null;
}

const NO_RECENT_CHECKIN = "Sem check-in nas últimas 2 semanas";

const LEVEL_ORDER: Record<RiskLevel, number> = {
  unknown: 0,
  low: 1,
  moderate: 2,
  high: 3,
};

/**
 * Combines the latest check-in with intercorrences selected by the caller,
 * typically over 30 days. Returns the higher of the weekly level and the
 * intercorrence floor, keeping the weekly score. A check-in older than
 * STALE_CHECKIN_DAYS is ignored, so a family that stopped reporting does not
 * keep showing an old "stable". With neither source the status is "unknown".
 * The reasons explain the result: the intercorrences first, then each check-in
 * answer that added points. Supports care organization, not diagnosis; see
 * docs/heuristica.md.
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
    return {
      status: "unknown",
      score: 0,
      criticalEvents: [],
      reasons: [NO_RECENT_CHECKIN],
    };
  }

  const evaluation = checkIn ? evaluateCheckIn(checkIn) : null;
  const score = evaluation?.score ?? 0;
  const weeklyLevel = levelFromScore(score);
  const acuteLevel = acuteEventFloor(recentIntercorrences);
  const status =
    LEVEL_ORDER[acuteLevel] > LEVEL_ORDER[weeklyLevel]
      ? acuteLevel
      : weeklyLevel;

  const reasons = [
    acuteReason(recentIntercorrences),
    ...(evaluation
      ? evaluation.factors.map(
          (factor) => `${factor.label} (+${factor.points})`,
        )
      : [NO_RECENT_CHECKIN]),
  ].filter((reason): reason is string => reason !== null);

  return {
    status,
    score,
    criticalEvents: evaluation?.criticalEvents ?? [],
    reasons,
  };
}
