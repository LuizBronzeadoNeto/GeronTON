import { describe, it, expect, jest, beforeEach } from "@jest/globals";
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

jest.mock("../api/checkins");

type Props = NativeStackScreenProps<AppStackParamList, "WeeklyCheckIn">;

function renderScreen(profileId = 5) {
  const navigation = { goBack: jest.fn(), navigate: jest.fn() };
  const props = {
    navigation,
    route: { params: { profileId } },
  } as unknown as Props;
  return { navigation, ...render(<WeeklyCheckInScreen {...props} />) };
}

describe("WeeklyCheckInScreen", () => {
  beforeEach(() => {
    jest.mocked(listCheckIns).mockReset().mockResolvedValue([]);
    jest
      .mocked(createCheckIn)
      .mockReset()
      .mockResolvedValue({} as never);
  });

  it("loads the profile's history on mount", async () => {
    renderScreen(9);

    await waitFor(() => expect(listCheckIns).toHaveBeenCalledWith(9));
    expect(screen.getByTestId("checkin-history-empty")).toBeTruthy();
  });

  it("submits a check-in with the entered values and refetches history", async () => {
    const created: CheckIn = {
      id: 1,
      profileId: 9,
      date: "2026-06-15T00:00:00.000Z",
      falls: 3,
      weightLoss: 2,
      choking: true,
      gaitImpairment: false,
      violenceSign: false,
      irregularSleep: false,
      socialIsolation: false,
      failedComms: false,
      memoryLoss: false,
    };
    jest
      .mocked(listCheckIns)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([created]);

    renderScreen(9);
    await waitFor(() => expect(listCheckIns).toHaveBeenCalledWith(9));

    fireEvent.changeText(screen.getByTestId("checkin-falls"), "3");
    fireEvent.changeText(screen.getByTestId("checkin-weightLoss"), "2");
    fireEvent(screen.getByTestId("checkin-choking"), "valueChange", true);

    fireEvent.press(screen.getByTestId("checkin-submit"));

    await waitFor(() => expect(createCheckIn).toHaveBeenCalled());
    expect(createCheckIn).toHaveBeenCalledWith(9, {
      falls: 3,
      weightLoss: 2,
      choking: true,
      gaitImpairment: false,
      violenceSign: false,
      irregularSleep: false,
      socialIsolation: false,
      failedComms: false,
      memoryLoss: false,
    });

    await waitFor(() =>
      expect(screen.getByTestId("checkin-history-item-1")).toBeTruthy(),
    );
    expect(listCheckIns).toHaveBeenCalledTimes(2);
  });

  it("shows an error when saving fails", async () => {
    jest.mocked(createCheckIn).mockRejectedValueOnce(new Error("boom"));

    renderScreen();
    await waitFor(() => expect(listCheckIns).toHaveBeenCalled());

    fireEvent.press(screen.getByTestId("checkin-submit"));

    await waitFor(() =>
      expect(screen.getByTestId("checkin-error")).toBeTruthy(),
    );
  });
});
