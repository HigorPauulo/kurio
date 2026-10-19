import { http, HttpResponse, type HttpHandler } from "msw";
import {
  connectWalletBodySchema,
  createWalletBodySchema,
  updateWalletBodySchema,
  walletSchema,
  type Wallet,
} from "@/contracts/wallet";
import type { WalletRecord } from "../db/tables";
import {
  API,
  apiError,
  authenticate,
  fieldError,
  parseBody,
  withConditions,
  type HandlerDeps,
} from "./shared";

const MAX_WALLETS = 2;

function toWallet(record: WalletRecord): Wallet {
  return walletSchema.parse(record);
}

export function walletHandlers(deps: HandlerDeps): HttpHandler[] {
  const { db } = deps;

  function walletsOf(userId: string): WalletRecord[] {
    return db.read((tables) => Object.values(tables.wallets).filter((wallet) => wallet.userId === userId));
  }

  function addressTaken(address: string, exceptId?: string): boolean {
    return db.read((tables) =>
      Object.values(tables.wallets).some(
        (wallet) => wallet.id !== exceptId && wallet.address.toLowerCase() === address.toLowerCase(),
      ),
    );
  }

  function findOwned(userId: string, walletId: string): WalletRecord | undefined {
    const wallet = db.read((tables) => tables.wallets[walletId]);
    return wallet?.userId === userId ? wallet : undefined;
  }

  return [
    http.get(
      `${API}/me/wallets`,
      withConditions(deps, ({ request }) => {
        const auth = authenticate(deps, request);
        if (auth.response) return auth.response;
        return HttpResponse.json(walletsOf(auth.userId).map(toWallet));
      }),
    ),

    http.post(
      `${API}/me/wallets`,
      withConditions(deps, async ({ request }) => {
        const auth = authenticate(deps, request);
        if (auth.response) return auth.response;
        const body = await parseBody(request, createWalletBodySchema);
        if (body.response) return body.response;

        const existing = walletsOf(auth.userId);
        if (existing.length >= MAX_WALLETS || existing.some((wallet) => wallet.role === body.data.role)) {
          return fieldError(request, 422, "VALIDATION_FAILED", "role", "Este papel de carteira já está ocupado.");
        }
        if (addressTaken(body.data.address)) {
          return fieldError(request, 409, "WALLET_ADDRESS_TAKEN", "address", "Este endereço já está cadastrado.");
        }

        let created: WalletRecord | undefined;
        db.commit((draft, { nextId, now }) => {
          const id = nextId("wal");
          const timestamp = now().toISOString();
          created = {
            ...body.data,
            id,
            userId: auth.userId,
            connection: { status: "disconnected" },
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          draft.wallets[id] = created;
        });
        return HttpResponse.json(created && toWallet(created), { status: 201 });
      }),
    ),

    http.patch(
      `${API}/me/wallets/:walletId`,
      withConditions(deps, async ({ request, params }) => {
        const auth = authenticate(deps, request);
        if (auth.response) return auth.response;
        const walletId = String(params.walletId);
        const wallet = findOwned(auth.userId, walletId);
        if (!wallet) return apiError(request, 404, "NOT_FOUND", "Carteira não encontrada.");
        const body = await parseBody(request, updateWalletBodySchema);
        if (body.response) return body.response;
        const changes = body.data;

        if (changes.address && addressTaken(changes.address, walletId)) {
          return fieldError(request, 409, "WALLET_ADDRESS_TAKEN", "address", "Este endereço já está cadastrado.");
        }

        db.commit((draft, { now }) => {
          const target = draft.wallets[walletId];
          if (changes.role && changes.role !== target.role) {
            const sibling = Object.values(draft.wallets).find(
              (candidate) => candidate.userId === auth.userId && candidate.role === changes.role,
            );
            if (sibling) sibling.role = target.role;
          }
          Object.assign(target, changes, { updatedAt: now().toISOString() });
        });
        return HttpResponse.json(toWallet(db.read((tables) => tables.wallets[walletId])));
      }),
    ),

    http.post(
      `${API}/me/wallets/:walletId/connection`,
      withConditions(deps, async ({ request, params }) => {
        const auth = authenticate(deps, request);
        if (auth.response) return auth.response;
        const walletId = String(params.walletId);
        const wallet = findOwned(auth.userId, walletId);
        if (!wallet) return apiError(request, 404, "NOT_FOUND", "Carteira não encontrada.");
        const body = await parseBody(request, connectWalletBodySchema);
        if (body.response) return body.response;

        if (deps.getScenario().flags.walletReject) {
          return apiError(request, 422, "WALLET_REJECTED", "A carteira recusou a conexão.");
        }
        if (!wallet.networks.includes(body.data.network)) {
          return fieldError(request, 422, "VALIDATION_FAILED", "network", "Esta carteira não opera nessa rede.");
        }

        db.commit((draft, { now }) => {
          Object.assign(draft.wallets[walletId], {
            connection: { status: "connected", network: body.data.network },
            updatedAt: now().toISOString(),
          });
        });
        return HttpResponse.json(toWallet(db.read((tables) => tables.wallets[walletId])));
      }),
    ),

    http.delete(
      `${API}/me/wallets/:walletId/connection`,
      withConditions(deps, ({ request, params }) => {
        const auth = authenticate(deps, request);
        if (auth.response) return auth.response;
        const walletId = String(params.walletId);
        if (!findOwned(auth.userId, walletId)) {
          return apiError(request, 404, "NOT_FOUND", "Carteira não encontrada.");
        }
        db.commit((draft, { now }) => {
          Object.assign(draft.wallets[walletId], {
            connection: { status: "disconnected" },
            updatedAt: now().toISOString(),
          });
        });
        return HttpResponse.json(toWallet(db.read((tables) => tables.wallets[walletId])));
      }),
    ),
  ];
}
