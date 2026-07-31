import { http } from "./http";
import type { Alert } from "./alerts";
import type { CheckIn } from "./checkins";

export interface Profile {
  id: number;
  cpf: string | null;
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
  cpf: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  sex: string | null;
  scholarship: string;
  medicalConditions: string[];
  notes: string | null;
}

/**
 * Outcome of checking a CPF before registering an elder: unknown to the system,
 * already registered and confirmed by the birth date, or already registered
 * with a birth date that does not match.
 */
export type IdentityStatus = "novo" | "encontrado" | "nao_confere";

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

/**
 * First step of registering an elder: asks whether the CPF already belongs to
 * someone in the system, and whether the birth date confirms it. The response
 * carries only the status — never the elder's name or id — so a CPF alone can
 * never be used to look someone up.
 */
export async function verifyProfileCpf(
  cpf: string,
  birthDate: string,
): Promise<IdentityStatus> {
  const { data } = await http.post<{ status: IdentityStatus }>(
    "/perfis/verificar",
    { cpf, birthDate },
  );
  return data.status;
}

/**
 * Binds the signed-in user to an elder already registered by someone else. The
 * backend re-checks the CPF and birth date, so this cannot be called with only
 * one of the two.
 */
export async function linkProfile(
  cpf: string,
  birthDate: string,
): Promise<Profile> {
  const { data } = await http.post<Profile>("/perfis/vincular", {
    cpf,
    birthDate,
  });
  return data;
}
