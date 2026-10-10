import { describe, it, expect, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RootNavigator } from "./RootNavigator";
import { useAuth } from "../context/AuthContext";
import type { User } from "../types/auth";

jest.mock("../context/AuthContext");
jest.mock("../push/usePushSync", () => ({ usePushSync: () => {} }));

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderAs(user: User | null) {
  jest.mocked(useAuth).mockReturnValue({
    user,
    isSigningIn: false,
    isRestoring: false,
    signIn: jest.fn(async () => {}),
    signOut: jest.fn(),
    acceptConsent: jest.fn(async () => {}),
  });
  return render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <RootNavigator />
    </SafeAreaProvider>,
  );
}

describe("RootNavigator", () => {
  it("holds a user who owes consent on the consent screen", () => {
    renderAs({
      id: 1,
      role: "profissional",
      token: "t",
      consentRequired: true,
    });

    expect(screen.getByTestId("consent")).toBeTruthy();
  });

  it("shows the login when nobody is signed in", () => {
    renderAs(null);

    expect(screen.queryByTestId("consent")).toBeNull();
    expect(screen.getByTestId("login-email")).toBeTruthy();
  });
});
