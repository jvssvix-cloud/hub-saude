# Modelo de risco de glicemia: resultados

Gerado por `treino.py` em 2026-11-12. NHANES 2011-2014 (CDC/EUA, dados públicos). Avaliação: treino 2011-2012, teste 2013-2014.

## Todas as versões (teste 2013-2014)

| alvo            | versao         |   n_teste |   positivos_teste |   auc | auc_ic95    |   auc_ada |   auc_arvores |   brier |   sensibilidade |   especificidade |
|:----------------|:---------------|----------:|------------------:|------:|:------------|----------:|--------------:|--------:|----------------:|-----------------:|
| alterado        | perfil         |      4603 |              1383 | 0.77  | 0.757-0.784 |     0.745 |         0.755 |  0.1733 |           0.851 |            0.55  |
| alterado        | perfil_exames  |      4548 |              1360 | 0.784 | 0.769-0.797 |     0.746 |         0.771 |  0.1684 |           0.845 |            0.567 |
| alterado        | perfil_relogio |      3376 |              1053 | 0.774 | 0.757-0.790 |     0.742 |         0.753 |  0.175  |           0.858 |            0.551 |
| alterado        | completo       |      3336 |              1034 | 0.786 | 0.772-0.800 |     0.743 |         0.774 |  0.1704 |           0.852 |            0.57  |
| diabetes_oculto | perfil         |      4603 |               145 | 0.773 | 0.737-0.807 |     0.778 |         0.743 |  0.0298 |           0.834 |            0.613 |
| diabetes_oculto | perfil_exames  |      4548 |               143 | 0.817 | 0.785-0.847 |     0.778 |         0.784 |  0.0286 |           0.797 |            0.675 |
| diabetes_oculto | perfil_relogio |      3376 |               113 | 0.81  | 0.777-0.844 |     0.781 |         0.791 |  0.0312 |           0.761 |            0.715 |
| diabetes_oculto | completo       |      3336 |               111 | 0.833 | 0.798-0.866 |     0.78  |         0.816 |  0.0306 |           0.82  |            0.717 |

## Glicemia alterada (HbA1c >= 5,7%): pré-diabetes ou diabetes não diagnosticado

Comparações nas mesmas 3336 pessoas do teste (1034 com o alvo):

| Versão | contra | ΔAUC | IC 95% |
|---|---|---|---|
| perfil | ada | +0.025 | +0.016 a +0.035 |
| perfil_exames | perfil | +0.013 | +0.006 a +0.020 |
| perfil_relogio | perfil | +0.007 | +0.002 a +0.012 |
| completo | perfil_exames | +0.005 | -0.000 a +0.010 |

## Diabetes não diagnosticado (HbA1c >= 6,5%)

Comparações nas mesmas 3336 pessoas do teste (111 com o alvo):

| Versão | contra | ΔAUC | IC 95% |
|---|---|---|---|
| perfil | ada | +0.005 | -0.018 a +0.028 |
| perfil_exames | perfil | +0.029 | -0.005 a +0.060 |
| perfil_relogio | perfil | +0.023 | +0.007 a +0.040 |
| completo | perfil_exames | +0.019 | +0.007 a +0.032 |

## Pesos do modelo final: alterado (padronizados; + aumenta o risco)

- **perfil:** Idade +0.90, IMC +0.51, Diabetes na família +0.17, Fuma +0.12, Sexo masculino +0.07, Atividade física (h/semana) +0.03, Pressão alta +0.03
- **perfil_exames:** Idade +0.95, IMC +0.38, HDL -0.31, Colesterol total +0.19, GGT +0.16, Diabetes na família +0.15, TGP +0.10, Fuma +0.09, Sexo masculino -0.08, Ácido úrico +0.07, TGO -0.06, Atividade física (h/semana) +0.06, Triglicérides -0.05, Creatinina -0.02, Pressão alta +0.02
- **perfil_relogio:** Idade +0.99, IMC +0.49, Horas de sono -0.23, Diabetes na família +0.15, Fuma +0.12, Contraste dia/noite -0.11, Irregularidade do sono +0.10, Regularidade da rotina +0.09, Movimento enquanto acordado +0.08, Sexo masculino +0.08, Frequência cardíaca de repouso +0.06, Sono fora de 7-8 h +0.06, Pressão alta +0.04, Variação do horário de dormir -0.04, Variação do movimento entre dias +0.04, Atividade física (h/semana) +0.03, Horário do meio do sono +0.02
- **completo:** Idade +1.04, IMC +0.37, HDL -0.32, Horas de sono -0.23, Colesterol total +0.19, GGT +0.17, Diabetes na família +0.14, TGP +0.13, Contraste dia/noite -0.11, TGO -0.11, Irregularidade do sono +0.10, Sexo masculino -0.09, Movimento enquanto acordado +0.09, Fuma +0.09, Regularidade da rotina +0.07, Sono fora de 7-8 h +0.05, Ácido úrico +0.05, Variação do horário de dormir -0.05, Atividade física (h/semana) +0.05, Pressão alta +0.04, Creatinina +0.03, Triglicérides -0.02, Frequência cardíaca de repouso +0.02, Variação do movimento entre dias +0.02, Horário do meio do sono +0.01

Calibração (validação cruzada, versão completo): [{'previsto': 0.062, 'observado': 0.05, 'n': 1302}, {'previsto': 0.167, 'observado': 0.172, 'n': 1301}, {'previsto': 0.3, 'observado': 0.324, 'n': 1301}, {'previsto': 0.455, 'observado': 0.465, 'n': 1301}, {'previsto': 0.65, 'observado': 0.623, 'n': 1301}]

## Pesos do modelo final: diabetes_oculto (padronizados; + aumenta o risco)

- **perfil:** Idade +0.68, IMC +0.60, Diabetes na família +0.37, Sexo masculino +0.23, Atividade física (h/semana) -0.09, Pressão alta +0.04, Fuma -0.01
- **perfil_exames:** Idade +0.94, IMC +0.53, HDL -0.40, TGP +0.39, GGT +0.37, Diabetes na família +0.34, TGO -0.29, Triglicérides +0.25, Creatinina -0.18, Ácido úrico -0.13, Sexo masculino +0.11, Fuma -0.08, Atividade física (h/semana) -0.05, Pressão alta +0.04, Colesterol total -0.00
- **perfil_relogio:** Idade +0.85, IMC +0.57, Diabetes na família +0.38, Horas de sono -0.32, Sexo masculino +0.25, Frequência cardíaca de repouso +0.23, Variação do horário de dormir +0.22, Variação do movimento entre dias -0.14, Atividade física (h/semana) -0.12, Sono fora de 7-8 h -0.09, Pressão alta +0.08, Irregularidade do sono +0.07, Movimento enquanto acordado -0.06, Fuma -0.05, Horário do meio do sono +0.02, Contraste dia/noite -0.02, Regularidade da rotina -0.01
- **completo:** Idade +1.14, IMC +0.52, TGP +0.52, TGO -0.46, HDL -0.44, Diabetes na família +0.36, GGT +0.34, Horas de sono -0.32, Variação do horário de dormir +0.22, Triglicérides +0.20, Creatinina -0.16, Ácido úrico -0.14, Frequência cardíaca de repouso +0.14, Variação do movimento entre dias -0.14, Fuma -0.11, Sexo masculino +0.10, Atividade física (h/semana) -0.08, Movimento enquanto acordado -0.08, Pressão alta +0.08, Sono fora de 7-8 h -0.07, Irregularidade do sono +0.06, Contraste dia/noite -0.04, Regularidade da rotina -0.03, Colesterol total +0.01, Horário do meio do sono +0.00

Calibração (validação cruzada, versão completo): [{'previsto': 0.001, 'observado': 0.001, 'n': 1302}, {'previsto': 0.005, 'observado': 0.003, 'n': 1301}, {'previsto': 0.014, 'observado': 0.015, 'n': 1301}, {'previsto': 0.034, 'observado': 0.046, 'n': 1301}, {'previsto': 0.126, 'observado': 0.116, 'n': 1301}]
