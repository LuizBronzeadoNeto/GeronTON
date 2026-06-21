import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RedirectScreen } from "./RedirectScreen";
import type { AppStackParamList } from "../types/navigation";
import { listProfiles, type Profile } from "../api/profiles";

jest.mock("../api/profiles");

type Props = NativeStackScreenProps<AppStackParamList, "Redirect">;

function makeProfile(id: number): Profile {
  return {
    id,
    firstName: "Idoso",
    lastName: String(id),
    birthDate: "1950-01-01",
    scholarship: "fundamental",
    medicalConditions: [],
    caregiverId: 1,
  };
}

function renderScreen() {
  const navigation = { reset: jest.fn(), navigate: jest.fn() };
  const props = {
    navigation,
    route: { params: undefined },
  } as unknown as Props;
  return { navigation, ...render(<RedirectScreen {...props} />) };
}

describe("RedirectScreen", () => {
  beforeEach(() => {
    jest.mocked(listProfiles).mockReset();
  });

  it("shows a loading indicator while profiles load", () => {
    jest.mocked(listProfiles).mockReturnValue(new Promise<Profile[]>(() => {}));
    renderScreen();

    expect(screen.getByTestId("redirect-loading")).toBeTruthy();
  });

  it("sends a user with no profiles to the create form", async () => {
    jest.mocked(listProfiles).mockResolvedValue([]);
    const { navigation } = renderScreen();

    await waitFor(() => expect(navigation.reset).toHaveBeenCalled());
    expect(navigation.reset).toHaveBeenCalledWith({
      index: 1,
      routes: [{ name: "Home" }, { name: "ProfileForm" }],
    });
  });

  it("opens the only profile's weekly check-in", async () => {
    jest.mocked(listProfiles).mockResolvedValue([makeProfile(7)]);
    const { navigation } = renderScreen();

    await waitFor(() => expect(navigation.reset).toHaveBeenCalled());
    expect(navigation.reset).toHaveBeenCalledWith({
      index: 1,
      routes: [
        { name: "Home" },
        { name: "WeeklyCheckIn", params: { profileId: 7 } },
      ],
    });
  });

  it("sends a user with several profiles to the list", async () => {
    jest
      .mocked(listProfiles)
      .mockResolvedValue([makeProfile(1), makeProfile(2)]);
    const { navigation } = renderScreen();

    await waitFor(() => expect(navigation.reset).toHaveBeenCalled());
    expect(navigation.reset).toHaveBeenCalledWith({
      index: 1,
      routes: [{ name: "Home" }, { name: "ProfileList" }],
    });
  });

  it("shows an error and retries on failure", async () => {
    jest
      .mocked(listProfiles)
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce([]);
    const { navigation } = renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId("redirect-error")).toBeTruthy(),
    );
    expect(navigation.reset).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId("redirect-retry"));

    await waitFor(() => expect(navigation.reset).toHaveBeenCalled());
    expect(listProfiles).toHaveBeenCalledTimes(2);
  });
});
