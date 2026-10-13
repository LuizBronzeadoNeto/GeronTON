import { createNavigationContainerRef } from "@react-navigation/native";
import type { AppStackParamList } from "../types/navigation";

/**
 * Lets code outside the screens navigate, which is what a tapped notification
 * needs. A profile opened before the navigator is ready (a cold start from the
 * notification) is remembered and opened once it is.
 */
export const navigationRef = createNavigationContainerRef<AppStackParamList>();

let pendingProfileId: number | null = null;

export function openProfile(profileId: number): void {
  if (navigationRef.isReady()) {
    navigationRef.navigate("ProfileDetail", { profileId });
  } else {
    pendingProfileId = profileId;
  }
}

export function flushPendingNavigation(): void {
  if (pendingProfileId === null || !navigationRef.isReady()) return;
  const profileId = pendingProfileId;
  pendingProfileId = null;
  navigationRef.navigate("ProfileDetail", { profileId });
}
