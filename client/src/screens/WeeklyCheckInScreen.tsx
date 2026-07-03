import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
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
  MOOD_OPTIONS,
  STEPS,
  VITALS,
  WEEKLY_EVENTS,
  YES_NO_QUESTIONS,
  moodLabel,
} from "../constants/checkin";
import { ProfileHeader } from "../components/ProfileHeader";
import { StepIndicator } from "../components/StepIndicator";
import { PrimaryButton } from "../components/PrimaryButton";
import { COLORS, FONTS } from "../theme";

type Props = NativeStackScreenProps<AppStackParamList, "WeeklyCheckIn">;

type Answer = boolean | null;

interface YesNoRowProps {
  field: string;
  value: Answer;
  onChange: (value: boolean) => void;
}

/**
 * Question row with Sim/Não pills, as in the wizard's Figma frames. The chosen
 * pill fills with the primary color.
 */
function YesNoRow({ field, value, onChange }: YesNoRowProps) {
  return (
    <View style={styles.questionRow}>
      <Text style={styles.questionLabel}>{YES_NO_QUESTIONS[field]}</Text>
      <View style={styles.pillGroup}>
        <Pressable
          testID={`checkin-${field}-yes`}
          accessibilityRole="button"
          style={[styles.pill, value === true && styles.pillSelected]}
          onPress={() => onChange(true)}
        >
          <Text
            style={[
              styles.pillLabel,
              value === true && styles.pillLabelSelected,
            ]}
          >
            Sim
          </Text>
        </Pressable>
        <Pressable
          testID={`checkin-${field}-no`}
          accessibilityRole="button"
          style={[styles.pill, value === false && styles.pillSelected]}
          onPress={() => onChange(false)}
        >
          <Text
            style={[
              styles.pillLabel,
              value === false && styles.pillLabelSelected,
            ]}
          >
            Não
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Weekly check-in wizard for an elderly profile, following the Figma flow: five
 * domain steps (health + acute events + vitals, nutrition/medication, behavior,
 * hygiene, stock & logistics) with a progress indicator, Voltar/Próximo
 * navigation and a final Concluir submit that returns to the elder's screen.
 * The check-in history is listed on the first step and opens the read-only
 * detail screen.
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

  const stressTrackRef = useRef<View>(null);

  function handleStressTouch(pageX: number) {
    stressTrackRef.current?.measureInWindow((trackX, _trackY, trackWidth) => {
      if (trackWidth <= 0) return;
      const segment = trackWidth / 6;
      const level = Math.min(
        5,
        Math.max(0, Math.floor((pageX - trackX) / segment)),
      );
      setStressLevel(level);
    });
  }

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
          {WEEKLY_EVENTS.map((event) => {
            const selected = events.includes(event.key);
            return (
              <Pressable
                key={event.key}
                testID={`checkin-event-${event.key}`}
                accessibilityRole="button"
                style={styles.questionRow}
                onPress={() => toggleEvent(event.key)}
              >
                <Text style={styles.questionLabel}>
                  {event.label}
                  {event.critical ? (
                    <Text style={styles.criticalTag}> crítico</Text>
                  ) : null}
                </Text>
                <Ionicons
                  name={selected ? "radio-button-on" : "ellipse-outline"}
                  size={22}
                  color={selected ? COLORS.primary : COLORS.grey400}
                />
              </Pressable>
            );
          })}
          <TextInput
            testID="checkin-otherEvent"
            style={styles.input}
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
                  style={styles.input}
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
          <View style={styles.blockRow}>
            <Text style={styles.questionLabel}>Apetite predominante</Text>
            <View style={styles.appetiteRow}>
              {APPETITE_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  testID={`checkin-appetite-${option.value}`}
                  accessibilityRole="button"
                  style={[
                    styles.pill,
                    styles.appetitePill,
                    appetite === option.value && styles.pillSelected,
                  ]}
                  onPress={() => setAppetite(option.value)}
                >
                  <Text
                    style={[
                      styles.pillLabel,
                      appetite === option.value && styles.pillLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.blockRow}>
            <Pressable
              testID="checkin-chokingIncident"
              accessibilityRole="button"
              accessibilityState={{ checked: yesNo.chokingIncident === true }}
              style={styles.radioHeader}
              onPress={toggleChoking}
            >
              <Text style={styles.questionLabel}>
                {YES_NO_QUESTIONS.chokingIncident}
              </Text>
              <Ionicons
                name={
                  yesNo.chokingIncident === true
                    ? "radio-button-on"
                    : "ellipse-outline"
                }
                size={22}
                color={
                  yesNo.chokingIncident === true
                    ? COLORS.primary
                    : COLORS.grey400
                }
              />
            </Pressable>
            {yesNo.chokingIncident === true ? (
              <>
                <TextInput
                  testID="checkin-chokingFrequency"
                  style={styles.input}
                  placeholder="Frequência (ex: 2x na semana)"
                  placeholderTextColor={COLORS.grey400}
                  value={texts.chokingFrequency}
                  onChangeText={(value) => setText("chokingFrequency", value)}
                />
                <Pressable
                  testID="checkin-breathShortness"
                  accessibilityRole="button"
                  accessibilityState={{
                    checked: yesNo.breathShortness === true,
                  }}
                  style={styles.radioSubRow}
                  onPress={() =>
                    setAnswer("breathShortness", yesNo.breathShortness !== true)
                  }
                >
                  <Ionicons
                    name={
                      yesNo.breathShortness === true
                        ? "radio-button-on"
                        : "ellipse-outline"
                    }
                    size={20}
                    color={
                      yesNo.breathShortness === true
                        ? COLORS.primary
                        : COLORS.grey400
                    }
                  />
                  <Text style={styles.questionLabel}>
                    {YES_NO_QUESTIONS.breathShortness}
                  </Text>
                </Pressable>
              </>
            ) : null}
          </View>

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
          <View style={styles.blockRow}>
            <Text style={styles.questionLabel}>Humor predominante</Text>
            <View style={styles.moodRow}>
              {MOOD_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  testID={`checkin-mood-${option.value}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: mood === option.value }}
                  style={[
                    styles.moodOption,
                    mood === option.value && styles.moodOptionSelected,
                  ]}
                  onPress={() => setMood(option.value)}
                >
                  <MaterialCommunityIcons
                    name={
                      option.icon as ComponentProps<
                        typeof MaterialCommunityIcons
                      >["name"]
                    }
                    size={30}
                    color={option.color}
                  />
                  <Text style={[styles.moodLabel, { color: option.color }]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.blockRow}>
            <Text style={styles.questionLabel}>
              Nível de estresse predominante
            </Text>
            <View
              ref={stressTrackRef}
              style={styles.stressArea}
              onTouchStart={(event) =>
                handleStressTouch(event.nativeEvent.pageX)
              }
              onTouchMove={(event) =>
                handleStressTouch(event.nativeEvent.pageX)
              }
            >
              <View style={styles.stressTrack} />
              <View style={styles.stressRow}>
                {[0, 1, 2, 3, 4, 5].map((level) => (
                  <Pressable
                    key={level}
                    testID={`checkin-stress-${level}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: stressLevel === level }}
                    style={styles.stressColumn}
                    onPress={() => setStressLevel(level)}
                  >
                    <Text
                      style={[
                        styles.stressNumber,
                        stressLevel === level && styles.stressNumberSelected,
                      ]}
                    >
                      {level}
                    </Text>
                    <View style={styles.stressMarkZone}>
                      {stressLevel === level ? (
                        <View style={styles.stressThumb} />
                      ) : (
                        <View style={styles.stressDot} />
                      )}
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

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
              <Text style={styles.questionLabel}>{section.label}</Text>
              <TextInput
                testID={`checkin-${section.key}`}
                style={[styles.input, styles.textArea]}
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
  questionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.grey300,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  blockRow: {
    borderWidth: 1,
    borderColor: COLORS.grey300,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  blockField: {
    gap: 4,
  },
  questionLabel: {
    flex: 1,
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.heading,
  },
  criticalTag: {
    color: COLORS.danger,
    fontSize: 11,
  },
  pillGroup: {
    flexDirection: "row",
    gap: 6,
  },
  pill: {
    borderWidth: 1,
    borderColor: COLORS.heading,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 5,
    backgroundColor: COLORS.white,
  },
  pillSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pillLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.heading,
  },
  pillLabelSelected: {
    color: COLORS.white,
  },
  radioHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  radioSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  appetiteRow: {
    flexDirection: "row",
    gap: 10,
  },
  appetitePill: {
    flex: 1,
    alignItems: "center",
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: COLORS.grey300,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.heading,
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
  moodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 4,
  },
  moodOption: {
    alignItems: "center",
    gap: 4,
    borderRadius: 12,
    padding: 6,
    flex: 1,
  },
  moodOptionSelected: {
    backgroundColor: COLORS.chipBg,
  },
  moodLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 9,
    textAlign: "center",
  },
  stressArea: {
    position: "relative",
    paddingTop: 2,
  },
  stressTrack: {
    position: "absolute",
    left: 4,
    right: 4,
    bottom: 9,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#EDE7F9",
  },
  stressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stressColumn: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  stressNumber: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: COLORS.heading,
  },
  stressNumberSelected: {
    color: "#5D4FA0",
  },
  stressMarkZone: {
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  stressDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#B9A8E3",
  },
  stressThumb: {
    width: 5,
    height: 28,
    borderRadius: 3,
    backgroundColor: "#5D4FA0",
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
