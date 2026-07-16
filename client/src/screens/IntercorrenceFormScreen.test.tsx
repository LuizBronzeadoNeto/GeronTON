import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { makeIntercorrence, makeProfile, mockRiskApi } from "../test-utils";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { IntercorrenceFormScreen } from "./IntercorrenceFormScreen";
import { NotificationProvider } from "../context/NotificationContext";
import type { AppStackParamList } from "../types/navigation";
import { createIntercorrence } from "../api/intercorrences";
import { getProfile } from "../api/profiles";

jest.mock("../api/intercorrences");
jest.mock("../api/profiles");
jest.mock("../api/risk");

const MOCK_PROFILE = makeProfile({ id: 7 });

const INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

type Props = NativeStackScreenProps<AppStackParamList, "IntercorrenceForm">;

function renderScreen(profileId = 7) {
  const navigation = {
    goBack: jest.fn(),
    navigate: jest.fn(),
    replace: jest.fn(),
  };
  const props = {
    navigation,
    route: { params: { profileId } },
  } as unknown as Props;
  return {
    navigation,
    ...render(
      <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
        <NotificationProvider>
          <IntercorrenceFormScreen {...props} />
        </NotificationProvider>
      </SafeAreaProvider>,
    ),
  };
}

describe("IntercorrenceFormScreen", () => {
  beforeEach(() => {
    jest
      .mocked(createIntercorrence)
      .mockReset()
      .mockResolvedValue(makeIntercorrence());
    jest.mocked(getProfile).mockReset().mockResolvedValue(MOCK_PROFILE);
    mockRiskApi();
  });

  it("keeps submit disabled until event type and severity are chosen", () => {
    renderScreen();

    expect(
      screen.getByTestId("intercorrence-submit").props.accessibilityState
        .disabled,
    ).toBe(true);

    fireEvent.press(screen.getByTestId("intercorrence-eventType"));
    fireEvent.press(screen.getByTestId("intercorrence-eventType-option-Queda"));
    fireEvent.press(screen.getByTestId("intercorrence-severity-Crítico"));

    expect(
      screen.getByTestId("intercorrence-submit").props.accessibilityState
        .disabled,
    ).toBe(false);
  });

  it("registers the intercorrence and opens the confirmation", async () => {
    const created = makeIntercorrence({
      id: 33,
      profileId: 9,
      eventType: "breathing_difficulties",
      isCritical: true,
      description: "Durante o almoço",
    });
    jest.mocked(createIntercorrence).mockResolvedValue(created);
    const { navigation } = renderScreen(9);

    fireEvent.press(screen.getByTestId("intercorrence-eventType"));
    fireEvent.press(
      screen.getByTestId("intercorrence-eventType-option-Falta de ar"),
    );
    fireEvent.press(screen.getByTestId("intercorrence-severity-Crítico"));
    fireEvent.changeText(
      screen.getByTestId("intercorrence-description"),
      "Durante o almoço",
    );

    fireEvent.press(screen.getByTestId("intercorrence-submit"));

    await waitFor(() => expect(createIntercorrence).toHaveBeenCalled());
    expect(createIntercorrence).toHaveBeenCalledWith(9, {
      eventType: "breathing_difficulties",
      isCritical: true,
      description: "Durante o almoço",
    });
    await waitFor(() =>
      expect(navigation.replace).toHaveBeenCalledWith(
        "IntercorrenceConfirmation",
        { profileId: 9, intercorrence: created },
      ),
    );
  });

  it("raises the in-app notification, critical when the event is critical", async () => {
    jest
      .mocked(createIntercorrence)
      .mockResolvedValue(makeIntercorrence({ isCritical: true }));
    renderScreen();

    fireEvent.press(screen.getByTestId("intercorrence-eventType"));
    fireEvent.press(screen.getByTestId("intercorrence-eventType-option-Queda"));
    fireEvent.press(screen.getByTestId("intercorrence-severity-Crítico"));
    fireEvent.press(screen.getByTestId("intercorrence-submit"));

    await waitFor(() =>
      expect(screen.getByTestId("app-notification")).toBeTruthy(),
    );
    expect(screen.getByText("Intercorrência crítica registrada")).toBeTruthy();
    expect(
      screen.getByText("Queda adicionada ao histórico do idoso."),
    ).toBeTruthy();

    fireEvent.press(screen.getByTestId("app-notification-dismiss"));
    expect(screen.queryByTestId("app-notification")).toBeNull();
  });

  it("shows an error when saving fails", async () => {
    jest.mocked(createIntercorrence).mockRejectedValueOnce(new Error("boom"));
    renderScreen();

    fireEvent.press(screen.getByTestId("intercorrence-eventType"));
    fireEvent.press(screen.getByTestId("intercorrence-eventType-option-Febre"));
    fireEvent.press(screen.getByTestId("intercorrence-severity-Atenção"));
    fireEvent.press(screen.getByTestId("intercorrence-submit"));

    await waitFor(() =>
      expect(screen.getByTestId("intercorrence-error")).toBeTruthy(),
    );
    expect(screen.queryByTestId("app-notification")).toBeNull();
  });
});
