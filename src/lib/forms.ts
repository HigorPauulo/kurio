import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError } from "@/lib/http/apiError";

const GENERIC_MESSAGE = "Não foi possível concluir agora. Tente de novo.";

export function applyApiError<Values extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<Values>,
  fields: readonly Path<Values>[],
): void {
  if (!(error instanceof ApiError)) {
    setError("root.server", { message: GENERIC_MESSAGE });
    return;
  }

  const fieldErrors = error.info.kind === "http" ? (error.info.fieldErrors ?? {}) : {};
  let matched = false;
  for (const field of fields) {
    const message = fieldErrors[field]?.[0];
    if (message) {
      setError(field, { message }, { shouldFocus: !matched });
      matched = true;
    }
  }
  if (!matched) setError("root.server", { message: error.message || GENERIC_MESSAGE });
}
