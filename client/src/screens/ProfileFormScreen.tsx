import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
import { COLORS, FONTS } from "../theme";

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
  "Parkison",
  "DPOC",
  "Insuficiência Cardíaca",
  "Osteoporose",
  "Depressão",
  "Artrose",
];

/**
 * Formats typed digits as a DD/MM/AAAA date, inserting the slashes as the
 * user types.
 */
function maskBrDate(text: string): string {
  const digits = text.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/**
 * Converts a DD/MM/AAAA string to the ISO format the API expects, or null when
 * the value is not a complete valid date.
 */
function brDateToIso(text: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!match) return null;
  const [, day, month, year] = match;
  const iso = `${year}-${month}-${day}`;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return null;
  return iso;
}

/**
 * Converts an ISO date (from the API) to the DD/MM/AAAA display format.
 */
function isoToBrDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

/**
 * "Cadastro idoso" form from the Figma design: full name, DD/MM/AAAA birth
 * date, Sexo and Escolaridade dropdowns, pre-existing condition chips (presets
 * toggle, custom ones are added via "Outra condição" and removable) and an
 * optional observation. When the route carries a `profileId` it loads that
 * profile and behaves as an edit screen, otherwise it registers a new one. The
 * full name is split into first/last name for the API.
 */
export function ProfileFormScreen({ navigation, route }: Props) {
  const profileId = route.params?.profileId;
  const isEditing = profileId != null;

  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState<string | null>(null);
  const [scholarship, setScholarship] = useState<string | null>(null);
  const [conditions, setConditions] = useState<string[]>([]);
  const [customCondition, setCustomCondition] = useState("");
  const [notes, setNotes] = useState("");

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
        setFullName(`${profile.firstName} ${profile.lastName}`.trim());
        setBirthDate(isoToBrDate(profile.birthDate));
        setSex(profile.sex);
        setScholarship(profile.scholarship);
        setConditions(profile.medicalConditions);
        setNotes(profile.notes ?? "");
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

  function toggleCondition(condition: string) {
    setConditions((current) =>
      current.includes(condition)
        ? current.filter((item) => item !== condition)
        : [...current, condition],
    );
  }

  function addCustomCondition() {
    const condition = customCondition.trim();
    if (condition === "" || conditions.includes(condition)) return;
    setConditions((current) => [...current, condition]);
    setCustomCondition("");
  }

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
      firstName,
      lastName: rest.join(" "),
      birthDate: brDateToIso(birthDate) ?? "",
      sex,
      scholarship: scholarship ?? "",
      medicalConditions: conditions,
      notes: notes.trim() === "" ? null : notes.trim(),
    };

    try {
      if (isEditing) {
        await updateProfile(profileId, input);
      } else {
        await createProfile(input);
      }
      navigation.goBack();
    } catch {
      setError("Não foi possível salvar o perfil.");
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

  const customConditions = conditions.filter(
    (condition) => !PRESET_CONDITIONS.includes(condition),
  );

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.titleRow}>
        <Text testID="profile-form-title" style={styles.title}>
          {isEditing ? "Editar idoso" : "Cadastrar idoso"}
        </Text>
        {isEditing ? <RiskStatusBadge profileId={profileId} /> : null}
      </View>

      <Text style={styles.label}>Nome completo</Text>
      <TextInput
        testID="profile-fullName"
        style={styles.input}
        placeholder="Digite seu nome completo"
        placeholderTextColor={COLORS.grey400}
        value={fullName}
        onChangeText={setFullName}
      />

      <View style={styles.dateRow}>
        <View style={styles.dateField}>
          <Text style={styles.label}>Data de Nascimento</Text>
          <TextInput
            testID="profile-birthDate"
            style={styles.input}
            placeholder="DD/MM/AAAA"
            placeholderTextColor={COLORS.grey400}
            keyboardType="numeric"
            value={birthDate}
            onChangeText={(text) => setBirthDate(maskBrDate(text))}
          />
        </View>
        <View style={styles.sexField}>
          <SelectField
            testID="profile-sex"
            label="Sexo"
            placeholder="Masculino"
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

      <Text style={styles.label}>Condições pré-existentes</Text>
      <View style={styles.chipGrid}>
        {PRESET_CONDITIONS.map((condition) => {
          const selected = conditions.includes(condition);
          return (
            <Pressable
              key={condition}
              testID={`profile-condition-${condition}`}
              accessibilityRole="button"
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => toggleCondition(condition)}
            >
              <Text
                style={[styles.chipLabel, selected && styles.chipLabelSelected]}
              >
                {condition}
              </Text>
            </Pressable>
          );
        })}
        {customConditions.map((condition) => (
          <Pressable
            key={condition}
            testID={`profile-condition-remove-${condition}`}
            accessibilityRole="button"
            accessibilityLabel={`Remover ${condition}`}
            style={[styles.chip, styles.chipSelected]}
            onPress={() => toggleCondition(condition)}
          >
            <Text style={[styles.chipLabel, styles.chipLabelSelected]}>
              {condition} <Text style={styles.chipRemove}>×</Text>
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.customRow}>
        <TextInput
          testID="profile-condition-input"
          style={[styles.input, styles.customInput]}
          placeholder="Outra condição"
          placeholderTextColor={COLORS.grey400}
          value={customCondition}
          onChangeText={setCustomCondition}
          onSubmitEditing={addCustomCondition}
        />
        <Pressable
          testID="profile-condition-add"
          accessibilityRole="button"
          accessibilityLabel="Adicionar condição"
          style={styles.addButton}
          onPress={addCustomCondition}
        >
          <Ionicons name="add" size={24} color={COLORS.primary} />
        </Pressable>
      </View>

      <Text style={styles.label}>Observação (opcional)</Text>
      <TextInput
        testID="profile-notes"
        style={[styles.input, styles.textArea]}
        placeholderTextColor={COLORS.grey400}
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      {error ? (
        <Text testID="profile-form-error" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <PrimaryButton
        testID="profile-submit"
        title="Salvar"
        style={styles.submit}
        onPress={handleSubmit}
        disabled={!canSubmit}
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
  loading: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: 20,
    lineHeight: 28,
    color: COLORS.heading,
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
  dateRow: {
    flexDirection: "row",
    gap: 12,
  },
  dateField: {
    flex: 1,
    gap: 6,
  },
  sexField: {
    flex: 1,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.heading,
    borderRadius: 19,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.white,
  },
  chipSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.chipBg,
  },
  chipLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.heading,
  },
  chipLabelSelected: {
    color: COLORS.primary,
  },
  chipRemove: {
    fontSize: 13,
    color: COLORS.grey500,
  },
  customRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  customInput: {
    flex: 1,
  },
  addButton: {
    width: 60,
    height: 50,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  textArea: {
    height: undefined,
    minHeight: 120,
    paddingVertical: 12,
    textAlignVertical: "top",
  },
  error: {
    fontFamily: FONTS.semiBold,
    color: COLORS.danger,
    textAlign: "center",
  },
  submit: {
    marginTop: 12,
  },
});
