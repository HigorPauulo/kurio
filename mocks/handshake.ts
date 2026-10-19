const CONNECT_PACKET = /^40(?:\/[^,]*,)?(.*)$/s;

export function isConnectPacket(packet: string): boolean {
  return CONNECT_PACKET.test(packet);
}

export function readConnectToken(packet: string): string | null {
  const payload = CONNECT_PACKET.exec(packet)?.[1];
  if (!payload) return null;

  try {
    const auth: unknown = JSON.parse(payload);
    if (typeof auth !== "object" || auth === null || !("token" in auth)) {
      return null;
    }
    return typeof auth.token === "string" ? auth.token : null;
  } catch {
    return null;
  }
}
