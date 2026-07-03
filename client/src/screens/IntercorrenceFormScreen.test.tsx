import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { makeProfile, mockRiskApi } from "../test-utils";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { IntercorrenceFormScreen } from "./IntercorrenceFormScreen";
import type { AppStackParamList } from "../types/navigation";
import { createIntercorrence } from "../api/intercorrences";
import { getProfile } from "../api/profiles";

jest.mock("../api/intercorrences");
jest.mock("../api/profiles");
jest.mock("../api/risk");

const MOCK_PROFILE = makeProfile({ id: 7 });

type Props = NativeStackScreenProps<AppStackParamList, "IntercorrenceForm">;

function renderScreen(profileId = 7) {
  const navigation = { goBack: jest.fn(), navigate: jest.fn() };
  const props = {
    navigation,
    route: { params: { profileId } },
  } as unknown as Props;
  return { navigation, ...render(<IntercorrenceFormScreen {...props} />) };
}

describe("IntercorrenceFormScreen", () => {
  beforeEach(() => {
    jest
      .mocked(createIntercorrence)
      .mockReset()
      .mockResolvedValue({} as never);
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

  it("registers the intercorrence and goes back", async () => {
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
    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
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
  });
});
