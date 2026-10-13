import { describe, it, expect } from "@jest/globals";
import { maskPhone } from "./phone";

describe("maskPhone", () => {
  it("formats a mobile number as it is typed", () => {
    expect(maskPhone("8")).toBe("(8");
    expect(maskPhone("83")).toBe("(83");
    expect(maskPhone("839999")).toBe("(83) 9999");
    expect(maskPhone("83999991234")).toBe("(83) 99999-1234");
  });

  it("formats a landline with eight digits after the DDD", () => {
    expect(maskPhone("8332221100")).toBe("(83) 3222-1100");
  });

  it("ignores anything that is not a digit and stops at eleven digits", () => {
    expect(maskPhone("(83) 99999-12345")).toBe("(83) 99999-1234");
    expect(maskPhone("")).toBe("");
  });
});
