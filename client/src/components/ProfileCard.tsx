import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Profile } from "../api/profiles";
import type { RiskLevel } from "../api/risk";
import type { WeeklyAdherence } from "../api/triage";
import { WEEKLY_EVENTS } from "../constants/checkin";
import { RiskStatusBadge } from "./RiskStatusBadge";
import { ageInYears, daysSince, formatDay } from "../utils/date";
import { COLORS, FONTS } from "../theme";

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
 * Display labels for the critical weekly events flagged on a triage card,
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
 * "Último check-in" line of a triage card, with how long ago it was so a
 * silent family stands out without opening the profile.
 */
function lastCheckInText(iso: string | null): string {
  if (!iso) return "Nenhum check-in ainda";
  const days = daysSince(iso);
  const ago = days === 0 ? "hoje" : days === 1 ? "há 1 dia" : `há ${days} dias`;
  return `Último check-in: ${formatDay(iso)} (${ago})`;
}

/**
 * Elderly-profile card from the Figma design, shared by the caregiver's "Meus
 * idosos" list and the professional's "Painel de triagem": avatar initial,
 * name with the risk pill, age (plus optionally the last check-in date and
 * how long ago it was) and a chevron. When the latest check-in reported critical weekly events
 * (criticalEvents), a red warning line flags them, per the screening
 * algorithm's visual-flag requirement. Tapping the card opens the elder's
 * detail hub, where the per-profile actions live.
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
  return (
    <Pressable
      testID={`${testIDPrefix}-item-${profile.id}`}
      accessibilityRole="button"
      style={styles.card}
      onPress={onOpen}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarInitial}>
          {profile.firstName.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.cardInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {profile.firstName} {profile.lastName}
          </Text>
          <RiskStatusBadge profileId={profile.id} status={riskStatus} />
        </View>
        <Text style={styles.cardLine}>
          {ageInYears(profile.birthDate)} anos
        </Text>
        {lastCheckInAt !== undefined ? (
          <Text style={styles.cardLine}>{lastCheckInText(lastCheckInAt)}</Text>
        ) : null}
        {adherence ? (
          <Text
            testID={`${testIDPrefix}-adherence-${profile.id}`}
            style={styles.cardLine}
          >
            Check-in em {adherence.weeksWithCheckIn} de{" "}
            {adherence.weeksObserved}{" "}
            {adherence.weeksObserved === 1 ? "semana" : "semanas"}
          </Text>
        ) : null}
        {criticalEvents.length > 0 ? (
          <View
            testID={`${testIDPrefix}-critical-${profile.id}`}
            style={styles.criticalRow}
          >
            <Ionicons name="warning" size={12} color={COLORS.danger} />
            <Text style={styles.criticalLine} numberOfLines={2}>
              Evento crítico na semana: {criticalEventsSummary(criticalEvents)}
            </Text>
          </View>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.grey400} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 12,
    padding: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontFamily: FONTS.extraBold,
    fontSize: 16,
    color: COLORS.white,
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  name: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.heading,
    flexShrink: 1,
  },
  cardLine: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.grey500,
  },
  criticalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  criticalLine: {
    flex: 1,
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.danger,
  },
});
