import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CheckInDetailScreen } from "./CheckInDetailScreen";
import type { AppStackParamList } from "../types/navigation";
import { deleteCheckIn, getCheckIn, type CheckIn } from "../api/checkins";

jest.mock("../api/checkins");
jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual<typeof import("@react-navigation/native")>(
    "@react-navigation/native",
  );
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    ...actual,
    useFocusEffect: (callback: () => void) => {
      React.useEffect(() => {
        callback();
      }, [callback]);
    },
  };
});

const EXISTING: CheckIn = {
  id: 4,
  profileId: 9,
  date: "2026-06-15T00:00:00.000Z",
  skinIssues: true,
  bowelRegular: true,
  sleepWell: false,
  unstableGait: false,
  weeklyEvents: ["fever", "pain"],
  otherEvent: "Tontura",
  pressure: "130/85",
  saturation: "95%",
  glycemia: null,
  calfCircumference: null,
  appetite: "regular",
  chokingIncident: true,
  chokingFrequency: "2x na semana",
  breathShortness: false,
  hydrationGoal: true,
  medsOnTime: false,
  mood: "sad",
  stressLevel: 4,
  sunExposure: false,
  selfExpression: true,
  stimulation: true,
  dailyBath: true,
  oralHygiene: false,
  groomedNails: true,
  needsMedications: "Fraldas G",
  needsHygiene: null,
  needsFood: null,
};

type Props = NativeStackScreenProps<AppStackParamList, "CheckInDetail">;

function renderScreen(profileId = 9, checkInId = 4) {
  const navigation = { goBack: jest.fn(), navigate: jest.fn() };
  const props = {
    navigation,
    route: { params: { profileId, checkInId } },
  } as unknown as Props;
  return { navigation, ...render(<CheckInDetailScreen {...props} />) };
}

describe("CheckInDetailScreen", () => {
  beforeEach(() => {
    jest.mocked(getCheckIn).mockReset().mockResolvedValue(EXISTING);
    jest.mocked(deleteCheckIn).mockReset().mockResolvedValue(undefined);
  });

  it("loads the check-in and shows its domains read-only", async () => {
    renderScreen();

    await waitFor(() => expect(getCheckIn).toHaveBeenCalledWith(9, 4));
    expect(screen.getByTestId("checkin-detail-title")).toBeTruthy();
    expect(screen.getByText("Check-in de 2026-06-15")).toBeTruthy();
    expect(screen.getByText("Febre, Dor, Tontura")).toBeTruthy();
    expect(screen.getByText("130/85")).toBeTruthy();
    expect(screen.getByText("Triste")).toBeTruthy();
    expect(screen.getByText("2x na semana")).toBeTruthy();
    expect(screen.getByText("Fraldas G")).toBeTruthy();
  });

  it("deletes the check-in and goes back", async () => {
    const { navigation } = renderScreen();
    await waitFor(() => expect(getCheckIn).toHaveBeenCalled());

    fireEvent.press(screen.getByTestId("checkin-delete"));

    await waitFor(() => expect(deleteCheckIn).toHaveBeenCalledWith(9, 4));
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it("shows an error when loading fails", async () => {
    jest.mocked(getCheckIn).mockRejectedValueOnce(new Error("boom"));
    renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId("checkin-detail-error")).toBeTruthy(),
    );
  });

  it("shows an error when deleting fails", async () => {
    jest.mocked(deleteCheckIn).mockRejectedValueOnce(new Error("boom"));
    renderScreen();
    await waitFor(() => expect(getCheckIn).toHaveBeenCalled());

    fireEvent.press(screen.getByTestId("checkin-delete"));

    await waitFor(() =>
      expect(screen.getByTestId("checkin-detail-error")).toBeTruthy(),
    );
  });
});
