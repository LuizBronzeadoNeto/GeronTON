import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MissedSignalFormScreen } from "./MissedSignalFormScreen";
import type { AppStackParamList } from "../types/navigation";
import { createMissedSignal } from "../api/missedSignals";
import { getProfile } from "../api/profiles";
import { makeProfile, mockRiskApi } from "../test-utils";

jest.mock("../api/missedSignals");
jest.mock("../api/profiles");
jest.mock("../api/risk");

type Props = NativeStackScreenProps<AppStackParamList, "MissedSignalForm">;

function renderScreen(profileId = 7) {
  const navigation = { goBack: jest.fn(), navigate: jest.fn() };
  const props = {
    navigation,
    route: { params: { profileId } },
  } as unknown as Props;
  return { navigation, ...render(<MissedSignalFormScreen {...props} />) };
}

function submitDisabled(): boolean {
  return screen.getByTestId("missed-submit").props.accessibilityState.disabled;
}

function fillForm(date = "30092026") {
  fireEvent.changeText(screen.getByTestId("missed-date"), date);
  fireEvent.press(screen.getByTestId("missed-severity-critical"));
  fireEvent.changeText(
    screen.getByTestId("missed-description"),
    "  Internada por pneumonia  ",
  );
}

describe("MissedSignalFormScreen", () => {
  beforeEach(() => {
    jest
      .mocked(createMissedSignal)
      .mockReset()
      .mockResolvedValue({} as never);
    jest.mocked(getProfile).mockReset().mockResolvedValue(makeProfile());
    mockRiskApi();
  });

  it("keeps submit disabled until every field is filled", () => {
    renderScreen();

    expect(submitDisabled()).toBe(true);
    fillForm();
    expect(submitDisabled()).toBe(false);
  });

  it("formats the date as it is typed", () => {
    renderScreen();

    fireEvent.changeText(screen.getByTestId("missed-date"), "30092026");

    expect(screen.getByTestId("missed-date").props.value).toBe("30/09/2026");
  });

  it("refuses a date in the future", () => {
    renderScreen();

    fillForm("01012999");

    expect(screen.getByTestId("missed-date-future")).toBeTruthy();
    expect(submitDisabled()).toBe(true);
  });

  it("sends the record and goes back", async () => {
    const { navigation } = renderScreen();

    fillForm();
    fireEvent.press(screen.getByTestId("missed-submit"));

    await waitFor(() =>
      expect(createMissedSignal).toHaveBeenCalledWith(7, {
        occurredAt: "2026-09-30",
        severity: "critical",
        description: "Internada por pneumonia",
      }),
    );
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it("shows an error and stays when saving fails", async () => {
    jest
      .mocked(createMissedSignal)
      .mockRejectedValue(new Error("boom") as never);
    const { navigation } = renderScreen();

    fillForm();
    fireEvent.press(screen.getByTestId("missed-submit"));

    await waitFor(() =>
      expect(screen.getByTestId("missed-error")).toBeTruthy(),
    );
    expect(navigation.goBack).not.toHaveBeenCalled();
  });
});
