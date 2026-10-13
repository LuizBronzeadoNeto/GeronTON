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
import {
  deleteIntercorrence,
  listIntercorrences,
  type Intercorrence,
} from "../api/intercorrences";
import { ProfileHeader } from "../components/ProfileHeader";
import { IntercorrenceRow } from "../components/IntercorrenceRow";
import { COLORS, RADIUS, SPACING, TYPE } from "../theme";
import { confirmDestructive } from "../utils/confirm";

type Props = NativeStackScreenProps<AppStackParamList, "IntercorrenceList">;

/**
 * Full acute-event history of an elderly profile, most recent first, the
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
    confirmDestructive(
      "Remover intercorrência",
      "Tem certeza que deseja remover este registro?",
      async () => {
        const previous = intercorrences;
        setIntercorrences((old) => old.filter((item) => item.id !== id));
        try {
          await deleteIntercorrence(profileId, id);
        } catch {
          setIntercorrences(previous);
          setError("Não foi possível remover a intercorrência.");
        }
      },
    );
  }

  return (
    <ScrollView
      testID="intercorrence-list"
      style={styles.screen}
      contentContainerStyle={styles.container}
    >
      <ProfileHeader profileId={profileId} />
      <Text style={styles.title} accessibilityRole="header">
        Histórico de intercorrências
      </Text>
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
      {!loading && intercorrences.length === 0 ? (
        <Text testID="intercorrence-list-empty" style={styles.empty}>
          Nenhuma intercorrência registrada.
        </Text>
      ) : null}
      {intercorrences.length > 0 ? (
        <View style={styles.list}>
          {intercorrences.map((item, index) => (
            <View key={item.id}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <IntercorrenceRow
                intercorrence={item}
                testIDPrefix="history"
                onDelete={() => confirmDelete(item.id)}
              />
            </View>
          ))}
        </View>
      ) : null}
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
    gap: SPACING.lg,
  },
  title: {
    ...TYPE.title,
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
  },
});
