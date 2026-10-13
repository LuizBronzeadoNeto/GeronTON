import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { getRiskStatus, subscribeRiskStatusInvalidation } from "../api/risk";
import { COLORS, FONTS } from "../theme";

interface Props {
  profileId: number;
}

/**
 * Why the elder has their current risk level: the recent events and the
 * check-in answers that added points, as returned by /risco. Shares the risk
 * cache with RiskStatusBadge, so it costs no extra request.
 */
export function RiskReasons({ profileId }: Props) {
  const [reasons, setReasons] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    const load = () => {
      getRiskStatus(profileId)
        .then((risk) => {
          if (active) setReasons(risk.reasons);
        })
        .catch(() => {});
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

  if (reasons.length === 0) return null;

  return (
    <View testID="risk-reasons" style={styles.box}>
      <Text style={styles.title}>Por que esta situação</Text>
      {reasons.map((reason) => (
        <Text key={reason} style={styles.reason}>
          • {reason}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: 2,
    padding: 12,
    borderRadius: 8,
    backgroundColor: COLORS.chipBg,
    marginTop: 8,
  },
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.heading,
  },
  reason: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.text,
  },
});
