# risco/: modelo de risco de glicemia (ML)

Estima a chance de a pessoa estar com a **glicemia alterada sem saber** e diz quando vale **procurar um médico e pedir uma HbA1c**. Usa o perfil do check-up, os exames de sangue já extraídos e, quando a pessoa tem, o relógio. **Não é diagnóstico:** diabetes se confirma com exame, e o modelo só aponta quem deveria fazer esse exame.

## Dados

**NHANES 2011-2014** (CDC, EUA): dados públicos, sem cadastro. São 8.981 adultos **sem diabetes diagnosticado**, cada um com:

- HbA1c, que define o rótulo;
- exames de sangue;
- questionário;
- **uma semana de acelerômetro de pulso** (parecido com um relógio).

Os arquivos ficam em `dados/`, fora do Git.

Dois alvos:

| Alvo | Rótulo | Prevalência |
|---|---|---|
| `alterado` | HbA1c >= 5,7% (pré-diabetes ou diabetes não diagnosticado) | ~31% |
| `diabetes_oculto` | HbA1c >= 6,5% (diabetes que a pessoa não sabe que tem) | ~3,5% |

**Glicose e HbA1c nunca entram como sinal**, porque o rótulo é definido por elas. Seria o vazamento que infla os números.

## Comandos

```bash
python -m venv .venv && .venv/Scripts/python -m pip install -r requirements.txt
.venv/Scripts/python baixar.py         # ~370 MB do CDC para dados/
.venv/Scripts/python montar.py         # dados/base.csv (perfil, exames, relógio por dia)
.venv/Scripts/python relogio_horas.py  # dados/relogio_horas.csv (ritmo e sono a partir do resumo por hora)
.venv/Scripts/python treino.py         # saida/modelo.json, saida/relatorio.md, saida/resultados.csv
```

## Como foi avaliado

- **Treino em 2011-2012, teste em 2013-2014.** São outras pessoas, que o modelo nunca viu.
- **Comparação com o questionário de risco da ADA** (o rastreamento padrão, validado no NHANES).
- **Versões comparadas nas mesmas pessoas**, com bootstrap pareado e intervalo de 95%, para saber se cada fonte de dado ajuda de verdade ou é ruído.
- **Modelo exportado** = regressão logística treinada nos dois ciclos juntos. A calibração foi conferida por validação cruzada: quando o modelo diz 17%, acontece em ~17%.
- **Modelo de árvores** (gradient boosting) testado como referência. Não foi melhor, então ficou a regressão, que é explicável e roda no app em TypeScript.

## Resultados (detalhe em `saida/relatorio.md`)

| Alvo | Versão | AUC (teste) | ADA (mesmas pessoas) |
|---|---|---|---|
| alterado | perfil | 0,770 | 0,745 |
| alterado | perfil + exames | 0,784 | 0,746 |
| alterado | completo | 0,786 | 0,743 |
| diabetes_oculto | perfil | 0,773 | 0,778 |
| diabetes_oculto | perfil + exames | 0,817 | 0,778 |
| diabetes_oculto | perfil + relógio | 0,810 | 0,781 |
| diabetes_oculto | **completo** | **0,833** | 0,780 |

O que cada fonte acrescenta (ΔAUC nas mesmas 3.336 pessoas, IC 95%):

| | alterado | diabetes_oculto |
|---|---|---|
| exames, sobre o perfil | +0,013 (0,006 a 0,020) | +0,029 (-0,005 a 0,060) |
| relógio, sobre o perfil | +0,007 (0,002 a 0,012) | **+0,023 (0,007 a 0,040)** |
| relógio, sobre perfil + exames | +0,005 (0,000 a 0,010) | **+0,019 (0,007 a 0,032)** |

**Leitura:** para pré-diabetes, idade e IMC carregam quase tudo, e o relógio pouco acrescenta. Para **diabetes não diagnosticado**, o relógio acrescenta de forma significativa. Os sinais que pesam são **menos horas de sono, frequência cardíaca de repouso mais alta e horário de dormir irregular**. Nos exames pesam HDL baixo, TGP e GGT altas e TGO baixa em relação à TGP, um padrão de fígado gorduroso.

## Sinais do relógio (`relogio_horas.py`) e como o app calcula

| Sinal | NHANES | No app (Apple Saúde / Health Connect) |
|---|---|---|
| `fc_repouso` | pulso em repouso no exame físico | FC de repouso diária |
| `sono_h`, `sono_extremo_h`, `sono_irregular_h` | minutos de sono por noite (meio-dia a meio-dia) | `sono_horas` por noite: média, distância de 7,5 h, desvio-padrão |
| `meio_sono_h`, `meio_sono_irregular_h` | horário médio do meio do sono e sua variação | início e fim do sono por noite |
| `intensidade_percentil` | movimento por minuto acordado, em percentil da população | passos por hora acordado, em percentil (aproximação: tabela de passos) |
| `amplitude_ritmo`, `estabilidade_ritmo`, `variabilidade_dias` | perfil de movimento por hora | passos por hora |

**O contrato atual do relógio (`wearable/`) só tem resumo diário** (passos, sono, FC de repouso). Por isso o app já calcula `fc_repouso` e os três sinais de sono em horas. Os sinais que dependem de horário (meio do sono, ritmo por hora) entram pela **mediana** enquanto o contrato não traz esses dados.

## `saida/modelo.json` (contrato com o app)

Para cada alvo e versão (`alvos.<alvo>.versoes.<versao>`): `sinais`, `medianas` (para dados faltantes), `limites` (corte nos percentis 1-99), `media`/`desvio` (padronização), `coeficientes`, `intercepto`, `limiar_procurar_medico` (pega 80% de quem tem o alvo), `avaliacao` e `exige` (dados mínimos para usar a versão). O cálculo de cada sinal:

1. preencher o que falta com a mediana;
2. cortar nos limites;
3. aplicar `log1p` se o sinal estiver em `transformacao_log1p`;
4. padronizar com `(x - media) / desvio`.

Depois, risco = 1 / (1 + e^-(intercepto + Σ coef·x)). A contribuição de cada sinal (coef·x) explica o resultado ("o que mais pesou").

## Limites (dizer no pitch)

- **População dos EUA.** Serve como prova de conceito. Para o Brasil, recalibrar com uma coorte brasileira (ex.: ELSA-Brasil, que não é pública).
- **Retrato de um momento**, não acompanhamento: o NHANES não tem a trajetória de exames ao longo dos anos. As regras de tendência do `insights/` cobrem essa parte.
- **Diabetes não diagnosticado são ~110 pessoas no teste**, por isso os intervalos são largos.
- Acelerômetro de pesquisa ≠ relógio comercial. A conversão passos → intensidade é uma aproximação.
