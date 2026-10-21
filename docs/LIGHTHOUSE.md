# Auditoria Lighthouse

Relatório da auditoria de performance, acessibilidade, boas práticas e SEO pedida no enunciado: início e
detalhe do NFT, perfis mobile e desktop, três medições por página e perfil, mediana de cada categoria.

## Como reproduzir

```sh
pnpm audit:lighthouse                        # mede https://kurio-beta.vercel.app
pnpm audit:lighthouse http://localhost:4173  # mede outro endereço (por exemplo, o preview do build)
```

O script `scripts/lighthouse-audit.mjs` abre um Chrome novo, sem perfil e sem extensões, para cada
medição, roda o Lighthouse pela API do Node e grava em `lighthouse/reports/` o HTML e o JSON de cada
execução e um `summary.json` com as medianas, as medições individuais e o ambiente.

## Configuração (versionada)

| Arquivo | Conteúdo |
|---|---|
| `lighthouse/mobile.config.mjs` | Perfil mobile padrão do Lighthouse, com os valores escritos por extenso |
| `lighthouse/desktop.config.mjs` | Perfil desktop padrão do Lighthouse (`--preset=desktop`), com os valores por extenso |
| `scripts/lighthouse-audit.mjs` | Páginas, número de medições, cálculo da mediana e coleta do ambiente |
| `package.json` | `lighthouse` 12.8.2 e `chrome-launcher` 1.2.0 fixos, sem faixa de versão |

Condições simuladas (`throttlingMethod: simulate`):

| | Mobile | Desktop |
|---|---|---|
| Latência (RTT) | 150 ms | 40 ms |
| Banda de download | 1,6 Mbps | 10 Mbps |
| CPU | 4x mais lenta | sem desaceleração |
| Tela | 412 × 823, densidade 1,75 | 1350 × 940, densidade 1 |
| User agent | moto g power (2022), Chrome 136 | Mac, Chrome 136 |

## Alvo e ambiente da medição

| | |
|---|---|
| URL | `https://kurio-beta.vercel.app` (build otimizado de produção na Vercel) |
| Build | `92ce50c` (`window.__kurio.build`) |
| Cenário dos mocks | `default` (latência de 120 a 450 ms), o padrão da produção, sem parâmetro na URL |
| Páginas | início (`/`) e detalhe do NFT (`/nft/nft_001`) |
| Data | 2026-10-21, entre 02:57 e 02:59 UTC |
| Lighthouse | 12.8.2 |
| Navegador | Chromium 156 headless (o do Playwright 1.64.1), perfil novo a cada medição |
| Node | 24.18.0 |
| Máquina | Linux 7.2 (Fedora 43), Intel Core i5-13420H com 12 núcleos, 15 GB de RAM; `benchmarkIndex` 2785 |

A auditoria carrega a entrega como ela é: as artes WebP reais, a Roboto Mono, o backend simulado (MSW),
o Socket.IO simulado e a CSP de produção. Nada é desligado ou trocado só para a medição.

## Resultado: mediana de três medições

| Página | Perfil | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|---|
| Início | Mobile | **92** | 100 | 100 | 100 |
| Início | Desktop | **100** | 100 | 100 | 100 |
| Detalhe do NFT | Mobile | **77** ⚠ | 100 | 100 | 100 |
| Detalhe do NFT | Desktop | **100** | 100 | 100 | 100 |
| **Meta** | | **≥ 90** | **≥ 95** | **≥ 95** | **≥ 90** |

Métricas (mediana):

| Página | Perfil | LCP | CLS | TBT | FCP |
|---|---|---|---|---|---|
| Início | Mobile | 2,80 s | 0 | 176 ms | 1,90 s |
| Início | Desktop | 0,57 s | 0 | 0 ms | 0,36 s |
| Detalhe do NFT | Mobile | 3,11 s | 0 | 464 ms | 1,98 s |
| Detalhe do NFT | Desktop | 0,61 s | 0 | 4 ms | 0,37 s |

Medições individuais (Performance; as outras três categorias deram 100 em todas):

| Página | Perfil | 1ª | 2ª | 3ª |
|---|---|---|---|---|
| Início | Mobile | 92 | 88 | 92 |
| Início | Desktop | 100 | 100 | 100 |
| Detalhe do NFT | Mobile | 75 | 77 | 87 |
| Detalhe do NFT | Desktop | 100 | 100 | 100 |

Accessibility, Best Practices e SEO cumprem a meta com 100 nas 12 medições. Performance cumpre no
desktop (100) e na página inicial mobile (92); fica abaixo no detalhe do NFT mobile (77).

## Por que o mobile fica abaixo do desktop

O código é o mesmo; muda o que o Lighthouse simula. No mobile, rede de 1,6 Mbps com 150 ms por ida e
volta e CPU 4 vezes mais lenta; no desktop, rede rápida e CPU sem desaceleração.

O Kurio é uma SPA renderizada no navegador, e o backend também roda no navegador (MSW). Antes do
conteúdo aparecer, a página percorre uma cadeia em série: HTML, `index.js` (74 KB), o MSW (109 KB),
registro do service worker, os chunks do app, a resposta da API simulada e as imagens. No desktop a
cadeia inteira cabe em cerca de 0,6 s; no mobile passa de 2,5 s, e toda a execução de JavaScript custa
4 vezes mais.

Por isso as perdas se concentram em duas métricas, que juntas pesam 55% da nota:

- **LCP** (25%): o maior conteúdo da tela (a primeira arte da grade no início, a imagem principal da
  galeria no detalhe) só aparece no fim da cadeia.
- **TBT** (30%): é o tempo em que a CPU fica presa executando o MSW, o React e o cliente de tempo real.
  No desktop essas tarefas ficam abaixo de 50 ms e não contam; no mobile, multiplicadas por 4, contam.

CLS é 0 em todas as medições: os esqueletos reservam a altura final, e o casco estático do `index.html`
ocupa o lugar do cabeçalho.

## Causas do detalhe do NFT mobile (77)

Comparado com o início mobile, o detalhe tem TBT 2,6 vezes maior (464 ms contra 176 ms), LCP 0,3 s
maior e Speed Index de 3,1 a 4,7 s. Pelo `bootup-time` dos relatórios (tempo de execução já com a CPU
4x mais lenta):

| Script | Início | Detalhe | O que faz a mais no detalhe |
|---|---|---|---|
| MSW (`browser-*.js`) | 678 ms | 1.237 ms | Responde mais chamadas na mesma página: o NFT, as avaliações e a coleção do trilho. Cada resposta é montada na thread principal, porque o servidor simulado vive dentro da página |
| Tempo real (`instance-*.js`, Socket.IO) | 133 ms | 636 ms | Assina o NFT aberto (DET e RT-1 pedem preço e estoque ao vivo) e processa o retorno da assinatura, com uma tarefa longa de 383 ms |
| Rota do detalhe e trilho | não carrega | carrega | Galeria, avaliações, diálogo de zoom e "Mais desta coleção" |

As três somadas explicam o TBT mais alto e o Speed Index mais lento. A variação entre as medições (75,
77, 87) é do próprio TBT: ele depende do tempo de CPU real de cada execução.

## O que levaria o mobile a 90 ou mais

Todas as saídas mudam a arquitetura do bootstrap, não um ajuste fino:

1. **HTML já com o conteúdo** (renderização no servidor, geração estática ou pré-render da primeira dobra):
   a primeira tela sai no primeiro download e o LCP deixa de esperar a cadeia. Um pré-render da home foi
   testado no build local e levou o início mobile de cerca de 80 para 96 a 97, ao custo de um
   `index.html` de 17 KB mantido por um script de captura; ficou de fora da entrega por essa decisão.
2. **Backend fora da página:** com uma API de verdade, o MSW sai do bundle e da thread principal. É o
   cenário de um produto real; aqui o backend simulado no navegador é requisito do desafio.
3. **Tempo real depois da primeira tela:** conectar o socket e assinar o NFT só depois do LCP reduz o
   TBT do detalhe, ao custo de alguns centésimos de segundo sem preço ao vivo na abertura.

Já aplicado nesta entrega: preload da fonte e da arte do hero, prioridade alta nas primeiras artes da
grade, esqueletos que reservam altura (CLS 0), divisão por rota (`autoCodeSplitting`) e Zod sem JIT
para respeitar a CSP sem `unsafe-eval`.

## Relatórios

Os 12 relatórios HTML e 12 JSON desta medição e o `summary.json` ficam em `lighthouse/reports/`, com o
nome `<página>-<perfil>-<medição>.report.html|json`.
