import { describe, it, expect, jest, afterEach } from "@jest/globals";
import { Pressable, Text } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  NotificationProvider,
  useNotification,
  type AppNotification,
} from "./NotificationContext";

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function Trigger({ notification }: { notification: AppNotification }) {
  const { notify } = useNotification();
  return (
    <Pressable testID="trigger" onPress={() => notify(notification)}>
      <Text>notify</Text>
    </Pressable>
  );
}

function renderWith(notification: AppNotification) {
  render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <NotificationProvider autoDismissMs={1000}>
        <Trigger notification={notification} />
      </NotificationProvider>
    </SafeAreaProvider>,
  );
  fireEvent.press(screen.getByTestId("trigger"));
}

describe("NotificationProvider", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("dismisses a regular notification after a while", () => {
    jest.useFakeTimers();
    renderWith({ title: "Salvo", message: "Tudo certo." });

    act(() => jest.advanceTimersByTime(1000));

    expect(screen.queryByTestId("app-notification")).toBeNull();
  });

  it("keeps a critical notification until it is dismissed", () => {
    jest.useFakeTimers();
    renderWith({ title: "Grave", message: "Queda.", critical: true });

    act(() => jest.advanceTimersByTime(60_000));

    expect(screen.getByTestId("app-notification")).toBeTruthy();
  });

  it("runs the notification's action when it is tapped", () => {
    const onPress = jest.fn();
    renderWith({ title: "Grave", message: "Queda.", onPress });

    fireEvent.press(screen.getByTestId("app-notification-open"));

    expect(onPress).toHaveBeenCalled();
    expect(screen.queryByTestId("app-notification")).toBeNull();
  });
});
