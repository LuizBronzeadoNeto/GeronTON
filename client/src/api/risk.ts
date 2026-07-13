import { http } from "./http";

export type RiskLevel = "low" | "moderate" | "high" | "unknown";

export interface RiskStatus {
  profileId: number;
  status: RiskLevel;
  score: number;
  criticalEvents: string[];
  evaluatedAt: string;
}

type InvalidationListener = (profileId?: number) => void;

const CACHE_TTL_MS = 60_000;

const cache = new Map<number, { value: RiskStatus; fetchedAt: number }>();
const listeners = new Set<InvalidationListener>();

/**
 * Fetches a profile's risk status from /perfis/:id/risco with a simple
 * module-level cache: a fresh result (younger than one minute) is reused so the
 * badge can appear on many screens without refetching on every render.
 */
export async function getRiskStatus(profileId: number): Promise<RiskStatus> {
  const cached = cache.get(profileId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.value;
  }

  const { data } = await http.get<RiskStatus>(`/perfis/${profileId}/risco`);
  cache.set(profileId, { value: data, fetchedAt: Date.now() });
  return data;
}

/**
 * Drops the cached status for one profile (or all of them when no id is given)
 * and notifies subscribers so mounted badges refetch. Called by the API modules
 * whose mutations change the underlying data, e.g. check-ins.
 */
export function invalidateRiskStatus(profileId?: number): void {
  if (profileId === undefined) {
    cache.clear();
  } else {
    cache.delete(profileId);
  }
  listeners.forEach((listener) => listener(profileId));
}

/**
 * Registers a listener for cache invalidations and returns the corresponding
 * unsubscribe function. The listener receives the invalidated profile id, or
 * undefined when the whole cache was cleared.
 */
export function subscribeRiskStatusInvalidation(
  listener: InvalidationListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
