import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../types/navigation";
import {
  createRoutine,
  deleteRoutine,
  listRoutines,
  updateRoutine,
  type Routine,
} from "../api/routines";
import { ProfileHeader } from "../components/ProfileHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import { COLORS, FONTS } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "RoutineRegistration">;

export const ROUTINE_SECTIONS: { title: string; placeholder: string }[] = [
  {
    title: "Rotina de sono",
    placeholder: "Horários, qualidade habitual, despertares...",
  },
  {
    title: "Alimentação e hidratação",
    placeholder: "Refeições, preferências, dificuldades",
  },
  {
    title: "Medicamentos em uso",
    placeholder: "Liste medicação, dose e horário",
  },
  {
    title: "Mobilidade e apoios",
    placeholder: "Como se locomove, apoios e dispositivos usados",
  },
  {
    title: "Sobre o seu cuidado",
    placeholder:
      "Quantas horas, divisão com outros cuidadores, tarefas habituais...",
  },
  {
    title: "Outros aspectos relevantes",
    placeholder:
      "Qualquer coisa que ajude a equipe de saúde a entender o contexto.",
  },
];

const SECTION_PERIOD = "geral";

/**
 * "Rotina e aspectos relevantes" screen from the Figma design: one fixed form
 * with a labeled text area per aspect of the elder's routine and a single save
 * button. Each section is persisted as a Routine row keyed by the section
 * title — filling a section creates/updates its row and clearing it deletes
 * the row, so the data keeps working with the existing /rotinas API.
 */
export function RoutineRegistrationScreen({ route }: Props) {
  const { profileId } = route.params;

  const [values, setValues] = useState<Record<string, string>>({});
  const [existing, setExisting] = useState<Record<string, Routine>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError(null);
      listRoutines(profileId)
        .then((data) => {
          if (!active) return;
          const byTitle: Record<string, Routine> = {};
          const loaded: Record<string, string> = {};
          for (const routine of data) {
            byTitle[routine.title] = routine;
            loaded[routine.title] = routine.description ?? "";
          }
          setExisting(byTitle);
          setValues(loaded);
        })
        .catch(() => {
          if (active) setError("Não foi possível carregar a rotina.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [profileId]),
  );

  function setValue(title: string, text: string) {
    setSaved(false);
    setValues((current) => ({ ...current, [title]: text }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const operations = ROUTINE_SECTIONS.map((section) => {
        const text = (values[section.title] ?? "").trim();
        const row = existing[section.title];
        if (text !== "" && row === undefined) {
          return createRoutine(profileId, {
            title: section.title,
            period: SECTION_PERIOD,
            description: text,
          });
        }
        if (text !== "" && row !== undefined && row.description !== text) {
          return updateRoutine(profileId, row.id, {
            title: section.title,
            period: SECTION_PERIOD,
            description: text,
          });
        }
        if (text === "" && row !== undefined) {
          return deleteRoutine(profileId, row.id);
        }
        return null;
      }).filter((operation) => operation !== null);
      await Promise.all(operations);

      const data = await listRoutines(profileId);
      const byTitle: Record<string, Routine> = {};
      for (const routine of data) byTitle[routine.title] = routine;
      setExisting(byTitle);
      setSaved(true);
    } catch {
      setError("Não foi possível salvar a rotina.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <ActivityIndicator
        testID="routine-loading"
        color={COLORS.primary}
        style={styles.loading}
      />
    );
  }

  return (
    <ScrollView
      testID="routine-registration"
      contentContainerStyle={styles.container}
    >
      <ProfileHeader profileId={profileId} />

      <Text style={styles.title}>Rotina e aspectos relevantes</Text>

      {ROUTINE_SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.label}>{section.title}</Text>
          <TextInput
            testID={`routine-section-${section.title}`}
            style={styles.textArea}
            placeholder={section.placeholder}
            placeholderTextColor={COLORS.grey400}
            value={values[section.title] ?? ""}
            onChangeText={(text) => setValue(section.title, text)}
            multiline
          />
        </View>
      ))}

      {error ? (
        <Text testID="routine-error" style={styles.error}>
          {error}
        </Text>
      ) : null}
      {saved ? (
        <Text testID="routine-saved" style={styles.saved}>
          Rotina salva.
        </Text>
      ) : null}

      <PrimaryButton
        testID="routine-save"
        title="Salvar rotina"
        style={styles.save}
        onPress={handleSave}
        loading={saving}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 12,
    backgroundColor: COLORS.white,
  },
  loading: {
    flex: 1,
  },
  title: {
    fontFamily: FONTS.extraBold,
    fontSize: 22,
    color: COLORS.heading,
  },
  section: {
    gap: 6,
  },
  label: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.heading,
  },
  textArea: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: COLORS.grey300,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.heading,
    textAlignVertical: "top",
  },
  error: {
    fontFamily: FONTS.semiBold,
    color: COLORS.danger,
    textAlign: "center",
  },
  saved: {
    fontFamily: FONTS.semiBold,
    color: COLORS.success,
    textAlign: "center",
  },
  save: {
    marginTop: 8,
  },
});
