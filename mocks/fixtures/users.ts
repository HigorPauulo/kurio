import type { EthAmount, NftId } from "@/contracts/common";
import type { CartRecord, UserRecord, WalletRecord } from "../db/tables";
import { getCoverFixture } from "./catalog";

const CREATED_AT = "2026-09-15T12:00:00.000Z";

export const USER_FIXTURES: readonly UserRecord[] = [
  {
    id: "usr_ana",
    email: "ana@kurio.test",
    username: "ana",
    name: "Ana Lima",
    ensName: "ana.eth",
    avatarUrl: null,
    createdAt: CREATED_AT,
    salt: "a1f3c9e2b7d4061f8e2c5a9b3d7e1f04",
    passwordHash: "0bf9442aff21bdf25f9c957556987ee6120ad00b9826a025891b9adab87c9619",
  },
  {
    id: "usr_bruno",
    email: "bruno@kurio.test",
    username: "bruno",
    name: "Bruno Reis",
    ensName: "bruno.eth",
    avatarUrl: null,
    createdAt: CREATED_AT,
    salt: "b2e4d0f3c8e5172a9f3d6b0c4e8f2a15",
    passwordHash: "0ba9a29293f78ac2ef19104bb3c4a77cfcddaba1f0dec574ba9b2878960ae77d",
  },
  {
    id: "usr_carla",
    email: "carla@kurio.test",
    username: "carla",
    name: "Carla Souza",
    ensName: null,
    avatarUrl: null,
    createdAt: CREATED_AT,
    salt: "c3f5e1a4d9f6283b0a4e7c1d5f9a3b26",
    passwordHash: "523d5d238c9d17554a5d184efa5d20482b5c54a2a107bcbc8e5d0ffbd5ccdc5c",
  },
];

export const WALLET_FIXTURES: readonly WalletRecord[] = [
  {
    id: "wal_ana_1",
    userId: "usr_ana",
    role: "primary",
    label: "Principal",
    provider: "metamask",
    address: "0x7a3B5c9E1d2F4a6B8c0D2e4F6a8B0c2D4e6F8a0B",
    backupAddress: "ana.eth",
    networks: ["ethereum", "base"],
    profileName: "Ana colecionadora",
    referralCode: "ANA2026",
    connection: { status: "disconnected" },
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  },
  {
    id: "wal_ana_2",
    userId: "usr_ana",
    role: "secondary",
    label: "Reserva",
    provider: "coinbase",
    address: "0x1C3e5A7b9D1f3B5d7F9a1C3e5A7b9D1f3B5d7F9a",
    backupAddress: null,
    networks: ["polygon"],
    profileName: "Ana na Polygon",
    referralCode: "ANAPOLY1",
    connection: { status: "disconnected" },
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  },
];

export const FAVORITE_FIXTURES: Readonly<Record<string, NftId[]>> = {
  usr_ana: ["nft_002", "nft_015"],
};

export const CART_FIXTURES: readonly CartRecord[] = [
  {
    id: "crt_ana",
    owner: "usr_ana",
    coupon: null,
    version: 0,
    updatedAt: CREATED_AT,
    items: [
      {
        id: "itm_ana_1",
        nftId: "nft_004",
        editionId: "ed_004_1",
        quantity: 1,
        nftName: "Pulso Neon",
        cover: getCoverFixture("nft_004"),
        editionLabel: "Padrão",
        unitPrice: "0.75" as EthAmount,
        available: 12,
        maxPerOrder: 5,
        status: "ok",
      },
      {
        id: "itm_ana_2",
        nftId: "nft_012",
        editionId: "ed_012_1",
        quantity: 2,
        nftName: "Lo-fi Noturno",
        cover: getCoverFixture("nft_012"),
        editionLabel: "Padrão",
        unitPrice: "0.06" as EthAmount,
        available: 30,
        maxPerOrder: 6,
        status: "ok",
      },
    ],
  },
];
