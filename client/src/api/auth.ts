import { isAxiosError } from "axios";
import { http } from "./http";
import type { User } from "../types/auth";

/**
 * Authenticate against POST /login. Resolves with the user's id, role and
 * token, and rejects with an Error whose message is "Invalid credentials" on a
 * 401 so the login screen can show the wrong-credentials toast.
 */
export async function login(email: string, password: string): Promise<User> {
  try {
    const { data } = await http.post<User>("/login", { email, password });
    return data;
  } catch (err) {
    if (isAxiosError(err) && err.response?.status === 401) {
      throw new Error("Invalid credentials");
    }
    throw err;
  }
}
