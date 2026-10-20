# Qualidade

O que se verifica, em que nível e qual critério reprova. O plano é dimensionado para o prazo de
entrega ([DECISIONS](DECISIONS.md)): E2E cobre fluxos e eliminatórios, unidade cobre o código onde
erro não aparece na tela, e o resto é roteiro manual executado antes da entrega.

## 1. Níveis

| Nível | Ferramenta | Alvo | Reprova |
|---|---|---|---|
| Estático | `tsc --noEmit`, ESLint `--max-warnings=0` | `src/`, `mocks/`, `e2e/` | qualquer erro ou warning |
| Unidade | Vitest | contratos, `lib/eth`, `lib/http`, `lib/session`, `safeRedirect`, `eventStore`, `MockDb`, handlers e handshake do mock | qualquer falha |
| E2E | Playwright 1.64.1, Chromium, desktop (1440) e mobile (390) | fluxos pela UI, com MSW e Socket.IO reais | qualquer falha; flake não se resolve com `retries` |
| Acessibilidade | `@axe-core/playwright` em toda spec | telas visitadas | violação `serious` ou `critical` (WCAG 2.2 AA) |
| Roteiro | navegador, 390, 768 e 1440 | §4 | item não conferido |
| Auditoria | Lighthouse, uma execução por perfil | `/` e `/nft/nft_001` na URL pública | meta de NF-4 sem justificativa medida |

## 2. Unidade

| Arquivo | Casos |
|---|---|
| `eth.test.ts` | 18 casas; `0.1 + 0.2`; acima de `2^53` wei; `floor` do desconto; formato inválido; `formatEth` exato com vírgula; `parseEthInput` com vírgula e ponto; `formatEthInput` volta igual pelo `parseEthInput`, inclusive acima de 1000 |
| `eventStore.test.ts` | duplicata por `id`; versão menor e igual; audiência de outro usuário; pedido terminal; semeadura por REST |
| `apiError.test.ts` | timeout e falha de rede recuperáveis; corpo de erro da API com mensagem, `details` e `fieldErrors`; fora do formato, código derivado do status (400, 401, 404, 500, 503) e 408, 429 e 5xx recuperáveis; código desconhecido preserva mensagem e `requestId` |
| `client.test.ts` | `UNAUTHENTICATED` com token enviado também expira; expiração dispara uma vez por token enviado, inclusive com requisições simultâneas e novo login antes da resposta antiga; requisição sem token não dispara; erro fora do Axios chega intacto |
| `handshake.test.ts` | token do CONNECT com e sem namespace; JSON ilegível, token que não é texto e auth ausente viram `null` |
| `contracts.test.ts` | ETH com até 18 casas e formatos recusados; Nome ENS gravado com `.eth`; e-mail normalizado; senha com letra e número; código de indicação em maiúsculas; carteira secundária 0x ou `.eth`; filtros do catálogo vindos da URL; observação até 500; eventos separados pelo tipo; preço mínimo até o máximo com comparação exata; campo opcional vazio vira `null` |
| `storage.test.ts` | armazenamento que funciona é devolvido sem resto da sonda; acesso bloqueado e gravação recusada devolvem `null` |
| `scenarios.test.ts` | prioridade URL, salvo e padrão; presets combinados e o posterior vencendo; latência determinística na faixa; `slow` só em leitura; `flaky` nas 2 primeiras de cada rota; fora de ordem; offline; registro e reset das requisições |
| `control.test.ts` | `setPrice` e `setAvailable` recalculam o NFT e emitem `nft.updated` com versão nova; entrada inválida recusada sem evento; troca de cenário; expiração por usuário; `inspect` no formato do contrato; reset volta ao seed e ao cenário padrão |
| `search.test.ts` (catálogo) | listas ordenadas e sem repetição; defaults fora da URL; valor inválido degrada sem lançar; preço exato e faixa invertida descartada; busca aparada |
| `search.test.ts` (URL) | valor ETH com 18 casas e lista com vírgula sem passar por JSON; ausentes omitidos; ida e volta do `redirect` |
| `safeRedirect.test.ts` | caminho interno com busca e âncora; origem externa, `//`, `\`, esquema perigoso, caractere de controle e valor que não é texto caem em `/` |
| `session.test.ts` | sessão persistida expira sozinha no `expiresAt`; restaurada válida, vencida ou corrompida; `clear` cancela o timer; armazenamento que recusa gravação não impede a troca de estado; `switchIdentity` não cancela busca pública e apaga o cache privado anterior; `completeLogin` do mesmo usuário mantém o cache, de outro limpa; merge do visitante com o token novo, resultado no dono novo e visitante esquecido; falha no merge não impede o login; UUID do visitante criado só quando pedido, corrompido ignorado e só em memória quando o armazenamento recusa |
| `handlers.test.ts` | cadastro sem senha em claro; conflito e 422 por campo; login; token desconhecido, vencido e encerrado; TTL do `session-short`; perfil com `.eth`; troca de senha; avatar por tipo e tamanho; cota total de avatares sem travar o banco; carteira com papel ocupado, endereço repetido, troca de papéis, rede não suportada, `wallet-reject` e carteira alheia; catálogo paginado com desempate por `id`, busca sem acento, filtros por AND e OR, preço exato, 400, `empty-catalog`, destaques e 404; favoritos idempotentes com `likes` só na mudança, 401 e isolamento por usuário; carrinho com identificador do visitante, soma por edição, limite com `details`, remoção idempotente, cupons com códigos distintos, cotação em wei exato por rede, preço alterado e esgotado bloqueando, carrinho vazio 422 e merge com ajuste, cupom e apagamento do visitante; diminuir item acima do estoque aceito e aumentar recusado; merge mantém item esgotado do usuário e grava o preço atual |
| `mockDb.test.ts` | infraestrutura: commit atômico com rollback; invariantes de estoque; versão só no registro alterado; evento com versão e ID determinístico; persistência, snapshot de outra versão ou ilegível; orçamento de 1 MB; coleta de cotação e sessão vencidas; reset que continua a sequência de eventos e sobe as versões; snapshot sem alguma tabela descartado; inscrito com falha isolado. IDs de coleção sem acento; status e `priceFrom` do seed iguais aos de `refreshNft`. Domínio, com os handlers de cada fatia: idempotência, cotação de uso único, reserva e liberação, remoção parcial do carrinho, hash PBKDF2, fixtures |

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
| `catalog` | `fast`, `out-of-order` | filtros, ordenação e página na URL; refresh, voltar e avançar; preço com vírgula vai à URL com ponto e faixa invertida é recusada; resposta antiga descartada; detalhe por acesso direto com galeria e edição na URL; NFT inexistente e rota inexistente; edição esgotada e indisponível com motivo; limite de quantidade | CAT, DET-1, DET-2, NAV-1 |
| `auth` | `fast` | confirmação de senha e conflito por campo; senha errada; `redirect` (e `/\evil.com` cai em `/`); fechar o login de rota privada não prende; sessão esquecida pelo servidor leva ao aviso; expiração no meio do fluxo e retorno ao mesmo lugar; troca Ana → Bruno sem recarregar e sem resíduo | AUT-1..3, NAV-2 |
| `account` | `fast` | campos do layout em perfil e carteiras, os de outra tela somente leitura com link; erro da API por campo; senha atual errada; avatar; carteira nova validada campo a campo; persistência após reload | PER, WAL |
| `cart` | `fast` | limites no detalhe e no carrinho; cupons inválido, expirado e abaixo do mínimo com mensagens distintas; resumo da cotação com precisão decimal; refresh; merge no login com ajuste anunciado e visitante apagado no servidor; item acima do estoque avisa e se ajusta ao limite | CRT-1..4, NF-5 |
| `checkout` | `fast` | catálogo até o recibo; Carla bloqueada sem Nome ENS; `setPrice` depois não altera o recibo; carrinho perde só o comprado; Bruno na URL de um pedido da Ana vê "não encontrado" | PAG-4, PED-2..4, MOC-2, AUT-5 |
| `checkout-failures` | `payment-refused`, `order-timeout`, `wallet-reject` | duplo clique e retry geram um pedido só; reload no timeout recupera o mesmo pedido; recusa preserva o carrinho | PAG-1, PAG-3, PED-3 |
| `realtime` | `price-change-on-review`, `socket-duplicates`, `socket-drop` | anúncio e resumo novo; "Confirmar" bloqueado até aceite; valor não regride; anúncio único; reload no pendente mantém o pedido; `stats()` zera após sair | CRT-5, PAG-2, PED-1, RT, MOC-7 |
| `bootstrap` | Service Worker ou `localStorage` bloqueado | aviso no lugar da tela em branco, sem loop de recarga | NF-6 |
| `mocks` | `fast` | cenário da URL aplicado e URL limpa; SHA do build exposto; cenário e banco persistem no reload; `reset()` apaga o snapshot e volta ao cenário padrão | MOC-3, MOC-8 |

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
- **Fora de escopo:** link para seção que não existe leva a `/unavailable`.

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

GitHub Actions a cada PR e a cada push em `main` e `develop` (branch de trabalho roda pelo PR, sem
execução duplicada): `pnpm install --frozen-lockfile` → `pnpm verify` (lint, typecheck, unidade,
build) → `pnpm exec playwright install --with-deps chromium` → `pnpm test:e2e`, que no CI serve o
`dist` do `verify` sem compilar de novo → upload do relatório e dos traces. É o mesmo gate da
máquina local.
