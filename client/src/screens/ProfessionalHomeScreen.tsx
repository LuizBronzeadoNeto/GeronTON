import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../types/navigation";
import { listTriage, type TriageEntry } from "../api/triage";
import { listDashboardAlerts, type DashboardAlert } from "../api/alerts";
import { ProfileCard } from "../components/ProfileCard";
import { AlertCard } from "../components/AlertCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { RiskLegend } from "../components/RiskLegend";
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
 */
export function ProfessionalHomeScreen({ navigation }: Props) {
  const [profiles, setProfiles] = useState<TriageEntry[]>([]);
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alertsError, setAlertsError] = useState<string | null>(null);

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
          if (active) setAlertsError("Não foi possível carregar os alertas.");
        });
      return () => {
        active = false;
      };
    }, []),
  );

  const alertsPanel =
    alerts.length > 0 || alertsError ? (
      <View testID="professional-alerts" style={styles.alertsPanel}>
        <Text style={styles.alertsTitle}>Alertas</Text>
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

  return (
    <View testID="professional-home" style={styles.container}>
      <Text style={styles.description}>
        Idosos sob seu acompanhamento, ordenados por nível de risco. Cores
        indicam prioridade clínica.
      </Text>

      <PrimaryButton
        testID="professional-add"
        title="+ Cadastrar idoso"
        size="small"
        onPress={() => navigation.navigate("ProfileForm")}
      />

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
        data={profiles}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={alertsPanel}
        ListFooterComponent={loading ? null : <RiskLegend />}
        ListFooterComponentStyle={styles.legendFooter}
        ListEmptyComponent={
          loading ? null : (
            <Text testID="professional-empty" style={styles.empty}>
              Nenhum idoso vinculado ainda
            </Text>
          )
        }
        renderItem={({ item }) => (
          <ProfileCard
            profile={item}
            testIDPrefix="professional"
            showLastCheckIn
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
