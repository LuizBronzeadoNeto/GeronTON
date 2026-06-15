import { Button, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../types/navigation";

type Props = NativeStackScreenProps<AppStackParamList, "ProfileList">;

/**
 * Lists the elderly profiles and is the entry point for registering a new one
 * or editing an existing one. Data loading from the backend is wired in a later
 * step; for now the screen shows the empty state and the register action.
 */
export function ProfileListScreen({ navigation }: Props) {
  return (
    <View testID="profile-list" style={styles.container}>
      <Button
        testID="profile-add"
        title="Cadastrar idoso"
        onPress={() => navigation.navigate("ProfileForm")}
      />
      <Text testID="profile-list-empty" style={styles.empty}>
        Nenhum idoso cadastrado.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  empty: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
  },
});
