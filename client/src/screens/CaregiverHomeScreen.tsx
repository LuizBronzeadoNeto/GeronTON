import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import type { AppStackParamList } from "../types/navigation";
import { PrimaryButton } from "../components/PrimaryButton";
import { COLORS, FONTS } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "Home">;

/**
 * Home screen for caregiver (cuidador) profiles, styled with the design-system
 * tokens: branded title, supporting copy and the primary action leading to the
 * "Meus idosos" list.
 */
export function CaregiverHomeScreen({ navigation }: Props) {
  const { signOut } = useAuth();

  return (
    <View testID="caregiver-home" style={styles.container}>
      <Text style={styles.logo}>GeronTON</Text>
      <Text style={styles.title}>Área do Cuidador</Text>
      <Text style={styles.subtitle}>
        Acompanhe os idosos sob seu cuidado: cadastro, check-ins semanais,
        medicações e rotinas.
      </Text>
      <PrimaryButton
        testID="manage-profiles"
        title="Gerenciar idosos"
        style={styles.action}
        onPress={() => navigation.navigate("ProfileList")}
      />
      <PrimaryButton
        testID="signout"
        title="Sair"
        variant="outline"
        style={styles.action}
        onPress={signOut}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: COLORS.white,
    padding: 24,
    gap: 12,
  },
  logo: {
    fontFamily: FONTS.extraBold,
    fontSize: 32,
    color: COLORS.primary,
    textAlign: "center",
  },
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: 20,
    lineHeight: 28,
    color: COLORS.heading,
    textAlign: "center",
    marginTop: 24,
  },
  subtitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.grey500,
    textAlign: "center",
    marginBottom: 24,
  },
  action: {
    marginHorizontal: 12,
  },
});
