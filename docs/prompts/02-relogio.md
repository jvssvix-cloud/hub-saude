# Prompt 02 — Relógio (wearable sintético + regras de alerta)

> Para quem vai construir: abra o Claude Code na pasta do repositório, crie a branch (`git checkout -b b/relogio`) e cole o texto abaixo.
> Não precisa de chave da API: tudo aqui é código e dados sintéticos, **custo zero**.

---

Leia o `CLAUDE.md` e o `docs/contexto.md` antes de tudo. Vamos construir a pasta `wearable/`: dados sintéticos do relógio da persona + regras de alerta explicáveis. **Antes de escrever código, me mostre o plano (arquivos, formato e regras) e espere meu ok.**

## Contexto
- A persona é o Roberto (`tools/gerador-laudos/persona.py`): homem, 58 anos, LDL e glicose subindo há anos.
- Integração real com Apple/Google não é viável até sábado (exige app nativo). Por isso: **dados sintéticos realistas**, gerados por código determinístico (mesma seed = mesmos dados).
- O diferencial do produto é **cruzar relógio com exames** e **explicar cada alerta**. Nunca dar diagnóstico.

## O que construir
1. **Stack:** TypeScript + `tsx`, igual a `insights/` (copie o `package.json` e o `tsconfig.json` de lá como modelo). Scripts: `npm run gerar`, `npm run alertas`, `npm test`, `npm run typecheck`.
2. **Gerador (`src/gerar.ts`)**: 180 dias, de **2026-05-14 a 2026-11-09**, seed fixa. Métricas diárias:
   - `fc_repouso` (bpm): ~62 estável até agosto e subindo devagar até ~71 em novembro;
   - `vfc_ms` (variabilidade cardíaca, RMSSD): ~42 caindo para ~30;
   - `sono_horas`: ~7,0 caindo para ~5,8 nas últimas 6 semanas;
   - `passos`: ~8.000, menos nos fins de semana, caindo para ~5.000 em out/nov;
   - ruído realista e alguns dias sem dado (relógio esquecido no carregador).
   - **Eventos**: avisos de ritmo irregular (como os relógios dão), **0 até setembro e 5 entre 20/10 e 08/11**, com data e hora (madrugada/repouso).
3. **Regras (`src/regras.ts`)**, cada uma com limiar no código, fácil de ler:
   - **ritmo irregular:** ≥ 3 avisos em 14 dias → atenção "procure um cardiologista";
   - **FC de repouso subindo:** média dos últimos 14 dias ≥ 5 bpm acima da média dos 60 dias anteriores;
   - **sono curto:** média de 14 dias < 6 h;
   - **atividade caindo:** média de passos de 30 dias ≥ 25% abaixo dos 90 dias anteriores;
   - dias sem dado não entram nas médias.
   Cada alerta traz: `id`, `titulo`, `nivel` ("atencao" | "info"), `motivo` (frase simples com os números), `evidencias` (os dados que dispararam: datas e valores), `recomendacao` e o aviso "Isto não é diagnóstico".
4. **Cruzamento com exames (opcional, se der tempo):** ler `insights/saida/insights.json` (se existir) e, no alerta de ritmo irregular, adicionar `contexto_exames` com as áreas em atenção (ex.: "LDL alto e glicose subindo nos exames de 2026"). Nada de diagnóstico: só "vale levar isso ao médico".
5. **Saída:** `wearable/saida/relogio.json` no formato abaixo (o app vai ler este arquivo).
6. **Testes:** cada regra com um caso que dispara e um que não dispara.
7. **README** com comandos e o formato. Registre as decisões estruturais no `CLAUDE.md` e no `docs/contexto.md` (faça `git pull` logo antes de editá-los).

## Formato da saída (contrato com o app — não mude sem combinar)
```ts
type RelogioJson = {
  gerado_em: string;                 // AAAA-MM-DD
  fonte: "sintetico";                // depois: "apple_saude"
  paciente_id: "persona-roberto";
  periodo: { inicio: string; fim: string };
  dias: { data: string; fc_repouso: number | null; vfc_ms: number | null; sono_horas: number | null; passos: number | null }[];
  eventos: { data_hora: string; tipo: "ritmo_irregular"; detalhe: string }[];
  resumo: {                           // para os cartões da tela
    fc_repouso: { atual_14d: number; anterior_60d: number };
    sono_horas: { atual_14d: number };
    passos: { atual_30d: number; anterior_90d: number };
    eventos_ritmo_14d: number;
  };
  alertas: {
    id: string; titulo: string; nivel: "atencao" | "info"; motivo: string;
    evidencias: { data: string; valor: string }[];
    recomendacao: string; aviso: "Isto não é diagnóstico.";
    contexto_exames?: string[];
  }[];
};
```

## Regras do repositório
- Textos em português do Brasil. Dados 100% fictícios.
- Branch `b/relogio`; commits pequenos; ao final, `git push -u origin b/relogio`. O merge na `main` é feito junto com o João.
- Evite mexer em `app/`, `extraction/` e `insights/` enquanto o João trabalha neles (para não dar conflito). Sempre `git pull` antes e confira `git log origin/main` depois de cada push.
