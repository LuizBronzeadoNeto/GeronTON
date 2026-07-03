import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ProfileDetailScreen } from "./ProfileDetailScreen";
import type { AppStackParamList } from "../types/navigation";
import { getProfile, updateProfile, type Profile } from "../api/profiles";
import {
  deleteIntercorrence,
  listIntercorrences,
  type Intercorrence,
} from "../api/intercorrences";
import {
  getRiskStatus,
  subscribeRiskStatusInvalidation,
  type RiskStatus,
} from "../api/risk";

jest.mock("../api/profiles");
jest.mock("../api/intercorrences");
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
  profileId: 7,
  status: "high",
  score: 8,
  evaluatedAt: "2026-06-15T00:00:00.000Z",
};

const MOCK_PROFILE: Profile = {
  id: 7,
  firstName: "Ozilene",
  lastName: "Leite",
  birthDate: "1947-11-05T00:00:00.000Z",
  sex: "Feminino",
  scholarship: "Superior Completo",
  medicalConditions: ["Diabetes", "Sarcopenia"],
  notes: null,
  caregiverId: 1,
};

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
    jest.mocked(getProfile).mockReset().mockResolvedValue(MOCK_PROFILE);
    jest
      .mocked(updateProfile)
      .mockReset()
      .mockResolvedValue({} as never);
    jest
      .mocked(listIntercorrences)
      .mockReset()
      .mockResolvedValue([RECENT_FALL, OLD_CONFUSION]);
    jest.mocked(deleteIntercorrence).mockReset().mockResolvedValue(undefined);
    jest.mocked(getRiskStatus).mockReset().mockResolvedValue(MOCK_RISK);
    jest
      .mocked(subscribeRiskStatusInvalidation)
      .mockReset()
      .mockReturnValue(() => {});
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

  it("shows an error when loading fails", async () => {
    jest.mocked(getProfile).mockRejectedValueOnce(new Error("boom"));
    renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId("profile-detail-error")).toBeTruthy(),
    );
  });
});
