import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { ErrorToast } from "../components/ErrorToast";
import { COLORS, FONTS } from "../theme";

/**
 * Email + password form styled after the GeronTON Figma design: branded logo,
 * labeled inputs with a password visibility toggle, primary "Entrar" button and
 * a sign-up footer. On success the AuthProvider stores the user, which flips
 * RootNavigator to the app stack; on failure a dismissible error toast floats
 * over the top of the form. The "Esqueceu a senha?" and "Cadastre-se agora!"
 * links are visual-only for now — those flows do not exist yet.
 */
export function LoginScreen() {
  const { signIn, isSigningIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  const canSubmit = !isSigningIn && email !== "" && password !== "";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.logo}>GeronTON</Text>

        <Text style={styles.heading}>Login</Text>
        <Text style={styles.subtitle}>
          Insira seus dados para acessar a plataforma
        </Text>

        <Text style={styles.label}>E-mail</Text>
        <TextInput
          testID="login-email"
          style={styles.input}
          placeholder="Digite seu e-mail"
          placeholderTextColor={COLORS.grey400}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Senha</Text>
        <View style={styles.passwordField}>
          <TextInput
            testID="login-password"
            style={[styles.input, styles.passwordInput]}
            placeholder="Digite sua senha"
            placeholderTextColor={COLORS.grey400}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            value={password}
            onChangeText={setPassword}
          />
          <Pressable
            testID="login-password-toggle"
            accessibilityRole="button"
            accessibilityLabel={
              showPassword ? "Ocultar senha" : "Mostrar senha"
            }
            style={styles.passwordToggle}
            onPress={() => setShowPassword((current) => !current)}
          >
            <Ionicons
              name={showPassword ? "eye-outline" : "eye-off-outline"}
              size={24}
              color={COLORS.grey500}
            />
          </Pressable>
        </View>

        <Text style={styles.forgotLink}>Esqueceu a senha?</Text>

        <Pressable
          testID="login-submit"
          accessibilityRole="button"
          style={[styles.button, !canSubmit && styles.buttonDisabled]}
          disabled={!canSubmit}
          onPress={handleSubmit}
        >
          {isSigningIn ? (
            <ActivityIndicator testID="login-loading" color={COLORS.white} />
          ) : (
            <Text style={styles.buttonText}>Entrar</Text>
          )}
        </Pressable>

        <Text style={styles.footer}>
          <Text style={styles.footerText}>Ainda não possui uma conta? </Text>
          <Text style={styles.footerLink}>Cadastre-se agora!</Text>
        </Text>
      </ScrollView>

      {error ? (
        <View style={styles.toastWrapper}>
          <ErrorToast
            testID="login-error"
            title={
              error === "Invalid credentials"
                ? "E-mail ou Senha incorretos"
                : "Não foi possível entrar"
            }
            message={
              error === "Invalid credentials"
                ? "Tente novamente, ou altere a senha"
                : error
            }
            onDismiss={() => setError(null)}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 21,
    paddingTop: 64,
    paddingBottom: 32,
  },
  logo: {
    fontFamily: FONTS.extraBold,
    fontSize: 32,
    color: COLORS.primary,
    textAlign: "center",
  },
  heading: {
    fontFamily: FONTS.semiBold,
    fontSize: 20,
    lineHeight: 28,
    color: COLORS.heading,
    textAlign: "center",
    marginTop: 48,
  },
  subtitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.grey500,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 32,
  },
  label: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.heading,
    marginBottom: 6,
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
    marginBottom: 24,
  },
  passwordField: {
    position: "relative",
  },
  passwordInput: {
    paddingRight: 52,
  },
  passwordToggle: {
    position: "absolute",
    right: 16,
    top: 13,
  },
  forgotLink: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.primary,
    textDecorationLine: "underline",
    marginTop: -8,
    marginBottom: 24,
  },
  toastWrapper: {
    position: "absolute",
    top: 24,
    left: 21,
    right: 21,
  },
  button: {
    height: 45,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.white,
  },
  footer: {
    textAlign: "center",
    marginTop: "auto",
    paddingTop: 48,
  },
  footerText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.text,
  },
  footerLink: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.primary,
    textDecorationLine: "underline",
  },
});
