import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../types/navigation";
import type { Role } from "../types/auth";
import { CaregiverHomeScreen } from "../screens/CaregiverHomeScreen";
import { ProfessionalHomeScreen } from "../screens/ProfessionalHomeScreen";
import { ProfileListScreen } from "../screens/ProfileListScreen";
import { ProfileFormScreen } from "../screens/ProfileFormScreen";
import { WeeklyCheckInScreen } from "../screens/WeeklyCheckInScreen";

const Stack = createNativeStackNavigator<AppStackParamList>();

/**
 * Navigation shown once a user is signed in. The Home screen is chosen by role:
 * caregivers (cuidador) and healthcare professionals (profissional) each get a
 * distinct home screen, and both reach the shared elderly-profile screens.
 */
export function AppStack({ role }: { role: Role }) {
  const HomeScreen =
    role === "cuidador" ? CaregiverHomeScreen : ProfessionalHomeScreen;

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: "Início" }}
      />
      <Stack.Screen
        name="ProfileList"
        component={ProfileListScreen}
        options={{ title: "Idosos" }}
      />
      <Stack.Screen
        name="ProfileForm"
        component={ProfileFormScreen}
        options={{ title: "Perfil" }}
      />
      <Stack.Screen
        name="WeeklyCheckIn"
        component={WeeklyCheckInScreen}
        options={{ title: "Check-in semanal" }}
      />
    </Stack.Navigator>
  );
}
