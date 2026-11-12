# risco/figado/: apoio à decisão do médico (esteatose e fibrose hepática)

**A pergunta do médico:** "este paciente precisa de ultrassom, elastografia ou hepatologista?"

O modelo estima a chance de cada achado **na elastografia (FibroScan)** a partir de exames de rotina que o Zelo já extrai: TGO, TGP, GGT, plaquetas, fosfatase alcalina, bilirrubina, lipídios, glicose, HbA1c, ferritina e insulina. Também usa o perfil do check-up: idade, sexo, IMC, diabetes, pressão alta, álcool e fumo.

**Não é diagnóstico.** É informação organizada para o médico decidir, mostrada ao lado das fórmulas que ele já conhece.

## Dados

**NHANES 2017-2023** (CDC, EUA, público): 12.502 adultos com elastografia válida (exame completo), sem hepatite B ou C.

Rótulos:

| Alvo | Critério | Prevalência |
|---|---|---|
| `esteatose` | CAP ≥ 285 dB/m | ~36% |
| `fibrose` (F2 ou mais) | rigidez ≥ 8 kPa | ~11% |
| `fibrose_avancada` (F3 ou mais) | rigidez ≥ 9,7 kPa | ~7% |

Treino em 2017-2020; **teste em 2021-2023**, outras pessoas e outro período.

```bash
../.venv/Scripts/python baixar.py   # ~30 MB para ../dados/figado/
../.venv/Scripts/python montar.py   # ../dados/figado/base.csv
../.venv/Scripts/python treino.py   # ../saida/figado.json e ../saida/figado_relatorio.md
```

## Resultados (teste 2021-2023, mesmas 4.667 pessoas)

**Comparação com as fórmulas usadas hoje** (AUC; ΔAUC com bootstrap pareado e IC 95%):

| Achado | Fórmulas clínicas | Modelo do Zelo | Ganho |
|---|---|---|---|
| Esteatose | HSI 0,813 · FLI 0,852 | **0,855** | +0,042 sobre o HSI; empate com o FLI, mas **sem precisar da cintura** (o FLI precisa) |
| Fibrose F2+ | FIB-4 0,594 · NFS 0,700 · **SAFE 0,733** | **0,793** | +0,199 sobre o FIB-4, +0,093 sobre o NFS, **+0,060 sobre o SAFE** |
| Fibrose avançada F3+ | FIB-4 0,625 · NFS 0,741 · **SAFE 0,773** | **0,832** | +0,207 sobre o FIB-4, +0,091 sobre o NFS, **+0,059 sobre o SAFE** (IC 0,042 a 0,076) |

**O número que interessa ao médico:** para achar 80% dos casos, que fração dos pacientes precisa ser encaminhada para elastografia? A sensibilidade foi igualada em 80% no teste.

| Achado | FIB-4 | NFS | SAFE | Modelo |
|---|---|---|---|---|
| Fibrose F2+ | 72% | 58% | 53% | **44%** |
| Fibrose avançada F3+ | 67% | 51% | 44% | **34%** |

**Leitura honesta:** a maior parte da vantagem sobre o FIB-4 **já é capturada pelo SAFE**, uma fórmula publicada. O modelo acrescenta um ganho real, mas moderado, sobre a melhor fórmula publicada (+0,06 de AUC; 44% → 34% encaminhados). Há também uma vantagem de casa: o modelo foi treinado na mesma pesquisa em que é testado (só muda o período), enquanto o SAFE foi desenvolvido em pacientes de clínica especializada.

Com o corte definido no treino, sem olhar o teste, o modelo encaminha 29% e acha 76% das fibroses avançadas. Nesse cenário, é preciso encaminhar 5 pacientes para achar 1 caso; com o FIB-4, 12.

**Zona cinzenta da esteatose:** com a mesma sensibilidade dos cortes do HSI (< 30 / > 36), os indeterminados caem de 31% para 21%.

**Também testados:**
- **Mesmos 4 números do FIB-4** (idade, TGO, TGP, plaquetas) num modelo treinado: supera o FIB-4 (+0,06), mas não o NFS. O ganho vem de juntar mais exames, e o Zelo já tem esses exames.
- **Árvores (gradient boosting):** não foram melhores que a regressão logística. Ficou a regressão, que é explicável e roda no app.
- **Calibração:** modelo final treinado nos dois ciclos e conferido por validação cruzada; quando diz 30%, acontece em ~30%.

**O que mais pesa:** IMC, TGP, razão TGO/TGP, GGT, idade, diabetes, HDL e plaquetas (em `../saida/figado_relatorio.md`). Para o médico, o painel agrupa os pesos ("enzimas do fígado", "metabólico"), porque TGO, TGP e a razão entre elas são correlacionadas.

## Isto já foi feito antes (e é por isso que confiamos no resultado)

Prever fibrose por elastografia com exames de rotina **não é novidade científica**. Os números do Zelo batem com a literatura, o que indica que o pipeline está certo:

- **LiverRisk score** (Serra-Burriel et al., *The Lancet* 2023): idade, sexo e 6 exames de rotina; AUC 0,83 contra 0,68 do FIB-4 para rigidez ≥ 10 kPa. Validado no NHANES. **A fórmula não é pública** (só a calculadora em liverriskscore.com), por isso não entra aqui.
- **SAFE** (Sripongpun et al., *Hepatology* 2023, Stanford): fórmula publicada. Está **reproduzida aqui** e entra na comparação (tabela acima).
- **Modelos de ML no NHANES com elastografia** (vários, 2024-2026): fibrose avançada com AUC ~0,84 a partir de dados de rotina; o nosso deu 0,832. Esses trabalhos também relatam que o ML não supera a regressão logística quando a comparação é justa, como vimos aqui.

**Por que isso não chega ao consultório**, e onde o Zelo entra:

- O NHANES mede tudo no mesmo dia, para cada pessoa. Na vida real, os exames estão espalhados por laboratórios e datas, e o médico raramente tem os ~20 valores juntos.
- O plano de saúde paga o exame, mas **não recebe o resultado**.
- O laboratório só vê os exames feitos nele.

**Pitch honesto:** "a ciência para encaminhar melhor já existe e está publicada. Ela não chega ao consultório porque os exames estão espalhados. O Zelo junta o histórico com o consentimento do paciente, e então essas ferramentas passam a funcionar. Reproduzimos os resultados publicados para provar isso." **Não dizer** que o Zelo "superou a medicina".

## Limites (dizer no pitch)

- **A elastografia é o padrão do modelo, não a biópsia.** A rigidez fica superestimada em obesidade, inflamação e congestão, e o modelo herda esse viés. Isso ajuda a explicar o peso alto do IMC.
- **População dos EUA.** Recalibrar para o Brasil antes de qualquer uso real.
- **Retrato de um momento.** A trajetória dos exames (TGP subindo, plaquetas caindo ao longo dos anos) é mostrada ao lado, pelas regras do `insights/`, mas não entra no modelo, porque o NHANES não tem histórico.
- **Fora do hackathon, isto é software como dispositivo médico** (ANVISA, RDC 657/2022) e exigiria validação clínica.

## `../saida/figado.json` (contrato com o app)

O formato é igual ao do modelo de glicemia (`../README.md`): para cada alvo e versão, `sinais`, `medianas`, `limites`, `media`, `desvio`, `coeficientes` e `intercepto`.

Diferenças:
- os sinais de `transformacao_log` usam `ln(x)`, não `log1p`;
- `razao_tgo_tgp` = TGO / TGP;
- `cortes_faixas` = [baixo, alto], com a mesma sensibilidade e especificidade do índice clínico;
- `corte_encaminhar` = corte que pega 80% dos casos no treino.

`indices_clinicos` traz cada fórmula publicada (FIB-4, NFS, SAFE, HSI, FLI) com cortes, referência e os dados que o Zelo não extrai (albumina, globulina, cintura), além da nota sobre o LiverRisk. **O painel do médico deve mostrar o modelo ao lado do FIB-4**, que o Zelo sempre consegue calcular, **e do SAFE quando houver globulina**. Nunca o modelo sozinho.
