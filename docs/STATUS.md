# Estado do projeto

**Este é o único documento que declara estado.** Voltou de uma pausa? Leia só este.

**Atualizado em 2026-10-19: especificação fechada e repositório no GitHub; nenhuma linha de código;
entrega em até 24 h.**

## Onde estou

> **Fatia 0 de 9.** A documentação é o contrato que o código vai cumprir. Não existe `package.json`
> nem deploy, então os comandos do README ainda não rodam. A primeira fatia é a fundação com o spike
> de Socket.IO sobre MSW, o maior risco técnico ([ROADMAP](ROADMAP.md#a-fila)).

| | |
|---|---|
| **Repositório** | github.com/HigorPauulo/kurio |
| **`develop` / `main`** | Existem; `main` é a padrão e só recebe publicação |
| **Deploy** | Não existe |
| **Protótipo** | Figma do desafio; campos já mapeados em [API](API.md#campos-do-layout) |

## O que fazer agora, nesta ordem

1. **Fatia 1:** fundação e spike, em `feature/foundation`. Se o binding não funcionar em 2 h, seguir
   com polling ([ROADMAP](ROADMAP.md#riscos)).
2. **Fatia 2:** contratos e mocks.

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
| Decisões | 27 em [DECISIONS](DECISIONS.md) |

Contados em 2026-10-19. Mudou um documento, atualize esta tabela no mesmo commit.

## Como manter este arquivo honesto

Ao fechar um passo, no mesmo commit: avance **Onde estou**, reescreva **O que fazer agora**, e mexa em
**travas**, **dívida** e **números** só se mudaram. Não conte história aqui: publicação vira linha no
[ROADMAP](ROADMAP.md#publicação), escolha vira [DECISIONS](DECISIONS.md), e o resto fica no git.
