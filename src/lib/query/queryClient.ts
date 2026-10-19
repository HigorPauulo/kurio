import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/http/apiError";

declare module "@tanstack/react-query" {
  interface Register {
    defaultError: ApiError;
  }
}

const MAX_QUERY_RETRIES = 2;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) =>
        error instanceof ApiError &&
        error.info.retryable &&
        failureCount < MAX_QUERY_RETRIES,
      retryDelay: (attempt) =>
        Math.min(500 * 2 ** attempt, 4000) + Math.random() * 250,
    },
    mutations: {
      retry: false,
    },
  },
});
