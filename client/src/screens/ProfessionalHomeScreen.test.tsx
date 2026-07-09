import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  makeDashboardAlert,
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
import { ProfessionalHomeScreen } from "./ProfessionalHomeScreen";
import type { AppStackParamList } from "../types/navigation";
import { listProfiles } from "../api/profiles";
import { listCheckIns } from "../api/checkins";
import { listDashboardAlerts } from "../api/alerts";
import { getRiskStatus } from "../api/risk";

jest.mock("../api/profiles");
jest.mock("../api/checkins");
jest.mock("../api/risk");
jest.mock("../api/alerts");
jest.mock("@react-navigation/native", () => mockNavigationModule());

const MOCK_PROFILE = makeProfile({ id: 1, caregiverId: 2 });

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
    jest.mocked(listDashboardAlerts).mockReset().mockResolvedValue([]);
    mockRiskApi(makeRiskStatus({ profileId: 1, status: "high", score: 14 }));
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

  it("orders the triage cards by clinical priority", async () => {
    jest
      .mocked(listProfiles)
      .mockResolvedValue([
        makeProfile({ id: 1, firstName: "Estável" }),
        makeProfile({ id: 2, firstName: "Grave" }),
      ]);
    jest.mocked(getRiskStatus).mockImplementation(async (profileId: number) =>
      makeRiskStatus({
        profileId,
        status: profileId === 2 ? "high" : "low",
      }),
    );
    renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId("professional-item-2")).toBeTruthy(),
    );

    const cards = screen.getAllByTestId(/^professional-item-/);
    expect(cards.map((card) => card.props.testID)).toEqual([
      "professional-item-2",
      "professional-item-1",
    ]);
  });

  it("shows the unresolved alerts above the triage cards", async () => {
    jest.mocked(listDashboardAlerts).mockResolvedValue([
      makeDashboardAlert({
        id: 31,
        profileId: 1,
        profile: { id: 1, firstName: "Ozilene", lastName: "Leite" },
      }),
    ]);
    renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId("professional-alert-31")).toBeTruthy(),
    );
    expect(
      screen.getByText(
        "Vínculo Domiciliar Fragilizado: sem check-in semanal há 4 semanas.",
      ),
    ).toBeTruthy();
    expect(screen.getAllByText("Ozilene Leite").length).toBeGreaterThan(0);
  });

  it("opens the elder's hub when an alert is pressed", async () => {
    jest
      .mocked(listDashboardAlerts)
      .mockResolvedValue([makeDashboardAlert({ id: 31, profileId: 1 })]);
    const { navigation } = renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId("professional-alert-31")).toBeTruthy(),
    );
    fireEvent.press(screen.getByTestId("professional-alert-31"));

    expect(navigation.navigate).toHaveBeenCalledWith("ProfileDetail", {
      profileId: 1,
    });
  });

  it("shows an alerts error without blocking the triage list", async () => {
    jest
      .mocked(listDashboardAlerts)
      .mockRejectedValue(new Error("boom") as never);
    renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId("professional-alerts-error")).toBeTruthy(),
    );
    await waitFor(() =>
      expect(screen.getByTestId("professional-item-1")).toBeTruthy(),
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
