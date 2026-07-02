import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  title: string;
  message: string;
  onDismiss: () => void;
  testID?: string;
}

/**
 * Error toast from the Figma design: a light red card with a circular alert
 * badge, a title/message pair and an X dismiss button. It only renders the
 * card — the caller decides where it floats (e.g. absolutely at the top of the
 * login screen) and controls visibility via conditional rendering.
 */
export function ErrorToast({ title, message, onDismiss, testID }: Props) {
  return (
    <View testID={testID} style={styles.card}>
      <View style={styles.iconBadge}>
        <Ionicons name="alert-circle-outline" size={18} color="#E02D3C" />
      </View>
      <View style={styles.textPart}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
      <Pressable
        testID={testID ? `${testID}-dismiss` : undefined}
        accessibilityRole="button"
        accessibilityLabel="Fechar aviso"
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
    borderColor: "rgba(224, 45, 60, 0.2)",
    backgroundColor: "#FEF1F2",
    shadowColor: "#0D0A2C",
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 17,
    shadowOpacity: 0.08,
    elevation: 6,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFE5E0",
    alignItems: "center",
    justifyContent: "center",
  },
  textPart: {
    flex: 1,
  },
  title: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 12,
    lineHeight: 17,
    color: "#001413",
  },
  message: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 10,
    lineHeight: 14,
    color: "#999999",
  },
  dismiss: {
    padding: 6,
  },
});
