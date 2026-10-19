import { Link } from "@tanstack/react-router";
import { useId, type ComponentProps, type JSX, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TextFieldProps = ComponentProps<"input"> & {
  label: string;
  error?: string;
  hint?: ReactNode;
  suffix?: string;
  editIn?: { to: "/account/profile" | "/account/wallets"; label: string };
};

export function TextField({
  label,
  error,
  hint,
  suffix,
  editIn,
  readOnly,
  ...inputProps
}: TextFieldProps): JSX.Element {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error && errorId, (hint ?? editIn) && hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          readOnly={readOnly}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={readOnly ? "bg-muted" : undefined}
          {...inputProps}
        />
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
      {(hint ?? editIn) && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
          {editIn && (
            <Link to={editIn.to} className="underline underline-offset-4">
              {editIn.label}
            </Link>
          )}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormError({ message }: { message?: string }): JSX.Element | null {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}
