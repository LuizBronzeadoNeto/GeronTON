import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  makeDashboardAlert,
  makeRiskStatus,
  makeTriageEntry,
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
import { listTriage } from "../api/triage";
import { listCheckIns } from "../api/checkins";
import { listDashboardAlerts } from "../api/alerts";

jest.mock("../api/triage");
jest.mock("../api/checkins");
jest.mock("../api/risk");
jest.mock("../api/alerts");
jest.mock("@react-navigation/native", () => mockNavigationModule());

const MOCK_ENTRY = makeTriageEntry({
  id: 1,
  caregiverId: 2,
  risk: { status: "high", score: 14, criticalEvents: [] },
});

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
    jest.mocked(listTriage).mockReset().mockResolvedValue([MOCK_ENTRY]);
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
    await waitFor(() =>
      expect(screen.getByTestId("risk-badge-label-1")).toBeTruthy(),
    );
    await waitFor(() =>
      expect(screen.getByText("Último check-in: -----")).toBeTruthy(),
    );
  });

  it("keeps the backend's clinical-priority ordering", async () => {
    jest.mocked(listTriage).mockResolvedValue([
      makeTriageEntry({
        id: 2,
        firstName: "Grave",
        risk: { status: "high", score: 12, criticalEvents: [] },
      }),
      makeTriageEntry({ id: 1, firstName: "Estável" }),
    ]);
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

  it("flags critical weekly events on the triage card", async () => {
    jest.mocked(listTriage).mockResolvedValue([
      makeTriageEntry({
        id: 3,
        risk: {
          status: "high",
          score: 15,
          criticalEvents: ["fever", "active_bleeding"],
        },
      }),
    ]);
    renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId("professional-critical-3")).toBeTruthy(),
    );
    expect(
      screen.getByText("Evento crítico na semana: Febre, Sangramento ativo"),
    ).toBeTruthy();
  });

  it("does not flag cards without critical weekly events", async () => {
    renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId("professional-item-1")).toBeTruthy(),
    );
    expect(screen.queryByTestId("professional-critical-1")).toBeNull();
  });

  it("marks weakened home bond alerts with the house icon", async () => {
    jest
      .mocked(listDashboardAlerts)
      .mockResolvedValue([
        makeDashboardAlert({ id: 31, type: "weakened_home_bond" }),
      ]);
    renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId("professional-alert-31")).toBeTruthy(),
    );
    expect(screen.getByTestId("alert-icon-weakened_home_bond")).toBeTruthy();
  });

  it("shows the risk-level legend under the triage cards", async () => {
    renderScreen();

    await waitFor(() => expect(screen.getByTestId("risk-legend")).toBeTruthy());
    expect(screen.getByText("Legenda dos níveis de risco")).toBeTruthy();
  });

  it("shows the empty state when there are no profiles", async () => {
    jest.mocked(listTriage).mockResolvedValue([]);
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
    await waitFor(() => expect(listTriage).toHaveBeenCalled());

    fireEvent.press(screen.getByTestId("professional-add"));

    expect(navigation.navigate).toHaveBeenCalledWith("ProfileForm");
  });
});
