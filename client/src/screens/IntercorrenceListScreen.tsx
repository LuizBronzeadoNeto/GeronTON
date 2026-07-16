import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../types/navigation";
import {
  deleteIntercorrence,
  listIntercorrences,
  type Intercorrence,
} from "../api/intercorrences";
import { ProfileHeader } from "../components/ProfileHeader";
import { IntercorrenceRow } from "../components/IntercorrenceRow";
import { COLORS, FONTS } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "IntercorrenceList">;

/**
 * Full acute-event history of an elderly profile, most recent first — the
 * complete version of the profile hub's "Histórico recente" card, reached from
 * its "Ver todas" link and from the registration confirmation. Each row shows
 * the event with its severity pill and can be removed after confirmation.
 */
export function IntercorrenceListScreen({ route }: Props) {
  const { profileId } = route.params;

  const [intercorrences, setIntercorrences] = useState<Intercorrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setError(null);
      listIntercorrences(profileId)
        .then((data) => {
          if (active) setIntercorrences(data);
        })
        .catch(() => {
          if (active) setError("Não foi possível carregar o histórico.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [profileId]),
  );

  function confirmDelete(id: number) {
    Alert.alert(
      "Remover intercorrência",
      "Tem certeza que deseja remover este registro?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: async () => {
            const previous = intercorrences;
            setIntercorrences((old) => old.filter((item) => item.id !== id));
            try {
              await deleteIntercorrence(profileId, id);
            } catch {
              setIntercorrences(previous);
              setError("Não foi possível remover a intercorrência.");
            }
          },
        },
      ],
    );
  }

  return (
    <FlatList
      testID="intercorrence-list"
      style={styles.list}
      contentContainerStyle={styles.content}
      data={intercorrences}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={
        <>
          <ProfileHeader profileId={profileId} />
          <Text style={styles.title}>Histórico de intercorrências</Text>
          {loading ? (
            <ActivityIndicator
              testID="intercorrence-list-loading"
              color={COLORS.primary}
            />
          ) : null}
          {error ? (
            <Text testID="intercorrence-list-error" style={styles.error}>
              {error}
            </Text>
          ) : null}
        </>
      }
      ListEmptyComponent={
        loading ? null : (
          <Text testID="intercorrence-list-empty" style={styles.empty}>
            Nenhuma intercorrência registrada.
          </Text>
        )
      }
      renderItem={({ item }) => (
        <IntercorrenceRow
          intercorrence={item}
          testIDPrefix="history"
          onDelete={() => confirmDelete(item.id)}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: COLORS.white,
  },
  content: {
    padding: 20,
    gap: 14,
  },
  title: {
    fontFamily: FONTS.extraBold,
    fontSize: 18,
    color: COLORS.heading,
  },
  empty: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.grey500,
  },
  error: {
    fontFamily: FONTS.semiBold,
    color: COLORS.danger,
    textAlign: "center",
  },
});
