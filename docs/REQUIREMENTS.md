# Requisitos

O enunciado do desafio traduzido em requisitos com ID. Meta: todo item do enunciado com um ID; item
sem ID não é rastreável, conta como lacuna e se corrige aqui. Critério de aceite: a verificação
indicada passa: spec E2E em desktop e mobile, teste de unidade, lint ou item do roteiro manual
([QUALITY](QUALITY.md)). PR cita os IDs que prova.

## Produto e escopo

Marketplace de NFTs (SPA) com descoberta, compra e conta do colecionador, em desktop e mobile, sobre
backend simulado. Identidade visual e campos pelo protótipo do desafio (Figma), cada campo com
dono e regra em [API](API.md#campos-do-layout); comportamento e larguras por este documento. Estado
sem representação visual segue os padrões dos componentes existentes e é registrado (VIS-4).

**Fora de escopo:** blockchain, carteira e gateway reais; páginas editoriais, suporte, atividade,
ofertas e downloads. Link para elas leva a `/unavailable`, que diz que a seção não faz parte da
demonstração: nada aparenta sucesso funcional.

**Domínio:** NFT se compra por **edição** (preço, disponibilidade e limite por pedido próprios); valor
em ETH tem 18 casas; a **cotação** do servidor fixa subtotal, desconto, taxa de rede e total com
validade, e só ela vira pedido; o **recibo** é snapshot imutável do pedido.

| Tela | Rota | Acesso |
|---|---|---|
| Início | `/` com `q`, `category`, `chain`, `status`, `priceMin`, `priceMax`, `sort`, `page` | público |
| Detalhe | `/nft/$nftId` com `edition` | público |
| Carrinho | `/cart` | público |
| Pagamento | `/checkout` com `step` | privado |
| Pedido e recibo | `/orders/$orderId` | só o dono |
| Login, Cadastro | `/login`, `/register` com `redirect` | visitante |
| Perfil, Carteiras | `/account/profile`, `/account/wallets` | privado |
| Fora de escopo | `/unavailable` com `from` | público |
| Não encontrado | qualquer rota não prevista (`notFoundComponent`) | público |

## Requisitos funcionais

| ID | Requisito | Verificação |
|---|---|---|
| **Fidelidade visual** | | |
| VIS-1 | Cores e tipografia do tema (`@theme`) idênticas às variáveis do protótipo, salvo exceção registrada (VIS-4) | roteiro (tokens lidos pelo Figma MCP) |
| VIS-2 | Tipografia, espaçamento, hierarquia, proporção de imagem e composição de cada tela conferidos contra o protótipo em 390 e 1440 | roteiro |
| VIS-3 | Componentes shadcn/ui adaptados à identidade: nenhuma cor, fonte ou raio fora dos tokens | lint (valor arbitrário de cor proibido) |
| VIS-4 | Substituição de asset, ajuste de acessibilidade e estado sem representação visual registrados com motivo na ARCHITECTURE | checklist de entrega |
| **Navegação** | | |
| NAV-1 | Acesso direto e refresh em qualquer rota prevista; rota inexistente com tela de não encontrado | `catalog`, smoke de publicação |
| NAV-2 | Rotas privadas sem sessão redirecionam ao login e voltam ao destino | `auth` |
| NAV-3 | Links fora de escopo levam a `/unavailable`, sem aparentar sucesso | roteiro |
| **Catálogo** | | |
| CAT-1 | Destaques, busca, filtros combináveis, ordenação e paginação | `catalog` |
| CAT-2 | Estado na URL: sobrevive a refresh, voltar e avançar; mudança de filtro volta à página 1 | `catalog` |
| CAT-3 | Requisição reflete os parâmetros; vazio, erro e resposta fora de ordem tratados | `catalog` (fora de ordem), roteiro (vazio e erro) |
| **Detalhe** | | |
| DET-1 | Acesso direto, NFT inexistente, galeria, seleção de edição | `catalog` |
| DET-2 | Edição indisponível bloqueada com motivo; quantidade limitada a `min(available, maxPerOrder)` | `catalog` |
| DET-3 | Favoritos persistem por usuário; toggle otimista com rollback | roteiro |
| **Carrinho** | | |
| CRT-1 | Adicionar, alterar e remover respeitando disponibilidade por edição | `cart` |
| CRT-2 | Persiste após refresh; itens do visitante preservados no login | `cart` |
| CRT-3 | Cupom: aplicar e remover; inválido, expirado e abaixo do mínimo com mensagens distintas | `cart` |
| CRT-4 | Resumo (subtotal, desconto, taxa, total) vem da cotação da API, com precisão decimal | `cart` |
| CRT-5 | Mudança de preço ou disponibilidade em tempo real é anunciada e atualiza o resumo | `realtime` |
| **Pagamento e pedido** | | |
| PAG-1 | Dados do colecionador validados; carteira cadastrada e rede; conexão e recusa simuladas | `checkout`, `checkout-failures` |
| PAG-2 | Revisão antes do envio; revalidação no servidor; mudança exige nova confirmação | `realtime` |
| PAG-3 | Sem pedido duplicado em clique repetido ou reenvio após timeout | `checkout-failures` |
| PAG-4 | Todos os campos do layout do pagamento renderizados e validados; campo de outro dono somente leitura com link; obrigatório ausente no dono bloqueia a compra com erro no campo | `checkout` |
| PED-1 | Estados pendente, confirmado e recusado (terminais), recuperáveis após refresh ou reconexão | `realtime` |
| PED-2 | Confirmação só para pedido confirmado pela simulação | `checkout` |
| PED-3 | Falha preserva o carrinho; confirmação remove só o comprado | `checkout`, `checkout-failures` |
| PED-4 | Recibo é snapshot imutável (transação, itens, taxas, total) | `checkout` |
| **Conta e sessão** | | |
| AUT-1 | Cadastro com os campos do layout (inclusive confirmação de senha) e conflito, login com retorno ao fluxo anterior, logout | `auth` |
| AUT-2 | Sessão recuperável após refresh; expiração na navegação e no checkout preserva o contexto | `auth` |
| AUT-3 | Logout e troca de usuário limpam cache privado e subscriptions | `auth` |
| AUT-4 | Senha nunca armazenada em claro, nem no cliente nem no mock (hash PBKDF2-SHA256 com salt) | `mockDb.test.ts` |
| AUT-5 | Pedido de outro usuário não é exibido: a API responde 403 e a tela é a mesma de pedido inexistente, sem nenhum dado | `checkout` |
| PER-1 | Perfil com todos os campos do layout (nome de exibição, usuário, e-mail, Nome ENS, avatar, senha), validação e erro da API por campo; persiste após refresh | `account` |
| WAL-1 | Carteiras principal e secundária com todos os campos do layout: cadastro, edição, validação | `account` |
| **Tempo real** | | |
| RT-1 | `nft.updated` atualiza catálogo, detalhe e carrinho; `order.updated` atualiza o pedido | `realtime` |
| RT-2 | Duplicata e evento antigo ignorados, sem regressão nem efeito repetido | `realtime`, `eventStore.test.ts` |
| RT-3 | Reconexão reconcilia por REST; evento de sessão anterior não afeta outro usuário | `realtime` |
| RT-4 | Listeners e subscriptions liberados ao fim do ciclo de vida | `realtime` (`__kurio.realtime.stats()`) |
| **Mocks** | | |
| MOC-1 | Mocks só na camada de rede: nada de dado fictício em componente, hook ou Axios | lint (`no-restricted-imports`) |
| MOC-2 | Estado consistente entre catálogo, favoritos, carrinho, perfil, carteiras e pedidos | `checkout`, `mockDb.test.ts` |
| MOC-3 | Persistência local sustenta refresh; reset restaura integralmente o cenário conhecido | `mocks` |
| MOC-4 | Lentidão, offline e HTTP 4xx/5xx configuráveis e reproduzíveis | roteiro (cenários do README) |
| MOC-5 | Fixtures com variedade para filtros e paginação e pelo menos dois usuários | `mockDb.test.ts` |
| MOC-6 | Cenários determinísticos para cada caso de falha do enunciado ([MOCKS](MOCKS.md)) | specs E2E e roteiro |
| MOC-7 | Socket.IO simulado via MSW exercitando `socket.io-client`; mudança no dado reflete em REST e evento | `realtime` |
| MOC-8 | Mocks ativados por configuração e presentes no build publicado | smoke de publicação |

## Requisitos não funcionais

| ID | Requisito | Verificação |
|---|---|---|
| NF-1 | 390, 768 e 1440 sem overflow horizontal, com zoom de 200%; perfil, carteiras e confirmação também em mobile, mesmo sem frame | roteiro |
| NF-2 | Skeleton com shimmer sem deslocar layout; respeita movimento reduzido | roteiro |
| NF-3 | Teclado, foco visível, foco em diálogos, labels e erros associados, live region, contraste AA | axe em toda spec E2E, roteiro (teclado) |
| NF-4 | Lighthouse na URL pública: Performance ≥ 90, A11y ≥ 95, Best Practices ≥ 95, SEO ≥ 90 | relatório na entrega |
| NF-5 | Valores ETH em string decimal no fio, sem perda de precisão | `eth.test.ts` |
| NF-6 | Roda de checkout limpo, sem serviço privado; deploy público igual ao código | CI, smoke de publicação |
| NF-7 | Testes isolados, com relógio e eventos controlados, relatório HTML e traces das falhas | CI |

## Eliminatórios e a garantia estrutural de cada um

| Eliminatório | Garantia |
|---|---|
| Stack sem uso efetivo | Cada peça tem papel único ([ARCHITECTURE](ARCHITECTURE.md)); lint barra `fetch` e `WebSocket` diretos |
| Fluxo só visual / compra sem simulação | Recibo só renderiza com `confirmed` vindo do servidor |
| Dados entre usuários | Cache escopado por usuário, sem dado pessoal fora do escopo, e socket por sessão ([DECISIONS](DECISIONS.md)); pedido alheio responde 403 e a tela não o distingue de inexistente (AUT-5) |
| Evento direto na UI | Evento só nasce de mutação do banco simulado ([DECISIONS](DECISIONS.md)) |
| Sem E2E executável | `pnpm test:e2e` no CI, a partir de checkout limpo |
