import { Link } from "@tanstack/react-router";
import type { JSX, ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

type AuthDialogProps = {
  mode: "login" | "register";
  open: boolean;
  onClose: () => void;
  description: string;
  children: ReactNode;
};

const TAB = "text-xl leading-6";
const SOCIAL =
  "flex h-10 items-center justify-center gap-3 rounded-md border border-border-strong text-caption font-medium text-text-secondary hover:border-primary";

export function AuthDialog({ mode, open, onClose, description, children }: AuthDialogProps): JSX.Element {
  const isLogin = mode === "login";

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="gap-6 px-6 pt-10 pb-12 max-sm:top-0 max-sm:left-0 max-sm:h-dvh max-sm:max-h-dvh max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:border-b-0 max-sm:bg-background sm:max-w-125 sm:px-20">
        <p aria-hidden="true" className="pt-10 pb-6 text-center text-3xl font-bold tracking-brand sm:hidden">
          KURIO
        </p>
        <div className="flex items-center justify-center gap-2">
          {isLogin ? (
            <>
              <DialogTitle className={`${TAB} font-medium text-text-accent`}>Entrar</DialogTitle>
              <span aria-hidden="true" className="h-6 w-px bg-primary" />
              <Link
                to="."
                search={(previous) => ({ ...previous, auth: "register" })}
                replace
                resetScroll={false}
                className={`${TAB} hover:text-text-accent`}
              >
                Criar conta
              </Link>
            </>
          ) : (
            <>
              <Link
                to="."
                search={(previous) => ({ ...previous, auth: "login" })}
                replace
                resetScroll={false}
                className={`${TAB} hover:text-text-accent`}
              >
                Entrar
              </Link>
              <span aria-hidden="true" className="h-6 w-px bg-primary" />
              <DialogTitle className={`${TAB} font-medium text-text-accent`}>Criar conta</DialogTitle>
            </>
          )}
        </div>
        <DialogDescription className="text-center text-caption leading-4 text-foreground">{description}</DialogDescription>
        {children}
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-3 text-caption before:h-px before:flex-1 before:bg-border-strong after:h-px after:flex-1 after:bg-border-strong sm:-mx-20">
            Ou continue com
          </p>
          <Link to="/unavailable" search={{ from: "login-google" }} className={SOCIAL}>
            <img src="/images/icons/google.svg" alt="" width={20} height={20} />
            Continuar com Google
          </Link>
          <Link to="/unavailable" search={{ from: "login-facebook" }} className={SOCIAL}>
            <img src="/images/icons/facebook.svg" alt="" width={20} height={20} />
            Continuar com Facebook
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
