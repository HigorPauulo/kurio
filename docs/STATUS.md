# Estado do projeto

**Este é o único documento que declara estado.** Voltou de uma pausa? Leia só este.

**Atualizado em 2026-10-21: as 9 fatias concluídas e publicadas; projeto entregue.**

## Onde estou

> **Fatia 9 de 9, publicada.** Campos com 16 px no mobile, fade do carrossel, preload da fonte, `meta
> description`, `robots.txt` e `llms.txt`, layout estável durante o carregamento (CLS 0), foco no primeiro
> campo do login, Zod sem JIT para respeitar a CSP sem `unsafe-eval` e arquivo inexistente respondendo
> 404. Auditoria Lighthouse em [LIGHTHOUSE](LIGHTHOUSE.md): Accessibility, Best Practices e SEO em 100 nas
> 12 medições; Performance 100 no desktop, 92 no início mobile e 77 no detalhe mobile, com as causas
> registradas. Roteiro manual de [QUALITY](QUALITY.md#4-roteiro-manual) executado no build.

| | |
|---|---|
| **Repositório** | github.com/HigorPauulo/kurio |
| **`develop` / `main`** | Existem; `main` é a padrão e só recebe publicação |
| **Deploy** | Produção pública em `kurio-beta.vercel.app`, com as 9 fatias; preview por branch, protegido por login |
| **Protótipo** | Figma do desafio; campos já mapeados em [API](API.md#campos-do-layout) |

## O que fazer agora, nesta ordem

Nada pendente. Um passo novo entra pelo [ROADMAP](ROADMAP.md).

## O que trava

Nenhuma. O gate **G1** (GitHub e Vercel) foi resolvido.

## Dívida aberta

Nenhuma.

## Os números de hoje

| | |
|---|---|
| Fatias | 9 de 9 |
| Requisitos | 45 funcionais e 7 não funcionais em [REQUIREMENTS](REQUIREMENTS.md) |
| Verificação | 10 specs E2E planejadas, todas escritas (124 casos entre desktop e mobile); 15 arquivos de unidade (164 casos) e o roteiro manual em [QUALITY](QUALITY.md) |
| Decisões | 43 em [DECISIONS](DECISIONS.md) |

Contados em 2026-10-20. Mudou um documento, atualize esta tabela no mesmo commit.

## Como manter este arquivo honesto

Ao fechar um passo, no mesmo commit: avance **Onde estou**, reescreva **O que fazer agora**, e mexa em
**travas**, **dívida** e **números** só se mudaram. Não conte história aqui: publicação vira linha no
[ROADMAP](ROADMAP.md#publicação), escolha vira [DECISIONS](DECISIONS.md), e o resto fica no git.
