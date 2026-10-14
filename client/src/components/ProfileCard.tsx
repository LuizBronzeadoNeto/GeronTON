import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Profile } from "../api/profiles";
import type { RiskLevel } from "../api/risk";
import type { WeeklyAdherence } from "../api/triage";
import { WEEKLY_EVENTS } from "../constants/checkin";
import { RISK_LEVELS } from "../constants/risk";
import { RiskStatusBadge } from "./RiskStatusBadge";
import { ageInYears, daysSince, formatDay } from "../utils/date";
import { COLORS, FONTS, SPACING, TYPE } from "../theme";

interface Props {
  profile: Profile;
  testIDPrefix: string;
  onOpen: () => void;
  /** The risk status, when the caller already has it (skips a request). */
  riskStatus?: RiskLevel;
  /** Shows the last check-in line; null means there has been none. */
  lastCheckInAt?: string | null;
  criticalEvents?: string[];
  adherence?: WeeklyAdherence;
}

/**
 * Display labels for the critical weekly events flagged on a triage row,
 * using the check-in wizard's labels; unknown keys fall back to themselves.
 */
function criticalEventsSummary(events: string[]): string {
  return events
    .map(
      (key) => WEEKLY_EVENTS.find((event) => event.key === key)?.label ?? key,
    )
    .join(", ");
}

/**
 * "Último check-in" line of a triage row, with how long ago it was so a
 * silent family stands out without opening the profile.
 */
function lastCheckInText(iso: string | null): string {
  if (!iso) return "Nenhum check-in ainda";
  const days = daysSince(iso);
  const ago = days === 0 ? "hoje" : days === 1 ? "há 1 dia" : `há ${days} dias`;
  return `Último check-in: ${formatDay(iso)} (${ago})`;
}

/**
 * One elder in a list (the caregiver's "Meus idosos" and the professional's
 * triage panel), drawn as a row of a grouped section: name with the risk pill,
 * age, optionally the last check-in and adherence, and a chevron. When the
 * status is known, a thin rule in the risk colour runs down the left edge, so
 * the urgency of the whole list can be scanned down one side. Critical weekly
 * events get a red line of their own, which helps prioritize follow-up, per
 * the care-support heuristic (docs/heuristica.md), not diagnosis.
 */
export function ProfileCard({
  profile,
  testIDPrefix,
  onOpen,
  riskStatus,
  lastCheckInAt,
  criticalEvents = [],
  adherence,
}: Props) {
  const testID = `${testIDPrefix}-item-${profile.id}`;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={onOpen}
    >
      {riskStatus ? (
        <View
          testID={`${testID}-accent`}
          style={[
            styles.accent,
            { backgroundColor: RISK_LEVELS[riskStatus].color },
          ]}
        />
      ) : null}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>
            {profile.firstName} {profile.lastName}
          </Text>
          <RiskStatusBadge profileId={profile.id} status={riskStatus} />
        </View>
        <Text style={styles.line}>{ageInYears(profile.birthDate)} anos</Text>
        {lastCheckInAt !== undefined ? (
          <Text style={styles.line}>{lastCheckInText(lastCheckInAt)}</Text>
        ) : null}
        {adherence ? (
          <Text
            testID={`${testIDPrefix}-adherence-${profile.id}`}
            style={styles.line}
          >
            Check-in em {adherence.weeksWithCheckIn} de{" "}
            {adherence.weeksObserved}{" "}
            {adherence.weeksObserved === 1 ? "semana" : "semanas"}
          </Text>
        ) : null}
        {criticalEvents.length > 0 ? (
          <Text
            testID={`${testIDPrefix}-critical-${profile.id}`}
            style={styles.criticalLine}
          >
            Evento crítico na semana: {criticalEventsSummary(criticalEvents)}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.grey400} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingLeft: SPACING.lg + 4,
    paddingRight: SPACING.md,
    backgroundColor: COLORS.white,
  },
  pressed: {
    backgroundColor: COLORS.surface,
  },
  accent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  name: {
    ...TYPE.bodyStrong,
    flexShrink: 1,
  },
  line: {
    ...TYPE.caption,
  },
  criticalLine: {
    ...TYPE.caption,
    fontFamily: FONTS.semiBold,
    color: COLORS.danger,
  },
});
