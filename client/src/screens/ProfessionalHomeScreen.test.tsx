import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ProfessionalHomeScreen } from "./ProfessionalHomeScreen";
import type { AppStackParamList } from "../types/navigation";
import { listProfiles, type Profile } from "../api/profiles";
import { listCheckIns } from "../api/checkins";
import {
  getRiskStatus,
  subscribeRiskStatusInvalidation,
  type RiskStatus,
} from "../api/risk";

jest.mock("../api/profiles");
jest.mock("../api/checkins");
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
  profileId: 1,
  status: "high",
  score: 8,
  evaluatedAt: "2026-06-15T00:00:00.000Z",
};

const MOCK_PROFILE: Profile = {
  id: 1,
  firstName: "Ozilene",
  lastName: "Leite",
  birthDate: "1947-11-05",
  sex: "Feminino",
  scholarship: "Superior completo",
  medicalConditions: [],
  notes: null,
  caregiverId: 2,
};

type Props = NativeStackScreenProps<AppStackParamList, "Home">;

function renderScreen() {
  const navigation = { goBack: jest.fn(), navigate: jest.fn() };
  const props = {
    navigation,
    route: { params: undefined },
  } as unknown as Props;
  return { navigation, ...render(<ProfessionalHomeScreen {...props} />) };
}

describe("ProfessionalHomeScreen", () => {
  beforeEach(() => {
    jest.mocked(listProfiles).mockReset().mockResolvedValue([MOCK_PROFILE]);
    jest.mocked(listCheckIns).mockReset().mockResolvedValue([]);
    jest.mocked(getRiskStatus).mockReset().mockResolvedValue(MOCK_RISK);
    jest
      .mocked(subscribeRiskStatusInvalidation)
      .mockReset()
      .mockReturnValue(() => {});
  });

  it("lists the profiles as triage cards with risk pill and last check-in", async () => {
    renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId("professional-item-1")).toBeTruthy(),
    );
    expect(screen.getByText("Ozilene Leite")).toBeTruthy();
    await waitFor(() => expect(screen.getByText("Crítico")).toBeTruthy());
    await waitFor(() =>
      expect(screen.getByText("Último check-in: -----")).toBeTruthy(),
    );
  });

  it("shows the empty state when there are no profiles", async () => {
    jest.mocked(listProfiles).mockResolvedValue([]);
    renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId("professional-empty")).toBeTruthy(),
    );
  });

  it("opens the elder's detail hub when a card is pressed", async () => {
    const { navigation } = renderScreen();
    await waitFor(() =>
      expect(screen.getByTestId("professional-item-1")).toBeTruthy(),
    );

    fireEvent.press(screen.getByTestId("professional-item-1"));

    expect(navigation.navigate).toHaveBeenCalledWith("ProfileDetail", {
      profileId: 1,
    });
  });

  it("navigates to the registration form from the add button", async () => {
    const { navigation } = renderScreen();
    await waitFor(() => expect(listProfiles).toHaveBeenCalled());

    fireEvent.press(screen.getByTestId("professional-add"));

    expect(navigation.navigate).toHaveBeenCalledWith("ProfileForm");
  });
});
