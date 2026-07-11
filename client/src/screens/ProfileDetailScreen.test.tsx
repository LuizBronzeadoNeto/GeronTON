import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  makeAlert,
  makeCheckIn,
  makeProfile,
  makeProfileDetails,
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
import { ProfileDetailScreen } from "./ProfileDetailScreen";
import type { AppStackParamList } from "../types/navigation";
import type { Role } from "../types/auth";
import { useAuth } from "../context/AuthContext";
import { getProfileDetails, updateProfile } from "../api/profiles";
import { resolveAlert } from "../api/alerts";
import {
  deleteIntercorrence,
  listIntercorrences,
  type Intercorrence,
} from "../api/intercorrences";

jest.mock("../api/profiles");
jest.mock("../api/intercorrences");
jest.mock("../api/risk");
jest.mock("../api/alerts");
jest.mock("../context/AuthContext");
jest.mock("@react-navigation/native", () => mockNavigationModule());

function mockSignedInAs(role: Role) {
  jest.mocked(useAuth).mockReturnValue({
    user: { id: 99, role, token: "test-token" },
    isSigningIn: false,
    signIn: jest.fn(async () => {}),
    signOut: jest.fn(),
  });
}

const MOCK_PROFILE = makeProfile({
  id: 7,
  birthDate: "1947-11-05T00:00:00.000Z",
  scholarship: "Superior Completo",
  medicalConditions: ["Diabetes", "Sarcopenia"],
});

const RECENT_FALL: Intercorrence = {
  id: 21,
  profileId: 7,
  date: new Date().toISOString(),
  eventType: "fall",
  isCritical: true,
  description: "Foi feio",
};

const OLD_CONFUSION: Intercorrence = {
  id: 22,
  profileId: 7,
  date: "2026-02-16T10:13:22.000Z",
  eventType: "confusion",
  isCritical: false,
  description: "",
};

type Props = NativeStackScreenProps<AppStackParamList, "ProfileDetail">;

function renderScreen(profileId = 7) {
  const navigation = { goBack: jest.fn(), navigate: jest.fn() };
  const props = {
    navigation,
    route: { params: { profileId } },
  } as unknown as Props;
  return { navigation, ...render(<ProfileDetailScreen {...props} />) };
}

describe("ProfileDetailScreen", () => {
  beforeEach(() => {
    jest
      .mocked(getProfileDetails)
      .mockReset()
      .mockResolvedValue(
        makeProfileDetails({
          profile: MOCK_PROFILE,
          latestCheckIn: makeCheckIn({
            id: 40,
            profileId: 7,
            date: "2026-07-06T00:00:00.000Z",
            mood: "sad",
            appetite: "regular",
            weeklyEvents: ["fever"],
          }),
        }),
      );
    jest
      .mocked(updateProfile)
      .mockReset()
      .mockResolvedValue({} as never);
    jest
      .mocked(listIntercorrences)
      .mockReset()
      .mockResolvedValue([RECENT_FALL, OLD_CONFUSION]);
    jest.mocked(deleteIntercorrence).mockReset().mockResolvedValue(undefined);
    jest
      .mocked(resolveAlert)
      .mockReset()
      .mockResolvedValue(makeAlert({ resolvedAt: new Date().toISOString() }));
    mockSignedInAs("profissional");
    mockRiskApi(makeRiskStatus({ profileId: 7, status: "high", score: 14 }));
  });

  it("shows the header, baseline, conditions and history", async () => {
    renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId("profile-detail")).toBeTruthy(),
    );
    expect(screen.getByText("Ozilene Leite")).toBeTruthy();
    expect(screen.getByTestId("profile-detail-critical")).toBeTruthy();
    expect(screen.getByText("05/11/1947")).toBeTruthy();
    expect(screen.getByText("Feminino")).toBeTruthy();
    expect(screen.getByText("Superior Completo")).toBeTruthy();
    expect(screen.getByTestId("detail-condition-remove-Diabetes")).toBeTruthy();
    expect(screen.getByText("Queda")).toBeTruthy();
    expect(screen.getByText("Confusão aguda")).toBeTruthy();
    expect(screen.getByText("Atenção")).toBeTruthy();
  });

  it("navigates to the weekly check-in wizard", async () => {
    const { navigation } = renderScreen();
    await waitFor(() =>
      expect(screen.getByTestId("detail-checkin")).toBeTruthy(),
    );

    fireEvent.press(screen.getByTestId("detail-checkin"));

    expect(navigation.navigate).toHaveBeenCalledWith("WeeklyCheckIn", {
      profileId: 7,
    });
  });

  it("navigates to the intercorrence form, rotina and medication", async () => {
    const { navigation } = renderScreen();
    await waitFor(() =>
      expect(screen.getByTestId("detail-intercorrence")).toBeTruthy(),
    );

    fireEvent.press(screen.getByTestId("detail-intercorrence"));
    expect(navigation.navigate).toHaveBeenCalledWith("IntercorrenceForm", {
      profileId: 7,
    });

    fireEvent.press(screen.getByTestId("detail-routine"));
    expect(navigation.navigate).toHaveBeenCalledWith("RoutineRegistration", {
      profileId: 7,
    });

    fireEvent.press(screen.getByTestId("detail-medication"));
    expect(navigation.navigate).toHaveBeenCalledWith("MedicationInventory", {
      profileId: 7,
    });
  });

  it("opens the edit form from the conditions pencil", async () => {
    const { navigation } = renderScreen();
    await waitFor(() => expect(screen.getByTestId("detail-edit")).toBeTruthy());

    fireEvent.press(screen.getByTestId("detail-edit"));

    expect(navigation.navigate).toHaveBeenCalledWith("ProfileForm", {
      profileId: 7,
    });
  });

  it("removes a condition via its chip", async () => {
    renderScreen();
    await waitFor(() =>
      expect(
        screen.getByTestId("detail-condition-remove-Diabetes"),
      ).toBeTruthy(),
    );

    fireEvent.press(screen.getByTestId("detail-condition-remove-Diabetes"));

    await waitFor(() =>
      expect(updateProfile).toHaveBeenCalledWith(7, {
        medicalConditions: ["Sarcopenia"],
      }),
    );
    expect(screen.queryByTestId("detail-condition-remove-Diabetes")).toBeNull();
  });

  it("summarizes the latest check-in", async () => {
    renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId("detail-last-checkin")).toBeTruthy(),
    );
    expect(screen.getByText("06/07/2026")).toBeTruthy();
    expect(screen.getByText("Triste")).toBeTruthy();
    expect(screen.getByText("Regular")).toBeTruthy();
    expect(screen.getByText("Febre")).toBeTruthy();
  });

  it("opens the full check-in from the summary card", async () => {
    const { navigation } = renderScreen();
    await waitFor(() =>
      expect(screen.getByTestId("detail-last-checkin-open")).toBeTruthy(),
    );

    fireEvent.press(screen.getByTestId("detail-last-checkin-open"));

    expect(navigation.navigate).toHaveBeenCalledWith("CheckInDetail", {
      profileId: 7,
      checkInId: 40,
    });
  });

  it("shows an empty line when there is no check-in yet", async () => {
    jest
      .mocked(getProfileDetails)
      .mockResolvedValue(
        makeProfileDetails({ profile: MOCK_PROFILE, latestCheckIn: null }),
      );
    renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId("detail-last-checkin-empty")).toBeTruthy(),
    );
    expect(screen.queryByTestId("detail-last-checkin-open")).toBeNull();
  });

  it("shows an error when loading fails", async () => {
    jest.mocked(getProfileDetails).mockRejectedValueOnce(new Error("boom"));
    renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId("profile-detail-error")).toBeTruthy(),
    );
  });

  it("shows the open alerts with a resolve action for professionals", async () => {
    jest.mocked(getProfileDetails).mockResolvedValue(
      makeProfileDetails({
        profile: MOCK_PROFILE,
        alerts: [makeAlert({ id: 31, profileId: 7 })],
      }),
    );
    renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId("detail-alert-31")).toBeTruthy(),
    );
    expect(getProfileDetails).toHaveBeenCalledWith(7);

    fireEvent.press(screen.getByTestId("detail-alert-31-resolve"));

    await waitFor(() => expect(resolveAlert).toHaveBeenCalledWith(7, 31));
    expect(screen.queryByTestId("detail-alert-31")).toBeNull();
  });

  it("hides the resolve action from caregivers", async () => {
    mockSignedInAs("cuidador");
    jest.mocked(getProfileDetails).mockResolvedValue(
      makeProfileDetails({
        profile: MOCK_PROFILE,
        alerts: [makeAlert({ id: 31, profileId: 7 })],
      }),
    );
    renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId("detail-alert-31")).toBeTruthy(),
    );
    expect(screen.queryByTestId("detail-alert-31-resolve")).toBeNull();
  });

  it("restores the alert when resolving fails", async () => {
    jest.mocked(getProfileDetails).mockResolvedValue(
      makeProfileDetails({
        profile: MOCK_PROFILE,
        alerts: [makeAlert({ id: 31, profileId: 7 })],
      }),
    );
    jest.mocked(resolveAlert).mockRejectedValueOnce(new Error("boom") as never);
    renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId("detail-alert-31")).toBeTruthy(),
    );
    fireEvent.press(screen.getByTestId("detail-alert-31-resolve"));

    await waitFor(() =>
      expect(screen.getByTestId("detail-alert-31")).toBeTruthy(),
    );
    expect(screen.getByTestId("profile-detail-error")).toBeTruthy();
  });
});
