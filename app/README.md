# App (Next.js)

Telas do Hub de Saúde. Next.js 16 (App Router, Cache Components), Tailwind 4, Recharts. Mobile-first, pt-BR,
tema claro e escuro.

```bash
cd app
npm install
npm run dev        # http://localhost:3000 (copia os dados antes, sozinho)
npm run build      # o que a Vercel roda
npm run typecheck && npm run lint
```

## De onde vêm os dados

`scripts/copiar-dados.mjs` roda antes de `dev` e `build` e copia para dentro do app (cópias fora do Git):

- `wearable/saida/relogio.json` → `src/dados/relogio.json` (tela do relógio; gere com `cd wearable && npm run gerar`)
- `insights/saida/insights.json` → `src/dados/insights.json` (o que as telas desenham; gere com `cd insights && npm run insights`)
- PDFs dos laudos e carteiras → `public/laudos/`, `public/vacinas/` (cada ponto abre o documento original na página certa)

Leitura e tipos: `src/lib/insights.ts`. Quando o banco entrar, só ele e o script mudam.

## Telas

| Rota | O que mostra |
|---|---|
| `/` | Início: áreas (atenção primeiro, com os motivos), último valor e tendência de cada exame, exames repetidos |
| `/exame/[analito]` | Detalhe: último valor, tendência, gráfico de 10 anos com a faixa de referência **de cada laudo**, pontos fora em destaque, lista de cada resultado com o laudo e a página de origem |
| `/relogio` | Relógio: alertas (motivo, recomendação, o que os exames mostram), cartões, gráficos de 6 meses de FC de repouso (com a base e os avisos de ritmo), variabilidade, sono e passos. Lê `wearable/saida/relogio.json` |

## Vercel

Projeto com **Root Directory = `app`**. O build precisa das pastas `insights/` e `tools/` do repositório
(a Vercel clona o repositório inteiro, então funciona).

## Testado (09/11)

Tipos, lint e build; as 18 páginas de exame; tocar no ponto abre o laudo certo (2016 → Delta, 2026 → Gama);
os 12 PDFs respondem; exame inexistente mostra página em português; celular (375 px) sem rolagem lateral,
temas claro e escuro.
