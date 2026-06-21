import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../types/navigation";
import { listProfiles } from "../api/profiles";

type Props = NativeStackScreenProps<AppStackParamList, "Redirect">;

/**
 * Post-login dispatcher and the app stack's initial route. It fetches the user's
 * profiles and resets navigation to the screen that best fits how many they
 * have: none -> the create form, exactly one -> that elder's weekly check-in,
 * several -> the profile list. Home is seeded beneath the destination so the
 * back button stays usable. It is shown only briefly, while the profiles load.
 */
export function RedirectScreen({ navigation }: Props) {
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

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
              { name: "WeeklyCheckIn", params: { profileId: profiles[0].id } },
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
  }, [navigation, attempt]);

  if (error) {
    return (
      <View testID="redirect-error" style={styles.container}>
        <Text style={styles.errorText}>
          Não foi possível carregar seus dados.
        </Text>
        <Button
          testID="redirect-retry"
          title="Tentar novamente"
          onPress={() => {
            setError(false);
            setAttempt((current) => current + 1);
          }}
        />
      </View>
    );
  }

  return <ActivityIndicator testID="redirect-loading" style={styles.loading} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 16,
  },
  loading: {
    flex: 1,
  },
  errorText: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
  },
});
