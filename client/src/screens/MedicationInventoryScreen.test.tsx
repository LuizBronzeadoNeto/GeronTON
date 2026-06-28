import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import { Alert } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MedicationInventoryScreen } from "./MedicationInventoryScreen";
import type { AppStackParamList } from "../types/navigation";
import {
  deleteMedication,
  listMedications,
  type Medication,
} from "../api/medications";

jest.mock("../api/medications");
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

type Props = NativeStackScreenProps<AppStackParamList, "MedicationInventory">;

function renderScreen(profileId = 5) {
  const navigation = {
    goBack: jest.fn(),
    navigate: jest.fn(),
  };
  const props = {
    navigation,
    route: { params: { profileId } },
  } as unknown as Props;
  return { navigation, ...render(<MedicationInventoryScreen {...props} />) };
}

const MOCK_MEDS: Medication[] = [
  {
    id: 1,
    profileId: 5,
    name: "Losartana",
    dosage: "50mg",
    frequency: "1x ao dia",
    notes: "Tomar pela manhã",
    createdAt: "2025-01-10",
    updatedAt: "2025-01-10",
  },
  {
    id: 2,
    profileId: 5,
    name: "Metformina",
    dosage: "850mg",
    frequency: "2x ao dia",
    notes: null,
    createdAt: "2025-01-10",
    updatedAt: "2025-02-01",
  },
];

describe("MedicationInventoryScreen", () => {
  beforeEach(() => {
    jest.mocked(listMedications).mockReset().mockResolvedValue(MOCK_MEDS);
    jest.mocked(deleteMedication).mockReset().mockResolvedValue(undefined);
  });

  it("renders the screen title", async () => {
    renderScreen();
    await waitFor(() =>
      expect(screen.getByTestId("medication-item-1")).toBeTruthy(),
    );
    expect(screen.getByText("Medicação de Uso Contínuo")).toBeTruthy();
    expect(screen.getByTestId("medication-add")).toBeTruthy();
  });

  it("loads medications from the API for the correct profile", async () => {
    renderScreen(9);

    await waitFor(() => expect(listMedications).toHaveBeenCalledWith(9));
  });

  it("renders medication items with name, dosage and frequency", async () => {
    renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId("medication-item-1")).toBeTruthy(),
    );
    expect(screen.getByTestId("medication-item-2")).toBeTruthy();
    expect(screen.getByText("Losartana")).toBeTruthy();
    expect(screen.getByText("Metformina")).toBeTruthy();
  });

  it("shows empty state when there are no medications", async () => {
    jest.mocked(listMedications).mockResolvedValue([]);
    renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId("medication-empty")).toBeTruthy(),
    );
    expect(screen.getByText("Nenhum medicamento cadastrado.")).toBeTruthy();
  });

  it("shows error message when loading fails", async () => {
    jest.mocked(listMedications).mockRejectedValueOnce(new Error("boom"));
    renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId("medication-error")).toBeTruthy(),
    );
  });

  it("navigates to MedicationForm when the add button is pressed", async () => {
    const { navigation } = renderScreen();
    await waitFor(() =>
      expect(screen.getByTestId("medication-item-1")).toBeTruthy(),
    );

    fireEvent.press(screen.getByTestId("medication-add"));

    expect(navigation.navigate).toHaveBeenCalledWith("MedicationForm", {
      profileId: 5,
    });
  });

  it("navigates to MedicationForm when a medication item is pressed", async () => {
    const { navigation } = renderScreen();
    await waitFor(() =>
      expect(screen.getByTestId("medication-item-1")).toBeTruthy(),
    );

    fireEvent.press(screen.getByText("Losartana"));

    expect(navigation.navigate).toHaveBeenCalledWith("MedicationForm", {
      profileId: 5,
      medicationId: 1,
    });
  });

  it("shows delete confirmation alert when remove is pressed", async () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    renderScreen();
    await waitFor(() =>
      expect(screen.getByTestId("medication-item-1")).toBeTruthy(),
    );

    fireEvent.press(screen.getByTestId("medication-delete-1"));

    expect(alertSpy).toHaveBeenCalledWith(
      "Remover medicamento",
      "Tem certeza que deseja remover este medicamento?",
      expect.any(Array),
    );
    alertSpy.mockRestore();
  });

  it("calls deleteMedication when the destructive button is pressed in the alert", async () => {
    const alertSpy = jest.spyOn(Alert, "alert");
    renderScreen();
    await waitFor(() =>
      expect(screen.getByTestId("medication-item-1")).toBeTruthy(),
    );

    fireEvent.press(screen.getByTestId("medication-delete-1"));

    const alertArgs = alertSpy.mock.calls[0];
    const alertButtons = alertArgs[2] as {
      text: string;
      onPress?: () => void;
      style?: string;
    }[];
    const removeButton = alertButtons.find((b) => b.style === "destructive");
    await removeButton?.onPress?.();

    expect(deleteMedication).toHaveBeenCalledWith(5, 1);
    alertSpy.mockRestore();
  });
});
