# Acurácia da extração

Modelo claude-haiku-5-5, esforço `medium`. 16 extrações (12 laudos). Custo das extrações: ~US$ 0.04.

**Valores corretos: 100.0%** (253 de 253). Todos os campos: 99.9%. Exames extras/duplicados: 0. Alertas da normalização: 1.

| Recorte | Exames | Encontrados | valor | unidade | nome | referencia | fora_da_faixa | pagina | Extras |
|---|---|---|---|---|---|---|---|---|---|
| total | 253 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 99.6% | 100.0% | 0 |
| layout A | 54 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 |
| layout A / pdf | 54 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 |
| layout B | 70 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 98.6% | 100.0% | 0 |
| layout B / foto | 18 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 94.4% | 100.0% | 0 |
| layout B / pdf | 52 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 |
| layout C | 69 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 |
| layout C / foto | 17 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 |
| layout C / pdf | 52 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 |
| layout D | 60 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 |
| layout D / foto | 30 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 |
| layout D / pdf | 30 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 |
| modo foto | 65 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 98.5% | 100.0% | 0 |
| modo pdf | 188 | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 100.0% | 0 |

## Erros por resultado (1)

| Laudo | Modo | Layout | Exame | Campo | Esperado | Obtido |
|---|---|---|---|---|---|---|
| 2022-08 | foto | B | hba1c | fora_da_faixa | true | false |
