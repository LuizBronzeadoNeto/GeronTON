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
import { createIntercorrence } from "../api/intercorrences";
import { EVENT_TYPE_OPTIONS } from "../constants/intercorrence";
import { ProfileHeader } from "../components/ProfileHeader";
import { PrimaryButton } from "../components/PrimaryButton";
import { SelectField } from "../components/SelectField";
import { COLORS, FONTS } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "IntercorrenceForm">;

const SEVERITIES = [
  { label: "Atenção", isCritical: false },
  { label: "Crítico", isCritical: true },
] as const;

/**
 * "/intercorrência" form from the Figma design: registers an adverse event for
 * an elderly profile with the event-type select, a severity segmented control
 * and a free-text description of what happened. On success it returns to the
 * previous screen, whose history refetches on focus.
 */
export function IntercorrenceFormScreen({ navigation, route }: Props) {
  const { profileId } = route.params;

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
      await createIntercorrence(profileId, {
        eventType,
        isCritical,
        description: description.trim(),
      });
      navigation.goBack();
    } catch {
      setError("Não foi possível registrar a intercorrência.");
      setSaving(false);
    }
  }

  return (
    <ScrollView
      testID="intercorrence-form"
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <ProfileHeader profileId={profileId} />

      <Text style={styles.title}>Registrar intercorrência</Text>

      <SelectField
        testID="intercorrence-eventType"
        label="Tipo de evento"
        value={eventLabel}
        options={EVENT_TYPE_OPTIONS.map((option) => option.label)}
        onSelect={setEventLabel}
      />

      <Text style={styles.label}>Gravidade</Text>
      <View style={styles.segmented}>
        {SEVERITIES.map((severity) => {
          const selected = isCritical === severity.isCritical;
          return (
            <Pressable
              key={severity.label}
              testID={`intercorrence-severity-${severity.label}`}
              accessibilityRole="button"
              style={[styles.segment, selected && styles.segmentSelected]}
              onPress={() => setIsCritical(severity.isCritical)}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  selected && styles.segmentLabelSelected,
                ]}
              >
                {severity.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Descrição</Text>
      <TextInput
        testID="intercorrence-description"
        style={styles.textArea}
        placeholder="O que aconteceu, quando, sintomas associados, o que foi feito..."
        placeholderTextColor={COLORS.grey400}
        value={description}
        onChangeText={setDescription}
        multiline
      />

      {error ? (
        <Text testID="intercorrence-error" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <PrimaryButton
        testID="intercorrence-submit"
        title="Registrar"
        style={styles.submit}
        onPress={handleSubmit}
        disabled={!canSubmit}
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
    marginBottom: 4,
  },
  label: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.heading,
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
