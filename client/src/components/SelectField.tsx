import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, CONTROL_HEIGHT, RADIUS, SPACING, TYPE } from "../theme";

interface Props {
  label: string;
  placeholder?: string;
  value: string | null;
  options: string[];
  onSelect: (value: string) => void;
  testID: string;
}

/**
 * Dropdown field from the Figma design ("Select Aberto"): a labeled input-like
 * trigger with a chevron that expands an inline option list. While open the
 * trigger gets the primary-blue highlight; picking an option closes it.
 */
export function SelectField({
  label,
  placeholder = "Selecione",
  value,
  options,
  onSelect,
  testID,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ?? placeholder}`}
        accessibilityState={{ expanded: open }}
        style={[styles.trigger, open && styles.triggerOpen]}
        onPress={() => setOpen((current) => !current)}
      >
        <Text
          style={[
            styles.value,
            !value && styles.placeholder,
            open && styles.valueOpen,
          ]}
        >
          {value ?? placeholder}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={18}
          color={open ? COLORS.primary : COLORS.grey500}
        />
      </Pressable>
      {open ? (
        <View style={styles.dropdown}>
          {options.map((option) => (
            <Pressable
              key={option}
              testID={`${testID}-option-${option}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: option === value }}
              style={styles.option}
              onPress={() => {
                onSelect(option);
                setOpen(false);
              }}
            >
              <Text
                style={[
                  styles.optionLabel,
                  option === value && styles.optionLabelSelected,
                ]}
              >
                {option}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.sm,
  },
  label: {
    ...TYPE.label,
  },
  trigger: {
    minHeight: CONTROL_HEIGHT,
    borderWidth: 1,
    borderColor: COLORS.grey300,
    borderRadius: RADIUS.control,
    paddingHorizontal: SPACING.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.white,
  },
  triggerOpen: {
    borderColor: COLORS.primary,
  },
  value: {
    ...TYPE.body,
    color: COLORS.heading,
  },
  valueOpen: {
    color: COLORS.primary,
  },
  placeholder: {
    color: COLORS.grey400,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.control,
    backgroundColor: COLORS.white,
    overflow: "hidden",
  },
  option: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  optionLabel: {
    ...TYPE.body,
    color: COLORS.heading,
  },
  optionLabelSelected: {
    fontFamily: TYPE.bodyStrong.fontFamily,
    color: COLORS.primary,
  },
});
