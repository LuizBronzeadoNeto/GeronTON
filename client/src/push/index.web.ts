import {
  getVapidPublicKey,
  registerSubscription,
  unregisterSubscription,
} from "../api/push";
import { clearEndpoint, readEndpoint, writeEndpoint } from "../api/pushStorage";
import type {
  ForegroundPush,
  PushPermission,
  PushRegistration,
  PushSupport,
} from "./types";

const SERVICE_WORKER_URL = "/sw.js";
const FOREGROUND_MESSAGE = "geronton-push";

/**
 * Both are memoised for the lifetime of the page. The key is fetched once so
 * the permission prompt never has to wait on the network, and the registration
 * promise is shared because subscribing and reading an existing subscription
 * need the same object. A key rotated on the server is therefore not picked up
 * until a reload, which is harmless: rotating invalidates every existing
 * subscription anyway.
 */
let cachedVapidKey: string | null = null;
let registrationPromise: Promise<ServiceWorkerRegistration> | null = null;

/**
 * Whether push can work here at all.
 *
 * On iOS this is the whole test: Safari exposes PushManager and Notification
 * only inside a web app installed to the Home Screen, and leaves them undefined
 * in a normal tab. The iOS branch below exists purely so that case can be told
 * apart from a browser that will never support push, and answered with
 * instructions instead of a dead end.
 */
export function getSupport(): PushSupport {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return "unsupported";
  }
  if (
    "PushManager" in window &&
    "serviceWorker" in navigator &&
    "Notification" in window
  ) {
    return "available";
  }
  if (isIosLike() && !isStandalone()) {
    return "needs-install";
  }
  return "unsupported";
}

function isIosLike(): boolean {
  const agent = navigator.userAgent ?? "";
  const isIpadOnDesktopSafari =
    agent.includes("Macintosh") && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/.test(agent) || isIpadOnDesktopSafari;
}

function isStandalone(): boolean {
  const legacyStandalone = (navigator as { standalone?: boolean }).standalone;
  return (
    legacyStandalone === true ||
    window.matchMedia?.("(display-mode: standalone)").matches === true
  );
}

export async function getPermission(): Promise<PushPermission> {
  if (getSupport() !== "available") {
    return "denied";
  }
  return Notification.permission as PushPermission;
}

/**
 * Registers the worker once per page load and reuses the promise. Both
 * subscribing and reading an existing subscription need the same registration
 * object, and registering twice would race.
 */
function ensureServiceWorker(): Promise<ServiceWorkerRegistration> {
  registrationPromise ??= navigator.serviceWorker.register(SERVICE_WORKER_URL);
  return registrationPromise;
}

/**
 * Fetches everything requestAndRegister would otherwise have to await, so the
 * press handler can call Notification.requestPermission() before yielding. On
 * iOS the user-gesture token is spent the moment control returns to the event
 * loop, and a prompt requested after an await is refused without any error.
 *
 * Failures are swallowed: this runs on every sign-in, and a server that is
 * momentarily unreachable should not surface anything. requestAndRegister
 * fetches the key itself if this left it null.
 */
export async function prepare(): Promise<void> {
  if (getSupport() !== "available") {
    return;
  }

  try {
    void ensureServiceWorker();
    cachedVapidKey ??= await getVapidPublicKey();
  } catch {
    return;
  }
}

/**
 * The VAPID public key arrives as base64url text and PushManager wants raw
 * bytes. Returns the ArrayBuffer rather than the view over it: applicationServerKey
 * accepts either, and the buffer avoids TypeScript's distinction between a
 * Uint8Array backed by an ArrayBuffer and one backed by a SharedArrayBuffer.
 */
function urlBase64ToBytes(base64: string): ArrayBuffer {
  const padded = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    "=",
  );
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return buffer;
}

/**
 * Turns a browser subscription into the payload the API stores. p256dh and auth
 * are the encryption keys the server needs to seal a message for this device;
 * without both, the subscription is useless and is treated as a failure.
 */
function toInput(subscription: PushSubscription) {
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;

  if (!json.endpoint || !p256dh || !auth) {
    return null;
  }

  return {
    transport: "webpush" as const,
    endpoint: json.endpoint,
    keys: { p256dh, auth },
  };
}

async function subscribe(): Promise<PushRegistration | null> {
  cachedVapidKey ??= await getVapidPublicKey();
  if (!cachedVapidKey) {
    return null;
  }

  const registration = await ensureServiceWorker();
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToBytes(cachedVapidKey),
    }));

  const input = toInput(subscription);
  if (!input) {
    return null;
  }

  await registerSubscription(input);
  await writeEndpoint(input.endpoint);
  return { endpoint: input.endpoint };
}

/**
 * Prompts for permission and registers the device. Must be called from a press
 * handler: Notification.requestPermission() is deliberately the first statement,
 * before any await, so the browser still sees a live user gesture.
 */
export async function requestAndRegister(): Promise<PushRegistration | null> {
  if (getSupport() !== "available") {
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return null;
  }

  return subscribe();
}

/**
 * Re-registers this device when it is already permitted but the server may not
 * know its current endpoint: browsers rotate endpoints, and a second person
 * signing in on the same browser must take the device over. Skips the request
 * when the live endpoint is the one already stored, which is the common case.
 */
export async function syncExisting(): Promise<PushRegistration | null> {
  if (getSupport() !== "available" || Notification.permission !== "granted") {
    return null;
  }

  try {
    const registration = await ensureServiceWorker();
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      return null;
    }

    const stored = await readEndpoint();
    if (stored === subscription.endpoint) {
      return { endpoint: stored };
    }

    const input = toInput(subscription);
    if (!input) {
      return null;
    }

    await registerSubscription(input);
    await writeEndpoint(input.endpoint);
    return { endpoint: input.endpoint };
  } catch {
    return null;
  }
}

/**
 * Tells the server to stop pushing to this browser. The local subscription is
 * kept so re-enabling does not need a second permission prompt; only the
 * server-side row and the cached endpoint go.
 */
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
 * Receives pushes that arrived while a window was open and visible. The worker
 * forwards those instead of showing an OS banner, so the app can render them as
 * an in-app toast and the same event is not announced twice.
 */
export function addForegroundListener(
  handler: (push: ForegroundPush) => void,
): () => void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return () => {};
  }

  const listener = (event: MessageEvent) => {
    const message = event.data as
      | { type?: string; push?: ForegroundPush }
      | undefined;

    if (message?.type === FOREGROUND_MESSAGE && message.push) {
      handler(message.push);
    }
  };

  navigator.serviceWorker.addEventListener("message", listener);
  return () => {
    navigator.serviceWorker.removeEventListener("message", listener);
  };
}
