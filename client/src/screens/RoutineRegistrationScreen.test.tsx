import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RoutineRegistrationScreen } from "./RoutineRegistrationScreen";
import type { AppStackParamList } from "../types/navigation";
import {
  createRoutine,
  deleteRoutine,
  listRoutines,
  updateRoutine,
  type Routine,
} from "../api/routines";
import { getProfile, type Profile } from "../api/profiles";
import {
  getRiskStatus,
  subscribeRiskStatusInvalidation,
  type RiskStatus,
} from "../api/risk";

jest.mock("../api/routines");
jest.mock("../api/profiles");
jest.mock("../api/risk");
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

const MOCK_RISK: RiskStatus = {
  profileId: 5,
  status: "low",
  score: 0,
  evaluatedAt: "2026-06-15T00:00:00.000Z",
};

const MOCK_PROFILE: Profile = {
  id: 5,
  firstName: "Ozilene",
  lastName: "Leite",
  birthDate: "1947-11-05",
  sex: "Feminino",
  scholarship: "Superior completo",
  medicalConditions: [],
  notes: null,
  caregiverId: 1,
};

const SLEEP_ROUTINE: Routine = {
  id: 11,
  profileId: 5,
  title: "Rotina de sono",
  period: "geral",
  description: "Dorme às 21h",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

type Props = NativeStackScreenProps<AppStackParamList, "RoutineRegistration">;

function renderScreen(profileId = 5) {
  const navigation = { goBack: jest.fn(), navigate: jest.fn() };
  const props = {
    navigation,
    route: { params: { profileId } },
  } as unknown as Props;
  return { navigation, ...render(<RoutineRegistrationScreen {...props} />) };
}

describe("RoutineRegistrationScreen", () => {
  beforeEach(() => {
    jest.mocked(listRoutines).mockReset().mockResolvedValue([SLEEP_ROUTINE]);
    jest
      .mocked(createRoutine)
      .mockReset()
      .mockResolvedValue({} as never);
    jest
      .mocked(updateRoutine)
      .mockReset()
      .mockResolvedValue({} as never);
    jest.mocked(deleteRoutine).mockReset().mockResolvedValue(undefined);
    jest.mocked(getProfile).mockReset().mockResolvedValue(MOCK_PROFILE);
    jest.mocked(getRiskStatus).mockReset().mockResolvedValue(MOCK_RISK);
    jest
      .mocked(subscribeRiskStatusInvalidation)
      .mockReset()
      .mockReturnValue(() => {});
  });

  it("renders the fixed sections populated from the profile's routines", async () => {
    renderScreen(9);

    await waitFor(() => expect(listRoutines).toHaveBeenCalledWith(9));
    expect(screen.getByText("Rotina e aspectos relevantes")).toBeTruthy();
    expect(
      screen.getByTestId("routine-section-Rotina de sono").props.value,
    ).toBe("Dorme às 21h");
    expect(
      screen.getByTestId("routine-section-Medicamentos em uso").props.value,
    ).toBe("");
  });

  it("creates rows for newly filled sections and updates changed ones", async () => {
    renderScreen(9);
    await waitFor(() => expect(listRoutines).toHaveBeenCalled());

    fireEvent.changeText(
      screen.getByTestId("routine-section-Rotina de sono"),
      "Dorme às 22h",
    );
    fireEvent.changeText(
      screen.getByTestId("routine-section-Medicamentos em uso"),
      "Losartana 50mg às 8h",
    );
    fireEvent.press(screen.getByTestId("routine-save"));

    await waitFor(() =>
      expect(screen.getByTestId("routine-saved")).toBeTruthy(),
    );
    expect(updateRoutine).toHaveBeenCalledWith(9, 11, {
      title: "Rotina de sono",
      period: "geral",
      description: "Dorme às 22h",
    });
    expect(createRoutine).toHaveBeenCalledWith(9, {
      title: "Medicamentos em uso",
      period: "geral",
      description: "Losartana 50mg às 8h",
    });
    expect(deleteRoutine).not.toHaveBeenCalled();
  });

  it("deletes the row when a section is cleared", async () => {
    renderScreen(9);
    await waitFor(() => expect(listRoutines).toHaveBeenCalled());

    fireEvent.changeText(
      screen.getByTestId("routine-section-Rotina de sono"),
      "",
    );
    fireEvent.press(screen.getByTestId("routine-save"));

    await waitFor(() => expect(deleteRoutine).toHaveBeenCalledWith(9, 11));
  });

  it("shows an error when loading fails", async () => {
    jest.mocked(listRoutines).mockRejectedValueOnce(new Error("boom"));
    renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId("routine-error")).toBeTruthy(),
    );
  });

  it("shows an error when saving fails", async () => {
    jest.mocked(updateRoutine).mockRejectedValueOnce(new Error("boom"));
    renderScreen();
    await waitFor(() => expect(listRoutines).toHaveBeenCalled());

    fireEvent.changeText(
      screen.getByTestId("routine-section-Rotina de sono"),
      "Mudou",
    );
    fireEvent.press(screen.getByTestId("routine-save"));

    await waitFor(() =>
      expect(screen.getByTestId("routine-error")).toBeTruthy(),
    );
  });
});
