import { http } from "./http";

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

export async function deleteProfile(id: number): Promise<void> {
  await http.delete(`/perfis/${id}`);
}
