import { Link } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useId, useState, type ComponentProps, type JSX, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type TextFieldProps = ComponentProps<"input"> & {
  label: string;
  error?: string;
  hint?: ReactNode;
  suffix?: string;
  editIn?: { to: "/account/profile" | "/account/wallets"; label: string };
  isLabelHidden?: boolean;
};

export function TextField({
  label,
  error,
  hint,
  suffix,
  editIn,
  readOnly,
  required,
  isLabelHidden,
  type,
  ...inputProps
}: TextFieldProps): JSX.Element {
  const id = useId();
  const [isRevealed, setIsRevealed] = useState(false);
  const isPassword = type === "password";
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error && errorId, (hint ?? editIn) && hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Label htmlFor={id} className={isLabelHidden ? "sr-only" : undefined}>
        {label}
        {required && (
          <span aria-hidden="true" className="text-lg leading-none text-destructive">
            *
          </span>
        )}
      </Label>
      <div className="relative flex items-stretch">
        <Input
          id={id}
          type={isPassword && isRevealed ? "text" : type}
          readOnly={readOnly}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(suffix && "rounded-r-none", isPassword && "pr-11")}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            aria-label={isRevealed ? "Ocultar o texto digitado" : "Mostrar o texto digitado"}
            aria-pressed={isRevealed}
            aria-controls={id}
            onClick={() => setIsRevealed((revealed) => !revealed)}
            className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-sm text-secondary-base hover:text-text-accent"
          >
            {isRevealed ? <Eye aria-hidden="true" className="size-4.5" /> : <EyeOff aria-hidden="true" className="size-4.5" />}
          </button>
        )}
        {suffix && (
          <span className="flex items-center rounded-r-md border border-l-0 border-input px-3 text-sm text-foreground">
            {suffix}
          </span>
        )}
      </div>
      {(hint ?? editIn) && (
        <p id={hintId} className="text-xs text-secondary-base">
          {hint}
          {editIn && (
            <Link to={editIn.to} className="text-text-accent underline underline-offset-4">
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
