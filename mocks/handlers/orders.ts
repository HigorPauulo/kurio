import { http, HttpResponse, type HttpHandler } from "msw";
import { createOrderBodySchema, orderSchema, type Order } from "@/contracts/order";
import { buildQuote, createQuote, editionLimit, findEdition, hashText } from "../db/commerce";
import { nftUpdatedData } from "../db/nftUpdates";
import { adjustStock } from "../db/orders";
import type { OrderRecord } from "../db/tables";
import { API, apiError, authenticate, fieldError, withConditions, type HandlerDeps } from "./shared";

const ORDER_TIMEOUT_DELAY_MS = 20_000;

function toOrder(record: OrderRecord): Order {
  return orderSchema.parse(record);
}

function canonicalBody(body: unknown): string {
  if (typeof body !== "object" || body === null) return JSON.stringify(body);
  const record = body as Record<string, unknown>;
  return JSON.stringify(Object.keys(record).sort().map((key) => [key, record[key]]));
}

export function orderHandlers(deps: HandlerDeps): HttpHandler[] {
  const { db, now } = deps;

  return [
    http.post(
      `${API}/orders`,
      withConditions(deps, async ({ request }) => {
        const auth = authenticate(deps, request);
        if (auth.response) return auth.response;
        const key = request.headers.get("Idempotency-Key");
        if (!key) return apiError(request, 400, "BAD_REQUEST", "Envie o cabeçalho Idempotency-Key.");

        const rawBody: unknown = await request.json().catch(() => undefined);
        const bodyHash = hashText(canonicalBody(rawBody));
        const idempotencyKey = `${auth.userId}:${key}`;

        const known = db.read((tables) => tables.idempotency[idempotencyKey]);
        if (known) {
          if (known.bodyHash !== bodyHash) {
            return apiError(request, 409, "IDEMPOTENCY_CONFLICT", "Esta tentativa já foi usada com outros dados.", {
              details: { orderId: known.orderId },
            });
          }
          return HttpResponse.json(toOrder(db.read((tables) => tables.orders[known.orderId])), { status: 200 });
        }

        const rawQuoteId = (rawBody as { quoteId?: unknown } | undefined)?.quoteId;
        const usedQuote = typeof rawQuoteId === "string" ? db.read((tables) => tables.quotes[rawQuoteId]) : undefined;
        if (usedQuote?.owner === auth.userId && usedQuote.usedByOrderId) {
          return apiError(request, 409, "QUOTE_ALREADY_USED", "Esta cotação já virou um pedido.", {
            details: { orderId: usedQuote.usedByOrderId },
          });
        }

        const pending = db.read((tables) =>
          Object.values(tables.orders).find((order) => order.userId === auth.userId && order.status === "pending"),
        );
        if (pending) {
          return apiError(request, 409, "ORDER_PENDING", "Você já tem um pedido em processamento.", {
            details: { orderId: pending.id },
          });
        }

        const parsed = createOrderBodySchema.safeParse(rawBody);
        if (!parsed.success) {
          const fieldErrors: Record<string, string[]> = {};
          for (const issue of parsed.error.issues) (fieldErrors[issue.path.join(".") || "body"] ??= []).push(issue.message);
          return apiError(request, 422, "VALIDATION_FAILED", "Dados inválidos.", { fieldErrors });
        }
        const body = parsed.data;

        const user = db.read((tables) => tables.users[auth.userId]);
        if (!user.ensName) {
          return fieldError(request, 422, "VALIDATION_FAILED", "ensName", "Complete o Nome ENS no perfil para comprar.");
        }
        const wallet = db.read((tables) => tables.wallets[body.walletId]);
        if (!wallet || wallet.userId !== auth.userId) {
          return fieldError(request, 422, "VALIDATION_FAILED", "walletId", "Escolha uma carteira sua.");
        }
        if (!wallet.networks.includes(body.network)) {
          return fieldError(request, 422, "VALIDATION_FAILED", "network", "Esta carteira não opera nessa rede.");
        }

        const quote = db.read((tables) => tables.quotes[body.quoteId]);
        if (!quote || quote.owner !== auth.userId) {
          return apiError(request, 409, "QUOTE_EXPIRED", "A cotação não vale mais. Revise o pedido de novo.");
        }
        if (Date.parse(quote.expiresAt) <= now()) {
          return apiError(request, 409, "QUOTE_EXPIRED", "A cotação venceu. Revise o pedido de novo.");
        }
        const cart = db.read((tables) => tables.carts[auth.userId]);
        const fresh = cart ? db.read((tables) => buildQuote(tables, cart, quote.network, now())) : null;
        if (!fresh || fresh.cartVersion !== quote.cartVersion || fresh.basisHash !== quote.basisHash || quote.network !== body.network) {
          const details = cart ? { quote: createQuote(db, auth.userId, quote.network) } : undefined;
          return apiError(request, 409, "QUOTE_STALE", "Os valores mudaram. Revise e confirme de novo.", { details });
        }
        if (wallet.connection.status !== "connected" || wallet.connection.network !== body.network) {
          return apiError(request, 409, "WALLET_NOT_CONNECTED", "Conecte a carteira na rede escolhida.");
        }
        for (const line of quote.lines) {
          const found = db.read((tables) => findEdition(tables, line.nftId, line.editionId));
          if (!found || line.quantity > editionLimit(found.edition)) {
            return apiError(request, 409, "AVAILABILITY_CONFLICT", "Um item não está mais disponível nessa quantidade.", {
              details: {
                editionId: line.editionId,
                available: found?.edition.available ?? 0,
                maxPerOrder: found?.edition.maxPerOrder ?? 1,
              },
            });
          }
        }

        let orderId = "";
        db.commit((draft, { emit, nextId, now: commitNow }) => {
          const timestamp = commitNow();
          orderId = nextId("ord");
          const items = draft.carts[auth.userId]?.items ?? [];
          const order: OrderRecord = {
            id: orderId,
            userId: auth.userId,
            status: "pending",
            version: 0,
            quoteId: quote.id,
            receipt: {
              lines: quote.lines.map((line) => {
                const item = items.find((candidate) => candidate.id === line.itemId);
                const found = findEdition(draft, line.nftId, line.editionId);
                return {
                  ...line,
                  nftName: item?.nftName ?? found?.nft.name ?? line.nftId,
                  editionLabel: item?.editionLabel ?? found?.edition.label ?? line.editionId,
                  cover: item?.cover ?? found?.nft.images[0] ?? { url: "", alt: "", width: 1, height: 1 },
                };
              }),
              subtotal: quote.subtotal,
              discount: quote.discount,
              networkFee: quote.networkFee,
              total: quote.total,
              coupon: quote.coupon ? { code: quote.coupon.code } : null,
              network: body.network,
              wallet: { id: wallet.id, label: wallet.label, address: wallet.address, provider: wallet.provider },
              buyer: {
                name: user.name,
                username: user.username,
                email: user.email,
                ensName: user.ensName ?? "",
                profileName: wallet.profileName,
                referralCode: wallet.referralCode,
                note: body.note,
              },
            },
            transaction: null,
            refusal: null,
            createdAt: timestamp.toISOString(),
            updatedAt: timestamp.toISOString(),
            settleAt: new Date(timestamp.getTime() + deps.getScenario().settleMs).toISOString(),
          };
          draft.orders[orderId] = order;
          draft.quotes[quote.id].usedByOrderId = orderId;
          draft.idempotency[idempotencyKey] = { bodyHash, orderId };
          adjustStock(draft, order, -1, (nftId) =>
            emit({ type: "nft.updated", resourceId: nftId, audience: null, data: nftUpdatedData(draft.nfts[nftId]) }),
          );
          emit({
            type: "order.updated",
            resourceId: orderId,
            audience: { userId: auth.userId },
            data: { orderId, status: "pending", transaction: null, refusal: null },
          });
        });

        const created = db.read((tables) => tables.orders[orderId]);
        if (created.settleAt) deps.orders.schedule(orderId, Date.parse(created.settleAt));
        if (deps.getScenario().flags.orderTimeout) await deps.wait(ORDER_TIMEOUT_DELAY_MS);
        return HttpResponse.json(toOrder(db.read((tables) => tables.orders[orderId])), { status: 201 });
      }),
    ),

    http.get(
      `${API}/orders/:orderId`,
      withConditions(deps, ({ request, params }) => {
        const auth = authenticate(deps, request);
        if (auth.response) return auth.response;
        const order = db.read((tables) => tables.orders[String(params.orderId)]);
        if (!order) return apiError(request, 404, "NOT_FOUND", "Pedido não encontrado.");
        if (order.userId !== auth.userId) return apiError(request, 403, "FORBIDDEN", "Pedido não encontrado.");
        return HttpResponse.json(toOrder(order));
      }),
    ),
  ];
}

