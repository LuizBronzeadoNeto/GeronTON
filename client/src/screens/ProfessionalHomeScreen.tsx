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
import { COLORS, FONTS } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "Home">;

/**
 * "Painel de triagem" — the professional's home from the Figma design: every
 * elderly profile as a card with avatar, name, risk pill, age and last
 * check-in, colored by clinical priority via the risk badge. Cards open the
 * elder's detail hub (with the check-in, intercorrence, rotina and medication
 * actions); the header action registers a new profile.
 */
export function ProfessionalHomeScreen({ navigation }: Props) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
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
    <View testID="professional-home" style={styles.container}>
      <Text style={styles.description}>
        Idosos sob seu acompanhamento, ordenados por nível de risco. Cores
        indicam prioridade clínica.
      </Text>

      <PrimaryButton
        testID="professional-add"
        title="+ Cadastrar idoso"
        size="small"
        onPress={() => navigation.navigate("ProfileForm")}
      />

      {loading ? (
        <ActivityIndicator
          testID="professional-loading"
          color={COLORS.primary}
        />
      ) : null}
      {error ? (
        <Text testID="professional-error" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <FlatList
        data={profiles}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          loading ? null : (
            <Text testID="professional-empty" style={styles.empty}>
              Nenhum idoso vinculado ainda
            </Text>
          )
        }
        renderItem={({ item }) => (
          <ProfileCard
            profile={item}
            testIDPrefix="professional"
            showLastCheckIn
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
    paddingTop: 8,
    gap: 16,
  },
  description: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.grey500,
    paddingHorizontal: 8,
  },
  listContent: {
    gap: 12,
    paddingBottom: 24,
  },
  empty: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.primary,
    textAlign: "center",
    marginTop: 120,
  },
  error: {
    fontFamily: FONTS.semiBold,
    color: COLORS.danger,
    textAlign: "center",
  },
});
