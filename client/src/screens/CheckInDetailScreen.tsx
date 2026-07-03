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
import { deleteCheckIn, getCheckIn, type CheckIn } from "../api/checkins";
import {
  APPETITE_OPTIONS,
  LOGISTICS,
  STEPS,
  VITALS,
  WEEKLY_EVENTS,
  YES_NO_QUESTIONS,
  moodLabel,
} from "../constants/checkin";
import { PrimaryButton } from "../components/PrimaryButton";
import { COLORS, FONTS } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "CheckInDetail">;

interface RowProps {
  label: string;
  value: string;
}

/**
 * Label/value line inside a domain card.
 */
function DetailRow({ label, value }: RowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function yesNo(value: boolean): string {
  return value ? "Sim" : "Não";
}

/**
 * Read-only view of a single weekly check-in, presenting the wizard's five
 * domains as cards, with a destructive delete action at the bottom. The route
 * carries the `profileId` and the `checkInId`. Since a check-in is a weekly
 * snapshot, corrections are made by deleting and recording a new one.
 */
export function CheckInDetailScreen({ navigation, route }: Props) {
  const { profileId, checkInId } = route.params;

  const [checkIn, setCheckIn] = useState<CheckIn | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getCheckIn(profileId, checkInId)
        .then((data) => {
          if (active) setCheckIn(data);
        })
        .catch(() => {
          if (active) setError("Não foi possível carregar o check-in.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [profileId, checkInId]),
  );

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteCheckIn(profileId, checkInId);
      navigation.goBack();
    } catch {
      setError("Não foi possível excluir o check-in.");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <ActivityIndicator
        testID="checkin-detail-loading"
        color={COLORS.primary}
        style={styles.loading}
      />
    );
  }

  if (!checkIn) {
    return (
      <Text testID="checkin-detail-error" style={styles.error}>
        {error ?? "Não foi possível carregar o check-in."}
      </Text>
    );
  }

  const events = WEEKLY_EVENTS.filter((event) =>
    checkIn.weeklyEvents.includes(event.key),
  );
  const appetiteLabel =
    APPETITE_OPTIONS.find((option) => option.value === checkIn.appetite)
      ?.label ?? checkIn.appetite;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text testID="checkin-detail-title" style={styles.title}>
        Check-in de {checkIn.date.slice(0, 10)}
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{STEPS[0].title}</Text>
        {["skinIssues", "bowelRegular", "sleepWell", "unstableGait"].map(
          (field) => (
            <DetailRow
              key={field}
              label={YES_NO_QUESTIONS[field]}
              value={yesNo(checkIn[field as keyof CheckIn] as boolean)}
            />
          ),
        )}
        <DetailRow
          label="Intercorrências na semana"
          value={
            events.length === 0 && !checkIn.otherEvent
              ? "Nenhuma"
              : [
                  ...events.map((event) => event.label),
                  ...(checkIn.otherEvent ? [checkIn.otherEvent] : []),
                ].join(", ")
          }
        />
        {VITALS.map((vital) => {
          const value = checkIn[vital.key as keyof CheckIn] as string | null;
          return value ? (
            <DetailRow key={vital.key} label={vital.label} value={value} />
          ) : null;
        })}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{STEPS[1].title}</Text>
        <DetailRow label="Apetite predominante" value={appetiteLabel} />
        <DetailRow
          label={YES_NO_QUESTIONS.chokingIncident}
          value={yesNo(checkIn.chokingIncident)}
        />
        {checkIn.chokingIncident ? (
          <>
            {checkIn.chokingFrequency ? (
              <DetailRow label="Frequência" value={checkIn.chokingFrequency} />
            ) : null}
            <DetailRow
              label={YES_NO_QUESTIONS.breathShortness}
              value={yesNo(checkIn.breathShortness)}
            />
          </>
        ) : null}
        <DetailRow
          label={YES_NO_QUESTIONS.hydrationGoal}
          value={yesNo(checkIn.hydrationGoal)}
        />
        <DetailRow
          label={YES_NO_QUESTIONS.medsOnTime}
          value={yesNo(checkIn.medsOnTime)}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{STEPS[2].title}</Text>
        <DetailRow label="Humor predominante" value={moodLabel(checkIn.mood)} />
        <DetailRow
          label="Nível de estresse"
          value={String(checkIn.stressLevel)}
        />
        {["sunExposure", "selfExpression", "stimulation"].map((field) => (
          <DetailRow
            key={field}
            label={YES_NO_QUESTIONS[field]}
            value={yesNo(checkIn[field as keyof CheckIn] as boolean)}
          />
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{STEPS[3].title}</Text>
        {["dailyBath", "oralHygiene", "groomedNails"].map((field) => (
          <DetailRow
            key={field}
            label={YES_NO_QUESTIONS[field]}
            value={yesNo(checkIn[field as keyof CheckIn] as boolean)}
          />
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{STEPS[4].title}</Text>
        {LOGISTICS.map((section) => {
          const value = checkIn[section.key as keyof CheckIn] as string | null;
          return (
            <DetailRow
              key={section.key}
              label={section.label}
              value={value ?? "—"}
            />
          );
        })}
      </View>

      {error ? (
        <Text testID="checkin-detail-error" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <PrimaryButton
        testID="checkin-delete"
        title="Excluir check-in"
        variant="danger"
        onPress={handleDelete}
        disabled={deleting}
      />
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
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: 20,
    lineHeight: 28,
    color: COLORS.heading,
  },
  card: {
    borderWidth: 1,
    borderColor: COLORS.grey300,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  cardTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.heading,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  rowLabel: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.grey500,
  },
  rowValue: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.heading,
    textAlign: "right",
    flexShrink: 1,
  },
  error: {
    fontFamily: FONTS.semiBold,
    color: COLORS.danger,
    textAlign: "center",
    padding: 24,
  },
});
