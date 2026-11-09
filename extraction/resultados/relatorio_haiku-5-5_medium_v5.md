# Acurácia da extração

Modelo claude-haiku-5-5, esforço `medium`, prompt `v5`. 17 extrações (13 laudos). Custo original das extrações: ~US$ 0.06 (pago uma vez; 17 vieram do cache, sem custo nesta rodada).

**Valores corretos: 100.0%** (267 de 267). Todos os campos: 99.9%. Exames extras/duplicados: 0. Alertas da normalização: 0.

| Recorte | Exames | Encontrados | valor | unidade | nome | referencia | fora_da_faixa | pagina | data | Extras |
|---|---|---|---|---|---|---|---|---|---|---|
| total | 267 | 100.0% | 100.0% | 100.0% | 100.0% | 99.6% | 99.6% | 100.0% | 100.0% | 0 |
| layout A | 54 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 |
| layout A / pdf | 54 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 |
| layout B | 70 | 100.0% | 100.0% | 100.0% | 100.0% | 98.6% | 98.6% | 100.0% | 100.0% | 0 |
| layout B / foto | 18 | 100.0% | 100.0% | 100.0% | 100.0% | 94.4% | 94.4% | 100.0% | 100.0% | 0 |
| layout B / pdf | 52 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 |
| layout C | 69 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 |
| layout C / foto | 17 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 |
| layout C / pdf | 52 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 |
| layout D | 60 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 |
| layout D / foto | 30 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 |
| layout D / pdf | 30 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 |
| layout X | 14 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 |
| layout X / pdf | 14 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 |
| modo foto | 65 | 100.0% | 100.0% | 100.0% | 100.0% | 98.5% | 98.5% | 100.0% | 100.0% | 0 |
| modo pdf | 202 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 |

## Erros por resultado (2)

| Laudo | Modo | Layout | Exame | Campo | Esperado | Obtido |
|---|---|---|---|---|---|---|
| 2022-08 | foto | B | triglicerides | referencia | -..150 | -..- |
| 2022-08 | foto | B | triglicerides | fora_da_faixa | true | false |
