/**
 * Mede a acurácia da extração contra o gabarito do gerador de laudos.
 *   npm run acuracia                       # todos os laudos, PDF e fotos
 *   npm run acuracia -- --modo=pdf         # só PDFs (ou --modo=foto)
 *   npm run acuracia -- --somente=2016-03,2025-03
 *   npm run acuracia -- --modelo=claude-haiku-5-5   # outro modelo (cache separado)
 *   npm run acuracia -- --esforco=high     # outro nível de esforço (cache separado)
 *   npm run acuracia -- --refazer          # ignora o cache e chama a API de novo
 *   npm run acuracia -- --conjunto=reais   # laudos reais com gabarito manual (pasta dados-reais/, fora do Git)
 *   npm run acuracia -- --versao=v1        # reavalia leituras feitas com um prompt antigo (só cache)
 *
 * Cada extração fica salva em resultados/cache/ e só é paga uma vez (cache separado por modelo,
 * esforço e versão do prompt). Relatório: resultados/relatorio_<modelo>_<esforco>_<versao>.md
 * Sintéticos: extraction/resultados/. Reais: dados-reais/resultados/ (nunca vai para o GitHub).
 */
import { exigirChave, RAIZ } from "./env";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { extrairDocumento, MODELO_PADRAO, mimeDoArquivo, type Esforco, type PacienteCadastro, type ResultadoExtracao } from "./extrair";
import { PROMPT_VERSAO } from "./prompt";
import { chaveNomeOutro, chaveUnidade, normalizar } from "./normalizar";
import type { ResultadoNormalizado } from "./schema";

const args = process.argv.slice(2);
const opcao = (n: string) => args.find((a) => a.startsWith(`--${n}=`))?.split("=")[1];
const REAIS = opcao("conjunto") === "reais";
// Base dos laudos + gabaritos, e onde ficam cache/relatórios
const DIR_BASE = REAIS ? path.join(RAIZ, "dados-reais") : path.join(RAIZ, "tools/gerador-laudos/saida");
const DIR_RES = REAIS ? path.join(RAIZ, "dados-reais/resultados") : path.join(RAIZ, "extraction/resultados");
const DIR_CACHE = path.join(DIR_RES, "cache");
const MODO = opcao("modo") ?? "todos";
const SOMENTE = opcao("somente")?.split(",");
const ESFORCO = (opcao("esforco") ?? "medium") as Esforco;
const MODELO = opcao("modelo") ?? MODELO_PADRAO;
const VERSAO = opcao("versao") ?? PROMPT_VERSAO;
const SUFIXO = `${MODELO.replace("claude-", "")}_${ESFORCO}_${VERSAO}`;
const REFAZER = args.includes("--refazer");
const PARALELO = 4;

type ResultadoGabarito = {
  analito: string; nome_impresso: string; valor_impresso: string; valor_canonico: number;
  unidade_impressa: string; ref_min_canonico: number | null; ref_max_canonico: number | null;
  fora_da_faixa: boolean; pagina: number;
  /** Quando mais de uma leitura da unidade é correta (ex.: unidade só no cabeçalho da coluna). */
  unidades_aceitas?: string[];
  /** Casos novos (prompt v5+): sinal do resultado, resultado em texto e data por exame. */
  qualificador?: string | null; resultado_texto?: string | null; data_coleta?: string | null;
};
type Gabarito = {
  laudo_id: string; arquivo_pdf: string; fotos: { arquivo: string; pagina: number }[];
  documento: { layout: string; data_coleta: string; nome_paciente_impresso: string; paciente?: PacienteCadastro };
  resultados: ResultadoGabarito[];
  /** Exames FORA do dicionário que a leitura tem de trazer como "outro" (guardados como outros exames). */
  outros?: { nome_impresso: string; valor_impresso: string; unidade_impressa: string; pagina: number; data: string }[];
};
type Tarefa = { gab: Gabarito; modo: "pdf" | "foto"; arquivos: string[]; paciente?: PacienteCadastro };

const CAMPOS = ["valor", "unidade", "nome", "referencia", "fora_da_faixa", "pagina", "data"] as const;
type Campo = (typeof CAMPOS)[number];
type Erro = { laudo: string; modo: string; layout: string; analito: string; campo: string; esperado: string; obtido: string };

// ---------- comparação ----------
const igualNum = (a: number | null, b: number | null) =>
  a === null || b === null ? a === b : Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b));
const texto = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

function comparar(esp: ResultadoGabarito, obt: ResultadoNormalizado, dataDocEsp: string, dataDocObt: string | null): Record<Campo, [boolean, string, string]> {
  const ref = (min: number | null, max: number | null) => `${min ?? "-"}..${max ?? "-"}`;
  // valor = número canônico + sinal ("<", ">") + texto ("NÃO REAGENTE"), quando o gabarito traz esses campos
  const sinalOk = !("qualificador" in esp) || (obt.qualificador ?? null) === (esp.qualificador ?? null);
  const textoOk = !esp.resultado_texto || texto(obt.resultado_texto ?? "") === texto(esp.resultado_texto);
  const fmt = (q: string | null | undefined, v: number | null, t: string | null | undefined) => t ?? `${q ?? ""}${v}`;
  const dataEsp = esp.data_coleta ?? dataDocEsp, dataObt = obt.data_coleta ?? dataDocObt ?? "-";
  return {
    data: [dataObt === dataEsp, dataEsp, dataObt],
    valor: [igualNum(obt.valor_canonico, esp.valor_canonico) && sinalOk && textoOk,
      fmt(esp.qualificador, esp.valor_canonico, esp.resultado_texto), `${fmt(obt.qualificador, obt.valor_canonico, obt.resultado_texto)} (lido "${obt.valor_impresso}")`],
    unidade: [(esp.unidades_aceitas ?? [esp.unidade_impressa]).some((u) => chaveUnidade(obt.unidade_impressa) === chaveUnidade(u)), esp.unidade_impressa, obt.unidade_impressa],
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
  if (VERSAO !== PROMPT_VERSAO) throw new Error(`sem cache da versão ${VERSAO} (o prompt atual é ${PROMPT_VERSAO})`);
  const r = await extrairDocumento(
    t.arquivos.map((a) => ({ dados: readFileSync(a), mime: mimeDoArquivo(a) })),
    { esforco: ESFORCO, modelo: MODELO, paciente: t.paciente },
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
  const gabaritos: Gabarito[] = readdirSync(path.join(DIR_BASE, "gabarito"))
    .filter((f) => f.endsWith(".json")).sort()
    .map((f) => JSON.parse(readFileSync(path.join(DIR_BASE, "gabarito", f), "utf-8")))
    .filter((g: Gabarito) => !SOMENTE || SOMENTE.includes(g.laudo_id));

  // Sexo e nascimento "do cadastro": nos sintéticos vêm da persona; nos reais, do gabarito manual
  const persona = REAIS ? undefined : JSON.parse(readFileSync(path.join(DIR_BASE, "persona.json"), "utf-8"));
  const tarefas: Tarefa[] = [];
  for (const g of gabaritos) {
    const paciente: PacienteCadastro | undefined = g.documento.paciente
      ?? (persona ? { sexo: persona.sexo, nascimento: persona.nascimento } : undefined);
    if (MODO !== "foto") tarefas.push({ gab: g, modo: "pdf", arquivos: [path.join(DIR_BASE, g.arquivo_pdf)], paciente });
    if (MODO !== "pdf" && g.fotos.length) {
      const fotos = [...g.fotos].sort((a, b) => a.pagina - b.pagina).map((f) => path.join(DIR_BASE, f.arquivo));
      tarefas.push({ gab: g, modo: "foto", arquivos: fotos, paciente });
    }
  }
  const faltam = tarefas.filter((t) => REFAZER || !existsSync(path.join(DIR_CACHE, `${t.gab.laudo_id}_${t.modo}_${SUFIXO}.json`)));
  if (faltam.length) exigirChave();
  console.log(`${tarefas.length} extrações (${faltam.length} novas na API, ${tarefas.length - faltam.length} do cache), modelo ${MODELO}, esforço ${ESFORCO}, prompt ${VERSAO}...`);

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
  // exames fora do dicionário: encontrados (nome + página) e com valor, unidade e data certos
  const outros = { esperados: 0, encontrados: 0, certos: 0 };
  const errosOutros: string[] = [];

  resultados.forEach((r, i) => {
    const t = tarefas[i];
    const id = `${t.gab.laudo_id} (${t.modo})`;
    if (r instanceof Error) { falhas.push(`${id}: ${r.message}`); return; }
    custo += r.uso.custo_usd;
    const layout = t.gab.documento.layout;
    const chaves = ["total", `modo ${t.modo}`, `layout ${layout}`, `layout ${layout} / ${t.modo}`];
    // Normaliza de novo a partir do que a IA leu: mudanças nas regras são medidas sem chamar a API
    const norm = normalizar(r.bruto);
    const obtidos = new Map<string, ResultadoNormalizado>();
    // "outro" esperado pelo gabarito: casa por nome normalizado + página e não conta como extra
    const outrosObtidos = norm.resultados.filter((o) => o.analito === "outro");
    const usados = new Set<ResultadoNormalizado>();
    for (const e of t.gab.outros ?? []) {
      outros.esperados++;
      const o = outrosObtidos.find((x) => !usados.has(x) && x.pagina === e.pagina && chaveNomeOutro(x.nome_impresso) === chaveNomeOutro(e.nome_impresso));
      if (!o) { errosOutros.push(`${id}: NÃO ENCONTRADO "${e.nome_impresso}" (p. ${e.pagina})`); continue; }
      usados.add(o);
      outros.encontrados++;
      const valorOk = texto(o.valor_impresso) === texto(e.valor_impresso);
      const unidadeOk = chaveUnidade(o.unidade_impressa) === chaveUnidade(e.unidade_impressa);
      const dataOk = (o.data_coleta ?? norm.documento.data_coleta) === e.data;
      if (valorOk && unidadeOk && dataOk) outros.certos++;
      else errosOutros.push(`${id}: "${e.nome_impresso}" esperado ${e.valor_impresso} ${e.unidade_impressa}, obtido ${o.valor_impresso} ${o.unidade_impressa}${dataOk ? "" : " (data errada)"}`);
    }
    for (const o of norm.resultados) {
      alertas += o.analito === "outro" ? 0 : o.alertas.length; // "fora do dicionário" é esperado nos outros
      if (usados.has(o)) continue;
      if (o.analito === "outro" || obtidos.has(o.analito)) {
        chaves.forEach((k) => pegar(k).extras++);
        if (t.gab.outros) errosOutros.push(`${id}: EXTRA ${o.analito} "${o.nome_impresso}" = ${o.valor_impresso} (p. ${o.pagina})`);
        continue;
      }
      obtidos.set(o.analito, o);
    }
    for (const o of obtidos.keys()) {
      if (!t.gab.resultados.some((e) => e.analito === o)) chaves.forEach((k) => pegar(k).extras++);
    }
    const d = norm.documento;
    if (norm.tipo_documento !== "laudo_exame") docErros.push(`${id}: tipo_documento ${norm.tipo_documento} (esperado laudo_exame)`);
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
      const cmp = comparar(esp, obt, t.gab.documento.data_coleta, norm.documento.data_coleta);
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
  L.push(`Modelo ${resultados.find((r): r is ResultadoExtracao => !(r instanceof Error))?.modelo ?? "-"}, esforço \`${ESFORCO}\`, prompt \`${VERSAO}\`. ` +
    `${tarefas.length - falhas.length} extrações (${gabaritos.length} laudos). Custo original das extrações: ~US$ ${custo.toFixed(2)} (pago uma vez; ${tarefas.length - faltam.length} vieram do cache, sem custo nesta rodada).`, ``);
  L.push(`**Valores corretos: ${pct(tot.campos.valor, tot.esperados)}** (${tot.campos.valor} de ${tot.esperados}). ` +
    `Todos os campos: ${pct(camposOk, tot.esperados * CAMPOS.length)}. Exames extras/duplicados: ${tot.extras}. Alertas da normalização: ${alertas}.`, ``);
  if (outros.esperados) {
    L.push(`**Outros exames (fora do dicionário): encontrados ${outros.encontrados} de ${outros.esperados}; ` +
      `valor, unidade e data certos em ${outros.certos}.**`, ``);
  }
  L.push(`| Recorte | Exames | Encontrados | ${CAMPOS.join(" | ")} | Extras |`);
  L.push(`|---|---|---|${CAMPOS.map(() => "---").join("|")}|---|`);
  for (const [k, p] of [...placares.entries()].sort(([a], [b]) => (a === "total" ? -1 : b === "total" ? 1 : a.localeCompare(b)))) {
    L.push(`| ${k} | ${p.esperados} | ${pct(p.encontrados, p.esperados)} | ${CAMPOS.map((c) => pct(p.campos[c], p.esperados)).join(" | ")} | ${p.extras} |`);
  }
  if (falhas.length) L.push(``, `## Falhas`, ...falhas.map((f) => `- ${f}`));
  if (docErros.length) L.push(``, `## Erros no cabeçalho do documento`, ...docErros.map((f) => `- ${f}`));
  if (errosOutros.length) L.push(``, `## Outros exames: erros (${errosOutros.length})`, ...errosOutros.map((f) => `- ${f}`));
  L.push(``, `## Erros por resultado (${erros.length})`, ``);
  if (erros.length) {
    L.push(`| Laudo | Modo | Layout | Exame | Campo | Esperado | Obtido |`, `|---|---|---|---|---|---|---|`);
    const esc = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " / ");
    for (const e of erros) L.push(`| ${e.laudo} | ${e.modo} | ${e.layout} | ${e.analito} | ${e.campo} | ${esc(e.esperado)} | ${esc(e.obtido)} |`);
  } else L.push("Nenhum.");

  writeFileSync(path.join(DIR_RES, `relatorio_${SUFIXO}.md`), L.join("\n") + "\n");
  writeFileSync(path.join(DIR_RES, `erros_${SUFIXO}.json`), JSON.stringify({ erros, falhas, docErros }, null, 2));
  console.log(L.slice(0, 8 + placares.size).join("\n"));
  console.log(`\nRelatório completo: ${path.relative(RAIZ, path.join(DIR_RES, `relatorio_${SUFIXO}.md`))}`);
}

await main();
