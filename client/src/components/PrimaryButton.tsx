import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { COLORS, FONTS } from "../theme";

interface Props {
  title: string;
  onPress: () => void;
  testID?: string;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "danger" | "outline";
  size?: "regular" | "small";
  style?: StyleProp<ViewStyle>;
}

/**
 * Button from the Figma design system: 45px tall (36px in the "small" size
 * used for header actions like "+ Novo idoso"), 8px radius, semibold label.
 * "primary" is the filled blue action, "danger" the filled red destructive one
 * and "outline" a bordered secondary action. While loading it shows a spinner
 * in place of the label and stays disabled.
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
      style={[
        styles.button,
        size === "small" && styles.small,
        variant === "danger" && styles.danger,
        variant === "outline" && styles.outline,
        isDisabled && styles.disabled,
        style,
      ]}
      disabled={isDisabled}
      onPress={onPress}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "outline" ? COLORS.primary : COLORS.white}
        />
      ) : (
        <Text
          style={[styles.label, variant === "outline" && styles.outlineLabel]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 45,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  small: {
    height: 36,
    paddingHorizontal: 16,
    alignSelf: "flex-end",
  },
  danger: {
    backgroundColor: COLORS.danger,
  },
  outline: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.white,
  },
  outlineLabel: {
    color: COLORS.primary,
  },
});
