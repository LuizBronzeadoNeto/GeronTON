import { StyleSheet, Text, View } from "react-native";
import { PRIVACY_POLICY } from "../constants/privacy";
import { COLORS, FONTS } from "../theme";

/**
 * The consent term and privacy policy, section by section. Shared by the
 * policy screen linked from sign-up and the consent screen.
 */
export function PolicyText() {
  return (
    <View testID="policy-text" style={styles.container}>
      {PRIVACY_POLICY.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.title}>{section.title}</Text>
          {section.paragraphs.map((paragraph) => (
            <Text key={paragraph} style={styles.paragraph}>
              {paragraph}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  section: {
    gap: 6,
  },
  title: {
    fontFamily: FONTS.extraBold,
    fontSize: 15,
    color: COLORS.heading,
  },
  paragraph: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.text,
  },
});
