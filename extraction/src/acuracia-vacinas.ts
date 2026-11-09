/**
 * Acurácia da extração de CARTEIRAS DE VACINAÇÃO contra o gabarito do gerador.
 *   npm run acuracia-vacinas
 *   npm run acuracia-vacinas -- --conjunto=reais   (dados-reais/gabarito_vacinas/, fora do Git)
 *   npm run acuracia-vacinas -- --refazer
 * Cada dose do gabarito é procurada na extração pela dupla (vacina, data).
 */
import { exigirChave, RAIZ } from "./env";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { extrairDocumento, MODELO_PADRAO, mimeDoArquivo, type PacienteCadastro, type ResultadoExtracao } from "./extrair";
import { normalizar } from "./normalizar";
import { PROMPT_VERSAO } from "./prompt";
import type { DoseNormalizada } from "./schema";

const args = process.argv.slice(2);
const opcao = (n: string) => args.find((a) => a.startsWith(`--${n}=`))?.split("=")[1];
const REAIS = opcao("conjunto") === "reais";
const REFAZER = args.includes("--refazer");
const DIR_BASE = REAIS ? path.join(RAIZ, "dados-reais") : path.join(RAIZ, "tools/gerador-laudos/saida");
const DIR_RES = REAIS ? path.join(RAIZ, "dados-reais/resultados") : path.join(RAIZ, "extraction/resultados");
const DIR_CACHE = path.join(DIR_RES, "cache");
const SUFIXO = `${MODELO_PADRAO.replace("claude-", "")}_medium_${PROMPT_VERSAO}`;

type DoseGab = {
  vacina: string; nome_impresso: string; dose: string; data: string; lote: string | null; pagina: number;
  /** leituras alternativas aceitas (ex.: dose não impressa, lote com fabricante) */
  aceitos?: { dose?: string[]; lote?: string[]; nome?: string[] };
};
type Gab = {
  documento_id: string; arquivo_pdf: string; fotos: { arquivo: string; pagina: number }[];
  documento: { nome_paciente_impresso: string; paciente?: PacienteCadastro }; doses: DoseGab[];
};
const CAMPOS = ["dose", "lote", "nome", "pagina"] as const;
const t = (s: string | null) => (s ?? "").trim().replace(/\s+/g, " ").toLowerCase();

async function main() {
  mkdirSync(DIR_CACHE, { recursive: true });
  const dirGab = path.join(DIR_BASE, "gabarito_vacinas");
  if (!existsSync(dirGab)) { console.log(`Sem gabaritos em ${dirGab}`); return; }
  const gabs: Gab[] = readdirSync(dirGab).filter((f) => f.endsWith(".json")).sort()
    .map((f) => JSON.parse(readFileSync(path.join(dirGab, f), "utf-8")));
  const tarefas = gabs.flatMap((g) => [
    { g, modo: "pdf", arquivos: [path.join(DIR_BASE, g.arquivo_pdf)] },
    ...(g.fotos.length ? [{ g, modo: "foto", arquivos: g.fotos.map((f) => path.join(DIR_BASE, f.arquivo)) }] : []),
  ]);
  const cacheDe = (x: (typeof tarefas)[number]) => path.join(DIR_CACHE, `${x.g.documento_id}_${x.modo}_${SUFIXO}.json`);
  const novas = tarefas.filter((x) => REFAZER || !existsSync(cacheDe(x)));
  if (novas.length) exigirChave();
  console.log(`${tarefas.length} extrações (${novas.length} novas na API), prompt ${PROMPT_VERSAO}...`);

  const L: string[] = ["# Acurácia: carteiras de vacinação", ""];
  const erros: string[] = [];
  let esperadas = 0, achadas = 0, extras = 0, custo = 0;
  const ok: Record<string, number> = Object.fromEntries(CAMPOS.map((c) => [c, 0]));
  const resultados = await Promise.all(tarefas.map(async (x) => {
    if (!REFAZER && existsSync(cacheDe(x))) return JSON.parse(readFileSync(cacheDe(x), "utf-8")) as ResultadoExtracao;
    const r = await extrairDocumento(x.arquivos.map((a) => ({ dados: readFileSync(a), mime: mimeDoArquivo(a) })),
      { paciente: x.g.documento.paciente });
    writeFileSync(cacheDe(x), JSON.stringify(r, null, 2));
    return r;
  }));
  resultados.forEach((r, i) => {
    const { g, modo } = tarefas[i];
    const id = `${g.documento_id} (${modo})`;
    custo += r.uso.custo_usd;
    const n = normalizar(r.bruto, g.documento.paciente?.nascimento);
    if (n.tipo_documento !== "carteira_vacinacao") erros.push(`${id}: tipo_documento = ${n.tipo_documento}`);
    const usadas = new Set<number>();
    for (const e of g.doses) {
      esperadas++;
      const k = n.doses.findIndex((d, j) => !usadas.has(j) && d.vacina === e.vacina && d.data === e.data);
      if (k < 0) { erros.push(`${id}: NÃO ENCONTRADA ${e.vacina} ${e.data}`); continue; }
      usadas.add(k);
      achadas++;
      const d: DoseNormalizada = n.doses[k];
      const cmp: Record<string, [boolean, string, string]> = {
        dose: [(e.aceitos?.dose ?? [e.dose]).includes(d.dose), e.dose, d.dose],
        lote: [(e.aceitos?.lote ?? [e.lote]).some((l) => t(d.lote) === t(l)), e.lote ?? "-", d.lote ?? "-"],
        nome: [(e.aceitos?.nome ?? [e.nome_impresso]).some((n) => t(d.nome_impresso) === t(n)), e.nome_impresso, d.nome_impresso],
        pagina: [d.pagina === e.pagina, String(e.pagina), String(d.pagina)],
      };
      for (const c of CAMPOS) {
        if (cmp[c][0]) ok[c]++;
        else erros.push(`${id}: ${e.vacina} ${e.data} | ${c}: esperado "${cmp[c][1]}", obtido "${cmp[c][2]}"`);
      }
    }
    for (let j = 0; j < n.doses.length; j++) {
      if (!usadas.has(j)) { extras++; erros.push(`${id}: EXTRA ${n.doses[j].vacina} ${n.doses[j].data}`); }
    }
  });
  const pct = (a: number, b: number) => (b ? `${((100 * a) / b).toFixed(1)}%` : "-");
  L.push(`Prompt \`${PROMPT_VERSAO}\`, ${tarefas.length} extrações. Custo original: ~US$ ${custo.toFixed(3)}.`, "");
  L.push(`**Doses encontradas (vacina + data certas): ${pct(achadas, esperadas)}** (${achadas} de ${esperadas}). Extras: ${extras}.`, "");
  L.push(`| Campo | Acerto |`, `|---|---|`, ...CAMPOS.map((c) => `| ${c} | ${pct(ok[c], esperadas)} |`));
  L.push("", `## Erros (${erros.length})`, ...(erros.length ? erros.map((e) => `- ${e}`) : ["Nenhum."]));
  writeFileSync(path.join(DIR_RES, `relatorio_vacinas_${SUFIXO}.md`), L.join("\n") + "\n");
  console.log(L.join("\n"));
}

await main();
