import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import { UsageReport } from "./UsageReport";
import { getUsageReport, getUsageReportCsv } from "../api/reports";
import { shareTextFile } from "../utils/shareFile";

jest.mock("../api/reports");
jest.mock("../utils/shareFile");

const MONTHS = [
  { mes: "2026-09", acessos: 40, usuarios: 9, cuidadores: 7, profissionais: 2 },
  { mes: "2026-10", acessos: 12, usuarios: 5, cuidadores: 4, profissionais: 1 },
];

describe("UsageReport", () => {
  beforeEach(() => {
    jest
      .mocked(getUsageReport)
      .mockReset()
      .mockResolvedValue({ meses: MONTHS });
    jest
      .mocked(getUsageReportCsv)
      .mockReset()
      .mockResolvedValue("mes;acessos\r\n");
    jest.mocked(shareTextFile).mockReset().mockResolvedValue(undefined);
  });

  it("lists the months newest first", async () => {
    render(<UsageReport />);

    await waitFor(() =>
      expect(screen.getByTestId("usage-month-2026-10")).toBeTruthy(),
    );
    const rows = screen.getAllByTestId(/^usage-month-/);
    expect(rows.map((row) => row.props.testID)).toEqual([
      "usage-month-2026-10",
      "usage-month-2026-09",
    ]);
    expect(screen.getByTestId("usage-month-2026-09")).toHaveTextContent(
      "09/202640972",
    );
  });

  it("exports the CSV", async () => {
    render(<UsageReport />);
    await waitFor(() => expect(getUsageReport).toHaveBeenCalled());

    fireEvent.press(screen.getByTestId("usage-export"));

    await waitFor(() => expect(shareTextFile).toHaveBeenCalled());
    const [fileName, content] = jest.mocked(shareTextFile).mock.calls[0];
    expect(fileName).toMatch(/^relatorio-acessos-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(content).toBe("mes;acessos\r\n");
  });

  it("shows an error when the numbers don't load", async () => {
    jest.mocked(getUsageReport).mockRejectedValue(new Error("boom") as never);
    render(<UsageReport />);

    await waitFor(() => expect(screen.getByTestId("usage-error")).toBeTruthy());
  });
});
