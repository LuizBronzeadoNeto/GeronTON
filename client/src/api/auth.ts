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
  acceptedTerms: boolean;
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
  acceptedTerms,
}: RegisterInput): Promise<void> {
  const path = role === "profissional" ? "/profissionais" : "/cuidadores";

  try {
    await http.post(path, { email, password, crm, acceptedTerms });
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

/**
 * Records that the signed-in user accepted the given version of the consent
 * term (POST /consentimento).
 */
export async function acceptConsent(version: string): Promise<void> {
  await http.post("/consentimento", { version });
}

/**
 * Deletes the signed-in user's account (DELETE /conta) after checking the
 * password. Rejects with an Error whose message is ready to show.
 */
export async function deleteAccount(password: string): Promise<void> {
  try {
    await http.delete("/conta", { data: { password } });
  } catch (err) {
    if (isAxiosError(err) && err.response?.status === 403) {
      throw new Error("Senha incorreta.");
    }
    throw new Error("Não foi possível excluir a conta. Tente de novo.");
  }
}
