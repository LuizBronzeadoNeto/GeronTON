import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONTS } from "../theme";

interface Props {
  current: number;
  total: number;
  onStepPress?: (step: number) => void;
}

/**
 * Wizard progress indicator, redesigned from the Figma's plain 1-5 number row:
 * completed steps become check-marked light-blue circles, the active step is a
 * filled primary circle and upcoming steps stay outlined, all joined by a
 * connector line that fills as the user advances. Completed steps are tappable
 * to jump back; upcoming steps are not.
 */
export function StepIndicator({ current, total, onStepPress }: Props) {
  const steps = Array.from({ length: total }, (_, index) => index + 1);

  return (
    <View style={styles.row}>
      {steps.map((step) => {
        const isDone = step < current;
        const isActive = step === current;

        return (
          <View key={step} style={styles.stepWrapper}>
            {step > 1 ? (
              <View
                style={[
                  styles.connector,
                  isDone || isActive ? styles.connectorDone : null,
                ]}
              />
            ) : null}
            <Pressable
              testID={`checkin-step-${step}`}
              accessibilityRole="button"
              accessibilityLabel={`Etapa ${step} de ${total}`}
              disabled={!isDone || !onStepPress}
              style={[
                styles.circle,
                isDone && styles.circleDone,
                isActive && styles.circleActive,
              ]}
              onPress={() => onStepPress?.(step)}
            >
              {isDone ? (
                <Ionicons name="checkmark" size={14} color={COLORS.primary} />
              ) : (
                <Text style={[styles.number, isActive && styles.numberActive]}>
                  {step}
                </Text>
              )}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
  },
  stepWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  connector: {
    width: 20,
    height: 2,
    backgroundColor: COLORS.grey300,
    marginHorizontal: 4,
  },
  connectorDone: {
    backgroundColor: COLORS.primary,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.grey300,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },
  circleDone: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.chipBg,
  },
  circleActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  number: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.grey500,
  },
  numberActive: {
    color: COLORS.white,
  },
});
