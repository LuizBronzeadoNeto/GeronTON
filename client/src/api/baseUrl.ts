import { Platform } from "react-native";
import Constants from "expo-constants";

const host = Constants.expoConfig?.hostUri?.split(":")[0];
const hostIsLocal = !host || host === "localhost" || host === "127.0.0.1";

/**
 * Base URL of the backend (which listens on port 3000). Uses
 * EXPO_PUBLIC_API_URL when set; otherwise derives the LAN host from Expo's
 * hostUri, mapping the Android emulator's loopback to 10.0.2.2.
 */
export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === "android"
    ? `http://${hostIsLocal ? "10.0.2.2" : host}:3000`
    : `http://${host ?? "localhost"}:3000`);
