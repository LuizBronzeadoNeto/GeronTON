import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Profile } from "../api/profiles";
import { listCheckIns } from "../api/checkins";
import { RiskStatusBadge } from "./RiskStatusBadge";
import { ageInYears } from "../utils/date";
import { COLORS, FONTS } from "../theme";

interface Props {
  profile: Profile;
  testIDPrefix: string;
  onOpen: () => void;
  showLastCheckIn?: boolean;
}

/**
 * "Último check-in: <date>" line for a triage card. Fetches the profile's most
 * recent check-in and shows the design's "-----" placeholder when there is
 * none (or the fetch fails).
 */
function LastCheckInLine({ profileId }: { profileId: number }) {
  const [date, setDate] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    listCheckIns(profileId)
      .then((checkIns) => {
        if (active) setDate(checkIns[0]?.date ?? null);
      })
      .catch(() => {
        if (active) setDate(null);
      });
    return () => {
      active = false;
    };
  }, [profileId]);

  if (date === undefined) return null;

  return (
    <Text style={styles.cardLine}>
      Último check-in: {date ? date.slice(0, 10) : "-----"}
    </Text>
  );
}

/**
 * Elderly-profile card from the Figma design, shared by the caregiver's "Meus
 * idosos" list and the professional's "Painel de triagem": avatar initial,
 * name with the risk pill, age (plus optionally the last check-in date) and a
 * chevron. Tapping it opens the elder's detail hub, where the per-profile
 * actions live.
 */
export function ProfileCard({
  profile,
  testIDPrefix,
  onOpen,
  showLastCheckIn = false,
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
          <RiskStatusBadge profileId={profile.id} />
        </View>
        <Text style={styles.cardLine}>
          {ageInYears(profile.birthDate)} anos
        </Text>
        {showLastCheckIn ? <LastCheckInLine profileId={profile.id} /> : null}
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
});
