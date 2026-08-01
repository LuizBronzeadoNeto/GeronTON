import webpush from "web-push";
import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import type { PushSubscription } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

/** One notification, before it is adapted to a transport. */
export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
  critical?: boolean;
}

interface DispatchOptions {
  excludeUserId?: number;
}

const WEB_PUSH_TTL_SECONDS = 60 * 60;

/**
 * Must match the channel client/src/push/index.ts creates on Android. A message
 * naming a channel the device does not have lands on "Default" at low
 * importance: it arrives, the ticket says "ok", and the phone stays silent.
 */
const ANDROID_CHANNEL_CRITICAL = "intercorrencias-criticas";

const vapidSubject = process.env.VAPID_SUBJECT ?? "";
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY ?? "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY ?? "";

/**
 * Without a VAPID keypair the transport is skipped rather than fatal, so the
 * test suite and a developer who has not generated keys both still work.
 */
const webPushConfigured = Boolean(
  vapidSubject && vapidPublicKey && vapidPrivateKey,
);

if (webPushConfigured) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

/** Needs no server credential: the FCM key lives with the build, on EAS. */
const expo = new Expo();

/**
 * Served to browsers by GET /notificacoes/chave-publica rather than inlined
 * into the web bundle, so rotating the keypair is a restart, not a redeploy.
 */
export function getVapidPublicKey(): string | null {
  return webPushConfigured ? vapidPublicKey : null;
}

/** One-line startup report, called from index.ts beside startOmissionMonitor(). */
export function logPushConfig(): void {
  if (!webPushConfigured) {
    console.warn(
      "push: VAPID_SUBJECT/VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY not set, browser and iOS notifications are disabled",
    );
  }
}

/**
 * Every subscription that should hear about profileId, from ProfileAccess —
 * the sole authorization source, so nobody is notified about an elder they
 * cannot open. Profile.caregiverId is deliberately not consulted.
 *
 * excludeUserId drops whoever raised the notification themselves.
 */
export async function resolveProfileAudience(
  profileId: number,
  excludeUserId?: number,
): Promise<PushSubscription[]> {
  return prisma.pushSubscription.findMany({
    where: {
      user: { access: { some: { profileId } } },
      ...(excludeUserId === undefined
        ? {}
        : { userId: { not: excludeUserId } }),
    },
  });
}

/** Drops endpoints the provider reported as permanently gone. */
async function pruneDeadEndpoints(endpoints: string[]): Promise<void> {
  if (endpoints.length === 0) {
    return;
  }

  try {
    const { count } = await prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: endpoints } },
    });
    if (count > 0) {
      console.log(`push: pruned ${count} dead subscription(s)`);
    }
  } catch (error) {
    console.error("push: failed to prune dead subscriptions", error);
  }
}

/**
 * Only 404 and 410 mean the endpoint will never work again. Everything else,
 * including the 403 you get after rotating VAPID keys, is our problem, not the
 * subscription's — so the row stays.
 */
function isGoneStatus(status: unknown): boolean {
  return status === 404 || status === 410;
}

/** Delivers to browsers and installed iOS web apps. Returns dead endpoints. */
async function sendWebPush(
  subscriptions: PushSubscription[],
  message: PushMessage,
): Promise<string[]> {
  if (!webPushConfigured || subscriptions.length === 0) {
    return [];
  }

  const payload = JSON.stringify({
    title: message.title,
    body: message.body,
    critical: message.critical ?? false,
    data: message.data ?? {},
  });

  const results = await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh ?? "",
              auth: subscription.auth ?? "",
            },
          },
          payload,
          {
            TTL: WEB_PUSH_TTL_SECONDS,
            urgency: message.critical ? "high" : "normal",
          },
        );
        return null;
      } catch (error) {
        const status = (error as { statusCode?: unknown }).statusCode;
        if (isGoneStatus(status)) {
          return subscription.endpoint;
        }
        console.error(`push: web push failed with status ${String(status)}`);
        return null;
      }
    }),
  );

  return results.filter((endpoint): endpoint is string => endpoint !== null);
}

/**
 * Delivers to the Android build through the Expo push service.
 *
 * Pruning here is partial: Expo reports most dead tokens in a receipt fetched
 * fifteen or more minutes later, which this does not collect, so some
 * uninstalled devices linger until they are replaced.
 */
async function sendExpoPush(
  subscriptions: PushSubscription[],
  message: PushMessage,
): Promise<string[]> {
  const valid = subscriptions.filter((sub) =>
    Expo.isExpoPushToken(sub.endpoint),
  );
  const malformed = subscriptions
    .filter((sub) => !Expo.isExpoPushToken(sub.endpoint))
    .map((sub) => sub.endpoint);

  if (valid.length === 0) {
    return malformed;
  }

  const messages: ExpoPushMessage[] = valid.map((sub) => ({
    to: sub.endpoint,
    title: message.title,
    body: message.body,
    data: {
      ...(message.data ?? {}),
      critical: String(message.critical ?? false),
    },
    sound: "default",
    priority: message.critical ? "high" : "normal",
    channelId: ANDROID_CHANNEL_CRITICAL,
  }));

  const dead = [...malformed];

  for (const chunk of expo.chunkPushNotifications(messages)) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);

      tickets.forEach((ticket, index) => {
        if (ticket.status !== "error") {
          return;
        }
        if (ticket.details?.error === "DeviceNotRegistered") {
          dead.push(chunk[index].to as string);
          return;
        }
        console.error(`push: expo ticket error ${ticket.details?.error}`);
      });
    } catch (error) {
      console.error("push: expo chunk failed", error);
    }
  }

  return dead;
}

/** Awaitable form. Request handlers use dispatchProfileNotification instead. */
export async function notifyProfileAudience(
  profileId: number,
  message: PushMessage,
  options: DispatchOptions = {},
): Promise<void> {
  const subscriptions = await resolveProfileAudience(
    profileId,
    options.excludeUserId,
  );
  if (subscriptions.length === 0) {
    return;
  }

  const [webDead, expoDead] = await Promise.all([
    sendWebPush(
      subscriptions.filter((sub) => sub.transport === "webpush"),
      message,
    ),
    sendExpoPush(
      subscriptions.filter((sub) => sub.transport === "expo"),
      message,
    ),
  ]);

  await pruneDeadEndpoints([...webDead, ...expoDead]);
}

/**
 * Fire-and-forget wrapper for request handlers: a push outage must never turn
 * a successful write into a 500 or make the caller wait on a third party.
 */
export function dispatchProfileNotification(
  profileId: number,
  message: PushMessage,
  options: DispatchOptions = {},
): void {
  void notifyProfileAudience(profileId, message, options).catch((error) => {
    console.error("push: dispatch failed", error);
  });
}
