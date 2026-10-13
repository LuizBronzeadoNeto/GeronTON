import { describe, it, expect, jest } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { RiskReasons } from "./RiskReasons";
import { makeRiskStatus, mockRiskApi } from "../test-utils";

jest.mock("../api/risk");

describe("RiskReasons", () => {
  it("lists the reasons behind the status", async () => {
    mockRiskApi(
      makeRiskStatus({
        status: "moderate",
        reasons: ["Andando com mais dificuldade (+4)", "Apetite ruim (+3)"],
      }),
    );

    render(<RiskReasons profileId={5} />);

    expect(
      await screen.findByText("• Andando com mais dificuldade (+4)"),
    ).toBeTruthy();
    expect(screen.getByText("• Apetite ruim (+3)")).toBeTruthy();
  });

  it("renders nothing when there is nothing to explain", async () => {
    mockRiskApi(makeRiskStatus({ status: "low", reasons: [] }));

    render(<RiskReasons profileId={5} />);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByTestId("risk-reasons")).toBeNull();
  });
});
