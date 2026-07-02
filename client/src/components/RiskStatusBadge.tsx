import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  getRiskStatus,
  subscribeRiskStatusInvalidation,
  type RiskLevel,
} from "../api/risk";

interface Props {
  profileId: number;
}

const LEVELS: Record<RiskLevel, { label: string; text: string; bg: string }> = {
  low: { label: "Baixo risco", text: "#1b5e20", bg: "#e8f5e9" },
  moderate: { label: "Risco moderado", text: "#e65100", bg: "#fff3e0" },
  high: { label: "Alto risco", text: "#b71c1c", bg: "#ffebee" },
  unknown: { label: "Sem dados", text: "#555", bg: "#eeeeee" },
};

/**
 * Reusable pill showing a profile's current risk level. It reads through the
 * cached risk API (so many badges for the same profile share one request) and
 * refetches when the cache is invalidated by a mutation elsewhere in the app.
 * Renders nothing while loading and falls back to "Sem dados" on fetch errors.
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
    <View
      testID={`risk-badge-${profileId}`}
      style={[styles.badge, { backgroundColor: level.bg }]}
    >
      <Text
        testID={`risk-badge-label-${profileId}`}
        style={[styles.label, { color: level.text }]}
      >
        {level.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "bold",
  },
});
