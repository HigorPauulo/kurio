# Estado do projeto

**Este é o único documento que declara estado.** Voltou de uma pausa? Leia só este.

**Atualizado em 2026-10-19: fatias 1 e 2 concluídas; entrega em até 24 h.**

## Onde estou

> **Fatia 2 de 9, concluída.** Sobre a fundação da fatia 1 existem os contratos Zod de todo o domínio,
> o `lib/eth` com aritmética exata, o `MockDb` (commit atômico, versões automáticas, persistência,
> coleta), as fixtures (24 NFTs, Ana, Bruno, Carla, cupons e taxas), os 14 presets de cenário com as
> condições de rede e o `window.__kurio`. Ainda não há handler REST: cada fatia de tela traz os seus.

| | |
|---|---|
| **Repositório** | github.com/HigorPauulo/kurio |
| **`develop` / `main`** | Existem; `main` é a padrão e só recebe publicação |
| **Deploy** | Produção pública em `kurio-beta.vercel.app`, com a fatia 1 e as correções da revisão (`2cb7467`); preview por branch, protegido por login |
| **Protótipo** | Figma do desafio; campos já mapeados em [API](API.md#campos-do-layout) |

## O que fazer agora, nesta ordem

1. **Publicar a fatia 2:** PR de `feature/contracts-mocks` para `develop`, depois `develop` para `main`.
2. **Fatia 3:** sessão e conta, com os primeiros handlers REST.

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
| Fatias | 2 de 9; a fatia 2 levou cerca de 1 h 40 min contra 3 h estimadas |
| Requisitos | 45 funcionais e 7 não funcionais em [REQUIREMENTS](REQUIREMENTS.md) |
| Verificação | 9 specs E2E, 10 arquivos de unidade e o roteiro manual em [QUALITY](QUALITY.md) |
| Decisões | 31 em [DECISIONS](DECISIONS.md) |

Contados em 2026-10-19. Mudou um documento, atualize esta tabela no mesmo commit.

## Como manter este arquivo honesto

Ao fechar um passo, no mesmo commit: avance **Onde estou**, reescreva **O que fazer agora**, e mexa em
**travas**, **dívida** e **números** só se mudaram. Não conte história aqui: publicação vira linha no
[ROADMAP](ROADMAP.md#publicação), escolha vira [DECISIONS](DECISIONS.md), e o resto fica no git.
