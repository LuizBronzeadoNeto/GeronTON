import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Intercorrence } from "../api/intercorrences";
import { eventTypeLabel } from "../constants/intercorrence";
import { SeverityPill } from "./SeverityPill";
import { formatTimestamp } from "../utils/date";
import { COLORS, FONTS } from "../theme";

interface Props {
  intercorrence: Intercorrence;
  onDelete: () => void;
  testIDPrefix: string;
}

/**
 * History row for an intercorrence, shared by the profile hub's "Histórico
 * recente" card and the full history screen: event-type title with the
 * free-text description, a trash button (the caller confirms and deletes) and
 * the severity pill over the registration timestamp.
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
        <Text style={styles.title}>
          {eventTypeLabel(intercorrence.eventType)}
        </Text>
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
        <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
      </Pressable>
      <View style={styles.meta}>
        <SeverityPill isCritical={intercorrence.isCritical} />
        <Text style={styles.date}>{formatTimestamp(intercorrence.date)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.heading,
  },
  description: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.grey400,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  meta: {
    alignItems: "flex-end",
    gap: 4,
  },
  date: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: COLORS.grey400,
  },
});
