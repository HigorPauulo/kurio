# Qualidade

O que se verifica, em que nível e qual critério reprova. O plano é dimensionado para o prazo de
entrega ([DECISIONS](DECISIONS.md)): E2E cobre fluxos e eliminatórios, unidade cobre o código onde
erro não aparece na tela, e o resto é roteiro manual executado antes da entrega.

## 1. Níveis

| Nível | Ferramenta | Alvo | Reprova |
|---|---|---|---|
| Estático | `tsc --noEmit`, ESLint `--max-warnings=0` | `src/`, `mocks/`, `e2e/` | qualquer erro ou warning |
| Unidade | Vitest | `lib/eth`, `normalizeError`, `eventStore`, `MockDb` | qualquer falha |
| E2E | Playwright 1.64.1, Chromium, desktop (1440) e mobile (390) | fluxos pela UI, com MSW e Socket.IO reais | qualquer falha; flake não se resolve com `retries` |
| Acessibilidade | `@axe-core/playwright` em toda spec | telas visitadas | violação `serious` ou `critical` (WCAG 2.2 AA) |
| Roteiro | navegador, 390, 768 e 1440 | §4 | item não conferido |
| Auditoria | Lighthouse, uma execução por perfil | `/` e `/nft/nft_001` na URL pública | meta de NF-4 sem justificativa medida |

## 2. Unidade

| Arquivo | Casos |
|---|---|
| `eth.test.ts` | 18 casas; `0.1 + 0.2`; acima de `2^53` wei; `floor` do desconto; formato inválido; `formatEth` exato com vírgula; `parseEthInput` com vírgula e ponto |
| `eventStore.test.ts` | duplicata por `id`; versão menor e igual; audiência de outro usuário; pedido terminal; semeadura por REST |
| `apiError.test.ts` | timeout e falha de rede recuperáveis; corpo de erro da API com mensagem, `details` e `fieldErrors`; 5xx fora do formato vira `INTERNAL` recuperável; 4xx fora do formato vira `BAD_REQUEST` não recuperável |
| `mockDb.test.ts` | idempotência (mesmo hash, hash diferente); cotação de uso único; reserva e liberação; remoção parcial do carrinho; hash PBKDF2 sem senha em claro; rollback de commit; fixtures com ≥ 2 usuários e variedade para filtros |

## 3. E2E

Cada teste roda em contexto novo (storage vazio), sobre o build de produção servido pelo `preview`, e
declara o cenário. Regras:

1. Seletores por papel e nome acessível; `data-testid` só sem semântica.
2. Resultado conferido no servidor (`window.__kurio.inspect`), além da tela; nunca no cache.
3. Evento só por `window.__kurio` (atravessa o servidor simulado e o `socket.io-client`).
4. Proibidos `waitForTimeout`, `page.route` para dados e `.only`. Tempo controlado por `page.clock`,
   que também para a latência do mock ([MOCKS](MOCKS.md#5-condições-de-rede)).
5. Trace, vídeo e screenshot só em falha; relatório HTML.

| Spec | Cenário | Asserção central | Requisitos |
|---|---|---|---|
| `catalog` | `fast`, `out-of-order` | filtros, ordenação e página na URL; refresh, voltar e avançar; resposta antiga descartada; detalhe por acesso direto; NFT inexistente; edição esgotada; limite de quantidade | CAT, DET-1, DET-2, NAV-1 |
| `auth` | `fast`, `session-short` | conflito por campo; `redirect` (e `/\evil.com` cai em `/`); expiração; troca Ana → Bruno sem resíduo; Bruno na URL de um pedido da Ana vê "não encontrado" | AUT-1..3, AUT-5, NAV-2 |
| `account` | `fast` | campos do layout em perfil e carteiras, os de outro dono somente leitura; erro da API por campo; persistência após reload | PER-1, WAL-1 |
| `cart` | `fast` | limites; cupons inválido, expirado e abaixo do mínimo com mensagens distintas; refresh; merge no login | CRT-1..4 |
| `checkout` | `fast` | catálogo até o recibo; Carla bloqueada sem Nome ENS; `setPrice` depois não altera o recibo; carrinho perde só o comprado | PAG-4, PED-2..4, MOC-2 |
| `checkout-failures` | `payment-refused`, `order-timeout`, `wallet-reject` | duplo clique e retry geram um pedido só; reload no timeout recupera o mesmo pedido; recusa preserva o carrinho | PAG-1, PAG-3, PED-3 |
| `realtime` | `price-change-on-review`, `socket-duplicates`, `socket-drop` | anúncio e resumo novo; "Confirmar" bloqueado até aceite; valor não regride; anúncio único; reload no pendente mantém o pedido; `stats()` zera após sair | CRT-5, PAG-2, PED-1, RT, MOC-7 |

## 4. Roteiro manual

Executado no build de produção antes da entrega, em 390, 768 e 1440:

- **Fidelidade:** início, detalhe, carrinho e pagamento lado a lado com o protótipo (tipografia,
  espaçamento, hierarquia, proporção de imagem); tokens do tema iguais às variáveis lidas pelo Figma
  MCP; desvio vai para a ARCHITECTURE (VIS-4).
- **Responsivo:** sem rolagem horizontal, inclusive com zoom de 200%.
- **Teclado:** compra completa só com teclado; foco visível, preso no diálogo e devolvido ao fechar.
- **Estados:** skeleton sem deslocar layout (`slow`), erro e nova tentativa (`flaky`), vazio
  (`empty-catalog`), offline (`offline`), movimento reduzido.
- **Favoritos:** otimista, rollback com falha, persistência por usuário.
- **Mocks:** `reset()` restaura o seed; cenário sobrevive a reload; link fora de escopo leva a `/unavailable`.

## 5. Acessibilidade

- Landmarks e um `h1` por rota; foco vai ao `h1` após navegar; `document.title` por rota.
- Diálogos (Base UI): foco preso, `Esc` fecha, foco devolvido ao gatilho.
- Campo com `<label>`; erro em `aria-describedby` com `aria-invalid`; submit inválido foca o primeiro erro.
- Live region única alimentada por `announce()`; anúncio de tempo real passa pelo dedupe do `eventStore`.
- Estado nunca só por cor: esgotado, preço alterado e recusado têm texto e ícone.

## 6. Performance

Metas de NF-4. Táticas: casco estático no `index.html` enquanto o MSW sobe antes do app
([ARCHITECTURE](ARCHITECTURE.md#4-bootstrap)); `autoCodeSplitting` com checkout e conta fora do
bundle inicial; imagens WebP com `srcset`, dimensões explícitas e `fetchpriority="high"` na LCP;
fontes WOFF2 self-hosted com preload; `head` por rota e `lang="pt-BR"`. Nada é desligado só para a
auditoria. O relatório (HTML) da URL pública vai em `lighthouse/` na entrega.

## 7. CI

GitHub Actions a cada push e PR: `pnpm install --frozen-lockfile` → `pnpm verify` (lint, typecheck,
unidade, build) → `pnpm exec playwright install --with-deps chromium` → `pnpm test:e2e` → upload do
relatório e dos traces. É o mesmo gate da máquina local.
