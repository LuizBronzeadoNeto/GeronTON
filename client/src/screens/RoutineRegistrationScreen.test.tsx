import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import { Alert } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RoutineRegistrationScreen } from "./RoutineRegistrationScreen";
import type { AppStackParamList } from "../types/navigation";
import {
  deleteRoutine,
  listRoutines,
  type Routine,
} from "../api/routines";

jest.mock("../api/routines");
jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual("@react-navigation/native");
  const React = jest.requireActual("react");
  return {
    ...actual,
    useFocusEffect: (callback: () => void) => {
      React.useEffect(() => {
        callback();
      }, []);
    },
  };
});

type Props = NativeStackScreenProps<AppStackParamList, "RoutineRegistration">;

function renderScreen(profileId = 5) {
  const navigation = {
    goBack: jest.fn(),
    navigate: jest.fn(),
  };
  const props = {
    navigation,
    route: { params: { profileId } },
  } as unknown as Props;
  return { navigation, ...render(<RoutineRegistrationScreen {...props} />) };
}

const MOCK_ROUTINES: Routine[] = [
  {
    id: 1,
    profileId: 5,
    title: "Caminhada matinal",
    period: "manhã",
    description: "30 minutos no parque",
    createdAt: "2025-01-10",
    updatedAt: "2025-01-10",
  },
  {
    id: 2,
    profileId: 5,
    title: "Alongamento",
    period: "tarde",
    description: null,
    createdAt: "2025-01-10",
    updatedAt: "2025-02-01",
  },
];

describe("RoutineRegistrationScreen", () => {
  beforeEach(() => {
    jest.mocked(listRoutines).mockReset().mockResolvedValue(MOCK_ROUTINES);
    jest
      .mocked(deleteRoutine)
      .mockReset()
      .mockResolvedValue(undefined);
  });

  it("renders the screen title", async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("routine-item-1")).toBeTruthy());
    expect(screen.getByText("Rotina e Aspectos Relevantes")).toBeTruthy();
    expect(screen.getByTestId("routine-add")).toBeTruthy();
  });

  it("loads routines from the API for the correct profile", async () => {
    renderScreen(9);

    await waitFor(() => expect(listRoutines).toHaveBeenCalledWith(9));
  });

  it("renders routine item summaries", async () => {
    renderScreen();

    await waitFor(() => expect(screen.getByTestId("routine-item-1")).toBeTruthy());
    expect(screen.getByTestId("routine-item-2")).toBeTruthy();
  });

  it("shows empty state when there are no routines", async () => {
    jest.mocked(listRoutines).mockResolvedValue([]);
    renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId("routine-empty")).toBeTruthy(),
    );
    expect(screen.getByText("Nenhuma rotina cadastrada.")).toBeTruthy();
  });

  it("shows error message when loading fails", async () => {
    jest.mocked(listRoutines).mockRejectedValueOnce(new Error("boom"));
    renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId("routine-error")).toBeTruthy(),
    );
  });

  it("navigates to RoutineForm when the add button is pressed", async () => {
    const { navigation } = renderScreen();
    await waitFor(() => expect(screen.getByTestId("routine-item-1")).toBeTruthy());

    fireEvent.press(screen.getByTestId("routine-add"));

    expect(navigation.navigate).toHaveBeenCalledWith("RoutineForm", {
      profileId: 5,
    });
  });

  it("navigates to RoutineForm when a routine item is pressed", async () => {
    const { navigation } = renderScreen();
    await waitFor(() => expect(screen.getByTestId("routine-item-1")).toBeTruthy());

    fireEvent.press(screen.getByText(/Caminhada matinal/));

    expect(navigation.navigate).toHaveBeenCalledWith("RoutineForm", {
      profileId: 5,
      routineId: 1,
    });
  });

  it("shows delete confirmation alert when remove is pressed", async () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("routine-item-1")).toBeTruthy());

    fireEvent.press(screen.getByTestId("routine-delete-1"));

    expect(alertSpy).toHaveBeenCalledWith(
      "Remover rotina",
      "Tem certeza que deseja remover esta rotina?",
      expect.any(Array),
    );
    alertSpy.mockRestore();
  });

  it("calls deleteRoutine when the destructive button is pressed in the alert", async () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("routine-item-1")).toBeTruthy());

    fireEvent.press(screen.getByTestId("routine-delete-1"));

    const alertArgs = alertSpy.mock.calls[0];
    const alertButtons = alertArgs[2] as Array<{
      text: string;
      onPress?: () => void;
      style?: string;
    }>;
    const removeButton = alertButtons.find((b) => b.style === "destructive");
    await removeButton?.onPress?.();

    expect(deleteRoutine).toHaveBeenCalledWith(5, 1);
    alertSpy.mockRestore();
  });
});
