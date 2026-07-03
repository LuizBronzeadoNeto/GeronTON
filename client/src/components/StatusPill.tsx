import { StyleSheet, Text, View } from "react-native";
import { FONTS } from "../theme";

interface Props {
  label: string;
  color: string;
  backgroundColor: string;
  testID?: string;
  labelTestID?: string;
}

/**
 * Status pill from the Figma design — a small rounded badge with a colored dot
 * and label, used for risk levels ("Crítico", "Estável"…) and intercorrence
 * severity.
 */
export function StatusPill({
  label,
  color,
  backgroundColor,
  testID,
  labelTestID,
}: Props) {
  return (
    <View testID={testID} style={[styles.pill, { backgroundColor }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text testID={labelTestID} style={[styles.label, { color }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  label: {
    fontFamily: FONTS.semiBold,
    fontSize: 10,
  },
});
