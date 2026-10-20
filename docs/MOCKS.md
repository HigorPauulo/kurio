# Mocks (MSW)

Especificação do backend simulado. Contratos que ele implementa em [API](API.md); decisões em
[DECISIONS](DECISIONS.md).

## 1. Invariantes

1. `src/` não importa `mocks/` (lint). O app não distingue backend simulado de real.
2. Um único `MockDb` atende REST e Socket.IO. Toda mutação passa por `db.commit()`, que devolve os
   eventos a emitir; não existe emissão fora de um commit.
3. Determinismo: mesmo cenário, mesma sequência de respostas e de IDs (sorteio por `mulberry32` com
   semente fixa).
4. `reset()` restaura as fixtures e o cenário padrão e apaga a persistência. A sequência de eventos e as
   versões continuam a partir das anteriores, para o cliente não descartar o que vem depois como antigo.

## 2. Estrutura

| Pasta | Conteúdo |
|---|---|
| `mocks/browser.ts` | `setupWorker` com os handlers, liga o Socket.IO simulado; exporta `start()` ao bootstrap |
| `mocks/db/` | `MockDb`, tabelas, seed, hash de senha (PBKDF2 via WebCrypto) |
| `mocks/fixtures/` | dados versionados em TypeScript (catálogo, usuários, cupons, taxas), validados pelos contratos no teste |
| `mocks/handlers/` | auth, nfts, favorites, cart, quotes, orders, me, wallets |
| `mocks/realtime/` | `ws.link` + `@mswjs/socket.io-binding`, subscriptions, handshake |
| `mocks/network/` | `withConditions()`: latência, falha e timeout em todo handler |
| `mocks/scenarios/` | presets e composição |
| `mocks/control.ts` | `window.__kurio` |

## 3. `MockDb`

Tabelas: `users`, `sessions`, `nfts`, `carts`, `quotes`, `orders`, `idempotency`, `favorites`,
`wallets`, mais `meta.sequence` (contador dos IDs). Leitura por `read(fn)`; escrita só por
`commit(fn)`, que recebe o rascunho e um contexto com `emit` (evento a publicar), `nextId(prefixo)` e
`now()`; `subscribe(listener)` entrega os eventos de cada commit ao servidor de tempo real. Os
registros são os modelos dos contratos mais os campos só do servidor (hash da senha, dono do
carrinho, cotação usada, desfecho do pedido), em `mocks/db/tables.ts`.

- `commit` roda sobre uma cópia (`structuredClone`), valida invariantes e só então troca o estado:
  falha no meio não deixa estado parcial.
- Toda escrita em `nfts`, `carts` ou `orders` incrementa a `version` do registro, detectada pelo próprio
  commit (handler nunca mexe em `version`), e o evento leva essa versão. Evento e ID seguem
  `meta.sequence`, então a mesma sequência de commits gera os mesmos IDs.
- Pedido segue a ordem de avaliação da [API](API.md#pedidos-privado): `idempotency` indexada por
  `userId:key`, cotação marcada com `usedByOrderId`, reserva na criação, devolução na recusa, baixa e
  remoção do carrinho só na confirmação. `buyer` é montado no commit e nunca recalculado.
- Senha: PBKDF2-SHA256 com salt e 600 000 iterações via WebCrypto; as fixtures trazem o hash pronto.
- Coleta: todo commit remove cotação vencida há mais de 1 min sem pedido e sessão vencida há mais de
  1 h. A sessão vencida fica 1 h para o servidor ainda distinguir `SESSION_EXPIRED` (token que existiu)
  de `UNAUTHENTICATED` (token desconhecido).
  `idempotency` e `orders` ficam, porque são o que recupera um pedido.

**Persistência:** snapshot em `localStorage` (`kurio:mockdb:v<schemaVersion>`) após cada commit;
`schemaVersion` diferente, JSON ilegível ou falta de alguma tabela descarta o snapshot e reaplica o
seed. Armazenamento bloqueado ou cheio deixa o banco só em memória. A falha de um inscrito no
`subscribe` não desfaz o commit nem impede os outros inscritos. Pedido `pending` guarda `settleAt`
absoluto; no boot, o agendador reagenda pelo tempo restante ou resolve na hora.

**Orçamento:** snapshot até 1 MB (o `localStorage` tem cerca de 5 MB). Commit que estoure é recusado
com `VALIDATION_FAILED`; `QuotaExceededError` vai ao console como erro, nunca é engolido.

## 4. Fixtures

| Conjunto | Conteúdo |
|---|---|
| NFTs | 24 (`nft_001` a `nft_024`), todas as 9 categorias e 3 redes, preços de `0.001` a `12.5` ETH com no máximo 6 casas; 2 páginas de 12 |
| Edições | 1 a 3 por NFT; ao menos 3 NFTs totalmente esgotados, 2 edições indisponíveis e algumas com `maxPerOrder < available` |
| Usuários e cupons | os do [README](../README.md#credenciais-fictícias); toda carteira com os campos obrigatórios do layout |
| Taxas | por rede, na [API](API.md#cotação-privado-no-checkout-público-no-carrinho) |

`nft_001` não muda: é a página de detalhe auditada pelo Lighthouse. O `priceFrom` é calculado a partir
das edições, nunca escrito à mão. As imagens usam um placeholder até a fatia 8.

## 5. Condições de rede

`withConditions` resolve, nesta ordem: falha forçada, latência, handler.

| Primitiva | Implementação |
|---|---|
| Latência | `delay(ms)`, fixa ou sorteada numa faixa |
| Fora de ordem | `delay = base − step × (n mod k)` pelo contador da rota: a requisição antiga chega por último |
| Timeout | o handler de pedido espera 20 s no `order-timeout`, acima dos 10 s do Axios |
| Offline | `HttpResponse.error()` |
| Falha HTTP | corpo de erro da API com o status, opcionalmente só nas `N` primeiras chamadas |

Latência, desfecho de pedido, expiração e heartbeat usam o relógio da página: sob `page.clock` tudo
para até o teste avançar o tempo, inclusive o `delay(0)` do `fast`.

## 6. Cenários

Composição de presets da esquerda para a direita (`?scenario=slow+payment-refused`; o `+` chega como espaço na URL, e os dois separam); regra posterior
vence na mesma rota. Precedência no boot: `?scenario`, depois `kurio:scenario`, depois
`VITE_MOCK_DEFAULT_SCENARIO`. Troca vale a partir da próxima requisição; `&reset=1` ou `reset()`
restauram as fixtures antes. O app tira `scenario` e `reset` da URL depois de aplicar.

| Preset | Efeito |
|---|---|
| `default` | latência de 120 a 450 ms; desfecho `confirmed` em 3 s |
| `fast` | latência 0; desfecho em 300 ms |
| `slow` | 2,5 s em leituras |
| `flaky` | 503 nas 2 primeiras chamadas de cada rota |
| `out-of-order` | `/nfts` com `base = 3000`, `step = 1000`, `k = 3` |
| `empty-catalog` / `offline` | `/nfts` vazio / erro de rede |
| `session-short` | token com 60 s |
| `price-change-on-review` | 2 s após a primeira cotação do checkout, +15% no primeiro item (truncado em 6 casas), com `nft.updated` |
| `order-timeout` | primeira `POST /orders` de cada chave cria o pedido e responde após 20 s |
| `payment-refused` | desfecho `refused` |
| `wallet-reject` | `WALLET_REJECTED` na conexão |
| `socket-duplicates` | todo evento emitido duas vezes, e a versão anterior reemitida após 1 s |
| `socket-drop` | fecha o WebSocket 1 s após um pedido entrar em `pending`; aceita reconexão após 4 s |

## 7. Socket.IO simulado

- `mocks/realtime/server.ts`: `ws.link('wss://realtime.kurio.mock/*')` com o `toSocketIo` do binding,
  inscrito no `db.subscribe`.
- Visitante conecta com `auth` vazia e recebe `nft.updated`; token de sessão válida identifica o
  usuário; os demais são recusados. Conexão recusada não recebe ack nem evento.
- Subscriptions por conexão; `order.subscribe` valida o dono.
- `nft.updated` vai a quem assinou o NFT; `order.updated`, ao dono que assinou o pedido.
- `socket-duplicates` entrega cada evento duas vezes e reentrega o evento anterior do mesmo recurso 1 s
  depois. `dropConnections({ reconnectAfterMs })` fecha as conexões e, durante a janela, fecha cada nova
  conexão no pacote CONNECT: fechar antes do `open` do Engine.IO deixa o `socket.io-client` parado, sem
  nova tentativa.

O binding 0.2.0 cobre eventos, mas não ack, recusa nem heartbeat. O mock completa o protocolo com
pacotes crus na conexão ([DECISIONS](DECISIONS.md)), todos cobertos pela spec E2E de tempo real:

| Caso | Contorno |
|---|---|
| Handshake | o binding aceita sozinho; o mock lê `auth` do pacote `40{...}` do cliente (com ou sem namespace); `auth` ausente ou sem `token` é visitante; token que não é texto, JSON ilegível ou sessão inexistente ou vencida contam como inválido, e o mock envia `44{"message":"SESSION_EXPIRED","data":{"code":"SESSION_EXPIRED"}}` sem fechar a conexão (fechar descarta o `44` e o cliente reconecta em loop) |
| Ack | o mock lê o id do pacote `42<id>[...]` e responde `43<id>[resposta]` |
| Heartbeat | o mock envia `2` (ping do Engine.IO) a cada 25 s pelo relógio da página; sem isso o cliente derruba a conexão a cada 30 s |

## 8. `window.__kurio`

| Membro | Faz |
|---|---|
| `reset()` | restaura o seed |
| `scenario.get()`, `scenario.set(presets)` | lê e troca o cenário |
| `catalog.setPrice(nft, edição, preço)`, `catalog.setAvailable(nft, edição, n)` | muda o dado e emite `nft.updated` |
| `orders.settle(id, 'confirmed' \| 'refused')` | resolve um pedido pendente (chega com os pedidos, fatia 7) |
| `realtime.dropConnections({ reconnectAfterMs })`, `realtime.stats()` | derruba sockets; conta sockets autorizados, subscriptions e eventos entregues (`delivered`) |
| `sessions.expire(userId?)` | vence o token |
| `inspect.orders()`, `inspect.cart(owner)`, `inspect.lastRequest(padrão)` | leitura do estado do servidor |
| `build` | SHA do build, conferido no smoke de publicação |

Toda escrita passa por `db.commit()`; o evento chega ao app pelo `socket.io-client`. Nada aqui toca o
cache do Query.

## 9. Limitações

- Só transporte WebSocket.
- Um servidor por aba; abas não trocam eventos.
- `msw` travado em `2.15.x` pela peer dependency do binding.
