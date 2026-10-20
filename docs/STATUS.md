# Estado do projeto

**Este é o único documento que declara estado.** Voltou de uma pausa? Leia só este.

**Atualizado em 2026-10-19: fatias 1 a 6 concluídas; entrega em até 24 h.**

## Onde estou

> **Fatia 6 de 9, concluída.** Socket por sessão (visitante incluído) no servidor Socket.IO simulado,
> `eventStore` com dedupe, versão, audiência e pedido terminal, subscriptions por contagem de
> referências e ponte com o cache: `nft.updated` atualiza detalhe, catálogo e carrinho, que anuncia a
> mudança. Queda reconecta, reassina e reconcilia pelo REST; token recusado expira a sessão, sem
> reconectar com ele, e o app segue como visitante. A rota `/dev/realtime` e a spec do spike saíram; a spec `realtime` cobre o que elas
> provavam.

| | |
|---|---|
| **Repositório** | github.com/HigorPauulo/kurio |
| **`develop` / `main`** | Existem; `main` é a padrão e só recebe publicação |
| **Deploy** | Produção pública em `kurio-beta.vercel.app`, com as fatias 1 a 5 (`547965c`); preview por branch, protegido por login |
| **Protótipo** | Figma do desafio; campos já mapeados em [API](API.md#campos-do-layout) |

## O que fazer agora, nesta ordem

1. **Fatia 7:** checkout e pedido, em `feature/checkout`. Traz `order.updated` para a tela (a ponte já
   aplica), `price-change-on-review` e `socket-drop`, que completam a spec `realtime`.

## O que trava

Nenhuma. O gate **G1** (GitHub e Vercel) foi resolvido.

## Dívida aberta

| Dívida | Sai em |
|---|---|
| Imagens das NFTs são um placeholder | Fatia 8, com os assets do protótipo |

## Os números de hoje

| | |
|---|---|
| Fatias | 6 de 9; a fatia 6 levou cerca de 2 h contra 1,5 h estimadas |
| Requisitos | 45 funcionais e 7 não funcionais em [REQUIREMENTS](REQUIREMENTS.md) |
| Verificação | 9 specs E2E planejadas (7 escritas; a do spike saiu), 15 arquivos de unidade (150 casos) e o roteiro manual em [QUALITY](QUALITY.md) |
| Decisões | 34 em [DECISIONS](DECISIONS.md) |

Contados em 2026-10-19. Mudou um documento, atualize esta tabela no mesmo commit.

## Como manter este arquivo honesto

Ao fechar um passo, no mesmo commit: avance **Onde estou**, reescreva **O que fazer agora**, e mexa em
**travas**, **dívida** e **números** só se mudaram. Não conte história aqui: publicação vira linha no
[ROADMAP](ROADMAP.md#publicação), escolha vira [DECISIONS](DECISIONS.md), e o resto fica no git.
