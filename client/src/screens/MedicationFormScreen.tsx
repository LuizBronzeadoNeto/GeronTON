import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../types/navigation";
import {
  createMedication,
  getMedication,
  updateMedication,
  type MedicationInput,
} from "../api/medications";

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
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <ScrollView
        testID="medication-form"
        style={styles.container}
        contentContainerStyle={styles.content}
        bounces={false}
      >
        <Text style={styles.title}>
          {isEditing ? "Editar medicamento" : "Novo medicamento"}
        </Text>

        {error ? (
          <Text testID="medication-form-error" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Text style={styles.label}>Nome do medicamento</Text>
        <TextInput
          testID="medication-form-name"
          style={styles.input}
          placeholder="Ex: Losartana"
          value={form.name}
          onChangeText={(text) => setForm({ ...form, name: text })}
        />

        <Text style={styles.label}>Dosagem</Text>
        <TextInput
          testID="medication-form-dosage"
          style={styles.input}
          placeholder="Ex: 50mg"
          value={form.dosage}
          onChangeText={(text) => setForm({ ...form, dosage: text })}
        />

        <Text style={styles.label}>Frequência</Text>
        <TextInput
          testID="medication-form-frequency"
          style={styles.input}
          placeholder="Ex: 1x ao dia"
          value={form.frequency}
          onChangeText={(text) => setForm({ ...form, frequency: text })}
        />

        <Text style={styles.label}>Observações (opcional)</Text>
        <TextInput
          testID="medication-form-notes"
          style={[styles.input, styles.textArea]}
          placeholder="Ex: tomar pela manhã"
          value={form.notes ?? ""}
          onChangeText={(text) => setForm({ ...form, notes: text })}
          multiline
          numberOfLines={3}
        />

        <View style={styles.buttons}>
          <Button
            testID="medication-form-cancel"
            title="Cancelar"
            onPress={() => navigation.goBack()}
          />
          <Button
            testID="medication-form-save"
            title="Salvar"
            onPress={handleSave}
            disabled={saving}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    gap: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
  },
  error: {
    color: "red",
    textAlign: "center",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: "#555",
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginTop: 4,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 24,
  },
});
