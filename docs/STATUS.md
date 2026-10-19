# Estado do projeto

**Este é o único documento que declara estado.** Voltou de uma pausa? Leia só este.

**Atualizado em 2026-10-19: fatia 1 em andamento; spike de Socket.IO aprovado; entrega em até 24 h.**

## Onde estou

> **Fatia 1 de 9, em andamento.** Existem o esqueleto (Vite, React, TypeScript strict), o MSW com o
> Socket.IO simulado, o Playwright, o ESLint com as regras de fronteira, o Tailwind v4 e o shadcn/ui. O spike aprovou o binding com três contornos
> ([DECISIONS](DECISIONS.md)), provados por 4 testes E2E em desktop e mobile. Falta o resto da
> fundação: Router, Query, Axios, Vitest, CI e `vercel.json`. Os comandos
> `test:unit` e `verify` do README ainda não existem.

| | |
|---|---|
| **Repositório** | github.com/HigorPauulo/kurio |
| **`develop` / `main`** | Existem; `main` é a padrão e só recebe publicação |
| **Deploy** | Não existe |
| **Protótipo** | Figma do desafio; campos já mapeados em [API](API.md#campos-do-layout) |

## O que fazer agora, nesta ordem

1. **Fatia 1, restante da fundação:** Router, Query, Axios, Vitest, script `verify`, CI e
   `vercel.json`, em `feature/foundation`.
2. **Fechar a fatia 1:** conectar a Vercel, PR para `develop` com CI verde.
3. **Fatia 2:** contratos e mocks.

## O que trava

| Trava | Bloqueia | Dono |
|---|---|---|
| Conta Vercel de destino (**G1**, GitHub resolvido) | Publicação da fatia 9 | Higor |

## Dívida aberta

Nenhuma.

## Os números de hoje

| | |
|---|---|
| Fatias | 0 de 9 (18 h estimadas, 6 h de margem) |
| Requisitos | 45 funcionais e 7 não funcionais em [REQUIREMENTS](REQUIREMENTS.md) |
| Verificação | 7 specs E2E, 3 arquivos de unidade e o roteiro manual em [QUALITY](QUALITY.md) |
| Decisões | 30 em [DECISIONS](DECISIONS.md) |

Contados em 2026-10-19. Mudou um documento, atualize esta tabela no mesmo commit.

## Como manter este arquivo honesto

Ao fechar um passo, no mesmo commit: avance **Onde estou**, reescreva **O que fazer agora**, e mexa em
**travas**, **dívida** e **números** só se mudaram. Não conte história aqui: publicação vira linha no
[ROADMAP](ROADMAP.md#publicação), escolha vira [DECISIONS](DECISIONS.md), e o resto fica no git.
