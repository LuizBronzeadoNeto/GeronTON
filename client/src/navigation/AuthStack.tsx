import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../types/navigation";
import { LoginScreen } from "../screens/LoginScreen";

const Stack = createNativeStackNavigator<AuthStackParamList>();

/**
 * Navigation shown while no user is signed in.
 */
export function AuthStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
