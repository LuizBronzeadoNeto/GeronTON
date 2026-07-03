import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../types/navigation";
import { listProfiles } from "../api/profiles";
import { useAuth } from "../context/AuthContext";
import { PrimaryButton } from "../components/PrimaryButton";
import { COLORS, FONTS } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "Redirect">;

/**
 * Post-login dispatcher and the app stack's initial route. A profissional goes
 * straight to their triage-panel Home. For a cuidador it fetches their profiles
 * and resets navigation to the screen that best fits how many they have:
 * none -> the create form, exactly one -> that elder's detail hub,
 * several -> the profile list. Home is seeded beneath the destination so the
 * back button stays usable. It is shown only briefly, while the profiles load.
 */
export function RedirectScreen({ navigation }: Props) {
  const { user } = useAuth();
  const role = user?.role;
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    if (role === "profissional") {
      navigation.reset({ index: 0, routes: [{ name: "Home" }] });
      return () => {
        active = false;
      };
    }

    listProfiles()
      .then((profiles) => {
        if (!active) return;
        if (profiles.length === 0) {
          navigation.reset({
            index: 1,
            routes: [{ name: "Home" }, { name: "ProfileForm" }],
          });
        } else if (profiles.length === 1) {
          navigation.reset({
            index: 1,
            routes: [
              { name: "Home" },
              { name: "ProfileDetail", params: { profileId: profiles[0].id } },
            ],
          });
        } else {
          navigation.reset({
            index: 1,
            routes: [{ name: "Home" }, { name: "ProfileList" }],
          });
        }
      })
      .catch(() => {
        if (active) setError(true);
      });

    return () => {
      active = false;
    };
  }, [navigation, attempt, role]);

  if (error) {
    return (
      <View testID="redirect-error" style={styles.container}>
        <Text style={styles.errorText}>
          Não foi possível carregar seus dados.
        </Text>
        <PrimaryButton
          testID="redirect-retry"
          title="Tentar novamente"
          style={styles.retry}
          onPress={() => {
            setError(false);
            setAttempt((current) => current + 1);
          }}
        />
      </View>
    );
  }

  return (
    <ActivityIndicator
      testID="redirect-loading"
      color={COLORS.primary}
      style={styles.loading}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.white,
    padding: 24,
    gap: 16,
  },
  loading: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  errorText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.grey500,
    textAlign: "center",
  },
  retry: {
    alignSelf: "stretch",
    marginHorizontal: 24,
  },
});
