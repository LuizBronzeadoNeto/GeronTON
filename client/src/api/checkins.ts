import { http } from "./http";
import { invalidateRiskStatus } from "./risk";

export interface CheckIn {
  id: number;
  profileId: number;
  date: string;
  falls: number;
  weightLoss: number;
  choking: boolean;
  gaitImpairment: boolean;
  violenceSign: boolean;
  irregularSleep: boolean;
  socialIsolation: boolean;
  failedComms: boolean;
  memoryLoss: boolean;
}

export type CheckInInput = Omit<CheckIn, "id" | "profileId" | "date">;

/**
 * Weekly check-in API calls against the backend's /perfis/:id/avaliacoes routes.
 * Each goes through the shared axios instance, which attaches the bearer token.
 */
export async function listCheckIns(profileId: number): Promise<CheckIn[]> {
  const { data } = await http.get<CheckIn[]>(`/perfis/${profileId}/avaliacoes`);
  return data;
}

export async function createCheckIn(
  profileId: number,
  input: CheckInInput,
): Promise<CheckIn> {
  const { data } = await http.post<CheckIn>(
    `/perfis/${profileId}/avaliacoes`,
    input,
  );
  invalidateRiskStatus(profileId);
  return data;
}

export async function getCheckIn(
  profileId: number,
  id: number,
): Promise<CheckIn> {
  const { data } = await http.get<CheckIn>(
    `/perfis/${profileId}/avaliacoes/${id}`,
  );
  return data;
}

export async function updateCheckIn(
  profileId: number,
  id: number,
  input: CheckInInput,
): Promise<CheckIn> {
  const { data } = await http.put<CheckIn>(
    `/perfis/${profileId}/avaliacoes/${id}`,
    input,
  );
  invalidateRiskStatus(profileId);
  return data;
}

export async function deleteCheckIn(
  profileId: number,
  id: number,
): Promise<void> {
  await http.delete(`/perfis/${profileId}/avaliacoes/${id}`);
  invalidateRiskStatus(profileId);
}
