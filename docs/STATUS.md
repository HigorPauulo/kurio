# Estado do projeto

**Este é o único documento que declara estado.** Voltou de uma pausa? Leia só este.

**Atualizado em 2026-10-19: fatias 1 a 4 concluídas; entrega em até 24 h.**

## Onde estou

> **Fatia 4 de 9, concluída.** Catálogo com destaques, busca, filtros, ordenação e página na URL
> (refresh, voltar e avançar), resposta fora de ordem descartada; detalhe com galeria, edição na URL,
> edição esgotada ou indisponível bloqueada com motivo e quantidade limitada; favoritos otimistas com
> rollback e anúncio na live region. A spec `catalog` passa em 1440 e 390 com axe sem violação séria.

| | |
|---|---|
| **Repositório** | github.com/HigorPauulo/kurio |
| **`develop` / `main`** | Existem; `main` é a padrão e só recebe publicação |
| **Deploy** | Produção pública em `kurio-beta.vercel.app`, com as fatias 1 a 3 (`6b10280`); preview por branch, protegido por login |
| **Protótipo** | Figma do desafio; campos já mapeados em [API](API.md#campos-do-layout) |

## O que fazer agora, nesta ordem

1. **Fatia 5:** carrinho e cotação, em `feature/cart`. O botão de compra do detalhe nasce aqui, sobre a
   quantidade que a fatia 4 já limita.

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
| Fatias | 4 de 9; a fatia 4 levou cerca de 2 h, dentro do estimado |
| Requisitos | 45 funcionais e 7 não funcionais em [REQUIREMENTS](REQUIREMENTS.md) |
| Verificação | 9 specs E2E planejadas (5 escritas, mais a do spike), 14 arquivos de unidade (127 casos) e o roteiro manual em [QUALITY](QUALITY.md) |
| Decisões | 31 em [DECISIONS](DECISIONS.md) |

Contados em 2026-10-19. Mudou um documento, atualize esta tabela no mesmo commit.

## Como manter este arquivo honesto

Ao fechar um passo, no mesmo commit: avance **Onde estou**, reescreva **O que fazer agora**, e mexa em
**travas**, **dívida** e **números** só se mudaram. Não conte história aqui: publicação vira linha no
[ROADMAP](ROADMAP.md#publicação), escolha vira [DECISIONS](DECISIONS.md), e o resto fica no git.
