import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, FONTS } from "../theme";

interface Props {
  testID?: string;
}

/**
 * Tells the caregiver to call SAMU when a life is at risk, with a button that
 * opens the dialer. The app only reaches the care team, who do not watch it
 * around the clock, so an emergency must never wait on it.
 */
export function EmergencyCallout({ testID = "emergency-callout" }: Props) {
  return (
    <View testID={testID} style={styles.card}>
      <Ionicons name="call-outline" size={20} color={COLORS.danger} />
      <Text style={styles.text}>
        Em risco de vida, ligue agora para o SAMU. O app não substitui o
        atendimento de emergência.
      </Text>
      <Pressable
        testID={`${testID}-call`}
        accessibilityRole="button"
        accessibilityLabel="Ligar para o SAMU, 192"
        style={styles.button}
        onPress={() => void Linking.openURL("tel:192")}
      >
        <Text style={styles.buttonLabel}>Ligar 192</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerBg,
  },
  text: {
    flex: 1,
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.heading,
  },
  button: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: COLORS.danger,
  },
  buttonLabel: {
    fontFamily: FONTS.extraBold,
    fontSize: 14,
    color: COLORS.white,
  },
});
