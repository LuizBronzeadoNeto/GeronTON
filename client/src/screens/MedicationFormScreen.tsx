import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../types/navigation";
import {
  createMedication,
  getMedication,
  updateMedication,
  type MedicationInput,
} from "../api/medications";
import { PrimaryButton } from "../components/PrimaryButton";
import { ActionBar } from "../components/ActionBar";
import { formStyles } from "../components/formStyles";
import { COLORS } from "../theme";
import { FormScreen } from "../components/FormScreen";

type Props = NativeStackScreenProps<AppStackParamList, "MedicationForm">;

function emptyForm(): MedicationInput {
  return { name: "", dosage: "", frequency: "", notes: "" };
}

/**
 * Form screen for adding or editing a single medication. Receives profileId
 * and optionally medicationId via route params. When medicationId is present
 * the form is pre-filled for editing; otherwise it creates a new entry.
 */
export function MedicationFormScreen({ route, navigation }: Props) {
  const { profileId, medicationId } = route.params;
  const isEditing = medicationId !== undefined;

  const [form, setForm] = useState<MedicationInput>(emptyForm());
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (isEditing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true);
      getMedication(profileId, medicationId)
        .then((med) => {
          if (mountedRef.current) {
            setForm({
              name: med.name,
              dosage: med.dosage,
              frequency: med.frequency,
              notes: med.notes ?? "",
            });
          }
        })
        .catch(() => {
          if (mountedRef.current)
            setError("Não foi possível carregar o medicamento.");
        })
        .finally(() => {
          if (mountedRef.current) setLoading(false);
        });
    }
    return () => {
      mountedRef.current = false;
    };
  }, [profileId, medicationId, isEditing]);

  async function handleSave() {
    setSaving(true);
    setError(null);

    const name = form.name.trim();
    const dosage = form.dosage.trim();
    const frequency = form.frequency.trim();

    if (!name || !dosage || !frequency) {
      setError("Preencha nome, dosagem e frequência do medicamento.");
      setSaving(false);
      return;
    }

    const payload: MedicationInput = {
      name,
      dosage,
      frequency,
      notes: form.notes?.trim() || null,
    };

    try {
      if (isEditing) {
        await updateMedication(profileId, medicationId, payload);
      } else {
        await createMedication(profileId, payload);
      }
      navigation.goBack();
    } catch {
      setError("Não foi possível salvar o medicamento.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View testID="medication-form-loading" style={styles.centered}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  return (
    <FormScreen>
      <ScrollView
        testID="medication-form"
        contentContainerStyle={formStyles.container}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        <Text style={formStyles.title} accessibilityRole="header">
          {isEditing ? "Editar medicamento" : "Novo medicamento"}
        </Text>

        <View style={formStyles.field}>
          <Text style={formStyles.label}>Nome do medicamento</Text>
          <TextInput
            testID="medication-form-name"
            style={formStyles.input}
            placeholder="Ex: Losartana"
            placeholderTextColor={COLORS.grey400}
            accessibilityLabel="Nome do medicamento"
            value={form.name}
            onChangeText={(text) => setForm({ ...form, name: text })}
          />
        </View>

        <View style={formStyles.field}>
          <Text style={formStyles.label}>Dosagem</Text>
          <TextInput
            testID="medication-form-dosage"
            style={formStyles.input}
            placeholder="Ex: 50mg"
            placeholderTextColor={COLORS.grey400}
            accessibilityLabel="Dosagem"
            value={form.dosage}
            onChangeText={(text) => setForm({ ...form, dosage: text })}
          />
        </View>

        <View style={formStyles.field}>
          <Text style={formStyles.label}>Frequência</Text>
          <TextInput
            testID="medication-form-frequency"
            style={formStyles.input}
            placeholder="Ex: 1x ao dia"
            placeholderTextColor={COLORS.grey400}
            accessibilityLabel="Frequência"
            value={form.frequency}
            onChangeText={(text) => setForm({ ...form, frequency: text })}
          />
        </View>

        <View style={formStyles.field}>
          <Text style={formStyles.label}>Observações (opcional)</Text>
          <TextInput
            testID="medication-form-notes"
            style={[formStyles.input, formStyles.textArea]}
            placeholder="Ex: tomar pela manhã"
            placeholderTextColor={COLORS.grey400}
            accessibilityLabel="Observações"
            value={form.notes ?? ""}
            onChangeText={(text) => setForm({ ...form, notes: text })}
            multiline
            numberOfLines={3}
          />
        </View>

        {error ? (
          <Text testID="medication-form-error" style={formStyles.error}>
            {error}
          </Text>
        ) : null}
      </ScrollView>

      <ActionBar testID="medication-form-actions">
        <PrimaryButton
          testID="medication-form-cancel"
          title="Cancelar"
          variant="outline"
          onPress={() => navigation.goBack()}
        />
        <PrimaryButton
          testID="medication-form-save"
          title="Salvar"
          onPress={handleSave}
          disabled={saving}
          loading={saving}
        />
      </ActionBar>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
