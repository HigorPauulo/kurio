# Decisões

As escolhas que definem o projeto, o porquê, o que foi descartado e o que as reabre. Mudança de
decisão reescreve a linha e a coluna **Desde**; o histórico fica no git. O detalhe de cada uma mora no
documento linkado.

| Tema | Decisão | Porquê | Descartado | Reabre se | Desde |
|---|---|---|---|---|---|
| Idioma | PT-BR em toda a interface, `lang="pt-BR"` | Idioma do público | Inglês, termo comum do mercado NFT | O avaliador exigir | 2026-10-19 |
| Redes | `ethereum`, `polygon`, `base`, com preço e taxa simulados em ETH | Todas EVM, endereço `0x`; a taxa em POL da Polygon é simplificada ([limitações](ARCHITECTURE.md#16-limitações)) | Solana: quebraria a validação de carteira | A moeda de preço mudar | 2026-10-19 |
| Campos do layout | Todo campo do protótipo renderizado e validado, com um dono só ([mapa](API.md#campos-do-layout)) | O enunciado pede "Validar os campos do layout"; um dono evita três cópias divergentes | Especificar só campos com regra de negócio: contraria o enunciado | O avaliador querer campos repetidos editáveis em cada tela | 2026-10-19 |
| Larguras | 390, 768 e 1440; o mobile de 414 do protótipo guia só a composição | A avaliação mede 390 | Largura fixa de 414 | O enunciado medir em 414 | 2026-10-19 |
| Build | SPA com Vite 8 e plugin do TanStack Router (`autoCodeSplitting`) | Sem servidor, o caminho estático mais curto | TanStack Start: SSR que o desafio não pede | Exigência de SSR | 2026-10-19 |
| TypeScript | 6.0.3 travado | `typescript-eslint@8.71` aceita só `<6.1.0` | TS 7 sem lint tipado | `typescript-eslint` suportar TS 7 | 2026-10-19 |
| MSW | 2.15.x travado | `@mswjs/socket.io-binding@0.2.0` declara `msw ^2.10.2` | MSW 3 com binding próprio | O binding suportar MSW 3 | 2026-10-19 |
| Socket.IO simulado | `@mswjs/socket.io-binding` sobre `ws.link`, cliente só WebSocket; aprovado no spike com três contornos ([MOCKS](MOCKS.md#7-socketio-simulado)) | Protocolo real do `socket.io-client`, como o enunciado pede | Servidor Socket.IO real: um serviço a hospedar | Binding novo que implemente ack, recusa e ping | 2026-10-19 |
| Contornos do binding | O mock responde ack com pacote cru `43`, recusa com `44` sem fechar e envia ping `2` a cada 25 s | O binding 0.2.0 não entrega o callback de ack, aceita o CONNECT antes de ler o token e anuncia heartbeat sem enviar ping: sem o ping, a conexão cai a cada 30 s | Binding próprio (cerca de 1 dia) | Binding novo que cubra os três casos | 2026-10-19 |
| Ordem do bootstrap | O app só carrega depois que o MSW sobe | O `socket.io-client` guarda o `WebSocket` ao carregar; em paralelo, ele pega o original e escapa da interceptação | Carga paralela do MSW e do app | O cliente passar a ler o `WebSocket` só ao conectar | 2026-10-19 |
| Backend simulado | Um `MockDb` na página para REST e Socket.IO; toda mutação devolve seus eventos | REST e evento coerentes por construção ([MOCKS](MOCKS.md#3-mockdb)) | `page.route`: só existiria nos testes | Estado compartilhado entre abas | 2026-10-19 |
| Coleta do `MockDb` | Cotação e sessão vencidas saem no próprio commit | Sem coleta, o snapshot estoura 1 MB numa demonstração longa | Limite fixo de linhas | Snapshot acima de 50% do orçamento | 2026-10-19 |
| Fronteira dos mocks | `src/` não importa `mocks/` nem usa `fetch` ou `WebSocket` (lint) | Eliminatório; lint resiste à pressa | Disciplina e revisão | Nunca | 2026-10-19 |
| Contratos | Zod em `src/contracts/` para handlers, cliente e formulários | Um contrato, três consumidores | OpenAPI com geração de tipos | Backend real | 2026-10-19 |
| Transporte HTTP | `lib/http` recebe token e expiração por `configureHttp()` | Evita o ciclo `http` ↔ `session` ([ARCHITECTURE](ARCHITECTURE.md#3-módulos-e-regra-de-dependência)) | Interceptor importando `sessionStore` | Nunca no escopo | 2026-10-19 |
| Valores ETH | String decimal no fio, `bigint` de wei no cálculo; o cliente não soma totais | `number` perde precisão; totais vêm da cotação | `big.js`, `decimal.js` | Divisão com casas decimais na UI | 2026-10-19 |
| Exibição de ETH | Valor exato com vírgula decimal; entrada aceita vírgula ou ponto; ponto no fio e na URL | Preço exibido diferente do cobrado é erro de produto | Arredondar para 4 casas | Valor com mais de 8 casas na tela | 2026-10-19 |
| Sessão | Token opaco com `expiresAt` em `localStorage`, sem refresh | Sem servidor, cookie `httpOnly` não tem efeito | Cookie setado pelo MSW | Backend real | 2026-10-19 |
| Senha | PBKDF2-SHA256, salt por usuário, 600 000 iterações, via WebCrypto | Exigência do enunciado; mínimo da OWASP; nativo | bcrypt em JS | Backend real | 2026-10-19 |
| Isolamento por usuário | Dado de pessoa só sob `['u', owner]`; `session` guarda só a identidade; troca só por `switchIdentity()` | Eliminatório; o prefixo protege mesmo se a limpeza falhar ([ARCHITECTURE](ARCHITECTURE.md#8-sessão)) | `queryClient.clear()`: apaga o catálogo junto | Nunca | 2026-10-19 |
| Expiração | Diálogo, `redirect` e rascunho por usuário; só o mesmo usuário retoma | Retomar sem expor dado a outro usuário | Redirecionar direto ao login | Teste de usabilidade pedir outro fluxo | 2026-10-19 |
| Login e cadastro | Rotas próprias renderizadas como diálogo sobre a rota de origem | O protótipo desenha modal; rota mantém acesso direto e `redirect` | Modal sem rota | O avaliador exigir página cheia | 2026-10-19 |
| Carrinho | Recurso do servidor simulado; visitante por `X-Guest-Cart-Id`; merge no login | Estoque, merge e baixa são regra de servidor | Carrinho só em `localStorage` | Nunca no escopo | 2026-10-19 |
| Pedido | `Idempotency-Key` por tentativa, nunca trocada sem desfecho; cotação de uso único | Cobre duplo clique, timeout e reload; o uso único cobre tentativa perdida ([ARCHITECTURE](ARCHITECTURE.md#92-idempotência)) | Só desabilitar o botão; chave derivada do carrinho | Nunca | 2026-10-19 |
| Eventos | Envelope com `id`, `version` e `audience`; `nft.updated` é snapshot | Aplicar a maior versão é correto em qualquer ordem | Delta com sequência e replay | Evento grande demais para snapshot | 2026-10-19 |
| Reconexão | Reassina e invalida as queries ativas | O REST volta a ser a verdade; simples de testar | Replay de eventos perdidos | Muitas queries ativas | 2026-10-19 |
| Testes instáveis | Sem `retries` no Playwright | `retries` esconde corrida de tempo real, o que o desafio avalia | `retries: 2` no CI | Nunca | 2026-10-19 |
| Escopo de verificação | E2E para fluxos e eliminatórios, unidade para cálculo e eventos, roteiro manual para o resto ([QUALITY](QUALITY.md)) | Entrega em 24 h | Matriz completa, regressão visual em container, orçamento de bundle | Prazo maior | 2026-10-19 |
| Deploy | Vercel estática com mocks no build; SHA em `window.__kurio.build` | Recomendado pelo enunciado; nada a manter | VPS própria com proxy reverso | Backend real | 2026-10-19 |
