/**
 * The contract both platform variants of the push module implement.
 *
 * index.ts drives expo-notifications and the Expo push service; index.web.ts
 * drives a service worker and the standard VAPID web push API. They share no
 * code at all, which is why this is the first *.web.ts file in the repo rather
 * than a runtime Platform.OS branch like api/session.ts uses: a single file
 * would pull expo-notifications into the browser bundle for a branch that never
 * runs there.
 *
 * TypeScript resolves ./ to index.ts, so index.web.ts is never reached
 * through an importer and would otherwise drift from this interface unnoticed.
 * index.web.test.ts imports it by its explicit filename and assigns the
 * namespace to PushModule, which is what puts the web variant back under the
 * compiler.
 */

export type PushSupport =
  /** No push API on this platform or browser at all. */
  | "unsupported"
  /** iOS Safari: web push exists only once the app is on the Home Screen. */
  | "needs-install"
  | "available";

export type PushPermission = "default" | "granted" | "denied";

export interface PushRegistration {
  /** The Expo push token, or the web push endpoint URL. */
  endpoint: string;
}

/** A push that arrived while the app was open and visible. */
export interface ForegroundPush {
  title: string;
  body: string;
  critical: boolean;
  data: Record<string, string>;
}

export interface PushModule {
  getSupport(): PushSupport;
  getPermission(): Promise<PushPermission>;
  /**
   * Prompts for permission and registers the device, returning null when the
   * user declines. The platform permission call must happen before this
   * function's first await: iOS treats the user-gesture token as spent once
   * control returns to the event loop, and silently refuses the prompt.
   */
  requestAndRegister(): Promise<PushRegistration | null>;
  /** Re-registers silently when permission is already granted and the endpoint rotated. */
  syncExisting(): Promise<PushRegistration | null>;
  /** Drops this device's registration. Returns the endpoint that was removed. */
  unregister(token?: string): Promise<string | null>;
  addForegroundListener(handler: (push: ForegroundPush) => void): () => void;
  /**
   * Warms whatever requestAndRegister would otherwise have to await. Called
   * once a session exists, so the gesture path can prompt immediately.
   */
  prepare(): Promise<void>;
}
