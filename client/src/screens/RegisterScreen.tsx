import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../types/navigation";
import type { Role } from "../types/auth";
import { register } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { PrimaryButton } from "../components/PrimaryButton";
import { SelectField } from "../components/SelectField";
import { ErrorToast } from "../components/ErrorToast";
import { COLORS, FONTS } from "../theme";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

const MIN_PASSWORD_LENGTH = 8;

const ROLE_LABELS: Record<string, Role> = {
  Cuidador: "cuidador",
  "Profissional de saúde": "profissional",
};

const ROLE_OPTIONS = Object.keys(ROLE_LABELS);

/**
 * Sign-up screen reached from the login footer. Collects the role, e-mail and
 * password, plus a CRM when registering as a health professional.
 *
 * On success it signs the new user straight in rather than sending them back to
 * the login form, so a caregiver never has to retype the password they just
 * chose. The password rule mirrors the backend's minimum so the failure is
 * shown before a request is made rather than as a generic 400.
 */
export function RegisterScreen({ navigation }: Props) {
  const { signIn, isSigningIn } = useAuth();

  const [roleLabel, setRoleLabel] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [crm, setCrm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const role = roleLabel ? ROLE_LABELS[roleLabel] : null;
  const isProfessional = role === "profissional";

  const canSubmit =
    role !== null &&
    email.trim() !== "" &&
    password.length >= MIN_PASSWORD_LENGTH &&
    (!isProfessional || crm.trim() !== "");

  async function handleSubmit() {
    if (!role) return;

    setSubmitting(true);
    setError(null);

    try {
      await register({
        email: email.trim(),
        password,
        role,
        crm: crm.trim(),
      });
      await signIn(email.trim(), password);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Não foi possível criar a conta.",
      );
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        testID="register"
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.hint}>
          Escolha seu perfil e informe seus dados de acesso.
        </Text>

        <SelectField
          testID="register-role"
          label="Perfil"
          placeholder="Selecione"
          value={roleLabel}
          options={ROLE_OPTIONS}
          onSelect={setRoleLabel}
        />

        <Text style={styles.label}>E-mail</Text>
        <TextInput
          testID="register-email"
          style={styles.input}
          placeholder="Digite seu e-mail"
          placeholderTextColor={COLORS.grey400}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Senha</Text>
        <TextInput
          testID="register-password"
          style={styles.input}
          placeholder={`Mínimo de ${MIN_PASSWORD_LENGTH} caracteres`}
          placeholderTextColor={COLORS.grey400}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {isProfessional ? (
          <View>
            <Text style={styles.label}>CRM</Text>
            <TextInput
              testID="register-crm"
              style={styles.input}
              placeholder="12345-PB"
              placeholderTextColor={COLORS.grey400}
              autoCapitalize="characters"
              value={crm}
              onChangeText={setCrm}
            />
          </View>
        ) : null}

        <PrimaryButton
          testID="register-submit"
          title="Criar conta"
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={submitting || isSigningIn}
          style={styles.action}
        />

        <Pressable
          testID="register-back"
          accessibilityRole="button"
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.footer}>
            <Text style={styles.footerText}>Já possui uma conta? </Text>
            <Text style={styles.footerLink}>Entrar</Text>
          </Text>
        </Pressable>
      </ScrollView>

      {error ? (
        <View style={styles.toastWrapper}>
          <ErrorToast
            testID="register-error"
            title="Não foi possível criar a conta"
            message={error}
            onDismiss={() => setError(null)}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    padding: 20,
    gap: 8,
  },
  hint: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.grey500,
    textAlign: "center",
    marginBottom: 12,
  },
  label: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.heading,
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
  action: {
    marginTop: 16,
  },
  footer: {
    textAlign: "center",
    marginTop: 8,
  },
  footerText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.text,
  },
  footerLink: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.primary,
    textDecorationLine: "underline",
  },
  toastWrapper: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
  },
});
