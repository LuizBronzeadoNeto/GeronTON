import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { CaregiverStackParamList } from "../types/navigation";
import { CaregiverHomeScreen } from "../screens/CaregiverHomeScreen";

const Stack = createNativeStackNavigator<CaregiverStackParamList>();

/**
 * Navigation for the caregiver (cuidador) flow after sign-in.
 */
export function CaregiverNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="CaregiverHome"
        component={CaregiverHomeScreen}
        options={{ title: "Início" }}
      />
    </Stack.Navigator>
  );
}
