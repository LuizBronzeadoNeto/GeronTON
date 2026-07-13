import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { http } from "./http";
import { listDashboardAlerts, listProfileAlerts, resolveAlert } from "./alerts";
import { makeAlert, makeDashboardAlert } from "../test-utils";

jest.mock("./http", () => ({
  http: { get: jest.fn(), put: jest.fn() },
}));

const mockedGet = jest.mocked(http.get);
const mockedPut = jest.mocked(http.put);

describe("alerts api", () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedPut.mockReset();
  });

  it("fetches the professional dashboard feed", async () => {
    const alert = makeDashboardAlert();
    mockedGet.mockResolvedValue({ data: [alert] } as never);

    const alerts = await listDashboardAlerts();

    expect(mockedGet).toHaveBeenCalledWith("/alertas");
    expect(alerts).toEqual([alert]);
  });

  it("fetches a profile's alerts", async () => {
    const alert = makeAlert();
    mockedGet.mockResolvedValue({ data: [alert] } as never);

    const alerts = await listProfileAlerts(5);

    expect(mockedGet).toHaveBeenCalledWith("/perfis/5/alertas");
    expect(alerts).toEqual([alert]);
  });

  it("fetches only the open alerts when asked", async () => {
    mockedGet.mockResolvedValue({ data: [] } as never);

    await listProfileAlerts(5, true);

    expect(mockedGet).toHaveBeenCalledWith("/perfis/5/alertas?open=true");
  });

  it("resolves an alert", async () => {
    const resolved = makeAlert({ resolvedAt: "2026-07-09T10:00:00.000Z" });
    mockedPut.mockResolvedValue({ data: resolved } as never);

    const alert = await resolveAlert(5, 31);

    expect(mockedPut).toHaveBeenCalledWith("/perfis/5/alertas/31", {
      resolved: true,
    });
    expect(alert.resolvedAt).not.toBeNull();
  });
});
