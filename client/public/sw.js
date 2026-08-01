/**
 * GeronTON service worker.
 *
 * Its only job is push: there is no fetch handler and nothing is cached, so a
 * stale worker can never serve a stale app. It is deliberately small, because
 * nothing here is reachable from the test suite — jsdom cannot simulate push
 * delivery — and manual verification only stays credible while the file is
 * simple enough to read in one sitting.
 *
 * It ships in client/public/, which expo export copies verbatim to the bundle
 * root, so it is served from /sw.js and therefore controls the whole origin.
 */

const FOREGROUND_MESSAGE = "geronton-push";

/**
 * Take over immediately instead of waiting for every tab to close. A deployment
 * that left the previous worker in charge would keep delivering with the old
 * payload contract, and the symptom — notifications that arrive but render
 * nothing — is very hard to attribute.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * Reads the payload the server sent, tolerating a push with no body at all:
 * browsers may wake a worker with an empty push, and showing a notification
 * with "undefined" in it is worse than showing a generic one.
 */
function readPayload(event) {
  try {
    return event.data ? event.data.json() : {};
  } catch {
    return {};
  }
}

/**
 * Shows an OS notification, unless a GeronTON window is already open and
 * visible — in that case the app renders its own in-app toast instead, so the
 * same event is not announced twice.
 */
async function deliver(payload) {
  const title = payload.title || "GeronTON";
  const body = payload.body || "";
  const push = {
    title,
    body,
    critical: Boolean(payload.critical),
    data: payload.data || {},
  };

  const clientList = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  const visible = clientList.find(
    (client) => client.visibilityState === "visible",
  );

  if (visible) {
    visible.postMessage({ type: FOREGROUND_MESSAGE, push });
    return;
  }

  await self.registration.showNotification(title, {
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag:
      payload.data && payload.data.profileId
        ? `perfil-${payload.data.profileId}`
        : undefined,
    requireInteraction: Boolean(payload.critical),
    data: push.data,
  });
}

self.addEventListener("push", (event) => {
  event.waitUntil(deliver(readPayload(event)));
});

/**
 * Focuses an open GeronTON window rather than opening a second one. The app has
 * no navigation ref yet, so a tap lands on whatever screen was already showing
 * instead of the elder the notification was about.
 */
async function focusApp() {
  const clientList = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });

  const existing = clientList[0];
  if (existing) {
    await existing.focus();
    return;
  }

  await self.clients.openWindow("/");
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(focusApp());
});
