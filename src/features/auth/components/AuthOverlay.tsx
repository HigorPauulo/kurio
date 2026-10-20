import { useNavigate, useSearch } from "@tanstack/react-router";
import type { JSX } from "react";
import { safeRedirect } from "@/lib/url/safeRedirect";
import { LoginDialog } from "./LoginDialog";
import { RegisterDialog } from "./RegisterDialog";

export function AuthOverlay(): JSX.Element {
  const { auth, redirect } = useSearch({ from: "__root__" });
  const navigate = useNavigate();

  async function handleClose(): Promise<void> {
    await navigate({
      to: ".",
      search: (previous) => ({ ...previous, auth: undefined, redirect: undefined }),
      replace: true,
      resetScroll: false,
    });
  }

  async function handleDone(): Promise<void> {
    if (redirect) await navigate({ href: safeRedirect(redirect) });
    else await handleClose();
  }

  const props = { onClose: () => void handleClose(), onDone: handleDone };
  return (
    <>
      <LoginDialog open={auth === "login"} {...props} />
      <RegisterDialog open={auth === "register"} {...props} />
    </>
  );
}
