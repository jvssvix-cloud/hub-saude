# Hub de Saúde Pessoal — Hackathon Gama House × Desafio Rivio

O Claude Code lê este arquivo automaticamente. O contexto completo (estratégia, cronograma, decisões) está em `docs/contexto.md`.
**Toda mudança estrutural (pasta nova, decisão, regra, escopo) deve ser registrada aqui e em `docs/contexto.md` na mesma hora.**

## O que estamos construindo
Um app com IA que junta o histórico de saúde de uma pessoa (exames e carteira de vacinação em PDF ou foto, dados do relógio) num lugar só, mostra a evolução de cada exame ao longo dos anos ao lado da faixa de referência, avisa quando é hora de procurar um médico (regras explicáveis) e gera um link de consentimento para o médico ver um resumo, com cada número apontando para o documento original.

- **Entrega:** sábado 14/11/2026. **Sem demo ao vivo (decidido 10/11):** entregar a proposta mais completa possível (paciente, médico, consentimento, upload, timeline, onboarding/login, chat e conector MCP), sempre com a `main` funcionando.
- **Time:** 2 pessoas, **construindo juntas** com o Claude Code. Cada parte entra pequena e funcionando antes da próxima (o simples primeiro, depois completar).
- **Dados:** SOMENTE sintéticos ou do próprio time. **Dados de terceiros:** só com consentimento explícito, usados só para aprender e **apagados em seguida** (a lição vira código + caso sintético).
- **Diferencial:** qualidade da extração + rastreabilidade. Todo número aponta para o documento original. Alertas são regras explicáveis, nunca diagnóstico.

## Stack
- Front: Next.js + TypeScript (App Router), Tailwind, Recharts; mobile-first. Deploy na Vercel; a `main` sempre funcionando.
- Banco: Supabase `hub-saude` (Postgres + Storage), região São Paulo, **no ar** com o Roberto carregado. **Login do paciente (11/11):** Supabase Auth com e-mail e senha (`@supabase/ssr` só para login e sessão; cookie httpOnly lido no servidor), ligado por `paciente.usuario_id`; conta de demonstração do Roberto com e-mail/senha só em variável de ambiente (`DEMO_EMAIL`, `DEMO_SENHA`). Médico, MCP e link continuam sem login, por token. As tabelas ficam trancadas para a chave pública (RLS sem políticas) e o acesso externo passa só por `acessar_historico(token)`. Ver seção "Banco" abaixo.
- IA: API do Claude para extração (visão + saída estruturada). **Modelo padrão: Claude Haiku 5.5** (~US$ 0,003/laudo).
- Chat do app (aba Conversar): **Gemini** (`GEMINI_API_KEY`, cota gratuita; `app/src/lib/chat.ts`; padrão `gemini-3.5-flash`, com modelos reserva e limite de 25 s por tentativa). Sem a chave, o chat aparece desligado.
- **Conector MCP** (`/api/mcp/[token]`): o assistente do próprio paciente (Claude, ChatGPT, Gemini) lê o histórico. O token é um consentimento `ia` criado em `/conectar-ia`; cada leitura passa por `acessar_historico(token, "mcp")` (escopo, log, revogação). Só leitura. As ferramentas ficam em `app/src/lib/ferramentas.ts` e o chat usa o mesmo texto.
- Lovable (parceiro, 100 créditos até sábado): **recomendação** = usar só para a página de apresentação (landing do pitch), não para o app. Ver `docs/contexto.md`.

## Estrutura do repositório
```
app/                  # Next.js, 2 áreas: PACIENTE (abas Início · Exames · Conversar · Plano · Mais; /enviar = enviar exame (PDF/foto -> extração -> prévia -> salvar no banco); /conversar = chat; /conectar-ia = conector MCP; /exames por sistema -> /sistema/[id] -> /exame/[analito]; /documentos/[id] = cada laudo; /plano = nota do médico + próximos exames; /relogio, /evolucao, /compartilhar: calma, gráficos, detalhe opcional) e MÉDICO (/medico pede acesso pelo telefone; /medico/acesso/[token] painel denso; paciente aprova em /compartilhar). Identidade clara (off-white, bege, sálvia) + faixa Rivio. Médico envia recomendações (nota) que o paciente vê na Início como "Revisado por". Exames do BANCO (plano B: insights.json). Ver app/README.md
extraction/           # documento -> dados: prompt (versionado), schema, normalização, testes de acurácia  [PRONTO]
insights/             # dados -> informação: séries, áreas, tendência, repetição, vacinação, resumo do médico [PRONTO]
wearable/             # relógio: dados sintéticos, 4 regras de alerta, cruzamento com exames, simulador de sincronização [PRONTO]
supabase/             # banco: migrations, seed do Roberto, README com o contrato [PRONTO, aplicado no Supabase]
lib/types.ts          # tipos das tabelas do banco (espelham as migrations)
tools/gerador-laudos/ # laudos, carteiras de vacinação e casos sintéticos + gabaritos [PRONTO]
dados-reais/          # NUNCA vai para o GitHub (.gitignore): laudos/carteiras reais do time + gabaritos manuais
docs/                 # contexto, decisões, estado-e-proximos.md (o que temos / o que falta), prompts usados
```
Cada pasta pronta tem README com comandos. Resumo:
- `cd extraction && npm run acuracia` (laudos sintéticos), `-- --conjunto=reais`, `npm run acuracia-vacinas`
- `cd extraction && npm run extrair -- arquivo.pdf --sexo=M --nascimento=AAAA-MM-DD`
- `cd insights && npm run insights` (gera `insights/saida/insights.json`, plano B do app), `npm run conferir-banco` (banco = JSON?)
- `cd tools/gerador-laudos && python gerar.py` (determinístico)
- `cd wearable && npm run gerar` (gera `relogio.json`), `npm run simular -- --inicio=2026-10-25 --intervalo=5`, `npm test`

## Contrato entre as partes
- Extração → app/banco: formato do gabarito (`tools/gerador-laudos/README.md`) + campos v5 (`qualificador`, `resultado_texto`, `data_coleta` por resultado) e `doses` de vacina.
- Insights → app: o app roda as regras de `insights/src/regras.ts` sobre o banco (`insights/src/banco.ts`, via `app/src/lib/dados.ts`, etiqueta de cache `historico`); `insights/saida/insights.json` é o plano B (tipos em `insights/src/tipos.ts`). Gravou no banco? `updateTag("historico")`.
- Relógio → app: `wearable/saida/relogio.json` (tipo `RelogioJson` em `wearable/src/tipos.ts`). Rota futura `/api/relogio/sync` recebe um `Lote` (`{dias, eventos}`) e usa `mesclar` + `montarRelogio`.
- Banco: entrada grava `documento` + `observacao`; médico, MCP e API leem **só** por `acessar_historico(token)`, que confere o consentimento e grava o log. Tipos em `lib/types.ts`, contrato em `supabase/README.md`.

## Divisão atual (09/11 à noite)
- **Felipe: `app/` (branch `b/app`). João: `wearable/` (branch `a/relogio`).** (trocado em 09/11 à noite; antes era o inverso)
- **Acesso total para os dois** (GitHub e Supabase): qualquer um pode editar qualquer arquivo (inclusive este e o `docs/contexto.md`) e fazer merge na `main` sem pedir aprovação.

## Sincronizar sempre (regra do time)
**O time trabalha de forma assíncrona: ninguém avisa ninguém para dar pull. Quem sincroniza é o Claude de cada um, sozinho, sem esperar pedido.**
- **Claude: antes de QUALQUER mudança** (arquivo, commit, migration, e no começo de cada sessão ou tarefa nova), rode `git fetch` e traga a `main` do GitHub para a branch em que está (`git merge origin/main`). Se vier algo novo, leia o que mudou (`git log`, `CLAUDE.md`, `docs/contexto.md`, `supabase/migrations/`) antes de continuar. Nunca termine uma resposta dizendo "avise o outro para dar pull": a regra é esta aqui.
- **Antes de mexer no banco:** além do pull, compare `list_migrations` com `supabase/migrations/` (ver "Banco").
- **Antes de começar (à mão):** `git checkout main && git pull`, depois volte para a sua branch e `git merge main`.
- **Depois de cada merge/push:** `git fetch && git log --oneline -3 origin/main` para conferir que a versão no GitHub é a esperada, e rode o teste/typecheck da pasta que mudou.
- Ao editar `CLAUDE.md` ou `docs/contexto.md`, faça pull imediatamente antes e push logo depois (são os arquivos que os dois mexem).

## Banco (Supabase `hub-saude`, compartilhado)
Projeto `eimnpafybehiylzukoja` (organização LEPoli, São Paulo), o mesmo para os dois e para o Claude de cada um. O `.mcp.json` já configura o servidor do Supabase preso a este projeto: cada um autentica uma vez com a própria conta.
- **Chaves:** URL e chave publicável no `.env.example` (são públicas). `SUPABASE_SERVICE_ROLE_KEY` só no `.env.local`, na Vercel ou nas variáveis da sessão na nuvem; nunca no Git nem no navegador.
- **Nota do médico:** `registrar_nota(token, itens)` grava recomendações em `nota_medico` (só com consentimento aprovado e válido); o paciente lê pelo servidor.
- **Envio de exame** (`/enviar`, 11/11): arquivo no bucket **privado** `documentos` (`enviados/<uuid>.<ext>`), leitura guardada na tabela `envio` até o paciente salvar; aí vira `documento` (origem `upload_pdf`/`upload_foto`, `sha256`) + `observacao`. Só o servidor (service_role). Lógica em `app/src/lib/envio.ts`; limite `ENVIO_LIMITE_HORA` (10/h) e `ENVIO_DESLIGADO=1`.
- **Plano do paciente:** tabela `plano_paciente` (título, passos, `seguindo`): o plano que o paciente cria no chat ("Criar plano com esta conversa", rota `/api/plano`) e vê em `/plano`. Só o servidor lê e grava; é sugestão de IA, separado da `nota_medico`.
- **Consentimento:** o médico pede pelo telefone (`solicitar_acesso`) ou o paciente gera QR (`criar_consentimento`); o paciente aprova/recusa (`responder_solicitacao`) e revoga (`revogar_consentimento`). Revogar corta médico, MCP e API na hora. Telefone fictício do Roberto: (11) 98765-4321.
- **Mudar estrutura** (tabela, coluna, função, permissão): sempre migration NOVA em `supabase/migrations/`, aplicada no Supabase (`apply_migration`) e commitada na mesma hora, com o arquivo renomeado para a versão que o Supabase registrou. Nunca editar migration já aplicada.
- **Antes de mexer na estrutura:** `git pull` e comparar `list_migrations` com a pasta. Divergência = alguém esqueceu de commitar ou aplicar.
- **Permissões:** o projeto nega EXECUTE à chave pública por padrão. Função nova pública precisa de `grant execute ... to anon` explícito; função que cria, aprova ou revoga consentimento NUNCA vai para anon.
- **Dados de teste** podem ser criados e apagados; não apague o Roberto (para restaurar: `node supabase/seed/gerar-seed.mjs` e aplicar o `supabase/seed.sql`).

## Regras de trabalho
- **Mudou o prompt de extração?** Suba `PROMPT_VERSAO` em `extraction/src/prompt.ts` e rode todos os testes (sintéticos, reais e vacinas) antes de juntar na `main`.
- **Custo de API:** testes pagos só com estimativa antes; resultados ficam em cache (nunca `--refazer` sem motivo).
- **Privacidade:** nada de `dados-reais/` em commits; conferir antes de cada commit. Nunca mostrar CPF/CNS em saídas.
- Branch por tarefa, merge na `main` pelo menos 1x por dia, sempre funcionando.
- Nunca commitar chaves: use `.env.local` (no `.gitignore`); na Vercel, a chave vai no painel.
- Textos do app em português do Brasil.
- Quinta 12/11 à noite: congelar funcionalidades. Depois disso, só correção e ensaio.
