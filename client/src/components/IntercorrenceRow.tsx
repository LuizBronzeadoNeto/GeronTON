import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Intercorrence } from "../api/intercorrences";
import { eventTypeLabel } from "../constants/intercorrence";
import { SeverityPill } from "./SeverityPill";
import { formatTimestamp } from "../utils/date";
import { COLORS, SPACING, TYPE } from "../theme";

interface Props {
  intercorrence: Intercorrence;
  onDelete: () => void;
  testIDPrefix: string;
}

/**
 * History row for an intercorrence, shared by the elder screen's "Histórico
 * recente" and the full history screen: the event type with its severity
 * pill, the date and the description on the left, and the remove action at
 * the far right edge, where a destructive action is expected (the caller
 * confirms and deletes).
 */
export function IntercorrenceRow({
  intercorrence,
  onDelete,
  testIDPrefix,
}: Props) {
  return (
    <View
      testID={`${testIDPrefix}-intercorrence-${intercorrence.id}`}
      style={styles.row}
    >
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>
            {eventTypeLabel(intercorrence.eventType)}
          </Text>
          <SeverityPill isCritical={intercorrence.isCritical} />
        </View>
        <Text style={styles.date}>{formatTimestamp(intercorrence.date)}</Text>
        {intercorrence.description !== "" ? (
          <Text style={styles.description} numberOfLines={2}>
            {intercorrence.description}
          </Text>
        ) : null}
      </View>
      <Pressable
        testID={`${testIDPrefix}-intercorrence-delete-${intercorrence.id}`}
        accessibilityRole="button"
        accessibilityLabel="Remover intercorrência"
        style={styles.deleteButton}
        onPress={onDelete}
      >
        <Ionicons name="trash-outline" size={20} color={COLORS.grey500} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingLeft: SPACING.lg,
    paddingRight: SPACING.xs,
    backgroundColor: COLORS.white,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  title: {
    ...TYPE.bodyStrong,
  },
  date: {
    ...TYPE.caption,
  },
  description: {
    ...TYPE.body,
    fontSize: 14,
    lineHeight: 20,
  },
  deleteButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
