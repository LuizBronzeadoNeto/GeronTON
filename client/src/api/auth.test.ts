import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { http } from "./http";
import { login } from "./auth";

jest.mock("./http", () => ({
  http: { post: jest.fn() },
}));

const mockedPost = jest.mocked(http.post);

describe("login", () => {
  beforeEach(() => {
    mockedPost.mockReset();
  });

  it("resolves with the user on success", async () => {
    mockedPost.mockResolvedValue({
      data: { id: 1, role: "cuidador", token: "jwt-token" },
    } as never);

    await expect(login("cuidador@demo.com", "senha123")).resolves.toEqual({
      id: 1,
      role: "cuidador",
      token: "jwt-token",
    });
    expect(mockedPost).toHaveBeenCalledWith("/login", {
      email: "cuidador@demo.com",
      password: "senha123",
    });
  });

  it("rejects with 'Invalid credentials' on a 401", async () => {
    mockedPost.mockRejectedValue(
      Object.assign(new Error("Request failed with status code 401"), {
        isAxiosError: true,
        response: { status: 401 },
      }),
    );

    await expect(login("x@y.com", "wrong")).rejects.toThrow(
      "Invalid credentials",
    );
  });

  it("rethrows other errors untouched", async () => {
    mockedPost.mockRejectedValue(new Error("Network Error"));

    await expect(login("x@y.com", "pw")).rejects.toThrow("Network Error");
  });
});
