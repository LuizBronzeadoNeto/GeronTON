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
import {
  deleteMedication,
  listMedications,
  type Medication,
} from "../api/medications";

type Props = NativeStackScreenProps<AppStackParamList, "MedicationInventory">;

/**
 * Medication inventory screen for an elderly profile. Lists all medications of
 * continuous use for the profile (passed via route params) and allows adding,
 * editing, and removing entries.
 */
export function MedicationInventoryScreen({ route, navigation }: Props) {
  const { profileId } = route.params;

  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError(null);
      listMedications(profileId)
        .then((data) => {
          if (active) setMedications(data);
        })
        .catch(() => {
          if (active)
            setError("Não foi possível carregar os medicamentos.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [profileId]),
  );

  function handleDelete(medicationId: number) {
    Alert.alert(
      "Remover medicamento",
      "Tem certeza que deseja remover este medicamento?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: async () => {
            const previousMedications = medications;
            setMedications((old) => old.filter((item) => item.id !== medicationId));
            try {
              await deleteMedication(profileId, medicationId);
            } catch {
              setMedications(previousMedications);
              setError("Não foi possível remover o medicamento.");
            }
          },
        },
      ],
    );
  }

  return (
    <View testID="medication-inventory" style={styles.container}>
      <Text style={styles.title}>Medicação de Uso Contínuo</Text>

      <Button
        testID="medication-add"
        title="Adicionar medicamento"
        onPress={() =>
          navigation.navigate("MedicationForm", { profileId })
        }
      />

      {loading ? (
        <ActivityIndicator testID="medication-loading" />
      ) : null}

      {error ? (
        <Text testID="medication-error" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <FlatList
        data={medications}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          loading ? null : (
            <Text testID="medication-empty" style={styles.empty}>
              Nenhum medicamento cadastrado.
            </Text>
          )
        }
        renderItem={({ item }) => (
          <View testID={`medication-item-${item.id}`} style={styles.item}>
            <Pressable
              style={styles.itemContent}
              onPress={() =>
                navigation.navigate("MedicationForm", {
                  profileId,
                  medicationId: item.id,
                })
              }
            >
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemDetails}>
                {item.dosage} · {item.frequency}
              </Text>
              {item.notes ? (
                <Text style={styles.itemNotes}>{item.notes}</Text>
              ) : null}
            </Pressable>
            <Button
              testID={`medication-delete-${item.id}`}
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
  itemName: {
    fontSize: 18,
    fontWeight: "600",
  },
  itemDetails: {
    fontSize: 14,
    color: "#555",
    marginTop: 2,
  },
  itemNotes: {
    fontSize: 13,
    color: "#888",
    marginTop: 4,
  },
});
