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
  createRoutine,
  getRoutine,
  updateRoutine,
  type RoutineInput,
} from "../api/routines";

type Props = NativeStackScreenProps<AppStackParamList, "RoutineForm">;

function emptyForm(): RoutineInput {
  return { title: "", period: "", description: "" };
}

/**
 * Form screen for adding or editing a single routine entry. Receives profileId
 * and optionally routineId via route params. When routineId is present the
 * form is pre-filled for editing; otherwise it creates a new entry.
 */
export function RoutineFormScreen({ route, navigation }: Props) {
  const { profileId, routineId } = route.params;
  const isEditing = routineId !== undefined;

  const [form, setForm] = useState<RoutineInput>(emptyForm());
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (isEditing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(true);
      getRoutine(profileId, routineId)
        .then((r) => {
          if (mountedRef.current) {
            setForm({
              title: r.title,
              period: r.period,
              description: r.description ?? "",
            });
          }
        })
        .catch(() => {
          if (mountedRef.current)
            setError("Não foi possível carregar a rotina.");
        })
        .finally(() => {
          if (mountedRef.current) setLoading(false);
        });
    }
    return () => {
      mountedRef.current = false;
    };
  }, [profileId, routineId, isEditing]);

  async function handleSave() {
    setSaving(true);
    setError(null);

    const title = form.title.trim();
    const period = form.period.trim();

    if (!title || !period) {
      setError("Preencha título e período da rotina.");
      setSaving(false);
      return;
    }

    const payload: RoutineInput = {
      title,
      period,
      description: form.description?.trim() || null,
    };

    try {
      if (isEditing) {
        await updateRoutine(profileId, routineId, payload);
      } else {
        await createRoutine(profileId, payload);
      }
      navigation.goBack();
    } catch {
      setError("Não foi possível salvar a rotina.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View testID="routine-form-loading" style={styles.centered}>
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
        testID="routine-form"
        style={styles.container}
        contentContainerStyle={styles.content}
        bounces={false}
      >
        <Text style={styles.title}>
          {isEditing ? "Editar rotina" : "Nova rotina"}
        </Text>

        {error ? (
          <Text testID="routine-form-error" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Text style={styles.label}>Título</Text>
        <TextInput
          testID="routine-form-title"
          style={styles.input}
          placeholder="Ex: Caminhada matinal"
          value={form.title}
          onChangeText={(text) => setForm({ ...form, title: text })}
        />

        <Text style={styles.label}>Período</Text>
        <TextInput
          testID="routine-form-period"
          style={styles.input}
          placeholder="Ex: manhã"
          value={form.period}
          onChangeText={(text) => setForm({ ...form, period: text })}
        />

        <Text style={styles.label}>Descrição (opcional)</Text>
        <TextInput
          testID="routine-form-description"
          style={[styles.input, styles.textArea]}
          placeholder="Ex: 30 minutos de caminhada no parque"
          value={form.description ?? ""}
          onChangeText={(text) => setForm({ ...form, description: text })}
          multiline
          numberOfLines={3}
        />

        <View style={styles.buttons}>
          <Button
            testID="routine-form-cancel"
            title="Cancelar"
            onPress={() => navigation.goBack()}
          />
          <Button
            testID="routine-form-save"
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
