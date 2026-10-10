import { StyleSheet, Text, View } from "react-native";
import type { TriageEntry } from "../api/triage";
import { COLORS, FONTS } from "../theme";

interface Props {
  entries: TriageEntry[];
}

/**
 * Average adherence across elders: the share of observed weeks that had a
 * check-in, weighting every elder the same so one long-registered elder
 * doesn't drown out the rest. Null for an empty list.
 */
export function averageAdherence(entries: TriageEntry[]): number | null {
  const rates = entries
    .filter((entry) => entry.adherence && entry.adherence.weeksObserved > 0)
    .map(
      (entry) =>
        entry.adherence.weeksWithCheckIn / entry.adherence.weeksObserved,
    );
  if (rates.length === 0) return null;
  return rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
}

/**
 * Weekly check-in adherence card on the professional dashboard: how many of
 * the elders had a check-in in the last 7 days, and the average adherence
 * over the last 8 weeks.
 */
export function AdherenceSummary({ entries }: Props) {
  const thisWeek = entries.filter(
    (entry) => entry.adherence?.checkedInThisWeek,
  ).length;
  const average = averageAdherence(entries);

  return (
    <View testID="adherence-summary" style={styles.card}>
      <Text style={styles.title}>Adesão ao check-in semanal</Text>
      <View style={styles.row}>
        <View style={styles.metric}>
          <Text testID="adherence-this-week" style={styles.value}>
            {thisWeek} de {entries.length}
          </Text>
          <Text style={styles.label}>
            idosos com check-in nos últimos 7 dias
          </Text>
        </View>
        <View style={styles.metric}>
          <Text testID="adherence-average" style={styles.value}>
            {average === null ? "-" : `${Math.round(average * 100)}%`}
          </Text>
          <Text style={styles.label}>média das últimas 8 semanas</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: COLORS.grey300,
    borderRadius: 12,
    padding: 14,
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontFamily: FONTS.extraBold,
    fontSize: 14,
    color: COLORS.heading,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  metric: {
    flex: 1,
    gap: 2,
  },
  value: {
    fontFamily: FONTS.extraBold,
    fontSize: 22,
    color: COLORS.primary,
  },
  label: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.grey500,
  },
});
