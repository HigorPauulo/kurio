export function parsePlainSearch(searchStr: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(searchStr));
}

export function stringifyPlainSearch(search: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, typeof value === "string" ? value : JSON.stringify(value));
  }
  const text = params.toString();
  return text ? `?${text}` : "";
}
