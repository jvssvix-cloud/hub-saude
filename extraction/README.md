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
npm run extrair -- laudo.pdf --sexo=M --nascimento=2006-02-10   # dados do cadastro (referência por sexo/idade)

# Medir acurácia contra o gabarito (12 PDFs + fotos de 4 laudos)
npm run acuracia                          # tudo
npm run acuracia -- --modo=pdf --somente=2016-03,2025-03
npm run acuracia -- --modelo=claude-opus-5-5   # comparar com outro modelo
npm run acuracia -- --esforco=high        # comparar níveis de esforço
npm run acuracia -- --refazer             # ignorar o cache
npm run acuracia -- --conjunto=reais      # laudos REAIS com gabarito manual (dados-reais/, fora do Git)
npm run acuracia -- --versao=v1           # reavaliar leituras de um prompt antigo (só cache, grátis)
```

`acuracia` salva cada extração em `resultados/cache/` (só paga uma vez) e escreve `resultados/relatorio_<modelo>_<esforço>.md`:
% de valores corretos (a métrica do pitch), % por campo, por layout e PDF vs foto, e a lista de cada erro.

## Modelo e custo

Padrão: **Claude Haiku 5.5**. Resultado nos 12 laudos + fotos de 4 laudos (253 resultados):

| Modelo | Valores corretos | Todos os campos | Custo por laudo | Rodada completa |
|---|---|---|---|---|
| Haiku 5.5 (padrão) | 100% | 99,9% | ~US$ 0,003 | ~US$ 0,04 |
| Opus 5.5 | 100% | 100% | ~US$ 0,084 | ~US$ 1,35 |

Regras de gasto: testes completos só quando o prompt mudar; no dia a dia, 1–2 laudos (`--somente=`).
Nunca use `--refazer` sem necessidade.

## Laudos reais

Ficam em `dados-reais/` na raiz (ignorada pelo Git: **nunca vão para o GitHub**):
`laudos/` (PDF/fotos), `gabarito/` (gabarito manual, mesmo formato do sintético + `documento.paciente`
com sexo e nascimento) e `resultados/` (cache e relatórios). 1º laudo real (09/11): 20/20 valores corretos.

## Como melhorar

Rodar `acuracia` → ler os erros no relatório → ajustar `prompt.ts` (leitura) ou `normalizar.ts` (unidades,
faixas plausíveis) → rodar de novo com `--refazer`. Depois, testar com laudos reais.
