import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../types/navigation";
import { useAuth } from "../context/AuthContext";
import { Section } from "../components/Section";
import { ListRow } from "../components/ListRow";
import { PrimaryButton } from "../components/PrimaryButton";
import { COLORS, SPACING, TYPE } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "Account">;

/**
 * "Conta", opened from the single account icon in the header. It gathers what
 * used to sit in the header — the privacy policy (where the account can be
 * deleted) and signing out — so leaving the app is a deliberate choice rather
 * than one stray tap away on every screen.
 */
export function AccountScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const roleLabel =
    user?.role === "profissional" ? "Profissional de saúde" : "Cuidador";

  return (
    <ScrollView testID="account" contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Conta
        </Text>
        <Text style={styles.caption}>{roleLabel}</Text>
      </View>

      <Section title="Privacidade" grouped>
        <ListRow
          testID="account-privacy"
          label="Política de privacidade"
          caption="Seus dados, seus direitos e como excluir a conta"
          onPress={() => navigation.navigate("PrivacyPolicy")}
        />
      </Section>

      <PrimaryButton
        testID="header-signout"
        title="Sair da conta"
        variant="danger"
        onPress={signOut}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.screen,
    gap: SPACING.xl,
    backgroundColor: COLORS.white,
  },
  header: {
    gap: SPACING.xs,
  },
  title: {
    ...TYPE.title,
  },
  caption: {
    ...TYPE.caption,
  },
});
