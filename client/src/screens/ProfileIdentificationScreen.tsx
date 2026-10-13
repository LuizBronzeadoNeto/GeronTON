import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../types/navigation";
import { isAxiosError } from "axios";
import { connectionErrorMessage } from "../api/errors";
import { linkProfile, verifyProfileCpf } from "../api/profiles";
import { PrimaryButton } from "../components/PrimaryButton";
import { brDateToIso, maskBrDate } from "../utils/date";
import { cpfToDigits, maskCpf } from "../utils/cpf";
import { ActionBar } from "../components/ActionBar";
import { formStyles } from "../components/formStyles";
import { COLORS, SPACING } from "../theme";
import { FormError } from "../components/FormError";

type Props = NativeStackScreenProps<AppStackParamList, "ProfileIdentification">;

/**
 * First step of registering an elder: the CPF that identifies them across the
 * whole system, plus their date of birth.
 *
 * The pair is checked before anything is typed twice. An unknown CPF continues
 * to the full registration form; a known one that the date confirms offers to
 * bind the signed-in user to the existing elder instead of creating a duplicate
 * record. The date is required alongside the CPF because CPFs circulate freely
 * in Brazil, so a CPF on its own must not be enough to reach someone's health
 * record.
 */
export function ProfileIdentificationScreen({ navigation }: Props) {
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [found, setFound] = useState(false);
  const [checking, setChecking] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const digits = cpfToDigits(cpf);
  const isoBirthDate = brDateToIso(birthDate);
  const canSubmit = digits !== null && isoBirthDate !== null;

  async function handleVerify() {
    if (!digits || !isoBirthDate) return;

    setChecking(true);
    setError(null);

    try {
      const status = await verifyProfileCpf(digits, isoBirthDate);

      if (status === "novo") {
        navigation.navigate("ProfileForm", {
          cpf: digits,
          birthDate: isoBirthDate,
        });
        return;
      }

      if (status === "encontrado") {
        setFound(true);
        return;
      }

      setError("Não foi possível confirmar os dados do idoso.");
    } catch (err) {
      setError(
        isAxiosError(err) && err.response?.status === 400
          ? "CPF inválido. Confira os números digitados."
          : (connectionErrorMessage(err) ??
              "Não foi possível verificar o CPF."),
      );
    } finally {
      setChecking(false);
    }
  }

  async function handleLink() {
    if (!digits || !isoBirthDate) return;

    setLinking(true);
    setError(null);

    try {
      const profile = await linkProfile(digits, isoBirthDate);
      navigation.reset({
        index: 1,
        routes: [
          { name: "Home" },
          { name: "ProfileDetail", params: { profileId: profile.id } },
        ],
      });
    } catch {
      setError("Não foi possível vincular o idoso.");
      setLinking(false);
    }
  }

  /**
   * Editing either field invalidates a previous "found" result, so the confirm
   * step can never be shown for a pair the backend has not just confirmed.
   */
  function handleChange(setter: (value: string) => void) {
    return (value: string) => {
      setter(value);
      setFound(false);
      setError(null);
    };
  }

  if (found) {
    return (
      <View testID="profile-identification-found" style={formStyles.screen}>
        <View style={styles.foundContent}>
          <Text style={formStyles.title} accessibilityRole="header">
            Idoso encontrado no sistema
          </Text>
          <Text style={formStyles.intro}>
            Este CPF já está cadastrado. Ao vincular, você passa a acompanhar
            este idoso junto com quem já o acompanha.
          </Text>
          {error ? (
            <FormError
              testID="profile-identification-error"
              style={formStyles.error}
              message={error}
            />
          ) : null}
        </View>

        <ActionBar testID="profile-identification-actions">
          <PrimaryButton
            testID="profile-identification-back"
            title="Corrigir dados"
            variant="outline"
            onPress={() => {
              setFound(false);
              setError(null);
            }}
            disabled={linking}
          />
          <PrimaryButton
            testID="profile-identification-link"
            title="Vincular idoso"
            onPress={handleLink}
            loading={linking}
          />
        </ActionBar>
      </View>
    );
  }

  return (
    <View style={formStyles.screen}>
      <ScrollView
        testID="profile-identification"
        contentContainerStyle={formStyles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={formStyles.title} accessibilityRole="header">
          Identificação
        </Text>
        <Text style={formStyles.intro}>
          Informe o CPF e a data de nascimento do idoso para começar.
        </Text>

        <View style={formStyles.field}>
          <Text style={formStyles.label}>CPF</Text>
          <TextInput
            testID="profile-identification-cpf"
            style={formStyles.input}
            placeholder="000.000.000-00"
            placeholderTextColor={COLORS.grey400}
            accessibilityLabel="CPF"
            keyboardType="numeric"
            value={cpf}
            onChangeText={handleChange((value) => setCpf(maskCpf(value)))}
          />
        </View>

        <View style={formStyles.field}>
          <Text style={formStyles.label}>Data de nascimento</Text>
          <TextInput
            testID="profile-identification-birthDate"
            style={formStyles.input}
            placeholder="DD/MM/AAAA"
            placeholderTextColor={COLORS.grey400}
            accessibilityLabel="Data de nascimento"
            keyboardType="numeric"
            value={birthDate}
            onChangeText={handleChange((value) =>
              setBirthDate(maskBrDate(value)),
            )}
          />
        </View>

        {error ? (
          <FormError
            testID="profile-identification-error"
            style={formStyles.error}
            message={error}
          />
        ) : null}
      </ScrollView>

      <ActionBar testID="profile-identification-actions">
        <PrimaryButton
          testID="profile-identification-submit"
          title="Continuar"
          onPress={handleVerify}
          disabled={!canSubmit}
          loading={checking}
        />
      </ActionBar>
    </View>
  );
}

const styles = StyleSheet.create({
  foundContent: {
    flex: 1,
    justifyContent: "center",
    padding: SPACING.screen,
    gap: SPACING.md,
  },
});
