import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../types/navigation";
import { listProfiles, type Profile } from "../api/profiles";
import { ProfileCard } from "../components/ProfileCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { RiskLegend } from "../components/RiskLegend";
import { Section } from "../components/Section";
import { COLORS, RADIUS, SPACING, TYPE } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "ProfileList">;

/**
 * "Meus idosos" screen from the Figma design: lists the elderly profiles the
 * user may access as outlined cards (avatar initial, name, risk pill and age)
 * with a "+ Novo idoso" button on top and the design's empty state. Tapping a
 * card opens the elder's detail hub. The risk-level legend closes the list so
 * caregivers can read each elder's current status pill. The list is refetched
 * each time the screen regains focus, so it reflects changes made elsewhere.
 */
export function ProfileListScreen({ navigation }: Props) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError(null);
      listProfiles()
        .then((data) => {
          if (active) setProfiles(data);
        })
        .catch(() => {
          if (active) setError("Não foi possível carregar os idosos.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <ScrollView
      testID="profile-list"
      style={styles.screen}
      contentContainerStyle={styles.container}
    >
      {loading ? (
        <ActivityIndicator
          testID="profile-list-loading"
          color={COLORS.primary}
        />
      ) : null}
      {error ? (
        <Text testID="profile-list-error" style={styles.error}>
          {error}
        </Text>
      ) : null}

      {!loading ? (
        <Section title="Idosos">
          {profiles.length === 0 ? (
            <Text testID="profile-list-empty" style={styles.empty}>
              Você ainda não registrou nenhum idoso.
            </Text>
          ) : (
            <View style={styles.list}>
              {profiles.map((item, index) => (
                <View key={item.id}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <ProfileCard
                    profile={item}
                    testIDPrefix="profile"
                    onOpen={() =>
                      navigation.navigate("ProfileDetail", {
                        profileId: item.id,
                      })
                    }
                  />
                </View>
              ))}
            </View>
          )}
          <PrimaryButton
            testID="profile-add"
            title="Adicionar idoso"
            variant="outline"
            onPress={() => navigation.navigate("ProfileIdentification")}
          />
        </Section>
      ) : null}

      {!loading ? <RiskLegend /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    padding: SPACING.screen,
    gap: SPACING.xl,
  },
  list: {
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.group,
    overflow: "hidden",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
  },
  empty: {
    ...TYPE.body,
    color: COLORS.grey500,
  },
  error: {
    ...TYPE.label,
    color: COLORS.danger,
    textAlign: "center",
  },
});
