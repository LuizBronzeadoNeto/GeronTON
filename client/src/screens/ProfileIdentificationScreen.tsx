import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../types/navigation";
import { linkProfile, verifyProfileCpf } from "../api/profiles";
import { PrimaryButton } from "../components/PrimaryButton";
import { brDateToIso, maskBrDate } from "../utils/date";
import { cpfToDigits, maskCpf } from "../utils/cpf";
import { COLORS, FONTS } from "../theme";

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
    } catch {
      setError("Não foi possível verificar o CPF.");
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
      <View testID="profile-identification-found" style={styles.foundContainer}>
        <Text style={styles.foundTitle}>Idoso encontrado no sistema</Text>
        <Text style={styles.foundHint}>
          Este CPF já está cadastrado. Ao vincular, você passa a acompanhar este
          idoso junto com quem já o acompanha.
        </Text>

        {error ? (
          <Text testID="profile-identification-error" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <PrimaryButton
          testID="profile-identification-link"
          title="Vincular idoso"
          onPress={handleLink}
          loading={linking}
          style={styles.action}
        />

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
      </View>
    );
  }

  return (
    <ScrollView
      testID="profile-identification"
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Identificação</Text>
      <Text style={styles.hint}>
        Informe o CPF e a data de nascimento do idoso para começar.
      </Text>

      <Text style={styles.label}>CPF</Text>
      <TextInput
        testID="profile-identification-cpf"
        style={styles.input}
        placeholder="000.000.000-00"
        placeholderTextColor={COLORS.grey400}
        keyboardType="numeric"
        value={cpf}
        onChangeText={handleChange((value) => setCpf(maskCpf(value)))}
      />

      <Text style={styles.label}>Data de Nascimento</Text>
      <TextInput
        testID="profile-identification-birthDate"
        style={styles.input}
        placeholder="DD/MM/AAAA"
        placeholderTextColor={COLORS.grey400}
        keyboardType="numeric"
        value={birthDate}
        onChangeText={handleChange((value) => setBirthDate(maskBrDate(value)))}
      />

      {error ? (
        <Text testID="profile-identification-error" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <PrimaryButton
        testID="profile-identification-submit"
        title="Continuar"
        onPress={handleVerify}
        disabled={!canSubmit}
        loading={checking}
        style={styles.action}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 8,
    backgroundColor: COLORS.white,
  },
  foundContainer: {
    flex: 1,
    padding: 20,
    gap: 12,
    justifyContent: "center",
    backgroundColor: COLORS.white,
  },
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: 20,
    lineHeight: 28,
    color: COLORS.heading,
  },
  foundTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 20,
    lineHeight: 28,
    color: COLORS.heading,
    textAlign: "center",
  },
  hint: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.grey500,
    marginBottom: 8,
  },
  foundHint: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.grey500,
    textAlign: "center",
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
  error: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.danger,
    textAlign: "center",
  },
  action: {
    marginTop: 16,
  },
});
