# Estado do projeto

**Este é o único documento que declara estado.** Voltou de uma pausa? Leia só este.

**Atualizado em 2026-10-19: fatias 1 a 3 concluídas; entrega em até 24 h.**

## Onde estou

> **Fatia 3 de 9, concluída.** Login e cadastro em diálogo, sessão persistida com expiração no meio do
> fluxo, `switchIdentity` sem resíduo entre usuários, perfil (dados, avatar, senha) e as duas carteiras
> com os campos do layout, sobre os primeiros handlers REST. As specs `auth` e `account` passam com axe
> sem violação séria.

| | |
|---|---|
| **Repositório** | github.com/HigorPauulo/kurio |
| **`develop` / `main`** | Existem; `main` é a padrão e só recebe publicação |
| **Deploy** | Produção pública em `kurio-beta.vercel.app`, com as fatias 1 e 2 (`7237d0c`); a fatia 3 entra com o merge em `main`; preview por branch, protegido por login |
| **Protótipo** | Figma do desafio; campos já mapeados em [API](API.md#campos-do-layout) |

## O que fazer agora, nesta ordem

1. **Publicar a fatia 3:** PR para `develop`, CI, PR para `main`, smoke em produção.
2. **Fatia 4:** catálogo e detalhe, em `feature/catalog`.

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
| Fatias | 3 de 9; a fatia 3 levou cerca de 3 h contra 2,5 h estimadas |
| Requisitos | 45 funcionais e 7 não funcionais em [REQUIREMENTS](REQUIREMENTS.md) |
| Verificação | 9 specs E2E planejadas (4 escritas, mais a do spike), 12 arquivos de unidade (108 casos) e o roteiro manual em [QUALITY](QUALITY.md) |
| Decisões | 31 em [DECISIONS](DECISIONS.md) |

Contados em 2026-10-19. Mudou um documento, atualize esta tabela no mesmo commit.

## Como manter este arquivo honesto

Ao fechar um passo, no mesmo commit: avance **Onde estou**, reescreva **O que fazer agora**, e mexa em
**travas**, **dívida** e **números** só se mudaram. Não conte história aqui: publicação vira linha no
[ROADMAP](ROADMAP.md#publicação), escolha vira [DECISIONS](DECISIONS.md), e o resto fica no git.
