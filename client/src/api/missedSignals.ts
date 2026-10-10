import { http } from "./http";
import type { AlertSeverity } from "./alerts";

/**
 * Something that happened to the elder which the system did not flag (a
 * false negative), recorded by a professional.
 */
export interface MissedSignal {
  id: number;
  profileId: number;
  occurredAt: string;
  severity: AlertSeverity;
  description: string;
  createdAt: string;
  reportedById: number | null;
  reportedBy: { id: number; email: string } | null;
}

export interface MissedSignalInput {
  /** YYYY-MM-DD */
  occurredAt: string;
  severity: AlertSeverity;
  description: string;
}

/**
 * Calls for /perfis/:id/sinais-nao-detectados. Professionals only on the
 * server side.
 */
export async function listMissedSignals(
  profileId: number,
): Promise<MissedSignal[]> {
  const { data } = await http.get<MissedSignal[]>(
    `/perfis/${profileId}/sinais-nao-detectados`,
  );
  return data;
}

export async function createMissedSignal(
  profileId: number,
  input: MissedSignalInput,
): Promise<MissedSignal> {
  const { data } = await http.post<MissedSignal>(
    `/perfis/${profileId}/sinais-nao-detectados`,
    input,
  );
  return data;
}

export async function deleteMissedSignal(
  profileId: number,
  id: number,
): Promise<void> {
  await http.delete(`/perfis/${profileId}/sinais-nao-detectados/${id}`);
}
