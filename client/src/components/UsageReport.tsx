import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  getUsageReport,
  getUsageReportCsv,
  type UsageMonth,
} from "../api/reports";
import { PrimaryButton } from "./PrimaryButton";
import { shareTextFile } from "../utils/shareFile";
import { COLORS, FONTS } from "../theme";

/** "2026-10" to "10/2026". */
function monthLabel(month: string): string {
  const [year, number] = month.split("-");
  return `${number}/${year}`;
}

const COLUMNS: { key: keyof UsageMonth; label: string }[] = [
  { key: "acessos", label: "Acessos" },
  { key: "usuarios", label: "Usuários" },
  { key: "cuidadores", label: "Cuid." },
  { key: "profissionais", label: "Prof." },
];

/**
 * App usage over the last 6 months, newest first: days of use summed over
 * every account, and how many distinct caregivers and professionals used it.
 * Loads on its own, so a failure here doesn't hide the signal report above.
 */
export function UsageReport() {
  const [months, setMonths] = useState<UsageMonth[] | null>(null);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getUsageReport()
      .then((report) => {
        if (active) setMonths(report.meses);
      })
      .catch(() => {
        if (active) setError("Não foi possível carregar o uso do aplicativo.");
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      const csv = await getUsageReportCsv();
      const today = new Date().toISOString().slice(0, 10);
      await shareTextFile(`relatorio-acessos-${today}.csv`, csv);
    } catch {
      setError("Não foi possível exportar o uso do aplicativo.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <View testID="usage-report" style={styles.section}>
      <Text style={styles.title}>Uso do aplicativo</Text>
      <Text style={styles.note}>
        Acessos somam os dias em que cada conta usou o app. Usuários conta
        pessoas diferentes no mês. Ninguém é identificado.
      </Text>

      {months ? (
        <View style={styles.table}>
          <View style={[styles.row, styles.headerRow]}>
            <Text style={[styles.cell, styles.monthCell, styles.headerText]}>
              Mês
            </Text>
            {COLUMNS.map((column) => (
              <Text key={column.key} style={[styles.cell, styles.headerText]}>
                {column.label}
              </Text>
            ))}
          </View>
          {[...months].reverse().map((month) => (
            <View
              key={month.mes}
              testID={`usage-month-${month.mes}`}
              style={styles.row}
            >
              <Text style={[styles.cell, styles.monthCell]}>
                {monthLabel(month.mes)}
              </Text>
              {COLUMNS.map((column) => (
                <Text key={column.key} style={styles.cell}>
                  {month[column.key]}
                </Text>
              ))}
            </View>
          ))}
        </View>
      ) : null}

      {error ? (
        <Text testID="usage-error" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <PrimaryButton
        testID="usage-export"
        title="Exportar uso (CSV)"
        variant="outline"
        onPress={handleExport}
        loading={exporting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.grey300,
    paddingTop: 16,
    marginTop: 8,
  },
  title: {
    fontFamily: FONTS.extraBold,
    fontSize: 16,
    color: COLORS.heading,
  },
  note: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.grey500,
  },
  table: {
    borderWidth: 1,
    borderColor: COLORS.grey300,
    borderRadius: 8,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.grey300,
  },
  headerRow: {
    borderTopWidth: 0,
    backgroundColor: COLORS.chipBg,
  },
  cell: {
    flex: 1,
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.heading,
    textAlign: "right",
  },
  monthCell: {
    flex: 1.3,
    textAlign: "left",
  },
  headerText: {
    fontSize: 12,
    color: COLORS.grey500,
  },
  error: {
    fontFamily: FONTS.semiBold,
    color: COLORS.danger,
    textAlign: "center",
  },
});
