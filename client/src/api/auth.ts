import { isAxiosError } from "axios";
import { http } from "./http";
import type { Role, User } from "../types/auth";

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

export interface RegisterInput {
  email: string;
  password: string;
  role: Role;
  crm: string;
}

/**
 * Creates an account against POST /cuidadores or POST /profissionais, which
 * differ only in the role they assign. Registration needs no session: a new
 * account of either role can see nothing until it registers an elder or binds
 * to one.
 *
 * Rejects with an Error whose message is ready to show, since the backend
 * answers in English and the sign-up screen speaks Portuguese.
 */
export async function register({
  email,
  password,
  role,
  crm,
}: RegisterInput): Promise<void> {
  const path = role === "profissional" ? "/profissionais" : "/cuidadores";

  try {
    await http.post(path, { email, password, crm });
  } catch (err) {
    if (isAxiosError(err)) {
      if (err.response?.status === 409) {
        throw new Error("Já existe uma conta com esse e-mail ou CRM.");
      }
      if (err.response?.status === 429) {
        throw new Error("Muitas tentativas. Tente novamente mais tarde.");
      }
      if (err.response?.status === 400) {
        throw new Error("Verifique os dados informados.");
      }
    }
    throw new Error("Não foi possível criar a conta.");
  }
}
