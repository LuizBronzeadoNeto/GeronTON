import { isAxiosError } from "axios";

/**
 * Portuguese text for failures that never reached a route: no connection, a
 * timeout or the rate limiter. Returns null for anything else so the caller
 * keeps its own, more specific message.
 */
export function connectionErrorMessage(error: unknown): string | null {
  if (!isAxiosError(error)) return null;
  if (error.response?.status === 429) {
    return "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
  }
  if (!error.response) {
    return "Sem conexão com o servidor. Verifique a internet e tente de novo.";
  }
  return null;
}
