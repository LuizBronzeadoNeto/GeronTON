import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../types/navigation";
import {
  createProfile,
  getProfile,
  updateProfile,
  type ProfileInput,
} from "../api/profiles";

type Props = NativeStackScreenProps<AppStackParamList, "ProfileForm">;

/**
 * Form to register or edit an elderly profile. When the route carries a
 * profileId it loads that profile and behaves as an edit screen, otherwise it
 * registers a new one. The layout is intentionally minimal - the visual design
 * comes later from Figma.
 */
export function ProfileFormScreen({ navigation, route }: Props) {
  const profileId = route.params?.profileId;
  const isEditing = profileId != null;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [scholarship, setScholarship] = useState("");
  const [medicalConditions, setMedicalConditions] = useState("");

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
        setFirstName(profile.firstName);
        setLastName(profile.lastName);
        setBirthDate(profile.birthDate.slice(0, 10));
        setScholarship(profile.scholarship);
        setMedicalConditions(profile.medicalConditions.join(", "));
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

  const canSubmit =
    !loading &&
    !saving &&
    firstName.trim() !== "" &&
    lastName.trim() !== "" &&
    birthDate.trim() !== "" &&
    scholarship.trim() !== "";

  async function handleSubmit() {
    setSaving(true);
    setError(null);

    const input: ProfileInput = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      birthDate: birthDate.trim(),
      scholarship: scholarship.trim(),
      medicalConditions: medicalConditions
        .split(",")
        .map((condition) => condition.trim())
        .filter((condition) => condition !== ""),
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
      <ActivityIndicator testID="profile-form-loading" style={styles.loading} />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text testID="profile-form-title" style={styles.title}>
        {isEditing ? "Editar idoso" : "Cadastrar idoso"}
      </Text>

      <Text style={styles.label}>Nome</Text>
      <TextInput
        testID="profile-firstName"
        style={styles.input}
        placeholder="Nome"
        value={firstName}
        onChangeText={setFirstName}
      />

      <Text style={styles.label}>Sobrenome</Text>
      <TextInput
        testID="profile-lastName"
        style={styles.input}
        placeholder="Sobrenome"
        value={lastName}
        onChangeText={setLastName}
      />

      <Text style={styles.label}>Data de nascimento</Text>
      <TextInput
        testID="profile-birthDate"
        style={styles.input}
        placeholder="AAAA-MM-DD"
        autoCapitalize="none"
        value={birthDate}
        onChangeText={setBirthDate}
      />

      <Text style={styles.label}>Escolaridade</Text>
      <TextInput
        testID="profile-scholarship"
        style={styles.input}
        placeholder="Escolaridade"
        value={scholarship}
        onChangeText={setScholarship}
      />

      <Text style={styles.label}>Condições médicas</Text>
      <TextInput
        testID="profile-medicalConditions"
        style={styles.input}
        placeholder="Separadas por vírgula"
        value={medicalConditions}
        onChangeText={setMedicalConditions}
      />

      {error ? (
        <Text testID="profile-form-error" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <Button
        testID="profile-submit"
        title="Salvar"
        onPress={handleSubmit}
        disabled={!canSubmit}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 8,
  },
  loading: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: "#555",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  error: {
    color: "red",
    textAlign: "center",
  },
});
