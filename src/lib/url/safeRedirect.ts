const FALLBACK = "/";

function hasControlCharacter(value: string): boolean {
  return [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
}

export function safeRedirect(value: unknown, origin: string = window.location.origin): string {
  if (typeof value !== "string") return FALLBACK;
  if (!value.startsWith("/") || value.startsWith("//")) return FALLBACK;
  if (value.includes("\\") || hasControlCharacter(value)) return FALLBACK;

  try {
    const url = new URL(value, origin);
    if (url.origin !== origin) return FALLBACK;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return FALLBACK;
  }
}
