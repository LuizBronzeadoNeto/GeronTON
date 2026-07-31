import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { User } from "../types/auth";

const SESSION_KEY = "geronton.session";

/**
 * expo-secure-store has no web implementation, so the browser build falls back
 * to localStorage. Keeping the branch here means the rest of the app never has
 * to know which platform it is on. On native the value lands in the Android
 * Keystore / iOS keychain; on web localStorage is the practical ceiling.
 */
const isWeb = Platform.OS === "web";

async function readRaw(): Promise<string | null> {
  if (isWeb) {
    return globalThis.localStorage?.getItem(SESSION_KEY) ?? null;
  }
  return SecureStore.getItemAsync(SESSION_KEY);
}

async function writeRaw(value: string): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.setItem(SESSION_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(SESSION_KEY, value);
}

async function deleteRaw(): Promise<void> {
  if (isWeb) {
    globalThis.localStorage?.removeItem(SESSION_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

/**
 * Persists the signed-in user so a cold start does not force a new login.
 * Storage failures are swallowed: losing persistence degrades the experience to
 * the previous in-memory behaviour, which is not worth failing a sign-in over.
 */
export async function saveSession(user: User): Promise<void> {
  try {
    await writeRaw(JSON.stringify(user));
  } catch {
    return;
  }
}

/**
 * Reads the stored session, or null when there is none. A value that is missing,
 * unreadable or not a well-formed session is treated as "no session" and cleared,
 * so a corrupted entry cannot wedge the app at startup.
 *
 * The token's expiry is not checked here. It is a 2h JWT, and the API answers 401
 * once it lapses; the response interceptor in http.ts turns that into a sign-out.
 */
export async function loadSession(): Promise<User | null> {
  let raw: string | null;

  try {
    raw = await readRaw();
  } catch {
    return null;
  }

  if (raw == null) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as User).token === "string" &&
      typeof (parsed as User).id === "number" &&
      typeof (parsed as User).role === "string"
    ) {
      return parsed as User;
    }
  } catch {
    return clearSession().then(() => null);
  }

  await clearSession();
  return null;
}

/**
 * Removes the stored session on sign-out or when the API rejects the token.
 */
export async function clearSession(): Promise<void> {
  try {
    await deleteRaw();
  } catch {
    return;
  }
}
