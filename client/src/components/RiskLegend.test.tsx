import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { RiskLegend } from "./RiskLegend";
import { RISK_LEVELS, RISK_LEVEL_ORDER } from "../constants/risk";

describe("RiskLegend", () => {
  it("explains every risk level with its pill label and description", () => {
    render(<RiskLegend />);

    expect(screen.getByTestId("risk-legend")).toBeTruthy();
    expect(screen.getByText("O que cada cor quer dizer")).toBeTruthy();
    for (const level of RISK_LEVEL_ORDER) {
      expect(screen.getByTestId(`risk-legend-${level}`)).toBeTruthy();
      expect(screen.getByText(RISK_LEVELS[level].label)).toBeTruthy();
      expect(screen.getByText(RISK_LEVELS[level].description)).toBeTruthy();
    }
  });
});
