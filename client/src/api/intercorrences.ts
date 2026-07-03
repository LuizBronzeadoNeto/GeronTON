import { http } from "./http";
import { invalidateRiskStatus } from "./risk";

export type EventType =
  | "fall"
  | "fever"
  | "choking"
  | "breathing_difficulties"
  | "bleeding"
  | "confusion"
  | "chest_pain"
  | "other";

export interface Intercorrence {
  id: number;
  profileId: number;
  date: string;
  eventType: EventType;
  isCritical: boolean;
  description: string;
}

export interface IntercorrenceInput {
  eventType: EventType;
  isCritical: boolean;
  description: string;
}

/**
 * Intercorrence (adverse event) API calls against the backend's
 * /perfis/:id/intercorrencias routes. Each goes through the shared axios
 * instance, which attaches the bearer token. Mutations invalidate the
 * profile's cached risk status so badges refresh.
 */
export async function listIntercorrences(
  profileId: number,
): Promise<Intercorrence[]> {
  const { data } = await http.get<Intercorrence[]>(
    `/perfis/${profileId}/intercorrencias`,
  );
  return data;
}

export async function createIntercorrence(
  profileId: number,
  input: IntercorrenceInput,
): Promise<Intercorrence> {
  const { data } = await http.post<Intercorrence>(
    `/perfis/${profileId}/intercorrencias`,
    input,
  );
  invalidateRiskStatus(profileId);
  return data;
}

export async function deleteIntercorrence(
  profileId: number,
  id: number,
): Promise<void> {
  await http.delete(`/perfis/${profileId}/intercorrencias/${id}`);
  invalidateRiskStatus(profileId);
}
