import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { COLORS, CONTROL_HEIGHT, RADIUS, SPACING, TYPE } from "../theme";

type Variant = "primary" | "outline" | "quiet" | "danger";

interface Props {
  title: string;
  onPress: () => void;
  testID?: string;
  disabled?: boolean;
  loading?: boolean;
  variant?: Variant;
  size?: "regular" | "small";
  style?: StyleProp<ViewStyle>;
}

const LABEL_COLOR: Record<Variant, string> = {
  primary: COLORS.white,
  outline: COLORS.primary,
  quiet: COLORS.primary,
  danger: COLORS.danger,
};

/**
 * The app's button. It fills the width of its container by default, so a
 * form's main action and the two halves of a button row line up on every
 * screen. "primary" is the solid blue main action, "outline" a secondary one,
 * "quiet" a text-only tertiary action and "danger" a destructive one, drawn
 * as red text on white so it never looks like the main action. The small size
 * is for inline actions beside other content. While loading it shows a
 * spinner in place of the label and stays disabled.
 */
export function PrimaryButton({
  title,
  onPress,
  testID,
  disabled = false,
  loading = false,
  variant = "primary",
  size = "regular",
  style,
}: Props) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        styles[variant],
        size === "small" && styles.small,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      disabled={isDisabled}
      onPress={onPress}
    >
      {loading ? (
        <ActivityIndicator color={LABEL_COLOR[variant]} />
      ) : (
        <Text style={[styles.label, { color: LABEL_COLOR[variant] }]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: CONTROL_HEIGHT,
    alignSelf: "stretch",
    borderRadius: RADIUS.control,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xl,
  },
  primary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  outline: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.primary,
  },
  quiet: {
    backgroundColor: "transparent",
    borderColor: "transparent",
    minHeight: 48,
    paddingHorizontal: SPACING.md,
  },
  danger: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.danger,
  },
  small: {
    minHeight: 40,
    alignSelf: "flex-start",
    paddingHorizontal: SPACING.lg,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    ...TYPE.bodyStrong,
    textAlign: "center",
  },
});
