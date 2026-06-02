import { apiFetch } from "./client";
import type { User } from "../types/auth";

/**
 * Authenticate against POST /login. Resolves with the user's id and role, and
 * rejects with an Error whose message is "Invalid credentials" on a 401.
 */
export async function login(email: string, password: string): Promise<User> {
  try {
    return await apiFetch<User>("/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  } catch (err) {
    if ((err as { status?: number }).status === 401) {
      throw new Error("Invalid credentials");
    }
    throw err;
  }
}
