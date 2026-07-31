import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Platform, Pressable, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { AppStackParamList } from "../types/navigation";
import type { Role } from "../types/auth";
import { useAuth } from "../context/AuthContext";
import { COLORS, FONTS } from "../theme";
import { CaregiverHomeScreen } from "../screens/CaregiverHomeScreen";
import { ProfessionalHomeScreen } from "../screens/ProfessionalHomeScreen";
import { ProfileListScreen } from "../screens/ProfileListScreen";
import { ProfileDetailScreen } from "../screens/ProfileDetailScreen";
import { ProfileFormScreen } from "../screens/ProfileFormScreen";
import { IntercorrenceFormScreen } from "../screens/IntercorrenceFormScreen";
import { IntercorrenceConfirmationScreen } from "../screens/IntercorrenceConfirmationScreen";
import { IntercorrenceListScreen } from "../screens/IntercorrenceListScreen";
import { WeeklyCheckInScreen } from "../screens/WeeklyCheckInScreen";
import { CheckInDetailScreen } from "../screens/CheckInDetailScreen";
import { RedirectScreen } from "../screens/RedirectScreen";
import { MedicationInventoryScreen } from "../screens/MedicationInventoryScreen";
import { MedicationFormScreen } from "../screens/MedicationFormScreen";
import { RoutineRegistrationScreen } from "../screens/RoutineRegistrationScreen";

const Stack = createNativeStackNavigator<AppStackParamList>();

/**
 * "Sair" header action from the Figma design — a logout icon plus label at the
 * right edge of every signed-in screen's header.
 *
 * The right padding is web-only: the native headers inset their right action
 * themselves, but react-native-web's fallback header does not, which left the
 * label flush against the screen edge with its last glyph reading as cut off.
 */
function SignOutButton() {
  const { signOut } = useAuth();

  return (
    <Pressable
      testID="header-signout"
      accessibilityRole="button"
      style={styles.signOut}
      onPress={signOut}
    >
      <Ionicons name="log-out-outline" size={22} color={COLORS.heading} />
      <Text style={styles.signOutLabel}>Sair</Text>
    </Pressable>
  );
}

/**
 * Navigation shown once a user is signed in. The Home screen is chosen by role:
 * caregivers (cuidador) and healthcare professionals (profissional) each get a
 * distinct home screen, and both reach the shared elderly-profile screens.
 * Headers follow the Figma design: centered Nunito Sans title, no shadow and a
 * "Sair" action on the right.
 *
 * Only a cuidador starts at Redirect. Their landing screen depends on how many
 * profiles they have, so it can only be decided after a fetch; a profissional
 * always lands on Home, so routing them through Redirect would mean dispatching
 * a reset from the initial screen's first effect, before the navigator is ready
 * to receive it. That reset is silently dropped and the app sits on Redirect's
 * spinner forever. Starting them on Home removes the hop entirely.
 */
export function AppStack({ role }: { role: Role }) {
  const HomeScreen =
    role === "cuidador" ? CaregiverHomeScreen : ProfessionalHomeScreen;

  return (
    <Stack.Navigator
      initialRouteName={role === "cuidador" ? "Redirect" : "Home"}
      screenOptions={{
        headerTitleAlign: "center",
        headerShadowVisible: false,
        headerTintColor: COLORS.heading,
        headerStyle: { backgroundColor: COLORS.white },
        headerTitleStyle: {
          fontFamily: FONTS.semiBold,
          fontSize: 16,
          color: COLORS.heading,
        },
        headerBackButtonDisplayMode: "minimal",
        headerRight: () => <SignOutButton />,
        contentStyle: { backgroundColor: COLORS.white },
      }}
    >
      <Stack.Screen
        name="Redirect"
        component={RedirectScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: role === "cuidador" ? "Início" : "Painel de triagem",
        }}
      />
      <Stack.Screen
        name="ProfileList"
        component={ProfileListScreen}
        options={{ title: "Meus idosos" }}
      />
      <Stack.Screen
        name="ProfileDetail"
        component={ProfileDetailScreen}
        options={{
          title: role === "cuidador" ? "Meus idosos" : "Painel de triagem",
        }}
      />
      <Stack.Screen
        name="ProfileForm"
        component={ProfileFormScreen}
        options={{ title: "Cadastrar idoso" }}
      />
      <Stack.Screen
        name="IntercorrenceForm"
        component={IntercorrenceFormScreen}
        options={{ title: "Intercorrência" }}
      />
      <Stack.Screen
        name="IntercorrenceConfirmation"
        component={IntercorrenceConfirmationScreen}
        options={{ title: "Intercorrência" }}
      />
      <Stack.Screen
        name="IntercorrenceList"
        component={IntercorrenceListScreen}
        options={{ title: "Histórico" }}
      />
      <Stack.Screen
        name="WeeklyCheckIn"
        component={WeeklyCheckInScreen}
        options={{ title: "Check-in" }}
      />
      <Stack.Screen
        name="CheckInDetail"
        component={CheckInDetailScreen}
        options={{ title: "Check-in" }}
      />
      <Stack.Screen
        name="MedicationInventory"
        component={MedicationInventoryScreen}
        options={{ title: "Medicação" }}
      />
      <Stack.Screen
        name="MedicationForm"
        component={MedicationFormScreen}
        options={{ title: "Medicamento" }}
      />
      <Stack.Screen
        name="RoutineRegistration"
        component={RoutineRegistrationScreen}
        options={{ title: "Rotina" }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  signOut: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    ...Platform.select({ web: { paddingRight: 16 }, default: {} }),
  },
  signOutLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.heading,
  },
});
