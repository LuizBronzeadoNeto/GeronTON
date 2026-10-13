import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, TYPE } from "../theme";

interface Props {
  label: string;
  caption?: string;
  value?: string;
  /** Extra content on the right, before the chevron (e.g. a status pill). */
  trailing?: ReactNode;
  /** Colour of a thin rule on the left edge, e.g. the elder's risk level. */
  accent?: string;
  onPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
}

/**
 * One row of a grouped section: a label (with an optional caption under it)
 * on the left and a value, extra content or a chevron on the right. Rows that
 * open something get the chevron and a pressed background.
 */
export function ListRow({
  label,
  caption,
  value,
  trailing,
  accent,
  onPress,
  testID,
  accessibilityLabel,
}: Props) {
  const content = (
    <>
      {accent ? (
        <View
          testID={testID ? `${testID}-accent` : undefined}
          style={[styles.accent, { backgroundColor: accent }]}
        />
      ) : null}
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      </View>
      {value ? <Text style={styles.value}>{value}</Text> : null}
      {trailing}
      {onPress ? (
        <Ionicons name="chevron-forward" size={20} color={COLORS.grey400} />
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View testID={testID} style={styles.row}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      onPress={onPress}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    minHeight: 56,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.white,
  },
  pressed: {
    backgroundColor: COLORS.surface,
  },
  accent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  label: {
    ...TYPE.bodyStrong,
  },
  caption: {
    ...TYPE.caption,
  },
  value: {
    ...TYPE.body,
    color: COLORS.heading,
    textAlign: "right",
    flexShrink: 1,
  },
});
