import { describe, it, expect, jest, beforeEach } from "@jest/globals";
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

jest.mock("../api/checkins");
jest.mock("../api/profiles");
jest.mock("../api/risk");
jest.mock("@react-navigation/native", () => mockNavigationModule());

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
  needsMedications: null,
  needsHygiene: null,
  needsFood: null,
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
  beforeEach(() => {
    jest.mocked(listCheckIns).mockReset().mockResolvedValue([]);
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
    expect(screen.getByText("Domínio saúde")).toBeTruthy();
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

    expect(screen.getByText("Estoque e Logística")).toBeTruthy();
    fireEvent.changeText(
      screen.getByTestId("checkin-needsMedications"),
      "Losartana",
    );
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
      needsMedications: "Losartana",
      needsHygiene: null,
      needsFood: null,
    });

    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
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
});
