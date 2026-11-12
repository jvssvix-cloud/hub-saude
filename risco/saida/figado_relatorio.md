# Fígado: apoio à decisão (esteatose e fibrose)

Gerado por `figado/treino.py` em 2026-11-12. NHANES 2017-2023 com elastografia hepática (CDC/EUA). Treino 2017-2020, teste 2021-2023.

## Esteatose na elastografia (CAP >= 285 dB/m)

Teste: 4667 pessoas, 1625 com o achado (34.8%).

| Método | AUC (IC 95%) |
|---|---|
| Índice HSI (fórmula clínica) | 0.813 (0.801-0.826) |
| Índice FLI (fórmula clínica) | 0.852 (0.840-0.863) |
| Modelo `mesmos_dados_fib4` (regressão logística) | 0.714 (0.697-0.731) |
| Modelo `mesmos_dados_fib4` (árvores, referência) | 0.713 |
| Modelo `perfil_exames` (regressão logística) | 0.855 (0.844-0.866) |
| Modelo `perfil_exames` (árvores, referência) | 0.857 |

| Comparação (mesmas pessoas) | ΔAUC | IC 95% |
|---|---|---|
| `mesmos_dados_fib4` vs HSI | -0.099 | -0.115 a -0.083 |
| `perfil_exames` vs HSI | +0.042 | +0.033 a +0.050 |
| `mesmos_dados_fib4` vs FLI | -0.137 | -0.152 a -0.121 |
| `perfil_exames` vs FLI | +0.003 | -0.003 a +0.009 |

**Zona cinzenta** (cortes clássicos do HSI: < 30 descarta, > 36 confirma; o modelo usa cortes com a mesma sensibilidade e especificidade, definidos no treino):

| Método | Baixo | Indeterminado | Alto | Sens. (não descartar quem tem) | VPN do baixo | VPP do alto |
|---|---|---|---|---|---|---|
| HSI | 13.3% | 31.4% | 55.3% | 98.5% | 96.0% | 53.6% |
| Modelo `mesmos_dados_fib4` | 7.2% | 36.4% | 56.4% | 98.5% | 92.9% | 47.1% |
| Modelo `perfil_exames` | 20.7% | 21.2% | 58.0% | 97.8% | 96.4% | 54.1% |

**Encaminhamento para achar 80% dos casos** (corte definido no treino, medido no teste):

| Método | Encaminhados | Casos achados | VPP | Encaminhar N para achar 1 | Encaminhados com sens. igualada em 80% no teste |
|---|---|---|---|---|---|
| HSI | 47.8% | 78.8% | 57.4% | 1.7 | 49.1% |
| FLI | 47.0% | 82.8% | 60.9% | 1.6 | 44.2% |
| Modelo `mesmos_dados_fib4` | 60.6% | 79.9% | 45.9% | 2.2 | 60.7% |
| Modelo `perfil_exames` | 43.5% | 78.7% | 63.0% | 1.6 | 45.0% |

Pesos do modelo final (padronizados; + aumenta a chance):

- **mesmos_dados_fib4:** TGP +1.22, TGO -0.64, Idade +0.40, Plaquetas +0.17
  - calibração (validação cruzada): [{'previsto': 0.133, 'observado': 0.127, 'n': 2276}, {'previsto': 0.248, 'observado': 0.25, 'n': 2275}, {'previsto': 0.349, 'observado': 0.335, 'n': 2275}, {'previsto': 0.461, 'observado': 0.48, 'n': 2275}, {'previsto': 0.634, 'observado': 0.634, 'n': 2276}]
- **perfil_exames:** IMC +0.95, TGP +0.77, Triglicérides +0.39, Idade +0.35, TGO -0.32, Creatinina -0.31, Insulina +0.30, HbA1c +0.23, Sexo masculino +0.20, Razão TGO/TGP +0.18, Ácido úrico +0.17, HDL -0.14, GGT +0.10, Diabetes +0.06, Plaquetas +0.05, Fosfatase alcalina -0.05, Colesterol total +0.04, Bilirrubina total +0.03, Álcool +0.03, Pressão alta +0.02, Ferritina +0.02, Fuma +0.02, Glicose +0.01
  - calibração (validação cruzada): [{'previsto': 0.041, 'observado': 0.034, 'n': 2276}, {'previsto': 0.138, 'observado': 0.145, 'n': 2275}, {'previsto': 0.296, 'observado': 0.299, 'n': 2275}, {'previsto': 0.528, 'observado': 0.534, 'n': 2275}, {'previsto': 0.821, 'observado': 0.812, 'n': 2276}]

## Fibrose significativa na elastografia (rigidez >= 8 kPa)

Teste: 4667 pessoas, 573 com o achado (12.3%).

| Método | AUC (IC 95%) |
|---|---|
| Índice FIB4 (fórmula clínica) | 0.594 (0.570-0.620) |
| Índice NFS (fórmula clínica) | 0.700 (0.673-0.721) |
| Modelo `mesmos_dados_fib4` (regressão logística) | 0.662 (0.640-0.686) |
| Modelo `mesmos_dados_fib4` (árvores, referência) | 0.628 |
| Modelo `perfil_exames` (regressão logística) | 0.793 (0.773-0.813) |
| Modelo `perfil_exames` (árvores, referência) | 0.778 |

| Comparação (mesmas pessoas) | ΔAUC | IC 95% |
|---|---|---|
| `mesmos_dados_fib4` vs FIB4 | +0.068 | +0.045 a +0.091 |
| `perfil_exames` vs FIB4 | +0.199 | +0.172 a +0.226 |
| `mesmos_dados_fib4` vs NFS | -0.037 | -0.065 a -0.012 |
| `perfil_exames` vs NFS | +0.093 | +0.073 a +0.113 |

**Zona cinzenta** (cortes clássicos do FIB4: < 1.3 descarta, > 2.67 confirma; o modelo usa cortes com a mesma sensibilidade e especificidade, definidos no treino):

| Método | Baixo | Indeterminado | Alto | Sens. (não descartar quem tem) | VPN do baixo | VPP do alto |
|---|---|---|---|---|---|---|
| FIB4 | 67.3% | 29.4% | 3.3% | 44.2% | 89.8% | 29.9% |
| Modelo `mesmos_dados_fib4` | 77.7% | 18.9% | 3.4% | 41.4% | 90.7% | 34.8% |
| Modelo `perfil_exames` | 91.7% | 3.8% | 4.6% | 36.8% | 91.5% | 63.4% |

**Encaminhamento para achar 80% dos casos** (corte definido no treino, medido no teste):

| Método | Encaminhados | Casos achados | VPP | Encaminhar N para achar 1 | Encaminhados com sens. igualada em 80% no teste |
|---|---|---|---|---|---|
| FIB4 | 75.8% | 83.1% | 13.5% | 7.4 | 71.9% |
| NFS | 53.2% | 77.3% | 17.9% | 5.6 | 57.7% |
| Modelo `mesmos_dados_fib4` | 60.8% | 78.4% | 15.8% | 6.3 | 62.5% |
| Modelo `perfil_exames` | 33.2% | 72.1% | 26.6% | 3.8 | 44.3% |

Pesos do modelo final (padronizados; + aumenta a chance):

- **mesmos_dados_fib4:** TGP +0.47, Idade +0.40, TGO +0.12, Plaquetas -0.07
  - calibração (validação cruzada): [{'previsto': 0.037, 'observado': 0.04, 'n': 2276}, {'previsto': 0.066, 'observado': 0.068, 'n': 2275}, {'previsto': 0.094, 'observado': 0.1, 'n': 2275}, {'previsto': 0.129, 'observado': 0.116, 'n': 2275}, {'previsto': 0.214, 'observado': 0.216, 'n': 2276}]
- **perfil_exames:** TGP +0.92, IMC +0.82, Razão TGO/TGP +0.73, GGT +0.36, Idade +0.31, TGO -0.26, Diabetes +0.18, HDL -0.14, Bilirrubina total +0.13, Plaquetas -0.13, Colesterol total -0.13, Sexo masculino +0.10, Glicose +0.08, Pressão alta +0.08, Creatinina -0.06, Insulina +0.05, Triglicérides +0.04, HbA1c +0.03, Fosfatase alcalina +0.03, Ferritina -0.02, Ácido úrico -0.02, Fuma +0.01, Álcool +0.00
  - calibração (validação cruzada): [{'previsto': 0.012, 'observado': 0.02, 'n': 2276}, {'previsto': 0.03, 'observado': 0.031, 'n': 2275}, {'previsto': 0.059, 'observado': 0.055, 'n': 2275}, {'previsto': 0.114, 'observado': 0.113, 'n': 2275}, {'previsto': 0.324, 'observado': 0.322, 'n': 2276}]

## Fibrose avançada na elastografia (rigidez >= 9,7 kPa, F3 ou mais)

Teste: 4667 pessoas, 347 com o achado (7.4%).

| Método | AUC (IC 95%) |
|---|---|
| Índice FIB4 (fórmula clínica) | 0.625 (0.588-0.655) |
| Índice NFS (fórmula clínica) | 0.741 (0.716-0.769) |
| Modelo `mesmos_dados_fib4` (regressão logística) | 0.686 (0.657-0.714) |
| Modelo `mesmos_dados_fib4` (árvores, referência) | 0.654 |
| Modelo `perfil_exames` (regressão logística) | 0.832 (0.808-0.856) |
| Modelo `perfil_exames` (árvores, referência) | 0.813 |

| Comparação (mesmas pessoas) | ΔAUC | IC 95% |
|---|---|---|
| `mesmos_dados_fib4` vs FIB4 | +0.062 | +0.037 a +0.086 |
| `perfil_exames` vs FIB4 | +0.207 | +0.172 a +0.243 |
| `mesmos_dados_fib4` vs NFS | -0.055 | -0.088 a -0.021 |
| `perfil_exames` vs NFS | +0.091 | +0.069 a +0.115 |

**Zona cinzenta** (cortes clássicos do FIB4: < 1.3 descarta, > 2.67 confirma; o modelo usa cortes com a mesma sensibilidade e especificidade, definidos no treino):

| Método | Baixo | Indeterminado | Alto | Sens. (não descartar quem tem) | VPN do baixo | VPP do alto |
|---|---|---|---|---|---|---|
| FIB4 | 67.3% | 29.4% | 3.3% | 48.7% | 94.3% | 24.0% |
| Modelo `mesmos_dados_fib4` | 75.5% | 21.1% | 3.3% | 48.4% | 94.9% | 23.9% |
| Modelo `perfil_exames` | 93.0% | 2.9% | 4.1% | 42.4% | 95.4% | 52.3% |

**Encaminhamento para achar 80% dos casos** (corte definido no treino, medido no teste):

| Método | Encaminhados | Casos achados | VPP | Encaminhar N para achar 1 | Encaminhados com sens. igualada em 80% no teste |
|---|---|---|---|---|---|
| FIB4 | 71.7% | 82.7% | 8.6% | 11.7 | 67.4% |
| NFS | 43.6% | 74.9% | 12.8% | 7.8 | 50.5% |
| Modelo `mesmos_dados_fib4` | 60.3% | 80.4% | 9.9% | 10.1 | 59.3% |
| Modelo `perfil_exames` | 29.3% | 76.1% | 19.3% | 5.2 | 33.8% |

Pesos do modelo final (padronizados; + aumenta a chance):

- **mesmos_dados_fib4:** Idade +0.46, TGP +0.42, TGO +0.20, Plaquetas -0.13
  - calibração (validação cruzada): [{'previsto': 0.018, 'observado': 0.016, 'n': 2276}, {'previsto': 0.034, 'observado': 0.04, 'n': 2275}, {'previsto': 0.052, 'observado': 0.055, 'n': 2275}, {'previsto': 0.075, 'observado': 0.066, 'n': 2275}, {'previsto': 0.139, 'observado': 0.14, 'n': 2276}]
- **perfil_exames:** IMC +0.92, TGP +0.85, Razão TGO/TGP +0.74, GGT +0.44, Idade +0.40, Diabetes +0.24, TGO -0.22, Bilirrubina total +0.21, HDL -0.17, Plaquetas -0.17, Colesterol total -0.14, Sexo masculino +0.10, Pressão alta +0.09, Insulina +0.08, Glicose +0.07, Fuma +0.05, Fosfatase alcalina +0.05, Ácido úrico -0.05, Álcool +0.05, Creatinina -0.02, HbA1c -0.02, Ferritina -0.01, Triglicérides +0.00
  - calibração (validação cruzada): [{'previsto': 0.004, 'observado': 0.007, 'n': 2276}, {'previsto': 0.012, 'observado': 0.011, 'n': 2275}, {'previsto': 0.025, 'observado': 0.028, 'n': 2275}, {'previsto': 0.056, 'observado': 0.052, 'n': 2275}, {'previsto': 0.22, 'observado': 0.219, 'n': 2276}]

