import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react-native";
import { RiskStatusBadge } from "./RiskStatusBadge";
import {
  getRiskStatus,
  subscribeRiskStatusInvalidation,
  type RiskLevel,
  type RiskStatus,
} from "../api/risk";

jest.mock("../api/risk");

function riskFor(profileId: number, status: RiskLevel): RiskStatus {
  return { profileId, status, score: 0, evaluatedAt: "2026-07-01T00:00:00Z" };
}

describe("RiskStatusBadge", () => {
  beforeEach(() => {
    jest.mocked(getRiskStatus).mockReset().mockResolvedValue(riskFor(5, "low"));
    jest
      .mocked(subscribeRiskStatusInvalidation)
      .mockReset()
      .mockReturnValue(() => {});
  });

  it.each([
    ["low", "Baixo risco"],
    ["moderate", "Risco moderado"],
    ["high", "Alto risco"],
    ["unknown", "Sem dados"],
  ] as [RiskLevel, string][])(
    "renders the %s level with its label",
    async (status, label) => {
      jest.mocked(getRiskStatus).mockResolvedValue(riskFor(5, status));
      render(<RiskStatusBadge profileId={5} />);

      await waitFor(() =>
        expect(screen.getByTestId("risk-badge-5")).toBeTruthy(),
      );
      expect(screen.getByText(label)).toBeTruthy();
    },
  );

  it("requests the status for the given profile", async () => {
    render(<RiskStatusBadge profileId={9} />);

    await waitFor(() => expect(getRiskStatus).toHaveBeenCalledWith(9));
  });

  it("falls back to 'Sem dados' when the request fails", async () => {
    jest.mocked(getRiskStatus).mockRejectedValue(new Error("network"));
    render(<RiskStatusBadge profileId={5} />);

    await waitFor(() => expect(screen.getByText("Sem dados")).toBeTruthy());
  });

  it("refetches when the profile's cache entry is invalidated", async () => {
    let notify: ((profileId?: number) => void) | undefined;
    jest
      .mocked(subscribeRiskStatusInvalidation)
      .mockImplementation((listener) => {
        notify = listener;
        return () => {};
      });
    jest
      .mocked(getRiskStatus)
      .mockResolvedValueOnce(riskFor(5, "low"))
      .mockResolvedValueOnce(riskFor(5, "high"));

    render(<RiskStatusBadge profileId={5} />);
    await waitFor(() => expect(screen.getByText("Baixo risco")).toBeTruthy());

    notify?.(5);

    await waitFor(() => expect(screen.getByText("Alto risco")).toBeTruthy());
    expect(getRiskStatus).toHaveBeenCalledTimes(2);
  });

  it("ignores invalidations for other profiles", async () => {
    let notify: ((profileId?: number) => void) | undefined;
    jest
      .mocked(subscribeRiskStatusInvalidation)
      .mockImplementation((listener) => {
        notify = listener;
        return () => {};
      });

    render(<RiskStatusBadge profileId={5} />);
    await waitFor(() => expect(screen.getByText("Baixo risco")).toBeTruthy());

    notify?.(99);

    expect(getRiskStatus).toHaveBeenCalledTimes(1);
  });
});
