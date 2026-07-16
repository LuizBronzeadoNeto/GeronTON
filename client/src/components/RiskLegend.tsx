import { StyleSheet, Text, View } from "react-native";
import { RISK_LEVELS, RISK_LEVEL_ORDER } from "../constants/risk";
import { StatusPill } from "./StatusPill";
import { COLORS, FONTS } from "../theme";

/**
 * Interface legend explaining the risk levels: one row per level with its
 * status pill (same label and colors the profile cards use) and a plain-
 * language description of what the level means and what to do. Shown under
 * the lists that display risk pills so caregivers and professionals can read
 * the colors without training.
 */
export function RiskLegend() {
  return (
    <View testID="risk-legend" style={styles.card}>
      <Text style={styles.title}>Legenda dos níveis de risco</Text>
      {RISK_LEVEL_ORDER.map((level) => {
        const presentation = RISK_LEVELS[level];
        return (
          <View key={level} testID={`risk-legend-${level}`} style={styles.row}>
            <View style={styles.pillColumn}>
              <StatusPill
                label={presentation.label}
                color={presentation.color}
                backgroundColor={presentation.bg}
              />
            </View>
            <Text style={styles.description}>{presentation.description}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: COLORS.grey300,
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  title: {
    fontFamily: FONTS.extraBold,
    fontSize: 14,
    color: COLORS.heading,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  pillColumn: {
    width: 86,
  },
  description: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.grey500,
  },
});
