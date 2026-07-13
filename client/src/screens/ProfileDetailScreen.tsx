import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../types/navigation";
import { getProfile, updateProfile, type Profile } from "../api/profiles";
import {
  deleteIntercorrence,
  listIntercorrences,
  type Intercorrence,
} from "../api/intercorrences";
import {
  listProfileAlerts,
  resolveAlert,
  type Alert as ClinicalAlert,
} from "../api/alerts";
import { eventTypeLabel } from "../constants/intercorrence";
import { useAuth } from "../context/AuthContext";
import { AlertCard } from "../components/AlertCard";
import { RiskStatusBadge } from "../components/RiskStatusBadge";
import { StatusPill } from "../components/StatusPill";
import { ageInYears, formatTimestamp, isoToBrDate } from "../utils/date";
import { COLORS, FONTS } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "ProfileDetail">;

const CRITICAL_WINDOW_DAYS = 14;

/**
 * Whether any critical intercorrence happened within the warning window, for
 * the header's "Evento crítico nas últimas 2 semanas" line.
 */
function hasRecentCriticalEvent(intercorrences: Intercorrence[]): boolean {
  const windowStart = Date.now() - CRITICAL_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return intercorrences.some(
    (item) => item.isCritical && new Date(item.date).getTime() >= windowStart,
  );
}

/**
 * Severity pill for a history entry: red "Crítico" for critical intercorrences
 * and orange "Atenção" otherwise, as in the Figma history list.
 */
function SeverityPill({ isCritical }: { isCritical: boolean }) {
  return (
    <StatusPill
      label={isCritical ? "Crítico" : "Atenção"}
      color={isCritical ? COLORS.danger : COLORS.warning}
      backgroundColor={isCritical ? COLORS.dangerBadgeBg : COLORS.warningBg}
    />
  );
}

/**
 * "Cuidador/Idoso{id}" hub from the Figma design, used by both roles: the
 * elder's header with risk pill and critical-event warning, the open clinical
 * alerts raised by the monitoring system (resolvable by professionals), the
 * per-profile actions (weekly check-in, intercorrence, rotina and medication),
 * the "Linha de base" card, the removable condition chips (pencil opens the
 * full edit form) and the recent intercorrence history with severity pills.
 */
export function ProfileDetailScreen({ navigation, route }: Props) {
  const { profileId } = route.params;
  const { user } = useAuth();
  const isProfessional = user?.role === "profissional";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [intercorrences, setIntercorrences] = useState<Intercorrence[]>([]);
  const [alerts, setAlerts] = useState<ClinicalAlert[]>([]);
  const [hasRecentCritical, setHasRecentCritical] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setError(null);
      Promise.all([
        getProfile(profileId),
        listIntercorrences(profileId),
        listProfileAlerts(profileId, true),
      ])
        .then(([profileData, intercorrenceData, alertData]) => {
          if (!active) return;
          setProfile(profileData);
          setIntercorrences(intercorrenceData);
          setAlerts(alertData);
          setHasRecentCritical(hasRecentCriticalEvent(intercorrenceData));
        })
        .catch(() => {
          if (active) setError("Não foi possível carregar o idoso.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [profileId]),
  );

  async function handleResolveAlert(alertId: number) {
    const previous = alerts;
    setAlerts((old) => old.filter((item) => item.id !== alertId));
    try {
      await resolveAlert(profileId, alertId);
    } catch {
      setAlerts(previous);
      setError("Não foi possível resolver o alerta.");
    }
  }

  async function removeCondition(condition: string) {
    if (!profile) return;
    const medicalConditions = profile.medicalConditions.filter(
      (item) => item !== condition,
    );
    const previous = profile;
    setProfile({ ...profile, medicalConditions });
    try {
      await updateProfile(profileId, { medicalConditions });
    } catch {
      setProfile(previous);
      setError("Não foi possível remover a condição.");
    }
  }

  function confirmDeleteIntercorrence(id: number) {
    Alert.alert(
      "Remover intercorrência",
      "Tem certeza que deseja remover este registro?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: async () => {
            const previous = intercorrences;
            setIntercorrences((old) => old.filter((item) => item.id !== id));
            try {
              await deleteIntercorrence(profileId, id);
            } catch {
              setIntercorrences(previous);
              setError("Não foi possível remover a intercorrência.");
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <ActivityIndicator
        testID="profile-detail-loading"
        color={COLORS.primary}
        style={styles.loading}
      />
    );
  }

  if (!profile) {
    return (
      <Text testID="profile-detail-error" style={styles.error}>
        {error ?? "Não foi possível carregar o idoso."}
      </Text>
    );
  }

  return (
    <ScrollView
      testID="profile-detail"
      contentContainerStyle={styles.container}
    >
      <View style={styles.nameRow}>
        <Text style={styles.name} numberOfLines={1}>
          {profile.firstName} {profile.lastName}
        </Text>
        <RiskStatusBadge profileId={profileId} />
      </View>
      <Text style={styles.subtitle}>{ageInYears(profile.birthDate)} anos</Text>
      {hasRecentCritical ? (
        <Text testID="profile-detail-critical" style={styles.criticalLine}>
          Evento crítico nas últimas 2 semanas
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          testID="detail-checkin"
          accessibilityRole="button"
          style={[styles.actionButton, styles.actionPrimary]}
          onPress={() => navigation.navigate("WeeklyCheckIn", { profileId })}
        >
          <Text style={styles.actionPrimaryLabel}>+ Check-in semanal</Text>
        </Pressable>
        <Pressable
          testID="detail-intercorrence"
          accessibilityRole="button"
          style={[styles.actionButton, styles.actionDanger]}
          onPress={() =>
            navigation.navigate("IntercorrenceForm", { profileId })
          }
        >
          <Ionicons name="warning-outline" size={14} color={COLORS.white} />
          <Text style={styles.actionPrimaryLabel}>Intercorrência</Text>
        </Pressable>
        <Pressable
          testID="detail-routine"
          accessibilityRole="button"
          style={[styles.actionButton, styles.actionOutline]}
          onPress={() =>
            navigation.navigate("RoutineRegistration", { profileId })
          }
        >
          <Ionicons
            name="document-text-outline"
            size={14}
            color={COLORS.heading}
          />
          <Text style={styles.actionOutlineLabel}>Rotina</Text>
        </Pressable>
        <Pressable
          testID="detail-medication"
          accessibilityRole="button"
          style={[styles.actionButton, styles.actionOutline]}
          onPress={() =>
            navigation.navigate("MedicationInventory", { profileId })
          }
        >
          <Ionicons name="medkit-outline" size={14} color={COLORS.heading} />
          <Text style={styles.actionOutlineLabel}>Medicação</Text>
        </Pressable>
      </View>

      {error ? (
        <Text testID="profile-detail-error" style={styles.error}>
          {error}
        </Text>
      ) : null}

      {alerts.length > 0 ? (
        <View testID="detail-alerts" style={styles.alertsSection}>
          <Text style={styles.cardTitle}>Alertas ativos</Text>
          {alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              testID={`detail-alert-${alert.id}`}
              alert={alert}
              onResolve={
                isProfessional ? () => handleResolveAlert(alert.id) : undefined
              }
            />
          ))}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Linha de base</Text>
        <View style={styles.baselineRow}>
          <Text style={styles.baselineLabel}>Nascimento</Text>
          <Text style={styles.baselineValue}>
            {isoToBrDate(profile.birthDate)}
          </Text>
        </View>
        <View style={styles.baselineRow}>
          <Text style={styles.baselineLabel}>Sexo</Text>
          <Text style={styles.baselineValue}>{profile.sex ?? "—"}</Text>
        </View>
        <View style={styles.baselineRow}>
          <Text style={styles.baselineLabel}>Escolaridade</Text>
          <Text style={styles.baselineValue}>{profile.scholarship}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Condições</Text>
          <Pressable
            testID="detail-edit"
            accessibilityRole="button"
            accessibilityLabel="Editar idoso"
            style={styles.editButton}
            onPress={() => navigation.navigate("ProfileForm", { profileId })}
          >
            <Ionicons name="pencil" size={16} color={COLORS.warning} />
          </Pressable>
        </View>
        {profile.medicalConditions.length === 0 ? (
          <Text style={styles.emptyLine}>Nenhuma condição registrada.</Text>
        ) : (
          <View style={styles.chipGrid}>
            {profile.medicalConditions.map((condition) => (
              <Pressable
                key={condition}
                testID={`detail-condition-remove-${condition}`}
                accessibilityRole="button"
                accessibilityLabel={`Remover ${condition}`}
                style={styles.chip}
                onPress={() => removeCondition(condition)}
              >
                <Text style={styles.chipLabel}>
                  {condition} <Text style={styles.chipRemove}>×</Text>
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Histórico recente</Text>
        {intercorrences.length === 0 ? (
          <Text testID="detail-history-empty" style={styles.emptyLine}>
            Nenhuma intercorrência registrada.
          </Text>
        ) : (
          intercorrences.map((item) => (
            <View
              key={item.id}
              testID={`detail-intercorrence-${item.id}`}
              style={styles.historyRow}
            >
              <View style={styles.historyInfo}>
                <Text style={styles.historyTitle}>
                  {eventTypeLabel(item.eventType)}
                </Text>
                {item.description !== "" ? (
                  <Text style={styles.historyDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
              </View>
              <Pressable
                testID={`detail-intercorrence-delete-${item.id}`}
                accessibilityRole="button"
                accessibilityLabel="Remover intercorrência"
                style={styles.deleteButton}
                onPress={() => confirmDeleteIntercorrence(item.id)}
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={COLORS.danger}
                />
              </Pressable>
              <View style={styles.historyMeta}>
                <SeverityPill isCritical={item.isCritical} />
                <Text style={styles.historyDate}>
                  {formatTimestamp(item.date)}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
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
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: {
    fontFamily: FONTS.extraBold,
    fontSize: 24,
    color: COLORS.heading,
    flexShrink: 1,
  },
  subtitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.grey500,
  },
  criticalLine: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.grey500,
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  alertsSection: {
    gap: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 36,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  actionPrimary: {
    backgroundColor: COLORS.primary,
  },
  actionDanger: {
    backgroundColor: COLORS.danger,
  },
  actionOutline: {
    borderWidth: 1,
    borderColor: COLORS.grey300,
    backgroundColor: COLORS.white,
  },
  actionPrimaryLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.white,
  },
  actionOutlineLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.heading,
  },
  card: {
    borderWidth: 1,
    borderColor: COLORS.grey300,
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 18,
    color: COLORS.heading,
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.warning,
    alignItems: "center",
    justifyContent: "center",
  },
  baselineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  baselineLabel: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.grey400,
  },
  baselineValue: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.heading,
    textAlign: "right",
    flexShrink: 1,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: COLORS.chipBg,
  },
  chipLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.primary,
  },
  chipRemove: {
    fontSize: 12,
    color: COLORS.grey500,
  },
  emptyLine: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.grey500,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  historyInfo: {
    flex: 1,
    gap: 2,
  },
  historyTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.heading,
  },
  historyDescription: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.grey400,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  historyMeta: {
    alignItems: "flex-end",
    gap: 4,
  },
  historyDate: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: COLORS.grey400,
  },
  error: {
    fontFamily: FONTS.semiBold,
    color: COLORS.danger,
    textAlign: "center",
    padding: 12,
  },
});
