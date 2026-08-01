import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { EnableNotificationsCard } from "./EnableNotificationsCard";
import { NotificationProvider } from "../context/NotificationContext";
import { getPermission, getSupport, requestAndRegister } from "../push";
import { readEndpoint } from "../api/pushStorage";

jest.mock("../push");
jest.mock("../api/pushStorage");

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

/**
 * The card's whole job is deciding what, if anything, to show, so the tests are
 * one per state. Mocking the push module wholesale means none of them has to
 * pretend to be on another platform: the component only ever sees a PushSupport
 * string, whichever variant produced it.
 *
 * It renders inside a real NotificationProvider because a successful enable
 * raises the in-app toast, which is worth asserting rather than mocking away.
 */
function renderCard() {
  return render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <NotificationProvider>
        <EnableNotificationsCard />
      </NotificationProvider>
    </SafeAreaProvider>,
  );
}

beforeEach(() => {
  jest.mocked(getSupport).mockReset().mockReturnValue("available");
  jest.mocked(getPermission).mockReset().mockResolvedValue("default");
  jest.mocked(requestAndRegister).mockReset().mockResolvedValue(null);
  jest.mocked(readEndpoint).mockReset().mockResolvedValue(null);
});

describe("EnableNotificationsCard", () => {
  it("renders nothing where push cannot work", async () => {
    jest.mocked(getSupport).mockReturnValue("unsupported");

    renderCard();

    await waitFor(() => expect(getPermission).toHaveBeenCalled());
    expect(screen.queryByTestId("enable-notifications")).toBeNull();
    expect(screen.queryByTestId("enable-notifications-install")).toBeNull();
  });

  /**
   * On an iPhone the button would be a dead end, because Safari only exposes
   * push inside an installed web app. The instruction is the actionable thing.
   */
  it("tells an iPhone user to install the app instead of offering a button", async () => {
    jest.mocked(getSupport).mockReturnValue("needs-install");

    renderCard();

    await waitFor(() =>
      expect(screen.getByTestId("enable-notifications-install")).toBeTruthy(),
    );
    expect(screen.queryByTestId("enable-notifications")).toBeNull();
  });

  it("offers the button when permission has not been decided", async () => {
    renderCard();

    await waitFor(() =>
      expect(screen.getByTestId("enable-notifications")).toBeTruthy(),
    );
  });

  it("renders nothing once the device is already registered", async () => {
    jest.mocked(getPermission).mockResolvedValue("granted");
    jest.mocked(readEndpoint).mockResolvedValue("https://push.example/abc");

    renderCard();

    await waitFor(() => expect(readEndpoint).toHaveBeenCalled());
    expect(screen.queryByTestId("enable-notifications")).toBeNull();
  });

  it("explains itself instead of offering a button when blocked", async () => {
    jest.mocked(getPermission).mockResolvedValue("denied");

    renderCard();

    await waitFor(() =>
      expect(screen.getByTestId("enable-notifications-blocked")).toBeTruthy(),
    );
    expect(screen.queryByTestId("enable-notifications")).toBeNull();
  });

  it("hides itself and confirms with a toast after a successful enable", async () => {
    jest
      .mocked(requestAndRegister)
      .mockResolvedValue({ endpoint: "https://push.example/abc" });
    jest.mocked(getPermission).mockResolvedValue("default");

    renderCard();
    await waitFor(() =>
      expect(screen.getByTestId("enable-notifications")).toBeTruthy(),
    );

    fireEvent.press(screen.getByTestId("enable-notifications"));

    await waitFor(() =>
      expect(screen.getByTestId("app-notification")).toBeTruthy(),
    );
    expect(screen.queryByTestId("enable-notifications")).toBeNull();
  });

  /**
   * Permission granted but no registration means the subscription itself
   * failed — a different problem from the user saying no, and the only one the
   * person can do anything about by retrying.
   */
  it("keeps the button and shows an error when registration fails", async () => {
    jest.mocked(requestAndRegister).mockResolvedValue(null);
    jest.mocked(getPermission).mockResolvedValue("granted");

    renderCard();
    await waitFor(() =>
      expect(screen.getByTestId("enable-notifications")).toBeTruthy(),
    );

    fireEvent.press(screen.getByTestId("enable-notifications"));

    await waitFor(() =>
      expect(screen.getByTestId("enable-notifications-error")).toBeTruthy(),
    );
    expect(screen.getByTestId("enable-notifications")).toBeTruthy();
  });
});
