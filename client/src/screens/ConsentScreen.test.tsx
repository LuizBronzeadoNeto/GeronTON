import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ConsentScreen } from "./ConsentScreen";
import { useAuth } from "../context/AuthContext";

jest.mock("../context/AuthContext");

const acceptConsent = jest.fn(async () => {});
const signOut = jest.fn();

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function renderScreen() {
  return render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <ConsentScreen />
    </SafeAreaProvider>,
  );
}

describe("ConsentScreen", () => {
  beforeEach(() => {
    acceptConsent.mockReset().mockResolvedValue(undefined);
    signOut.mockReset();
    jest.mocked(useAuth).mockReturnValue({
      user: { id: 1, role: "cuidador", token: "t", consentRequired: true },
      isSigningIn: false,
      isRestoring: false,
      sessionExpired: false,
      signIn: jest.fn(async () => {}),
      signOut,
      acceptConsent,
    });
  });

  it("shows the full term", () => {
    renderScreen();

    expect(screen.getByTestId("policy-text")).toBeTruthy();
    expect(screen.getByText("Seus direitos")).toBeTruthy();
  });

  it("only accepts after the box is ticked", async () => {
    renderScreen();
    const accept = screen.getByTestId("consent-accept");

    expect(accept.props.accessibilityState.disabled).toBe(true);

    fireEvent.press(screen.getByTestId("consent-checkbox"));
    fireEvent.press(screen.getByTestId("consent-accept"));

    await waitFor(() => expect(acceptConsent).toHaveBeenCalled());
  });

  it("shows an error when the acceptance is not saved", async () => {
    acceptConsent.mockRejectedValue(new Error("boom"));
    renderScreen();

    fireEvent.press(screen.getByTestId("consent-checkbox"));
    fireEvent.press(screen.getByTestId("consent-accept"));

    await waitFor(() =>
      expect(screen.getByTestId("consent-error")).toBeTruthy(),
    );
  });

  it("signs out when the user does not accept", () => {
    renderScreen();

    fireEvent.press(screen.getByTestId("consent-signout"));

    expect(signOut).toHaveBeenCalled();
  });
});
