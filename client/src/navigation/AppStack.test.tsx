import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react-native";
import { NavigationContainer } from "@react-navigation/native";
import { AppStack } from "./AppStack";
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
function renderStack(role: Role) {
  return render(
    <NavigationContainer>
      <AppStack role={role} />
    </NavigationContainer>,
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
