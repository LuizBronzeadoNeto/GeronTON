import { describe, it, expect } from "@jest/globals";
import { computeRiskStatus, evaluateCheckIn } from "../src/utils/risk.js";
import type { CheckIn, Intercorrence } from "@prisma/client";

const CLEAN_CHECKIN = {
  id: 1,
  profileId: 1,
  date: new Date(),
  skinIssues: false,
  bowelRegular: true,
  sleepWell: true,
  unstableGait: false,
  weeklyEvents: [] as string[],
  otherEvent: null,
  pressure: null,
  saturation: null,
  glycemia: null,
  calfCircumference: null,
  appetite: "good",
  chokingIncident: false,
  chokingFrequency: null,
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

function intercorrence(isCritical: boolean, eventType = "fall"): Intercorrence {
  return { isCritical, eventType } as Intercorrence;
}

/**
 * Risk engine regression test suite, ran before each commit: provides a base
 * check-in with every answer in its "safe" state, so each test only overrides
 * the fields relevant to what it's checking. Mirrors the heuristic.md weights
 * (IVCF-20 + SUS care pathways) without any DB dependency.
 */
describe("computeRiskStatus — no data", () => {
  it("is unknown with no check-in and no intercorrences", () => {
    expect(computeRiskStatus(null, [])).toMatchObject({
      status: "unknown",
      score: 0,
    });
  });

  it("is low (not unknown) with a clean check-in and no intercorrences", () => {
    expect(computeRiskStatus(checkIn(), [])).toMatchObject({
      status: "low",
      score: 0,
    });
  });

  it("applies the acute-event floor when there is no check-in", () => {
    expect(computeRiskStatus(null, [intercorrence(false)])).toMatchObject({
      status: "moderate",
      score: 0,
    });
  });
});

describe("evaluateCheckIn — weekly events", () => {
  it("adds 5 per native-critical event", () => {
    expect(evaluateCheckIn(checkIn({ weeklyEvents: ["fever"] })).score).toBe(5);
  });

  it("adds 3 for a fall without injury", () => {
    expect(
      evaluateCheckIn(checkIn({ weeklyEvents: ["fall_without_injury"] })).score,
    ).toBe(3);
  });

  it("adds 2 per comfort-decline event", () => {
    expect(
      evaluateCheckIn(checkIn({ weeklyEvents: ["pain", "cough"] })).score,
    ).toBe(4);
  });

  it("reports the native-critical events for the dashboard flag", () => {
    expect(
      evaluateCheckIn(checkIn({ weeklyEvents: ["fever", "pain", "cough"] }))
        .criticalEvents,
    ).toEqual(["fever"]);
  });
});

describe("evaluateCheckIn — health domain weights", () => {
  it.each([
    ["skinIssues", { skinIssues: true }, 3],
    ["bowelRegular", { bowelRegular: false }, 2],
    ["sleepWell", { sleepWell: false }, 2],
    ["unstableGait", { unstableGait: true }, 4],
  ] as const)("%s contributes %i points", (_name, override, points) => {
    expect(evaluateCheckIn(checkIn(override)).score).toBe(points);
  });
});

describe("evaluateCheckIn — nutrition and medication weights", () => {
  it("appetite: good=0, regular=1, bad=3", () => {
    expect(evaluateCheckIn(checkIn({ appetite: "good" })).score).toBe(0);
    expect(evaluateCheckIn(checkIn({ appetite: "regular" })).score).toBe(1);
    expect(evaluateCheckIn(checkIn({ appetite: "bad" })).score).toBe(3);
  });

  it.each([
    ["chokingIncident", { chokingIncident: true }, 5],
    ["hydrationGoal", { hydrationGoal: false }, 2],
    ["medsOnTime", { medsOnTime: false }, 3],
  ] as const)("%s contributes %i points", (_name, override, points) => {
    expect(evaluateCheckIn(checkIn(override)).score).toBe(points);
  });
});

describe("evaluateCheckIn — behavioral and stimulation weights", () => {
  it("mood: happy=0, neutral=1, sad and very_sad=2", () => {
    expect(evaluateCheckIn(checkIn({ mood: "happy" })).score).toBe(0);
    expect(evaluateCheckIn(checkIn({ mood: "neutral" })).score).toBe(1);
    expect(evaluateCheckIn(checkIn({ mood: "sad" })).score).toBe(2);
    expect(evaluateCheckIn(checkIn({ mood: "very_sad" })).score).toBe(2);
  });

  it.each([
    ["sunExposure", { sunExposure: false }],
    ["selfExpression", { selfExpression: false }],
    ["stimulation", { stimulation: false }],
  ] as const)("%s contributes 1 point", (_name, override) => {
    expect(evaluateCheckIn(checkIn(override)).score).toBe(1);
  });

  it.each([
    ["breathShortness", { breathShortness: true }],
    ["stressLevel", { stressLevel: 5 }],
    ["dailyBath", { dailyBath: false }],
    ["oralHygiene", { oralHygiene: false }],
    ["groomedNails", { groomedNails: false }],
  ] as const)("%s does not enter the linear sum", (_name, override) => {
    expect(evaluateCheckIn(checkIn(override)).score).toBe(0);
  });
});

describe("evaluateCheckIn — vital-sign outlier filter", () => {
  it("saturation below 92% adds 4 points", () => {
    expect(evaluateCheckIn(checkIn({ saturation: "90%" })).score).toBe(4);
    expect(evaluateCheckIn(checkIn({ saturation: "95%" })).score).toBe(0);
  });

  it("calf circumference below 31 cm adds 2 points and a sarcopenia flag", () => {
    const result = evaluateCheckIn(checkIn({ calfCircumference: "30,5" }));
    expect(result.score).toBe(2);
    expect(result.flags).toEqual([
      expect.objectContaining({ type: "sarcopenia_risk" }),
    ]);
  });

  it("blood pressure and glycemia outliers only raise flags", () => {
    const result = evaluateCheckIn(
      checkIn({ pressure: "150/95", glycemia: "250" }),
    );
    expect(result.score).toBe(0);
    expect(result.flags.map((flag) => flag.type)).toEqual([
      "clinical_warning",
      "metabolic_decompensation",
    ]);
  });
});

describe("computeRiskStatus — threshold boundaries (check-in only)", () => {
  it("score 5 is low, score 6 is moderate", () => {
    expect(
      computeRiskStatus(checkIn({ chokingIncident: true }), []),
    ).toMatchObject({
      status: "low",
      score: 5,
    });

    expect(
      computeRiskStatus(
        checkIn({ chokingIncident: true, appetite: "regular" }),
        [],
      ),
    ).toMatchObject({ status: "moderate", score: 6 });
  });

  it("score 11 is moderate, score 12 is high", () => {
    expect(
      computeRiskStatus(
        checkIn({
          skinIssues: true,
          bowelRegular: false,
          sleepWell: false,
          unstableGait: true,
        }),
        [],
      ),
    ).toMatchObject({ status: "moderate", score: 11 });

    expect(
      computeRiskStatus(
        checkIn({
          unstableGait: true,
          chokingIncident: true,
          medsOnTime: false,
        }),
        [],
      ),
    ).toMatchObject({ status: "high", score: 12 });
  });
});

describe("computeRiskStatus — acute-event floor", () => {
  it("a non-critical intercorrence forces at least moderate without scoring", () => {
    expect(computeRiskStatus(checkIn(), [intercorrence(false)])).toMatchObject({
      status: "moderate",
      score: 0,
    });
  });

  it("a critical intercorrence forces high", () => {
    expect(computeRiskStatus(checkIn(), [intercorrence(true)])).toMatchObject({
      status: "high",
      score: 0,
    });
  });

  it("intrinsically critical event types force high regardless of severity", () => {
    expect(
      computeRiskStatus(checkIn(), [intercorrence(false, "fever")]),
    ).toMatchObject({ status: "high", score: 0 });
  });

  it("keeps the more severe status when the weekly score is already high", () => {
    expect(
      computeRiskStatus(
        checkIn({
          unstableGait: true,
          chokingIncident: true,
          medsOnTime: false,
        }),
        [intercorrence(false)],
      ),
    ).toMatchObject({ status: "high", score: 12 });
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
      saturation: "88%",
      calfCircumference: "29",
      appetite: "bad",
      chokingIncident: true,
      hydrationGoal: false,
      medsOnTime: false,
      mood: "very_sad",
      sunExposure: false,
      selfExpression: false,
      stimulation: false,
    });

    expect(computeRiskStatus(worst, [])).toMatchObject({
      status: "high",
      score: 67,
    });
  });
});

describe("evaluateCheckIn — blood pressure in cmHg", () => {
  it.each(["12x8", "12/8", "12 por 8"])("reads %s as 120/80", (pressure) => {
    expect(evaluateCheckIn(checkIn({ pressure })).flags).toEqual([]);
  });

  it("reads 13,5x9 as 135/90 without a flag", () => {
    expect(evaluateCheckIn(checkIn({ pressure: "13,5x9" })).flags).toEqual([]);
  });

  it("still flags a real low reading written in cmHg", () => {
    const { flags } = evaluateCheckIn(checkIn({ pressure: "8x5" }));
    expect(flags).toEqual([
      expect.objectContaining({
        type: "clinical_warning",
        message: "Pressão arterial 80/50, abaixo de 90/60",
      }),
    ]);
  });
});

describe("computeRiskStatus — critical event types", () => {
  it.each(["chest_pain", "choking"])("%s forces high", (eventType) => {
    expect(
      computeRiskStatus(checkIn(), [intercorrence(false, eventType)]).status,
    ).toBe("high");
  });
});

describe("computeRiskStatus — stale check-ins", () => {
  const now = new Date("2026-10-13T12:00:00Z");
  const old = checkIn({
    date: new Date("2026-09-20T12:00:00Z"),
    unstableGait: true,
    chokingIncident: true,
    medsOnTime: false,
  });

  it("ignores a check-in older than 14 days", () => {
    expect(computeRiskStatus(old, [], now)).toEqual({
      status: "unknown",
      score: 0,
      criticalEvents: [],
      reasons: ["Sem check-in nas últimas 2 semanas"],
    });
  });

  it("keeps the acute-event floor when the check-in is stale", () => {
    expect(computeRiskStatus(old, [intercorrence(true)], now).status).toBe(
      "high",
    );
  });

  it("uses a check-in from 13 days ago", () => {
    const recent = checkIn({ ...old, date: new Date("2026-09-30T12:00:00Z") });
    expect(computeRiskStatus(recent, [], now)).toMatchObject({
      status: "high",
      score: 12,
    });
  });
});

describe("risk reasons", () => {
  it("lists what added points to the weekly score", () => {
    const { factors } = evaluateCheckIn(
      checkIn({ unstableGait: true, appetite: "bad", weeklyEvents: ["fever"] }),
    );
    expect(factors).toEqual([
      { label: "Andando com mais dificuldade", points: 4 },
      { label: "Febre na semana", points: 5 },
      { label: "Apetite ruim", points: 3 },
    ]);
  });

  it("explains the status with the check-in and the recent events", () => {
    const { reasons } = computeRiskStatus(checkIn({ unstableGait: true }), [
      intercorrence(true),
    ]);
    expect(reasons).toEqual([
      "Intercorrência crítica nos últimos 30 dias",
      "Andando com mais dificuldade (+4)",
    ]);
  });

  it("says when there is no recent check-in", () => {
    expect(computeRiskStatus(null, [intercorrence(false)]).reasons).toEqual([
      "Intercorrência nos últimos 30 dias",
      "Sem check-in nas últimas 2 semanas",
    ]);
  });
});
