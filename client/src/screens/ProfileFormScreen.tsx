import { useState } from "react";
import {
  Button,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../types/navigation";

type Props = NativeStackScreenProps<AppStackParamList, "ProfileForm">;

/**
 * Form to register or edit an elderly profile. When the route carries a
 * `profileId` it behaves as an edit screen, otherwise as a registration screen.
 * The layout is intentionally minimal — the visual design comes later from
 * Figma, and persistence to the backend is wired in a later step.
 */
export function ProfileFormScreen({ navigation, route }: Props) {
  const isEditing = route.params?.profileId != null;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [scholarship, setScholarship] = useState("");
  const [medicalConditions, setMedicalConditions] = useState("");

  const canSubmit =
    firstName.trim() !== "" &&
    lastName.trim() !== "" &&
    birthDate.trim() !== "" &&
    scholarship.trim() !== "";

  function handleSubmit() {
    navigation.goBack();
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
});
