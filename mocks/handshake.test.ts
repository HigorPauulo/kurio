import { describe, expect, it } from "vitest";
import { isConnectPacket, readConnectToken } from "./handshake";

describe("readConnectToken", () => {
  it("lê o token do CONNECT no namespace padrão", () => {
    expect(readConnectToken('40{"token":"abc"}')).toBe("abc");
  });

  it("lê o token do CONNECT com namespace", () => {
    expect(readConnectToken('40/admin,{"token":"abc"}')).toBe("abc");
  });

  it("devolve null sem auth, com JSON inválido ou token que não é texto", () => {
    expect(readConnectToken("40")).toBeNull();
    expect(readConnectToken("40{token:abc")).toBeNull();
    expect(readConnectToken('40{"token":42}')).toBeNull();
    expect(readConnectToken("40null")).toBeNull();
  });
});

describe("isConnectPacket", () => {
  it("reconhece CONNECT e ignora eventos", () => {
    expect(isConnectPacket('40{"token":"abc"}')).toBe(true);
    expect(isConnectPacket("40/admin,")).toBe(true);
    expect(isConnectPacket('42["ping-spike"]')).toBe(false);
  });
});
