import { redirect } from "@tanstack/react-router";
import { safeRedirect } from "@/lib/url/safeRedirect";
import { sessionStore } from "./instance";

export type AuthMode = "login" | "register";

const PRIVATE_PREFIXES = ["/account", "/checkout", "/orders"];

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

export function isPrivatePath(target: string): boolean {
  const pathname = target.split(/[?#]/, 1)[0];
  return PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function openAuthDialog(mode: AuthMode, target: string | undefined): never {
  redirectIfAuthenticated(target);
  const destination = safeRedirect(target);
  if (isPrivatePath(destination)) {
    throw redirect({ to: "/", search: { auth: mode, redirect: destination } });
  }
  const url = new URL(destination, window.location.origin);
  url.searchParams.set("auth", mode);
  throw redirect({ href: `${url.pathname}${url.search}${url.hash}` });
}
