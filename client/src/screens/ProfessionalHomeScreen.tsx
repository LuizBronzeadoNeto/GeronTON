import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
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
import { Section } from "../components/Section";
import { COLORS, RADIUS, SPACING, TYPE } from "../theme";

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

  const visible =
    filter === "all"
      ? profiles
      : profiles.filter((entry) => entry.risk.status === filter);

  return (
    <ScrollView
      testID="professional-home"
      style={styles.screen}
      contentContainerStyle={styles.container}
    >
      <View style={styles.intro}>
        <Text style={styles.description}>
          Idosos sob seu acompanhamento. Quem precisa de contato primeiro
          aparece no topo.
        </Text>
        <View style={styles.actionsRow}>
          <PrimaryButton
            testID="professional-add"
            title="Cadastrar idoso"
            style={styles.action}
            onPress={() => navigation.navigate("ProfileIdentification")}
          />
          <PrimaryButton
            testID="professional-report"
            title="Relatório de sinais"
            variant="outline"
            style={styles.action}
            onPress={() => navigation.navigate("SignalReport")}
          />
        </View>
      </View>

      {/* Push is how critical signals reach the professional, so the prompt
          sits above the list rather than after it. */}
      <EnableNotificationsCard />

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

      {!loading && profiles.length > 0 ? (
        <AdherenceSummary entries={profiles} />
      ) : null}

      {alerts.length > 0 || alertsError ? (
        <Section testID="professional-alerts" title="Sinais para contato">
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
        </Section>
      ) : null}

      {!loading ? (
        <Section title="Idosos">
          {profiles.length > 0 ? (
            <ScrollView
              testID="professional-filters"
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filters}
              accessibilityRole="radiogroup"
              accessibilityLabel="Filtrar por situação"
            >
              {(["all", ...RISK_LEVEL_ORDER] as const).map((key) => {
                const count =
                  key === "all"
                    ? profiles.length
                    : profiles.filter((entry) => entry.risk.status === key)
                        .length;
                const selected = filter === key;
                return (
                  <Pressable
                    key={key}
                    testID={`professional-filter-${key}`}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    style={[
                      styles.filterChip,
                      selected && styles.filterChipSelected,
                    ]}
                    onPress={() => setFilter(key)}
                  >
                    <Text
                      style={[
                        styles.filterLabel,
                        selected && styles.filterLabelSelected,
                      ]}
                    >
                      {key === "all" ? "Todos" : RISK_LEVELS[key].label} (
                      {count})
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}
          {visible.length === 0 ? (
            <Text testID="professional-empty" style={styles.empty}>
              {filter === "all"
                ? "Nenhum idoso vinculado ainda. Toque em Cadastrar idoso e informe o CPF e a data de nascimento."
                : "Nenhum idoso nesta situação."}
            </Text>
          ) : (
            <View style={styles.list}>
              {visible.map((item, index) => (
                <View key={item.id}>
                  {index > 0 ? <View style={styles.divider} /> : null}
                  <ProfileCard
                    profile={item}
                    testIDPrefix="professional"
                    riskStatus={item.risk.status}
                    lastCheckInAt={item.lastCheckInAt}
                    criticalEvents={item.risk.criticalEvents}
                    adherence={item.adherence}
                    onOpen={() =>
                      navigation.navigate("ProfileDetail", {
                        profileId: item.id,
                      })
                    }
                  />
                </View>
              ))}
            </View>
          )}
        </Section>
      ) : null}

      {!loading ? <RiskLegend /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    padding: SPACING.screen,
    gap: SPACING.xl,
  },
  intro: {
    gap: SPACING.lg,
  },
  description: {
    ...TYPE.body,
    color: COLORS.grey500,
  },
  actionsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  action: {
    flex: 1,
    paddingHorizontal: SPACING.sm,
  },
  filters: {
    gap: SPACING.sm,
  },
  filterChip: {
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.control,
    borderWidth: 1,
    borderColor: COLORS.grey300,
  },
  filterChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterLabel: {
    ...TYPE.label,
  },
  filterLabelSelected: {
    color: COLORS.white,
  },
  list: {
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.group,
    overflow: "hidden",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
  },
  empty: {
    ...TYPE.body,
    color: COLORS.grey500,
  },
  error: {
    ...TYPE.label,
    color: COLORS.danger,
  },
});
