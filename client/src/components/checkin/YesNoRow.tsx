import { Pressable, Text, View } from "react-native";
import { YES_NO_QUESTIONS } from "../../constants/checkin";
import { checkinStyles as styles } from "./common";

export type Answer = boolean | null;

interface Props {
  field: string;
  value: Answer;
  onChange: (value: boolean) => void;
}

const OPTIONS = [
  { answer: true, label: "Sim", suffix: "yes" },
  { answer: false, label: "Não", suffix: "no" },
] as const;

/**
 * Question row with Sim/Não pills, as in the wizard's Figma frames. The chosen
 * pill fills with the primary color; `field` keys the label in
 * YES_NO_QUESTIONS and the `checkin-<field>-yes/no` testIDs. The pills form a
 * radio group named after the question, so screen readers say which question
 * they answer and which one is chosen.
 */
export function YesNoRow({ field, value, onChange }: Props) {
  const question = YES_NO_QUESTIONS[field];

  return (
    <View style={styles.questionRow}>
      <Text style={styles.questionLabel}>{question}</Text>
      <View
        style={styles.pillGroup}
        accessibilityRole="radiogroup"
        accessibilityLabel={question}
      >
        {OPTIONS.map(({ answer, label, suffix }) => (
          <Pressable
            key={suffix}
            testID={`checkin-${field}-${suffix}`}
            accessibilityRole="radio"
            accessibilityState={{ checked: value === answer }}
            hitSlop={8}
            style={[styles.pill, value === answer && styles.pillSelected]}
            onPress={() => onChange(answer)}
          >
            <Text
              style={[
                styles.pillLabel,
                value === answer && styles.pillLabelSelected,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
