# Plano de desenvolvimento

Para onde o projeto vai. Onde ele está é o [STATUS](STATUS.md); o porquê das escolhas, o
[DECISIONS](DECISIONS.md).

## A fila

**Esta tabela é a única fonte de ordem.** Lê-se de cima para baixo.

✅ feita · 🟡 em andamento · ⬜ pendente · 🔒 travada por gate externo

| Ordem | Fatia | Entrega | Requisitos | Depende de | Horas |
|---|---|---|---|---|---|
| 1 | ✅ **Fundação e spike** | Vite, TS strict, lint, Tailwind, shadcn, Router, Query, Axios, Vitest, Playwright, CI. Spike: `socket.io-client` no MSW com ack, evento, queda e reconexão | NF-6 | | 2 |
| 2 | ✅ **Contratos e mocks** | Schemas Zod, `MockDb`, fixtures, cenários, `window.__kurio` | MOC, AUT-4 | 1 | 3 |
| 3 | ✅ **Sessão e conta** | `configureHttp`, login, cadastro, expiração, `switchIdentity`, perfil e carteiras com os campos do layout | AUT-1..4, PER, WAL, NAV-2 | 2 | 2,5 |
| 4 | ✅ **Catálogo e detalhe** | Filtros, ordenação e página na URL; detalhe; favoritos otimistas | CAT, DET, NAV-1, NAV-3 | 2 | 2 |
| 5 | ✅ **Carrinho e cotação** | Visitante e usuário, merge, cupom, resumo pela cotação | CRT-1..4, NF-5 | 2 | 1,5 |
| 6 | ✅ **Tempo real** | Socket por sessão, `eventStore`, subscriptions, reconciliação | RT, CRT-5 | 4, 5 | 1,5 |
| 7 | ✅ **Checkout e pedido** | Campos do layout, revisão, idempotência, recibo, pedido alheio | PAG, PED, AUT-5 | 3, 6 | 2,5 |
| 8 | ✅ **Visual e responsivo** | Tokens do Figma, composição em 390 e 1440, 768 sem quebra, estados de carregamento | VIS, NF-1, NF-2, NF-3 | 7 | 2 |
| 9 | ⬜ **Publicação** | Vercel, smoke, Lighthouse, roteiro manual, documentação conferida com o código | NF-4, NF-6, NF-7, MOC-8, VIS-4 | 8 | 1 |
| | **Linha de chegada** | | | | **18** |

Ordem por dependência e risco: o spike abre a fila porque é a única peça cuja viabilidade não está
provada. Cada fatia entrega sua spec E2E ([QUALITY](QUALITY.md#3-e2e)). As 6 horas restantes do
prazo são margem; estouro de mais de 50% numa fatia antecipa o corte.

## Gate externo

| Gate | O que é | Destrava |
|---|---|---|
| **G1** | Conta GitHub e Vercel de destino | CI (fatia 1) e publicação (fatia 9) |

## Riscos

| Risco | Prob. | Impacto | Mitigação | Se acontecer |
|---|---|---|---|---|
| Testes de tempo real instáveis | Média | Alto | Relógio, cenários determinísticos, `orders.settle()` explícito | Corrige a causa; nunca `retries` |
| Fatias estourarem as 18 h | Média | Alto | Horas por fatia nesta fila | Corte nesta ordem: favoritos, avatar, 768, spec `account`; nunca eliminatório |
| Performance mobile < 90 pela espera do Service Worker e do MSW (161 KB gzip) antes do app | Alta | Médio | Táticas de [QUALITY](QUALITY.md#6-performance) | Justificativa com a causa medida |

## Definition of Done (por fatia)

- `pnpm verify` verde (lint sem warning, typecheck, unidade, build) e spec E2E da fatia verde em
  desktop e mobile.
- Fluxo exercitado no navegador em 390 e 1440. Build verde não é sistema funcionando.
- Documento afetado atualizado no mesmo commit; [STATUS](STATUS.md) avançado.
- Merge de `feature/*` em `develop`; PR de `develop` para `main` publica a fatia em produção, seguido do smoke.

## Entrega

- [ ] Código, lockfile, assets, mocks, fixtures e testes versionados
- [ ] Checkout limpo roda seguindo só o README
- [ ] README com setup, variáveis, credenciais, cenários, comandos e reprodução das falhas
- [ ] Specs E2E verdes no CI, com relatório HTML e traces
- [ ] Roteiro manual de [QUALITY](QUALITY.md#4-roteiro-manual) conferido
- [ ] Lighthouse da URL pública em início e detalhe, mobile e desktop, com LCP, CLS e TBT; abaixo da meta, justificado
- [ ] [ARCHITECTURE](ARCHITECTURE.md) e [API](API.md) conferidos com o código; desvios do layout registrados (VIS-4)
- [ ] URL pública igual à `main`, com acesso direto e refresh em todas as rotas
- [ ] Eliminatórios de [REQUIREMENTS](REQUIREMENTS.md#eliminatórios-e-a-garantia-estrutural-de-cada-um) conferidos um a um

## Publicação

Vercel estática: `pnpm build` com `VITE_ENABLE_MOCKS=true` e `VITE_SITE_URL` igual à URL pública (sem
ela, canonical e Open Graph apontam para `localhost`), saída `dist`. `vite.config.ts` injeta o SHA de
`VERCEL_GIT_COMMIT_SHA` em `window.__kurio.build`. O `vercel.json` faz rewrite SPA para `index.html` (exceto `/assets/`, para chunk ausente ser 404 e não HTML com cache de um ano),
serve `mockServiceWorker.js` sem cache e aplica os cabeçalhos de segurança. `main` publica a cada fatia
fechada ([DECISIONS](DECISIONS.md)); rollback é "Promote" do deploy anterior. A fatia 9 faz a conferência
final da entrega, não a primeira publicação.

Cada branch gera um preview, protegido pela Vercel Authentication (só quem está logado na conta
abre). A produção, servida pela `main`, é pública: a publicação confere a URL sem login.

**Smoke a cada publicação** (no navegador): catálogo vindo do MSW sem erro no console; refresh em rota
profunda e em rota inexistente; compra como Ana até o recibo; `__kurio.catalog.setPrice` chegando ao
detalhe aberto; `__kurio.build` igual ao SHA da `main`.

| Data | SHA | Smoke |
|---|---|---|
| 2026-10-19 | `5fd30c2` | ok: rotas, refresh em rota profunda, socket simulado, ack, cabeçalhos de segurança, console sem erro |
| 2026-10-19 | `2cb7467` | ok: correções da revisão; `/assets/` inexistente responde 404 em texto; rotas, socket, ack e console sem erro |
| 2026-10-19 | `7237d0c` | ok: fatia 2 e correções da revisão; `__kurio.build` igual ao SHA; cenário da URL, persistência e reset; rotas, socket e ack; console sem erro |
| 2026-10-19 | `6b10280` | ok: fatia 3 e correções da revisão, em 1440 e 390; `__kurio.build` igual ao SHA; rota privada leva ao login e Esc volta ao início; perfil persiste após refresh na rota profunda; carteiras sem overflow; expiração mostra o aviso; console só com os 401 provocados |
| 2026-10-19 | `b1219e3` | ok: fatia 4 e correções da revisão, em 1440 e 390; `__kurio.build` igual ao SHA; filtros, ordenação e preço na URL sobrevivem ao refresh; edição da URL no detalhe; NFT e rota inexistentes com não encontrado; sem overflow; console só com o 404 provocado do `nft_999` |
| 2026-10-19 | `547965c` | ok: fatia 5 e correções da revisão, em 1440 e 390; `__kurio.build` igual ao SHA; visitante sem carrinho até adicionar; carrinho do visitante persiste no refresh com total `0,1221 ETH`; login da Ana une os carrinhos (5 itens, `0,993 ETH`) e apaga o visitante; sem overflow; nenhuma resposta de erro e console sem exceção |
| 2026-10-19 | `b41063a` | ok: fatia 6 e correções da revisão, em 1440 e 390; `__kurio.build` igual ao SHA; `setPrice` chega ao detalhe aberto; carrinho da Ana recalcula para `0,9224 ETH` e anuncia; socket autenticado com 2 subscriptions; `/dev/realtime` mostra não encontrado; sem overflow; nenhuma resposta de erro e console sem exceção |
| 2026-10-19 | `70a3074` | ok: fatia 7 e correções da revisão e do teste manual, em 1440 e 390; `__kurio.build` igual ao SHA; compra como Ana até o recibo (`confirmed` no servidor); recibo segue `0,8724 ETH` depois do `setPrice` e do refresh na rota do pedido; `setPrice` chega ao detalhe aberto; rota inexistente com não encontrado; sem overflow; nenhuma resposta de erro e console limpo |
| 2026-10-20 | `3990e30` | ok: fatia 8 e correções das duas revisões, em 1440 e 390; `__kurio.build` igual ao SHA; mobile sem cabeçalho e com a busca do protótipo; home com 12 NFTs; login sobre o detalhe, "Comprar" e compra até o recibo (`confirmed` no servidor); sem overflow; axe sem violação séria; console limpo |
