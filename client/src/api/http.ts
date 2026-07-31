import axios, { isAxiosError } from "axios";
import { BASE_URL } from "./baseUrl";

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

/**
 * Sets (or clears, with null) the bearer token attached to every subsequent
 * request. Called by the auth context on sign-in and sign-out.
 */
export function setAuthToken(token: string | null): void {
  authToken = token;
}

/**
 * Registers the callback invoked when the API rejects the current token. The
 * auth context uses it to drop the session, which is what ends a restored
 * session whose 2h JWT expired while the app was closed.
 */
export function setOnUnauthorized(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

/**
 * Axios instance for the backend. A request interceptor attaches the current
 * bearer token (see setAuthToken) so the token-protected routes can be reached.
 */
export const http = axios.create({ baseURL: BASE_URL });

http.interceptors.request.use((config) => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

/**
 * Signs the user out when any authenticated request comes back 401.
 *
 * POST /login is excluded: a 401 there means the typed password was wrong, which
 * the login screen reports itself, and treating it as a session expiry would
 * clear storage on every failed attempt.
 */
http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const isLogin = isAxiosError(error) && error.config?.url === "/login";

    if (isAxiosError(error) && error.response?.status === 401 && !isLogin) {
      onUnauthorized?.();
    }

    return Promise.reject(error);
  },
);
