import { NavigationContainer } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { AuthStack } from "./AuthStack";
import { AppStack } from "./AppStack";

/**
 * Top-level navigation. Swaps between the auth flow and the app depending on
 * whether a user is signed in, following React Navigation's authentication-flow
 * pattern (conditionally render stacks rather than imperatively navigating).
 */
export function RootNavigator() {
  const { user } = useAuth();

  return (
    <NavigationContainer>
      {user == null ? <AuthStack /> : <AppStack role={user.role} />}
    </NavigationContainer>
  );
}
