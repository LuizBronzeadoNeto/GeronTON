import { describe, it, expect } from "@jest/globals";
import { connectionErrorMessage } from "./errors";

function axiosError(response?: { status: number }) {
  return Object.assign(new Error("x"), { isAxiosError: true, response });
}

describe("connectionErrorMessage", () => {
  it("explains a request that never got an answer", () => {
    expect(connectionErrorMessage(axiosError())).toBe(
      "Sem conexão com o servidor. Verifique a internet e tente de novo.",
    );
  });

  it("explains the rate limiter", () => {
    expect(connectionErrorMessage(axiosError({ status: 429 }))).toBe(
      "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
    );
  });

  it("leaves other failures to the caller", () => {
    expect(connectionErrorMessage(axiosError({ status: 500 }))).toBeNull();
    expect(connectionErrorMessage(new Error("x"))).toBeNull();
  });
});
