import axios from "axios";
import { BASE_URL } from "./baseUrl";

let authToken: string | null = null;

/**
 * Sets (or clears, with null) the bearer token attached to every subsequent
 * request. Called by the auth context on sign-in and sign-out.
 */
export function setAuthToken(token: string | null): void {
  authToken = token;
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
