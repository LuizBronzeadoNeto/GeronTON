import { Alert, Platform } from "react-native";

/**
 * Asks before a destructive action, then runs onConfirm. React Native Web
 * ships Alert.alert as an empty function, so on the web the browser's own
 * dialog is used instead; without it every delete in the PWA did nothing.
 */
export function confirmDestructive(
  title: string,
  message: string,
  onConfirm: () => void,
): void {
  if (Platform.OS === "web") {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }

  Alert.alert(title, message, [
    { text: "Cancelar", style: "cancel" },
    { text: "Remover", style: "destructive", onPress: onConfirm },
  ]);
}
