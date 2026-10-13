import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../types/navigation";
import type { AlertSeverity } from "../api/alerts";
import { createMissedSignal } from "../api/missedSignals";
import { ProfileHeader } from "../components/ProfileHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import { brDateToIso, maskBrDate } from "../utils/date";
import { ActionBar } from "../components/ActionBar";
import { AnswerGroup } from "../components/AnswerGroup";
import { formStyles } from "../components/formStyles";
import { COLORS } from "../theme";

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
    <View style={formStyles.screen}>
      <ScrollView
        testID="missed-form"
        contentContainerStyle={formStyles.container}
        keyboardShouldPersistTaps="handled"
      >
        <ProfileHeader profileId={profileId} />

        <Text style={formStyles.title} accessibilityRole="header">
          Sinal não detectado
        </Text>
        <Text style={formStyles.intro}>
          Use quando algo aconteceu com o idoso e o sistema não deu nenhum sinal
          antes. Esses registros mostram onde a triagem precisa melhorar.
        </Text>

        <View style={formStyles.field}>
          <Text style={formStyles.label}>Quando aconteceu</Text>
          <TextInput
            testID="missed-date"
            style={formStyles.input}
            placeholder="DD/MM/AAAA"
            placeholderTextColor={COLORS.grey400}
            accessibilityLabel="Quando aconteceu"
            keyboardType="number-pad"
            value={date}
            onChangeText={(text) => setDate(maskBrDate(text))}
          />
          {isFuture ? (
            <Text testID="missed-date-future" style={formStyles.error}>
              A data não pode estar no futuro.
            </Text>
          ) : null}
        </View>

        <AnswerGroup
          question="Gravidade"
          value={severity}
          onChange={setSeverity}
          options={SEVERITIES.map((option) => ({
            value: option.value,
            label: option.label,
            testID: `missed-severity-${option.value}`,
          }))}
        />

        <View style={formStyles.field}>
          <Text style={formStyles.label}>O que aconteceu</Text>
          <TextInput
            testID="missed-description"
            style={[formStyles.input, formStyles.textArea]}
            placeholder="Ex.: internação por pneumonia, o check-in da semana veio normal"
            placeholderTextColor={COLORS.grey400}
            accessibilityLabel="O que aconteceu"
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        {error ? (
          <Text testID="missed-error" style={formStyles.error}>
            {error}
          </Text>
        ) : null}
      </ScrollView>

      <ActionBar testID="missed-actions">
        <PrimaryButton
          testID="missed-submit"
          title="Registrar"
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={saving}
        />
      </ActionBar>
    </View>
  );
}
