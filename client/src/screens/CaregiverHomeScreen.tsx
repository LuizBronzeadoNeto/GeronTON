import { Button, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { colors, typography, spacing } from "../theme";

/**
 * Home screen for caregiver (cuidador) profiles.
 */
export function CaregiverHomeScreen() {
  const { user, signOut } = useAuth();

  return (
    <View testID="caregiver-home" style={styles.container}>
      <Text style={styles.title}>Área do Cuidador</Text>
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
    padding: spacing.padding,
    gap: spacing.gap,
  },
  title: {
    ...typography.title,
  },
  subtitle: {
    ...typography.subtitle,
    color: colors.text.secondary,
  },
});
