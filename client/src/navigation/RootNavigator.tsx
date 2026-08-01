import { ActivityIndicator, StyleSheet, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { usePushSync } from "../push/usePushSync";
import { COLORS } from "../theme";
import { AuthStack } from "./AuthStack";
import { AppStack } from "./AppStack";

/**
 * Top-level navigation. Swaps between the auth flow and the app depending on
 * whether a user is signed in, following React Navigation's authentication-flow
 * pattern (conditionally render stacks rather than imperatively navigating).
 *
 * While the stored session is being read, a spinner stands in for both stacks:
 * mounting the login screen first would make a returning user watch it flash
 * away as soon as the session resolves.
 *
 * This is also where push registration lives: it is the only place that sees
 * both a fresh sign-in and a session restored from storage, and it sits inside
 * NotificationProvider, so a push arriving with the app open can be handed to
 * the same toast the rest of the app uses.
 */
export function RootNavigator() {
  const { user, isRestoring } = useAuth();

  usePushSync();

  if (isRestoring) {
    return (
      <View style={styles.loading} testID="session-loading">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user == null ? <AuthStack /> : <AppStack role={user.role} />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
  },
});
