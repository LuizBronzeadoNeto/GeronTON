import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { makeProfile } from "../test-utils";
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
import { useAuth } from "../context/AuthContext";
import type { Role } from "../types/auth";

jest.mock("../api/profiles");
jest.mock("../context/AuthContext");

type Props = NativeStackScreenProps<AppStackParamList, "Redirect">;

function mockRole(role: Role) {
  jest.mocked(useAuth).mockReturnValue({
    user: { id: 1, role, token: "jwt" },
    isSigningIn: false,
    signIn: jest.fn<() => Promise<void>>(),
    signOut: jest.fn(),
  });
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
    jest.mocked(useAuth).mockReset();
    mockRole("cuidador");
  });

  it("sends a profissional straight to the triage-panel Home", async () => {
    mockRole("profissional");
    const { navigation } = renderScreen();

    await waitFor(() => expect(navigation.reset).toHaveBeenCalled());
    expect(navigation.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: "Home" }],
    });
    expect(listProfiles).not.toHaveBeenCalled();
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

  it("opens the only profile's detail hub", async () => {
    jest.mocked(listProfiles).mockResolvedValue([makeProfile({ id: 7 })]);
    const { navigation } = renderScreen();

    await waitFor(() => expect(navigation.reset).toHaveBeenCalled());
    expect(navigation.reset).toHaveBeenCalledWith({
      index: 1,
      routes: [
        { name: "Home" },
        { name: "ProfileDetail", params: { profileId: 7 } },
      ],
    });
  });

  it("sends a user with several profiles to the list", async () => {
    jest
      .mocked(listProfiles)
      .mockResolvedValue([makeProfile({ id: 1 }), makeProfile({ id: 2 })]);
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
