import { Children, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { COLORS, SPACING } from "../theme";

interface Props {
  testID?: string;
  children: ReactNode;
}

/**
 * The footer that holds a form's main actions, under the scrolling content.
 * It sits in the same place on every form, within thumb reach, and splits its
 * width evenly: one button takes the whole bar, two take half each (the
 * secondary one on the left).
 */
export function ActionBar({ testID, children }: Props) {
  return (
    <View testID={testID} style={styles.bar}>
      {Children.toArray(children)
        .filter(Boolean)
        .map((child, index) => (
          <View key={index} testID="action-slot" style={styles.slot}>
            {child}
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    gap: SPACING.md,
    paddingHorizontal: SPACING.screen,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    backgroundColor: COLORS.white,
  },
  slot: {
    flex: 1,
  },
});
