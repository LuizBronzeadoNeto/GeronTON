import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { YES_NO_QUESTIONS } from "../../constants/checkin";
import { COLORS, SPACING } from "../../theme";
import { checkinStyles } from "./common";

interface Props {
  incident: boolean;
  breathShortness: boolean;
  frequency: string;
  onToggleIncident: () => void;
  onToggleBreathShortness: () => void;
  onChangeFrequency: (value: string) => void;
}

/**
 * The choking question card from the wizard's nutrition step, faithful to the
 * Figma frame: the "Tossiu ou engasgou ao comer/beber?" label with a radio
 * toggle on the right, expanding inline with the frequency input and the
 * breath-shortness sub-question when the incident is reported.
 */
export function ChokingQuestion({
  incident,
  breathShortness,
  frequency,
  onToggleIncident,
  onToggleBreathShortness,
  onChangeFrequency,
}: Props) {
  return (
    <View style={checkinStyles.group}>
      <Pressable
        testID="checkin-chokingIncident"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: incident }}
        style={checkinStyles.questionRow}
        onPress={onToggleIncident}
      >
        <Text style={checkinStyles.questionLabel}>
          {YES_NO_QUESTIONS.chokingIncident}
        </Text>
        <Ionicons
          name={incident ? "checkbox" : "square-outline"}
          size={22}
          color={incident ? COLORS.primary : COLORS.grey400}
        />
      </Pressable>
      {incident ? (
        <View style={styles.details}>
          <TextInput
            testID="checkin-chokingFrequency"
            accessibilityLabel="Frequência do engasgo"
            style={checkinStyles.input}
            placeholder="Frequência (ex: 2x na semana)"
            placeholderTextColor={COLORS.grey400}
            value={frequency}
            onChangeText={onChangeFrequency}
          />
          <Pressable
            testID="checkin-breathShortness"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: breathShortness }}
            style={styles.radioSubRow}
            onPress={onToggleBreathShortness}
          >
            <Ionicons
              name={breathShortness ? "checkbox" : "square-outline"}
              size={20}
              color={breathShortness ? COLORS.primary : COLORS.grey400}
            />
            <Text style={checkinStyles.questionLabel}>
              {YES_NO_QUESTIONS.breathShortness}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  details: {
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  radioSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    minHeight: 48,
  },
});
