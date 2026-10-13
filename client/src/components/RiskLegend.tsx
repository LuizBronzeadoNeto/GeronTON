import { StyleSheet, Text, View } from "react-native";
import { RISK_LEVELS, RISK_LEVEL_ORDER } from "../constants/risk";
import { StatusPill } from "./StatusPill";
import { Section } from "./Section";
import { SPACING, TYPE } from "../theme";

/**
 * Interface legend explaining the risk levels: one row per level with its
 * status pill (same label and colors the profile cards use) and a plain-
 * language description of what the level means and what to do. Shown under
 * the lists that display risk pills so caregivers and professionals can read
 * the colors without training.
 */
export function RiskLegend() {
  return (
    <View testID="risk-legend">
      <Section title="O que cada cor quer dizer" grouped>
        {RISK_LEVEL_ORDER.map((level) => {
          const presentation = RISK_LEVELS[level];
          return (
            <View
              key={level}
              testID={`risk-legend-${level}`}
              style={styles.row}
            >
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
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.md,
    padding: SPACING.lg,
  },
  pillColumn: {
    width: 100,
  },
  description: {
    ...TYPE.caption,
    flex: 1,
  },
});
