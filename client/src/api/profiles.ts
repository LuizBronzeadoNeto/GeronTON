import { http } from "./http";
import type { Alert } from "./alerts";
import type { CheckIn } from "./checkins";

export interface Profile {
  id: number;
  firstName: string;
  lastName: string;
  birthDate: string;
  sex: string | null;
  scholarship: string;
  medicalConditions: string[];
  notes: string | null;
  caregiverId: number;
}

export interface ProfileInput {
  firstName: string;
  lastName: string;
  birthDate: string;
  sex: string | null;
  scholarship: string;
  medicalConditions: string[];
  notes: string | null;
}

/**
 * Elderly-profile API calls against the backend's /perfis routes. Each goes
 * through the shared axios instance, which attaches the bearer token.
 */
export async function listProfiles(): Promise<Profile[]> {
  const { data } = await http.get<Profile[]>("/perfis");
  return data;
}

export async function getProfile(id: number): Promise<Profile> {
  const { data } = await http.get<Profile>(`/perfis/${id}`);
  return data;
}

/**
 * The elder's detail view in a single response: the profile, its latest weekly
 * check-in (null when none was recorded yet) and its open alerts.
 */
export interface ProfileDetails {
  profile: Profile;
  latestCheckIn: CheckIn | null;
  alerts: Alert[];
}

export async function getProfileDetails(id: number): Promise<ProfileDetails> {
  const { data } = await http.get<ProfileDetails>(`/perfis/${id}/detalhes`);
  return data;
}

export async function createProfile(input: ProfileInput): Promise<Profile> {
  const { data } = await http.post<Profile>("/perfis", input);
  return data;
}

export async function updateProfile(
  id: number,
  input: Partial<ProfileInput>,
): Promise<Profile> {
  const { data } = await http.put<Profile>(`/perfis/${id}`, input);
  return data;
}
