import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { Appetite, Mood } from "../api/checkins";

/**
 * A weekly check-in in progress. It is saved on every answer so it survives
 * leaving the screen, the app being closed and the 2h session expiring
 * mid-form. Kept in secure storage like the session, since it is health data.
 */
export interface CheckInDraft {
  step: number;
  shortForm: boolean;
  yesNo: Record<string, boolean | null>;
  events: string[];
  texts: Record<string, string>;
  lists: Record<string, string[]>;
  appetite: Appetite | null;
  mood: Mood | null;
  stressLevel: number;
}

/** A draft older than a week belongs to a past week's check-in. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const isWeb = Platform.OS === "web";

function keyFor(userId: number, profileId: number): string {
  return `geronton.checkin-draft.${userId}.${profileId}`;
}

async function read(key: string): Promise<string | null> {
  if (isWeb) return globalThis.localStorage?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
}

export async function loadDraft(
  userId: number,
  profileId: number,
): Promise<CheckInDraft | null> {
  try {
    const raw = await read(keyFor(userId, profileId));
    if (!raw) return null;
    const { savedAt, draft } = JSON.parse(raw) as {
      savedAt: number;
      draft: CheckInDraft;
    };
    return Date.now() - savedAt > MAX_AGE_MS ? null : draft;
  } catch {
    return null;
  }
}

export async function saveDraft(
  userId: number,
  profileId: number,
  draft: CheckInDraft,
  savedAt = Date.now(),
): Promise<void> {
  const key = keyFor(userId, profileId);
  const value = JSON.stringify({ savedAt, draft });
  try {
    if (isWeb) globalThis.localStorage?.setItem(key, value);
    else await SecureStore.setItemAsync(key, value);
  } catch {
    return;
  }
}

export async function clearDraft(
  userId: number,
  profileId: number,
): Promise<void> {
  const key = keyFor(userId, profileId);
  try {
    if (isWeb) globalThis.localStorage?.removeItem(key);
    else await SecureStore.deleteItemAsync(key);
  } catch {
    return;
  }
}
