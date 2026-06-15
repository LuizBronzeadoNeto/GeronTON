import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Button,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../types/navigation";
import { listProfiles, type Profile } from "../api/profiles";

type Props = NativeStackScreenProps<AppStackParamList, "ProfileList">;

/**
 * Lists the elderly profiles the user may access and is the entry point for
 * registering a new one or editing an existing one. The list is refetched each
 * time the screen regains focus, so it reflects changes made on the form.
 */
export function ProfileListScreen({ navigation }: Props) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError(null);
      listProfiles()
        .then((data) => {
          if (active) setProfiles(data);
        })
        .catch(() => {
          if (active) setError("Não foi possível carregar os idosos.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <View testID="profile-list" style={styles.container}>
      <Button
        testID="profile-add"
        title="Cadastrar idoso"
        onPress={() => navigation.navigate("ProfileForm")}
      />

      {loading ? <ActivityIndicator testID="profile-list-loading" /> : null}
      {error ? (
        <Text testID="profile-list-error" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <FlatList
        data={profiles}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          loading ? null : (
            <Text testID="profile-list-empty" style={styles.empty}>
              Nenhum idoso cadastrado.
            </Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            testID={`profile-item-${item.id}`}
            style={styles.item}
            onPress={() =>
              navigation.navigate("ProfileForm", { profileId: item.id })
            }
          >
            <Text style={styles.itemName}>
              {item.firstName} {item.lastName}
            </Text>
          </Pressable>
        )}
      />
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
  error: {
    color: "red",
    textAlign: "center",
  },
  item: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  itemName: {
    fontSize: 18,
  },
});
