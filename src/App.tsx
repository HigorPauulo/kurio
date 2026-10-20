import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import type { JSX } from "react";
import { queryClient } from "@/lib/query/queryClient";
import { router } from "@/router";
import { configureHttp } from "@/lib/http/client";
import { configureRealtime, realtime } from "@/lib/realtime/instance";
import { guestCart, sessionStore } from "@/lib/session/instance";

configureHttp({
  getToken: () => sessionStore.getToken(),
  getGuestCartId: () => guestCart.peek(),
  onSessionExpired: () => sessionStore.expire(),
});

configureRealtime({ onSessionExpired: () => sessionStore.expire() });

function syncRealtime(): void {
  const state = sessionStore.getState();
  if (state.status === "expired") realtime.disconnect();
  else realtime.connect(state.status === "authenticated" ? state.session.token : null);
}

const initialSession = sessionStore.getState();
realtime.reset(initialSession.status === "anonymous" ? null : initialSession.session.user.id);
sessionStore.subscribe(syncRealtime);
syncRealtime();

export default function App(): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
