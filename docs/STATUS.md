# Estado do projeto

**Este é o único documento que declara estado.** Voltou de uma pausa? Leia só este.

**Atualizado em 2026-10-19: fatias 1 a 5 concluídas; entrega em até 24 h.**

## Onde estou

> **Fatia 5 de 9, concluída.** Carrinho de visitante e de usuário no servidor simulado, com limite por
> edição no detalhe e no carrinho, quantidade otimista, cupons com mensagens distintas e resumo vindo da
> cotação em wei exato. O login une o carrinho do visitante, limita ao disponível e anuncia o ajuste. A
> spec `cart` passa em 1440 e 390 com axe sem violação séria.

| | |
|---|---|
| **Repositório** | github.com/HigorPauulo/kurio |
| **`develop` / `main`** | Existem; `main` é a padrão e só recebe publicação |
| **Deploy** | Produção pública em `kurio-beta.vercel.app`, com as fatias 1 a 5 (`547965c`); preview por branch, protegido por login |
| **Protótipo** | Figma do desafio; campos já mapeados em [API](API.md#campos-do-layout) |

## O que fazer agora, nesta ordem

1. **Fatia 6:** tempo real, em `feature/realtime`. Socket por sessão, `eventStore`, subscriptions e
   reconciliação; o anúncio de mudança no carrinho (CRT-5) e a saída da rota `/dev/realtime`.

## O que trava

Nenhuma. O gate **G1** (GitHub e Vercel) foi resolvido.

## Dívida aberta

| Dívida | Sai em |
|---|---|
| Rota `/dev/realtime` (página do spike) vai para produção | Fatia 6, quando a spec `realtime` cobrir o tempo real nas telas reais |
| Imagens das NFTs são um placeholder | Fatia 8, com os assets do protótipo |

## Os números de hoje

| | |
|---|---|
| Fatias | 5 de 9; a fatia 5 levou cerca de 1,5 h, dentro do estimado |
| Requisitos | 45 funcionais e 7 não funcionais em [REQUIREMENTS](REQUIREMENTS.md) |
| Verificação | 9 specs E2E planejadas (6 escritas, mais a do spike), 14 arquivos de unidade (141 casos) e o roteiro manual em [QUALITY](QUALITY.md) |
| Decisões | 32 em [DECISIONS](DECISIONS.md) |

Contados em 2026-10-19. Mudou um documento, atualize esta tabela no mesmo commit.

## Como manter este arquivo honesto

Ao fechar um passo, no mesmo commit: avance **Onde estou**, reescreva **O que fazer agora**, e mexa em
**travas**, **dívida** e **números** só se mudaram. Não conte história aqui: publicação vira linha no
[ROADMAP](ROADMAP.md#publicação), escolha vira [DECISIONS](DECISIONS.md), e o resto fica no git.
