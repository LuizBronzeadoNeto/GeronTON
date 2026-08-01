import { http } from "./http";

export interface WebPushSubscriptionInput {
  transport: "webpush";
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface ExpoSubscriptionInput {
  transport: "expo";
  token: string;
}

export type PushSubscriptionInput =
  | WebPushSubscriptionInput
  | ExpoSubscriptionInput;

/**
 * The VAPID public key browsers must pass to PushManager.subscribe, or null
 * when this deployment has no web push keys configured. Served by the API
 * rather than inlined into the bundle so rotating the keypair does not require
 * re-exporting the client.
 */
export async function getVapidPublicKey(): Promise<string | null> {
  const { data } = await http.get<{ publicKey: string | null }>(
    "/notificacoes/chave-publica",
  );
  return data.publicKey;
}

/** Registers this device. Idempotent on the server, keyed by endpoint. */
export async function registerSubscription(
  input: PushSubscriptionInput,
): Promise<void> {
  await http.post("/notificacoes/inscricoes", input);
}

/**
 * Stops pushes to this device.
 *
 * token is passed explicitly because the only caller is sign-out, which
 * clears the module-level auth token synchronously before this request leaves.
 * Without it the request would go out unauthenticated, and the 401 interceptor
 * in http.ts would call signOut again.
 */
export async function unregisterSubscription(
  endpoint: string,
  token?: string,
): Promise<void> {
  await http.delete("/notificacoes/inscricoes", {
    data: { endpoint },
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
  });
}
