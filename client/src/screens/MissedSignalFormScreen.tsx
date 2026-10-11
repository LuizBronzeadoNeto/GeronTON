import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../types/navigation";
import type { AlertSeverity } from "../api/alerts";
import { createMissedSignal } from "../api/missedSignals";
import { ProfileHeader } from "../components/ProfileHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import { brDateToIso, maskBrDate } from "../utils/date";
import { COLORS, FONTS } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "MissedSignalForm">;

const SEVERITIES: { label: string; value: AlertSeverity }[] = [
  { label: "Atenção", value: "attention" },
  { label: "Crítico", value: "critical" },
];

/**
 * Form for a professional to record a missed signal: something that happened
 * to the elder (a hospital stay, a fall, a sudden decline) that the weekly
 * check-in did not flag. These records are the false negatives in the
 * validation report. Goes back to the elder's hub on success.
 */
export function MissedSignalFormScreen({ navigation, route }: Props) {
  const { profileId } = route.params;

  const [date, setDate] = useState("");
  const [severity, setSeverity] = useState<AlertSeverity | null>(null);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isoDate = brDateToIso(date);
  const isFuture = isoDate !== null && new Date(isoDate) > new Date();
  const canSubmit =
    !saving &&
    isoDate !== null &&
    !isFuture &&
    severity !== null &&
    description.trim() !== "";

  async function handleSubmit() {
    if (!isoDate || !severity) return;

    setSaving(true);
    setError(null);
    try {
      await createMissedSignal(profileId, {
        occurredAt: isoDate,
        severity,
        description: description.trim(),
      });
      navigation.goBack();
    } catch {
      setError("Não foi possível salvar o registro.");
      setSaving(false);
    }
  }

  return (
    <ScrollView
      testID="missed-form"
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <ProfileHeader profileId={profileId} />

      <Text style={styles.title}>Sinal não detectado</Text>
      <Text style={styles.hint}>
        Use quando algo aconteceu com o idoso e o sistema não deu nenhum sinal
        antes. Esses registros mostram onde a triagem precisa melhorar.
      </Text>

      <Text style={styles.label}>Quando aconteceu</Text>
      <TextInput
        testID="missed-date"
        style={styles.input}
        placeholder="DD/MM/AAAA"
        placeholderTextColor={COLORS.grey400}
        keyboardType="number-pad"
        value={date}
        onChangeText={(text) => setDate(maskBrDate(text))}
      />
      {isFuture ? (
        <Text testID="missed-date-future" style={styles.fieldError}>
          A data não pode estar no futuro.
        </Text>
      ) : null}

      <Text style={styles.label}>Gravidade</Text>
      <View style={styles.segmented}>
        {SEVERITIES.map((option) => {
          const selected = severity === option.value;
          return (
            <Pressable
              key={option.value}
              testID={`missed-severity-${option.value}`}
              accessibilityRole="button"
              style={[styles.segment, selected && styles.segmentSelected]}
              onPress={() => setSeverity(option.value)}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  selected && styles.segmentLabelSelected,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>O que aconteceu</Text>
      <TextInput
        testID="missed-description"
        style={styles.textArea}
        placeholder="Ex.: internação por pneumonia, o check-in da semana veio normal"
        placeholderTextColor={COLORS.grey400}
        value={description}
        onChangeText={setDescription}
        multiline
      />

      {error ? (
        <Text testID="missed-error" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <PrimaryButton
        testID="missed-submit"
        title="Registrar"
        style={styles.submit}
        onPress={handleSubmit}
        disabled={!canSubmit}
        loading={saving}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 10,
    backgroundColor: COLORS.white,
  },
  title: {
    fontFamily: FONTS.extraBold,
    fontSize: 22,
    color: COLORS.heading,
  },
  hint: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.grey500,
    marginBottom: 4,
  },
  label: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.heading,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: COLORS.grey300,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.heading,
  },
  fieldError: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.danger,
  },
  segmented: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: COLORS.grey300,
    borderRadius: 8,
    overflow: "hidden",
  },
  segment: {
    flex: 1,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
  },
  segmentSelected: {
    backgroundColor: COLORS.primary,
  },
  segmentLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.heading,
  },
  segmentLabelSelected: {
    color: COLORS.white,
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
  submit: {
    marginTop: 8,
  },
});
