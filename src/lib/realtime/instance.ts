import { useEffect } from "react";
import { queryClient } from "@/lib/query/queryClient";
import { applyRealtimeEvent, reconcileAfterReconnect } from "./bridge";
import { eventStore } from "./eventStore";
import { createSocketManager } from "./socketManager";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "https://realtime.kurio.mock";

type RealtimeConfig = { onSessionExpired: () => void };

let config: RealtimeConfig = { onSessionExpired: () => undefined };
const nftCounts = new Map<string, number>();

export function configureRealtime(next: RealtimeConfig): void {
  config = next;
}

const manager = createSocketManager({
  url: SOCKET_URL,
  onEvent: (event) => {
    if (eventStore.accept(event)) applyRealtimeEvent(queryClient, event);
  },
  onConnect: (isReconnect) => {
    const nftIds = [...nftCounts.keys()];
    if (nftIds.length > 0) void manager.request("nft.subscribe", { nftIds });
    if (isReconnect) reconcileAfterReconnect(queryClient);
  },
  onSessionExpired: () => config.onSessionExpired(),
});

export const realtime = {
  connect: (token: string | null): void => manager.connect(token),
  disconnect: (): void => manager.disconnect(),
  reset(userId: string | null): void {
    manager.disconnect();
    eventStore.reset(userId);
  },
};

function retainNfts(nftIds: readonly string[]): () => void {
  const added = nftIds.filter((nftId) => {
    const count = nftCounts.get(nftId) ?? 0;
    nftCounts.set(nftId, count + 1);
    return count === 0;
  });
  if (added.length > 0 && manager.isConnected()) void manager.request("nft.subscribe", { nftIds: added });

  return () => {
    const removed = nftIds.filter((nftId) => {
      const count = (nftCounts.get(nftId) ?? 1) - 1;
      if (count > 0) nftCounts.set(nftId, count);
      else nftCounts.delete(nftId);
      return count === 0;
    });
    if (removed.length > 0 && manager.isConnected()) void manager.request("nft.unsubscribe", { nftIds: removed });
  };
}

export function useNftSubscription(nftIds: readonly string[]): void {
  const signature = [...new Set(nftIds)].sort().join(",");
  useEffect(() => (signature ? retainNfts(signature.split(",")) : undefined), [signature]);
}
