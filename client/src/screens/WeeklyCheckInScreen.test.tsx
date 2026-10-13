import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { AccessibilityInfo } from "react-native";
import * as SecureStore from "expo-secure-store";
import { makeProfile, mockNavigationModule, mockRiskApi } from "../test-utils";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { WeeklyCheckInScreen } from "./WeeklyCheckInScreen";
import type { AppStackParamList } from "../types/navigation";
import { createCheckIn, listCheckIns, type CheckIn } from "../api/checkins";
import { getProfile } from "../api/profiles";
import { listMedications, type Medication } from "../api/medications";
import {
  clearDraft,
  loadDraft,
  saveDraft,
  type CheckInDraft,
} from "../utils/checkInDraft";

jest.mock("../api/checkins");
jest.mock("../api/profiles");
jest.mock("../api/medications");
jest.mock("../api/risk");

jest.mock("@react-navigation/native", () => mockNavigationModule());
jest.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: 1, role: "cuidador" } }),
}));
const mockNotify = jest.fn();
jest.mock("../context/NotificationContext", () => ({
  useNotification: () => ({ notify: mockNotify }),
}));

/** The wizard's initial answers, as a stored draft. */
const EMPTY_DRAFT: CheckInDraft = {
  step: 1,
  shortForm: false,
  yesNo: {
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
  },
  events: [],
  texts: {
    otherEvent: "",
    pressure: "",
    saturation: "",
    glycemia: "",
    calfCircumference: "",
    chokingFrequency: "",
  },
  lists: { needsMedications: [], needsHygiene: [], needsFood: [] },
  appetite: null,
  mood: null,
  stressLevel: 0,
};

function makeMedication(name: string): Medication {
  return {
    id: name.length,
    profileId: 5,
    name,
    dosage: "50mg",
    frequency: "1x ao dia",
    notes: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  };
}

const MOCK_PROFILE = makeProfile();

const MOCK_CHECKIN: CheckIn = {
  id: 1,
  profileId: 5,
  date: "2026-06-15T00:00:00.000Z",
  skinIssues: false,
  bowelRegular: true,
  sleepWell: true,
  unstableGait: false,
  weeklyEvents: ["fever"],
  otherEvent: null,
  pressure: "120/80",
  saturation: null,
  glycemia: null,
  calfCircumference: null,
  appetite: "good",
  chokingIncident: false,
  chokingFrequency: null,
  breathShortness: false,
  hydrationGoal: true,
  medsOnTime: true,
  mood: "happy",
  stressLevel: 2,
  sunExposure: true,
  selfExpression: true,
  stimulation: false,
  dailyBath: true,
  oralHygiene: true,
  groomedNails: true,
  needsMedications: [],
  needsHygiene: [],
  needsFood: [],
};

type Props = NativeStackScreenProps<AppStackParamList, "WeeklyCheckIn">;

function renderScreen(profileId = 5) {
  const navigation = { goBack: jest.fn(), navigate: jest.fn() };
  const props = {
    navigation,
    route: { params: { profileId } },
  } as unknown as Props;
  return { navigation, ...render(<WeeklyCheckInScreen {...props} />) };
}

function answerStep1() {
  fireEvent.press(screen.getByTestId("checkin-skinIssues-no"));
  fireEvent.press(screen.getByTestId("checkin-bowelRegular-yes"));
  fireEvent.press(screen.getByTestId("checkin-sleepWell-yes"));
  fireEvent.press(screen.getByTestId("checkin-unstableGait-no"));
}

function completeWizardUntilLastStep() {
  answerStep1();
  fireEvent.press(screen.getByTestId("checkin-event-fever"));
  fireEvent.press(screen.getByTestId("checkin-next"));

  fireEvent.press(screen.getByTestId("checkin-appetite-good"));
  fireEvent.press(screen.getByTestId("checkin-hydrationGoal-yes"));
  fireEvent.press(screen.getByTestId("checkin-medsOnTime-yes"));
  fireEvent.press(screen.getByTestId("checkin-next"));

  fireEvent.press(screen.getByTestId("checkin-mood-happy"));
  fireEvent.press(screen.getByTestId("checkin-stress-2"));
  fireEvent.press(screen.getByTestId("checkin-sunExposure-yes"));
  fireEvent.press(screen.getByTestId("checkin-selfExpression-yes"));
  fireEvent.press(screen.getByTestId("checkin-stimulation-no"));
  fireEvent.press(screen.getByTestId("checkin-next"));

  fireEvent.press(screen.getByTestId("checkin-dailyBath-yes"));
  fireEvent.press(screen.getByTestId("checkin-oralHygiene-yes"));
  fireEvent.press(screen.getByTestId("checkin-groomedNails-yes"));
  fireEvent.press(screen.getByTestId("checkin-next"));
}

describe("WeeklyCheckInScreen", () => {
  beforeEach(async () => {
    await clearDraft(1, 5);
    await clearDraft(1, 9);
    mockNotify.mockReset();
    jest.mocked(listCheckIns).mockReset().mockResolvedValue([]);
    jest.mocked(listMedications).mockReset().mockResolvedValue([]);
    jest
      .mocked(createCheckIn)
      .mockReset()
      .mockResolvedValue({} as never);
    jest.mocked(getProfile).mockReset().mockResolvedValue(MOCK_PROFILE);
    mockRiskApi();
  });

  it("loads the profile's history on mount and shows the first domain", async () => {
    renderScreen(9);

    await waitFor(() => expect(listCheckIns).toHaveBeenCalledWith(9));
    expect(screen.getByTestId("checkin-history-empty")).toBeTruthy();
    expect(screen.getByText("Saúde")).toBeTruthy();
  });

  it("keeps Próximo disabled until the step's questions are answered", async () => {
    renderScreen();
    await waitFor(() => expect(listCheckIns).toHaveBeenCalled());

    expect(
      screen.getByTestId("checkin-next").props.accessibilityState.disabled,
    ).toBe(true);

    answerStep1();

    expect(
      screen.getByTestId("checkin-next").props.accessibilityState.disabled,
    ).toBe(false);
  });

  it("walks the five steps and submits the answers", async () => {
    const { navigation } = renderScreen(9);
    await waitFor(() => expect(listCheckIns).toHaveBeenCalled());

    completeWizardUntilLastStep();

    expect(screen.getByText("Compras da semana")).toBeTruthy();
    fireEvent.changeText(
      screen.getByTestId("checkin-needsMedications-input"),
      "Losartana",
    );
    fireEvent.press(screen.getByTestId("checkin-needsMedications-add"));
    fireEvent.press(screen.getByTestId("checkin-submit"));

    await waitFor(() => expect(createCheckIn).toHaveBeenCalled());
    expect(createCheckIn).toHaveBeenCalledWith(9, {
      skinIssues: false,
      bowelRegular: true,
      sleepWell: true,
      unstableGait: false,
      weeklyEvents: ["fever"],
      otherEvent: null,
      pressure: null,
      saturation: null,
      glycemia: null,
      calfCircumference: null,
      appetite: "good",
      chokingIncident: false,
      chokingFrequency: null,
      breathShortness: false,
      hydrationGoal: true,
      medsOnTime: true,
      mood: "happy",
      stressLevel: 2,
      sunExposure: true,
      selfExpression: true,
      stimulation: false,
      dailyBath: true,
      oralHygiene: true,
      groomedNails: true,
      needsMedications: ["Losartana"],
      needsHygiene: [],
      needsFood: [],
      shortForm: false,
    });

    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
    expect(mockNotify).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Check-in salvo" }),
    );
    expect(await loadDraft(1, 9)).toBeNull();
  });

  it("restores the answers saved in a draft", async () => {
    await saveDraft(1, 5, { ...EMPTY_DRAFT, step: 2 });
    renderScreen();

    expect(await screen.findByTestId("checkin-draft-restored")).toBeTruthy();
    expect(screen.getByTestId("checkin-hydrationGoal-yes")).toBeTruthy();
  });

  it("restores a draft's answers as checked radios", async () => {
    await saveDraft(1, 5, {
      ...EMPTY_DRAFT,
      yesNo: { ...EMPTY_DRAFT.yesNo, skinIssues: true },
    });
    renderScreen();

    await waitFor(() =>
      expect(
        screen.getByTestId("checkin-skinIssues-yes").props.accessibilityState
          .checked,
      ).toBe(true),
    );
  });

  it("exposes Sim/Não as radios with a checked state", async () => {
    renderScreen();
    await waitFor(() => expect(listCheckIns).toHaveBeenCalled());

    fireEvent.press(screen.getByTestId("checkin-skinIssues-yes"));

    expect(
      screen.getByTestId("checkin-skinIssues-yes").props.accessibilityState
        .checked,
    ).toBe(true);
    expect(
      screen.getByTestId("checkin-skinIssues-no").props.accessibilityState
        .checked,
    ).toBe(false);
  });

  it("labels the vital-sign inputs with their units", async () => {
    renderScreen();
    await waitFor(() => expect(listCheckIns).toHaveBeenCalled());

    expect(screen.getByLabelText("Pressão (mmHg)")).toBeTruthy();
    expect(screen.getByLabelText("Panturrilha esquerda (cm)")).toBeTruthy();
  });

  it("says how many questions are left before Próximo unlocks", async () => {
    renderScreen();
    await waitFor(() => expect(listCheckIns).toHaveBeenCalled());

    expect(screen.getByTestId("checkin-missing").props.children).toBe(
      "Responda as 4 perguntas que faltam para continuar.",
    );

    fireEvent.press(screen.getByTestId("checkin-skinIssues-no"));
    fireEvent.press(screen.getByTestId("checkin-bowelRegular-yes"));
    fireEvent.press(screen.getByTestId("checkin-sleepWell-yes"));
    expect(screen.getByTestId("checkin-missing").props.children).toBe(
      "Responda a pergunta que falta para continuar.",
    );

    fireEvent.press(screen.getByTestId("checkin-unstableGait-no"));
    expect(screen.queryByTestId("checkin-missing")).toBeNull();
  });

  it("announces the new step when moving forward", async () => {
    const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
    renderScreen();
    await waitFor(() => expect(listCheckIns).toHaveBeenCalled());

    answerStep1();
    fireEvent.press(screen.getByTestId("checkin-next"));

    expect(announce).toHaveBeenCalledWith(
      expect.stringMatching(/^Etapa 2 de 5/),
    );
  });

  it("does not save a draft when the screen is only opened", async () => {
    renderScreen();
    await waitFor(() => expect(listCheckIns).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(await loadDraft(1, 5)).toBeNull();
  });

  it("does not show an untouched restored draft as new progress", async () => {
    await saveDraft(1, 5, { ...EMPTY_DRAFT, events: ["fever"] });
    const savedBefore = await SecureStore.getItemAsync(
      "geronton.checkin-draft.1.5",
    );
    renderScreen();
    await screen.findByTestId("checkin-draft-restored");
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Reopening must not rewrite the draft, or its age would reset and a
    // weeks-old answer could be sent as this week's.
    expect(await SecureStore.getItemAsync("geronton.checkin-draft.1.5")).toBe(
      savedBefore,
    );
  });

  it("saves the answers as a draft while the caregiver fills them in", async () => {
    renderScreen();
    await waitFor(() => expect(listCheckIns).toHaveBeenCalled());

    fireEvent.press(screen.getByTestId("checkin-event-fever"));

    await waitFor(async () =>
      expect((await loadDraft(1, 5))?.events).toEqual(["fever"]),
    );
  });

  it("offers the elder's registered medications as one-tap suggestions", async () => {
    jest
      .mocked(listMedications)
      .mockResolvedValue([
        makeMedication("Losartana"),
        makeMedication("Enalapril"),
      ]);

    renderScreen(9);
    await waitFor(() => expect(listMedications).toHaveBeenCalledWith(9));

    completeWizardUntilLastStep();
    fireEvent.press(screen.getByTestId("checkin-needsMedications-Losartana"));
    fireEvent.press(screen.getByTestId("checkin-submit"));

    await waitFor(() => expect(createCheckIn).toHaveBeenCalled());
    expect(createCheckIn).toHaveBeenCalledWith(
      9,
      expect.objectContaining({ needsMedications: ["Losartana"] }),
    );
  });

  /**
   * The suggestions only save typing, so an inventory that fails to load must
   * leave the step working rather than surface an error.
   */
  it("keeps the step usable when the medication inventory fails to load", async () => {
    jest.mocked(listMedications).mockRejectedValue(new Error("offline"));

    renderScreen(9);
    await waitFor(() => expect(listCheckIns).toHaveBeenCalled());

    completeWizardUntilLastStep();

    expect(screen.queryByTestId("checkin-error")).toBeNull();
    fireEvent.changeText(
      screen.getByTestId("checkin-needsMedications-input"),
      "Dipirona",
    );
    fireEvent.press(screen.getByTestId("checkin-needsMedications-add"));

    expect(
      screen.getByTestId("checkin-needsMedications-remove-Dipirona"),
    ).toBeTruthy();
  });

  it("reveals the choking sub-questions when the radio is toggled on", async () => {
    renderScreen();
    await waitFor(() => expect(listCheckIns).toHaveBeenCalled());

    answerStep1();
    fireEvent.press(screen.getByTestId("checkin-next"));

    expect(screen.queryByTestId("checkin-chokingFrequency")).toBeNull();

    fireEvent.press(screen.getByTestId("checkin-chokingIncident"));

    expect(screen.getByTestId("checkin-chokingFrequency")).toBeTruthy();
    expect(screen.getByTestId("checkin-breathShortness")).toBeTruthy();

    fireEvent.press(screen.getByTestId("checkin-chokingIncident"));

    expect(screen.queryByTestId("checkin-chokingFrequency")).toBeNull();
  });

  it("submits choking details when the incident is reported", async () => {
    renderScreen(9);
    await waitFor(() => expect(listCheckIns).toHaveBeenCalled());

    answerStep1();
    fireEvent.press(screen.getByTestId("checkin-next"));

    fireEvent.press(screen.getByTestId("checkin-appetite-good"));
    fireEvent.press(screen.getByTestId("checkin-chokingIncident"));
    fireEvent.changeText(
      screen.getByTestId("checkin-chokingFrequency"),
      "2x na semana",
    );
    fireEvent.press(screen.getByTestId("checkin-breathShortness"));
    fireEvent.press(screen.getByTestId("checkin-hydrationGoal-yes"));
    fireEvent.press(screen.getByTestId("checkin-medsOnTime-yes"));
    fireEvent.press(screen.getByTestId("checkin-next"));

    fireEvent.press(screen.getByTestId("checkin-mood-happy"));
    fireEvent.press(screen.getByTestId("checkin-stress-2"));
    fireEvent.press(screen.getByTestId("checkin-sunExposure-yes"));
    fireEvent.press(screen.getByTestId("checkin-selfExpression-yes"));
    fireEvent.press(screen.getByTestId("checkin-stimulation-no"));
    fireEvent.press(screen.getByTestId("checkin-next"));

    fireEvent.press(screen.getByTestId("checkin-dailyBath-yes"));
    fireEvent.press(screen.getByTestId("checkin-oralHygiene-yes"));
    fireEvent.press(screen.getByTestId("checkin-groomedNails-yes"));
    fireEvent.press(screen.getByTestId("checkin-next"));

    fireEvent.press(screen.getByTestId("checkin-submit"));

    await waitFor(() => expect(createCheckIn).toHaveBeenCalled());
    expect(createCheckIn).toHaveBeenCalledWith(
      9,
      expect.objectContaining({
        chokingIncident: true,
        chokingFrequency: "2x na semana",
        breathShortness: true,
      }),
    );
  });

  it("shows an error when saving fails", async () => {
    jest.mocked(createCheckIn).mockRejectedValueOnce(new Error("boom"));
    renderScreen();
    await waitFor(() => expect(listCheckIns).toHaveBeenCalled());

    completeWizardUntilLastStep();
    fireEvent.press(screen.getByTestId("checkin-submit"));

    await waitFor(() =>
      expect(screen.getByTestId("checkin-error")).toBeTruthy(),
    );
  });

  it("opens a history item's detail when pressed", async () => {
    jest.mocked(listCheckIns).mockReset().mockResolvedValue([MOCK_CHECKIN]);

    const { navigation } = renderScreen(9);
    await waitFor(() =>
      expect(screen.getByTestId("checkin-history-item-1")).toBeTruthy(),
    );

    fireEvent.press(screen.getByTestId("checkin-history-item-1"));

    expect(navigation.navigate).toHaveBeenCalledWith("CheckInDetail", {
      profileId: 9,
      checkInId: 1,
    });
  });

  it("finishes the short check-in after three steps", async () => {
    renderScreen(9);
    await waitFor(() => expect(listCheckIns).toHaveBeenCalled());

    fireEvent.press(screen.getByTestId("checkin-short"));
    answerStep1();
    fireEvent.press(screen.getByTestId("checkin-next"));

    fireEvent.press(screen.getByTestId("checkin-appetite-good"));
    fireEvent.press(screen.getByTestId("checkin-hydrationGoal-yes"));
    fireEvent.press(screen.getByTestId("checkin-medsOnTime-yes"));
    fireEvent.press(screen.getByTestId("checkin-next"));

    fireEvent.press(screen.getByTestId("checkin-mood-happy"));
    fireEvent.press(screen.getByTestId("checkin-sunExposure-yes"));
    fireEvent.press(screen.getByTestId("checkin-selfExpression-yes"));
    fireEvent.press(screen.getByTestId("checkin-stimulation-yes"));

    expect(screen.queryByTestId("checkin-next")).toBeNull();
    fireEvent.press(screen.getByTestId("checkin-submit"));

    await waitFor(() => expect(createCheckIn).toHaveBeenCalled());
    expect(createCheckIn).toHaveBeenCalledWith(
      9,
      expect.objectContaining({
        shortForm: true,
        dailyBath: null,
        oralHygiene: null,
        groomedNails: null,
        needsMedications: [],
        needsHygiene: [],
        needsFood: [],
      }),
    );
  });

  it("shows the emergency callout when a critical weekly event is ticked", async () => {
    renderScreen();
    await waitFor(() => expect(listCheckIns).toHaveBeenCalled());

    expect(screen.queryByTestId("emergency-callout")).toBeNull();
    fireEvent.press(screen.getByTestId("checkin-event-active_bleeding"));
    expect(screen.getByTestId("emergency-callout")).toBeTruthy();
  });
});
