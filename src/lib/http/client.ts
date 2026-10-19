import axios, { type AxiosError } from "axios";
import { normalizeError } from "./apiError";

export type HttpConfig = {
  getToken: () => string | null;
  getGuestCartId: () => string | null;
  onSessionExpired: () => void;
};

let config: HttpConfig = {
  getToken: () => null,
  getGuestCartId: () => null,
  onSessionExpired: () => undefined,
};

let lastExpiredToken: string | null = null;

export function configureHttp(next: HttpConfig): void {
  config = next;
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
  timeout: 10_000,
});

http.interceptors.request.use((request) => {
  request.headers.set("X-Request-Id", crypto.randomUUID());

  const token = config.getToken();
  if (token) {
    request.headers.set("Authorization", `Bearer ${token}`);
    return request;
  }

  const guestCartId = config.getGuestCartId();
  if (guestCartId) request.headers.set("X-Guest-Cart-Id", guestCartId);
  return request;
});

http.interceptors.response.use(undefined, (error: AxiosError) => {
  if (axios.isCancel(error)) return Promise.reject(error);

  const apiError = normalizeError(error);
  if (apiError.info.code === "SESSION_EXPIRED") {
    const token = config.getToken();
    if (token !== lastExpiredToken) {
      lastExpiredToken = token;
      config.onSessionExpired();
    }
  }
  return Promise.reject(apiError);
});
