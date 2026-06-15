import { Button, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";

/**
 * Home screen for healthcare professional (profissional) profiles.
 */
export function ProfessionalHomeScreen() {
  const { user, signOut } = useAuth();

  return (
    <View testID="professional-home" style={styles.container}>
      <Text style={styles.title}>Área do Profissional</Text>
      <Text style={styles.subtitle}>Usuário #{user?.id}</Text>
      <Button testID="signout" title="Sair" onPress={signOut} />
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
