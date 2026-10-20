import { http, HttpResponse, type HttpHandler } from "msw";
import { API, apiError, authenticate, withConditions, type HandlerDeps } from "./shared";

export function favoriteHandlers(deps: HandlerDeps): HttpHandler[] {
  const { db } = deps;

  return [
    http.get(
      `${API}/me/favorites`,
      withConditions(deps, ({ request }) => {
        const auth = authenticate(deps, request);
        if (auth.response) return auth.response;
        return HttpResponse.json({ nftIds: db.read((tables) => tables.favorites[auth.userId] ?? []) });
      }),
    ),

    http.put(
      `${API}/me/favorites/:nftId`,
      withConditions(deps, ({ request, params }) => {
        const auth = authenticate(deps, request);
        if (auth.response) return auth.response;
        const nftId = String(params.nftId);
        if (deps.getScenario().flags.emptyCatalog || !db.read((tables) => tables.nfts[nftId])) {
          return apiError(request, 404, "NOT_FOUND", "NFT não encontrado.");
        }

        if (!db.read((tables) => tables.favorites[auth.userId]?.includes(nftId))) {
          db.commit((draft) => {
            draft.favorites[auth.userId] = [...(draft.favorites[auth.userId] ?? []), nftId];
            draft.nfts[nftId].likes += 1;
          });
        }
        return new HttpResponse(null, { status: 204 });
      }),
    ),

    http.delete(
      `${API}/me/favorites/:nftId`,
      withConditions(deps, ({ request, params }) => {
        const auth = authenticate(deps, request);
        if (auth.response) return auth.response;
        const nftId = String(params.nftId);

        if (db.read((tables) => tables.favorites[auth.userId]?.includes(nftId))) {
          db.commit((draft) => {
            draft.favorites[auth.userId] = draft.favorites[auth.userId].filter((id) => id !== nftId);
            const nft = draft.nfts[nftId];
            if (nft) nft.likes = Math.max(0, nft.likes - 1);
          });
        }
        return new HttpResponse(null, { status: 204 });
      }),
    ),
  ];
}
