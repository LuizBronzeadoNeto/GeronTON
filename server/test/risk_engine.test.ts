import { describe, it, expect } from "@jest/globals";
import { computeRiskStatus } from "../src/utils/risk.js";
import type { CheckIn, Intercorrence } from "@prisma/client";

/**
 * Base check-in with every flag in its "safe" state, so each test only
 * needs to override the fields relevant to what it's checking. Similar to
 * the integration suite, but kept local so this file
 * has no dependency on the DB
 */
const CLEAN_CHECKIN = {
  id: 1,
  profileId: 1,
  date: new Date(),
  skinIssues: false,
  bowelRegular: true,
  sleepWell: true,
  unstableGait: false,
  weeklyEvents: [] as string[],
  appetite: "good",
  chokingIncident: false,
  breathShortness: false,
  hydrationGoal: true,
  medsOnTime: true,
  mood: "happy",
  stressLevel: 0,
  sunExposure: true,
  selfExpression: true,
  stimulation: true,
  dailyBath: true,
  oralHygiene: true,
  groomedNails: true,
} as unknown as CheckIn;

function checkIn(overrides: Partial<CheckIn> = {}): CheckIn {
  return { ...CLEAN_CHECKIN, ...overrides };
}

function intercorrence(isCritical: boolean): Intercorrence {
  return { isCritical } as Intercorrence;
}

describe("computeRiskStatus — no data", () => {
  it("is unknown with no check-in and no intercorrences", () => {
    expect(computeRiskStatus(null, [])).toEqual({
      status: "unknown",
      score: 0,
    });
  });

  it("is low (not unknown) with a check-in but no intercorrences", () => {
    expect(computeRiskStatus(checkIn(), [])).toEqual({
      status: "low",
      score: 0,
    });
  });

  it("is scored from intercorrences alone when there is no check-in", () => {
    expect(computeRiskStatus(null, [intercorrence(false)])).toEqual({
      status: "low",
      score: 1,
    });
  });
});

describe("scoreCheckIn — weeklyEvents", () => {
  it("adds 1 per non-critical event", () => {
    expect(
      computeRiskStatus(checkIn({ weeklyEvents: ["cough", "pain"] }), []).score,
    ).toBe(2);
  });

  it("adds 2 per critical event", () => {
    expect(
      computeRiskStatus(checkIn({ weeklyEvents: ["fever"] }), []).score,
    ).toBe(2);
  });

  it("mixes critical and non-critical correctly", () => {
    expect(
      computeRiskStatus(checkIn({ weeklyEvents: ["fever", "cough"] }), [])
        .score,
    ).toBe(3);
  });
});

describe("scoreCheckIn — simple boolean flags (+1 each)", () => {
  it.each([
    ["skinIssues", { skinIssues: true }],
    ["bowelRegular", { bowelRegular: false }],
    ["sleepWell", { sleepWell: false }],
    ["unstableGait", { unstableGait: true }],
    ["breathShortness", { breathShortness: true }],
    ["hydrationGoal", { hydrationGoal: false }],
    ["sunExposure", { sunExposure: false }],
    ["selfExpression", { selfExpression: false }],
    ["stimulation", { stimulation: false }],
    ["dailyBath", { dailyBath: false }],
    ["oralHygiene", { oralHygiene: false }],
    ["groomedNails", { groomedNails: false }],
  ])("%s contributes exactly 1 point", (_name, override) => {
    expect(computeRiskStatus(checkIn(override), []).score).toBe(1);
  });
});

describe("scoreCheckIn — mutually exclusive tiers", () => {
  it("appetite: good=0, regular=1, bad=2 (never both)", () => {
    expect(computeRiskStatus(checkIn({ appetite: "good" }), []).score).toBe(0);
    expect(computeRiskStatus(checkIn({ appetite: "regular" }), []).score).toBe(
      1,
    );
    expect(computeRiskStatus(checkIn({ appetite: "bad" }), []).score).toBe(2);
  });

  it("mood: happy=0, sad=1, very_sad=2 (never both)", () => {
    expect(computeRiskStatus(checkIn({ mood: "happy" }), []).score).toBe(0);
    expect(computeRiskStatus(checkIn({ mood: "sad" }), []).score).toBe(1);
    expect(computeRiskStatus(checkIn({ mood: "very_sad" }), []).score).toBe(2);
  });

  it("stressLevel: <3 adds 0, ==3 adds 1, >=4 adds 2", () => {
    expect(computeRiskStatus(checkIn({ stressLevel: 2 }), []).score).toBe(0);
    expect(computeRiskStatus(checkIn({ stressLevel: 3 }), []).score).toBe(1);
    expect(computeRiskStatus(checkIn({ stressLevel: 4 }), []).score).toBe(2);
    expect(computeRiskStatus(checkIn({ stressLevel: 10 }), []).score).toBe(2);
  });
});

describe("scoreCheckIn — double-weight flags (+2 each)", () => {
  it.each([
    ["chokingIncident", { chokingIncident: true }],
    ["medsOnTime", { medsOnTime: false }],
  ])("%s contributes exactly 2 points", (_name, override) => {
    expect(computeRiskStatus(checkIn(override), []).score).toBe(2);
  });
});

describe("computeRiskStatus — threshold boundaries (check-in only)", () => {
  it("score 2 is low, score 3 is moderate", () => {
    expect(
      computeRiskStatus(checkIn({ skinIssues: true, unstableGait: true }), []),
    ).toEqual({ status: "low", score: 2 });

    expect(
      computeRiskStatus(
        checkIn({
          skinIssues: true,
          unstableGait: true,
          breathShortness: true,
        }),
        [],
      ),
    ).toEqual({ status: "moderate", score: 3 });
  });

  it("score 5 is moderate, score 6 is high", () => {
    expect(
      computeRiskStatus(
        checkIn({ medsOnTime: false, chokingIncident: true, skinIssues: true }),
        [],
      ),
    ).toEqual({ status: "moderate", score: 5 });

    expect(
      computeRiskStatus(
        checkIn({
          medsOnTime: false,
          chokingIncident: true,
          skinIssues: true,
          unstableGait: true,
        }),
        [],
      ),
    ).toEqual({ status: "high", score: 6 });
  });
});

describe("computeRiskStatus — intercorrence weighting and combination", () => {
  it("critical intercorrence adds 3, non-critical adds 1", () => {
    expect(computeRiskStatus(null, [intercorrence(true)]).score).toBe(3);
    expect(computeRiskStatus(null, [intercorrence(false)]).score).toBe(1);
  });

  it("reaches moderate threshold via intercorrences alone", () => {
    expect(computeRiskStatus(null, [intercorrence(true)])).toEqual({
      status: "moderate",
      score: 3,
    });
  });

  it("reaches high threshold via intercorrences alone", () => {
    expect(
      computeRiskStatus(null, [intercorrence(true), intercorrence(true)]),
    ).toEqual({
      status: "high",
      score: 6,
    });
  });

  it("combines check-in score and intercorrence score additively", () => {
    expect(
      computeRiskStatus(checkIn({ appetite: "bad" }), [
        intercorrence(true),
        intercorrence(false),
      ]),
    ).toEqual({ status: "high", score: 6 });
  });
});

describe("computeRiskStatus — worst case", () => {
  it("caps out at the maximum possible score", () => {
    const worst = checkIn({
      weeklyEvents: [
        "fever",
        "breathing_difficulty",
        "fall_with_injury",
        "active_bleeding",
        "acute_confusion",
        "pain",
        "cough",
        "fall_without_injury",
      ],
      skinIssues: true,
      bowelRegular: false,
      sleepWell: false,
      unstableGait: true,
      appetite: "bad",
      chokingIncident: true,
      breathShortness: true,
      hydrationGoal: false,
      medsOnTime: false,
      mood: "very_sad",
      stressLevel: 10,
      sunExposure: false,
      selfExpression: false,
      stimulation: false,
      dailyBath: false,
      oralHygiene: false,
      groomedNails: false,
    });
    // I had to sum these by hand smh
    expect(computeRiskStatus(worst, []).score).toBe(35);
    expect(computeRiskStatus(worst, []).status).toBe("high");
  });
});
