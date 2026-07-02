import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { http } from "./http";
import {
  getRiskStatus,
  invalidateRiskStatus,
  subscribeRiskStatusInvalidation,
  type RiskStatus,
} from "./risk";

jest.mock("./http", () => ({
  http: { get: jest.fn() },
}));

const mockedGet = jest.mocked(http.get);

function riskFor(profileId: number, status: RiskStatus["status"] = "low") {
  return {
    data: { profileId, status, score: 0, evaluatedAt: "2026-07-01T00:00:00Z" },
  };
}

describe("getRiskStatus", () => {
  beforeEach(() => {
    invalidateRiskStatus();
    mockedGet.mockReset();
    mockedGet.mockResolvedValue(riskFor(1) as never);
  });

  it("fetches the risk status from the API", async () => {
    const risk = await getRiskStatus(1);

    expect(mockedGet).toHaveBeenCalledWith("/perfis/1/risco");
    expect(risk.status).toBe("low");
  });

  it("reuses a fresh cached result instead of refetching", async () => {
    await getRiskStatus(1);
    const risk = await getRiskStatus(1);

    expect(mockedGet).toHaveBeenCalledTimes(1);
    expect(risk.profileId).toBe(1);
  });

  it("caches per profile", async () => {
    mockedGet
      .mockResolvedValueOnce(riskFor(1) as never)
      .mockResolvedValueOnce(riskFor(2, "high") as never);

    await getRiskStatus(1);
    const risk = await getRiskStatus(2);

    expect(mockedGet).toHaveBeenCalledTimes(2);
    expect(risk.status).toBe("high");
  });

  it("refetches after the cached entry expires", async () => {
    const now = Date.now();
    const nowSpy = jest.spyOn(Date, "now").mockReturnValue(now);

    await getRiskStatus(1);
    nowSpy.mockReturnValue(now + 61_000);
    await getRiskStatus(1);

    expect(mockedGet).toHaveBeenCalledTimes(2);
    nowSpy.mockRestore();
  });

  it("refetches after the profile's cache entry is invalidated", async () => {
    await getRiskStatus(1);
    invalidateRiskStatus(1);
    await getRiskStatus(1);

    expect(mockedGet).toHaveBeenCalledTimes(2);
  });

  it("keeps other profiles cached when one is invalidated", async () => {
    await getRiskStatus(1);
    mockedGet.mockResolvedValueOnce(riskFor(2) as never);
    await getRiskStatus(2);

    invalidateRiskStatus(2);
    await getRiskStatus(1);

    expect(mockedGet).toHaveBeenCalledTimes(2);
  });
});

describe("subscribeRiskStatusInvalidation", () => {
  beforeEach(() => {
    invalidateRiskStatus();
    mockedGet.mockReset();
  });

  it("notifies listeners with the invalidated profile id", () => {
    const listener = jest.fn();
    const unsubscribe = subscribeRiskStatusInvalidation(listener);

    invalidateRiskStatus(7);

    expect(listener).toHaveBeenCalledWith(7);
    unsubscribe();
  });

  it("stops notifying after unsubscribe", () => {
    const listener = jest.fn();
    const unsubscribe = subscribeRiskStatusInvalidation(listener);
    unsubscribe();

    invalidateRiskStatus(7);

    expect(listener).not.toHaveBeenCalled();
  });
});
