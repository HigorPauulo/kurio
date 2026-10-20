import { eventStore } from "@/lib/realtime/eventStore";

type Versioned = { id: string; version: number };

export async function seedNftVersions<Result>(
  fetchResult: Promise<Result>,
  pickNfts: (result: Result) => readonly Versioned[],
): Promise<Result> {
  const result = await fetchResult;
  for (const nft of pickNfts(result)) eventStore.seed("nft", nft.id, nft.version);
  return result;
}
