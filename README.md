# Kurio · NFT Marketplace

Marketplace de NFTs em React e TypeScript com descoberta, compra e conta do colecionador, sobre
backend simulado com MSW (REST e Socket.IO).

> **Onde o projeto está:** em [docs/STATUS.md](./docs/STATUS.md), e só lá. Este README é o contrato de
> uso; se um comando não rodar, confira lá se ele já existe.
> Documentação: [docs/README.md](./docs/README.md) · Arquitetura: [ARCHITECTURE.md](./docs/ARCHITECTURE.md)

## Setup

Requisito: Node 24 (`.nvmrc`) e pnpm via Corepack.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm exec playwright install chromium   # só para os testes E2E
pnpm dev                                # http://localhost:5173, mocks ativos
```

## Variáveis de ambiente

Todas públicas; não há segredo. Os padrões funcionam sem `.env` no ambiente local; na publicação,
`VITE_SITE_URL` é obrigatória.

| Variável | Padrão | Uso |
|---|---|---|
| `VITE_ENABLE_MOCKS` | `true` | Liga o MSW |
| `VITE_MOCK_DEFAULT_SCENARIO` | `default` | Cenário inicial |
| `VITE_API_BASE_URL` | `/api` | Base do REST |
| `VITE_SOCKET_URL` | `https://realtime.kurio.mock` | Socket.IO (interceptado) |
| `VITE_SITE_URL` | `http://localhost:4173` | URL absoluta de canonical e Open Graph |

## Credenciais fictícias

| E-mail | Senha | Perfil |
|---|---|---|
| `ana@kurio.test` | `Kurio@2026` | `ana.eth`, duas carteiras, favoritos e carrinho: compra completa |
| `bruno@kurio.test` | `Kurio@2026` | `bruno.eth`, sem carteiras: o pagamento pede uma carteira |
| `carla@kurio.test` | `Kurio@2026` | Vazia, sem Nome ENS: pagamento bloqueado até completar o perfil; `carla` testa conflito de username |

Cupons: `KURIO10` (10%), `FIXO005` (0.005 ETH, mínimo 0.05), `EXPIRADO`.

## Cenários e reset

`?scenario=<preset>[+<preset>]&reset=1` na URL, ou `window.__kurio.scenario.set()` e
`window.__kurio.reset()` no console. Presets e precedência em [docs/MOCKS.md](./docs/MOCKS.md#6-cenários).

| Para reproduzir | Abra |
|---|---|
| Skeleton / erro e nova tentativa | `/?scenario=slow` / `/?scenario=flaky` |
| Catálogo vazio / sem rede | `/?scenario=empty-catalog` / `/?scenario=offline` |
| Respostas fora de ordem | `/?scenario=out-of-order`, troque filtros rápido |
| Sessão expirada | `/login?scenario=session-short`, entre e aguarde 60 s |
| Preço alterado no checkout | `/?scenario=price-change-on-review`, vá até a revisão |
| Timeout com recuperação do pedido | `/?scenario=order-timeout`, confirme e recarregue |
| Pagamento recusado / carteira recusa | `/?scenario=payment-refused` / `/?scenario=wallet-reject` |
| Queda com pedido pendente | `/?scenario=socket-drop`, recarregue durante o pendente |
| Eventos duplicados | `/?scenario=socket-duplicates`, depois `__kurio.catalog.setPrice(...)` |
| Pedido de outro usuário | compre como Ana, entre como Bruno e abra a URL do pedido |

## Comandos

| Comando | Faz |
|---|---|
| `pnpm dev` / `pnpm build` / `pnpm preview` | Desenvolvimento / build de produção (com mocks) / serve o build |
| `pnpm typecheck` / `pnpm lint` / `pnpm test:unit` | Tipos / lint sem warning / Vitest |
| `pnpm verify` | Gate local e do CI: lint, typecheck, unidade e build |
| `pnpm test:e2e` | Playwright sobre o build de produção, desktop e mobile |
