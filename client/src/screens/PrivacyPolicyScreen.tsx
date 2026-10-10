import { ScrollView, StyleSheet } from "react-native";
import { PolicyText } from "../components/PolicyText";
import { COLORS } from "../theme";

/**
 * Read-only consent term and privacy policy, opened from the sign-up screen.
 */
export function PrivacyPolicyScreen() {
  return (
    <ScrollView
      testID="privacy-policy"
      contentContainerStyle={styles.container}
    >
      <PolicyText />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: COLORS.white,
  },
});
