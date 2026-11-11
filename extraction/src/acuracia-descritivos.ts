/**
 * Acurácia da extração de LAUDOS DESCRITIVOS (ECG, eco, endoscopia, ultrassom) contra o gabarito do gerador.
 *   npm run acuracia-descritivos
 *   npm run acuracia-descritivos -- --refazer
 * Confere: tipo_documento, área, data do exame, página da conclusão e se a conclusão contém os trechos esperados
 * (a conclusão é copiada do laudo; o teste aceita diferença de maiúsculas, acentos e espaços).
 */
import { exigirChave, RAIZ } from "./env";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { extrairDocumento, MODELO_PADRAO, mimeDoArquivo, type PacienteCadastro, type ResultadoExtracao } from "./extrair";
import { normalizar } from "./normalizar";
import { PROMPT_VERSAO } from "./prompt";

const REFAZER = process.argv.includes("--refazer");
const DIR_BASE = path.join(RAIZ, "tools/gerador-laudos/saida");
const DIR_RES = path.join(RAIZ, "extraction/resultados");
const DIR_CACHE = path.join(DIR_RES, "cache");
const SUFIXO = `${MODELO_PADRAO.replace("claude-", "")}_medium_${PROMPT_VERSAO}`;

type Gab = {
  documento_id: string; arquivo_pdf: string; fotos: { arquivo: string; pagina: number }[];
  documento: { paciente?: PacienteCadastro };
  descritivo: { exame_nome: string; area: string; data_exame: string; pagina_conclusao: number; conclusao_contem: string[] };
};
const CAMPOS = ["tipo", "area", "data", "pagina", "conclusao"] as const;
const t = (s: string | null | undefined) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

async function main() {
  mkdirSync(DIR_CACHE, { recursive: true });
  const dirGab = path.join(DIR_BASE, "gabarito_descritivos");
  if (!existsSync(dirGab)) { console.log(`Sem gabaritos em ${dirGab} (rode tools/gerador-laudos/gerar.py)`); return; }
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

  const erros: string[] = [];
  let custo = 0;
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
    const d = n.descritivo;
    const e = g.descritivo;
    const faltam = e.conclusao_contem.filter((x) => !t(d?.conclusao).includes(t(x)));
    const cmp: Record<(typeof CAMPOS)[number], [boolean, string, string]> = {
      tipo: [n.tipo_documento === "laudo_descritivo", "laudo_descritivo", n.tipo_documento],
      area: [d?.area === e.area, e.area, d?.area ?? "-"],
      data: [d?.data_exame === e.data_exame, e.data_exame, d?.data_exame ?? "-"],
      pagina: [d?.pagina_conclusao === e.pagina_conclusao, String(e.pagina_conclusao), String(d?.pagina_conclusao ?? "-")],
      conclusao: [!!d && faltam.length === 0, e.conclusao_contem.join(" / "), d ? `faltou: ${faltam.join(" / ")} | "${d.conclusao}"` : "-"],
    };
    for (const c of CAMPOS) {
      if (cmp[c][0]) ok[c]++;
      else erros.push(`${id} | ${c}: esperado "${cmp[c][1]}", obtido "${cmp[c][2]}"`);
    }
  });
  const pct = (a: number) => `${((100 * a) / tarefas.length).toFixed(1)}%`;
  const L = ["# Acurácia: laudos descritivos", ""];
  L.push(`Prompt \`${PROMPT_VERSAO}\`, ${tarefas.length} extrações. Custo original: ~US$ ${custo.toFixed(3)}.`, "");
  L.push(`| Campo | Acerto |`, `|---|---|`, ...CAMPOS.map((c) => `| ${c} | ${pct(ok[c])} |`));
  L.push("", `## Erros (${erros.length})`, ...(erros.length ? erros.map((e) => `- ${e}`) : ["Nenhum."]));
  writeFileSync(path.join(DIR_RES, `relatorio_descritivos_${SUFIXO}.md`), L.join("\n") + "\n");
  console.log(L.join("\n"));
}

await main();
