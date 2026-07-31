import { Platform } from "react-native";
import Constants from "expo-constants";

const host = Constants.expoConfig?.hostUri?.split(":")[0];
const hostIsLocal = !host || host === "localhost" || host === "127.0.0.1";

/**
 * Derives a development API URL from Expo's hostUri, mapping the Android
 * emulator's loopback to 10.0.2.2. Only meaningful while the Expo dev server is
 * running, since hostUri is undefined in a standalone build.
 */
function developmentUrl(): string {
  return Platform.OS === "android"
    ? `http://${hostIsLocal ? "10.0.2.2" : host}:3000`
    : `http://${host ?? "localhost"}:3000`;
}

/**
 * Base URL of the backend. EXPO_PUBLIC_API_URL wins when set; in development it
 * falls back to the LAN host Expo is serving from.
 *
 * A release build with no EXPO_PUBLIC_API_URL throws instead of falling back.
 * The value is inlined at bundle time, so a missing one cannot be corrected at
 * runtime: the old fallback silently pointed every request at the emulator
 * loopback, producing an app that installed cleanly and then failed on every
 * screen. Failing at launch surfaces that during a build smoke test instead.
 */
function resolveBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;

  if (configured) {
    return configured;
  }

  if (__DEV__) {
    return developmentUrl();
  }

  throw new Error(
    "EXPO_PUBLIC_API_URL is not set. Define it in the eas.json build profile so it is inlined into the bundle.",
  );
}

export const BASE_URL = resolveBaseUrl();
