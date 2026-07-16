import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  makeIntercorrence,
  makeProfile,
  mockNavigationModule,
  mockRiskApi,
} from "../test-utils";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import { Alert } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { IntercorrenceListScreen } from "./IntercorrenceListScreen";
import type { AppStackParamList } from "../types/navigation";
import { deleteIntercorrence, listIntercorrences } from "../api/intercorrences";
import { getProfile } from "../api/profiles";

jest.mock("../api/intercorrences");
jest.mock("../api/profiles");
jest.mock("../api/risk");
jest.mock("@react-navigation/native", () => mockNavigationModule());

const FALL = makeIntercorrence({ id: 21, profileId: 7, isCritical: true });
const CONFUSION = makeIntercorrence({
  id: 22,
  profileId: 7,
  eventType: "confusion",
  isCritical: false,
  description: "",
});

type Props = NativeStackScreenProps<AppStackParamList, "IntercorrenceList">;

function renderScreen(profileId = 7) {
  const navigation = { goBack: jest.fn(), navigate: jest.fn() };
  const props = {
    navigation,
    route: { params: { profileId } },
  } as unknown as Props;
  return { navigation, ...render(<IntercorrenceListScreen {...props} />) };
}

describe("IntercorrenceListScreen", () => {
  beforeEach(() => {
    jest
      .mocked(listIntercorrences)
      .mockReset()
      .mockResolvedValue([FALL, CONFUSION]);
    jest.mocked(deleteIntercorrence).mockReset().mockResolvedValue(undefined);
    jest
      .mocked(getProfile)
      .mockReset()
      .mockResolvedValue(makeProfile({ id: 7 }));
    mockRiskApi();
  });

  it("lists every intercorrence with its severity", async () => {
    renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId("history-intercorrence-21")).toBeTruthy(),
    );
    expect(listIntercorrences).toHaveBeenCalledWith(7);
    expect(screen.getByTestId("history-intercorrence-22")).toBeTruthy();
    expect(screen.getByText("Queda")).toBeTruthy();
    expect(screen.getByText("Confusão aguda")).toBeTruthy();
    expect(screen.getByText("Crítico")).toBeTruthy();
    expect(screen.getByText("Atenção")).toBeTruthy();
  });

  it("shows the empty state when there is no history", async () => {
    jest.mocked(listIntercorrences).mockResolvedValue([]);
    renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId("intercorrence-list-empty")).toBeTruthy(),
    );
  });

  it("shows an error when loading fails", async () => {
    jest.mocked(listIntercorrences).mockRejectedValueOnce(new Error("boom"));
    renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId("intercorrence-list-error")).toBeTruthy(),
    );
  });

  it("removes an intercorrence after confirmation", async () => {
    const alertSpy = jest
      .spyOn(Alert, "alert")
      .mockImplementation((_title, _message, buttons) => {
        buttons?.find((button) => button.style === "destructive")?.onPress?.();
      });
    renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId("history-intercorrence-21")).toBeTruthy(),
    );
    fireEvent.press(screen.getByTestId("history-intercorrence-delete-21"));

    await waitFor(() =>
      expect(deleteIntercorrence).toHaveBeenCalledWith(7, 21),
    );
    expect(screen.queryByTestId("history-intercorrence-21")).toBeNull();
    alertSpy.mockRestore();
  });
});
