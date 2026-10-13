import { StyleSheet } from "react-native";
import {
  COLORS,
  CONTROL_HEIGHT,
  FONTS,
  RADIUS,
  SPACING,
  TYPE,
} from "../../theme";

/**
 * Styles shared by the check-in wizard's question widgets: the rows of a
 * grouped checklist (weekly events, choking), free-standing question blocks
 * (mood, stress) and the text inputs.
 */
export const checkinStyles = StyleSheet.create({
  questionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.md,
    minHeight: 56,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
  },
  blockRow: {
    gap: SPACING.sm,
  },
  group: {
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.group,
    overflow: "hidden",
  },
  questionLabel: {
    ...TYPE.bodyStrong,
    flex: 1,
  },
  criticalTag: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.danger,
  },
  input: {
    minHeight: CONTROL_HEIGHT,
    borderWidth: 1,
    borderColor: COLORS.grey300,
    borderRadius: RADIUS.control,
    paddingHorizontal: SPACING.lg,
    ...TYPE.body,
  },
});
