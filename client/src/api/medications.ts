import { http } from "./http";

export interface Medication {
  id: number;
  profileId: number;
  name: string;
  dosage: string;
  frequency: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MedicationInput = Pick<
  Medication,
  "name" | "dosage" | "frequency"
> & {
  notes?: string | null;
};

/**
 * Medication API calls against the backend's /perfis/:id/medicamentos routes.
 */
export async function getMedication(
  profileId: number,
  medicationId: number,
): Promise<Medication> {
  const { data } = await http.get<Medication>(
    `/perfis/${profileId}/medicamentos/${medicationId}`,
  );
  return data;
}

export async function listMedications(
  profileId: number,
): Promise<Medication[]> {
  const { data } = await http.get<Medication[]>(
    `/perfis/${profileId}/medicamentos`,
  );
  return data;
}

export async function createMedication(
  profileId: number,
  input: MedicationInput,
): Promise<Medication> {
  const { data } = await http.post<Medication>(
    `/perfis/${profileId}/medicamentos`,
    input,
  );
  return data;
}

export async function updateMedication(
  profileId: number,
  medicationId: number,
  input: Partial<MedicationInput>,
): Promise<Medication> {
  const { data } = await http.put<Medication>(
    `/perfis/${profileId}/medicamentos/${medicationId}`,
    input,
  );
  return data;
}

export async function deleteMedication(
  profileId: number,
  medicationId: number,
): Promise<void> {
  await http.delete(`/perfis/${profileId}/medicamentos/${medicationId}`);
}
