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

Funções: `acessar_historico` (anon pode chamar), `criar_consentimento` e `revogar_consentimento` (só service_role).

**Segurança no MVP:** sem Auth. As tabelas têm RLS ligado e **nenhuma política**, então a chave anon (que vai
para o navegador do médico e para o MCP) não lê nada direto, só via `acessar_historico` com token válido.
O servidor do app usa a service_role para gravar e para as telas do paciente. Nunca mande a service_role para o navegador.

## Subir

1. Supabase na nuvem (região São Paulo) → SQL Editor → cole `migrations/20261109000000_contrato.sql`.
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

Testado em Postgres (PGlite): escopo, filtro que só estreita, token inválido, revogação imediata,
expiração, log de permitidos e negados, anon sem leitura direta.
