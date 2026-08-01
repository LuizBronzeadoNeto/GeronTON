import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { Text } from "react-native";
import { act, render, screen, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { usePushSync } from "./usePushSync";
import { NotificationProvider } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";
import { addForegroundListener, prepare, syncExisting } from "./";
import type { ForegroundPush } from "./types";

jest.mock("../context/AuthContext");
jest.mock("./");

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function Harness() {
  usePushSync();
  return <Text testID="harness">ok</Text>;
}

function renderHook() {
  return render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <NotificationProvider>
        <Harness />
      </NotificationProvider>
    </SafeAreaProvider>,
  );
}

function signedIn() {
  jest.mocked(useAuth).mockReturnValue({
    user: { id: 1, role: "cuidador", token: "jwt" },
    isSigningIn: false,
    isRestoring: false,
    signIn: jest.fn<() => Promise<void>>(),
    signOut: jest.fn(),
  });
}

function signedOut() {
  jest.mocked(useAuth).mockReturnValue({
    user: null,
    isSigningIn: false,
    isRestoring: false,
    signIn: jest.fn<() => Promise<void>>(),
    signOut: jest.fn(),
  });
}

beforeEach(() => {
  jest.mocked(prepare).mockReset().mockResolvedValue(undefined);
  jest.mocked(syncExisting).mockReset().mockResolvedValue(null);
  jest
    .mocked(addForegroundListener)
    .mockReset()
    .mockReturnValue(() => {});
});

describe("usePushSync", () => {
  it("does nothing while nobody is signed in", () => {
    signedOut();

    renderHook();

    expect(prepare).not.toHaveBeenCalled();
    expect(syncExisting).not.toHaveBeenCalled();
    expect(addForegroundListener).not.toHaveBeenCalled();
  });

  /**
   * A session restored from storage has to register just like a fresh sign-in,
   * which is why this hangs off user rather than off the signIn call.
   */
  it("prepares and re-registers once a session exists", async () => {
    signedIn();

    renderHook();

    await waitFor(() => expect(syncExisting).toHaveBeenCalled());
    expect(prepare).toHaveBeenCalled();
    expect(jest.mocked(prepare).mock.invocationCallOrder[0]).toBeLessThan(
      jest.mocked(syncExisting).mock.invocationCallOrder[0],
    );
  });

  it("renders a push that arrives in the foreground as the in-app toast", async () => {
    signedIn();
    let handler: ((push: ForegroundPush) => void) | undefined;
    jest.mocked(addForegroundListener).mockImplementation((fn) => {
      handler = fn;
      return () => {};
    });

    renderHook();
    await waitFor(() => expect(addForegroundListener).toHaveBeenCalled());

    act(() => {
      handler!({
        title: "Intercorrência crítica",
        body: "Maria Silva: Queda",
        critical: true,
        data: { profileId: "7" },
      });
    });

    await waitFor(() =>
      expect(screen.getByTestId("app-notification")).toBeTruthy(),
    );
    expect(screen.getByText("Maria Silva: Queda")).toBeTruthy();
  });

  it("removes the listener when the component goes away", async () => {
    signedIn();
    const remove = jest.fn();
    jest.mocked(addForegroundListener).mockReturnValue(remove);

    const view = renderHook();
    await waitFor(() => expect(addForegroundListener).toHaveBeenCalled());

    view.unmount();

    expect(remove).toHaveBeenCalled();
  });
});
