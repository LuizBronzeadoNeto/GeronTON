import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { deleteAccount } from "../api/auth";
import { PolicyText } from "../components/PolicyText";
import { PrimaryButton } from "../components/PrimaryButton";
import { COLORS, FONTS } from "../theme";

/**
 * Account deletion, shown under the policy when someone is signed in. Asks
 * for the password again and signs out once the account is gone.
 */
function DeleteAccountSection() {
  const { signOut } = useAuth();
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount(password);
      signOut();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível excluir a conta.",
      );
      setDeleting(false);
    }
  }

  return (
    <View testID="delete-account" style={styles.deleteBox}>
      <Text style={styles.deleteTitle}>Excluir minha conta</Text>
      <Text style={styles.deleteText}>
        Sua conta é apagada de vez. Idosos que só você acompanha são apagados
        junto; os que outras pessoas também acompanham continuam com elas.
      </Text>
      <TextInput
        testID="delete-account-password"
        style={styles.input}
        placeholder="Digite sua senha para confirmar"
        placeholderTextColor={COLORS.grey400}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? (
        <Text testID="delete-account-error" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <PrimaryButton
        testID="delete-account-submit"
        title="Excluir minha conta"
        variant="danger"
        disabled={password === ""}
        loading={deleting}
        onPress={handleDelete}
      />
    </View>
  );
}

/**
 * Consent term and privacy policy. Opened from the sign-up screen, and from
 * the header once signed in, where it also offers account deletion.
 */
export function PrivacyPolicyScreen() {
  const { user } = useAuth();

  return (
    <ScrollView
      testID="privacy-policy"
      contentContainerStyle={styles.container}
    >
      <PolicyText />
      {user ? <DeleteAccountSection /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 24,
    backgroundColor: COLORS.white,
  },
  deleteBox: {
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  deleteTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 15,
    color: COLORS.danger,
  },
  deleteText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.text,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: COLORS.grey300,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.heading,
  },
  error: {
    fontFamily: FONTS.semiBold,
    color: COLORS.danger,
    textAlign: "center",
  },
});
