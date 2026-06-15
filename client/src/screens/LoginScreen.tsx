import { useState } from "react";
import {
  ActivityIndicator,
  Button,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";

/**
 * Email + password form. On success the AuthProvider stores the user, which
 * flips RootNavigator to the app stack; on failure it shows the error message.
 */
export function LoginScreen() {
  const { signIn, isSigningIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>GeronTON</Text>

      <TextInput
        testID="login-email"
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        testID="login-password"
        style={styles.input}
        placeholder="Senha"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error ? (
        <Text testID="login-error" style={styles.error}>
          {error}
        </Text>
      ) : null}

      {isSigningIn ? (
        <ActivityIndicator testID="login-loading" />
      ) : (
        <Button
          testID="login-submit"
          title="Entrar"
          onPress={handleSubmit}
          disabled={!email || !password}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  error: {
    color: "red",
    textAlign: "center",
  },
});
