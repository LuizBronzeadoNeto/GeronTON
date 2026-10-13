import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { getProfile, type Profile } from "../api/profiles";
import { RiskStatusBadge } from "./RiskStatusBadge";
import { ageInYears } from "../utils/date";
import { COLORS, SPACING, TYPE } from "../theme";

interface Props {
  profileId: number;
}

/**
 * Who a form is about, in one quiet line above it: the elder's name and age
 * with the risk pill on the right, separated from the form by a hairline. It
 * stays small so the form's own title is the first thing read.
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
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {profile.firstName} {profile.lastName}
        </Text>
        <Text style={styles.subtitle}>
          {ageInYears(profile.birthDate)} anos
        </Text>
      </View>
      <RiskStatusBadge profileId={profileId} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  text: {
    flex: 1,
  },
  name: {
    ...TYPE.bodyStrong,
  },
  subtitle: {
    ...TYPE.caption,
  },
});
