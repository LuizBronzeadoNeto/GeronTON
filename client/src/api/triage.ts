import { http } from "./http";
import type { Profile } from "./profiles";
import type { RiskLevel } from "./risk";

/**
 * A profile in the professional triage dashboard, carrying its computed risk
 * so the panel needs no per-profile risk requests.
 */
export interface TriageEntry extends Profile {
  risk: { status: RiskLevel; score: number; criticalEvents: string[] };
}

/**
 * Fetches the triage dashboard from the backend's professional-only /triagem
 * route: every profile with its risk status, already ordered by clinical
 * priority (high, moderate, low, unknown). Goes through the shared axios
 * instance, which attaches the bearer token.
 */
export async function listTriage(): Promise<TriageEntry[]> {
  const { data } = await http.get<TriageEntry[]>("/triagem");
  return data;
}
