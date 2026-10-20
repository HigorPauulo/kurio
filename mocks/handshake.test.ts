import { describe, expect, it } from "vitest";
import { isConnectPacket, readConnectAuth, readEventPacket } from "./handshake";

describe("readConnectAuth", () => {
  it("lê o token do CONNECT no namespace padrão e com namespace", () => {
    expect(readConnectAuth('40{"token":"abc"}')).toEqual({ kind: "token", token: "abc" });
    expect(readConnectAuth('40/admin,{"token":"abc"}')).toEqual({ kind: "token", token: "abc" });
  });

  it("trata auth ausente ou vazia como visitante", () => {
    expect(readConnectAuth("40")).toEqual({ kind: "guest" });
    expect(readConnectAuth("40{}")).toEqual({ kind: "guest" });
  });

  it("recusa JSON ilegível, auth que não é objeto e token que não é texto", () => {
    expect(readConnectAuth("40{token:abc")).toEqual({ kind: "invalid" });
    expect(readConnectAuth('40{"token":42}')).toEqual({ kind: "invalid" });
    expect(readConnectAuth("40null")).toEqual({ kind: "invalid" });
    expect(readConnectAuth("40[]")).toEqual({ kind: "invalid" });
  });
});

describe("readEventPacket", () => {
  it("lê evento com e sem id de ack", () => {
    expect(readEventPacket('427["nft.subscribe",{"nftIds":["nft_001"]}]')).toEqual({
      ackId: 7,
      event: "nft.subscribe",
      payload: { nftIds: ["nft_001"] },
    });
    expect(readEventPacket('42["nft.unsubscribe",{}]')).toEqual({ ackId: null, event: "nft.unsubscribe", payload: {} });
  });

  it("ignora pacote que não é evento ou é ilegível", () => {
    expect(readEventPacket("2")).toBeNull();
    expect(readEventPacket("42[oops")).toBeNull();
    expect(readEventPacket("42[1]")).toBeNull();
  });
});

describe("isConnectPacket", () => {
  it("reconhece CONNECT e ignora eventos", () => {
    expect(isConnectPacket('40{"token":"abc"}')).toBe(true);
    expect(isConnectPacket("40/admin,")).toBe(true);
    expect(isConnectPacket('42["nft.subscribe"]')).toBe(false);
  });
});
