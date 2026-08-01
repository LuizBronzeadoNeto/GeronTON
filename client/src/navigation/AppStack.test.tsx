import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppStack } from "./AppStack";
import { NotificationProvider } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";
import { listProfiles } from "../api/profiles";
import { listTriage } from "../api/triage";
import { listDashboardAlerts } from "../api/alerts";
import { listCheckIns } from "../api/checkins";
import { makeProfile, makeRiskStatus, mockRiskApi } from "../test-utils";
import type { Role } from "../types/auth";

jest.mock("../api/profiles");
jest.mock("../api/triage");
jest.mock("../api/alerts");
jest.mock("../api/checkins");
jest.mock("../api/risk");
jest.mock("../context/AuthContext");

/**
 * Landing-screen tests for the signed-in navigator, rendered inside a real
 * NavigationContainer so the assertions are about which screen actually mounts
 * rather than which navigation call was issued.
 *
 * Scope, stated honestly: these guard the role-to-landing-screen mapping — a
 * profissional reaching the triage panel, a cuidador being routed by how many
 * elders they have. They do **not** reproduce the dispatch-timing bug that
 * originally left professionals stuck on Redirect's spinner; that race does not
 * occur under this renderer, and reverting the fix leaves these tests green.
 * What prevents its return is the design: a profissional no longer navigates
 * away from an initial screen at all. Verifying the race itself requires
 * driving a real browser build.
 */
/**
 * Mirrors App.tsx: the navigator reads the bottom safe-area inset, so it needs a
 * provider. The metrics stand in for a device with a three-button navigation
 * bar, which is the case the inset padding exists for.
 */
const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 48 },
};

/**
 * Mirrors App.tsx's provider order. The NotificationProvider is not incidental:
 * screens reach it through useNotification, which throws outside a provider, so
 * leaving it out here would make the harness fail on a screen that works fine
 * in the app.
 */
function renderStack(role: Role) {
  return render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <NotificationProvider>
        <NavigationContainer>
          <AppStack role={role} />
        </NavigationContainer>
      </NotificationProvider>
    </SafeAreaProvider>,
  );
}

describe("AppStack landing screen", () => {
  beforeEach(() => {
    jest.mocked(useAuth).mockReturnValue({
      user: { id: 1, role: "profissional", token: "jwt" },
      isSigningIn: false,
      isRestoring: false,
      signIn: jest.fn<() => Promise<void>>(),
      signOut: jest.fn(),
    });
    jest.mocked(listTriage).mockResolvedValue([]);
    jest.mocked(listDashboardAlerts).mockResolvedValue([]);
    jest.mocked(listProfiles).mockResolvedValue([]);
    jest.mocked(listCheckIns).mockResolvedValue([]);
    mockRiskApi(makeRiskStatus());
  });

  it("lands a profissional on the triage panel, not the redirect spinner", async () => {
    renderStack("profissional");

    await waitFor(() =>
      expect(screen.getByTestId("professional-home")).toBeTruthy(),
    );
    expect(screen.queryByTestId("redirect-loading")).toBeNull();
  });

  it("routes a cuidador through Redirect to their profile list", async () => {
    jest.mocked(useAuth).mockReturnValue({
      user: { id: 2, role: "cuidador", token: "jwt" },
      isSigningIn: false,
      isRestoring: false,
      signIn: jest.fn<() => Promise<void>>(),
      signOut: jest.fn(),
    });
    jest
      .mocked(listProfiles)
      .mockResolvedValue([makeProfile({ id: 5 }), makeProfile({ id: 6 })]);

    renderStack("cuidador");

    await waitFor(() =>
      expect(screen.getByTestId("profile-list")).toBeTruthy(),
    );
  });

  it("sends a cuidador with no elders to the identification step", async () => {
    jest.mocked(useAuth).mockReturnValue({
      user: { id: 2, role: "cuidador", token: "jwt" },
      isSigningIn: false,
      isRestoring: false,
      signIn: jest.fn<() => Promise<void>>(),
      signOut: jest.fn(),
    });
    jest.mocked(listProfiles).mockResolvedValue([]);

    renderStack("cuidador");

    await waitFor(() =>
      expect(screen.getByTestId("profile-identification")).toBeTruthy(),
    );
  });
});
