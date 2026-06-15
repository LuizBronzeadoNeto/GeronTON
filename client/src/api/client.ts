import { Platform } from "react-native";
import Constants from "expo-constants";

const host = Constants.expoConfig?.hostUri?.split(":")[0];
const hostIsLocal = !host || host === "localhost" || host === "127.0.0.1";

/**
 * Base URL of the auth backend (which listens on port 3000).
 */
export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === "android"
    ? `http://${hostIsLocal ? "10.0.2.2" : host}:3000`
    : `http://${host ?? "localhost"}:3000`);

/**
 * JSON fetch helper for the backend. Sends/expects JSON and throws an Error
 * carrying the HTTP status when the response is not ok, so callers can branch
 * on specific failures.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = new Error(
      `Request failed with status ${res.status}`,
    ) as Error & {
      status?: number;
    };
    error.status = res.status;
    throw error;
  }

  return (await res.json()) as T;
}
