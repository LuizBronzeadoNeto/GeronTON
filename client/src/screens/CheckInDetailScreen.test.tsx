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
import {
  deleteCheckIn,
  getCheckIn,
  updateCheckIn,
  type CheckIn,
} from "../api/checkins";

jest.mock("../api/checkins");

type Props = NativeStackScreenProps<AppStackParamList, "CheckInDetail">;

const EXISTING: CheckIn = {
  id: 4,
  profileId: 9,
  date: "2026-06-15T00:00:00.000Z",
  falls: 2,
  weightLoss: 1.5,
  choking: false,
  gaitImpairment: true,
  violenceSign: false,
  irregularSleep: true,
  socialIsolation: false,
  failedComms: false,
  memoryLoss: true,
};

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
    jest
      .mocked(updateCheckIn)
      .mockReset()
      .mockResolvedValue({} as never);
    jest.mocked(deleteCheckIn).mockReset().mockResolvedValue(undefined);
  });

  it("loads the check-in and populates the form", async () => {
    renderScreen();

    await waitFor(() => expect(getCheckIn).toHaveBeenCalledWith(9, 4));
    expect(screen.getByTestId("checkin-falls").props.value).toBe("2");
    expect(screen.getByTestId("checkin-weightLoss").props.value).toBe("1.5");
    expect(screen.getByTestId("checkin-gaitImpairment").props.value).toBe(true);
  });

  it("saves edits and goes back", async () => {
    const { navigation } = renderScreen();
    await waitFor(() => expect(getCheckIn).toHaveBeenCalled());

    fireEvent.changeText(screen.getByTestId("checkin-falls"), "5");
    fireEvent(screen.getByTestId("checkin-choking"), "valueChange", true);
    fireEvent.press(screen.getByTestId("checkin-detail-save"));

    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
    expect(updateCheckIn).toHaveBeenCalledWith(9, 4, {
      falls: 5,
      weightLoss: 1.5,
      choking: true,
      gaitImpairment: true,
      violenceSign: false,
      irregularSleep: true,
      socialIsolation: false,
      failedComms: false,
      memoryLoss: true,
    });
  });

  it("deletes the check-in and goes back", async () => {
    const { navigation } = renderScreen();
    await waitFor(() => expect(getCheckIn).toHaveBeenCalled());

    fireEvent.press(screen.getByTestId("checkin-delete"));

    await waitFor(() => expect(deleteCheckIn).toHaveBeenCalledWith(9, 4));
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it("shows an error when saving fails", async () => {
    jest.mocked(updateCheckIn).mockRejectedValueOnce(new Error("boom"));
    renderScreen();
    await waitFor(() => expect(getCheckIn).toHaveBeenCalled());

    fireEvent.press(screen.getByTestId("checkin-detail-save"));

    await waitFor(() =>
      expect(screen.getByTestId("checkin-detail-error")).toBeTruthy(),
    );
  });
});
