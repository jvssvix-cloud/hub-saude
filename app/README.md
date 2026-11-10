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

**Exames e vacinas: do banco (Supabase).** `src/lib/dados.ts` (`carregarInsights()`, só servidor) lê `documento` +
`observacao` do Roberto com a chave secreta (`insights/src/banco.ts`, API REST, sem biblioteca) e roda as mesmas
regras de `insights/src/regras.ts` na hora. As telas recebem o resultado; nenhuma fala com o banco direto.

- **Variáveis:** `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`. O `next.config.ts` lê o `.env.local` da
  **raiz** do repositório (o mesmo da extração); na Vercel, vão no painel.
- **Plano B:** sem a chave, ou se o banco falhar, usa `src/dados/insights.json` e avisa no log
  (`[dados] banco indisponível`). A demo não quebra.
- **Cache:** resultado guardado com a etiqueta `historico` (`TAG_HISTORICO`), revalida a cada 1h. Quem gravar no
  banco (envio de exame) chama `updateTag(TAG_HISTORICO)` numa Server Action e a próxima tela já vem com o dado novo.
- **Conferência:** `cd insights && npm run conferir-banco` compara insights do banco com os do JSON (têm que ser iguais).
- O app importa `insights/src` pelo atalho `@insights/*` (`tsconfig.json`), com `turbopack.root` na raiz do repositório.

`scripts/copiar-dados.mjs` roda antes de `dev` e `build` e copia para dentro do app (cópias fora do Git):

- `wearable/saida/relogio.json` → `src/dados/relogio.json` (tela do relógio, ainda por arquivo; gere com `cd wearable && npm run gerar`)
- `insights/saida/insights.json` → `src/dados/insights.json` (plano B acima)
- PDFs dos laudos e carteiras → `public/laudos/`, `public/vacinas/` (cada ponto abre o documento original na página certa)

## Telas

| Rota | O que mostra |
|---|---|
| `/` | Início: áreas (atenção primeiro, com os motivos), último valor e tendência de cada exame, exames repetidos |
| `/exame/[analito]` | Detalhe: último valor, tendência, gráfico de 10 anos com a faixa de referência **de cada laudo**, pontos fora em destaque, lista de cada resultado com o laudo e a página de origem |
| `/relogio` | Relógio: alertas (motivo, recomendação, o que os exames mostram), cartões, gráficos de 6 meses de FC de repouso (com a base e os avisos de ritmo), variabilidade, sono e passos. Lê `wearable/saida/relogio.json` |

## Vercel

Projeto com **Root Directory = `app`**. O build precisa das pastas `insights/` e `tools/` do repositório
(a Vercel clona o repositório inteiro, então funciona). No painel: `NEXT_PUBLIC_SUPABASE_URL` e
`SUPABASE_SERVICE_ROLE_KEY` (sem elas o site sobe com o plano B, o JSON).

## Testado (10/11): leitura do banco

`conferir-banco` igual ao JSON (12 laudos, 188 resultados, 17 doses); build com URL errada cai no plano B com aviso,
build normal lê do banco sem aviso; `/`, `/exame/hba1c`, `/exame/ldl`, `/relogio` respondem com os dados.

## Testado (09/11)

Tipos, lint e build; as 18 páginas de exame; tocar no ponto abre o laudo certo (2016 → Delta, 2026 → Gama);
os 12 PDFs respondem; exame inexistente mostra página em português; celular (375 px) sem rolagem lateral,
temas claro e escuro.
