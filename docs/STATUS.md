# Estado do projeto

**Este é o único documento que declara estado.** Voltou de uma pausa? Leia só este.

**Atualizado em 2026-10-19: fatia 1 concluída (fundação, spike e preview na Vercel); entrega em até 24 h.**

## Onde estou

> **Fatia 1 de 9, concluída.** A fundação está pronta: Vite, React e TypeScript strict; MSW com o
> Socket.IO simulado; ESLint com as regras de fronteira; Tailwind v4 e shadcn/ui; Router, Query e
> transporte HTTP com `configureHttp`; Vitest e Playwright; `pnpm verify` como gate; CI verde no
> GitHub Actions. O spike aprovou o binding com três contornos ([DECISIONS](DECISIONS.md)). O preview
> da Vercel foi conferido: rewrite, cabeçalhos de segurança, mocks e heartbeat do socket funcionando.

| | |
|---|---|
| **Repositório** | github.com/HigorPauulo/kurio |
| **`develop` / `main`** | Existem; `main` é a padrão e só recebe publicação |
| **Deploy** | Produção pública em `kurio-beta.vercel.app`, com a fatia 1 e as correções da revisão (`2cb7467`); preview por branch, protegido por login |
| **Protótipo** | Figma do desafio; campos já mapeados em [API](API.md#campos-do-layout) |

## O que fazer agora, nesta ordem

1. **Fatia 2:** contratos e mocks, em `feature/contracts-mocks`.

## O que trava

Nenhuma. O gate **G1** (GitHub e Vercel) foi resolvido.

## Dívida aberta

| Dívida | Sai em |
|---|---|
| Rota `/dev/realtime` (página do spike) vai para produção | Fatia 6, quando a spec `realtime` cobrir o tempo real nas telas reais |

## Os números de hoje

| | |
|---|---|
| Fatias | 1 de 9; a fatia 1 levou cerca de 2 h 20 min contra 2 h estimadas |
| Requisitos | 45 funcionais e 7 não funcionais em [REQUIREMENTS](REQUIREMENTS.md) |
| Verificação | 8 specs E2E, 6 arquivos de unidade e o roteiro manual em [QUALITY](QUALITY.md) |
| Decisões | 31 em [DECISIONS](DECISIONS.md) |

Contados em 2026-10-19. Mudou um documento, atualize esta tabela no mesmo commit.

## Como manter este arquivo honesto

Ao fechar um passo, no mesmo commit: avance **Onde estou**, reescreva **O que fazer agora**, e mexa em
**travas**, **dívida** e **números** só se mudaram. Não conte história aqui: publicação vira linha no
[ROADMAP](ROADMAP.md#publicação), escolha vira [DECISIONS](DECISIONS.md), e o resto fica no git.
