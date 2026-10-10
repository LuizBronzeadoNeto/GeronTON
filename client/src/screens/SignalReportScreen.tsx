import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../types/navigation";
import {
  getSignalReport,
  getSignalReportCsv,
  type SignalReportSummary,
} from "../api/reports";
import { PrimaryButton } from "../components/PrimaryButton";
import { shareTextFile } from "../utils/shareFile";
import { COLORS, FONTS } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "SignalReport">;

interface TileProps {
  testID: string;
  label: string;
  value: string;
  hint: string;
}

function Tile({ testID, label, value, hint }: TileProps) {
  return (
    <View testID={testID} style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileHint}>{hint}</Text>
    </View>
  );
}

/**
 * Validation report for the professional: how many signals held up after
 * contact (true positives), how many didn't (false positives) and how many
 * events the system missed (false negatives), across the elders they follow.
 * The export button hands over the full list as a CSV for the research team.
 */
export function SignalReportScreen(_props: Props) {
  const [summary, setSummary] = useState<SignalReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setError(null);
      getSignalReport()
        .then((report) => {
          if (active) setSummary(report.summary);
        })
        .catch(() => {
          if (active) setError("Não foi possível carregar o relatório.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, []),
  );

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      const csv = await getSignalReportCsv();
      const today = new Date().toISOString().slice(0, 10);
      await shareTextFile(`relatorio-sinais-${today}.csv`, csv);
    } catch {
      setError("Não foi possível exportar o relatório.");
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <ActivityIndicator
        testID="report-loading"
        color={COLORS.primary}
        style={styles.loading}
      />
    );
  }

  const precision =
    summary?.precisao == null ? "-" : `${Math.round(summary.precisao * 100)}%`;

  return (
    <ScrollView testID="report" contentContainerStyle={styles.container}>
      <Text style={styles.description}>
        Compara os sinais que o sistema deu com o que a equipe encontrou depois
        do contato com a família.
      </Text>

      {summary ? (
        <View style={styles.grid}>
          <Tile
            testID="report-true-positives"
            label="Procediam"
            value={String(summary.verdadeirosPositivos)}
            hint="Sinais confirmados após o contato"
          />
          <Tile
            testID="report-false-positives"
            label="Não procediam"
            value={String(summary.falsosPositivos)}
            hint="Falsos positivos"
          />
          <Tile
            testID="report-false-negatives"
            label="Não detectados"
            value={String(summary.falsosNegativos)}
            hint="Falsos negativos"
          />
          <Tile
            testID="report-precision"
            label="Acerto dos sinais"
            value={precision}
            hint="Procediam / sinais avaliados"
          />
        </View>
      ) : null}

      {summary && summary.semAvaliacao > 0 ? (
        <Text testID="report-unjudged" style={styles.note}>
          {summary.semAvaliacao} sinal(is) ainda sem avaliação (em aberto ou
          encerrados automaticamente) não entram na conta.
        </Text>
      ) : null}

      {error ? (
        <Text testID="report-error" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <PrimaryButton
        testID="report-export"
        title="Exportar planilha (CSV)"
        onPress={handleExport}
        loading={exporting}
      />
      <Text style={styles.note}>
        A planilha identifica os idosos só pelo número do cadastro, sem nome.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 12,
    backgroundColor: COLORS.white,
  },
  loading: {
    flex: 1,
  },
  description: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.grey500,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  tile: {
    flexBasis: "47%",
    flexGrow: 1,
    borderWidth: 1,
    borderColor: COLORS.grey300,
    borderRadius: 12,
    padding: 14,
    gap: 2,
  },
  tileValue: {
    fontFamily: FONTS.extraBold,
    fontSize: 26,
    color: COLORS.heading,
  },
  tileLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.heading,
  },
  tileHint: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.grey500,
  },
  note: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.grey500,
  },
  error: {
    fontFamily: FONTS.semiBold,
    color: COLORS.danger,
    textAlign: "center",
  },
});
