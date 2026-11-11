# App (Next.js)

Telas do Hub de Saúde, em duas áreas: **paciente** (celular, calma, gráficos; layout em `src/app/(paciente)/`) e **médico** (desktop, denso; em construção). Identidade em `src/app/globals.css`: off-white, bege, verdes sálvia, verde profundo, laranja só para atenção, faixa de 4 cores da Rivio no topo. Só tema claro. Next.js 16 (App Router, Cache Components), Tailwind 4, Recharts. Mobile-first, pt-BR,
tema claro e escuro.

```bash
cd app
npm install
npm run dev        # http://localhost:3000 (copia os dados antes, sozinho)
npm run build      # o que a Vercel roda
npm run typecheck && npm run lint
```

## Conta e sessão do paciente

- **Login:** `/entrar` (entrar, criar conta, "Entrar na demonstração"). Supabase Auth com e-mail e senha; o
  `@supabase/ssr` só cuida do login e do cookie (httpOnly). O resto do app continua com fetch puro.
- **`src/lib/sessao.ts`:** `pacienteAtual()` (páginas e Server Actions: sem sessão → `/entrar`, conta sem paciente →
  `/checkup`) e `pacienteDaSessao()` (rotas de API: `null` → 401). Liga a conta ao paciente por `paciente.usuario_id`.
- **`src/proxy.ts`:** renova o cookie e faz a checagem otimista. Fora dele: `/medico`, `/api/mcp/[token]` e arquivos.
- **Demonstração:** conta ligada ao Roberto. `DEMO_EMAIL` e `DEMO_SENHA` só no `.env.local` da raiz e no painel da
  Vercel (nunca no código nem no `.env.example`). Criar/conferir: `node scripts/criar-conta-demo.mjs` (gera a senha e
  grava no `.env.local` se faltar; não imprime a senha). Sem as duas variáveis, o botão da demonstração não aparece.

## De onde vêm os dados

**Exames e vacinas: do banco (Supabase).** `src/lib/dados.ts` (`meusInsights()` = `carregarInsights(pacienteId)` do
paciente da sessão, só servidor) lê `documento` + `observacao` do paciente com a chave secreta (`insights/src/banco.ts`, API REST, sem biblioteca) e roda as mesmas
regras de `insights/src/regras.ts` na hora. As telas recebem o resultado; nenhuma fala com o banco direto.

- **Variáveis:** `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`. O `next.config.ts` lê o `.env.local` da
  **raiz** do repositório (o mesmo da extração); na Vercel, vão no painel.
- **Plano B:** sem a chave, ou se o banco falhar, usa `src/dados/insights.json` e avisa no log
  (`[dados] banco indisponível`). **Só para o Roberto** (o arquivo é dele); outro paciente recebe erro, nunca os dados dele.
- **Cache por paciente:** o `pacienteId` entra na chave do `use cache` e na etiqueta `historico:<id>`
  (`tagHistorico(id)`), revalida a cada 1h. Quem gravar no banco (envio de exame) chama
  `updateTag(tagHistorico(id))` numa Server Action e a próxima tela daquele paciente já vem com o dado novo.
- **Conferência:** `cd insights && npm run conferir-banco` compara insights do banco com os do JSON (têm que ser iguais).
- O app importa `insights/src` pelo atalho `@insights/*` (`tsconfig.json`), com `turbopack.root` na raiz do repositório.

`scripts/copiar-dados.mjs` roda antes de `dev` e `build` e copia para dentro do app (cópias fora do Git):

- `wearable/saida/relogio.json` → `src/dados/relogio.json` (tela do relógio, ainda por arquivo; gere com `cd wearable && npm run gerar`)
- `insights/saida/insights.json` → `src/dados/insights.json` (plano B acima)
- PDFs dos laudos e carteiras → `public/laudos/`, `public/vacinas/` (cada ponto abre o documento original na página certa)

## Telas

| Rota | O que mostra |
|---|---|
| `/` | **Paciente** · Início: "Como você está" (4 temas em linguagem simples: coração, açúcar, colesterol, sono e movimento), minicurvas dos índices (exames de 10 anos + relógio de 6 meses), outros exames em uma linha. Sem números de cara |
| `/evolucao` | **Paciente** · todos os índices com minicurva e frase curta, agrupados por tema; toque abre o detalhe |
| `/exames` | **Paciente** · os laudos originais (data, laboratório, abrir PDF) e o aviso de exame feito duas vezes |
| `/exame/[analito]` | **Paciente (aprofundar)** · Detalhe: último valor, tendência, gráfico de 10 anos com a faixa de referência **de cada laudo**, pontos fora em destaque, lista de cada resultado com o laudo e a página de origem |
| `/relogio` | **Paciente** · Relógio: alertas (motivo, recomendação, o que os exames mostram), cartões, gráficos de 6 meses de FC de repouso (com a base e os avisos de ritmo), variabilidade, sono e passos. Lê `wearable/saida/relogio.json` |
| `/compartilhar` | **Paciente** · pedidos de acesso chegando (atualiza a cada 3 s): escolher o que compartilhar (exames, vacinas, relógio) e Autorizar/Recusar; quem pode ver agora (Encerrar acesso); últimos acessos (log). Precisa da `SUPABASE_SERVICE_ROLE_KEY` no servidor |
| `/medico` | **Médico** · pedido de acesso pelo telefone do paciente (`solicitar_acesso`, chave pública) |
| `/conversar` | **Paciente** · chat com os próprios dados (Gemini, `GEMINI_API_KEY`): perguntas sugeridas a partir do histórico; cada resposta traz atalhos para os exames citados. Rota `/api/chat` |
| `/plano` | **Paciente** · recomendações do médico ("Revisado por"), **Seus planos** (criados no chat por `/api/plano`, tabela `plano_paciente`: seguir um por vez, apagar, atalhos para os exames citados) e próximos exames de rotina |
| `/conectar-ia` | **Paciente** · cria a conexão do assistente de IA (qual, o que pode ler, prazo), mostra o endereço do conector, desconecta e lista as leituras por IA |
| `/api/mcp/[token]` | **Conector MCP** (Streamable HTTP, só leitura): `resumo_de_saude`, `listar_exames`, `historico_do_exame`, `vacinas`, `relogio`. Cada chamada confere o consentimento e grava o log (`consumidor = mcp`) |
| `/enviar` | **Paciente** · **Enviar exame**: PDF ou foto (foto reduzida no navegador, até 4 MB) → `/api/enviar` guarda no bucket privado `documentos` e lê com a extração (Claude Haiku) → **prévia** (valores, fora da faixa, avisos: nome diferente do paciente, item não reconhecido) → **Salvar** grava `documento` + `observacao` e chama `updateTag("historico")`; **Descartar** apaga o arquivo. O navegador só manda o id do envio (a leitura fica na tabela `envio`). Mesmo arquivo de novo = aviso (sha256); reenvio de prévia pendente não paga de novo. Limite `ENVIO_LIMITE_HORA` (padrão 10/h) e `ENVIO_DESLIGADO=1`. Lógica em `src/lib/envio.ts` |
| `/enviados/[arquivo]` | Original de um exame enviado (lê do Storage com a chave secreta; nome = UUID). É o endereço que `linkLaudo()` monta, então "abrir o laudo" funciona igual para seed e envios |
| `/medico/acesso/[token]` | **Médico** · espera a aprovação e abre sozinho; painel: indicadores alterados, comparar até 3 séries, correlações relógio × exames, FC de repouso com avisos de ritmo, todos os exames com link para o laudo, resumo pré-consulta. Lê só por `acessar_historico(token)`; `situacao_acesso` a cada 3 s faz a revogação derrubar a tela na hora |

## Vercel

Projeto com **Root Directory = `app`**. O build precisa das pastas `insights/` e `tools/` do repositório
(a Vercel clona o repositório inteiro, então funciona). No painel: `NEXT_PUBLIC_SUPABASE_URL` e
`SUPABASE_SERVICE_ROLE_KEY` (sem elas o site sobe com o plano B, o JSON). O envio de exame precisa também da
`ANTHROPIC_API_KEY`. O app importa `extraction/src` (apelido `@extraction`); como a Vercel só instala o `app/`,
o `postinstall` (`scripts/instalar-extracao.mjs`) instala as dependências de `extraction/` quando roda na Vercel.
`/enviar` é estática: depois de mudar `ANTHROPIC_API_KEY` ou `ENVIO_DESLIGADO`, faça redeploy (a rota `/api/enviar` confere na hora).

## Testado (11/11): enviar exame

Laudo sintético do Roberto (`2026-03_gama.pdf`): 17 resultados lidos em 14 s (US$ 0,003), **17/17 iguais ao seed**
(valor e fora da faixa); salvo aparece em `/documentos` com o original em `/enviados/...`; mesmo arquivo de novo = 409.
Laudo de outra paciente fictícia (`caso-misto.pdf`): aviso de nome, descartar apaga o arquivo; reenvio reaproveita a
leitura (0 s). Arquivo de texto recusado; caminho malicioso em `/enviados/` = 404. Build de produção ok. Dados de teste apagados.

## Testado (10/11): leitura do banco

`conferir-banco` igual ao JSON (12 laudos, 188 resultados, 17 doses); build com URL errada cai no plano B com aviso,
build normal lê do banco sem aviso; `/`, `/exame/hba1c`, `/exame/ldl`, `/relogio` respondem com os dados.

## Testado (09/11)

Tipos, lint e build; as 18 páginas de exame; tocar no ponto abre o laudo certo (2016 → Delta, 2026 → Gama);
os 12 PDFs respondem; exame inexistente mostra página em português; celular (375 px) sem rolagem lateral,
temas claro e escuro.
