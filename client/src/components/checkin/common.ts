import { StyleSheet } from "react-native";
import { COLORS, FONTS } from "../../theme";

/**
 * Styles shared by the check-in wizard's question widgets: the rounded
 * question rows and block cards, the Sim/Não-style pills and the outlined
 * text inputs.
 */
export const checkinStyles = StyleSheet.create({
  questionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.grey300,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  blockRow: {
    borderWidth: 1,
    borderColor: COLORS.grey300,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  questionLabel: {
    flex: 1,
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.heading,
  },
  criticalTag: {
    color: COLORS.danger,
    fontSize: 11,
  },
  pillGroup: {
    flexDirection: "row",
    gap: 6,
  },
  pill: {
    borderWidth: 1,
    borderColor: COLORS.heading,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 5,
    backgroundColor: COLORS.white,
  },
  pillSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pillLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.heading,
  },
  pillLabelSelected: {
    color: COLORS.white,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: COLORS.grey300,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.heading,
  },
});
