# Banco: o contrato entre entrada e saídas

> **Para revisar (João / Claude do João), 09/11 noite.** Feito pelo Felipe; tudo já aplicado no Supabase `hub-saude`.
> 1. **Decisão a confirmar: RLS ligado sem políticas.** Muda o "sem RLS" do plano original. Não há login nem
>    regra por usuário: só impede a chave pública (que vai para o navegador do médico e para o MCP) de ler as
>    tabelas direto. Sem isso a revogação seria só visual. O servidor do app usa a service_role e não é afetado.
> 2. **Modelo de dados:** `observacao` usa os mesmos nomes de campos da extração (`schema.ts`) e dos insights
>    (`tipos.ts`); `codigo` = `analito`. O `insights/src/carregar.ts` pode ler do banco sem tradução.
> 3. **Consentimento pelo telefone:** médico pede, paciente aprova no app (fluxo abaixo). Útil para a hora 6
>    (Visão do médico): a tela chama `solicitar_acesso` e depois `acessar_historico`.
> 4. **Onde o relógio entra:** `observacao.categoria = 'wearable'` já existe (ex.: `codigo = 'fc_repouso'`, um
>    por dia), mas o contrato atual do relógio é o arquivo `wearable/saida/relogio.json`. Gravar no banco é opcional.
> 5. **Como conferir:** `list_migrations` no Supabase bate com `supabase/migrations/`; o fim deste README lista o que foi testado.

```
 ENTRADA (A)                            BANCO                              SAÍDAS (B)
 upload PDF/foto ─┐                                                   ┌─► app do paciente (service_role)
 e-mail, Meu SUS ─┼─► extração ─► documento + observacao ◄─ consentimento ─┼─► visão do médico (QR)
 wearable, clínica┘   normaliza                   │                   ├─► MCP (Claude do paciente)
                                                  └─ acessar_historico(token) ─┴─► API
                                                          └─► log_acesso
```

- **A escreve** `documento` + `observacao` (uma linha por resultado, dose ou agregado de wearable).
- **B lê** pelos consumidores externos **só** com `rpc("acessar_historico", { p_token, p_consumidor, ... })`.
  A função confere o consentimento (existe? revogado? expirado?), filtra pelo escopo, grava o log e devolve
  `{ ok, motivo, paciente, documentos, observacoes }`. Revogar corta médico, MCP e API ao mesmo tempo
  porque não há outro caminho.
- Tipos em `lib/types.ts` (espelham as tabelas; mudou um, mude o outro).

## Tabelas

| Tabela | Para quê |
|---|---|
| `paciente` | A persona (`persona-roberto`) e os pacientes com conta. `usuario_id` (uuid, único, → `auth.users`, `on delete set null`) liga a conta do Supabase Auth ao paciente; o paciente só é criado no bloco 1 do check-up |
| `documento` | Origem de cada dado: `tipo`, `origem` (canal de entrada), `emissor`, `data`, `arquivo` no Storage, `sha256` (envios do app: mesmo arquivo não entra duas vezes). Em `observacao`, `codigo = 'outro'` (categoria `exame`) é exame fora do dicionário, com valor/unidade/referência como impressos (as regras ignoram). Laudo descritivo (`tipo = laudo_descritivo`, ECG/eco/endoscopia/imagem): `area`, `exame_nome`, `conclusao` copiada do laudo e `conclusao_pagina`; não tem observação |
| `observacao` | Fato atômico. `categoria` = exame / vacina / wearable; `codigo` = analito, vacina ou métrica. Colunas com os mesmos nomes de `extraction/src/schema.ts` e `insights/src/tipos.ts` |
| `consentimento` | Grant: destinatário, escopo (`categorias`, `codigos`, `desde`; null = tudo), `expira_em`, `revogado_em`, `token` |
| `log_acesso` | Toda tentativa, permitida ou negada, com motivo e quantas observações saíram |
| `nota_medico` | Recomendações que o médico revisou e enviou (`autor_nome`, `itens`); o paciente vê "Revisado por" |
| `envio` | Arquivo enviado pelo app esperando o paciente conferir a prévia (`sha256`, `arquivo` no bucket, `extracao` jsonb, `situacao` lendo/pronto/salvo/descartado/erro). Só o servidor do app (service_role) |
| `perfil_saude` | Check-up inicial (uma linha por paciente): aceites com data e hora (`termos_aceitos_em`, `dados_saude_aceitos_em`, `termos_versao`), altura e peso, hábitos, condições e remédios, família, alergias, gestação/menopausa, `checkup_concluido_em` (null = o app manda de volta ao check-up); desde 11/11 também `remedios_lista`, `internacoes`, `cirurgias`, `medicos`, `familia_parentes` (jsonb) e `coleta` (progresso do /reunir). Só o servidor do app |
| `plano_paciente` | Plano que o paciente salva a partir do chat do app (`titulo`, `itens`, `seguindo`). Só o servidor do app (service_role) lê e grava |

Funções:

| Função | Quem chama | Para quê |
|---|---|---|
| `solicitar_acesso(telefone, nome, motivo, ...)` | tela do médico (anon) | Pede acesso; devolve um token que só funciona depois de aprovado |
| `responder_solicitacao(id, aprovar, ...)` | app do paciente (service_role) | Aprova (pode estreitar escopo e validade) ou recusa |
| `criar_consentimento(...)` | app do paciente (service_role) | QR: consentimento já aprovado |
| `revogar_consentimento(id)` | app do paciente (service_role) | Corta na hora |
| `acessar_historico(token, consumidor, ...)` | médico, MCP, API (anon) | Único caminho de leitura |
| `registrar_nota(token, itens)` | painel do médico (anon) | Grava as recomendações do médico; só com consentimento aprovado e válido (revogado/expirado = recusa) |
| `situacao_acesso(token)` | tela do médico (anon) | Só diz se o acesso vale agora (ok, pendente, revogado...), sem dados e sem log; a tela consulta a cada 3 s |

## Fluxo principal: o médico pede pelo telefone

```
 tela do médico                         app do paciente
 digita (11) 98765-4321 ─► solicitar_acesso ─► consentimento 'pendente' (15 min para responder)
 consulta acessar_historico                    lista pendentes (select, service_role)
   a cada 2 s: 'pendente'                      "Dra. Ana pede seus exames por 24h" [Aprovar] [Recusar]
                                               responder_solicitacao(id, true, ['exame'])
   'ok' + histórico  ◄──────────────────────── 'aprovado', 24h a partir de agora
                                               [Revogar] -> médico, MCP e API: 'revogado'
```

- **Privacidade:** `solicitar_acesso` responde igual exista ou não o telefone, e o pedido para telefone
  desconhecido fica "pendente" até expirar. O pedido não serve para descobrir quem usa o app.
- **Escopo:** o paciente só pode estreitar o que o médico pediu (categorias, exames, validade), nunca ampliar.
- **Na demo:** sem SMS/push de verdade; o app do paciente consulta os pendentes a cada 2 s pelo servidor
  e mostra o pedido na hora. SMS com código fica para a fase 2.
- **Telefone do Roberto (fictício):** `(11) 98765-4321`. Aceita com ou sem máscara/DDI.
- **Limite conhecido:** sem login, qualquer um com a URL pode pedir acesso (só pedir; não ver). Na fase 2 o
  médico se identifica pelo CRM.

**Conta do paciente (11/11):** Supabase Auth com e-mail e senha só para o login do paciente; a sessão fica em
cookie httpOnly e o servidor do app descobre o paciente por `paciente.usuario_id`. As tabelas continuam sem
políticas: o navegador nunca lê o banco direto, nem logado. Médico, MCP e link continuam sem login, por token.

**Segurança no MVP:** As tabelas têm RLS ligado e **nenhuma política**, então a chave anon (que vai
para o navegador do médico e para o MCP) não lê nada direto, só via `acessar_historico` com token válido.
O servidor do app usa a service_role para gravar e para as telas do paciente. Nunca mande a service_role para o navegador.

## Projeto no ar

**Supabase `hub-saude`** (`eimnpafybehiylzukoja`, organização LEPoli, São Paulo), criado em 09/11 com as
3 migrations e o seed do Roberto já aplicados. URL e chave publicável em `.env.example`; a service_role
fica só no `.env.local` de cada um (Project Settings > API Keys).

Testado no projeto real com a chave pública: leitura direta da tabela devolve `[]`; criar/aprovar
consentimento é negado; médico pede pelo telefone → `pendente` → paciente aprova só exames → médico
recebe 188 exames (LDL 2016–2026) → revogado → `revogado`. Verificador de segurança do Supabase: só os
avisos esperados (tabelas sem políticas e as 2 funções públicas, ambos de propósito).

**Pegadinha do Supabase:** funções novas no schema public ganham EXECUTE automático para anon. Por isso a
migration `20261109220204_permissoes_supabase.sql` tira esse padrão. Função nova que deva ser pública
precisa de `grant execute ... to anon` explícito.

## Subir em outro projeto

1. SQL Editor → cole as migrations **em ordem**: `20261109220119_contrato.sql`,
   `20261109220145_solicitacao_medico.sql`, `20261109220204_permissoes_supabase.sql`,
   `20261110152147_situacao_acesso.sql`, `20261110182058_nota_medico.sql`, `20261111010047_plano_paciente.sql`,
   `20261111135221_envio_exame.sql` (também cria o bucket privado `documentos` no Storage),
   `20261111144935_conta_paciente.sql`, `20261111182852_perfil_saude.sql`, `20261111213908_indices_chaves.sql`, `20261111221623_perfil_detalhado.sql`, `20261111223531_laudo_descritivo.sql`.
2. Cole `seed.sql` (Roberto: 14 documentos, 188 resultados de exame, 17 doses de vacina, perfil de saúde com o
   check-up concluído). O seed apaga e recria o Roberto: depois rode `node app/scripts/criar-conta-demo.mjs` para ligar
   de novo a conta de demonstração.
   Para regerar depois que o gabarito mudar: `node supabase/seed/gerar-seed.mjs`.
3. Com Supabase CLI local: `supabase db reset` aplica os dois.

## Exemplos

```ts
// servidor do app (service_role): QR do médico, 24h, tudo
const { data: c } = await admin.rpc("criar_consentimento", {
  p_paciente_id: "persona-roberto", p_destinatario_tipo: "medico", p_destinatario_nome: "Dra. Ana",
});
// QR -> https://<app>/medico/<c.token>

// visão do médico / MCP / API (anon)
const { data } = await anon.rpc("acessar_historico", { p_token: token, p_consumidor: "visao_medico" });
if (!data.ok) mostrarAcessoEncerrado(data.motivo); // "revogado" | "expirado" | "token_invalido"

// paciente revoga
await admin.rpc("revogar_consentimento", { p_id: c.id });
```

```ts
// tela do médico (anon): pedir e esperar
const { data: s } = await anon.rpc("solicitar_acesso", {
  p_telefone: "(11) 98765-4321", p_destinatario_nome: "Dra. Ana", p_motivo: "Consulta cardiologia 14/11",
});
// a cada 2 s: acessar_historico({ p_token: s.token, ... }) até motivo !== "pendente"

// app do paciente (service_role): pendentes e resposta
const { data: pendentes } = await admin.from("consentimento")
  .select("id, destinatario_nome, motivo, categorias, codigos, validade, expira_em")
  .eq("paciente_id", "persona-roberto").eq("status", "pendente").gt("expira_em", new Date().toISOString());
await admin.rpc("responder_solicitacao", { p_id: id, p_aprovar: true, p_categorias: ["exame"] });
```

Testado em Postgres (PGlite), 31 casos: escopo, filtro que só estreita, token inválido, revogação imediata,
expiração, log de permitidos e negados, anon sem leitura direta; pedido pelo telefone (com máscara),
resposta igual para telefone desconhecido, pendente sem dados, anon não aprova, aprovação estreitando escopo,
validade a partir da aprovação, recusa, pedido que expira, não responder duas vezes.
