import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { mockNavigationModule } from "../test-utils";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SignalReportScreen } from "./SignalReportScreen";
import type { AppStackParamList } from "../types/navigation";
import {
  getSignalReport,
  getSignalReportCsv,
  getUsageReport,
} from "../api/reports";
import { shareTextFile } from "../utils/shareFile";

jest.mock("../api/reports");
jest.mock("../utils/shareFile");
jest.mock("@react-navigation/native", () => mockNavigationModule());

type Props = NativeStackScreenProps<AppStackParamList, "SignalReport">;

function renderScreen() {
  const props = {
    navigation: { navigate: jest.fn(), goBack: jest.fn() },
    route: { params: undefined },
  } as unknown as Props;
  return render(<SignalReportScreen {...props} />);
}

describe("SignalReportScreen", () => {
  beforeEach(() => {
    jest
      .mocked(getSignalReport)
      .mockReset()
      .mockResolvedValue({
        summary: {
          verdadeirosPositivos: 6,
          falsosPositivos: 2,
          falsosNegativos: 1,
          semAvaliacao: 3,
          precisao: 0.75,
        },
        rows: [],
      });
    jest
      .mocked(getSignalReportCsv)
      .mockReset()
      .mockResolvedValue("classificacao;perfil_id\r\n");
    jest.mocked(shareTextFile).mockReset().mockResolvedValue(undefined);
    jest.mocked(getUsageReport).mockReset().mockResolvedValue({ meses: [] });
  });

  it("shows the counts and the share of signals that held up", async () => {
    renderScreen();

    await waitFor(() => expect(screen.getByTestId("report")).toBeTruthy());
    expect(screen.getByTestId("report-true-positives")).toHaveTextContent(/^6/);
    expect(screen.getByTestId("report-false-positives")).toHaveTextContent(
      /^2/,
    );
    expect(screen.getByTestId("report-false-negatives")).toHaveTextContent(
      /^1/,
    );
    expect(screen.getByTestId("report-precision")).toHaveTextContent(/^75%/);
    expect(screen.getByTestId("report-unjudged")).toHaveTextContent(/^3 /);
  });

  it("shows a dash while there is nothing to compute", async () => {
    jest.mocked(getSignalReport).mockResolvedValue({
      summary: {
        verdadeirosPositivos: 0,
        falsosPositivos: 0,
        falsosNegativos: 0,
        semAvaliacao: 0,
        precisao: null,
      },
      rows: [],
    });
    renderScreen();

    await waitFor(() => expect(screen.getByTestId("report")).toBeTruthy());
    expect(screen.getByTestId("report-precision")).toHaveTextContent(/^-/);
    expect(screen.queryByTestId("report-unjudged")).toBeNull();
  });

  it("exports the CSV", async () => {
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("report")).toBeTruthy());

    fireEvent.press(screen.getByTestId("report-export"));

    await waitFor(() => expect(shareTextFile).toHaveBeenCalled());
    const [fileName, content] = jest.mocked(shareTextFile).mock.calls[0];
    expect(fileName).toMatch(/^relatorio-sinais-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(content).toBe("classificacao;perfil_id\r\n");
  });

  it("shows the app usage section below the signals", async () => {
    renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId("usage-report")).toBeTruthy(),
    );
    expect(getUsageReport).toHaveBeenCalled();
  });

  it("shows an error when the report does not load", async () => {
    jest.mocked(getSignalReport).mockRejectedValue(new Error("boom") as never);
    renderScreen();

    await waitFor(() =>
      expect(screen.getByTestId("report-error")).toBeTruthy(),
    );
  });
});
