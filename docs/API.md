# Contratos de API

A fonte executável são os schemas Zod em `src/contracts/`, usados pelos handlers (validam a
requisição) e pelo cliente (valida a resposta). Este documento é suficiente para implementar um
handler ou um cliente sem perguntar nada; se divergir do schema, o schema vence e este documento é
corrigido no mesmo PR. Pergunta que este documento não responde é lacuna, e se corrige aqui.

## Convenções

- Base `/api`, JSON UTF-8, datas ISO 8601 UTC.
- IDs opacos com prefixo: `usr_`, `nft_`, `ed_`, `crt_`, `itm_`, `qte_`, `ord_`, `wal_`.
- `EthAmount`: string `^(0|[1-9]\d*)(\.\d{1,18})?$`. Quantidade: inteiro ≥ 0.
- `Authorization: Bearer <token>`; visitante envia `X-Guest-Cart-Id: <uuid>`; todo request leva
  `X-Request-Id: <uuid>`, devolvido no erro.
- `Nft`, `Cart` e `Order` têm `version` inteira e monotônica, a mesma carregada pelos eventos.
- Rota privada sem token responde 401 `UNAUTHENTICATED`; com token vencido, 401 `SESSION_EXPIRED`.
  Isso vale para todas as linhas marcadas **privado** e não se repete abaixo.
- Texto livre é aparado (`trim`) antes da validação; limite de tamanho conta caracteres após o corte.

## Erros

```ts
type ApiError = { error: { code: ErrorCode; message: string; retryable: boolean; requestId: string
                           fieldErrors?: Record<string, string[]>; details?: unknown } }
```

| HTTP | Códigos | `retryable` |
|---|---|---|
| 400 | `BAD_REQUEST` | não |
| 401 | `UNAUTHENTICATED`, `SESSION_EXPIRED`, `INVALID_CREDENTIALS` | não |
| 403 | `FORBIDDEN` | não |
| 404 | `NOT_FOUND` | não |
| 409 | `EMAIL_TAKEN`, `USERNAME_TAKEN`, `WALLET_ADDRESS_TAKEN`, `AVAILABILITY_CONFLICT`, `QUOTE_STALE`, `QUOTE_EXPIRED`, `QUOTE_ALREADY_USED`, `IDEMPOTENCY_CONFLICT`, `ORDER_PENDING`, `WALLET_NOT_CONNECTED` | não |
| 422 | `VALIDATION_FAILED` (com `fieldErrors`), `COUPON_INVALID`, `COUPON_EXPIRED`, `COUPON_MINIMUM_NOT_MET`, `WRONG_PASSWORD`, `WALLET_REJECTED` | não |
| 500, 503 | `INTERNAL`, `UNAVAILABLE` | sim |

Sem resposta (rede ou timeout de 10 s), o cliente normaliza como `NETWORK_ERROR` ou `TIMEOUT`, ambos
retryable. `details` por código: `AVAILABILITY_CONFLICT` → `{ editionId, available, maxPerOrder }`;
`QUOTE_STALE` → `{ quote: Quote }` (a nova); `IDEMPOTENCY_CONFLICT`, `QUOTE_ALREADY_USED` e `ORDER_PENDING` →
`{ orderId }`; `COUPON_MINIMUM_NOT_MET` → `{ minimum: EthAmount, subtotal: EthAmount }`.

## Modelos

```ts
type User = { id; email; username; name; ensName: string | null; avatarUrl: string | null; createdAt }
type Session = { token: string; expiresAt: string; user: User }

type Edition = { id; label; price: EthAmount; available: number; supply: number; maxPerOrder: number
                 status: 'available' | 'sold_out' | 'unavailable' }
type Image = { url; alt; width: number; height: number }
type Nft = { id; name; description; collection: { id; name }; creator: { id; name; avatarUrl }
             category: Category; chain: Chain; images: Image[]; editions: Edition[]
             priceFrom: EthAmount; featured: boolean; likes: number; createdAt; version: number }
type NftSummary = Pick<Nft, 'id' | 'name' | 'collection' | 'creator' | 'category' | 'chain'
                  | 'priceFrom' | 'likes' | 'version'> & { cover: Image; status: 'available' | 'sold_out' }
type Page<T> = { items: T[]; page: number; pageSize: number; total: number; totalPages: number }

type CartItem = { id; nftId; editionId; quantity: number; nftName; editionLabel; cover: Image
                  unitPrice: EthAmount; available: number; maxPerOrder: number
                  status: 'ok' | 'price_changed' | 'insufficient' | 'sold_out' }
type Cart = { id; items: CartItem[]; coupon: { code } | null; version: number; updatedAt }

type Quote = { id; cartId; cartVersion: number; network: Chain
               lines: { itemId; nftId; editionId; quantity; unitPrice: EthAmount; lineTotal: EthAmount }[]
               coupon: { code; description } | null
               subtotal: EthAmount; discount: EthAmount; networkFee: EthAmount; total: EthAmount
               issues: QuoteIssue[]; purchasable: boolean; basisHash: string; createdAt; expiresAt }
type QuoteIssue = { kind: 'PRICE_CHANGED'; itemId; from: EthAmount; to: EthAmount }
                | { kind: 'INSUFFICIENT'; itemId; requested: number; available: number }
                | { kind: 'SOLD_OUT'; itemId } | { kind: 'COUPON_EXPIRED'; code }
                | { kind: 'COUPON_MINIMUM_NOT_MET'; code; minimum: EthAmount }

// Snapshot montado pelo servidor a partir do User e da Wallet no momento do pedido
type Buyer = { name; username; email; ensName; profileName; referralCode; note: string | null }
type Order = { id; status: 'pending' | 'confirmed' | 'refused'; version: number; quoteId
               receipt: { lines: (Quote['lines'][number] & { nftName; editionLabel; cover: Image })[]
                          subtotal; discount; networkFee; total; coupon: { code } | null; network: Chain
                          wallet: { id; label; address; provider: WalletProvider }; buyer: Buyer }
               transaction: { hash; explorerUrl } | null      // só em confirmed
               refusal: { reason } | null                     // só em refused
               createdAt; updatedAt }

type WalletProvider = 'metamask' | 'walletconnect' | 'coinbase'
type Wallet = { id; role: 'primary' | 'secondary'; label; provider: WalletProvider
                address: string; backupAddress: string | null; networks: Chain[]
                profileName; referralCode
                connection: { status: 'disconnected' } | { status: 'connected'; network: Chain }
                createdAt; updatedAt }
```

`Category`: `digital-art`, `photography`, `music`, `3d-art`, `collectibles`, `generative`, `gaming`,
`memberships`, `utility` (rótulos em PT-BR na UI). `Chain`: `ethereum`, `polygon`, `base`. As duas
listas são fechadas: valor fora delas é 400 na API e default na URL ([DECISIONS](DECISIONS.md)).

`NftSummary.status` é `available` se ao menos uma edição está `available`; caso contrário
`sold_out` (edição `unavailable` conta como esgotada no catálogo; o motivo aparece no detalhe).

## Campos do layout

Todo campo do protótipo é renderizado e validado, e cada um tem um dono só
([DECISIONS](DECISIONS.md)). Fora do dono, o campo aparece preenchido, somente leitura, com link
"Editar em ..." para a tela do dono. Campo obrigatório vazio no dono vira erro no campo da tela que o
exibe (ex.: pagamento com `ensName` nulo mostra "Complete o Nome ENS no perfil").

| Campo (rótulo do protótipo) | Dono e propriedade | Telas que o exibem | Regra |
|---|---|---|---|
| Nome de exibição | `User.name` | Perfil (edita), Carteiras, Pagamento | 2 a 60 caracteres |
| Nome de usuário | `User.username` | Cadastro e Perfil (edita), Pagamento | `^[a-z0-9_]{3,20}$`, único |
| E-mail | `User.email` | Cadastro e Perfil (edita), Carteiras, Pagamento | e-mail válido, até 254, único, gravado em minúsculas |
| Nome ENS (`.eth`) | `User.ensName` | Perfil (edita), Carteiras, Pagamento | rótulo `^[a-z0-9-]{3,63}$` sem hífen nas pontas; gravado com o sufixo `.eth`; obrigatório para comprar |
| Senha, Confirmar senha | `User` (hash) | Cadastro | 8 a 72, com letra e número; confirmação igual, conferida só no cliente |
| Senha atual, Nova senha, Confirmar nova senha | `User` (hash) | Perfil | idem; confirmação conferida só no cliente |
| Avatar | `User.avatarUrl` | Perfil (edita) | ver `POST /me/avatar` |
| Apelido da carteira | `Wallet.label` | Carteiras (edita), Perfil (da principal) | 2 a 40 caracteres |
| Rede | `Wallet.networks` | Carteiras (edita, múltipla); Pagamento (escolhe uma entre as da carteira) | ao menos uma `Chain` |
| Endereço da carteira | `Wallet.address` | Carteiras (edita), Pagamento | `^0x[0-9a-fA-F]{40}$`, único entre carteiras |
| ENS ou carteira secundária (opcional) | `Wallet.backupAddress` | Carteiras (edita), Pagamento | vazio, endereço `0x` ou nome `<rótulo>.eth` |
| Tipo de carteira | `Wallet.provider` | Carteiras (edita), Pagamento | `metamask`, `walletconnect` ou `coinbase` |
| Nome do perfil | `Wallet.profileName` | Carteiras (edita), Pagamento | 2 a 60 caracteres (perfil público no provedor) |
| Código de indicação | `Wallet.referralCode` | Carteiras (edita), Pagamento | `^[A-Z0-9]{6,12}$`, gravado em maiúsculas |
| Usar outra carteira? | escolha do pedido (`walletId`) | Pagamento | troca da principal para a secundária; desabilitado sem secundária |
| Carteira e rede (MetaMask, WalletConnect, Coinbase) | conexão da carteira escolhida | Pagamento | só o provedor da carteira escolhida fica habilitado; os outros mostram o motivo |
| Observação do colecionador (opcional) | `Buyer.note` do pedido | Pagamento | até 500 caracteres |
| Cupom ("Tem um código promocional?") | `Cart.coupon` | Carrinho, Pagamento | ver `PUT /cart/coupon` |

O botão "Ou continue com" do cadastro e do login leva a `/unavailable` (login social fora de escopo).

## Endpoints

### Sessão

| Endpoint | Corpo | Sucesso | Erros |
|---|---|---|---|
| `POST /auth/register` | `{ username, email, password }` | 201 `Session` | 409 `EMAIL_TAKEN`, `USERNAME_TAKEN`; 422 |
| `POST /auth/login` | `{ email, password }` | 200 `Session` | 401 `INVALID_CREDENTIALS`; 422 |
| `GET /auth/session` | | 200 `Session` | 401 |
| `POST /auth/logout` | | 204, idempotente | |

No cadastro, `name` nasce igual ao `username` e `ensName` nasce nulo. O cliente carrega a
sessão salva sem chamar `GET /auth/session` ([ARCHITECTURE](ARCHITECTURE.md#8-sessão)). TTL do token de 30 min (configurável por cenário); sem
refresh token.

### NFTs (público)

| Endpoint | Sucesso | Erros |
|---|---|---|
| `GET /nfts` | 200 `Page<NftSummary> & { appliedQuery }` | 400 |
| `GET /nfts/featured` | 200 `NftSummary[]` (até 6) | |
| `GET /nfts/:id` | 200 `Nft` | 404 |

Parâmetros de `GET /nfts`: `q` (1 a 80 caracteres, sem acento e sem caixa, em nome, coleção e
criador); `category` e `chain` (listas separadas por vírgula, OR dentro do filtro); `status`
(`available`, `sold_out`); `priceMin` e `priceMax` (`EthAmount`, sobre `priceFrom`, min ≤ max ou 400);
`sort` (`recent` por `createdAt` decrescente, padrão; `price_asc`; `price_desc`; `popular` por `likes`
decrescente; desempate sempre por `id`); `page` (≥ 1); `pageSize` (1 a 48, padrão 12). Filtros
diferentes combinam por AND. `appliedQuery` ecoa os parâmetros normalizados. Página além do fim
devolve `items: []` com o `total` real.

### Favoritos (privado)

| Endpoint | Sucesso | Erros |
|---|---|---|
| `GET /me/favorites` | 200 `{ nftIds: string[] }` | |
| `PUT /me/favorites/:nftId` | 204, idempotente | 404 |
| `DELETE /me/favorites/:nftId` | 204, idempotente | |

Favoritar soma 1 em `Nft.likes` e desfavoritar subtrai 1, só quando o estado muda. `likes` não é dado
de tempo real: muda sem `nft.updated` e chega ao catálogo pelo `staleTime`.

### Carrinho (visitante ou usuário)

| Endpoint | Corpo | Sucesso | Erros |
|---|---|---|---|
| `GET /cart` | | 200 `Cart` (criado vazio se não existir) | 400 sem `Authorization` nem `X-Guest-Cart-Id` (UUID) |
| `POST /cart/items` | `{ nftId, editionId, quantity }` | 200 `Cart`; soma se a edição já estiver | 404; 409 `AVAILABILITY_CONFLICT` |
| `PATCH /cart/items/:id` | `{ quantity }` (≥ 1) | 200 `Cart`; diminuir é sempre aceito, mesmo acima do limite | 404; 409 `AVAILABILITY_CONFLICT` ao aumentar além do limite |
| `DELETE /cart/items/:id` | | 200 `Cart`, idempotente | |
| `PUT /cart/coupon` | `{ code }` | 200 `Cart` | 422 `COUPON_INVALID`, `COUPON_EXPIRED`, `COUPON_MINIMUM_NOT_MET` |
| `DELETE /cart/coupon` | | 200 `Cart` | |
| `POST /cart/merge` (privado) | `{ guestCartId }` | 200 `{ cart, adjustments: { editionId, requested, kept }[] }` | |

Merge: por edição, soma e limita a `min(available, maxPerOrder)`; cada corte vira um `adjustment`. O
cupom do visitante só entra se o usuário não tiver um. Edição esgotada não entra, e o item que o usuário
já tinha dela fica como está (`sold_out`). Item somado ou copiado grava o preço atual. O carrinho do
visitante é apagado.

Item do carrinho: `unitPrice` é o preço que o comprador viu ao adicionar ou alterar o item; `available`,
`maxPerOrder` e `status` são recalculados a cada resposta. `status` é `sold_out` se a edição não está à
venda ou zerou, `insufficient` se a quantidade passa do limite, `price_changed` se o preço atual difere
do `unitPrice`. O preço atual vem na cotação (`PRICE_CHANGED { from, to }`); adicionar ou alterar o item
grava o preço atual. Erros de cupom trazem `fieldErrors.code` com a mensagem do campo.

Cupom com mínimo: aplicar com subtotal abaixo do mínimo responde 422. Se o subtotal cair abaixo depois
de aplicado, o cupom permanece no carrinho e a cotação traz a issue `COUPON_MINIMUM_NOT_MET` com
`discount = 0`; volta a valer sozinho quando o subtotal sobe.

### Cotação (privado no checkout, público no carrinho)

| Endpoint | Corpo | Sucesso | Erros |
|---|---|---|---|
| `POST /quotes` | `{ network, purpose? }` | 201 `Quote` do carrinho atual | 422 (inclui carrinho vazio) |

Cálculo em wei: `lineTotal = unitPrice × quantity`; `subtotal = Σ lineTotal`; desconto percentual
`floor(subtotal × bps / 10000)`, fixo `min(valor, subtotal)`; `networkFee = base(rede) + porItem(rede)
× Σ quantity`; `total = subtotal − discount + networkFee`. Validade de 5 min. `basisHash` resume as
versões dos NFTs, o cupom e a rede. No carrinho, o cliente pede `network: 'ethereum'`; no checkout, a
rede escolhida, com `purpose: 'checkout'` (padrão `'cart'`; só os cenários do mock leem o campo). Cotação vencida e sem pedido é coletada pelo mock ([MOCKS](MOCKS.md#3-mockdb)).

| Rede | `base` | `porItem` |
|---|---|---|
| `ethereum` | `0.0015` | `0.0003` |
| `polygon` | `0.0001` | `0.00002` |
| `base` | `0.0002` | `0.00004` |

Valores simulados em ETH ([DECISIONS](DECISIONS.md)), versionados nas fixtures. A cotação traz uma
linha por item, inclusive esgotado ou acima do limite; `SOLD_OUT` e `INSUFFICIENT` tornam
`purchasable` falso, `PRICE_CHANGED` só avisa.

### Pedidos (privado)

| Endpoint | Corpo | Sucesso | Erros |
|---|---|---|---|
| `POST /orders` + `Idempotency-Key: <uuid>` | `{ quoteId, walletId, network, note }` | 201 `Order` pendente; 200 com o mesmo pedido se mesma chave e mesmo corpo | 400 sem chave; 409 `IDEMPOTENCY_CONFLICT`, `QUOTE_ALREADY_USED`, `ORDER_PENDING`, `QUOTE_STALE`, `QUOTE_EXPIRED`, `AVAILABILITY_CONFLICT`, `WALLET_NOT_CONNECTED`; 422 |
| `GET /orders/:id` | | 200 `Order` | 403 de outro usuário; 404 |

Ordem de avaliação de `POST /orders`, obrigatória para o handler:

1. Sem `Idempotency-Key` → 400.
2. Chave já registrada para o usuário → mesmo `bodyHash` devolve 200 com o pedido no estado atual;
   hash diferente → 409 `IDEMPOTENCY_CONFLICT`. **Nenhuma outra validação roda antes deste passo**:
   cotação expirada, estoque ou carteira não impedem recuperar um pedido já criado.
3. Cotação já usada por outra chave → 409 `QUOTE_ALREADY_USED` com o `orderId` existente. Usuário com
   pedido `pending` → 409 `ORDER_PENDING` com o `orderId` dele: um pedido em processamento por vez, para
   o mesmo carrinho não reservar nem cobrar duas vezes.
4. Só então: corpo e perfil (422, com `fieldErrors` para `ensName` nulo, `walletId` que não é do usuário
   ou `network` fora de `wallet.networks`), cotação (`QUOTE_EXPIRED`, também para cotação inexistente
   ou de outro dono; `QUOTE_STALE` com a cotação nova em `details.quote`), conexão da carteira na rede
   do corpo (`WALLET_NOT_CONNECTED`), disponibilidade.

A chave é escopada por usuário: a mesma chave de outro usuário é chave nova. `note`: string de até
500 caracteres ou `null`. `buyer` não vem no corpo: o servidor monta o snapshot a partir do `User` e
da `Wallet`.

A criação reserva a disponibilidade e marca a cotação como usada; recusa libera a reserva (a cotação
continua usada, e nova tentativa pede nova cotação). Na confirmação, o servidor baixa o estoque e
remove do carrinho só as quantidades compradas (incrementa `cart.version`). `receipt` é gravado na
criação e nunca recalculado.

### Perfil (privado)

| Endpoint | Corpo | Sucesso | Erros |
|---|---|---|---|
| `GET /me` | | 200 `User` | |
| `PATCH /me` | `{ name?, username?, email?, ensName? }` | 200 `User` | 409 `USERNAME_TAKEN`, `EMAIL_TAKEN`; 422 |
| `POST /me/avatar` | multipart `file`: PNG, JPEG ou WebP, até 32 KB | 200 `{ avatarUrl }` | 422 `VALIDATION_FAILED` |
| `DELETE /me/avatar` | | 200 `{ avatarUrl: null }` | |
| `POST /me/password` | `{ currentPassword, newPassword }` | 204, sessão mantida | 422 `WRONG_PASSWORD`, `VALIDATION_FAILED` |

`ensName` aceita o rótulo com ou sem `.eth` e grava com o sufixo; `null` limpa. O limite de 32 KB do
avatar e a cota total de avatares (400 mil caracteres em data URL, cerca de 9) protegem o orçamento de
1 MB do snapshot; acabada a cota, o upload responde 422 no campo `file`. O cliente confere tipo e
tamanho antes de enviar.

### Carteiras (privado)

| Endpoint | Corpo | Sucesso | Erros |
|---|---|---|---|
| `GET /me/wallets` | | 200 `Wallet[]` (0 a 2) | |
| `POST /me/wallets` | `{ role, label, provider, address, backupAddress, networks, profileName, referralCode }` | 201 `Wallet` | 409 `WALLET_ADDRESS_TAKEN`; 422 (inclui papel ocupado) |
| `PATCH /me/wallets/:id` | parcial do corpo acima | 200 `Wallet` | 404; 409; 422 |
| `POST /me/wallets/:id/connection` | `{ network }` | 200 `Wallet` conectada | 422 `WALLET_REJECTED` ou rede fora de `networks` |
| `DELETE /me/wallets/:id/connection` | | 200 `Wallet` desconectada | |

Regras por campo na tabela [Campos do layout](#campos-do-layout). No `POST`, papel ocupado é 422; no
`PATCH`, trocar o papel para um já ocupado troca os papéis das duas carteiras na mesma operação.
Carteira não se remove no escopo (o protótipo não tem a ação).

## Eventos Socket.IO

**Conexão:** `io(VITE_SOCKET_URL, { transports: ['websocket'], autoConnect: false, auth: { token } })`;
visitante conecta com `auth: {}`. Token inválido ou vencido recusa o handshake com `connect_error` e
`data: { code: 'SESSION_EXPIRED' }`; o cliente segue o fluxo de expiração e não reconecta com aquele
token. Um socket por sessão.

```ts
type Envelope<TType, TData> = { id: string; type: TType; resource: { kind: 'nft' | 'order'; id: string }
                                version: number; audience: { userId } | null; occurredAt: string; data: TData }
```

| Evento | Recebe | `data` | Efeito no cliente |
|---|---|---|---|
| `nft.updated` | sockets que assinaram o NFT | `{ nftId, priceFrom, editions: { editionId, price, available, status }[] }` (snapshot) | atualiza catálogo e detalhe; invalida carrinho e cotação; anuncia se afetar o carrinho |
| `order.updated` | socket do dono que assinou o pedido | `{ orderId, status, transaction, refusal }` | atualiza o pedido; terminal invalida o carrinho e encerra a subscription |

| Cliente emite | Payload | Ack |
|---|---|---|
| `nft.subscribe` / `nft.unsubscribe` | `{ nftIds: string[] }` | `{ ok: true }` |
| `order.subscribe` | `{ orderId }` | `{ ok: true }` ou `{ ok: false, code: 'FORBIDDEN' \| 'NOT_FOUND' }` |
| `order.unsubscribe` | `{ orderId }` | `{ ok: true }` |

Regras de aplicação (dedupe, versão, audiência, terminal) em [ARCHITECTURE](ARCHITECTURE.md#10-tempo-real).
