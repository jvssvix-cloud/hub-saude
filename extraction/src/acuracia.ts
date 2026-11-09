/**
 * Mede a acurácia da extração contra o gabarito do gerador de laudos.
 *   npm run acuracia                       # todos os laudos, PDF e fotos
 *   npm run acuracia -- --modo=pdf         # só PDFs (ou --modo=foto)
 *   npm run acuracia -- --somente=2016-03,2025-03
 *   npm run acuracia -- --modelo=claude-haiku-5-5   # outro modelo (cache separado)
 *   npm run acuracia -- --esforco=high     # outro nível de esforço (cache separado)
 *   npm run acuracia -- --refazer          # ignora o cache e chama a API de novo
 *
 * Cada extração fica salva em extraction/resultados/cache/ e só é paga uma vez.
 * Relatório: extraction/resultados/relatorio_<modelo>_<esforco>.md
 */
import { exigirChave, RAIZ } from "./env";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { extrairDocumento, MODELO_PADRAO, mimeDoArquivo, type Esforco, type ResultadoExtracao } from "./extrair";
import { chaveUnidade } from "./normalizar";
import type { ResultadoNormalizado } from "./schema";

const DIR_GERADOR = path.join(RAIZ, "tools/gerador-laudos/saida");
const DIR_RES = path.join(RAIZ, "extraction/resultados");
const DIR_CACHE = path.join(DIR_RES, "cache");

const args = process.argv.slice(2);
const opcao = (n: string) => args.find((a) => a.startsWith(`--${n}=`))?.split("=")[1];
const MODO = opcao("modo") ?? "todos";
const SOMENTE = opcao("somente")?.split(",");
const ESFORCO = (opcao("esforco") ?? "medium") as Esforco;
const MODELO = opcao("modelo") ?? MODELO_PADRAO;
const SUFIXO = `${MODELO.replace("claude-", "")}_${ESFORCO}`;
const REFAZER = args.includes("--refazer");
const PARALELO = 4;

type ResultadoGabarito = {
  analito: string; nome_impresso: string; valor_impresso: string; valor_canonico: number;
  unidade_impressa: string; ref_min_canonico: number | null; ref_max_canonico: number | null;
  fora_da_faixa: boolean; pagina: number;
};
type Gabarito = {
  laudo_id: string; arquivo_pdf: string; fotos: { arquivo: string; pagina: number }[];
  documento: { layout: string; data_coleta: string; nome_paciente_impresso: string };
  resultados: ResultadoGabarito[];
};
type Tarefa = { gab: Gabarito; modo: "pdf" | "foto"; arquivos: string[] };

const CAMPOS = ["valor", "unidade", "nome", "referencia", "fora_da_faixa", "pagina"] as const;
type Campo = (typeof CAMPOS)[number];
type Erro = { laudo: string; modo: string; layout: string; analito: string; campo: string; esperado: string; obtido: string };

// ---------- comparação ----------
const igualNum = (a: number | null, b: number | null) =>
  a === null || b === null ? a === b : Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b));
const texto = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

function comparar(esp: ResultadoGabarito, obt: ResultadoNormalizado): Record<Campo, [boolean, string, string]> {
  const ref = (min: number | null, max: number | null) => `${min ?? "-"}..${max ?? "-"}`;
  return {
    valor: [igualNum(obt.valor_canonico, esp.valor_canonico), String(esp.valor_canonico), `${obt.valor_canonico} (lido "${obt.valor_impresso}")`],
    unidade: [chaveUnidade(obt.unidade_impressa) === chaveUnidade(esp.unidade_impressa), esp.unidade_impressa, obt.unidade_impressa],
    nome: [texto(obt.nome_impresso) === texto(esp.nome_impresso), esp.nome_impresso, obt.nome_impresso],
    referencia: [
      igualNum(obt.ref_min_canonico, esp.ref_min_canonico) && igualNum(obt.ref_max_canonico, esp.ref_max_canonico),
      ref(esp.ref_min_canonico, esp.ref_max_canonico), ref(obt.ref_min_canonico, obt.ref_max_canonico),
    ],
    fora_da_faixa: [obt.fora_da_faixa === esp.fora_da_faixa, String(esp.fora_da_faixa), String(obt.fora_da_faixa)],
    pagina: [obt.pagina === esp.pagina, String(esp.pagina), String(obt.pagina)],
  };
}

// ---------- execução ----------
async function extrairComCache(t: Tarefa): Promise<ResultadoExtracao> {
  const arq = path.join(DIR_CACHE, `${t.gab.laudo_id}_${t.modo}_${SUFIXO}.json`);
  if (!REFAZER && existsSync(arq)) return JSON.parse(readFileSync(arq, "utf-8"));
  const r = await extrairDocumento(
    t.arquivos.map((a) => ({ dados: readFileSync(a), mime: mimeDoArquivo(a) })),
    { esforco: ESFORCO, modelo: MODELO },
  );
  writeFileSync(arq, JSON.stringify(r, null, 2));
  return r;
}

async function emParalelo<T, R>(itens: T[], n: number, f: (x: T) => Promise<R>): Promise<(R | Error)[]> {
  const out: (R | Error)[] = new Array(itens.length);
  let prox = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (prox < itens.length) {
      const i = prox++;
      try { out[i] = await f(itens[i]); } catch (e) { out[i] = e as Error; }
    }
  }));
  return out;
}

function pct(a: number, b: number) {
  return b ? `${((100 * a) / b).toFixed(1)}%` : "-";
}

async function main() {
  mkdirSync(DIR_CACHE, { recursive: true });
  const gabaritos: Gabarito[] = readdirSync(path.join(DIR_GERADOR, "gabarito"))
    .filter((f) => f.endsWith(".json")).sort()
    .map((f) => JSON.parse(readFileSync(path.join(DIR_GERADOR, "gabarito", f), "utf-8")))
    .filter((g: Gabarito) => !SOMENTE || SOMENTE.includes(g.laudo_id));

  const tarefas: Tarefa[] = [];
  for (const g of gabaritos) {
    if (MODO !== "foto") tarefas.push({ gab: g, modo: "pdf", arquivos: [path.join(DIR_GERADOR, g.arquivo_pdf)] });
    if (MODO !== "pdf" && g.fotos.length) {
      const fotos = [...g.fotos].sort((a, b) => a.pagina - b.pagina).map((f) => path.join(DIR_GERADOR, f.arquivo));
      tarefas.push({ gab: g, modo: "foto", arquivos: fotos });
    }
  }
  const faltam = tarefas.filter((t) => REFAZER || !existsSync(path.join(DIR_CACHE, `${t.gab.laudo_id}_${t.modo}_${SUFIXO}.json`)));
  if (faltam.length) exigirChave();
  console.log(`${tarefas.length} extrações (${faltam.length} novas na API, ${tarefas.length - faltam.length} do cache), modelo ${MODELO}, esforço ${ESFORCO}...`);

  const resultados = await emParalelo(tarefas, PARALELO, extrairComCache);

  // Agregação: por modo e por layout
  type Placar = { esperados: number; encontrados: number; extras: number; campos: Record<Campo, number> };
  const novo = (): Placar => ({ esperados: 0, encontrados: 0, extras: 0, campos: Object.fromEntries(CAMPOS.map((c) => [c, 0])) as Record<Campo, number> });
  const placares = new Map<string, Placar>();
  const pegar = (k: string) => placares.get(k) ?? (placares.set(k, novo()), placares.get(k)!);
  const erros: Erro[] = [];
  const falhas: string[] = [];
  const docErros: string[] = [];
  let custo = 0;
  let alertas = 0;

  resultados.forEach((r, i) => {
    const t = tarefas[i];
    const id = `${t.gab.laudo_id} (${t.modo})`;
    if (r instanceof Error) { falhas.push(`${id}: ${r.message}`); return; }
    custo += r.uso.custo_usd;
    const layout = t.gab.documento.layout;
    const chaves = ["total", `modo ${t.modo}`, `layout ${layout}`, `layout ${layout} / ${t.modo}`];
    const obtidos = new Map<string, ResultadoNormalizado>();
    for (const o of r.normalizado.resultados) {
      alertas += o.alertas.length;
      if (o.analito === "outro" || obtidos.has(o.analito)) { chaves.forEach((k) => pegar(k).extras++); continue; }
      obtidos.set(o.analito, o);
    }
    for (const o of obtidos.keys()) {
      if (!t.gab.resultados.some((e) => e.analito === o)) chaves.forEach((k) => pegar(k).extras++);
    }
    const d = r.normalizado.documento;
    if (d.data_coleta !== t.gab.documento.data_coleta) docErros.push(`${id}: data ${d.data_coleta} (esperado ${t.gab.documento.data_coleta})`);
    if (texto(d.nome_paciente_impresso ?? "") !== texto(t.gab.documento.nome_paciente_impresso))
      docErros.push(`${id}: paciente "${d.nome_paciente_impresso}" (esperado "${t.gab.documento.nome_paciente_impresso}")`);

    for (const esp of t.gab.resultados) {
      const obt = obtidos.get(esp.analito);
      chaves.forEach((k) => pegar(k).esperados++);
      if (!obt) {
        erros.push({ laudo: t.gab.laudo_id, modo: t.modo, layout, analito: esp.analito, campo: "NÃO ENCONTRADO", esperado: esp.valor_impresso, obtido: "-" });
        continue;
      }
      chaves.forEach((k) => pegar(k).encontrados++);
      const cmp = comparar(esp, obt);
      for (const c of CAMPOS) {
        const [ok, e, o] = cmp[c];
        if (ok) chaves.forEach((k) => pegar(k).campos[c]++);
        else erros.push({ laudo: t.gab.laudo_id, modo: t.modo, layout, analito: esp.analito, campo: c, esperado: e, obtido: o });
      }
    }
  });

  // Relatório
  const L: string[] = [];
  const tot = pegar("total");
  const camposOk = CAMPOS.reduce((s, c) => s + tot.campos[c], 0);
  L.push(`# Acurácia da extração`, ``);
  L.push(`Modelo ${resultados.find((r): r is ResultadoExtracao => !(r instanceof Error))?.modelo ?? "-"}, esforço \`${ESFORCO}\`. ` +
    `${tarefas.length - falhas.length} extrações (${gabaritos.length} laudos). Custo das extrações: ~US$ ${custo.toFixed(2)}.`, ``);
  L.push(`**Valores corretos: ${pct(tot.campos.valor, tot.esperados)}** (${tot.campos.valor} de ${tot.esperados}). ` +
    `Todos os campos: ${pct(camposOk, tot.esperados * CAMPOS.length)}. Exames extras/duplicados: ${tot.extras}. Alertas da normalização: ${alertas}.`, ``);
  L.push(`| Recorte | Exames | Encontrados | ${CAMPOS.join(" | ")} | Extras |`);
  L.push(`|---|---|---|${CAMPOS.map(() => "---").join("|")}|---|`);
  for (const [k, p] of [...placares.entries()].sort(([a], [b]) => (a === "total" ? -1 : b === "total" ? 1 : a.localeCompare(b)))) {
    L.push(`| ${k} | ${p.esperados} | ${pct(p.encontrados, p.esperados)} | ${CAMPOS.map((c) => pct(p.campos[c], p.esperados)).join(" | ")} | ${p.extras} |`);
  }
  if (falhas.length) L.push(``, `## Falhas`, ...falhas.map((f) => `- ${f}`));
  if (docErros.length) L.push(``, `## Erros no cabeçalho do documento`, ...docErros.map((f) => `- ${f}`));
  L.push(``, `## Erros por resultado (${erros.length})`, ``);
  if (erros.length) {
    L.push(`| Laudo | Modo | Layout | Exame | Campo | Esperado | Obtido |`, `|---|---|---|---|---|---|---|`);
    const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " / ");
    for (const e of erros) L.push(`| ${e.laudo} | ${e.modo} | ${e.layout} | ${e.analito} | ${e.campo} | ${esc(e.esperado)} | ${esc(e.obtido)} |`);
  } else L.push("Nenhum.");

  writeFileSync(path.join(DIR_RES, `relatorio_${SUFIXO}.md`), L.join("\n") + "\n");
  writeFileSync(path.join(DIR_RES, `erros_${SUFIXO}.json`), JSON.stringify({ erros, falhas, docErros }, null, 2));
  console.log(L.slice(0, 8 + placares.size).join("\n"));
  console.log(`\nRelatório completo: extraction/resultados/relatorio_${SUFIXO}.md`);
}

await main();
