import { describe, it, expect } from "@jest/globals";
import {
  clearDraft,
  loadDraft,
  saveDraft,
  type CheckInDraft,
} from "./checkInDraft";

const DRAFT: CheckInDraft = {
  step: 2,
  shortForm: false,
  yesNo: { skinIssues: true },
  events: ["fever"],
  texts: { pressure: "12x8" },
  lists: { needsFood: [] },
  appetite: null,
  mood: null,
  stressLevel: 1,
};

describe("check-in drafts", () => {
  it("round-trips a draft per user and elder", async () => {
    await saveDraft(1, 5, DRAFT);

    expect(await loadDraft(1, 5)).toEqual(DRAFT);
    expect(await loadDraft(1, 6)).toBeNull();
    expect(await loadDraft(2, 5)).toBeNull();
  });

  it("forgets a cleared draft", async () => {
    await saveDraft(1, 7, DRAFT);
    await clearDraft(1, 7);

    expect(await loadDraft(1, 7)).toBeNull();
  });

  it("ignores a draft older than a week", async () => {
    await saveDraft(1, 8, DRAFT, Date.now() - 8 * 24 * 60 * 60 * 1000);

    expect(await loadDraft(1, 8)).toBeNull();
  });
});
