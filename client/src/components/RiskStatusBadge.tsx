import { useEffect, useState } from "react";
import {
  getRiskStatus,
  subscribeRiskStatusInvalidation,
  type RiskLevel,
} from "../api/risk";
import { StatusPill } from "./StatusPill";
import { COLORS } from "../theme";

interface Props {
  profileId: number;
}

const LEVELS: Record<RiskLevel, { label: string; color: string; bg: string }> =
  {
    low: { label: "Estável", color: COLORS.success, bg: COLORS.successBg },
    moderate: {
      label: "Atenção",
      color: COLORS.warning,
      bg: COLORS.warningBg,
    },
    high: { label: "Crítico", color: COLORS.danger, bg: COLORS.dangerBadgeBg },
    unknown: {
      label: "Sem dados",
      color: COLORS.grey500,
      bg: "#EEEEEE",
    },
  };

/**
 * Status pill from the Figma design — a small rounded badge with a colored dot
 * and label ("Crítico", "Atenção", "Estável" or "Sem dados") shown next to a
 * profile wherever it appears. It reads through the cached risk API (so many
 * badges for the same profile share one request) and refetches when the cache
 * is invalidated by a mutation elsewhere in the app. Renders nothing while
 * loading and falls back to "Sem dados" on fetch errors.
 */
export function RiskStatusBadge({ profileId }: Props) {
  const [status, setStatus] = useState<RiskLevel | null>(null);

  useEffect(() => {
    let active = true;

    const load = () => {
      getRiskStatus(profileId)
        .then((risk) => {
          if (active) setStatus(risk.status);
        })
        .catch(() => {
          if (active) setStatus("unknown");
        });
    };

    load();
    const unsubscribe = subscribeRiskStatusInvalidation((invalidatedId) => {
      if (invalidatedId === undefined || invalidatedId === profileId) load();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [profileId]);

  if (!status) return null;

  const level = LEVELS[status];

  return (
    <StatusPill
      testID={`risk-badge-${profileId}`}
      labelTestID={`risk-badge-label-${profileId}`}
      label={level.label}
      color={level.color}
      backgroundColor={level.bg}
    />
  );
}
