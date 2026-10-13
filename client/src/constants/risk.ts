import type { RiskLevel } from "../api/risk";
import { COLORS } from "../theme";

export interface RiskLevelPresentation {
  label: string;
  color: string;
  bg: string;
  description: string;
}

/**
 * Presentation of each risk level, pill label and colors plus the plain-
 * language explanation shown in the interface legend. Shared by
 * RiskStatusBadge and RiskLegend so the pills and the legend never drift.
 *
 * The descriptions talk about signals and getting in touch, not diagnosis.
 * The score only says someone should check on the elder.
 */
export const RISK_LEVELS: Record<RiskLevel, RiskLevelPresentation> = {
  high: {
    label: "Crítico",
    color: COLORS.danger,
    bg: COLORS.dangerBadgeBg,
    description:
      "Evento grave recente ou vários sinais no último check-in. Entre em contato com a família o quanto antes.",
  },
  moderate: {
    label: "Atenção",
    color: COLORS.warning,
    bg: COLORS.warningBg,
    description:
      "Alguns sinais no check-in ou intercorrência recente. Vale um contato para entender melhor.",
  },
  low: {
    label: "Estável",
    color: COLORS.success,
    bg: COLORS.successBg,
    description: "Nenhum sinal no último check-in semanal.",
  },
  unknown: {
    label: "Sem dados",
    color: COLORS.grey500,
    bg: "#EEEEEE",
    description:
      "Sem check-in nas últimas 2 semanas nem intercorrência recente. Vale confirmar com a família como o idoso está.",
  },
};

/**
 * Legend display order: most severe first, matching the triage ordering.
 */
export const RISK_LEVEL_ORDER: RiskLevel[] = [
  "high",
  "moderate",
  "unknown",
  "low",
];
