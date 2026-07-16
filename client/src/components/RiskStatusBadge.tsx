import { useEffect, useState } from "react";
import {
  getRiskStatus,
  subscribeRiskStatusInvalidation,
  type RiskLevel,
} from "../api/risk";
import { RISK_LEVELS } from "../constants/risk";
import { StatusPill } from "./StatusPill";

interface Props {
  profileId: number;
}

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

  const level = RISK_LEVELS[status];

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
