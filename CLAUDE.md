# Hub de Saúde Pessoal — Hackathon Gama House × Desafio Rivio

O Claude Code lê este arquivo automaticamente. O contexto completo (estratégia, cronograma, decisões) está em `docs/contexto.md`.

## O que estamos construindo
Um app com IA que junta o histórico de saúde de uma pessoa (exames em PDF ou foto) num lugar só, mostra a evolução de cada exame ao longo dos anos ao lado da faixa de referência e gera um link de consentimento para o médico ver um resumo, com cada número apontando para o documento original.

- **Entrega:** sábado 14/11/2026, live demo de 10 min para a Rivio.
- **Time:** 2 pessoas, prazo curto. **Cortar escopo é sempre a opção certa**: prefira o caminho mais simples que funcione na demo.
- **Dados:** SOMENTE sintéticos ou do próprio time. Nada de dados reais de terceiros.
- **Diferencial:** qualidade da extração + rastreabilidade. Todo número no app aponta para o documento original. Alertas são regras explicáveis, nunca diagnóstico.

## Stack
- Next.js + TypeScript (App Router), Tailwind, Recharts; mobile-first
- Supabase (Postgres + Storage), região São Paulo. **Sem Auth/RLS no MVP**: um usuário de demonstração (a persona).
- API do Claude para extração (visão + saída estruturada em JSON)
- Deploy na Vercel; a `main` sempre funcionando

## Estrutura do repositório
```
app/                 # Next.js (telas e rotas de API)
lib/                 # código compartilhado (types.ts, cliente Supabase)
extraction/          # documento -> dados (prompt, schema, normalização, script de acurácia)
insights/            # regras: status, exame repetido, "o que falta", resumo do médico
supabase/migrations/ # SQL das tabelas
tools/gerador-laudos/# laudos sintéticos + gabarito (PRONTO; ver README da pasta)
docs/                # contexto, decisões, roteiro da demo, prompts usados
```

## Quem faz o quê
- **A · Dados e IA (João):** `extraction/`, `insights/`, `tools/`, pitch.
- **B · Produto (amigo):** `app/`, `supabase/`, deploy.
- `lib/types.ts` é dos dois: mudou um tipo, avise o outro.

## Contrato entre extração e app
O formato de saída da extração é o mesmo do gabarito do gerador (`tools/gerador-laudos/saida/gabarito/*.json`, documentado no README da pasta). O app pode usar esses JSONs como dados de mentira desde o primeiro dia.

No banco, o contrato é `supabase/README.md` + `lib/types.ts`: a entrada grava `documento` + `observacao`; todo consumidor externo (médico, MCP, API) lê só por `acessar_historico(token)`, que confere o consentimento e grava o log. `supabase/seed.sql` (gerado do gabarito) carrega o Roberto inteiro.

## Regras de trabalho
- Uma branch por pessoa/tarefa (`a/extracao`, `b/telas`...). Merge na `main` pelo menos 1x por dia, sempre funcionando.
- Nunca commitar chaves: use `.env.local` (já no `.gitignore`).
- Textos do app em português do Brasil.
- Quinta 12/11 à noite: congelar funcionalidades. Depois disso, só correção e ensaio.
