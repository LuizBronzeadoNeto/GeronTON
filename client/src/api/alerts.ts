import { http } from "./http";

export type AlertType =
  | "weakened_home_bond"
  | "clinical_warning"
  | "metabolic_decompensation"
  | "sarcopenia_risk";

export type AlertSeverity = "attention" | "critical";

export interface Alert {
  id: number;
  profileId: number;
  checkInId: number | null;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  createdAt: string;
  resolvedAt: string | null;
}

/**
 * An alert in the professional dashboard feed, which carries the elderly
 * person's name for display.
 */
export interface DashboardAlert extends Alert {
  profile: { id: number; firstName: string; lastName: string };
}

/**
 * Alert API calls against the backend's /alertas (professional feed) and
 * /perfis/:id/alertas routes. Each goes through the shared axios instance,
 * which attaches the bearer token.
 */
export async function listDashboardAlerts(): Promise<DashboardAlert[]> {
  const { data } = await http.get<DashboardAlert[]>("/alertas");
  return data;
}

export async function listProfileAlerts(
  profileId: number,
  openOnly = false,
): Promise<Alert[]> {
  const { data } = await http.get<Alert[]>(
    `/perfis/${profileId}/alertas${openOnly ? "?open=true" : ""}`,
  );
  return data;
}

export async function resolveAlert(
  profileId: number,
  alertId: number,
): Promise<Alert> {
  const { data } = await http.put<Alert>(
    `/perfis/${profileId}/alertas/${alertId}`,
    { resolved: true },
  );
  return data;
}
