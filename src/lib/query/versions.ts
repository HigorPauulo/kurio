import { eventStore } from "@/lib/realtime/eventStore";

type Versioned = { id: string; version: number };

const MAX_ATTEMPTS = 2;

export async function seedNftVersions<Result>(
  fetchResult: () => Promise<Result>,
  pickNfts: (result: Result) => readonly Versioned[],
): Promise<Result> {
  let result = await fetchResult();
  for (let attempt = 1; attempt < MAX_ATTEMPTS; attempt += 1) {
    const isBehindEvents = pickNfts(result).some((nft) => nft.version < eventStore.knownVersion("nft", nft.id));
    if (!isBehindEvents) break;
    result = await fetchResult();
  }
  for (const nft of pickNfts(result)) eventStore.seed("nft", nft.id, nft.version);
  return result;
}
