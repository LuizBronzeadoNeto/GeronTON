import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import * as SecureStore from "expo-secure-store";
import { clearSession, loadSession, saveSession } from "./session";
import type { User } from "../types/auth";

const SESSION_KEY = "geronton.session";

const USER: User = { id: 7, role: "cuidador", token: "jwt-token" };

const mockedGet = jest.mocked(SecureStore.getItemAsync);
const mockedSet = jest.mocked(SecureStore.setItemAsync);
const mockedDelete = jest.mocked(SecureStore.deleteItemAsync);

describe("session storage", () => {
  beforeEach(async () => {
    await clearSession();
    mockedGet.mockClear();
    mockedSet.mockClear();
    mockedDelete.mockClear();
  });

  it("round-trips a saved session", async () => {
    await saveSession(USER);

    expect(mockedSet).toHaveBeenCalledWith(SESSION_KEY, JSON.stringify(USER));
    await expect(loadSession()).resolves.toEqual(USER);
  });

  it("resolves null when nothing is stored", async () => {
    await expect(loadSession()).resolves.toBeNull();
  });

  it("clears the stored session", async () => {
    await saveSession(USER);
    await clearSession();

    expect(mockedDelete).toHaveBeenCalledWith(SESSION_KEY);
    await expect(loadSession()).resolves.toBeNull();
  });

  it("discards a corrupted entry instead of throwing", async () => {
    mockedGet.mockResolvedValueOnce("not json at all");

    await expect(loadSession()).resolves.toBeNull();
    expect(mockedDelete).toHaveBeenCalledWith(SESSION_KEY);
  });

  it("discards a well-formed entry that is not a session", async () => {
    mockedGet.mockResolvedValueOnce(JSON.stringify({ id: 7 }));

    await expect(loadSession()).resolves.toBeNull();
    expect(mockedDelete).toHaveBeenCalledWith(SESSION_KEY);
  });

  it("resolves null when secure storage is unreadable", async () => {
    mockedGet.mockRejectedValueOnce(new Error("keystore unavailable"));

    await expect(loadSession()).resolves.toBeNull();
  });

  it("does not reject a sign-in when secure storage cannot be written", async () => {
    mockedSet.mockRejectedValueOnce(new Error("keystore unavailable"));

    await expect(saveSession(USER)).resolves.toBeUndefined();
  });
});
