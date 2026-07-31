import { describe, it, expect } from "@jest/globals";
import { isValidCpf, normalizeCpf } from "../src/utils/cpf.js";
import { normalizeCrm } from "../src/utils/crm.js";

const VALID = "11144477735";

describe("normalizeCpf", () => {
  it("strips punctuation from a formatted CPF", () => {
    expect(normalizeCpf("111.444.777-35")).toBe(VALID);
  });

  it("accepts an already-normalized CPF", () => {
    expect(normalizeCpf(VALID)).toBe(VALID);
  });

  it("rejects a value with the wrong number of digits", () => {
    expect(normalizeCpf("1114447773")).toBeNull();
    expect(normalizeCpf("111444777356")).toBeNull();
  });

  it("rejects non-string values", () => {
    expect(normalizeCpf(11144477735)).toBeNull();
    expect(normalizeCpf(undefined)).toBeNull();
    expect(normalizeCpf(null)).toBeNull();
  });
});

describe("isValidCpf", () => {
  it("accepts a CPF with correct check digits", () => {
    expect(isValidCpf(VALID)).toBe(true);
  });

  it("rejects a CPF whose check digits do not match", () => {
    expect(isValidCpf("11144477734")).toBe(false);
    expect(isValidCpf("11144477745")).toBe(false);
  });

  it("rejects sequences of a single repeated digit", () => {
    for (let digit = 0; digit <= 9; digit += 1) {
      expect(isValidCpf(String(digit).repeat(11))).toBe(false);
    }
  });

  it("rejects anything that is not eleven digits", () => {
    expect(isValidCpf("1114447773")).toBe(false);
    expect(isValidCpf("1114447773a")).toBe(false);
  });
});

describe("normalizeCrm", () => {
  it("normalizes the shapes a professional might type", () => {
    expect(normalizeCrm("12345-PB")).toBe("12345-PB");
    expect(normalizeCrm("12345 pb")).toBe("12345-PB");
    expect(normalizeCrm("CRM/PB 12345")).toBe("12345-PB");
  });

  it("rejects an unknown federative unit", () => {
    expect(normalizeCrm("12345-XX")).toBeNull();
  });

  it("rejects malformed values", () => {
    expect(normalizeCrm("12345")).toBeNull();
    expect(normalizeCrm("PB")).toBeNull();
    expect(normalizeCrm("123-PB")).toBeNull();
    expect(normalizeCrm(12345)).toBeNull();
  });
});
