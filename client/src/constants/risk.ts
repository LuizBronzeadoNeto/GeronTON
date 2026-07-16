import type { RiskLevel } from "../api/risk";
import { COLORS } from "../theme";

export interface RiskLevelPresentation {
  label: string;
  color: string;
  bg: string;
  description: string;
}

/**
 * Presentation of each risk level — pill label and colors plus the plain-
 * language explanation shown in the interface legend. Shared by
 * RiskStatusBadge and RiskLegend so the pills and the legend never drift.
 */
export const RISK_LEVELS: Record<RiskLevel, RiskLevelPresentation> = {
  high: {
    label: "Crítico",
    color: COLORS.danger,
    bg: COLORS.dangerBadgeBg,
    description:
      "Evento crítico recente ou muitos sinais de alerta no check-in. Acione a equipe de saúde.",
  },
  moderate: {
    label: "Atenção",
    color: COLORS.warning,
    bg: COLORS.warningBg,
    description:
      "Alguns sinais de alerta ou intercorrência recente. Requer observação mais próxima.",
  },
  low: {
    label: "Estável",
    color: COLORS.success,
    bg: COLORS.successBg,
    description: "Sem sinais de alerta no último check-in semanal.",
  },
  unknown: {
    label: "Sem dados",
    color: COLORS.grey500,
    bg: "#EEEEEE",
    description: "Nenhum check-in ou intercorrência registrada ainda.",
  },
};

/**
 * Legend display order: most severe first, matching the triage ordering.
 */
export const RISK_LEVEL_ORDER: RiskLevel[] = [
  "high",
  "moderate",
  "low",
  "unknown",
];
