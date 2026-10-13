import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
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
import { listMedications } from "../api/medications";
import {
  APPETITE_OPTIONS,
  LOGISTICS,
  STEPS,
  VITALS,
  WEEKLY_EVENTS,
  moodLabel,
} from "../constants/checkin";
import { EmergencyCallout } from "../components/EmergencyCallout";
import { ProfileHeader } from "../components/ProfileHeader";
import { StepIndicator } from "../components/StepIndicator";
import { PrimaryButton } from "../components/PrimaryButton";
import { ActionBar } from "../components/ActionBar";
import { AnswerGroup } from "../components/AnswerGroup";
import { ListRow } from "../components/ListRow";
import { Section } from "../components/Section";
import { TagListInput } from "../components/TagListInput";
import { CheckboxRow } from "../components/CheckboxRow";
import { checkinStyles } from "../components/checkin/common";
import { YesNoRow, type Answer } from "../components/checkin/YesNoRow";
import { EventToggleRow } from "../components/checkin/EventToggleRow";
import { ChokingQuestion } from "../components/checkin/ChokingQuestion";
import { MoodSelector } from "../components/checkin/MoodSelector";
import { StressLevelSlider } from "../components/checkin/StressLevelSlider";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { clearDraft, loadDraft, saveDraft } from "../utils/checkInDraft";
import { formatDay } from "../utils/date";
import { COLORS, RADIUS, SPACING, TYPE } from "../theme";
import { FormError } from "../components/FormError";

type Props = NativeStackScreenProps<AppStackParamList, "WeeklyCheckIn">;

/** The short check-in keeps the health, nutrition and behavior steps. */
const SHORT_FORM_STEPS = 3;

/**
 * Weekly check-in wizard for an elderly profile, following the Figma flow: five
 * domain steps (health + acute events + vitals, nutrition/medication, behavior,
 * hygiene, stock & logistics) with a progress indicator, Voltar/Próximo
 * navigation and a final Concluir submit that returns to the elder's screen.
 * The question widgets live in components/checkin; this screen owns the wizard
 * state and flow. The check-in history is listed on the first step and opens
 * the read-only detail screen.
 *
 * The short version, chosen on the first step, stops after the behavior step.
 * It skips hygiene and the shopping list, which don't feed the score, so the
 * signals come out the same while the caregiver answers fewer questions.
 *
 * Every answer is saved as a draft for this user and elder, so leaving the
 * screen, closing the app or the session expiring mid-form loses nothing; the
 * draft is restored on the next visit and cleared once the check-in is sent.
 */
export function WeeklyCheckInScreen({ navigation, route }: Props) {
  const { profileId } = route.params;
  const { user } = useAuth();
  const userId = user?.id ?? 0;
  const { notify } = useNotification();

  const [step, setStep] = useState(1);
  const [shortForm, setShortForm] = useState(false);
  const steps = shortForm ? STEPS.slice(0, SHORT_FORM_STEPS) : STEPS;

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
  });
  const [lists, setLists] = useState<Record<string, string[]>>({
    needsMedications: [],
    needsHygiene: [],
    needsFood: [],
  });
  const [medicationNames, setMedicationNames] = useState<string[]>([]);
  const [appetite, setAppetite] = useState<Appetite | null>(null);
  const [mood, setMood] = useState<Mood | null>(null);
  const [stressLevel, setStressLevel] = useState(0);

  const [history, setHistory] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  // The render that applies the loaded draft is not an edit: saving it would
  // write an empty draft on every visit and reset a stored draft's age.
  const skipNextSave = useRef(true);
  const scrollRef = useRef<ScrollView>(null);
  const [draftRestored, setDraftRestored] = useState(false);

  useEffect(() => {
    let active = true;
    void loadDraft(userId, profileId).then((draft) => {
      if (!active) return;
      if (draft) {
        setStep(draft.step);
        setShortForm(draft.shortForm);
        setYesNo(draft.yesNo);
        setEvents(draft.events);
        setTexts(draft.texts);
        setLists(draft.lists);
        setAppetite(draft.appetite);
        setMood(draft.mood);
        setStressLevel(draft.stressLevel);
        setDraftRestored(true);
      }
      setDraftLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [userId, profileId]);

  // Saved on every edit once the stored draft has been read, so neither the
  // empty initial state nor a reopened draft is written back untouched.
  useEffect(() => {
    if (!draftLoaded) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    void saveDraft(userId, profileId, {
      step,
      shortForm,
      yesNo,
      events,
      texts,
      lists,
      appetite,
      mood,
      stressLevel,
    });
  }, [
    draftLoaded,
    userId,
    profileId,
    step,
    shortForm,
    yesNo,
    events,
    texts,
    lists,
    appetite,
    mood,
    stressLevel,
  ]);

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

      /**
       * The elder's registered medications, offered as one-tap suggestions in
       * the logistics step. A failure is swallowed: this only saves typing, and
       * an inventory that will not load should not surface an error in a form
       * that works perfectly well without it.
       */
      listMedications(profileId)
        .then((medications) => {
          if (active) setMedicationNames(medications.map((item) => item.name));
        })
        .catch(() => {});

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

  function setList(field: string, value: string[]) {
    setLists((current) => ({ ...current, [field]: value }));
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

  function pending(fields: string[]): number {
    return fields.filter((field) => yesNo[field] === null).length;
  }

  /** Questions of the current step still unanswered; Próximo waits for none. */
  function missingCount(): number {
    if (step === 1) {
      return pending([
        "skinIssues",
        "bowelRegular",
        "sleepWell",
        "unstableGait",
      ]);
    }
    if (step === 2) {
      return (
        (appetite === null ? 1 : 0) + pending(["hydrationGoal", "medsOnTime"])
      );
    }
    if (step === 3) {
      return (
        (mood === null ? 1 : 0) +
        pending(["sunExposure", "selfExpression", "stimulation"])
      );
    }
    if (step === 4) {
      return pending(["dailyBath", "oralHygiene", "groomedNails"]);
    }
    return 0;
  }

  const missing = missingCount();

  /**
   * Moves to another step, back at the top of the form, and tells screen
   * reader users where they landed.
   */
  function goToStep(next: number) {
    setStep(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    AccessibilityInfo.announceForAccessibility(
      `Etapa ${next} de ${steps.length}: ${steps[next - 1].title}`,
    );
  }

  function handleBack() {
    setError(null);
    if (step === 1) navigation.goBack();
    else goToStep(step - 1);
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
      dailyBath: shortForm ? null : yesNo.dailyBath === true,
      oralHygiene: shortForm ? null : yesNo.oralHygiene === true,
      groomedNails: shortForm ? null : yesNo.groomedNails === true,
      needsMedications: shortForm ? [] : lists.needsMedications,
      needsHygiene: shortForm ? [] : lists.needsHygiene,
      needsFood: shortForm ? [] : lists.needsFood,
      shortForm,
    };

    try {
      await createCheckIn(profileId, input);
      await clearDraft(userId, profileId);
      notify({
        title: "Check-in salvo",
        message: "As respostas da semana foram registradas.",
      });
      navigation.goBack();
    } catch {
      setError("Não foi possível salvar o check-in.");
    } finally {
      setSaving(false);
    }
  }

  const currentStep = steps[step - 1];

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.container}
        testID="checkin"
        keyboardShouldPersistTaps="handled"
      >
        <ProfileHeader profileId={profileId} />

        <View style={styles.stepHeader}>
          <Text testID="checkin-step-caption" style={styles.stepCaption}>
            {`Etapa ${step} de ${steps.length}`}
          </Text>
          <Text
            testID="checkin-title"
            style={styles.title}
            accessibilityRole="header"
          >
            {currentStep.title}
          </Text>
          <Text style={styles.stepSubtitle}>{currentStep.subtitle}</Text>
          <StepIndicator
            current={step}
            total={steps.length}
            onStepPress={goToStep}
          />
        </View>

        {draftRestored ? (
          <Text testID="checkin-draft-restored" style={styles.draftNotice}>
            Continuando de onde você parou.
          </Text>
        ) : null}

        {step === 1 ? (
          <>
            <View style={styles.shortForm}>
              <CheckboxRow
                testID="checkin-short"
                checked={shortForm}
                label="Check-in rápido (3 etapas)"
                onToggle={() => setShortForm((value) => !value)}
              />
              <Text style={styles.shortFormHint}>
                Pula higiene e lista de compras. Os sinais para a equipe são
                calculados do mesmo jeito.
              </Text>
            </View>

            <View style={styles.questions}>
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
            </View>

            <Section title="Intercorrências na semana" grouped>
              {WEEKLY_EVENTS.map((event) => (
                <EventToggleRow
                  key={event.key}
                  event={event}
                  selected={events.includes(event.key)}
                  onToggle={() => toggleEvent(event.key)}
                />
              ))}
            </Section>
            <TextInput
              testID="checkin-otherEvent"
              style={checkinStyles.input}
              accessibilityLabel="Outra intercorrência (opcional)"
              placeholder="Outra intercorrência (opcional)"
              placeholderTextColor={COLORS.grey400}
              value={texts.otherEvent}
              onChangeText={(value) => setText("otherEvent", value)}
            />
            {WEEKLY_EVENTS.some(
              (event) => event.critical && events.includes(event.key),
            ) ? (
              <EmergencyCallout />
            ) : null}

            <Section title="Sinais vitais">
              <Text style={styles.sectionHint}>
                Média da semana, se foram medidos. Pode deixar em branco.
              </Text>
              <View style={styles.vitalsGrid}>
                {VITALS.map((vital) => (
                  <View key={vital.key} style={styles.vitalField}>
                    <Text style={styles.fieldLabel}>
                      {vital.label} ({vital.unit})
                    </Text>
                    <TextInput
                      testID={`checkin-${vital.key}`}
                      style={checkinStyles.input}
                      accessibilityLabel={`${vital.label} (${vital.unit})`}
                      keyboardType={vital.keyboardType}
                      placeholder={vital.placeholder}
                      placeholderTextColor={COLORS.grey400}
                      value={texts[vital.key]}
                      onChangeText={(value) => setText(vital.key, value)}
                    />
                  </View>
                ))}
              </View>
            </Section>
          </>
        ) : null}

        {step === 2 ? (
          <View style={styles.questions}>
            <AnswerGroup
              question="Apetite predominante"
              value={appetite}
              onChange={setAppetite}
              options={APPETITE_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
                testID: `checkin-appetite-${option.value}`,
              }))}
            />
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
          <View style={styles.questions}>
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
          <View style={styles.questions}>
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
          <View style={styles.questions}>
            {LOGISTICS.map((section) => (
              <View key={section.key} style={styles.blockField}>
                <Text style={styles.fieldLabel}>{section.label}</Text>
                <TagListInput
                  testIDPrefix={`checkin-${section.key}`}
                  value={lists[section.key]}
                  onChange={(value) => setList(section.key, value)}
                  suggestions={
                    section.key === "needsMedications" ? medicationNames : []
                  }
                  placeholder={section.placeholder}
                  addAccessibilityLabel={`Adicionar em ${section.label}`}
                />
              </View>
            ))}
          </View>
        ) : null}

        {error ? (
          <FormError
            testID="checkin-error"
            style={styles.error}
            message={error}
          />
        ) : null}

        {step === 1 ? (
          <Section title="Check-ins anteriores">
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
            {history.length > 0 ? (
              <View testID="checkin-history" style={styles.history}>
                {history.map((item, index) => (
                  <View key={item.id}>
                    {index > 0 ? <View style={styles.divider} /> : null}
                    <ListRow
                      testID={`checkin-history-item-${item.id}`}
                      label={formatDay(item.date)}
                      caption={`Humor: ${moodLabel(item.mood)} · Estresse: ${item.stressLevel}`}
                      onPress={() =>
                        navigation.navigate("CheckInDetail", {
                          profileId,
                          checkInId: item.id,
                        })
                      }
                    />
                  </View>
                ))}
              </View>
            ) : null}
          </Section>
        ) : null}
      </ScrollView>

      <ActionBar
        testID="checkin-actions"
        note={
          step < steps.length && missing > 0 ? (
            <Text testID="checkin-missing" style={styles.hint}>
              {missing === 1
                ? "Responda a pergunta que falta para continuar."
                : `Responda as ${missing} perguntas que faltam para continuar.`}
            </Text>
          ) : null
        }
      >
        <PrimaryButton
          testID="checkin-back"
          title="Voltar"
          variant="outline"
          onPress={handleBack}
        />
        {step < steps.length ? (
          <PrimaryButton
            testID="checkin-next"
            title="Próximo"
            disabled={missing > 0}
            onPress={() => goToStep(step + 1)}
          />
        ) : (
          <PrimaryButton
            testID="checkin-submit"
            title="Concluir"
            loading={saving}
            onPress={handleSubmit}
          />
        )}
      </ActionBar>
    </View>
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
  stepHeader: {
    gap: SPACING.xs,
  },
  stepCaption: {
    ...TYPE.label,
    color: COLORS.primary,
  },
  title: {
    ...TYPE.title,
  },
  stepSubtitle: {
    ...TYPE.caption,
    marginBottom: SPACING.sm,
  },
  draftNotice: {
    ...TYPE.label,
    color: COLORS.primary,
  },
  shortForm: {
    gap: SPACING.xs,
  },
  shortFormHint: {
    ...TYPE.caption,
    marginLeft: 36,
  },
  questions: {
    gap: SPACING.xl,
  },
  sectionHint: {
    ...TYPE.caption,
  },
  fieldLabel: {
    ...TYPE.label,
  },
  blockField: {
    gap: SPACING.sm,
  },
  vitalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
  },
  vitalField: {
    flexBasis: "45%",
    flexGrow: 1,
    gap: SPACING.xs,
  },
  error: {
    ...TYPE.label,
    color: COLORS.danger,
    textAlign: "center",
  },
  hint: {
    ...TYPE.caption,
    textAlign: "center",
  },
  empty: {
    ...TYPE.body,
    color: COLORS.grey500,
  },
  history: {
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: RADIUS.group,
    overflow: "hidden",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
  },
});
