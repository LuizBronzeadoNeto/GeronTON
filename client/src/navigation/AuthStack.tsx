import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../types/navigation";
import { LoginScreen } from "../screens/LoginScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { COLORS, FONTS } from "../theme";

const Stack = createNativeStackNavigator<AuthStackParamList>();

/**
 * Navigation shown while no user is signed in: the login form and the sign-up
 * screen reached from its footer.
 */
export function AuthStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          title: "Criar conta",
          headerTitleAlign: "center",
          headerShadowVisible: false,
          headerTintColor: COLORS.heading,
          headerStyle: { backgroundColor: COLORS.white },
          headerTitleStyle: {
            fontFamily: FONTS.semiBold,
            fontSize: 16,
            color: COLORS.heading,
          },
        }}
      />
    </Stack.Navigator>
  );
}
