import { describe, it, expect } from "@jest/globals";
import { cpfToDigits, maskCpf } from "./cpf";

describe("maskCpf", () => {
  it("inserts the separators as the user types", () => {
    expect(maskCpf("111")).toBe("111");
    expect(maskCpf("111444")).toBe("111.444");
    expect(maskCpf("111444777")).toBe("111.444.777");
    expect(maskCpf("11144477735")).toBe("111.444.777-35");
  });

  it("ignores characters that are not digits", () => {
    expect(maskCpf("111.444.777-35")).toBe("111.444.777-35");
    expect(maskCpf("abc111")).toBe("111");
  });

  it("stops at eleven digits", () => {
    expect(maskCpf("111444777359999")).toBe("111.444.777-35");
  });
});

describe("cpfToDigits", () => {
  it("strips the mask from a complete CPF", () => {
    expect(cpfToDigits("111.444.777-35")).toBe("11144477735");
  });

  it("returns null while the CPF is incomplete", () => {
    expect(cpfToDigits("111.444.777")).toBeNull();
    expect(cpfToDigits("")).toBeNull();
  });
});
