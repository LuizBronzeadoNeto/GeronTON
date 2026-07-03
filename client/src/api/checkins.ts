import { http } from "./http";
import { invalidateRiskStatus } from "./risk";

export type Appetite = "good" | "regular" | "bad";
export type Mood = "very_happy" | "happy" | "neutral" | "sad" | "very_sad";

export interface CheckIn {
  id: number;
  profileId: number;
  date: string;
  skinIssues: boolean;
  bowelRegular: boolean;
  sleepWell: boolean;
  unstableGait: boolean;
  weeklyEvents: string[];
  otherEvent: string | null;
  pressure: string | null;
  saturation: string | null;
  glycemia: string | null;
  calfCircumference: string | null;
  appetite: Appetite;
  chokingIncident: boolean;
  chokingFrequency: string | null;
  breathShortness: boolean;
  hydrationGoal: boolean;
  medsOnTime: boolean;
  mood: Mood;
  stressLevel: number;
  sunExposure: boolean;
  selfExpression: boolean;
  stimulation: boolean;
  dailyBath: boolean;
  oralHygiene: boolean;
  groomedNails: boolean;
  needsMedications: string | null;
  needsHygiene: string | null;
  needsFood: string | null;
}

export type CheckInInput = Omit<CheckIn, "id" | "profileId" | "date">;

/**
 * Weekly check-in API calls against the backend's /perfis/:id/avaliacoes routes.
 * Each goes through the shared axios instance, which attaches the bearer token.
 * Mutations invalidate the profile's cached risk status so badges refresh.
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

export async function deleteCheckIn(
  profileId: number,
  id: number,
): Promise<void> {
  await http.delete(`/perfis/${profileId}/avaliacoes/${id}`);
  invalidateRiskStatus(profileId);
}
