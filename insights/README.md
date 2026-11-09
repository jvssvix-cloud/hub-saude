# Insights: dados → informação

Regras determinísticas (sem IA, sem custo) que transformam os resultados dos laudos em informação.
"Normal" e "alterado" vêm sempre da **referência impressa no próprio laudo**. Nunca é diagnóstico.

```bash
cd insights
npm install
npm run insights                       # hoje = data atual
npm run insights -- --hoje=2026-11-14  # simular outra data
```

Lê os laudos da persona (`tools/gerador-laudos/saida/gabarito/`, mesmo formato da extração) e grava
`saida/insights.json`, o JSON que o app desenha. Quando o banco existir, só `src/carregar.ts` muda.

| Regra | O que faz | Parâmetro |
|---|---|---|
| 1. Série | Junta os resultados de cada exame por data, cada ponto com laudo + página de origem | — |
| 2. Alterado / persistente | Último resultado fora da referência; persistente se fora em N seguidos | 3 |
| 3. Status por área | Atenção (algum alterado) / Em dia / Sem dados recentes | tabela `AREAS` |
| 4. Tendência | Linha que passa por todos os pontos: "subindo/caindo" só se os pontos a seguem (R² ≥ 0,6) e ela varia ≥ 5%; senão "sem tendência" | 3 resultados, 2 anos, 0,6, 5% |
| 5. Exame repetido | Mesmo exame em laudos diferentes com menos de N dias | 90 dias |
| 6. Próximo exame | Rotina: previsto 12 meses após o último; atrasado após 18 | 12 / 18 meses |
| 7. Resumo do médico | Texto por modelo fixo com as regras acima e a fonte de cada número | — |

Parâmetros em `src/regras.ts` (`PARAMETROS`, `AREAS`, `rotina`).
