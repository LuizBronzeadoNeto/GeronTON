import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Alert, AlertSeverity, AlertType } from "../api/alerts";
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
 * Icon per alert type, so the professional reads the alert's nature at a
 * glance: the house marks a weakened home bond (missing weekly reports), the
 * others mark the vital-sign warnings derived from a check-in.
 */
const TYPE_ICONS: Record<AlertType, keyof typeof Ionicons.glyphMap> = {
  weakened_home_bond: "home-outline",
  clinical_warning: "pulse-outline",
  metabolic_decompensation: "water-outline",
  sarcopenia_risk: "body-outline",
};

/**
 * Card for a clinical alert (weakened home bond, vital-sign warnings): a
 * type icon, the severity pill, the message, an optional subtitle (the elderly
 * person's name on the professional dashboard) and the creation timestamp.
 * `onPress` makes the card tappable (e.g. to open the elder's hub) and
 * `onResolve` adds the "Resolver" action shown to healthcare professionals.
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
      <View testID={`alert-icon-${alert.type}`} style={styles.iconBadge}>
        <Ionicons
          name={TYPE_ICONS[alert.type]}
          size={18}
          color={severity.color}
        />
      </View>
      <View style={styles.content}>
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
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 12,
    padding: 12,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  content: {
    flex: 1,
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
