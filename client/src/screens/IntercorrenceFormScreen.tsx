import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../types/navigation";
import { createIntercorrence } from "../api/intercorrences";
import {
  EVENT_TYPE_OPTIONS,
  eventTypeLabel,
  isCriticalEvent,
} from "../constants/intercorrence";
import { useNotification } from "../context/NotificationContext";
import { EmergencyCallout } from "../components/EmergencyCallout";
import { ProfileHeader } from "../components/ProfileHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import { SelectField } from "../components/SelectField";
import { ActionBar } from "../components/ActionBar";
import { AnswerGroup } from "../components/AnswerGroup";
import { formStyles } from "../components/formStyles";
import { COLORS } from "../theme";
import { FormError } from "../components/FormError";
import { FormScreen } from "../components/FormScreen";

type Props = NativeStackScreenProps<AppStackParamList, "IntercorrenceForm">;

const SEVERITIES = [
  { label: "Atenção", isCritical: false },
  { label: "Crítico", isCritical: true },
] as const;

/**
 * "/intercorrência" form from the Figma design: registers an adverse event for
 * an elderly profile with the event-type select, a severity segmented control
 * and a free-text description of what happened. On success it raises the
 * in-app notification and replaces itself with the confirmation screen, so
 * back returns to the profile hub, whose history refetches on focus.
 */
export function IntercorrenceFormScreen({ navigation, route }: Props) {
  const { profileId } = route.params;
  const { notify } = useNotification();

  const [eventLabel, setEventLabel] = useState<string | null>(null);
  const [isCritical, setIsCritical] = useState<boolean | null>(null);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = !saving && eventLabel !== null && isCritical !== null;

  async function handleSubmit() {
    const eventType = EVENT_TYPE_OPTIONS.find(
      (option) => option.label === eventLabel,
    )?.value;
    if (!eventType || isCritical === null) return;

    setSaving(true);
    setError(null);
    try {
      const intercorrence = await createIntercorrence(profileId, {
        eventType,
        isCritical,
        description: description.trim(),
      });
      notify({
        title: isCritical
          ? "Intercorrência crítica registrada"
          : "Intercorrência registrada",
        message: `${eventTypeLabel(eventType)} adicionada ao histórico do idoso.`,
        critical: isCriticalEvent({ eventType, isCritical }),
      });
      navigation.replace("IntercorrenceConfirmation", {
        profileId,
        intercorrence,
        teamNotified: intercorrence.teamNotified,
      });
    } catch {
      setError("Não foi possível registrar a intercorrência.");
      setSaving(false);
    }
  }

  return (
    <FormScreen>
      <ScrollView
        testID="intercorrence-form"
        contentContainerStyle={formStyles.container}
        keyboardShouldPersistTaps="handled"
      >
        <ProfileHeader profileId={profileId} />

        <Text style={formStyles.title} accessibilityRole="header">
          Registrar intercorrência
        </Text>

        <EmergencyCallout />

        <SelectField
          testID="intercorrence-eventType"
          label="Tipo de evento"
          value={eventLabel}
          options={EVENT_TYPE_OPTIONS.map((option) => option.label)}
          onSelect={setEventLabel}
        />

        <AnswerGroup
          question="Gravidade"
          value={isCritical}
          onChange={setIsCritical}
          options={SEVERITIES.map((severity) => ({
            value: severity.isCritical,
            label: severity.label,
            testID: `intercorrence-severity-${severity.label}`,
          }))}
        />

        <View style={formStyles.field}>
          <Text style={formStyles.label}>Descrição</Text>
          <TextInput
            testID="intercorrence-description"
            accessibilityLabel="Descrição"
            style={[formStyles.input, formStyles.textArea]}
            placeholder="O que aconteceu, quando, sintomas associados, o que foi feito..."
            placeholderTextColor={COLORS.grey400}
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </View>

        {error ? (
          <FormError
            testID="intercorrence-error"
            style={formStyles.error}
            message={error}
          />
        ) : null}
      </ScrollView>

      <ActionBar testID="intercorrence-actions">
        <PrimaryButton
          testID="intercorrence-submit"
          title="Registrar"
          loading={saving}
          onPress={handleSubmit}
          disabled={!canSubmit}
        />
      </ActionBar>
    </FormScreen>
  );
}
