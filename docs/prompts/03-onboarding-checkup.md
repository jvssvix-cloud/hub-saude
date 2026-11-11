# Prompt: onboarding do paciente (conta + check-up inicial)

Escrito em 10/11/2026 para continuar em outra sessão do Claude Code. O `CLAUDE.md` da raiz já é lido sozinho; este
arquivo traz só o que falta: a tarefa, o estado atual e as armadilhas que a sessão anterior encontrou.

## Tarefa

Construir a entrada do **paciente** no app (`hub-saude/app`). O hub do médico **não muda** (continua sem login, pedindo
acesso pelo telefone).

1. **Conta:** criar conta e entrar com e-mail e senha. Só quem entrou vê a área do paciente.
2. **Check-up inicial:** na primeira vez que a pessoa entra, um questionário curto, em blocos, com os dados físicos que
   servem de base para correlações e alertas. Depois fica editável em Mais → "Meu perfil de saúde".
3. **Enviar exames no fim do check-up:** por enquanto só o passo com "Enviar agora" / "Depois" (o envio de exame pelo
   app ainda não existe; é parte do João). Não construir o upload nesta tarefa.

Faça em fatias pequenas, cada uma funcionando antes da próxima (regra do time), nesta ordem:
conta + sessão → paciente da sessão no lugar do paciente fixo → check-up → perfil em Mais → estados vazios.

## Estado atual (10/11, noite)

- Branch `b/app`, igual à `main` no GitHub (`f77d7b2`). Nada pendente de commit.
- Telas do paciente: Início (com cartão "Próximo passo"), Exames (filtros), Conversar (chat Gemini + "Criar plano"),
  Plano, Mais (Relógio, Documentos, Compartilhar, Conectar IA). Ver `app/README.md`.
- **Não existe login.** O app inteiro usa um paciente fixo: `PACIENTE_ID = "persona-roberto"` em
  `app/src/lib/usuario.ts` e `PACIENTE_DEMO` em `insights/src/banco.ts`.
- Tabela `paciente` hoje: `id text`, `nome`, `nascimento`, `sexo ('M'|'F')`, `criado_em`. Sem e-mail, sem telefone
  próprio de login, sem dados físicos.
- Banco: Supabase sem Auth em uso. Tabelas com RLS ligado e **sem políticas**; o servidor do app usa a
  `SUPABASE_SERVICE_ROLE_KEY` (helpers em `app/src/lib/supabase.ts`, com `fetch` puro, sem SDK).

## O que precisa mudar (pontos que quebram se forem esquecidos)

- **Paciente fixo → paciente da sessão.** Arquivos que usam `PACIENTE_ID`: `compartilhar/page.tsx`,
  `conectar-ia/page.tsx`, `api/plano/route.ts`, `NotaDoMedico.tsx`, `PlanosDoPaciente.tsx`, `ProximoPasso.tsx`.
  Trocar por uma função de servidor (ex.: `pacienteAtual()`) que lê a sessão.
- **`carregarInsights()` (`app/src/lib/dados.ts`) usa `"use cache"` e não recebe o paciente.** Com mais de um
  paciente, ele precisa receber o `pacienteId` como argumento (entra na chave do cache), senão um paciente vê os
  dados do outro. `carregarDoBanco(c, pacienteId)` já aceita o id. A etiqueta de cache `historico` também deve ser
  por paciente.
- **Relógio** vem de `relogio.json` (do Roberto). Paciente novo não tem relógio: as telas e o chat precisam tratar
  "sem relógio".
- **Estados vazios.** Paciente novo tem zero exames: Início, Exames, Plano, Documentos, as perguntas sugeridas do
  chat e o cartão "Próximo passo" foram feitos para o Roberto e precisam de um estado "ainda sem exames" que leve ao
  envio.
- **Médico, MCP e link de consentimento não mudam:** leem por `acessar_historico(token)`, que já resolve o paciente
  pelo token. `solicitar_acesso` acha o paciente pelo telefone: paciente novo precisa informar telefone no cadastro
  para o médico conseguir pedir acesso.
- **Roberto continua existindo** como demonstração: prever um "Entrar na demonstração" (ou conta demo) que cai no
  Roberto, para a entrega não depender de cadastro.
- **Rotas de API do paciente** (`/api/chat`, `/api/plano`) hoje respondem sem sessão: passam a exigir sessão.

## Sugestão de desenho (decida e registre no CLAUDE.md e em docs/contexto.md)

- **Auth:** Supabase Auth com e-mail e senha. Sessão em cookie httpOnly lido no servidor. Ligar o usuário ao paciente
  com uma coluna nova (ex.: `paciente.usuario_id uuid unique references auth.users`). O `id` do paciente é `text`
  (o Roberto é `persona-roberto`); para pacientes novos, gerar um id novo.
  **Decidido (Felipe, 10/11):** usar `@supabase/supabase-js` + `@supabase/ssr` **só para o login e a sessão**; o resto
  do app continua com `fetch` direto (`app/src/lib/supabase.ts`), sem migrar. Conferir a compatibilidade do
  `@supabase/ssr` com o Next 16 antes de instalar; se não funcionar, o plano B é o login por chamadas diretas à API de
  autenticação do Supabase.
- **Check-up, em blocos curtos (uma tela por bloco, barra de progresso, tudo opcional menos o bloco 1):**
  1. Básico: nome, data de nascimento, sexo biológico, telefone.
  2. Corpo: altura e peso **obrigatórios** (IMC calculado; decidido pelo Felipe em 11/11), circunferência da
     cintura e pressão habitual opcionais.
  3. Hábitos: fumo, álcool, atividade física por semana, horas de sono.
  4. Condições já diagnosticadas (diabetes, pressão alta, colesterol alto, tireoide, coração, rim, outras) e remédios
     de uso contínuo (texto livre).
  5. Família: infarto ou AVC precoce, diabetes, câncer (quais).
  6. Alergias; para mulheres, gestação e menopausa.
  7. Aceites separados: termos de uso; uso de dados de saúde (LGPD), com data e hora gravadas.
  8. "Enviar exames agora" / "Depois".
- **Onde guardar:** tabela nova (ex.: `perfil_saude`, uma linha por paciente, colunas tipadas + `atualizado_em`), só
  servidor, RLS sem políticas, como `plano_paciente`.
- **Onde o perfil aparece depois (segunda fatia, se der tempo):** no texto das ferramentas
  (`app/src/lib/ferramentas.ts`, usado pelo chat e pelo conector MCP) e no resumo do médico. As regras de alerta em
  `insights/` não precisam mudar nesta tarefa.
- **Identidade:** a nossa (off-white, bege, sálvia, faixa Rivio). Referência de estrutura do cadastro em uma página e
  do questionário por blocos: `docs/benchmark-function-rea.md` (arquivo só local, não vai para o Git).

## Regras e armadilhas

- **Sincronizar sozinho:** antes de qualquer mudança (e no começo de cada fatia), `git fetch` + `git merge origin/main`,
  sem esperar pedido. O time é assíncrono; a regra completa está em "Sincronizar sempre" no `CLAUDE.md`.

- **Banco:** toda mudança é migration NOVA em `supabase/migrations/`, aplicada e commitada na mesma hora, com o nome
  na versão que o Supabase registrar (`list_migrations`). Antes: `git pull` e comparar a lista com a pasta. A
  aplicação pela ferramenta do Supabase (`apply_migration`) pode ser bloqueada pela permissão automática: nesse caso
  peça ao Felipe para autorizar. O banco é compartilhado com o João: registre a mudança no `CLAUDE.md` e
  no `docs/contexto.md` no mesmo commit, que é por onde o Claude dele fica sabendo.
- **Nunca** `grant ... to anon` em função que cria, aprova ou revoga consentimento. A `service_role` nunca vai para o
  navegador.
- **Next.js 16** (`app/AGENTS.md`): ler o guia em `app/node_modules/next/dist/docs/` antes de usar API nova
  (cookies, proxy/middleware, rotas). O app usa `cacheComponents`: o que lê cookie ou cabeçalho fica dentro de
  `<Suspense>` com `await connection()`.
- **Servidor para conferir:** outra sessão costuma estar com o `next dev` na porta 3000. Use a configuração
  `app-prod` do `.claude/launch.json` (build + `next start` na 3100).
- **OneDrive trava o build** (`EPERM unlink` em `app/.next`): apagar `app/.next/server` e `app/.next/static` antes de
  `npm run build`.
- **Chaves:** `.env.local` da raiz tem `SUPABASE_SERVICE_ROLE_KEY` e `GEMINI_API_KEY`. Conferir o `.env.example`
  antes de commitar (uma chave já foi parar lá por engano uma vez).
- **Dados:** só sintéticos ou do próprio time. Contas de teste podem ser criadas e apagadas; não apagar o Roberto.
- **Prazo:** congelar funcionalidades quinta 12/11 à noite; entrega sábado 14/11. Se o tempo apertar, a ordem de
  corte é: bloco 5 e 6 do check-up → perfil nas ferramentas → estados vazios caprichados. Conta, sessão e blocos 1 a 4
  são o mínimo.
- Textos do app em português do Brasil. Rodar `npm run typecheck && npm run lint` em `app/` antes de cada commit.
