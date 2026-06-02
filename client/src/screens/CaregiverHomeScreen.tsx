import { Button, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";

/**
 * Home screen for caregiver (cuidador) profiles.
 */
export function CaregiverHomeScreen() {
  const { user, signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Área do Cuidador</Text>
      <Text style={styles.subtitle}>Usuário #{user?.id}</Text>
      <Button title="Sair" onPress={signOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
  },
});
