import { Children, Fragment, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS, RADIUS, SPACING, TYPE } from "../theme";

interface Props {
  title: string;
  /** A link on the heading's right, e.g. "Ver todos". */
  action?: { label: string; onPress: () => void; testID?: string };
  /** Draws the children as one bordered group with dividers between rows. */
  grouped?: boolean;
  testID?: string;
  children: ReactNode;
}

/**
 * A titled block of a screen. Screens are built as a sequence of sections
 * rather than a stack of cards: the heading carries the structure and, when
 * the content is a list of rows, `grouped` puts them in one bordered group
 * separated by hairlines.
 */
export function Section({ title, action, grouped, testID, children }: Props) {
  const rows = Children.toArray(children).filter(Boolean);

  return (
    <View testID={testID} style={styles.section}>
      <View style={styles.heading}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {action ? (
          <Pressable
            testID={action.testID}
            accessibilityRole="button"
            hitSlop={12}
            onPress={action.onPress}
          >
            <Text style={styles.action}>{action.label}</Text>
          </Pressable>
        ) : null}
      </View>
      {grouped ? (
        <View style={styles.group}>
          {rows.map((row, index) => (
            <Fragment key={index}>
              {index > 0 ? (
                <View testID="section-divider" style={styles.divider} />
              ) : null}
              {row}
            </Fragment>
          ))}
        </View>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: SPACING.md,
  },
  heading: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  title: {
    ...TYPE.section,
    flexShrink: 1,
  },
  action: {
    ...TYPE.label,
    color: COLORS.primary,
  },
  group: {
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.group,
    overflow: "hidden",
    backgroundColor: COLORS.white,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
  },
});
