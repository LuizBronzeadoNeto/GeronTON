import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONTS } from "../theme";

interface Props {
  title: string;
  message: string;
  critical?: boolean;
  onDismiss: () => void;
  testID?: string;
}

/**
 * In-app notification card, the positive counterpart of ErrorToast: a light
 * card with a circular icon badge, a title/message pair and an X dismiss
 * button. Critical notifications use the danger palette with a warning icon;
 * regular ones use the success palette with a checkmark. Like ErrorToast it
 * only renders the card, the caller (NotificationProvider) decides where it
 * floats and controls visibility.
 */
export function NotificationToast({
  title,
  message,
  critical = false,
  onDismiss,
  testID,
}: Props) {
  const accent = critical ? COLORS.danger : COLORS.success;

  return (
    <View
      testID={testID}
      style={[styles.card, critical ? styles.cardCritical : styles.cardRegular]}
    >
      <View
        style={[
          styles.iconBadge,
          { backgroundColor: critical ? COLORS.dangerBadgeBg : COLORS.white },
        ]}
      >
        <Ionicons
          name={critical ? "warning-outline" : "checkmark-circle-outline"}
          size={18}
          color={accent}
        />
      </View>
      <View style={styles.textPart}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
      <Pressable
        testID={testID ? `${testID}-dismiss` : undefined}
        accessibilityRole="button"
        accessibilityLabel="Fechar notificação"
        style={styles.dismiss}
        onPress={onDismiss}
      >
        <Ionicons name="close" size={20} color="#242533" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    minHeight: 50,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#0D0A2C",
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 17,
    shadowOpacity: 0.08,
    elevation: 6,
  },
  cardRegular: {
    borderColor: "rgba(7, 122, 114, 0.2)",
    backgroundColor: COLORS.successBg,
  },
  cardCritical: {
    borderColor: "rgba(224, 45, 60, 0.2)",
    backgroundColor: COLORS.dangerBg,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  textPart: {
    flex: 1,
  },
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.heading,
  },
  message: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    lineHeight: 14,
    color: COLORS.grey500,
  },
  dismiss: {
    padding: 6,
  },
});
