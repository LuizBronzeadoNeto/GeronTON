import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  makeProfile,
  makeRiskStatus,
  mockNavigationModule,
  mockRiskApi,
} from "../test-utils";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ProfileListScreen } from "./ProfileListScreen";
import type { AppStackParamList } from "../types/navigation";
import { listProfiles } from "../api/profiles";
import { listCheckIns } from "../api/checkins";

jest.mock("../api/profiles");
jest.mock("../api/checkins");
jest.mock("../api/risk");
jest.mock("@react-navigation/native", () => mockNavigationModule());

const MOCK_PROFILE = makeProfile({ id: 5 });

type Props = NativeStackScreenProps<AppStackParamList, "ProfileList">;

function renderScreen() {
  const navigation = { goBack: jest.fn(), navigate: jest.fn() };
  const props = { navigation, route: {} } as unknown as Props;
  return { navigation, ...render(<ProfileListScreen {...props} />) };
}

describe("ProfileListScreen", () => {
  beforeEach(() => {
    jest.mocked(listProfiles).mockReset().mockResolvedValue([MOCK_PROFILE]);
    jest.mocked(listCheckIns).mockReset().mockResolvedValue([]);
    mockRiskApi(makeRiskStatus({ profileId: 5, status: "high", score: 14 }));
  });

  it("lists the elders with their current status pill", async () => {
    renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId("profile-item-5")).toBeTruthy(),
    );
    expect(screen.getByText("Ozilene Leite")).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByTestId("risk-badge-label-5")).toBeTruthy(),
    );
    expect(screen.getAllByText("Crítico").length).toBeGreaterThan(0);
  });

  it("shows the risk-level legend under the list", async () => {
    renderScreen();

    await waitFor(() => expect(screen.getByTestId("risk-legend")).toBeTruthy());
    expect(screen.getByText("Legenda dos níveis de risco")).toBeTruthy();
    expect(screen.getByTestId("risk-legend-high")).toBeTruthy();
    expect(screen.getByTestId("risk-legend-unknown")).toBeTruthy();
  });

  it("opens the elder's detail hub from a card", async () => {
    const { navigation } = renderScreen();
    await waitFor(() =>
      expect(screen.getByTestId("profile-item-5")).toBeTruthy(),
    );

    fireEvent.press(screen.getByTestId("profile-item-5"));

    expect(navigation.navigate).toHaveBeenCalledWith("ProfileDetail", {
      profileId: 5,
    });
  });

  it("shows the empty state when there are no elders", async () => {
    jest.mocked(listProfiles).mockResolvedValue([]);
    renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId("profile-list-empty")).toBeTruthy(),
    );
  });

  it("shows an error when loading fails", async () => {
    jest.mocked(listProfiles).mockRejectedValueOnce(new Error("boom"));
    renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId("profile-list-error")).toBeTruthy(),
    );
  });
});
