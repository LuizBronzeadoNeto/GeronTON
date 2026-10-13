import { Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, TYPE } from "../theme";

interface Props {
  testID?: string;
  checked: boolean;
  label: string;
  onToggle: () => void;
}

/** A tappable checkbox with its label. */
export function CheckboxRow({ testID, checked, label, onToggle }: Props) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={styles.row}
      onPress={onToggle}
    >
      <Ionicons
        name={checked ? "checkbox" : "square-outline"}
        size={22}
        color={checked ? COLORS.primary : COLORS.grey400}
      />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    minHeight: 48,
  },
  label: {
    ...TYPE.body,
    flex: 1,
  },
});
