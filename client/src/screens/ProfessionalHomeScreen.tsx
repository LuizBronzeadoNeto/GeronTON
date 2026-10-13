import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../types/navigation";
import type { RiskLevel } from "../api/risk";
import { listTriage, type TriageEntry } from "../api/triage";
import { RISK_LEVEL_ORDER, RISK_LEVELS } from "../constants/risk";
import { listDashboardAlerts, type DashboardAlert } from "../api/alerts";
import { ProfileCard } from "../components/ProfileCard";
import { AlertCard } from "../components/AlertCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { EnableNotificationsCard } from "../components/EnableNotificationsCard";
import { RiskLegend } from "../components/RiskLegend";
import { AdherenceSummary } from "../components/AdherenceSummary";
import { COLORS, FONTS } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "Home">;

/**
 * "Painel de triagem" — the professional's home from the Figma design: every
 * elderly profile as a card with avatar, name, risk pill, age and last
 * check-in, ordered by the backend's /triagem endpoint (critical profiles
 * first, then attention, stable and the ones without data) and colored by
 * clinical priority via the risk engine. The
 * unresolved alerts raised by the monitoring system (weakened home bond,
 * vital-sign warnings) appear above the cards, each opening the elder's detail
 * hub where it can be resolved. The header action registers a new profile.
 *
 * Above the list sits the weekly adherence summary (how many elders had a
 * check-in in the last 7 days, and the average over 8 weeks), plus the link
 * to the false positive / false negative report.
 */
export function ProfessionalHomeScreen({ navigation }: Props) {
  const [profiles, setProfiles] = useState<TriageEntry[]>([]);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [filter, setFilter] = useState<RiskLevel | "all">("all");

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setError(null);
      setAlertsError(null);
      listTriage()
        .then((data) => {
          if (active) setProfiles(data);
        })
        .catch(() => {
          if (active) setError("Não foi possível carregar os idosos.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      listDashboardAlerts()
        .then((data) => {
          if (active) setAlerts(data);
        })
        .catch(() => {
          if (active) setAlertsError("Não foi possível carregar os sinais.");
        });
      return () => {
        active = false;
      };
    }, []),
  );

  const alertsPanel =
    alerts.length > 0 || alertsError ? (
      <View testID="professional-alerts" style={styles.alertsPanel}>
        <Text style={styles.alertsTitle} accessibilityRole="header">
          Sinais para contato
        </Text>
        {alertsError ? (
          <Text testID="professional-alerts-error" style={styles.error}>
            {alertsError}
          </Text>
        ) : null}
        {alerts.map((alert) => (
          <AlertCard
            key={alert.id}
            testID={`professional-alert-${alert.id}`}
            alert={alert}
            subtitle={`${alert.profile.firstName} ${alert.profile.lastName}`}
            onPress={() =>
              navigation.navigate("ProfileDetail", {
                profileId: alert.profileId,
              })
            }
          />
        ))}
      </View>
    ) : null;

  const visible =
    filter === "all"
      ? profiles
      : profiles.filter((entry) => entry.risk.status === filter);

  const filters =
    profiles.length > 0 ? (
      <View
        style={styles.filters}
        accessibilityRole="radiogroup"
        accessibilityLabel="Filtrar por situação"
      >
        {(["all", ...RISK_LEVEL_ORDER] as const).map((key) => {
          const count =
            key === "all"
              ? profiles.length
              : profiles.filter((entry) => entry.risk.status === key).length;
          const selected = filter === key;
          return (
            <Pressable
              key={key}
              testID={`professional-filter-${key}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              style={[styles.filterChip, selected && styles.filterChipSelected]}
              onPress={() => setFilter(key)}
            >
              <Text
                style={[
                  styles.filterLabel,
                  selected && styles.filterLabelSelected,
                ]}
              >
                {key === "all" ? "Todos" : RISK_LEVELS[key].label} ({count})
              </Text>
            </Pressable>
          );
        })}
      </View>
    ) : null;

  return (
    <View testID="professional-home" style={styles.container}>
      <Text style={styles.description}>
        Idosos sob seu acompanhamento. Quem precisa de contato primeiro aparece
        no topo.
      </Text>

      {/* Outside the FlatList's header: inside it the card would scroll away
          with the list, and it is a one-time action, not list content. */}
      <EnableNotificationsCard />

      <View style={styles.actionsRow}>
        <PrimaryButton
          testID="professional-report"
          title="Relatório de sinais"
          size="small"
          variant="outline"
          onPress={() => navigation.navigate("SignalReport")}
        />
        <PrimaryButton
          testID="professional-add"
          title="+ Cadastrar idoso"
          size="small"
          onPress={() => navigation.navigate("ProfileIdentification")}
        />
      </View>

      {loading ? (
        <ActivityIndicator
          testID="professional-loading"
          color={COLORS.primary}
        />
      ) : null}
      {error ? (
        <Text testID="professional-error" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <FlatList
        data={visible}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {loading || profiles.length === 0 ? null : (
              <AdherenceSummary entries={profiles} />
            )}
            {filters}
            {alertsPanel}
          </>
        }
        ListFooterComponent={loading ? null : <RiskLegend />}
        ListFooterComponentStyle={styles.legendFooter}
        ListEmptyComponent={
          loading ? null : (
            <Text testID="professional-empty" style={styles.empty}>
              {filter === "all"
                ? "Nenhum idoso vinculado ainda"
                : "Nenhum idoso nesta situação."}
            </Text>
          )
        }
        renderItem={({ item }) => (
          <ProfileCard
            profile={item}
            testIDPrefix="professional"
            riskStatus={item.risk.status}
            lastCheckInAt={item.lastCheckInAt}
            criticalEvents={item.risk.criticalEvents}
            adherence={item.adherence}
            onOpen={() =>
              navigation.navigate("ProfileDetail", { profileId: item.id })
            }
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.grey300,
  },
  filterChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.heading,
  },
  filterLabelSelected: {
    color: COLORS.white,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingHorizontal: 13,
    paddingTop: 8,
    gap: 16,
  },
  description: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.grey500,
    paddingHorizontal: 8,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  alertsPanel: {
    gap: 8,
    marginBottom: 12,
  },
  alertsTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 16,
    color: COLORS.heading,
  },
  listContent: {
    gap: 12,
    paddingBottom: 24,
  },
  legendFooter: {
    marginTop: 12,
  },
  empty: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.primary,
    textAlign: "center",
    marginTop: 24,
  },
  error: {
    fontFamily: FONTS.semiBold,
    color: COLORS.danger,
    textAlign: "center",
  },
});
