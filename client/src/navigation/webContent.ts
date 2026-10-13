import { Platform, type ViewStyle } from "react-native";

/**
 * On the web the app can be opened on a wide desktop window, where full-width
 * lines and buttons become hard to read. Screens there are a centred column
 * of phone-like width; native screens are untouched.
 */
export const WEB_CONTENT: ViewStyle =
  Platform.OS === "web"
    ? { maxWidth: 640, width: "100%", alignSelf: "center" }
    : {};
