import { http } from "./http";

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
  return data;
}
