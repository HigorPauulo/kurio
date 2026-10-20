# Estado do projeto

**Este é o único documento que declara estado.** Voltou de uma pausa? Leia só este.

**Atualizado em 2026-10-20: fatias 1 a 8 concluídas; entrega em até 24 h.**

## Onde estou

> **Fatia 8 de 9, concluída em `feature/visual`.** Tokens do protótipo no `@theme` (paleta padrão do
> Tailwind removida e lint contra cor arbitrária), Roboto Mono self-hosted, as quatro artes do protótipo
> em WebP, cabeçalho, rodapé e barra de abas mobile, e todas as telas compostas como no protótipo em 390
> e 1440, com 768 sem quebra. Skeleton com shimmer que para com movimento reduzido e casco estático do
> cabeçalho no `index.html`. Desvios registrados em [ARCHITECTURE](ARCHITECTURE.md#15-desvios-do-layout).
> A spec `layout` passa em 1440 e 390 (e confere 768 e 1024). A revisão de código corrigiu o `cn`
> descartando os tamanhos de fonte do tema, o contraste do foco e da borda dos campos, o carrinho
> espremido entre 1024 e 1280, o `aria-current` do cabeçalho e estados marcados só por cor.

| | |
|---|---|
| **Repositório** | github.com/HigorPauulo/kurio |
| **`develop` / `main`** | Existem; `main` é a padrão e só recebe publicação |
| **Deploy** | Produção pública em `kurio-beta.vercel.app`, com as fatias 1 a 7 (`70a3074`); preview por branch, protegido por login |
| **Protótipo** | Figma do desafio; campos já mapeados em [API](API.md#campos-do-layout) |

## O que fazer agora, nesta ordem

1. **Fechar a fatia 8:** PR de `feature/visual` para `develop` e publicação na `main`, seguida do smoke.
2. **Fatia 9:** publicação final. Lighthouse na URL pública (com o preload das fontes, que ainda não
   existe), roteiro manual de [QUALITY](QUALITY.md#4-roteiro-manual), inclusive zoom de 200% e teclado,
   e documentação conferida com o código.

## O que trava

Nenhuma. O gate **G1** (GitHub e Vercel) foi resolvido.

## Dívida aberta

| Dívida | Sai em |
|---|---|
| Fontes sem preload (QUALITY §6) | Fatia 9, com a medição do Lighthouse |

## Os números de hoje

| | |
|---|---|
| Fatias | 8 de 9; a fatia 8 levou cerca de 2 h, como estimado |
| Requisitos | 45 funcionais e 7 não funcionais em [REQUIREMENTS](REQUIREMENTS.md) |
| Verificação | 10 specs E2E planejadas, todas escritas (104 casos entre desktop e mobile); 15 arquivos de unidade (157 casos) e o roteiro manual em [QUALITY](QUALITY.md) |
| Decisões | 39 em [DECISIONS](DECISIONS.md) |

Contados em 2026-10-20. Mudou um documento, atualize esta tabela no mesmo commit.

## Como manter este arquivo honesto

Ao fechar um passo, no mesmo commit: avance **Onde estou**, reescreva **O que fazer agora**, e mexa em
**travas**, **dívida** e **números** só se mudaram. Não conte história aqui: publicação vira linha no
[ROADMAP](ROADMAP.md#publicação), escolha vira [DECISIONS](DECISIONS.md), e o resto fica no git.
