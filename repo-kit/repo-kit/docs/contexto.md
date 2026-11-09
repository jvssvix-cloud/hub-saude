# CONTEXTO — Hackathon Gama House × Desafio Rivio
> Arquivo vivo. Fica no Projeto "hackathon Rivio"; cole em novas conversas e copie para `docs/contexto.md` no repositório.
> Última atualização: 06/11/2026 (sex), migração para Claude Code + GitHub.

## 1. O básico
- **Quem:** João Vitor (Eng. Civil POLI-USP), organizador (LEPoli × Mohashees) e também participante.
- **Time:** 4 pessoas (papéis na seção 6; nomes a preencher).
- **Evento:** Hackathon Gama House. Desafio proposto pela **Rivio**.
- **Entrega:** **sábado 14/11/2026, na Gama House**. **Live demo de 10 min** para a Rivio.
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

## 4. Tese da solução
**Diferencial = CONFIANÇA + RASTREABILIDADE.** Todo número com link para o documento original. Alertas = regras explicáveis.

**Momentos "uau" da demo:** (1) foto de exame em papel ao vivo vira dado e gráfico (exame REAL do João); (2) tendência de 10 anos de um exame, vários laboratórios (persona); (3) relógio sinaliza ritmo irregular → procurar cardiologista; (4) link de consentimento → médico vê resumo citado em 30 s; (5) métrica "X% extraído corretamente em N laudos" (gabarito automático do gerador).

**Extras se sobrar tempo:** FHIR (padrão RNDS); conciliação de remédios.

### 4.0 Dados de teste: persona sintética + exames reais do João
- **Problema:** o time tem poucos exames próprios, e um histórico de 20 anos "tudo em dia" não mostra o produto.
- **Solução:** **gerador de laudos sintéticos** + **persona** para a história; exames reais do João só no momento "foto ao vivo".
- **Persona (fictícia):** Roberto Almeida Siqueira, 58 anos (nasc. 14/05/1968), masculino, SP. 12 laudos entre 2016 e 2026 em 4 laboratórios fictícios (Delta 2016-17 papel antigo; Alfa 2018-20 + repetição mai/2025; Beta 2021-23; Gama 2024-26). História: LDL 112 → 163, HDL caindo, TG subindo, glicose fora da faixa desde 2024, HbA1c até 6,2% (pré-diabetes), ácido úrico levemente alto nos últimos 2 anos, vitamina D baixa em 2022, **exame repetido em 2025** (novo médico sem o anterior), ritmo irregular no relógio em out-nov/2026 (dados do relógio = P4).
- **Gerador:** 4 layouts (D máquina de escrever, A tabela, B blocos, C compacto com pontilhado), nomes/unidades/referências diferentes por laboratório, fotos degradadas, **gabarito JSON/CSV automático**. Fonte da verdade: `tools/gerador-laudos/persona.py`. Especificação completa: `PRIMEIRO_PROMPT.md` do kit.
- Família pode contribuir com exames só com consentimento explícito.

### 4.1 Telas do produto ideal (canvas)
Link: https://claude.ai/artifact/5uVxjYToEKD4j3cxFzMkSb (valores ilustrativos; aprovado pelo João).
1. Onboarding. 2. Início (alerta, áreas Em dia/Atenção/Sem dados, relógio 7 dias, o que falta, chat, abas). 3. Detalhe de área. 4. Chat com fontes. 5. Compartilhar. 6. Visão do médico (desktop, sem login).

### 4.2 Ordem de ataque e corte do MVP
1. Material (gerador + persona) → 2. **testar extração** → 3. banco + linha do tempo + áreas + gráfico → 4. compartilhar + médico → 5. wearable + 1 alerta → 6. chat.
**MVP obrigatório:** 1–5. **Chat:** provável. **Só no pitch:** FHIR, vacinas detalhadas.

## 5. Arquitetura, stack e repositório
- **Não vamos treinar LLM.** API pronta (Claude) + prompt + formato de saída obrigatório + dicionário de nomes + validações.
- **Banco: Supabase** (Postgres + Storage + Auth + RLS), região São Paulo.
- **Front:** Next.js + TypeScript, Tailwind, Recharts, PWA mobile-first, Vercel.
- **Código:** tudo no GitHub, desenvolvido com **Claude Code** (a partir de 06/11).
- **Repositório (sugestão):** `hub-saude`, privado. Estrutura: `app/` (P3), `lib/`, `extraction/` (P1), `insights/` (P2), `wearable/` e `sharing/` (P4), `tools/gerador-laudos/`, `supabase/migrations/`, `docs/`.
- **Kit inicial (entregue 06/11, repo-kit.zip):** `CLAUDE.md` (lido automaticamente pelo Claude Code), `tools/gerador-laudos/persona.py`, `PRIMEIRO_PROMPT.md` (pedido do gerador de laudos).
- **Lovable:** opcional para telas. **Notion:** quadro de tarefas. **Stripe:** não é core.
- **Modelo de dados (rascunho):** person, source_document, observation (analito canônico, valor, unidade, ref_min/max, data, laboratório, source_doc + página, área, confiança), medication, vaccine, wearable_daily, wearable_event, alert, consent_grant, access_log.

## 6. TIME: 4 papéis (versão rebalanceada, 06/11)
| Papel | Quem | Constrói |
|---|---|---|
| **P1 · Exames: documentos → dados** | [nome] | Gerador de laudos (hoje), upload foto/PDF, extração com IA, normalização, validação, banco (Supabase), métrica de acurácia |
| **P2 · Inteligência: dados → informação** | [nome] | Status por área, tendências, "o que falta", resumo do médico citado, **chat** |
| **P3 · Produto: informação → experiência** | [nome] | 6 telas do canvas, gráficos, câmera, visão do médico; começa com dados falsos |
| **P4 · Relógio, alertas, compartilhamento + pitch** | [nome] | Dados do relógio (sintéticos), regras de alerta, consentimento (link, validade, log, revogar), deck + roteiro |

**Contratos (sábado 07 de manhã, ~30 min):** P1↔P2 colunas de `observation`/`source_document`; P4↔P2 `wearable_*`/`alert`; P2/P4↔P3 formato da API. P3 usa JSON falso até lá. (O gabarito manual não é mais necessário: vem do gerador.)

**Cronograma por pessoa:**
| Dia | P1 · Exames | P2 · Inteligência | P3 · Produto | P4 · Relógio/alertas/compart. + pitch |
|---|---|---|---|---|
| Sex 06 | Repo + gerador de laudos e persona (Claude Code) | — | — | Notion; convidar time |
| Sáb 07 | Contratos; Supabase + tabelas; prompt de extração v1 | Contratos; mapa exame → área; regras de status | Contratos; Next.js + Início com dados falsos | Contratos; gerador de dados do relógio da persona |
| Dom 08 | Normalização + dicionário + gravar no banco | Tendências + "o que falta"; API /areas e /area/:id | Detalhe de área + gráfico + linha do tempo | Relógio no banco |
| Seg 09 | Todos os laudos + fotos; baixa confiança | Linha do tempo + resumo do médico | Onboarding com upload/câmera | Regras de alerta + textos |
| Ter 10 | Métrica de acurácia; correções | Chat com citações | Compartilhar + visão do médico | Consentimento: link, validade, log, revogar |
| Qua 11 | Robustez (foto ao vivo!) | Qualidade do chat/resumo | Chat + polimento | Deck + roteiro v1 |
| Qui 12 | **Congelar.** Correções | Correções; dados da demo | Correções; responsivo | Roteiro final; ensaio 1 |
| Sex 13 | Ensaios + plano B | Ensaios | Ensaios + vídeo de backup | Ensaios cronometrados |
| Sáb 14 | **Demo** | | | |

**Rituais:** sync diário de 15 min; quadro no Notion; branch por tarefa + Pull Request; main sempre funcionando; **quinta à noite congela**.

## 7. Decisões tomadas
- 06/11: produto = camada de contexto + 3 saídas (alertas, chat, médico).
- 06/11: partir do produto ideal (4.1) e cortar para o MVP (4.2).
- 06/11: não treinar LLM; API do Claude + Supabase (SP) + Next.js.
- 06/11: papéis rebalanceados P1–P4 (seção 6).
- 06/11: **dados de teste = persona sintética (Roberto, 58) + gerador de laudos com gabarito automático; exames reais do João só na foto ao vivo.**
- 06/11: **desenvolvimento migra para Claude Code + GitHub agora.**

## 8. Perguntas em aberto
- Quem é cada pessoa (nomes) e qual papel o João assume?
- Créditos de API de LLM (chave da Anthropic para a extração)?
- Critérios de avaliação dos jurados?
- Nome final do repositório GitHub.
