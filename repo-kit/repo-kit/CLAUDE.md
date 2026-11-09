# Hub de Saúde Pessoal — Hackathon Gama House × Desafio Rivio

O Claude Code lê este arquivo automaticamente. O contexto completo está em `docs/contexto.md`.

## O que estamos construindo
Um app com IA que junta o histórico de saúde de uma pessoa (exames em PDF ou foto, vacinas, remédios, dados de relógio) num lugar só, organiza tudo numa linha do tempo, avisa quando é hora de ir ao médico e compartilha um resumo com o médico mediante consentimento (como no open finance).

- **Entrega:** sábado 14/11/2026, live demo de 10 min para a Rivio.
- **Dados:** SOMENTE sintéticos ou do próprio time. Nada de dados reais de terceiros.
- **Diferencial:** confiança e rastreabilidade. Todo número no app aponta para o documento original. Alertas são regras explicáveis, nunca diagnóstico.

## Stack
- Next.js + TypeScript (App Router), Tailwind, Recharts, PWA mobile-first
- Supabase (Postgres + Storage + Auth + RLS), região São Paulo
- API do Claude para extração (visão + saída estruturada em JSON)
- Deploy na Vercel; a `main` sempre funcionando

## Estrutura do repositório
```
app/                 # Next.js (telas)
lib/                 # código compartilhado (tipos, cliente Supabase)
extraction/          # P1: documento -> dados (prompt, schema, normalização)
insights/            # P2: dados -> informação (áreas, tendências, resumo, chat)
wearable/            # P4: relógio + regras de alerta
sharing/             # P4: consentimento, link, log de acesso
tools/gerador-laudos/# laudos sintéticos + gabarito (dados de teste)
supabase/migrations/ # SQL das tabelas
docs/                # contexto, decisões, roteiro da demo
```

## Time (cada um é dono de uma pasta)
- **P1 · Exames:** documento -> dados -> banco (`extraction/`, `supabase/`)
- **P2 · Inteligência:** dados -> informação (`insights/`)
- **P3 · Produto:** informação -> telas (`app/`)
- **P4 · Relógio, alertas, compartilhamento + pitch** (`wearable/`, `sharing/`)

## Regras de trabalho
- Uma branch por tarefa (`p1/extracao-prompt`, `p3/tela-inicio`...), Pull Request para a `main`.
- Não mexa na pasta de outra pessoa sem combinar.
- Tipos compartilhados ficam em `lib/types.ts`. Mudou um tipo? Avise o time.
- Nunca commitar chaves: use `.env.local` (já no `.gitignore`).
- Textos do app em português do Brasil.
- Quinta 12/11 à noite: congelar funcionalidades. Depois disso, só correção.
