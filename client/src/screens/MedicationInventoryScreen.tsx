import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../types/navigation";
import {
  deleteMedication,
  listMedications,
  type Medication,
} from "../api/medications";
import { PrimaryButton } from "../components/PrimaryButton";
import { COLORS, FONTS } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "MedicationInventory">;

/**
 * Medication inventory screen for an elderly profile, styled with the design
 * system: section title, a small primary "add" action and outlined item cards
 * with a trash icon to remove. Lists all medications of continuous use for the
 * profile (passed via route params).
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
          if (active) setError("Não foi possível carregar os medicamentos.");
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
            setMedications((old) =>
              old.filter((item) => item.id !== medicationId),
            );
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
      <View style={styles.header}>
        <Text style={styles.title}>Medicação de Uso Contínuo</Text>
        <PrimaryButton
          testID="medication-add"
          title="+ Adicionar"
          size="small"
          onPress={() => navigation.navigate("MedicationForm", { profileId })}
        />
      </View>

      {loading ? (
        <ActivityIndicator testID="medication-loading" color={COLORS.primary} />
      ) : null}

      {error ? (
        <Text testID="medication-error" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <FlatList
        data={medications}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
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
              accessibilityRole="button"
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
            <Pressable
              testID={`medication-delete-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel="Remover medicamento"
              style={styles.deleteButton}
              onPress={() => handleDelete(item.id)}
            >
              <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 20,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: 20,
    lineHeight: 28,
    color: COLORS.heading,
    flexShrink: 1,
  },
  listContent: {
    gap: 8,
    paddingBottom: 24,
  },
  empty: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.grey500,
    textAlign: "center",
    marginTop: 24,
  },
  error: {
    fontFamily: FONTS.semiBold,
    color: COLORS.danger,
    textAlign: "center",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.grey300,
    borderRadius: 8,
    padding: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.heading,
  },
  itemDetails: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.grey500,
    marginTop: 2,
  },
  itemNotes: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.grey400,
    marginTop: 4,
  },
  deleteButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
