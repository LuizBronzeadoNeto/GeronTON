import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../types/navigation";
import {
  createProfile,
  getProfile,
  updateProfile,
  type ProfileInput,
} from "../api/profiles";
import { RiskStatusBadge } from "../components/RiskStatusBadge";
import { PrimaryButton } from "../components/PrimaryButton";
import { SelectField } from "../components/SelectField";
import { TagListInput } from "../components/TagListInput";
import { brDateToIso, isoToBrDate, maskBrDate } from "../utils/date";
import { maskCpf } from "../utils/cpf";
import { maskPhone } from "../utils/phone";
import { ActionBar } from "../components/ActionBar";
import { formStyles } from "../components/formStyles";
import { COLORS, CONTROL_HEIGHT, SPACING, TYPE } from "../theme";
import { FormError } from "../components/FormError";

type Props = NativeStackScreenProps<AppStackParamList, "ProfileForm">;

const SEX_OPTIONS = ["Masculino", "Feminino", "Outro"];

const SCHOLARSHIP_OPTIONS = [
  "Sem escolaridade",
  "Fundamental incompleto",
  "Fundamental completo",
  "Médio incompleto",
  "Médio completo",
  "Superior incompleto",
  "Superior completo",
];

const PRESET_CONDITIONS = [
  "Hipertensão",
  "Diabetes",
  "Demência",
  "AVC prévio",
  "Parkinson",
  "DPOC",
  "Insuficiência Cardíaca",
  "Osteoporose",
  "Depressão",
  "Artrose",
];

/**
 * "Cadastro idoso" form from the Figma design: full name, DD/MM/AAAA birth
 * date, Sexo and Escolaridade dropdowns, pre-existing condition chips (presets
 * toggle, custom ones are added via "Outra condição" and removable) and an
 * optional observation. When the route carries a `profileId` it loads that
 * profile and behaves as an edit screen, otherwise it registers a new one. The
 * full name is split into first/last name for the API.
 *
 * Registering resets the stack onto the new elder's detail screen rather than
 * going back: the previous screen is the CPF identification step, which still
 * holds the values just submitted, so returning to it looked like the start of
 * a second registration. Editing still goes back, since that returns to the
 * elder the user came from.
 */
export function ProfileFormScreen({ navigation, route }: Props) {
  const profileId = route.params?.profileId;
  const isEditing = profileId != null;

  const [cpf, setCpf] = useState(route.params?.cpf ?? "");
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState(
    route.params?.birthDate ? isoToBrDate(route.params.birthDate) : "",
  );
  const [sex, setSex] = useState<string | null>(null);
  const [scholarship, setScholarship] = useState<string | null>(null);
  const [conditions, setConditions] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profileId == null) {
      return;
    }
    let active = true;
    getProfile(profileId)
      .then((profile) => {
        if (!active) return;
        setCpf(profile.cpf ?? "");
        setFullName(`${profile.firstName} ${profile.lastName}`.trim());
        setBirthDate(isoToBrDate(profile.birthDate));
        setSex(profile.sex);
        setScholarship(profile.scholarship);
        setConditions(profile.medicalConditions);
        setNotes(profile.notes ?? "");
        setContactPhone(maskPhone(profile.contactPhone ?? ""));
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar o perfil.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [profileId]);

  const nameParts = fullName.trim().split(/\s+/);
  const canSubmit =
    !loading &&
    !saving &&
    nameParts.length >= 2 &&
    brDateToIso(birthDate) !== null &&
    scholarship !== null;

  async function handleSubmit() {
    setSaving(true);
    setError(null);

    const [firstName, ...rest] = nameParts;
    const input: ProfileInput = {
      cpf,
      firstName,
      lastName: rest.join(" "),
      birthDate: brDateToIso(birthDate) ?? "",
      sex,
      scholarship: scholarship ?? "",
      medicalConditions: conditions,
      notes: notes.trim() === "" ? null : notes.trim(),
      contactPhone: contactPhone.trim() === "" ? null : contactPhone.trim(),
    };

    try {
      if (isEditing) {
        await updateProfile(profileId, input);
        navigation.goBack();
      } else {
        const created = await createProfile(input);
        navigation.reset({
          index: 1,
          routes: [
            { name: "Home" },
            { name: "ProfileDetail", params: { profileId: created.id } },
          ],
        });
      }
    } catch (err) {
      setError(
        isAxiosError(err) &&
          String(err.response?.data?.error ?? "").includes("contactPhone")
          ? "Confira o telefone: informe o DDD e o número."
          : "Não foi possível salvar o perfil.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <ActivityIndicator
        testID="profile-form-loading"
        color={COLORS.primary}
        style={styles.loading}
      />
    );
  }

  return (
    <View style={formStyles.screen}>
      <ScrollView
        contentContainerStyle={formStyles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.titleRow}>
          <Text
            testID="profile-form-title"
            style={[formStyles.title, styles.title]}
            accessibilityRole="header"
          >
            {isEditing ? "Editar idoso" : "Cadastrar idoso"}
          </Text>
          {isEditing ? <RiskStatusBadge profileId={profileId} /> : null}
        </View>

        <View style={formStyles.field}>
          <Text style={formStyles.label}>CPF</Text>
          <Text
            testID="profile-cpf"
            style={[formStyles.input, styles.readOnlyInput]}
          >
            {cpf ? maskCpf(cpf) : "—"}
          </Text>
        </View>

        <View style={formStyles.field}>
          <Text style={formStyles.label}>Nome completo</Text>
          <TextInput
            testID="profile-fullName"
            style={formStyles.input}
            placeholder="Nome completo do idoso"
            accessibilityLabel="Nome completo do idoso"
            placeholderTextColor={COLORS.grey400}
            value={fullName}
            onChangeText={setFullName}
          />
          <Text style={formStyles.helper}>
            Nome e sobrenome, como no documento.
          </Text>
        </View>

        <View style={styles.pairRow}>
          <View style={[formStyles.field, styles.pairField]}>
            <Text style={formStyles.label}>Data de nascimento</Text>
            <TextInput
              testID="profile-birthDate"
              style={formStyles.input}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={COLORS.grey400}
              accessibilityLabel="Data de nascimento"
              keyboardType="numeric"
              value={birthDate}
              onChangeText={(text) => setBirthDate(maskBrDate(text))}
            />
          </View>
          <View style={styles.pairField}>
            <SelectField
              testID="profile-sex"
              label="Sexo"
              placeholder="Selecione"
              value={sex}
              options={SEX_OPTIONS}
              onSelect={setSex}
            />
          </View>
        </View>

        <SelectField
          testID="profile-scholarship"
          label="Escolaridade"
          value={scholarship}
          options={SCHOLARSHIP_OPTIONS}
          onSelect={setScholarship}
        />

        <View style={formStyles.field}>
          <Text style={formStyles.label}>Telefone da família (com DDD)</Text>
          <TextInput
            testID="profile-phone"
            style={formStyles.input}
            placeholder="(83) 99999-1234"
            placeholderTextColor={COLORS.grey400}
            accessibilityLabel="Telefone da família, com DDD"
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
            value={contactPhone}
            onChangeText={(text) => setContactPhone(maskPhone(text))}
          />
        </View>

        <View style={formStyles.field}>
          <Text style={formStyles.label}>Condições pré-existentes</Text>
          <TagListInput
            testIDPrefix="profile-condition"
            value={conditions}
            onChange={setConditions}
            suggestions={PRESET_CONDITIONS}
            placeholder="Outra condição"
            addAccessibilityLabel="Adicionar condição"
          />
        </View>

        <View style={formStyles.field}>
          <Text style={formStyles.label}>Observações (opcional)</Text>
          <TextInput
            testID="profile-notes"
            style={[formStyles.input, formStyles.textArea]}
            placeholder="Algo que a equipe deve saber sobre o idoso"
            placeholderTextColor={COLORS.grey400}
            accessibilityLabel="Observações"
            value={notes}
            onChangeText={setNotes}
            multiline
          />
        </View>

        {error ? (
          <FormError
            testID="profile-form-error"
            style={formStyles.error}
            message={error}
          />
        ) : null}
      </ScrollView>

      <ActionBar
        testID="profile-form-actions"
        note={
          !canSubmit && !saving ? (
            <Text style={styles.hint}>
              Preencha o nome completo, a data de nascimento e a escolaridade.
            </Text>
          ) : null
        }
      >
        <PrimaryButton
          testID="profile-submit"
          title="Salvar"
          loading={saving}
          onPress={handleSubmit}
          disabled={!canSubmit}
        />
      </ActionBar>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  title: {
    flexShrink: 1,
  },
  readOnlyInput: {
    backgroundColor: COLORS.surface,
    color: COLORS.grey500,
    lineHeight: CONTROL_HEIGHT,
  },
  pairRow: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  pairField: {
    flex: 1,
  },
  hint: {
    ...TYPE.caption,
    textAlign: "center",
  },
});
