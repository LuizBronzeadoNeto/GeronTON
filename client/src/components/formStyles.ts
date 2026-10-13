import { StyleSheet } from "react-native";
import { COLORS, CONTROL_HEIGHT, RADIUS, SPACING, TYPE } from "../theme";

/**
 * Layout shared by the app's forms: a scrolling column of labelled fields
 * above an ActionBar. Keeping it in one place is what makes every form line up
 * the same way.
 */
export const formStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    padding: SPACING.screen,
    gap: SPACING.lg,
  },
  title: {
    ...TYPE.title,
  },
  intro: {
    ...TYPE.body,
    color: COLORS.grey500,
  },
  field: {
    gap: SPACING.sm,
  },
  label: {
    ...TYPE.label,
  },
  helper: {
    ...TYPE.caption,
  },
  input: {
    minHeight: CONTROL_HEIGHT,
    borderWidth: 1,
    borderColor: COLORS.grey300,
    borderRadius: RADIUS.control,
    paddingHorizontal: SPACING.lg,
    ...TYPE.body,
  },
  textArea: {
    minHeight: 120,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    textAlignVertical: "top",
  },
  error: {
    ...TYPE.label,
    color: COLORS.danger,
  },
});
