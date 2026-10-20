import { isCancelledError } from "@tanstack/react-query";

export async function ensureDespiteCancel<Result>(load: () => Promise<Result>): Promise<Result> {
  try {
    return await load();
  } catch (error) {
    if (isCancelledError(error)) return load();
    throw error;
  }
}
