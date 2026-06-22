import { http } from "./http";

export interface Routine {
  id: number;
  profileId: number;
  title: string;
  period: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export type RoutineInput = Pick<Routine, "title" | "period"> & {
  description?: string | null;
};

/**
 * Routine API calls against the backend's /perfis/:id/rotinas routes.
 */
export async function getRoutine(
  profileId: number,
  routineId: number,
): Promise<Routine> {
  const { data } = await http.get<Routine>(
    `/perfis/${profileId}/rotinas/${routineId}`,
  );
  return data;
}

export async function listRoutines(profileId: number): Promise<Routine[]> {
  const { data } = await http.get<Routine[]>(
    `/perfis/${profileId}/rotinas`,
  );
  return data;
}

export async function createRoutine(
  profileId: number,
  input: RoutineInput,
): Promise<Routine> {
  const { data } = await http.post<Routine>(
    `/perfis/${profileId}/rotinas`,
    input,
  );
  return data;
}

export async function updateRoutine(
  profileId: number,
  routineId: number,
  input: Partial<RoutineInput>,
): Promise<Routine> {
  const { data } = await http.put<Routine>(
    `/perfis/${profileId}/rotinas/${routineId}`,
    input,
  );
  return data;
}

export async function deleteRoutine(
  profileId: number,
  routineId: number,
): Promise<void> {
  await http.delete(`/perfis/${profileId}/rotinas/${routineId}`);
}
