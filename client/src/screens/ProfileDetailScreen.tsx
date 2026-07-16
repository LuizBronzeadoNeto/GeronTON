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
import {
  getProfileDetails,
  updateProfile,
  type Profile,
} from "../api/profiles";
import type { CheckIn } from "../api/checkins";
import {
  deleteIntercorrence,
  listIntercorrences,
  type Intercorrence,
} from "../api/intercorrences";
import { resolveAlert, type Alert as ClinicalAlert } from "../api/alerts";
import {
  APPETITE_OPTIONS,
  WEEKLY_EVENTS,
  moodLabel,
} from "../constants/checkin";
import { useAuth } from "../context/AuthContext";
import { AlertCard } from "../components/AlertCard";
import { IntercorrenceRow } from "../components/IntercorrenceRow";
import { RiskStatusBadge } from "../components/RiskStatusBadge";
import { ageInYears, isoToBrDate } from "../utils/date";
import { COLORS, FONTS } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "ProfileDetail">;

const CRITICAL_WINDOW_DAYS = 14;
const RECENT_HISTORY_LIMIT = 5;

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
 * Summary line for a check-in's weekly events using the wizard labels, plus
 * the free-text "other" event; "Nenhum" when the week had none.
 */
function weeklyEventsSummary(checkIn: CheckIn): string {
  const labels = WEEKLY_EVENTS.filter((event) =>
    checkIn.weeklyEvents.includes(event.key),
  ).map((event) => event.label);
  if (checkIn.otherEvent) labels.push(checkIn.otherEvent);
  return labels.length ? labels.join(", ") : "Nenhum";
}

/**
 * Display label for a check-in's predominant appetite.
 */
function appetiteLabel(checkIn: CheckIn): string {
  return (
    APPETITE_OPTIONS.find((option) => option.value === checkIn.appetite)
      ?.label ?? checkIn.appetite
  );
}

/**
 * "Cuidador/Idoso{id}" hub from the Figma design, used by both roles: the
 * elder's header with risk pill and critical-event warning, the open clinical
 * alerts raised by the monitoring system (resolvable by professionals), the
 * per-profile actions (weekly check-in, intercorrence, rotina and medication),
 * the latest weekly check-in summary (opening the full read-only view), the
 * "Linha de base" card, the removable condition chips (pencil opens the
 * full edit form) and the recent intercorrence history with severity pills.
 */
export function ProfileDetailScreen({ navigation, route }: Props) {
  const { profileId } = route.params;
  const { user } = useAuth();
  const isProfessional = user?.role === "profissional";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [intercorrences, setIntercorrences] = useState<Intercorrence[]>([]);
  const [latestCheckIn, setLatestCheckIn] = useState<CheckIn | null>(null);
  const [alerts, setAlerts] = useState<ClinicalAlert[]>([]);
  const [hasRecentCritical, setHasRecentCritical] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setError(null);
      Promise.all([getProfileDetails(profileId), listIntercorrences(profileId)])
        .then(([details, intercorrenceData]) => {
          if (!active) return;
          setProfile(details.profile);
          setLatestCheckIn(details.latestCheckIn);
          setAlerts(details.alerts);
          setIntercorrences(intercorrenceData);
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
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Último check-in</Text>
          {latestCheckIn ? (
            <Pressable
              testID="detail-last-checkin-open"
              accessibilityRole="button"
              accessibilityLabel="Ver check-in completo"
              onPress={() =>
                navigation.navigate("CheckInDetail", {
                  profileId,
                  checkInId: latestCheckIn.id,
                })
              }
            >
              <Text style={styles.linkLabel}>Ver completo</Text>
            </Pressable>
          ) : null}
        </View>
        {latestCheckIn ? (
          <View testID="detail-last-checkin" style={styles.summaryRows}>
            <View style={styles.baselineRow}>
              <Text style={styles.baselineLabel}>Data</Text>
              <Text style={styles.baselineValue}>
                {isoToBrDate(latestCheckIn.date)}
              </Text>
            </View>
            <View style={styles.baselineRow}>
              <Text style={styles.baselineLabel}>Humor predominante</Text>
              <Text style={styles.baselineValue}>
                {moodLabel(latestCheckIn.mood)}
              </Text>
            </View>
            <View style={styles.baselineRow}>
              <Text style={styles.baselineLabel}>Apetite predominante</Text>
              <Text style={styles.baselineValue}>
                {appetiteLabel(latestCheckIn)}
              </Text>
            </View>
            <View style={styles.baselineRow}>
              <Text style={styles.baselineLabel}>Eventos na semana</Text>
              <Text style={styles.baselineValue}>
                {weeklyEventsSummary(latestCheckIn)}
              </Text>
            </View>
          </View>
        ) : (
          <Text testID="detail-last-checkin-empty" style={styles.emptyLine}>
            Nenhum check-in registrado.
          </Text>
        )}
      </View>

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
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Histórico recente</Text>
          {intercorrences.length > 0 ? (
            <Pressable
              testID="detail-history-all"
              accessibilityRole="button"
              accessibilityLabel="Ver todas as intercorrências"
              onPress={() =>
                navigation.navigate("IntercorrenceList", { profileId })
              }
            >
              <Text style={styles.linkLabel}>Ver todas</Text>
            </Pressable>
          ) : null}
        </View>
        {intercorrences.length === 0 ? (
          <Text testID="detail-history-empty" style={styles.emptyLine}>
            Nenhuma intercorrência registrada.
          </Text>
        ) : (
          intercorrences
            .slice(0, RECENT_HISTORY_LIMIT)
            .map((item) => (
              <IntercorrenceRow
                key={item.id}
                intercorrence={item}
                testIDPrefix="detail"
                onDelete={() => confirmDeleteIntercorrence(item.id)}
              />
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
  linkLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.primary,
  },
  summaryRows: {
    gap: 10,
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
  error: {
    fontFamily: FONTS.semiBold,
    color: COLORS.danger,
    textAlign: "center",
    padding: 12,
  },
});
