import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { AdherenceSummary, averageAdherence } from "./AdherenceSummary";
import { makeTriageEntry } from "../test-utils";

describe("averageAdherence", () => {
  it("weights every elder the same", () => {
    const entries = [
      makeTriageEntry({
        id: 1,
        adherence: {
          weeksWithCheckIn: 8,
          weeksObserved: 8,
          checkedInThisWeek: true,
        },
      }),
      makeTriageEntry({
        id: 2,
        adherence: {
          weeksWithCheckIn: 0,
          weeksObserved: 1,
          checkedInThisWeek: false,
        },
      }),
    ];

    expect(averageAdherence(entries)).toBe(0.5);
  });

  it("is null for an empty list", () => {
    expect(averageAdherence([])).toBeNull();
  });
});

describe("AdherenceSummary", () => {
  it("counts the elders with a check-in this week", () => {
    render(
      <AdherenceSummary
        entries={[
          makeTriageEntry({
            id: 1,
            adherence: {
              weeksWithCheckIn: 3,
              weeksObserved: 4,
              checkedInThisWeek: true,
            },
          }),
          makeTriageEntry({ id: 2 }),
          makeTriageEntry({ id: 3 }),
        ]}
      />,
    );

    expect(screen.getByTestId("adherence-this-week")).toHaveTextContent(
      "1 de 3",
    );
    expect(screen.getByTestId("adherence-average")).toHaveTextContent("25%");
  });
});
