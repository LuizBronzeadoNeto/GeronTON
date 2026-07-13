import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Alert, AlertSeverity } from "../api/alerts";
import { StatusPill } from "./StatusPill";
import { formatTimestamp } from "../utils/date";
import { COLORS, FONTS } from "../theme";

interface Props {
  alert: Alert;
  testID?: string;
  subtitle?: string;
  onPress?: () => void;
  onResolve?: () => void;
}

const SEVERITIES: Record<
  AlertSeverity,
  { label: string; color: string; bg: string }
> = {
  attention: { label: "Atenção", color: COLORS.warning, bg: COLORS.warningBg },
  critical: {
    label: "Crítico",
    color: COLORS.danger,
    bg: COLORS.dangerBadgeBg,
  },
};

/**
 * Card for a clinical alert (weakened home bond, vital-sign warnings): the
 * severity pill, the message, an optional subtitle (the elderly person's name
 * on the professional dashboard) and the creation timestamp. `onPress` makes
 * the card tappable (e.g. to open the elder's hub) and `onResolve` adds the
 * "Resolver" action shown to healthcare professionals.
 */
export function AlertCard({
  alert,
  testID,
  subtitle,
  onPress,
  onResolve,
}: Props) {
  const severity = SEVERITIES[alert.severity];

  return (
    <Pressable
      testID={testID}
      accessibilityRole={onPress ? "button" : undefined}
      style={[styles.card, { backgroundColor: severity.bg }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <StatusPill
          label={severity.label}
          color={severity.color}
          backgroundColor={COLORS.white}
        />
        {onResolve ? (
          <Pressable
            testID={testID ? `${testID}-resolve` : undefined}
            accessibilityRole="button"
            accessibilityLabel="Resolver alerta"
            style={styles.resolveButton}
            onPress={onResolve}
          >
            <Text style={styles.resolveLabel}>Resolver</Text>
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.message}>{alert.message}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <Text style={styles.date}>{formatTimestamp(alert.createdAt)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  message: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.heading,
  },
  subtitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.grey500,
  },
  date: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: COLORS.grey500,
  },
  resolveButton: {
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.grey300,
    backgroundColor: COLORS.white,
    paddingHorizontal: 10,
    justifyContent: "center",
  },
  resolveLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.heading,
  },
});
