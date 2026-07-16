import { describe, it, expect, jest } from "@jest/globals";
import { makeIntercorrence } from "../test-utils";
import { render, screen, fireEvent } from "@testing-library/react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { IntercorrenceConfirmationScreen } from "./IntercorrenceConfirmationScreen";
import type { AppStackParamList } from "../types/navigation";
import type { Intercorrence } from "../api/intercorrences";
import { formatTimestamp } from "../utils/date";

type Props = NativeStackScreenProps<
  AppStackParamList,
  "IntercorrenceConfirmation"
>;

function renderScreen(intercorrence: Intercorrence, profileId = 7) {
  const navigation = { goBack: jest.fn(), navigate: jest.fn() };
  const props = {
    navigation,
    route: { params: { profileId, intercorrence } },
  } as unknown as Props;
  return {
    navigation,
    ...render(<IntercorrenceConfirmationScreen {...props} />),
  };
}

describe("IntercorrenceConfirmationScreen", () => {
  it("summarizes the registered intercorrence", () => {
    renderScreen(
      makeIntercorrence({
        eventType: "fall",
        isCritical: false,
        date: "2026-06-16T11:52:21.000Z",
        description: "Escorregou no banheiro",
      }),
    );

    expect(screen.getByTestId("intercorrence-confirmation")).toBeTruthy();
    expect(screen.getByText("Intercorrência registrada")).toBeTruthy();
    expect(screen.getByText("Queda")).toBeTruthy();
    expect(screen.getByText("Atenção")).toBeTruthy();
    expect(
      screen.getByText(formatTimestamp("2026-06-16T11:52:21.000Z")),
    ).toBeTruthy();
    expect(screen.getByText("Escorregou no banheiro")).toBeTruthy();
    expect(screen.queryByTestId("confirmation-critical")).toBeNull();
  });

  it("shows the urgency notice for critical events", () => {
    renderScreen(makeIntercorrence({ isCritical: true }));

    expect(screen.getByTestId("confirmation-critical")).toBeTruthy();
    expect(screen.getByText("Crítico")).toBeTruthy();
  });

  it("omits the description block when it is empty", () => {
    renderScreen(makeIntercorrence({ description: "" }));

    expect(screen.queryByText("Descrição")).toBeNull();
  });

  it("returns to the profile hub", () => {
    const { navigation } = renderScreen(makeIntercorrence());

    fireEvent.press(screen.getByTestId("confirmation-back"));

    expect(navigation.goBack).toHaveBeenCalled();
  });

  it("opens the full history", () => {
    const { navigation } = renderScreen(makeIntercorrence(), 9);

    fireEvent.press(screen.getByTestId("confirmation-history"));

    expect(navigation.navigate).toHaveBeenCalledWith("IntercorrenceList", {
      profileId: 9,
    });
  });
});
