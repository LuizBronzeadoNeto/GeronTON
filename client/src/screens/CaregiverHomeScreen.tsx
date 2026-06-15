import { Button, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import type { AppStackParamList } from "../types/navigation";

type Props = NativeStackScreenProps<AppStackParamList, "Home">;

/**
 * Home screen for caregiver (cuidador) profiles.
 */
export function CaregiverHomeScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();

  return (
    <View testID="caregiver-home" style={styles.container}>
      <Text style={styles.title}>Área do Cuidador</Text>
      <Text style={styles.subtitle}>Usuário #{user?.id}</Text>
      <Button
        testID="manage-profiles"
        title="Gerenciar idosos"
        onPress={() => navigation.navigate("ProfileList")}
      />
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
