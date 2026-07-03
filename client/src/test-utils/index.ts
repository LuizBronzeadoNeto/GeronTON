import { jest } from "@jest/globals";
import type { Profile } from "../api/profiles";
import type { RiskStatus } from "../api/risk";
import { getRiskStatus, subscribeRiskStatusInvalidation } from "../api/risk";

/**
 * Module mock for @react-navigation/native shared by the screen tests: keeps
 * the real exports but replaces useFocusEffect with a plain effect, so screens
 * load their data on mount without needing a NavigationContainer. Use it as
 * `jest.mock("@react-navigation/native", () => mockNavigationModule())` — the
 * `mock` prefix lets Jest hoist the reference.
 */
export function mockNavigationModule() {
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
}

/**
 * Builds an elderly Profile fixture; pass overrides for the fields a test
 * cares about.
 */
export function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 5,
    firstName: "Ozilene",
    lastName: "Leite",
    birthDate: "1947-11-05",
    sex: "Feminino",
    scholarship: "Superior completo",
    medicalConditions: [],
    notes: null,
    caregiverId: 1,
    ...overrides,
  };
}

/**
 * Builds a RiskStatus fixture; pass overrides for the fields a test cares
 * about.
 */
export function makeRiskStatus(
  overrides: Partial<RiskStatus> = {},
): RiskStatus {
  return {
    profileId: 5,
    status: "low",
    score: 0,
    evaluatedAt: "2026-06-15T00:00:00.000Z",
    ...overrides,
  };
}

/**
 * Resets the risk API mocks to their happy path. The calling test file must
 * have declared `jest.mock("../api/risk")` for these to be jest mocks.
 */
export function mockRiskApi(risk: RiskStatus = makeRiskStatus()): void {
  jest.mocked(getRiskStatus).mockReset().mockResolvedValue(risk);
  jest
    .mocked(subscribeRiskStatusInvalidation)
    .mockReset()
    .mockReturnValue(() => {});
}
