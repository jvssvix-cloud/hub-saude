# Banco: o contrato entre entrada e saídas

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
| `paciente` | A persona (`persona-roberto`) |
| `documento` | Origem de cada dado: `tipo`, `origem` (canal de entrada), `emissor`, `data`, `arquivo` no Storage |
| `observacao` | Fato atômico. `categoria` = exame / vacina / wearable; `codigo` = analito, vacina ou métrica. Colunas com os mesmos nomes de `extraction/src/schema.ts` e `insights/src/tipos.ts` |
| `consentimento` | Grant: destinatário, escopo (`categorias`, `codigos`, `desde`; null = tudo), `expira_em`, `revogado_em`, `token` |
| `log_acesso` | Toda tentativa, permitida ou negada, com motivo e quantas observações saíram |

Funções:

| Função | Quem chama | Para quê |
|---|---|---|
| `solicitar_acesso(telefone, nome, motivo, ...)` | tela do médico (anon) | Pede acesso; devolve um token que só funciona depois de aprovado |
| `responder_solicitacao(id, aprovar, ...)` | app do paciente (service_role) | Aprova (pode estreitar escopo e validade) ou recusa |
| `criar_consentimento(...)` | app do paciente (service_role) | QR: consentimento já aprovado |
| `revogar_consentimento(id)` | app do paciente (service_role) | Corta na hora |
| `acessar_historico(token, consumidor, ...)` | médico, MCP, API (anon) | Único caminho de leitura |

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

**Segurança no MVP:** sem Auth. As tabelas têm RLS ligado e **nenhuma política**, então a chave anon (que vai
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
   `20261109220145_solicitacao_medico.sql`, `20261109220204_permissoes_supabase.sql`.
2. Cole `seed.sql` (Roberto: 14 documentos, 188 resultados de exame, 17 doses de vacina).
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
