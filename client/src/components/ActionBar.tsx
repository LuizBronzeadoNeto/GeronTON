import { Children, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { COLORS, SPACING } from "../theme";

interface Props {
  testID?: string;
  /** A short line above the buttons, e.g. why the main one is disabled. */
  note?: ReactNode;
  children: ReactNode;
}

/**
 * The footer that holds a form's main actions, under the scrolling content.
 * It sits in the same place on every form, within thumb reach, and splits its
 * width evenly: one button takes the whole bar, two take half each (the
 * secondary one on the left).
 */
export function ActionBar({ testID, note, children }: Props) {
  return (
    <View testID={testID} style={styles.bar}>
      {note}
      <View style={styles.row}>
        {Children.toArray(children)
          .filter(Boolean)
          .map((child, index) => (
            <View key={index} testID="action-slot" style={styles.slot}>
              {child}
            </View>
          ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    gap: SPACING.sm,
    paddingHorizontal: SPACING.screen,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    backgroundColor: COLORS.white,
  },
  row: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  slot: {
    flex: 1,
  },
});
