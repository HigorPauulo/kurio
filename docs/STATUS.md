# Estado do projeto

**Este é o único documento que declara estado.** Voltou de uma pausa? Leia só este.

**Atualizado em 2026-10-19: fatias 1 a 7 concluídas; entrega em até 24 h.**

## Onde estou

> **Fatia 7 de 9, concluída.** Pagamento com os campos do layout (os de outro dono somente leitura com
> link), conexão simulada da carteira, revisão com cotação própria e aceite quando o valor muda, envio
> idempotente com tentativa persistida e pedido com desfecho por evento ou REST. O recibo só aparece
> com `confirmed` do servidor; pedido alheio mostra a tela de inexistente. As specs `checkout`,
> `checkout-failures` e `realtime` passam em 1440 e 390.

| | |
|---|---|
| **Repositório** | github.com/HigorPauulo/kurio |
| **`develop` / `main`** | Existem; `main` é a padrão e só recebe publicação |
| **Deploy** | Produção pública em `kurio-beta.vercel.app`, com as fatias 1 a 7 (`70a3074`); preview por branch, protegido por login |
| **Protótipo** | Figma do desafio; campos já mapeados em [API](API.md#campos-do-layout) |

## O que fazer agora, nesta ordem

1. **Fatia 8:** visual e responsivo, em `feature/visual`. Tokens do Figma, composição em 390 e 1440,
   768 sem quebra, estados de carregamento e as imagens das NFTs.

## O que trava

Nenhuma. O gate **G1** (GitHub e Vercel) foi resolvido.

## Dívida aberta

| Dívida | Sai em |
|---|---|
| Imagens das NFTs são um placeholder | Fatia 8, com os assets do protótipo |

## Os números de hoje

| | |
|---|---|
| Fatias | 7 de 9; a fatia 7 levou cerca de 2 h contra 2,5 h estimadas |
| Requisitos | 45 funcionais e 7 não funcionais em [REQUIREMENTS](REQUIREMENTS.md) |
| Verificação | 9 specs E2E planejadas, todas escritas; 15 arquivos de unidade (156 casos) e o roteiro manual em [QUALITY](QUALITY.md) |
| Decisões | 35 em [DECISIONS](DECISIONS.md) |

Contados em 2026-10-19. Mudou um documento, atualize esta tabela no mesmo commit.

## Como manter este arquivo honesto

Ao fechar um passo, no mesmo commit: avance **Onde estou**, reescreva **O que fazer agora**, e mexa em
**travas**, **dívida** e **números** só se mudaram. Não conte história aqui: publicação vira linha no
[ROADMAP](ROADMAP.md#publicação), escolha vira [DECISIONS](DECISIONS.md), e o resto fica no git.
