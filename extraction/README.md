# Extração: documento → dados

```
foto/PDF ──► Claude lê (visão) ──► JSON "como impresso" ──► normalização (código) ──► resultado + alertas
```

1. **A IA só lê** (`src/extrair.ts`, `src/prompt.ts`). Devolve sempre o mesmo formato (`src/schema.ts`):
   nome, valor, unidade e referência como impressos, exame canônico, página e confiança.
2. **O código converte e confere** (`src/normalizar.ts`), sem IA: unidade impressa → unidade canônica por tabela
   (ex.: `6,8 mil/mm³` → 6800 /mm³) e alertas (unidade desconhecida, valor implausível, marcação de alterado
   incoerente com a referência, baixa confiança).

O formato de saída é o mesmo do gabarito do gerador (`tools/gerador-laudos/README.md`), então o app pode usar
os JSONs do gabarito como dados de mentira.

## Configurar

```bash
cd extraction
npm install
```

Chave da API: copie `.env.example` (raiz do repositório) para `.env.local` e preencha `ANTHROPIC_API_KEY`.
O `.env.local` é ignorado pelo Git. **Nunca cole a chave em código, commit, issue ou chat.**

## Usar

```bash
# Extrair qualquer laudo (PDF, ou várias fotos do mesmo laudo na ordem das páginas)
npm run extrair -- ../tools/gerador-laudos/saida/laudos/2025-03_gama.pdf
npm run extrair -- foto_p1.jpg foto_p2.jpg --saida=resultado.json

# Medir acurácia contra o gabarito (12 PDFs + fotos de 4 laudos)
npm run acuracia                          # tudo
npm run acuracia -- --modo=pdf --somente=2016-03,2025-03
npm run acuracia -- --esforco=high        # comparar níveis de esforço
npm run acuracia -- --refazer             # ignorar o cache
```

`acuracia` salva cada extração em `resultados/cache/` (só paga uma vez) e escreve `resultados/relatorio.md`:
% de valores corretos (a métrica do pitch), % por campo, por layout e PDF vs foto, e a lista de cada erro.

Custo estimado (Claude Opus 5.5): ~US$ 0,05–0,15 por laudo; rodada completa ~US$ 1–2.

## Como melhorar

Rodar `acuracia` → ler os erros no relatório → ajustar `prompt.ts` (leitura) ou `normalizar.ts` (unidades,
faixas plausíveis) → rodar de novo com `--refazer`. Depois, testar com laudos reais.
