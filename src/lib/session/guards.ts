import { redirect } from "@tanstack/react-router";
import { safeRedirect } from "@/lib/url/safeRedirect";
import { sessionStore } from "./instance";

export function requireUserId(location: { href: string }): string {
  const state = sessionStore.getState();
  if (state.status !== "authenticated") {
    throw redirect({ to: "/login", search: { redirect: location.href } });
  }
  return state.session.user.id;
}

export function redirectIfAuthenticated(target: string | undefined): void {
  if (sessionStore.getState().status === "authenticated") {
    throw redirect({ href: safeRedirect(target) });
  }
}
