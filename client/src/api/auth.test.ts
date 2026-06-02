import { describe, it, expect, afterEach, jest } from "@jest/globals";
import { login } from "./auth";

describe("login", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("resolves with the user on success", async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ id: 1, role: "cuidador" }),
    })) as unknown as typeof fetch;

    await expect(login("cuidador@demo.com", "senha123")).resolves.toEqual({
      id: 1,
      role: "cuidador",
    });
  });

  it("rejects with 'Invalid credentials' on a 401", async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 401,
      json: async () => ({ error: "invalid credentials" }),
    })) as unknown as typeof fetch;

    await expect(login("x@y.com", "wrong")).rejects.toThrow(
      "Invalid credentials",
    );
  });
});
