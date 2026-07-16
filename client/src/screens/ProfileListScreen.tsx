import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
import { COLORS, FONTS } from "../theme";

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
    <View testID="profile-list" style={styles.container}>
      <PrimaryButton
        testID="profile-add"
        title="+ Novo idoso"
        size="small"
        onPress={() => navigation.navigate("ProfileForm")}
      />

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

      <FlatList
        data={profiles}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={loading ? null : <RiskLegend />}
        ListFooterComponentStyle={styles.legendFooter}
        ListEmptyComponent={
          loading ? null : (
            <Text testID="profile-list-empty" style={styles.empty}>
              Você ainda não registrou nenhum idoso.
            </Text>
          )
        }
        renderItem={({ item }) => (
          <ProfileCard
            profile={item}
            testIDPrefix="profile"
            onOpen={() =>
              navigation.navigate("ProfileDetail", { profileId: item.id })
            }
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingHorizontal: 13,
    paddingTop: 16,
    gap: 16,
  },
  listContent: {
    gap: 12,
    paddingBottom: 24,
  },
  legendFooter: {
    marginTop: 12,
  },
  empty: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.primary,
    textAlign: "center",
    marginTop: 24,
  },
  error: {
    fontFamily: FONTS.semiBold,
    color: COLORS.danger,
    textAlign: "center",
  },
});
