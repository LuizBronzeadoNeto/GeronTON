import { Pressable, Text, View } from "react-native";
import { YES_NO_QUESTIONS } from "../../constants/checkin";
import { checkinStyles as styles } from "./common";

export type Answer = boolean | null;

interface Props {
  field: string;
  value: Answer;
  onChange: (value: boolean) => void;
}

/**
 * Question row with Sim/Não pills, as in the wizard's Figma frames. The chosen
 * pill fills with the primary color; `field` keys the label in
 * YES_NO_QUESTIONS and the `checkin-<field>-yes/no` testIDs.
 */
export function YesNoRow({ field, value, onChange }: Props) {
  return (
    <View style={styles.questionRow}>
      <Text style={styles.questionLabel}>{YES_NO_QUESTIONS[field]}</Text>
      <View style={styles.pillGroup}>
        <Pressable
          testID={`checkin-${field}-yes`}
          accessibilityRole="button"
          style={[styles.pill, value === true && styles.pillSelected]}
          onPress={() => onChange(true)}
        >
          <Text
            style={[
              styles.pillLabel,
              value === true && styles.pillLabelSelected,
            ]}
          >
            Sim
          </Text>
        </Pressable>
        <Pressable
          testID={`checkin-${field}-no`}
          accessibilityRole="button"
          style={[styles.pill, value === false && styles.pillSelected]}
          onPress={() => onChange(false)}
        >
          <Text
            style={[
              styles.pillLabel,
              value === false && styles.pillLabelSelected,
            ]}
          >
            Não
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
