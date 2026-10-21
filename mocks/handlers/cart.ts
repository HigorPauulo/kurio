import { http, HttpResponse, type HttpHandler } from "msw";
import {
  addCartItemBodySchema,
  applyCouponBodySchema,
  createQuoteBodySchema,
  mergeCartBodySchema,
  updateCartItemBodySchema,
} from "@/contracts/cart";
import { compareEth, formatEth, fromWei, toWei } from "@/lib/eth";
import { nftUpdatedData, refreshNft } from "../db/nftUpdates";
import {
  currentSubtotal,
  editionLimit,
  findCoupon,
  findEdition,
  isCouponExpired,
  createQuote,
  toCartView,
} from "../db/commerce";
import type { CartRecord } from "../db/tables";
import {
  API,
  apiError,
  authenticate,
  fieldError,
  parseBody,
  readToken,
  withConditions,
  type HandlerDeps,
} from "./shared";

const GUEST_HEADER = "X-Guest-Cart-Id";
const PRICE_CHANGE_DELAY_MS = 2_000;
const PRICE_CHANGE_PERCENT = 115n;
const SIX_DECIMALS_WEI = 10n ** 12n;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Owner = { owner: string; response?: undefined } | { response: Response };

export function guestOwner(guestCartId: string): string {
  return `guest:${guestCartId}`;
}

function resolveOwner(deps: HandlerDeps, request: Request): Owner {
  if (readToken(request)) {
    const auth = authenticate(deps, request);
    return auth.response ? auth : { owner: auth.userId };
  }
  const guestCartId = request.headers.get(GUEST_HEADER);
  if (!guestCartId || !UUID.test(guestCartId)) {
    return { response: apiError(request, 400, "BAD_REQUEST", "Carrinho de visitante sem identificador.") };
  }
  return { owner: guestOwner(guestCartId) };
}

function availabilityConflict(request: Request, editionId: string, limit: number, available: number, maxPerOrder: number): Response {
  const message =
    limit === 0
      ? "Esta edição não está disponível para compra."
      : `Esta edição permite até ${limit} ${limit === 1 ? "unidade" : "unidades"} no carrinho.`;
  return apiError(request, 409, "AVAILABILITY_CONFLICT", message, { details: { editionId, available, maxPerOrder } });
}

export function cartHandlers(deps: HandlerDeps): HttpHandler[] {
  const { db, now } = deps;

  function ensureCart(owner: string): void {
    if (db.read((tables) => tables.carts[owner])) return;
    db.commit((draft, { nextId, now: commitNow }) => {
      draft.carts[owner] = { id: nextId("crt"), owner, items: [], coupon: null, version: 0, updatedAt: commitNow().toISOString() };
    });
  }

  function cartResponse(owner: string): Response {
    return HttpResponse.json(db.read((tables) => toCartView(tables, tables.carts[owner])));
  }

  let isPriceChangeScheduled = false;

  function schedulePriceChange(record: CartRecord): void {
    const first = record.items[0];
    if (!deps.getScenario().flags.priceChangeOnReview || isPriceChangeScheduled || !first) return;
    isPriceChangeScheduled = true;
    setTimeout(() => {
      db.commit((draft, { emit }) => {
        const found = findEdition(draft, first.nftId, first.editionId);
        if (!found) return;
        const raised = (toWei(found.edition.price) * PRICE_CHANGE_PERCENT) / 100n;
        found.edition.price = fromWei(raised - (raised % SIX_DECIMALS_WEI));
        refreshNft(found.nft);
        emit({ type: "nft.updated", resourceId: found.nft.id, audience: null, data: nftUpdatedData(found.nft) });
      });
    }, PRICE_CHANGE_DELAY_MS);
  }

  function touch(cart: CartRecord, timestamp: Date): void {
    cart.updatedAt = timestamp.toISOString();
  }

  return [
    http.get(
      `${API}/cart`,
      withConditions(deps, ({ request }) => {
        const resolved = resolveOwner(deps, request);
        if (resolved.response) return resolved.response;
        ensureCart(resolved.owner);
        return cartResponse(resolved.owner);
      }),
    ),

    http.post(
      `${API}/cart/items`,
      withConditions(deps, async ({ request }) => {
        const resolved = resolveOwner(deps, request);
        if (resolved.response) return resolved.response;
        const body = await parseBody(request, addCartItemBodySchema);
        if (body.response) return body.response;
        const { nftId, editionId, quantity } = body.data;

        const found = db.read((tables) => findEdition(tables, nftId, editionId));
        if (!found) return apiError(request, 404, "NOT_FOUND", "NFT ou edição não encontrados.");
        ensureCart(resolved.owner);

        const existing = db.read((tables) =>
          tables.carts[resolved.owner].items.find((item) => item.editionId === editionId),
        );
        const requested = (existing?.quantity ?? 0) + quantity;
        if (requested > editionLimit(found.edition)) {
          return availabilityConflict(
            request,
            editionId,
            editionLimit(found.edition),
            found.edition.available,
            found.edition.maxPerOrder,
          );
        }

        db.commit((draft, { nextId, now: commitNow }) => {
          const cart = draft.carts[resolved.owner];
          const item = cart.items.find((candidate) => candidate.editionId === editionId);
          if (item) {
            item.quantity = requested;
            item.unitPrice = found.edition.price;
          } else {
            cart.items.push({
              id: nextId("itm"),
              nftId,
              editionId,
              quantity,
              nftName: found.nft.name,
              tokenId: found.nft.tokenId,
              editionLabel: found.edition.label,
              cover: found.nft.images[0],
              unitPrice: found.edition.price,
              available: found.edition.available,
              maxPerOrder: found.edition.maxPerOrder,
              status: "ok",
            });
          }
          touch(cart, commitNow());
        });
        return cartResponse(resolved.owner);
      }),
    ),

    http.patch(
      `${API}/cart/items/:itemId`,
      withConditions(deps, async ({ request, params }) => {
        const resolved = resolveOwner(deps, request);
        if (resolved.response) return resolved.response;
        const body = await parseBody(request, updateCartItemBodySchema);
        if (body.response) return body.response;
        const itemId = String(params.itemId);

        const item = db.read((tables) => tables.carts[resolved.owner]?.items.find((candidate) => candidate.id === itemId));
        if (!item) return apiError(request, 404, "NOT_FOUND", "Item não encontrado no carrinho.");
        const found = db.read((tables) => findEdition(tables, item.nftId, item.editionId));
        const limit = found ? editionLimit(found.edition) : 0;
        const isDecrease = body.data.quantity <= item.quantity;
        if (!found || (!isDecrease && body.data.quantity > limit)) {
          return availabilityConflict(request, item.editionId, limit, found?.edition.available ?? 0, found?.edition.maxPerOrder ?? 1);
        }

        db.commit((draft, { now: commitNow }) => {
          const cart = draft.carts[resolved.owner];
          const target = cart.items.find((candidate) => candidate.id === itemId);
          if (!target) return;
          target.quantity = body.data.quantity;
          target.unitPrice = found.edition.price;
          touch(cart, commitNow());
        });
        return cartResponse(resolved.owner);
      }),
    ),

    http.delete(
      `${API}/cart/items/:itemId`,
      withConditions(deps, ({ request, params }) => {
        const resolved = resolveOwner(deps, request);
        if (resolved.response) return resolved.response;
        ensureCart(resolved.owner);
        const itemId = String(params.itemId);

        if (db.read((tables) => tables.carts[resolved.owner].items.some((item) => item.id === itemId))) {
          db.commit((draft, { now: commitNow }) => {
            const cart = draft.carts[resolved.owner];
            cart.items = cart.items.filter((item) => item.id !== itemId);
            touch(cart, commitNow());
          });
        }
        return cartResponse(resolved.owner);
      }),
    ),

    http.put(
      `${API}/cart/coupon`,
      withConditions(deps, async ({ request }) => {
        const resolved = resolveOwner(deps, request);
        if (resolved.response) return resolved.response;
        const body = await parseBody(request, applyCouponBodySchema);
        if (body.response) return body.response;
        ensureCart(resolved.owner);

        const coupon = findCoupon(body.data.code);
        if (!coupon) return fieldError(request, 422, "COUPON_INVALID", "code", "Cupom inválido.");
        if (isCouponExpired(coupon, now())) {
          return fieldError(request, 422, "COUPON_EXPIRED", "code", "Este cupom expirou.");
        }
        const subtotal = db.read((tables) => currentSubtotal(tables, tables.carts[resolved.owner]));
        if (coupon.minimum && compareEth(subtotal, coupon.minimum) < 0) {
          const message = `Este cupom vale para compras a partir de ${formatEth(coupon.minimum)} ETH.`;
          return apiError(request, 422, "COUPON_MINIMUM_NOT_MET", message, {
            fieldErrors: { code: [message] },
            details: { minimum: coupon.minimum, subtotal },
          });
        }

        db.commit((draft, { now: commitNow }) => {
          const cart = draft.carts[resolved.owner];
          cart.coupon = { code: coupon.code };
          touch(cart, commitNow());
        });
        return cartResponse(resolved.owner);
      }),
    ),

    http.delete(
      `${API}/cart/coupon`,
      withConditions(deps, ({ request }) => {
        const resolved = resolveOwner(deps, request);
        if (resolved.response) return resolved.response;
        ensureCart(resolved.owner);
        if (db.read((tables) => tables.carts[resolved.owner].coupon)) {
          db.commit((draft, { now: commitNow }) => {
            const cart = draft.carts[resolved.owner];
            cart.coupon = null;
            touch(cart, commitNow());
          });
        }
        return cartResponse(resolved.owner);
      }),
    ),

    http.post(
      `${API}/cart/merge`,
      withConditions(deps, async ({ request }) => {
        const auth = authenticate(deps, request);
        if (auth.response) return auth.response;
        const body = await parseBody(request, mergeCartBodySchema);
        if (body.response) return body.response;
        ensureCart(auth.userId);
        const guestKey = guestOwner(body.data.guestCartId);
        const adjustments: { editionId: string; requested: number; kept: number }[] = [];

        if (db.read((tables) => tables.carts[guestKey])) {
          db.commit((draft, { nextId, now: commitNow }) => {
            const cart = draft.carts[auth.userId];
            const guest = draft.carts[guestKey];
            for (const guestItem of guest.items) {
              const found = findEdition(draft, guestItem.nftId, guestItem.editionId);
              const limit = found ? editionLimit(found.edition) : 0;
              const item = cart.items.find((candidate) => candidate.editionId === guestItem.editionId);
              const requested = (item?.quantity ?? 0) + guestItem.quantity;
              const kept = limit === 0 ? (item?.quantity ?? 0) : Math.min(requested, limit);
              if (kept < requested) adjustments.push({ editionId: guestItem.editionId, requested, kept });
              if (!found || limit === 0) continue;

              if (item) {
                item.quantity = kept;
                item.unitPrice = found.edition.price;
              } else {
                cart.items.push({ ...guestItem, id: nextId("itm"), quantity: kept, unitPrice: found.edition.price });
              }
            }
            if (!cart.coupon && guest.coupon) cart.coupon = guest.coupon;
            delete draft.carts[guestKey];
            touch(cart, commitNow());
          });
        }

        return HttpResponse.json({
          cart: db.read((tables) => toCartView(tables, tables.carts[auth.userId])),
          adjustments,
        });
      }),
    ),

    http.post(
      `${API}/quotes`,
      withConditions(deps, async ({ request }) => {
        const resolved = resolveOwner(deps, request);
        if (resolved.response) return resolved.response;
        const body = await parseBody(request, createQuoteBodySchema);
        if (body.response) return body.response;
        ensureCart(resolved.owner);

        const record = db.read((tables) => tables.carts[resolved.owner]);
        if (record.items.length === 0) {
          return apiError(request, 422, "VALIDATION_FAILED", "O carrinho está vazio.");
        }

        if (body.data.purpose === "checkout") schedulePriceChange(record);
        return HttpResponse.json(createQuote(db, resolved.owner, body.data.network), { status: 201 });
      }),
    ),
  ];
}
