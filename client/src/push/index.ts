import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { registerSubscription, unregisterSubscription } from "../api/push";
import { clearEndpoint, readEndpoint, writeEndpoint } from "../api/pushStorage";
import type {
  ForegroundPush,
  PushPermission,
  PushRegistration,
  PushSupport,
} from "./types";

/**
 * Native half of the push module: the Android build talks to the Expo push
 * service, which forwards to FCM. Metro resolves ../push here everywhere
 * except the web build, which gets index.web.ts instead.
 */

const CHANNEL_CRITICAL = "intercorrencias-criticas";

/**
 * Shows the OS banner only while the app is closed or backgrounded. With the
 * app open the in-app toast stands in for it, so the same event is not
 * announced twice. It still lands in the notification shade, so glancing away
 * at the wrong moment does not lose it.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Android delivers every notification through a channel, and a notification
 * whose channel does not exist lands on "Default" at low importance — it
 * arrives, the send reports success, and the phone stays silent. The channel
 * must therefore exist before the first token is ever issued.
 */
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }

  await Notifications.setNotificationChannelAsync(CHANNEL_CRITICAL, {
    name: "Intercorrências críticas",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#E02D3C",
  });
}

/**
 * A simulator or emulator cannot obtain a push token, so offering the button
 * there would only produce a failure the developer has to decode.
 */
export function getSupport(): PushSupport {
  return Device.isDevice ? "available" : "unsupported";
}

export async function getPermission(): Promise<PushPermission> {
  if (getSupport() !== "available") {
    return "denied";
  }

  const { status, canAskAgain } = await Notifications.getPermissionsAsync();

  if (status === "granted") {
    return "granted";
  }
  return canAskAgain ? "default" : "denied";
}

/**
 * Creates the channel ahead of any permission prompt, matching the web
 * variant's contract of doing the slow work before the gesture.
 */
export async function prepare(): Promise<void> {
  if (getSupport() !== "available") {
    return;
  }

  try {
    await ensureAndroidChannel();
  } catch {
    return;
  }
}

/**
 * The Expo push token identifies this installation. The project id has to be
 * passed explicitly: a standalone build cannot infer it the way the dev client
 * does, and without it token acquisition fails on the device only — long after
 * the build that would have caught it.
 */
async function acquireToken(): Promise<string | null> {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId as
    | string
    | undefined;

  if (!projectId) {
    console.warn("push: no EAS project id in app config, cannot get a token");
    return null;
  }

  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data ?? null;
}

async function register(token: string): Promise<PushRegistration> {
  await registerSubscription({ transport: "expo", token });
  await writeEndpoint(token);
  return { endpoint: token };
}

export async function requestAndRegister(): Promise<PushRegistration | null> {
  if (getSupport() !== "available") {
    return null;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") {
    return null;
  }

  await ensureAndroidChannel();

  const token = await acquireToken();
  return token ? register(token) : null;
}

/**
 * Re-registers when the token has rotated, or when a different person signed in
 * on this device. Skipped entirely when the stored token is still the live one,
 * which is the common case on every app start.
 */
export async function syncExisting(): Promise<PushRegistration | null> {
  if (getSupport() !== "available") {
    return null;
  }

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      return null;
    }

    const token = await acquireToken();
    if (!token) {
      return null;
    }

    const stored = await readEndpoint();
    if (stored === token) {
      return { endpoint: token };
    }

    return await register(token);
  } catch {
    return null;
  }
}

export async function unregister(token?: string): Promise<string | null> {
  const endpoint = await readEndpoint();
  if (!endpoint) {
    return null;
  }

  await clearEndpoint();

  try {
    await unregisterSubscription(endpoint, token);
  } catch {
    return endpoint;
  }

  return endpoint;
}

/**
 * Notifications that arrive while the app is open. The handler above suppresses
 * the OS banner for these, so this is what makes them visible at all.
 */
export function addForegroundListener(
  handler: (push: ForegroundPush) => void,
): () => void {
  const subscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      const { title, body, data } = notification.request.content;

      handler({
        title: title ?? "GeronTON",
        body: body ?? "",
        critical: data?.critical === true || data?.critical === "true",
        data: (data ?? {}) as Record<string, string>,
      });
    },
  );

  return () => subscription.remove();
}
