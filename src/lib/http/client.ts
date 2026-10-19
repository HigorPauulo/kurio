import axios, { type InternalAxiosRequestConfig } from "axios";
import { normalizeError } from "./apiError";

export type HttpConfig = {
  getToken: () => string | null;
  getGuestCartId: () => string | null;
  onSessionExpired: () => void;
};

const BEARER_PREFIX = "Bearer ";

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
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  timeout: 10_000,
});

function readSentToken(
  request: InternalAxiosRequestConfig | undefined,
): string | null {
  const authorization = request?.headers.get("Authorization");
  if (typeof authorization !== "string") return null;
  if (!authorization.startsWith(BEARER_PREFIX)) return null;
  return authorization.slice(BEARER_PREFIX.length);
}

http.interceptors.request.use((request) => {
  request.headers.set("X-Request-Id", crypto.randomUUID());

  const token = config.getToken();
  if (token) {
    request.headers.set("Authorization", `${BEARER_PREFIX}${token}`);
    return request;
  }

  const guestCartId = config.getGuestCartId();
  if (guestCartId) request.headers.set("X-Guest-Cart-Id", guestCartId);
  return request;
});

http.interceptors.response.use(undefined, (error: unknown) => {
  if (!axios.isAxiosError(error) || axios.isCancel(error)) {
    return Promise.reject(
      error instanceof Error ? error : new Error(String(error)),
    );
  }

  const apiError = normalizeError(error);
  if (apiError.info.code === "SESSION_EXPIRED") {
    const sentToken = readSentToken(error.config);
    if (sentToken !== null && sentToken !== lastExpiredToken) {
      lastExpiredToken = sentToken;
      config.onSessionExpired();
    }
  }
  return Promise.reject(apiError);
});
