import { http } from "./http";

export interface SignalReportSummary {
  verdadeirosPositivos: number;
  falsosPositivos: number;
  falsosNegativos: number;
  semAvaliacao: number;
  precisao: number | null;
}

export interface SignalReportRow {
  classificacao: "verdadeiro_positivo" | "falso_positivo" | "falso_negativo";
  perfilId: number;
  tipo: string;
  gravidade: string;
  dataEvento: string;
  dataResolucao: string | null;
  responsavelId: number | null;
  descricao: string;
}

export interface SignalReport {
  summary: SignalReportSummary;
  rows: SignalReportRow[];
}

/** Report of true/false positives and false negatives (GET /relatorios/sinais). */
export async function getSignalReport(): Promise<SignalReport> {
  const { data } = await http.get<SignalReport>("/relatorios/sinais");
  return data;
}

/** The same report as CSV text, ready to save or share. */
export async function getSignalReportCsv(): Promise<string> {
  const { data } = await http.get<string>("/relatorios/sinais", {
    params: { formato: "csv" },
    responseType: "text",
  });
  return data;
}
