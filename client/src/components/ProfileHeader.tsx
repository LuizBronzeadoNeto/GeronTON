import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { getProfile, type Profile } from "../api/profiles";
import { RiskStatusBadge } from "./RiskStatusBadge";
import { COLORS, FONTS } from "../theme";

interface Props {
  profileId: number;
}

/**
 * Returns a person's age in years for the "NN anos" subtitle.
 */
function ageInYears(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const hadBirthday =
    now.getMonth() > birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
  if (!hadBirthday) age -= 1;
  return age;
}

/**
 * Profile heading block from the Figma design, shown at the top of the
 * per-elderly screens (check-in, rotina): the person's name with the risk pill
 * beside it and the age underneath. Renders nothing until the profile loads and
 * stays hidden if the fetch fails — the screen content works without it.
 */
export function ProfileHeader({ profileId }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let active = true;
    getProfile(profileId)
      .then((data) => {
        if (active) setProfile(data);
      })
      .catch(() => {
        if (active) setProfile(null);
      });
    return () => {
      active = false;
    };
  }, [profileId]);

  if (!profile) return null;

  return (
    <View testID={`profile-header-${profileId}`} style={styles.container}>
      <View style={styles.nameRow}>
        <Text style={styles.name} numberOfLines={1}>
          {profile.firstName} {profile.lastName}
        </Text>
        <RiskStatusBadge profileId={profileId} />
      </View>
      <Text style={styles.subtitle}>{ageInYears(profile.birthDate)} anos</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    gap: 2,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: {
    fontFamily: FONTS.extraBold,
    fontSize: 24,
    color: COLORS.heading,
    flexShrink: 1,
  },
  subtitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.grey500,
  },
});
