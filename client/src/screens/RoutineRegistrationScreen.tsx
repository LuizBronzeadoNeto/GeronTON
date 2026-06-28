import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../types/navigation";
import { deleteRoutine, listRoutines, type Routine } from "../api/routines";

type Props = NativeStackScreenProps<AppStackParamList, "RoutineRegistration">;

/**
 * Routine registration list screen for an elderly profile. Lists all routine
 * entries for the profile (passed via route params) and allows adding, editing,
 * and removing entries via navigation to RoutineForm.
 */
export function RoutineRegistrationScreen({ route, navigation }: Props) {
  const { profileId } = route.params;

  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError(null);
      listRoutines(profileId)
        .then((data) => {
          if (active) setRoutines(data);
        })
        .catch(() => {
          if (active) setError("Não foi possível carregar as rotinas.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [profileId]),
  );

  function handleDelete(routineId: number) {
    Alert.alert(
      "Remover rotina",
      "Tem certeza que deseja remover esta rotina?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: async () => {
            const previousRoutines = routines;
            setRoutines((old) => old.filter((item) => item.id !== routineId));
            try {
              await deleteRoutine(profileId, routineId);
            } catch {
              setRoutines(previousRoutines);
              setError("Não foi possível remover a rotina.");
            }
          },
        },
      ],
    );
  }

  /**
   * Build a short summary string from the routine fields for the list item.
   */
  function summary(r: Routine): string {
    return r.description
      ? `${r.title} · ${r.period} — ${r.description.slice(0, 40)}…`
      : `${r.title} · ${r.period}`;
  }

  return (
    <View testID="routine-registration" style={styles.container}>
      <Text style={styles.title}>Rotina e Aspectos Relevantes</Text>

      <Button
        testID="routine-add"
        title="Adicionar rotina"
        onPress={() => navigation.navigate("RoutineForm", { profileId })}
      />

      {loading ? <ActivityIndicator testID="routine-loading" /> : null}

      {error ? (
        <Text testID="routine-error" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <FlatList
        data={routines}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          loading ? null : (
            <Text testID="routine-empty" style={styles.empty}>
              Nenhuma rotina cadastrada.
            </Text>
          )
        }
        renderItem={({ item }) => (
          <View testID={`routine-item-${item.id}`} style={styles.item}>
            <Pressable
              style={styles.itemContent}
              onPress={() =>
                navigation.navigate("RoutineForm", {
                  profileId,
                  routineId: item.id,
                })
              }
            >
              <Text style={styles.itemSummary}>{summary(item)}</Text>
            </Pressable>
            <Button
              testID={`routine-delete-${item.id}`}
              title="Remover"
              color="#d32f2f"
              onPress={() => handleDelete(item.id)}
            />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  empty: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginTop: 24,
  },
  error: {
    color: "red",
    textAlign: "center",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  itemContent: {
    flex: 1,
    paddingVertical: 4,
  },
  itemSummary: {
    fontSize: 15,
    color: "#333",
  },
});
