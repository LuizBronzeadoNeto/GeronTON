import { NavigationContainer } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { AuthStack } from "./AuthStack";
import { CaregiverNavigator } from "./CaregiverNavigator";
import { ProfessionalNavigator } from "./ProfessionalNavigator";

/**
 * Top-level navigation. Swaps between the auth flow and role-specific stacks
 * depending on whether a user is signed in and their role, following React
 * Navigation's authentication-flow pattern (conditionally render stacks rather
 * than imperatively navigating).
 */
export function RootNavigator() {
  const { user } = useAuth();

  return (
    <NavigationContainer>
      {user == null ? (
        <AuthStack />
      ) : user.role === "cuidador" ? (
        <CaregiverNavigator />
      ) : (
        <ProfessionalNavigator />
      )}
    </NavigationContainer>
  );
}
