# Estado do projeto e próximos passos (09/11/2026, noite)

## O que temos
| Peça | Situação | Observação |
|---|---|---|
| Gerador de laudos sintéticos | ✅ pronto | `tools/gerador-laudos/` (laudos, fotos, carteiras de vacinação + gabaritos) |
| Relógio sintético | ✅ pronto | `wearable/` (180 dias da persona, 5 avisos de ritmo irregular, simulador de sincronização) |
| Extrator dos laudos (API do Claude) | ✅ pronto | `extraction/`, ~US$ 0,003/laudo (Haiku). **Roda só pelo terminal**, ainda não pelo app |
| Dados do relógio | ✅ pronto | não usa IA: o dado já chega organizado e passa por regras (custo zero) |
| Interpretador (recomendações) | ✅ pronto | `insights/` (exames + vacinas) e regras do relógio (`wearable/`), que cruzam com os exames |
| Banco de dados | ✅ no ar | Supabase, Roberto carregado, consentimento do médico. **Ninguém grava nem lê dele ainda** |
| Site | ✅ 3 telas | Início, Detalhe do exame, Relógio. **Lê arquivos JSON, não o banco** |

## O esqueleto está pronto?
Os ossos estão prontos, as articulações não. Hoje:
```
laudo --(terminal)--> extração --> JSON --> insights --> JSON --> site
                                                   banco (isolado, só com o Roberto)
```
O produto:
```
foto/PDF no app --> extração --> banco --> insights + regras do relógio --> telas
relógio --> rota de sincronização --> banco          médico (link com consentimento) --> banco
```

## O que falta (ordem de importância para a demo)
1. **Enviar exame pelo app:** foto/PDF → extração → tela de conferência → grava no banco. Momento "uau" da demo.
2. **Site lê do banco** em vez dos JSON (sem isso, exame enviado não aparece na hora).
3. **Visão do médico:** link com consentimento, lendo do banco por `acessar_historico(token)`.
4. **Tela de Vacinação:** os dados já estão no `insights.json`, falta só a tela.
5. **Rota de sincronização do relógio** (`/api/relogio/sync`) gravando no banco. Na demo, o simulador resolve.

## Sugestão de divisão (para não mexer no mesmo arquivo)
- **João:** 1 (conhece a extração) e 5 (relógio).
- **Felipe:** 2 e 3 (conhece o banco e o consentimento).
- **4:** quem terminar primeiro.

Regra de sempre: `git pull` antes de começar e conferir `git log origin/main` depois de cada push.
