import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { ProfessionalStackParamList } from "../types/navigation";
import { ProfessionalHomeScreen } from "../screens/ProfessionalHomeScreen";

const Stack = createNativeStackNavigator<ProfessionalStackParamList>();

/**
 * Navigation for the healthcare professional (profissional) flow after sign-in.
 */
export function ProfessionalNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ProfessionalHome"
        component={ProfessionalHomeScreen}
        options={{ title: "Início" }}
      />
    </Stack.Navigator>
  );
}
