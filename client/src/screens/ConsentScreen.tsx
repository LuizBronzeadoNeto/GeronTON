import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { PolicyText } from "../components/PolicyText";
import { CheckboxRow } from "../components/CheckboxRow";
import { PrimaryButton } from "../components/PrimaryButton";
import { CONSENT_STATEMENT } from "../constants/privacy";
import { COLORS, FONTS } from "../theme";

/**
 * Shown after sign-in to anyone who hasn't accepted the current consent term,
 * either because the account predates it or because the text changed. The
 * app stays behind this screen until the user agrees or signs out.
 */
export function ConsentScreen() {
  const { acceptConsent, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setSaving(true);
    setError(null);
    try {
      await acceptConsent();
    } catch {
      setError("Não foi possível registrar o aceite. Tente de novo.");
      setSaving(false);
    }
  }

  return (
    <View
      testID="consent"
      style={[
        styles.screen,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Termo de consentimento</Text>
        <Text style={styles.intro}>
          Antes de continuar, leia como o GeronTON usa os seus dados e os do
          idoso.
        </Text>
        <PolicyText />
      </ScrollView>

      <View style={styles.footer}>
        <CheckboxRow
          testID="consent-checkbox"
          checked={checked}
          label={CONSENT_STATEMENT}
          onToggle={() => setChecked((value) => !value)}
        />
        {error ? (
          <Text testID="consent-error" style={styles.error}>
            {error}
          </Text>
        ) : null}
        <PrimaryButton
          testID="consent-accept"
          title="Aceitar e continuar"
          disabled={!checked}
          loading={saving}
          onPress={handleAccept}
        />
        <PrimaryButton
          testID="consent-signout"
          title="Não aceito, sair"
          variant="outline"
          onPress={signOut}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  heading: {
    fontFamily: FONTS.extraBold,
    fontSize: 22,
    color: COLORS.heading,
  },
  intro: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.grey500,
    marginBottom: 4,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.grey300,
    padding: 16,
    gap: 10,
  },
  error: {
    fontFamily: FONTS.semiBold,
    color: COLORS.danger,
    textAlign: "center",
  },
});
