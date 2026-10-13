import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS, RADIUS, SPACING, TYPE } from "../theme";

interface Option<T> {
  value: T;
  label: string;
  testID?: string;
}

interface Props<T> {
  question: string;
  options: Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
  testID?: string;
}

/**
 * A question with its answers as large, equal-width buttons below it (Sim /
 * Não, Bom / Regular / Ruim, Atenção / Crítico). Big targets and a filled
 * selected state make the answer obvious at a glance, which matters for
 * tired caregivers filling the weekly check-in on a small phone.
 */
export function AnswerGroup<T>({
  question,
  options,
  value,
  onChange,
  testID,
}: Props<T>) {
  return (
    <View testID={testID} style={styles.group}>
      <Text style={styles.question}>{question}</Text>
      <View
        style={styles.options}
        accessibilityRole="radiogroup"
        accessibilityLabel={question}
      >
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <Pressable
              key={option.label}
              testID={option.testID}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ checked: selected }}
              style={[styles.option, selected && styles.optionSelected]}
              onPress={() => onChange(option.value)}
            >
              <Text style={[styles.label, selected && styles.labelSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: SPACING.sm,
  },
  question: {
    ...TYPE.bodyStrong,
  },
  options: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  option: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.grey300,
    borderRadius: RADIUS.control,
    backgroundColor: COLORS.white,
  },
  optionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  label: {
    ...TYPE.bodyStrong,
    textAlign: "center",
  },
  labelSelected: {
    color: COLORS.white,
  },
});
