import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { AppStackParamList } from "../types/navigation";
import {
  createCheckIn,
  listCheckIns,
  type Appetite,
  type CheckIn,
  type CheckInInput,
  type Mood,
} from "../api/checkins";
import {
  APPETITE_OPTIONS,
  LOGISTICS,
  STEPS,
  VITALS,
  WEEKLY_EVENTS,
  moodLabel,
} from "../constants/checkin";
import { ProfileHeader } from "../components/ProfileHeader";
import { StepIndicator } from "../components/StepIndicator";
import { PrimaryButton } from "../components/PrimaryButton";
import { checkinStyles } from "../components/checkin/common";
import { YesNoRow, type Answer } from "../components/checkin/YesNoRow";
import { EventToggleRow } from "../components/checkin/EventToggleRow";
import { ChokingQuestion } from "../components/checkin/ChokingQuestion";
import { MoodSelector } from "../components/checkin/MoodSelector";
import { StressLevelSlider } from "../components/checkin/StressLevelSlider";
import { COLORS, FONTS } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "WeeklyCheckIn">;

/**
 * Weekly check-in wizard for an elderly profile, following the Figma flow: five
 * domain steps (health + acute events + vitals, nutrition/medication, behavior,
 * hygiene, stock & logistics) with a progress indicator, Voltar/Próximo
 * navigation and a final Concluir submit that returns to the elder's screen.
 * The question widgets live in components/checkin; this screen owns the wizard
 * state and flow. The check-in history is listed on the first step and opens
 * the read-only detail screen.
 */
export function WeeklyCheckInScreen({ navigation, route }: Props) {
  const { profileId } = route.params;

  const [step, setStep] = useState(1);

  const [yesNo, setYesNo] = useState<Record<string, Answer>>({
    skinIssues: null,
    bowelRegular: null,
    sleepWell: null,
    unstableGait: null,
    chokingIncident: false,
    breathShortness: false,
    hydrationGoal: null,
    medsOnTime: null,
    sunExposure: null,
    selfExpression: null,
    stimulation: null,
    dailyBath: null,
    oralHygiene: null,
    groomedNails: null,
  });
  const [events, setEvents] = useState<string[]>([]);
  const [texts, setTexts] = useState<Record<string, string>>({
    otherEvent: "",
    pressure: "",
    saturation: "",
    glycemia: "",
    calfCircumference: "",
    chokingFrequency: "",
    needsMedications: "",
    needsHygiene: "",
    needsFood: "",
  });
  const [appetite, setAppetite] = useState<Appetite | null>(null);
  const [mood, setMood] = useState<Mood | null>(null);
  const [stressLevel, setStressLevel] = useState(0);

  const [history, setHistory] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      listCheckIns(profileId)
        .then((data) => {
          if (active) setHistory(data);
        })
        .catch(() => {
          if (active) setError("Não foi possível carregar o histórico.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [profileId]),
  );

  function setAnswer(field: string, value: boolean) {
    setYesNo((current) => ({ ...current, [field]: value }));
  }

  function setText(field: string, value: string) {
    setTexts((current) => ({ ...current, [field]: value }));
  }

  function toggleEvent(key: string) {
    setEvents((current) =>
      current.includes(key)
        ? current.filter((event) => event !== key)
        : [...current, key],
    );
  }

  function toggleChoking() {
    const enabled = yesNo.chokingIncident !== true;
    setYesNo((current) => ({
      ...current,
      chokingIncident: enabled,
      breathShortness: enabled ? current.breathShortness : false,
    }));
    if (!enabled) setText("chokingFrequency", "");
  }

  function answered(fields: string[]): boolean {
    return fields.every((field) => yesNo[field] !== null);
  }

  function canProceed(): boolean {
    if (step === 1) {
      return answered([
        "skinIssues",
        "bowelRegular",
        "sleepWell",
        "unstableGait",
      ]);
    }
    if (step === 2) {
      return appetite !== null && answered(["hydrationGoal", "medsOnTime"]);
    }
    if (step === 3) {
      return (
        mood !== null &&
        answered(["sunExposure", "selfExpression", "stimulation"])
      );
    }
    if (step === 4) {
      return answered(["dailyBath", "oralHygiene", "groomedNails"]);
    }
    return true;
  }

  function handleBack() {
    setError(null);
    if (step === 1) navigation.goBack();
    else setStep(step - 1);
  }

  function optional(value: string): string | null {
    return value.trim() === "" ? null : value.trim();
  }

  async function handleSubmit() {
    setSaving(true);
    setError(null);

    const input: CheckInInput = {
      skinIssues: yesNo.skinIssues === true,
      bowelRegular: yesNo.bowelRegular === true,
      sleepWell: yesNo.sleepWell === true,
      unstableGait: yesNo.unstableGait === true,
      weeklyEvents: events,
      otherEvent: optional(texts.otherEvent),
      pressure: optional(texts.pressure),
      saturation: optional(texts.saturation),
      glycemia: optional(texts.glycemia),
      calfCircumference: optional(texts.calfCircumference),
      appetite: appetite ?? "regular",
      chokingIncident: yesNo.chokingIncident === true,
      chokingFrequency: optional(texts.chokingFrequency),
      breathShortness: yesNo.breathShortness === true,
      hydrationGoal: yesNo.hydrationGoal === true,
      medsOnTime: yesNo.medsOnTime === true,
      mood: mood ?? "neutral",
      stressLevel,
      sunExposure: yesNo.sunExposure === true,
      selfExpression: yesNo.selfExpression === true,
      stimulation: yesNo.stimulation === true,
      dailyBath: yesNo.dailyBath === true,
      oralHygiene: yesNo.oralHygiene === true,
      groomedNails: yesNo.groomedNails === true,
      needsMedications: optional(texts.needsMedications),
      needsHygiene: optional(texts.needsHygiene),
      needsFood: optional(texts.needsFood),
    };

    try {
      await createCheckIn(profileId, input);
      navigation.goBack();
    } catch {
      setError("Não foi possível salvar o check-in.");
    } finally {
      setSaving(false);
    }
  }

  const currentStep = STEPS[step - 1];

  return (
    <ScrollView contentContainerStyle={styles.container} testID="checkin">
      <ProfileHeader profileId={profileId} />

      <View style={styles.stepHeader}>
        <View style={styles.stepTitles}>
          <Text testID="checkin-title" style={styles.title}>
            {currentStep.title}
          </Text>
          <Text style={styles.stepSubtitle}>{currentStep.subtitle}</Text>
        </View>
        <StepIndicator
          current={step}
          total={STEPS.length}
          onStepPress={setStep}
        />
      </View>

      {step === 1 ? (
        <View style={styles.stepContent}>
          {["skinIssues", "bowelRegular", "sleepWell", "unstableGait"].map(
            (field) => (
              <YesNoRow
                key={field}
                field={field}
                value={yesNo[field]}
                onChange={(value) => setAnswer(field, value)}
              />
            ),
          )}

          <Text style={styles.sectionTitle}>Intercorrências na semana</Text>
          {WEEKLY_EVENTS.map((event) => (
            <EventToggleRow
              key={event.key}
              event={event}
              selected={events.includes(event.key)}
              onToggle={() => toggleEvent(event.key)}
            />
          ))}
          <TextInput
            testID="checkin-otherEvent"
            style={checkinStyles.input}
            placeholder="Outra intercorrência (opcional)"
            placeholderTextColor={COLORS.grey400}
            value={texts.otherEvent}
            onChangeText={(value) => setText("otherEvent", value)}
          />

          <Text style={styles.sectionTitle}>
            Sinais vitais (média, não obrigatório)
          </Text>
          <View style={styles.vitalsGrid}>
            {VITALS.map((vital) => (
              <View key={vital.key} style={styles.vitalField}>
                <View style={styles.vitalLabelZone}>
                  <Text style={styles.vitalLabel}>{vital.label}</Text>
                </View>
                <TextInput
                  testID={`checkin-${vital.key}`}
                  style={checkinStyles.input}
                  placeholder={vital.placeholder}
                  placeholderTextColor={COLORS.grey400}
                  value={texts[vital.key]}
                  onChangeText={(value) => setText(vital.key, value)}
                />
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {step === 2 ? (
        <View style={styles.stepContent}>
          <View style={checkinStyles.blockRow}>
            <Text style={checkinStyles.questionLabel}>
              Apetite predominante
            </Text>
            <View style={styles.appetiteRow}>
              {APPETITE_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  testID={`checkin-appetite-${option.value}`}
                  accessibilityRole="button"
                  style={[
                    checkinStyles.pill,
                    styles.appetitePill,
                    appetite === option.value && checkinStyles.pillSelected,
                  ]}
                  onPress={() => setAppetite(option.value)}
                >
                  <Text
                    style={[
                      checkinStyles.pillLabel,
                      appetite === option.value &&
                        checkinStyles.pillLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <ChokingQuestion
            incident={yesNo.chokingIncident === true}
            breathShortness={yesNo.breathShortness === true}
            frequency={texts.chokingFrequency}
            onToggleIncident={toggleChoking}
            onToggleBreathShortness={() =>
              setAnswer("breathShortness", yesNo.breathShortness !== true)
            }
            onChangeFrequency={(value) => setText("chokingFrequency", value)}
          />

          <YesNoRow
            field="hydrationGoal"
            value={yesNo.hydrationGoal}
            onChange={(value) => setAnswer("hydrationGoal", value)}
          />
          <YesNoRow
            field="medsOnTime"
            value={yesNo.medsOnTime}
            onChange={(value) => setAnswer("medsOnTime", value)}
          />
        </View>
      ) : null}

      {step === 3 ? (
        <View style={styles.stepContent}>
          <MoodSelector value={mood} onChange={setMood} />
          <StressLevelSlider value={stressLevel} onChange={setStressLevel} />

          {["sunExposure", "selfExpression", "stimulation"].map((field) => (
            <YesNoRow
              key={field}
              field={field}
              value={yesNo[field]}
              onChange={(value) => setAnswer(field, value)}
            />
          ))}
        </View>
      ) : null}

      {step === 4 ? (
        <View style={styles.stepContent}>
          {["dailyBath", "oralHygiene", "groomedNails"].map((field) => (
            <YesNoRow
              key={field}
              field={field}
              value={yesNo[field]}
              onChange={(value) => setAnswer(field, value)}
            />
          ))}
        </View>
      ) : null}

      {step === 5 ? (
        <View style={styles.stepContent}>
          {LOGISTICS.map((section) => (
            <View key={section.key} style={styles.blockField}>
              <Text style={checkinStyles.questionLabel}>{section.label}</Text>
              <TextInput
                testID={`checkin-${section.key}`}
                style={[checkinStyles.input, styles.textArea]}
                placeholderTextColor={COLORS.grey400}
                value={texts[section.key]}
                onChangeText={(value) => setText(section.key, value)}
                multiline
              />
            </View>
          ))}
        </View>
      ) : null}

      {error ? (
        <Text testID="checkin-error" style={styles.error}>
          {error}
        </Text>
      ) : null}

      <View style={styles.navRow}>
        <PrimaryButton
          testID="checkin-back"
          title="Voltar"
          variant="outline"
          style={styles.navButton}
          onPress={handleBack}
        />
        {step < STEPS.length ? (
          <PrimaryButton
            testID="checkin-next"
            title="Próximo"
            style={styles.navButton}
            disabled={!canProceed()}
            onPress={() => setStep(step + 1)}
          />
        ) : (
          <PrimaryButton
            testID="checkin-submit"
            title="Concluir"
            style={styles.navButton}
            loading={saving}
            onPress={handleSubmit}
          />
        )}
      </View>

      {step === 1 ? (
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Histórico</Text>
          {loading ? (
            <ActivityIndicator
              testID="checkin-loading"
              color={COLORS.primary}
            />
          ) : null}
          {!loading && history.length === 0 ? (
            <Text testID="checkin-history-empty" style={styles.empty}>
              Nenhum check-in registrado.
            </Text>
          ) : null}
          <View testID="checkin-history" style={styles.history}>
            {history.map((item) => (
              <Pressable
                key={item.id}
                testID={`checkin-history-item-${item.id}`}
                accessibilityRole="button"
                style={styles.historyItem}
                onPress={() =>
                  navigation.navigate("CheckInDetail", {
                    profileId,
                    checkInId: item.id,
                  })
                }
              >
                <Text style={styles.historyDate}>{item.date.slice(0, 10)}</Text>
                <Text style={styles.historySummary}>
                  Humor: {moodLabel(item.mood)} · Estresse: {item.stressLevel}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: COLORS.white,
  },
  stepHeader: {
    gap: 12,
    marginBottom: 16,
  },
  stepTitles: {
    gap: 2,
  },
  title: {
    fontFamily: FONTS.semiBold,
    fontSize: 20,
    lineHeight: 28,
    color: COLORS.heading,
  },
  stepSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.grey400,
  },
  stepContent: {
    gap: 8,
  },
  sectionTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: COLORS.heading,
    marginTop: 16,
    marginBottom: 4,
  },
  blockField: {
    gap: 4,
  },
  appetiteRow: {
    flexDirection: "row",
    gap: 10,
  },
  appetitePill: {
    flex: 1,
    alignItems: "center",
  },
  textArea: {
    height: undefined,
    minHeight: 90,
    paddingVertical: 12,
    textAlignVertical: "top",
  },
  vitalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "stretch",
    gap: 12,
  },
  vitalField: {
    flexBasis: "47%",
    flexGrow: 1,
    gap: 4,
  },
  vitalLabelZone: {
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  vitalLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.heading,
  },
  error: {
    fontFamily: FONTS.semiBold,
    color: COLORS.danger,
    textAlign: "center",
    marginTop: 12,
  },
  navRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  navButton: {
    flex: 1,
  },
  historySection: {
    marginTop: 8,
  },
  empty: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.grey500,
    textAlign: "center",
  },
  history: {
    gap: 8,
  },
  historyItem: {
    borderWidth: 1,
    borderColor: COLORS.grey300,
    borderRadius: 8,
    padding: 12,
    gap: 2,
  },
  historyDate: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.heading,
  },
  historySummary: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.grey500,
  },
});
