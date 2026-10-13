import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { openProfile } from "../navigation/navigationRef";
import {
  addForegroundListener,
  addOpenListener,
  prepare,
  syncExisting,
} from "./";

/**
 * The elder a push is about, from its data, or null when it names none.
 */
function profileIdFrom(data: Record<string, string>): number | null {
  const id = Number(data.profileId);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * Keeps this device's push registration in step with the session, and turns a
 * push that arrives while the app is open into the in-app toast.
 *
 * It hangs off user rather than off the sign-in call because a restored
 * session is just as much a signed-in device as a fresh login, and only the
 * navigator sees both. Re-registering on every session start is what handles
 * endpoints rotating and a second person signing in on the same device; the
 * server upserts by endpoint, so a redundant call costs nothing.
 *
 * prepare() runs first and deliberately early: on iOS the permission prompt has
 * to be requested before any await inside the press handler, which is only
 * possible if the VAPID key and service worker are already in place by then.
 */
export function usePushSync(): void {
  const { user } = useAuth();
  const { notify } = useNotification();

  useEffect(() => {
    if (!user) {
      return;
    }

    let active = true;

    void (async () => {
      await prepare();
      if (active) {
        await syncExisting();
      }
    })();

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    return addForegroundListener((push) => {
      const profileId = profileIdFrom(push.data);
      notify({
        title: push.title,
        message: push.body,
        critical: push.critical,
        onPress: profileId ? () => openProfile(profileId) : undefined,
      });
    });
  }, [user, notify]);

  useEffect(() => {
    if (!user) {
      return;
    }

    return addOpenListener((data) => {
      const profileId = profileIdFrom(data);
      if (profileId) openProfile(profileId);
    });
  }, [user]);
}
