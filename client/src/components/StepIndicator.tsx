import { Pressable, StyleSheet, View } from "react-native";
import { COLORS, SPACING } from "../theme";

interface Props {
  current: number;
  total: number;
  onStepPress?: (step: number) => void;
}

/**
 * The wizard's progress as a segmented bar: one segment per step, filled up
 * to the current one. Finished segments are tappable to go back to that step.
 * A bar reads at a glance where five numbered circles asked to be counted.
 */
export function StepIndicator({ current, total, onStepPress }: Props) {
  const steps = Array.from({ length: total }, (_, index) => index + 1);

  return (
    <View style={styles.row}>
      {steps.map((step) => {
        const isDone = step < current;
        const isActive = step === current;

        return (
          <Pressable
            key={step}
            testID={`checkin-step-${step}`}
            accessibilityRole="button"
            accessibilityLabel={`Etapa ${step} de ${total}${isDone ? ", concluída" : isActive ? ", atual" : ""}`}
            disabled={!isDone || !onStepPress}
            hitSlop={{ top: 12, bottom: 12 }}
            style={styles.slot}
            onPress={() => onStepPress?.(step)}
          >
            <View
              style={[
                styles.segment,
                (isDone || isActive) && styles.segmentFilled,
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: SPACING.xs,
  },
  slot: {
    flex: 1,
    paddingVertical: SPACING.xs,
  },
  segment: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.divider,
  },
  segmentFilled: {
    backgroundColor: COLORS.primary,
  },
});
