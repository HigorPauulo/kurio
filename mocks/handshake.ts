const CONNECT_PACKET = /^40(?:\/[^,]*,)?(.*)$/s;
const EVENT_PACKET = /^42(\d*)(\[.*\])$/s;

export type ConnectAuth = { kind: "guest" } | { kind: "token"; token: string } | { kind: "invalid" };

export type EventPacket = { ackId: number | null; event: string; payload: unknown };

export function isConnectPacket(packet: string): boolean {
  return CONNECT_PACKET.test(packet);
}

export function readConnectAuth(packet: string): ConnectAuth {
  const payload = CONNECT_PACKET.exec(packet)?.[1];
  if (!payload) return { kind: "guest" };

  try {
    const auth: unknown = JSON.parse(payload);
    if (typeof auth !== "object" || auth === null || Array.isArray(auth)) return { kind: "invalid" };
    if (!("token" in auth)) return { kind: "guest" };
    return typeof auth.token === "string" ? { kind: "token", token: auth.token } : { kind: "invalid" };
  } catch {
    return { kind: "invalid" };
  }
}

export function readEventPacket(packet: string): EventPacket | null {
  const match = EVENT_PACKET.exec(packet);
  if (!match) return null;
  try {
    const parsed: unknown = JSON.parse(match[2]);
    if (!Array.isArray(parsed) || typeof parsed[0] !== "string") return null;
    return { ackId: match[1] ? Number(match[1]) : null, event: parsed[0], payload: parsed[1] };
  } catch {
    return null;
  }
}
