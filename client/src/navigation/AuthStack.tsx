import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { AuthStackParamList } from "../types/navigation";
import { LoginScreen } from "../screens/LoginScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { PrivacyPolicyScreen } from "../screens/PrivacyPolicyScreen";
import { COLORS, FONTS } from "../theme";

const Stack = createNativeStackNavigator<AuthStackParamList>();

const HEADER_OPTIONS = {
  headerTitleAlign: "center" as const,
  headerShadowVisible: false,
  headerTintColor: COLORS.heading,
  headerStyle: { backgroundColor: COLORS.white },
  headerTitleStyle: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.heading,
  },
};

/**
 * Navigation shown while no user is signed in: the login form, the sign-up
 * screen reached from its footer and the privacy policy linked from sign-up.
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
        options={{ title: "Criar conta", ...HEADER_OPTIONS }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ title: "Privacidade", ...HEADER_OPTIONS }}
      />
    </Stack.Navigator>
  );
}
