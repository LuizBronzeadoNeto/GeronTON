import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
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
import { ProfileHeader } from "../components/ProfileHeader";
import { COLORS, RADIUS, SPACING, TYPE } from "../theme";
import { confirmDestructive } from "../utils/confirm";

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
    confirmDestructive(
      "Remover medicamento",
      "Tem certeza que deseja remover este medicamento?",
      async () => {
        const previousMedications = medications;
        setMedications((old) => old.filter((item) => item.id !== medicationId));
        try {
          await deleteMedication(profileId, medicationId);
        } catch {
          setMedications(previousMedications);
          setError("Não foi possível remover o medicamento.");
        }
      },
    );
  }

  return (
    <ScrollView
      testID="medication-inventory"
      style={styles.screen}
      contentContainerStyle={styles.container}
    >
      <ProfileHeader profileId={profileId} />

      <Text style={styles.title} accessibilityRole="header">
        Medicação de uso contínuo
      </Text>

      {loading ? (
        <ActivityIndicator testID="medication-loading" color={COLORS.primary} />
      ) : null}

      {error ? (
        <Text testID="medication-error" style={styles.error}>
          {error}
        </Text>
      ) : null}

      {!loading && medications.length === 0 ? (
        <Text testID="medication-empty" style={styles.empty}>
          Nenhum medicamento cadastrado.
        </Text>
      ) : null}

      {medications.length > 0 ? (
        <View style={styles.list}>
          {medications.map((item, index) => (
            <View key={item.id}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <View testID={`medication-item-${item.id}`} style={styles.item}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityHint="Abre para editar"
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
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={COLORS.grey500}
                  />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <PrimaryButton
        testID="medication-add"
        title="Adicionar medicamento"
        variant="outline"
        onPress={() => navigation.navigate("MedicationForm", { profileId })}
      />
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
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: SPACING.lg,
    paddingRight: SPACING.xs,
  },
  itemContent: {
    flex: 1,
    gap: 2,
    paddingVertical: SPACING.md,
  },
  itemName: {
    ...TYPE.bodyStrong,
  },
  itemDetails: {
    ...TYPE.caption,
  },
  itemNotes: {
    ...TYPE.body,
    fontSize: 14,
    lineHeight: 20,
  },
  deleteButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
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
