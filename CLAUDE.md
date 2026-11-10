# Hub de Saúde Pessoal — Hackathon Gama House × Desafio Rivio

O Claude Code lê este arquivo automaticamente. O contexto completo (estratégia, cronograma, decisões) está em `docs/contexto.md`.
**Toda mudança estrutural (pasta nova, decisão, regra, escopo) deve ser registrada aqui e em `docs/contexto.md` na mesma hora.**

## O que estamos construindo
Um app com IA que junta o histórico de saúde de uma pessoa (exames e carteira de vacinação em PDF ou foto, dados do relógio) num lugar só, mostra a evolução de cada exame ao longo dos anos ao lado da faixa de referência, avisa quando é hora de procurar um médico (regras explicáveis) e gera um link de consentimento para o médico ver um resumo, com cada número apontando para o documento original.

- **Entrega:** sábado 14/11/2026, live demo de 10 min para a Rivio.
- **Time:** 2 pessoas, **construindo juntas** com o Claude Code. **Cortar escopo é sempre a opção certa**: o caminho mais simples que funcione na demo.
- **Dados:** SOMENTE sintéticos ou do próprio time. **Dados de terceiros:** só com consentimento explícito, usados só para aprender e **apagados em seguida** (a lição vira código + caso sintético).
- **Diferencial:** qualidade da extração + rastreabilidade. Todo número aponta para o documento original. Alertas são regras explicáveis, nunca diagnóstico.

## Stack
- Front: Next.js + TypeScript (App Router), Tailwind, Recharts; mobile-first. Deploy na Vercel; a `main` sempre funcionando.
- Banco: Supabase (Postgres + Storage), região São Paulo. **Sem Auth/RLS no MVP**: um usuário de demonstração (a persona).
- IA: API do Claude para extração (visão + saída estruturada). **Modelo padrão: Claude Haiku 5.5** (~US$ 0,003/laudo).
- Lovable (parceiro, 100 créditos até sábado): **recomendação** = usar só para a página de apresentação (landing do pitch), não para o app. Ver `docs/contexto.md`.

## Estrutura do repositório
```
app/                  # Next.js (telas e rotas de API) — a criar
extraction/           # documento -> dados: prompt (versionado), schema, normalização, testes de acurácia  [PRONTO]
insights/             # dados -> informação: séries, áreas, tendência, repetição, vacinação, resumo do médico [PRONTO]
wearable/             # relógio: dados sintéticos + regras de alerta — em construção (prompt: docs/prompts/02-relogio.md)
supabase/migrations/  # SQL das tabelas — a criar
tools/gerador-laudos/ # laudos, carteiras de vacinação e casos sintéticos + gabaritos [PRONTO]
dados-reais/          # NUNCA vai para o GitHub (.gitignore): laudos/carteiras reais do time + gabaritos manuais
docs/                 # contexto, decisões, roteiro da demo, prompts usados
```
Cada pasta pronta tem README com comandos. Resumo:
- `cd extraction && npm run acuracia` (laudos sintéticos), `-- --conjunto=reais`, `npm run acuracia-vacinas`
- `cd extraction && npm run extrair -- arquivo.pdf --sexo=M --nascimento=AAAA-MM-DD`
- `cd insights && npm run insights` (gera `insights/saida/insights.json`, que o app consome)
- `cd tools/gerador-laudos && python gerar.py` (determinístico)

## Contrato entre as partes
- Extração → app/banco: formato do gabarito (`tools/gerador-laudos/README.md`) + campos v5 (`qualificador`, `resultado_texto`, `data_coleta` por resultado) e `doses` de vacina.
- Insights → app: `insights/saida/insights.json` (tipos em `insights/src/tipos.ts`).
- Relógio → app: `wearable/saida/relogio.json` (formato em `docs/prompts/02-relogio.md`).

## Divisão atual (09/11 à noite)
- João: `app/` (branch `a/app`). Amigo: `wearable/` (branch `b/relogio`). Só o João edita este arquivo e o `docs/contexto.md`.

## Regras de trabalho
- **Mudou o prompt de extração?** Suba `PROMPT_VERSAO` em `extraction/src/prompt.ts` e rode todos os testes (sintéticos, reais e vacinas) antes de juntar na `main`.
- **Custo de API:** testes pagos só com estimativa antes; resultados ficam em cache (nunca `--refazer` sem motivo).
- **Privacidade:** nada de `dados-reais/` em commits; conferir antes de cada commit. Nunca mostrar CPF/CNS em saídas.
- Branch por tarefa, merge na `main` pelo menos 1x por dia, sempre funcionando.
- Nunca commitar chaves: use `.env.local` (no `.gitignore`); na Vercel, a chave vai no painel.
- Textos do app em português do Brasil.
- Quinta 12/11 à noite: congelar funcionalidades. Depois disso, só correção e ensaio.
