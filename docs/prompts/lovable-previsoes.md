# Prompt para o Lovable: área "Previsões" no painel do médico

Projeto Lovable: "Zelo Risco Clínico" (`c87f3dc5-054b-4f77-92ec-2e347e16a513`). Gerado em 13/11.

Fontes dos números:
- trajetória: `insights/src/trajetoria.ts`, rodado sobre `insights/saida/insights.json`;
- fígado: `risco/saida/figado.json` e `figado_relatorio.md`;
- glicemia: `risco/saida/modelo.json`.

Colar tudo abaixo da linha no chat do Lovable (de preferência em modo de plano primeiro, depois "pode fazer").

---

Crie no painel do médico uma ÁREA PRÓPRIA chamada **"Previsões"**, com páginas elaboradas, completas e interativas. Ela fica no menu do painel, logo depois de "Resumo". Regras que valem para tudo:

- **Apoio à decisão, nunca diagnóstico.** Toda previsão aparece com a incerteza, a fonte e o rodapé "Apoio à decisão do médico. Não é diagnóstico.".
- **Nenhum número inventado.** Use só os dados de `src/data/paciente.json` e os números desta mensagem.
- Mantenha o estilo visual atual (off-white, bege, sálvia), com cuidado de produto: gráficos limpos, animações sutis e tooltips explicativos.
- Escreva testes (vitest) para toda a lógica nova e rode no fim.

## 1. /previsoes (visão geral)

**a) "Linha do tempo projetada": a peça central.**
- Uma faixa horizontal de hoje (09/11/2026) até 2032, com marcos do que deve acontecer **se o ritmo atual continuar**:
  - HDL abaixo de 40 por volta de jan/2028;
  - HbA1c ≥ 6,5% (critério de diabetes) por volta de jan/2029;
  - LDL ≥ 190 por volta de mar/2031;
  - glicemia de jejum ≥ 126 (critério de diabetes) por volta de jun/2031.
- Cada marco tem uma barra translúcida com a janela provável (ver seção 2) e abre a trajetória daquele exame ao clicar.
- Título: "Se nada mudar". Subtítulo: "Projeção a partir do próprio histórico do paciente (12 exames em 10 anos, 4 laboratórios)".

**b) Cards ao lado:**
- **Fígado:** gordura 59%, acima do corte de encaminhamento; fibrose 6% e avançada 2%, abaixo; FIB-4 1,11. Link para /previsoes/figado.
- **Exames previsíveis:** TSH, hemácias, hemoglobina, hematócrito, leucócitos, plaquetas. Texto: "Estáveis em 10 anos; o próximo resultado deve vir dentro da referência. Repetir agora agrega pouco: o médico decide."
- **O que falta:** "GGT nunca foi feita: é o exame que mais refinaria a estimativa do fígado."

## 2. /previsoes/trajetorias

### Lógica (em `src/lib/trajetoria.ts`, com testes)

Para cada série de `paciente.json`:

1. Usar os pontos [data, valor]. São necessários ao menos 4 pontos cobrindo 2 anos ou mais; senão, a série fica "sem dados suficientes".
2. Tempo em anos: t = (data em ms) / (365,25 × 24 × 3600 × 1000).
3. Ajustar a regressão linear do valor em t: inclinação b, intercepto a, n pontos, média t̄, Sxx = Σ(t − t̄)², s² = SSE / (n − 2) e erro-padrão de b: seB = √(s² / Sxx).
4. Previsão em t₀: ŷ = a + b·t₀, com intervalo de 80%: ŷ ± q · s · √(1 + 1/n + (t₀ − t̄)²/Sxx). O quantil é q = z + (z³ + z)/(4·df) + (5z⁵ + 16z³ + 3z)/(96·df²), com z = 1,2816 e df = n − 2.
5. **Tendência clara** = |b| > 2·seB **e** |b| × (anos observados) ≥ 8% da média dos valores.
6. **Limites a testar:**
   - se b ≥ 0, o limite superior da referência do último ponto; se b < 0, o inferior;
   - mais os limites clínicos: HbA1c 5,7 (pré-diabetes) e 6,5 (diabetes); glicose 100 (jejum alterada) e 126 (diabetes); LDL 190 (muito alto); triglicérides 500.
7. Para cada limite:
   - "já passou", se o último valor já está do outro lado;
   - senão, com tendência clara, varrer mês a mês do último exame até 15 anos depois. **cedo** = primeiro mês em que a borda pessimista da faixa cruza o limite; **central** = quando a linha cruza; **tarde** = quando a borda otimista cruza.
8. **Previsível e normal** = tendência NÃO clara e a faixa de 80% em 12 meses inteira dentro da referência.

### Resultados esperados para o Roberto (teste com tolerância de ±1 mês nas datas e ±1% nos valores)

- **HbA1c:** sobe 0,095/ano; em 12 meses (12/03/2027), de 6,25 a 6,40; cruza 6,5 em 2029-01 (janela 2028-03 a 2030-01); já passou de 5,7.
- **Glicose:** sobe 2,50/ano; em 12 meses, de 114,1 a 116,9; cruza 126 em 2031-06 (janela 2030-10 a 2032-02); já passou de 99 e de 100.
- **HDL:** cai 0,667/ano; em 12 meses, de 39,6 a 41,4; cruza 40 em 2028-01 (janela 2026-08 a 2029-07).
- **LDL:** sobe 5,18/ano; em 12 meses, de 167,8 a 170,8; cruza 190 em 2031-03 (janela 2030-11 a 2031-08); já passou de 130.
- **Colesterol total:** sobe 4,91/ano; já acima de 190; em 12 meses, de 242 a 247.
- **Triglicérides:** sobe 5,75/ano; já acima de 150; em 12 meses, de 186 a 198.
- **TGP:** sobe 0,60/ano; cruza 41 em 2038-02.
- **Previsíveis e normais:** TSH (1,88 a 2,51), hemácias, hemoglobina, hematócrito, leucócitos e plaquetas (210 mil a 242 mil).
- **Teste retroativo** (tirar o último exame de cada série com 5 ou mais pontos, prever com o resto e conferir se o real cai na faixa): **12 de 17 dentro da faixa de 80%**.

### Tela

- **Seletor do exame**, com os que têm tendência clara primeiro.
- **Gráfico grande:**
  - pontos reais (clicáveis, abrem o laudo);
  - linha ajustada;
  - faixa de 80% projetada para o futuro, em área translúcida;
  - linhas horizontais da referência e dos limites clínicos, com rótulo;
  - marcador "cruza aqui" na data central, com a janela sombreada no eixo do tempo;
  - linha vertical "hoje".
- **Frase-resumo** acima do gráfico. Exemplo: "Sobe 0,1% por ano (7 exames, 6 anos). Nesse ritmo, passa de 6,5% (critério de diabetes) por volta de jan/2029; janela provável mar/2028 a jan/2030." Se a janela começar antes de hoje, escreva "a partir de agora".
- **Cenário "e se o ritmo mudar"** (interativo):
  - slider de −100% a +50% no ritmo a partir de hoje (0% = ritmo atual), com atalhos "ritmo pela metade" e "estabilizar";
  - redesenha a projeção (a nova linha parte do valor previsto para hoje e a faixa mantém a largura) e recalcula a data de cruzamento ao vivo;
  - aviso fixo: "Cenário hipotético para conversar com o paciente. Não é o efeito previsto de um tratamento."
- **Tabela de todos os exames:** ritmo por ano, faixa provável em 12 meses, "cruza em", "previsível e normal" e nº de exames.
- **Caixa "Como ler"**, recolhível:
  - o método (regressão no tempo, faixa de 80%);
  - o teste retroativo (12 de 17, abaixo dos 80% esperados porque estes dados sintéticos oscilam pouco; com dados reais a faixa tende a ser mais larga);
  - limites: laboratórios diferentes, tendência linear, poucos pontos alargam a faixa.

## 3. /previsoes/figado (evolução da tela /risco atual; mantenha /risco redirecionando para cá)

Mantenha tudo o que a /risco já faz: FIB-4 com régua, SAFE "não calculado", modelo completo com corte de encaminhamento, conduta, simulador de 4 controles, "o que mais pesou", fonte e limites. Acrescente:

**a) "Simule o exame que falta"** (interativo e mais importante). Um quinto controle no simulador, **GGT**:
- começa em "não medido (entra a mediana da população, 21 U/L)";
- ao mexer, a GGT passa a valer o valor do slider (7 a 195 U/L);
- as três chances recalculam ao vivo e mostram a variação ("fibrose avançada 2% → 5%");
- frase fixa: "É por isso que pedir a GGT refina a estimativa: veja quanto ela pode mudar o resultado."

**b) Gráfico "o que mais pesou" em barras divergentes** (para a esquerda diminui a chance, para a direita aumenta), com a contribuição real de cada sinal no modelo (coef × valor padronizado). Agrupe TGO, TGP e razão TGO/TGP como "Enzimas do fígado". Não mostre creatinina. Sinais estimados pela mediana aparecem em cinza, com a etiqueta "estimado".

**c) "Comparado com o que o médico usa hoje"** (teste NHANES 2021-2023, mesmas 4.667 pessoas). Barras horizontais de AUC, com a do modelo destacada:

| Achado | Valores |
|---|---|
| Fibrose avançada | FIB-4 0,625 · NFS 0,741 · SAFE 0,773 · Zelo 0,832 |
| Fibrose F2+ | FIB-4 0,594 · NFS 0,700 · SAFE 0,733 · Zelo 0,793 |
| Gordura | HSI 0,813 · FLI 0,852 · Zelo 0,855 |

**d) "A cada 100 pacientes, quantos encaminhar para achar 80% das fibroses avançadas":**
- quatro grades de 100 bonequinhos (ícones), uma por método, com os encaminhados pintados: **FIB-4 67, NFS 51, SAFE 44, Zelo 34**;
- legenda: "mesma sensibilidade (80%); menos exames de imagem desnecessários";
- para fibrose F2+: FIB-4 72, NFS 58, SAFE 53, Zelo 44.

## 4. /previsoes/modelos (como validamos)

Um card por modelo, com: o que prevê, dados, treino e teste, resultado, limites.

- **Trajetória pessoal:** usa o histórico do próprio paciente (nenhum modelo populacional tem isto); regressão no tempo com faixa de 80%; teste retroativo 12 de 17.
- **Fígado:**
  - dados: NHANES 2017-2023 (CDC/EUA), 12.502 adultos, rótulo pela elastografia (CAP ≥ 285; rigidez ≥ 8 e ≥ 9,7 kPa);
  - treino em 2017-2020, teste em 2021-2023;
  - números da seção 3;
  - calibração por validação cruzada: quando diz 30%, acontece em ~30%;
  - limites: elastografia não é biópsia (a rigidez fica superestimada na obesidade); população dos EUA;
  - "Isto já foi publicado: LiverRisk (The Lancet 2023) e SAFE (Hepatology 2023) chegam a resultados parecidos. A ciência existe; ela não chega ao consultório porque os exames estão espalhados. O Zelo junta o histórico."
- **Glicemia:**
  - dados: NHANES 2011-2014, 8.981 adultos sem diabetes diagnosticado, com acelerômetro de pulso;
  - pré-diabetes AUC 0,786 contra 0,743 do questionário ADA;
  - diabetes não diagnosticado AUC 0,833 contra 0,780;
  - o relógio acrescenta +0,019 sobre perfil + exames (sono curto, FC de repouso alta, horário de dormir irregular);
  - só é usado quando falta a HbA1c; para o Roberto, a HbA1c foi medida, e o que vale é a trajetória.
- Rodapé: "Fora deste protótipo, software que apoia decisão clínica é dispositivo médico (ANVISA, RDC 657/2022) e exige validação clínica."

## 5. Navegação

- No Resumo do painel, um card chamativo **"Previsões"** com o próximo marco da linha do tempo ("HbA1c deve passar de 6,5% por volta de jan/2029"). O card leva a /previsoes.
- Breadcrumb dentro da área e navegação por abas entre as 4 páginas.

No fim, rode todos os testes e confira as 4 páginas sem erro no navegador.
