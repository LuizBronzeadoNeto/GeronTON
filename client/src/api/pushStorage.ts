import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const ENDPOINT_KEY = "geronton.push.endpoint";

/**
 * Remembers which endpoint this device last registered, so the enable card can
 * render its final state on the first frame instead of flashing a button at
 * someone who already granted permission, and so a silent re-registration only
 * hits the network when the endpoint actually rotated.
 *
 * Same platform split as api/session.ts: expo-secure-store has no web
 * implementation, so the browser falls back to localStorage. This value is not
 * a secret — it is a public endpoint URL — but keeping the two storage layers
 * shaped alike is worth more than picking a different mechanism for it.
 */
const isWeb = Platform.OS === "web";

/**
 * All three functions swallow storage failures. The stored endpoint is a cache:
 * losing it costs one redundant registration call, which the server treats as
 * an idempotent upsert, and that is never worth failing an operation over.
 */
export async function readEndpoint(): Promise<string | null> {
  try {
    if (isWeb) {
      return globalThis.localStorage?.getItem(ENDPOINT_KEY) ?? null;
    }
    return await SecureStore.getItemAsync(ENDPOINT_KEY);
  } catch {
    return null;
  }
}

export async function writeEndpoint(endpoint: string): Promise<void> {
  try {
    if (isWeb) {
      globalThis.localStorage?.setItem(ENDPOINT_KEY, endpoint);
      return;
    }
    await SecureStore.setItemAsync(ENDPOINT_KEY, endpoint);
  } catch {
    return;
  }
}

export async function clearEndpoint(): Promise<void> {
  try {
    if (isWeb) {
      globalThis.localStorage?.removeItem(ENDPOINT_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(ENDPOINT_KEY);
  } catch {
    return;
  }
}
