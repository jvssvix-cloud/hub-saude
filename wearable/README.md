# wearable/ — relógio (dados sintéticos + regras de alerta)

Ninguém do time tem relógio, então os dados são **sintéticos** (persona Roberto, 58 anos). O **caminho** é o de um relógio de verdade: a fonte manda o **resumo diário** + **eventos**, o app junta com o que já tinha, roda as regras e mostra os alertas. Trocar o sintético por um Apple Watch real = trocar a fonte, sem mudar regras nem telas.

**Custo de API: zero.** Nada aqui passa pela IA; é só número e regra.

## Comandos
```
npm install
npm run gerar                     # saida/relogio.json: 180 dias (14/05 a 09/11/2026) + alertas
npm run simular -- --inicio=2026-10-25 --intervalo=5   # "relógio" sincronizando 1 dia a cada 5 s
npm test                          # 10 testes (cada regra dispara e não dispara)
npm run typecheck
```
Opções: `--hoje=AAAA-MM-DD`, `--seed=42`, `--sem-exames` (não cruza com `insights/saida/insights.json`).

## Como os dados são tratados
| Dado | O que guardamos | Por quê |
|---|---|---|
| FC de repouso | 1 valor por dia (a Apple já calcula) | média de todos os batimentos mistura exercício |
| Variabilidade cardíaca | média do dia, SDNN em ms (padrão da Apple) | |
| Sono | horas da noite que termina no dia | |
| Passos | soma do dia | |
| Ritmo irregular | **cada evento**, com data e hora | regra conta eventos, não média |

Sincronização (`src/sincronizar.ts`): o mesmo dia pode chegar de novo (o sono chega atrasado) e **substitui** o anterior; evento repetido (mesma data/hora) é guardado **uma vez**. Dias sem dado ficam fora das médias.

## Regras (`src/regras.ts`, limiares em `LIMIARES`)
| Alerta | Regra | Nível |
|---|---|---|
| Ritmo irregular | ≥ 3 avisos em 14 dias → "procure um cardiologista" | atenção |
| FC de repouso subindo | média de 14 dias ≥ 5 bpm acima da linha de base (média de 90 a 180 dias atrás) | atenção |
| Sono curto | média de 14 dias < 6 h | info |
| Atividade caindo | passos de 30 dias ≥ 25% abaixo dos 90 dias anteriores | info |

Com menos de 7 dias com dado na janela, a regra não dispara (não dá para afirmar). Cada alerta traz `motivo` (com os números), `evidencias`, `recomendacao` e "Isto não é diagnóstico."

**Cruzamento com os exames:** se `insights/saida/insights.json` existir, os alertas de ritmo e FC ganham `contexto_exames` (LDL, glicose e HbA1c alterados) e a recomendação "leve os dois ao médico".

## A persona (`src/gerar.ts`)
FC de repouso 62 → 71 bpm (sobe a partir de meados de agosto), variabilidade 44 → 33 ms, sono 7 → ~5,5 h nas últimas 6 semanas, passos ~8.000 → ~5.000 a partir de outubro, ~4% de dias sem dado e **5 avisos de ritmo irregular** (21/10, 26/10, 31/10, 04/11, 08/11, de madrugada). Em 09/11 dispara os 4 alertas; em setembro, nenhum alerta de coração.

**Demo:** `npm run simular -- --inicio=2026-10-25 --intervalo=5` → o alerta de ritmo irregular **nasce ao vivo** na sincronização de 31/10.

## Contrato com o app: `saida/relogio.json`
Tipos em `src/tipos.ts` (`RelogioJson`): `gerado_em`, `ultima_sincronizacao`, `fonte` (`sintetico` | `simulador` | `apple_saude`), `periodo`, `dias[]`, `eventos[]`, `resumo` (cartões da tela) e `alertas[]`.

## Próximos passos
- Rota `app/api/relogio/sync`: recebe um `Lote` (`{dias, eventos}`), usa `mesclar` e `montarRelogio`. O simulador passa a fazer POST nela.
- Fonte real: exportação do Apple Saúde do João (passos e sono reais; fica em `dados-reais/`) e, com relógio, o app Health Auto Export mandando o resumo diário para a rota.
