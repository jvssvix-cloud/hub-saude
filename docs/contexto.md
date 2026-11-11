# CONTEXTO — Hackathon Gama House × Desafio Rivio
> Arquivo vivo. Fica no Projeto "hackathon Rivio"; cole em novas conversas e mantenha em `docs/contexto.md` no repositório.
> Última atualização: 09/11/2026 (seg, noite): extração + insights + vacinas + **relógio** prontos; Supabase no ar; app começou (Felipe); repositório público.

## 1. O básico
- **Quem:** João Vitor (Eng. Civil POLI-USP), organizador (LEPoli × Mohashees) e também participante.
- **Time:** **2 pessoas**: João + **Felipe**, **construindo juntos** com o Claude Code (seção 6).
- **Evento:** Hackathon Gama House. Desafio proposto pela **Rivio**.
- **Entrega:** **sábado 14/11/2026, na Gama House**. ~~Live demo de 10 min~~ **Sem demo ao vivo (10/11):** entregar a proposta mais completa possível.
- **Tempo disponível (a partir de seg 09/11):** ~3,5 dias de construção (seg à noite → qui à noite) + sexta de ensaio.
- **Regras de dados:** dados **sintéticos ou os próprios**. Dados de outra pessoa só com consentimento explícito. A Rivio não recebe nem guarda dados de saúde dos times.
- **Parcerias/recursos:** Lovable, Red Bull, tokens Notion, Stripe, Canastra Ventures.
- **Objetivo pessoal:** ganhar ou impressionar o bastante para conseguir **estágio na Rivio**.

## 2. O DESAFIO (PDF oficial): "Hub de saúde pessoal"
Uma plataforma com IA que junta o histórico de saúde de cada pessoa, do exame em papel de 10 anos atrás aos dados de wearables, e organiza tudo para ela e para o médico dela.

**Problema:** na saúde privada o histórico fica espalhado entre laboratórios, hospitais, planos e papel. O médico só vê o que o paciente lembra de levar e não vê os dados dos wearables, mesmo quando eles indicam fibrilação atrial, apneia do sono ou hipertensão. Resultado: exames repetidos e decisões com informação incompleta. Mais de 230 mi de pessoas por semana fazem perguntas de saúde ao ChatGPT, e com o histórico completo essas conversas teriam contexto melhor.

**Visão em 3 pilares:**
1. **Estruturar o histórico:** foto/PDF → IA extrai e estrutura cada resultado → **linha do tempo** (exames, consultas, remédios, vacinas) → **evolução de cada resultado ao lado das faixas de referência**.
2. **Acompanhar o presente:** dados de relógio/anel no mesmo histórico → **avisa quando é hora de procurar um médico**.
3. **Mostrar ao médico:** **com consentimento, "como no open finance"**, numa visualização só.

**Referências citadas:** ChatGPT Health (jan/2026), Estônia (e-Estonia, desde 2008), Apple Watch (alertas de FA 2018, apneia 2024, hipertensão 2025), Parkinson detectado até 7 anos antes por sensor de pulso (Nature Medicine).

⚠️ O desafio NÃO é o core atual da Rivio (ciclo de receita e glosas). É um produto voltado ao paciente.

### 2.1 Entendimento da dor (alinhado em 06/11)
**Nas palavras do João:** "Fiz vários exames e vacinas na vida e nada centraliza isso nem transforma em algo para analisar minha saúde. O exame caro de ontem não serve de nada se eu ficar doente amanhã e for ao médico."

**Modelo mental: uma camada de CONTEXTO no centro, com 3 saídas** (alertas, chat, médico).

**Refinamentos:**
- Guardar não basta. O valor está em **estruturar e ligar no tempo**.
- **Dois usuários.** O médico tem ~15 min e precisa de um **resumo de 1 tela**.
- **O difícil (e onde se ganha):** formatos, nomes, unidades e faixas de referência diferentes.
- **Alertas:** sem diagnóstico; motivo + evidência; regras explicáveis.
- **Chat:** responde com base no histórico e cita a fonte.
- **Confiança:** cada número rastreável até o documento original; a pessoa controla quem vê.
- **Laboratórios guardam pouco:** a antiga RDC 302/2005 exigia 5 anos (substituída pela RDC 786/2023; confirmar prazo atual) → argumento de pitch.

## 3. Sobre a Rivio (contexto para o pitch)
- Startup brasileira (SP), 2025, Silvio Frison (CEO) e Ricardo Sales (ex-GA, cofundador do Isaac). Ambos Stanford.
- Core: IA + especialistas no ciclo de receita hospitalar (auditoria → faturamento → glosas). +80 hospitais, > R$100 mi contratados.
- Competência central: **agentes de IA que leem documentos médicos bagunçados.** Vão julgar a QUALIDADE DA EXTRAÇÃO.
- **Hipótese de ponte (só pitch):** histórico estruturado e consentido = menos exames repetidos, documentação melhor, menos glosa.

## 4. Tese e estratégia (revista em 09/11 à noite)
**Diferencial = EXTRAÇÃO BOA + RASTREABILIDADE + CRUZAMENTO.** Pilar 1 (estruturar) está pronto e testado; pilar 3 (médico) simples; **pilar 2 (relógio) volta em versão sintética** (dados da persona + regras de alerta), porque cruzar relógio com exames é o diferencial que nenhum app de relógio tem. Integração real com Apple/Google não é viável em 4 dias (exige app nativo): fica como "próximo passo" (opcional: importar a exportação do Apple Saúde, se houver tempo e relógio com histórico).

**Roteiro da demo (10 min) — momentos "uau" em ordem de prioridade:**
1. **Foto de exame em papel ao vivo** → vira dado no app, com link para a foto original (exame REAL do João).
2. **Tendência de 10 anos** de um exame (LDL, glicose) juntando 4 laboratórios diferentes, com faixa de referência (persona).
3. **Métrica de acurácia:** "X% dos campos extraídos corretamente em 12 laudos e 8 fotos" (gabarito automático do gerador) + teste em laudos reais.
4. **Link para o médico:** consentimento com validade → médico abre resumo de 1 tela, cada número citando o laudo.
5. **Relógio + exames:** "5 avisos de ritmo irregular em 14 dias e FC de repouso subindo → procure um cardiologista", ao lado de LDL/glicose alterados (persona, dados sintéticos).
6. **Vacinação:** carteira consolidada de vários documentos; "dT vencida desde 2024".

**Cortado do MVP (slide de "próximos passos"):** integração real com relógio, chat, remédios, laudos de imagem (ultrassom), FHIR/RNDS, login/Auth, RLS por usuário, PWA.

### 4.0 Dados de teste: persona sintética + exames reais do João
- **Persona (fictícia):** Roberto Almeida Siqueira, 58 anos (nasc. 14/05/1968), masculino, SP. 12 laudos entre 2016 e 2026 em 4 laboratórios fictícios (Delta 2016-17 papel antigo; Alfa 2018-20 + repetição mai/2025; Beta 2021-23; Gama 2024-26). História: LDL 112 → 163, HDL caindo, TG subindo, glicose subindo e fora da faixa nos últimos anos, HbA1c até 6,2% (pré-diabetes), ácido úrico levemente alto nos últimos 2 anos, vitamina D baixa em 2022, **exame repetido em 2025** (novo médico sem o anterior).
- **Gerador: PRONTO (09/11).** `tools/gerador-laudos/`: 12 PDFs em 4 layouts, 8 fotos degradadas, gabarito JSON por laudo + CSV consolidado (188 resultados, 44 fora da faixa). Determinístico. Ver README da pasta.
  - Atenção à narrativa: com os valores atuais, a glicose já sai da faixa em 2020 (não "desde 2024") e o colesterol total desde 2018 (referência caiu de 200 para 190). Ajustar `persona.py` se a história da demo exigir.
- **Limite conhecido:** as amostras sintéticas são mais limpas que laudos reais, então a acurácia nelas tende a ser otimista. **Ação:** juntar 5–10 laudos reais nossos (e da família, com consentimento) de laboratórios diferentes e fazer gabarito à mão para alguns.
- Fácil de expandir se precisar: mais exames, layouts mais difíceis (carimbo, tabela torta, foto pior), outra persona.

### 4.1 Telas do produto ideal (canvas)
Link: https://claude.ai/artifact/5uVxjYToEKD4j3cxFzMkSb (valores ilustrativos; aprovado pelo João). **Telas do MVP (09/11 à noite):** Início, Detalhe do exame, Documentos, Vacinação, Relógio, Enviar exame, Visão do médico.
1. **Início / linha do tempo:** lista de exames por data e laboratório + cards de status por área (Em dia/Atenção).
2. **Detalhe do exame:** gráfico da série com faixa de referência; cada ponto abre o documento original.
3. **Enviar exame:** upload de PDF ou foto (câmera do celular) → mostra o que foi extraído para conferir.
   - **Cadastro (onboarding):** nome, sexo, data de nascimento, peso, altura. Sexo e nascimento vão junto para a extração (escolher a referência certa por sexo/idade; a IA nunca deduz o sexo pelo nome).
4. **Visão do médico** (desktop, sem login, via link com validade): resumo de 1 tela com citações.

## 5. Arquitetura, stack e repositório
- **Não vamos treinar LLM.** API pronta (Claude) + prompt + formato de saída obrigatório + dicionário de nomes + validações.
- **Fluxo:** upload (Storage) → rota de API chama Claude (visão) → JSON no formato do gabarito → normalização (nome canônico, unidade canônica) → validação (valor plausível? unidade conhecida?) → grava `observation` com link para documento + página.
- **Banco: Supabase `hub-saude`** (Postgres + Storage), região São Paulo, **no ar desde 09/11** com o Roberto carregado. Sem login no MVP (1 usuário de demo); tabelas trancadas para a chave pública (RLS sem políticas, sem regras por usuário) e acesso externo só por `acessar_historico(token)`. Detalhes em `supabase/README.md`.
- **Front:** Next.js + TypeScript, Tailwind, Recharts, mobile-first, Vercel.
- **Lovable** (parceiro, 100 créditos até sábado). **Recomendação (09/11, a confirmar):** construir o app no Claude Code (mesmo código da extração e dos insights, sem limite de créditos, rastreabilidade sob controle) e usar o Lovable só para a **landing page do pitch** (QR code para a demo). Motivo: os créditos acabam em poucas horas de iteração e o Lovable cria um projeto separado, longe do código testado.
- **Repositório:** `jvssvix-cloud/hub-saude`. Estrutura no `CLAUDE.md`.
- **Modelo de dados (implementado 09/11):** `paciente`, `documento` (origem/canal, emissor, data, arquivo, páginas), `observacao` (exame, vacina ou agregado de wearable; mesmos nomes de campos da extração e dos insights; documento + página), `consentimento` (escopo, destinatário, validade, status pendente/aprovado/recusado, revogação, token) e `log_acesso`. Tipos em `lib/types.ts`.
- **Contrato extração ↔ app:** mesmo formato do gabarito do gerador. O app usa os JSONs do gabarito como dados de mentira até a extração estar pronta.

## 6. TIME (09/11)
**Atualização 09/11 à noite:** o amigo ainda não tinha começado; decisão de **construir juntos** (6h hoje) com o Claude Code. A tabela de papéis abaixo é a original; o plano em vigor é o "Plano 09/11 à noite".

**Divisão 09/11 à noite:** **João** faz as horas 1 e 2 (branch `a/app`, pasta `app/`); **Felipe** faz a hora 3, o relógio (branch `b/relogio`, pasta `wearable/`, prompt pronto em `docs/prompts/02-relogio.md`, sem chave da API). Contrato: `wearable/saida/relogio.json` (formato no prompt). **Os dois têm acesso total** (GitHub e Supabase) e editam qualquer arquivo sem pedir aprovação; regra: `git pull` antes de mexer e conferir a versão no GitHub depois de cada push. Em ~2h: merge das duas branches na `main` e horas 4, 5 e 6 juntos.

**Plano 09/11 à noite (6h):**
| Hora | Entrega |
|---|---|
| 1 | Next.js no ar na Vercel (link no celular) + **Início** (áreas da persona via `insights.json`) |
| 2 | **Detalhe do exame**: gráfico 10 anos + faixa de referência; ponto abre o laudo original |
| 3 | **Relógio**: dados sintéticos da persona + regras de alerta + tela |
| 4 | **Vacinação** + **Documentos** (linha do tempo) |
| 5 | **Enviar exame**: foto/PDF → extração → conferir |
| 6 | **Visão do médico** (link) + polimento |

**Depois:** Ter: Supabase (tabelas + carga) e envio gravando no banco; link do médico com validade. Qua: ponta a ponta + landing no Lovable. Qui: polimento, **congelar à noite**. Sex: deck, roteiro, ensaios, vídeo de backup.

**Papéis originais:**
| Papel | Quem | Constrói |
|---|---|---|
| **A · Dados e IA** | João | Prompt + schema de extração, chamada à API do Claude, normalização (dicionário de nomes e unidades), script de acurácia contra o gabarito, regras (status por área, exame repetido, "o que falta"), resumo do médico, **pitch e roteiro** |
| **B · Produto** | [amigo] | Next.js + Vercel, Supabase (tabelas + Storage), 4 telas, gráfico, upload/câmera, link de consentimento + visão do médico |

**Cronograma:**
| Dia | A · Dados e IA (João) | B · Produto (amigo) |
|---|---|---|
| **Seg 09** (noite) | Chave da API Anthropic; extração v1 de 1 PDF sintético → JSON no formato do gabarito | Ler este arquivo; Next.js no ar na Vercel; tela Início lendo os JSONs do gabarito |
| **Ter 10** | Extração em todos os PDFs e fotos; script de acurácia; normalização. **Juntar laudos reais** | Supabase (tabelas + Storage); detalhe do exame com gráfico e faixa de referência; link para o documento original |
| **Qua 11** | Rota de API upload → extração → banco (com B); testar com laudos reais do João; regras de status e exame repetido | Tela de upload/câmera ligada à API; link de consentimento + visão do médico |
| **Qui 12** | Resumo do médico; correções de extração; deck + roteiro v1. **Noite: congelar** | Polimento, celular, dados da persona carregados no banco. **Noite: congelar** |
| **Sex 13** | Ensaios cronometrados; roteiro final | Vídeo de backup da demo; plano B offline; ensaios |
| **Sáb 14** | **Demo** | **Demo** |

**Pontos de controle (decidir cortes):**
- **Ter à noite:** extração funciona em PDF e foto com acurácia medida? Se não, A foca só nisso na quarta e B faz a visão do médico com dados do gabarito.
- **Qua à noite:** fluxo foto → app funcionando de ponta a ponta? Se não, demo usa resultado pré-processado + vídeo da extração.

**Rituais:** check-in de 10 min por dia (manhã); merge na `main` todo dia; **quinta à noite congela**.

## 7. Decisões tomadas
- 06/11: produto = camada de contexto + 3 saídas (alertas, chat, médico).
- 06/11: partir do produto ideal (4.1) e cortar para o MVP (4.2).
- 06/11: não treinar LLM; API do Claude + Supabase (SP) + Next.js.
- 06/11: dados de teste = persona sintética (Roberto, 58) + gerador de laudos com gabarito automático; exames reais do João só na foto ao vivo.
- 06/11: desenvolvimento migra para Claude Code + GitHub.
- 09/11: gerador de laudos pronto (branch `p1/gerador-laudos`); kit movido para a raiz do repositório.
- 09/11: **time reduzido para 2 pessoas.** Foco no pilar 1 (extração + linha do tempo) e no pilar 3 simples (link para o médico). Relógio, chat, vacinas, remédios, FHIR, Auth e RLS fora do MVP (só no pitch).
- 09/11: laudos reais do time passam a ser também **teste** da extração (não só demo), porque os sintéticos são mais limpos que os reais.
- 09/11: **extração v1 pronta** (`extraction/`, TypeScript): IA lê, código normaliza unidades e valida. Acurácia nos sintéticos: 100% dos valores (253/253).
- 09/11: **modelo padrão = Claude Haiku 5.5** (~US$ 0,003/laudo; Opus 5.5 deu o mesmo resultado a ~US$ 0,084/laudo). Custo é restrição: testes pagos só com estimativa e ok antes; resultados ficam em cache. Laudos reais para teste: adiado.
- 09/11: **1º laudo real** (João, One Life/Einstein, 10 pág., US$ 0,006): leitura 20/20 valores e referências corretas (inclusive faixas por idade). Problemas eram do nosso dicionário: 3 unidades e 9 exames novos (insulina, não-HDL, VLDL, fosfatase alcalina, GGT, bilirrubinas) → incluídos. Erro de página (referência em outra página) → prompt v2; nome "Resultado (glicose)" → prompt v3. **Prompt v3: 100% em todos os campos nos sintéticos (253) e no laudo real (20).** Sexo vem do cadastro do app.
- 09/11: **vacinação entra no MVP (versão enxuta):** extração de carteira (a IA identifica laudo × carteira), carteira consolidada (mesma vacina + data = 1 dose com várias fontes) e situação pelo **Calendário Nacional de Vacinação 2026 (MS)**, 20–59 anos. Sintéticos: 34/34 doses. **Carteira real do João (Meu SUS Digital, CIVP, certificado COVID): 11/11 doses, 11 → 7 consolidadas.** Doses da infância raramente estão no digital: o app avisa em vez de afirmar que faltam.
- 09/11: **laudo real de terceira (com consentimento), usado só para aprender e apagado:** 29/29 valores e referências femininas corretas. Lições viraram código + caso sintético permanente (`caso-misto`): 14 exames novos, hemácias em número inteiro, "microUI/mL", **data de coleta por exame**, resultados com sinal ("< 0,2", "> 90") e em texto ("NÃO REAGENTE") → **prompt v5**. Laudos de imagem (ultrassom): fora do MVP. Regra: dados de terceiros nunca ficam guardados.
- 09/11: **dados reais ficam em `dados-reais/`** (fora do Git): laudos, gabaritos manuais, cache e relatórios. `npm run acuracia -- --conjunto=reais`.
- 09/11 noite: **os 2 constroem juntos** (6h hoje); **relógio volta ao MVP** em versão sintética + regras; telas do MVP: Início, Detalhe do exame, Documentos, Vacinação, Relógio, Enviar exame, Visão do médico. Recomendação a confirmar: app no Claude Code, Lovable só para landing do pitch.
- 09/11 noite: **divisão:** João = horas 1–2 (app base: Início + Detalhe do exame); Felipe = hora 3 (relógio, `docs/prompts/02-relogio.md`); horas 4–6 juntos. Contrato do relógio: `wearable/saida/relogio.json`.
- 09/11 noite: **acesso total para João e Felipe** no GitHub e no Supabase (Felipe criou o projeto e o banco); sem aprovação para mudanças; sempre `git pull` antes e conferir a versão puxada depois.
- 09/11 noite: **regra de trabalho:** toda mudança estrutural é registrada no `CLAUDE.md` e neste arquivo na hora.
- 09/11 noite: **banco no ar** (Supabase `hub-saude`, LEPoli, São Paulo): 3 migrations + seed do Roberto (14 documentos, 188 exames, 17 doses). Consentimento "como no open finance": **o médico pede pelo telefone do paciente** e o paciente aprova no app (pode estreitar escopo); QR continua como alternativa; validade conta da aprovação; **revogar corta médico, MCP e API na hora** porque toda leitura externa passa por `acessar_historico(token)`, que grava log. Pedido para telefone desconhecido responde igual (não revela quem usa o app). Testado no banco real com a chave pública.
- 09/11 noite: **RLS ligado sem políticas** (muda o "sem RLS" anterior): sem isso a chave pública, que vai para o navegador do médico, leria as tabelas direto e a revogação seria só visual. Não exige login nem regras por usuário; o servidor do app usa a service_role e não muda nada. **João: confirmar.**

- 09/11 noite: **troca na divisão:** João faz o relógio (`wearable/`, branch `a/relogio`); Felipe faz o app (`app/`, branch `b/app`: Next.js + Início + Detalhe do exame, depois Visão do médico).

- 09/11 noite: **relógio pronto** (`wearable/`, TypeScript, custo de API zero). A fonte manda o **resumo diário** (FC de repouso calculada pela Apple, variabilidade SDNN, sono, passos) + **eventos** de ritmo irregular um a um; nada de batimento a batimento. 4 regras explicáveis (ritmo ≥ 3 avisos/14 dias; FC de repouso ≥ 5 bpm acima da linha de base de 90–180 dias atrás; sono < 6 h/14 dias; passos −25% em 30 dias), mínimo de 7 dias com dado, cruzamento com LDL/glicose/HbA1c dos insights. Simulador sincroniza 1 dia a cada X s: o alerta de ritmo irregular **nasce ao vivo** na demo (`--inicio=2026-10-25`). 10 testes.
- 09/11 noite: **caminho real do relógio** (próximo passo): Apple Watch → iPhone (Saúde) → app no iPhone (Health Auto Export; depois app próprio) → rota `/api/relogio/sync` na Vercel (chave secreta) → Supabase → tela. O celular nunca fala direto com o banco. Sem relógio no time: dá para testar o caminho com os passos/sono reais do iPhone do João.
- 09/11 noite: **repositório público** (Vercel Hobby não aceita colaboração em repositório privado). Histórico conferido: só dados fictícios; chaves nunca no Git.

- 09/11 noite: **tela do Relógio no app** (`/relogio` + cartão na Início, lendo `relogio.json`). Estado e o que falta para fechar o esqueleto em `docs/estado-e-proximos.md`: 1) enviar exame pelo app, 2) site lendo do banco, 3) visão do médico, 4) tela de vacinação, 5) rota de sincronização do relógio. Sugestão: João 1 e 5, Felipe 2 e 3.
- 10/11: **revisão geral** (tudo verde: typecheck, lint, build, 10 testes do relógio, acurácia do cache 100%). Correções: `insights` passa a usar a **data fixa 2026-11-09** por padrão (igual ao `FIM` do relógio; antes era a data do computador, e idade/atrasos mudavam conforme o dia em que se rodava); link "contexto de exames" do Relógio escolhe o nome mais longo (HbA1c não cai mais em Hemoglobina). **A decidir:** mover as duas datas para 14/11 (dia da demo) antes de sábado.
- 10/11: **site lê do banco** (item 2, João, com ok do Felipe). `app/src/lib/dados.ts` lê documento + observação com a service_role (`insights/src/banco.ts`, fetch puro) e roda as regras de `insights/` na hora; telas iguais. Plano B: `insights.json` se faltar a chave ou o banco falhar. Cache `use cache` com etiqueta `historico` (1h); quem grava chama `updateTag("historico")`. `npm run conferir-banco` (insights/) prova banco = JSON. O app lê o `.env.local` da raiz; na Vercel, `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` no painel. Relógio continua pelo JSON.

- 10/11: **sem demo ao vivo; escopo passa a ser a proposta mais completa possível** (Felipe). O que era "fase 2" (onboarding/login, lista de pacientes do médico, timeline, chat de IA, conector MCP) entra no escopo. Referência de produto: engenharia reversa da Function Health (lado paciente) + painel do médico, que a Function não tem.
- 10/11: **área do médico e Compartilhar no ar**, testadas com o banco real (pedir → autorizar com escopo → painel → encerrar/recusar). Nova função `situacao_acesso` (a tela do médico consulta a cada 3 s sem dados e sem log).
- 10/11: **"Entender este exame"** (o que é / por que importa / o que costuma ajudar, texto fixo em `app/src/lib/explicacoes.ts`) e contagem na faixa/fora na Início.
- 10/11: **nota do médico** (`nota_medico` + `registrar_nota`): o painel sugere recomendações por regras, o médico edita e envia, e o paciente vê "Revisado por Dra. X" na Início. O token do consentimento é a credencial do médico (sem login por enquanto).

- **10/11 · IA do paciente:** (1) **conector MCP** em `/api/mcp/[token]` para o paciente ligar o Claude/ChatGPT/Gemini dele ao histórico, com o mesmo consentimento do médico (tipo `ia`, escopo, prazo, log, revogação; tela `/conectar-ia`); é prioridade sobre o chat próprio. (2) **Chat do app** (aba Conversar) com **Gemini** pela cota gratuita (`GEMINI_API_KEY`); a extração continua no Claude. As duas coisas usam as mesmas ferramentas de leitura (`app/src/lib/ferramentas.ts`).
- **11/11 · Enviar exame** (João): `/enviar` recebe PDF ou foto, a extração (Claude Haiku, ~US$ 0,003) lê, o paciente **confere a prévia** e só então salva no banco (`documento` + `observacao`); os insights continuam sendo regras (sem IA). Decisões: prévia antes de salvar; sem login ainda, então **limite de 10 leituras/hora** + interruptor `ENVIO_DESLIGADO`; tudo no Roberto (novos pacientes depois, com o login). Bucket privado `documentos`, tabela `envio`, `documento.sha256` (migration `envio_exame`). Teste: 17/17 valores iguais ao seed.
- **11/11 · Vercel conferida:** production e preview apontam para o projeto `eimnpafybehiylzukoja`; `SUPABASE_SERVICE_ROLE_KEY` recriada a partir do `.env.local`; selinho "Dados: banco / arquivo" no rodapé da Início. **Pendente:** `ANTHROPIC_API_KEY` na Vercel (sem ela o envio aparece desligado) e tirar a quebra de linha do fim de `NEXT_PUBLIC_SUPABASE_URL` no painel.

- **11/11 · Conta do paciente (Felipe, fatia 1 do onboarding, `docs/prompts/03-onboarding-checkup.md`):** login com e-mail e senha pelo **Supabase Auth**, `@supabase/supabase-js` + `@supabase/ssr` **só para login e sessão** (o resto continua com fetch puro). Sessão em cookie httpOnly lida no servidor. Migration `conta_paciente`: `paciente.usuario_id` (único, → `auth.users`, `on delete set null`: apagar a conta não apaga o histórico). O paciente só nasce no bloco 1 do check-up; quem entra sem paciente vai para o check-up. Conta de demonstração ligada ao Roberto, com e-mail e senha **só em variável de ambiente** (`DEMO_EMAIL`, `DEMO_SENHA`; nunca no código nem no `.env.example`). `carregarInsights(pacienteId)`: o id entra na chave do cache e a etiqueta vira `historico:<pacienteId>`. Confirmação de e-mail desligada no Supabase (Felipe). Check-up: bloco 1 obrigatório e, no bloco 2, **altura e peso obrigatórios** (IMC); cintura e pressão opcionais.
- **11/11 · Paciente da sessão (Felipe, fatia 2 do onboarding):** não existe mais paciente fixo no app (`app/src/lib/usuario.ts` apagado). Telas, Compartilhar, Conectar IA, envio de exame (`lerExame`/`salvarEnvio`/`descartarEnvio` recebem o paciente), nota, planos e "Próximo passo" usam `pacienteAtual()`. Aprovar/recusar/revogar/desconectar conferem que o consentimento é do paciente da sessão (sem isso, um paciente aprovaria o pedido feito ao telefone de outro). **Relógio:** `relogioDe(pacienteId)` só devolve o `relogio.json` para o Roberto; médico e MCP descobrem o paciente pelo token, então o médico de outro paciente nunca vê o relógio do Roberto. O app local passa a ler o banco mesmo sem `NEXT_PUBLIC_SUPABASE_URL` no `.env.local` (usa a URL pública de reserva). Testado com um segundo paciente sintético (criado e apagado): não vê nada do Roberto e não consegue aprovar pedido dele.
- **11/11 · Logo Zelo (Felipe):** a logo enviada (coração com batimento + "zelo") entrou nos cabeçalhos do paciente, do médico e no `/entrar` (`app/public/zelo.png`, recortada e com fundo transparente; componente `app/src/components/Logo.tsx`). Os títulos das páginas ainda dizem "Hub de Saúde".
- **11/11 · Nome Zelo em todo o app** (títulos, chat, conector MCP) e favicon com o coração da logo. Repositório e Supabase continuam `hub-saude`.
- **11/11 · Check-up inicial (Felipe, fatia 3 do onboarding):** `/checkup`, 7 blocos com barra de progresso: 1 básico (nome, nascimento, sexo biológico, celular) + aceites · 2 altura e peso (obrigatórios, IMC na hora) · 3 hábitos · 4 condições e remédios · 5 família · 6 alergias (+ gestação e menopausa se F) · 7 "Enviar exames agora / Depois". Blocos 3 a 6 com "Pular". **Sem cintura e sem pressão** (Felipe). **Aceites no bloco 1, não no fim:** o consentimento para dado de saúde (LGPD) vem antes de qualquer dado de saúde ser gravado. Tabela `perfil_saude` (migration `perfil_saude`); o Roberto ganhou um perfil sintético concluído (174 cm, 86 kg) na migration e no seed. Quem não concluiu volta ao check-up; as APIs respondem 401. Telefone repetido mostra mensagem clara. Página pública `/termos`. Testado de ponta a ponta com uma conta de teste (criada e apagada). **Pendente (fatia 4):** "Meu perfil de saúde" em Mais para editar, e o perfil no texto das ferramentas do chat/MCP.
- **11/11 · Meu perfil de saúde (Felipe, fatia 4):** Mais > "Meu perfil de saúde" (`/perfil`) mostra o check-up por bloco, cada um com "Editar" (`/perfil/editar?bloco=1..6`, mesmos campos do check-up, `salvarBloco` no modo "perfil"; editar nome/nascimento/sexo renova o cache dos insights). **Atividade física passou a ser horas por dia com botões − e +** (de 1 em 1, até 6; Felipe), guardada em minutos por semana (1 h/dia = 420 min), sem migration. **O perfil entra no chat e no "Criar plano"** (seção marcada como "informado pelo paciente, não é exame"). **Não vai para o médico nem para o MCP:** o consentimento não tem categoria "perfil"; liberar isso pede mudar `acessar_historico` (migration) e a tela de autorização. A decidir.
- **11/11 · Estados vazios (Felipe, fatia 5, fecha o onboarding):** paciente sem exames vê em Início, Exames, Evolução, Documentos e Plano um chamado para enviar o primeiro exame (`components/SemExames.tsx`), o "Próximo passo" vira "Envie seu primeiro exame" e as perguntas do chat passam a ser sobre o perfil. **"Conecte seu wearable"** (Felipe): onde haveria dado de relógio (Início, Exames, Evolução, Relógio) aparece o convite (`components/ConecteWearable.tsx`), que leva a `/relogio/conectar` (Apple Saúde e Health Connect, o que o Zelo lê, como funciona). **A conexão de verdade é do futuro app para celular** (HealthKit / Health Connect só existem lá); na web o botão explica isso, sem fingir que conectou. Os dados que chegarem passam pela mesma rota prevista `/api/relogio/sync` e pelas regras de `wearable/`.
- **11/11 · Revisão de segurança (João):** banco conferido (migrations = pasta, tabelas e bucket trancados para a chave pública, dados íntegros). **Arquivo original enviado (`/enviados/<uuid>`) agora respeita o consentimento:** abre só para o paciente dono (sessão) ou com `?t=<token>` de um consentimento válido cujo escopo inclui o documento (passa por `acessar_historico`, grava log, sem cache). Revogou, o link para de abrir na hora (antes abria para qualquer um com o link). `linkLaudo(fonte, token)` coloca o token nos links da visão do médico. Cabeçalhos de segurança em todas as respostas (`X-Frame-Options`, `Referrer-Policy: no-referrer` para o token não vazar pelo Referer, `nosniff`, `Permissions-Policy`); CSP fica para depois (precisa de nonce). Migration `indices_chaves` (índices nas chaves estrangeiras e em `documento.arquivo`). Pendente no painel: ligar "proteção contra senha vazada" no Supabase Auth.

## 8. Perguntas em aberto
- (resolvido) Região do projeto Supabase: São Paulo (sa-east-1).
- (resolvido 09/11) **Ninguém do time tem relógio** → relógio 100% sintético + simulador de sincronização (feito).
- Confirmar: app no Claude Code e Lovable só para landing?
- Exportação do Apple Saúde do iPhone do João (passos e sono reais, sem relógio): João vai procurar.
- Health Auto Export (assinatura Premium) para o caminho real iPhone → rota → Supabase: vale assinar? Conferir preço e teste grátis.
- Critérios de avaliação dos jurados?
- (resolvido) Chave da API: criada; fica em `.env.local` e no painel da Vercel. Gasto até 09/11: ~US$ 1,75.
