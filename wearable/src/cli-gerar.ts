/**
 * npm run gerar  →  wearable/saida/relogio.json (180 dias da persona + alertas)
 * Opções: --seed=42  --hoje=2026-11-09  --sem-exames (não cruza com insights.json)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FIM, SEED, gerarPersona } from "./gerar";
import { montarRelogio } from "./regras";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
export const SAIDA = join(RAIZ, "saida", "relogio.json");
const INSIGHTS = join(RAIZ, "..", "insights", "saida", "insights.json");

export function carregarInsights(desligado = false) {
  if (desligado || !existsSync(INSIGHTS)) return null;
  return JSON.parse(readFileSync(INSIGHTS, "utf-8"));
}

export function opcao(nome: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${nome}=`))?.split("=")[1];
}

export function salvar(json: unknown) {
  mkdirSync(dirname(SAIDA), { recursive: true });
  writeFileSync(SAIDA, JSON.stringify(json, null, 2) + "\n", "utf-8");
}

function principal() {
  const seed = Number(opcao("seed") ?? SEED);
  const hoje = opcao("hoje") ?? FIM;
  const insights = carregarInsights(process.argv.includes("--sem-exames"));
  const lote = gerarPersona(seed);
  const rel = montarRelogio(lote, hoje, "sintetico", `${hoje}T07:00`, insights);
  salvar(rel);

  const r = rel.resumo;
  console.log(`Relógio sintético: ${rel.dias.length} dias (${rel.periodo.inicio} a ${rel.periodo.fim}), ${rel.eventos.length} avisos de ritmo irregular`);
  console.log(`  FC repouso 14d: ${r.fc_repouso.atual_14d} bpm (base ${r.fc_repouso.linha_base}, ${r.fc_repouso.linha_base_periodo})`);
  console.log(`  VFC 14d: ${r.vfc_ms.atual_14d} ms (base ${r.vfc_ms.linha_base}) | sono 14d: ${r.sono_horas.atual_14d} h | passos 30d: ${r.passos.atual_30d} (antes ${r.passos.anterior_90d})`);
  console.log(`  dias sem dado (30d): ${r.dias_sem_dado_30d} | exames cruzados: ${insights ? "sim" : "não"}`);
  console.log(`\n${rel.alertas.length} alertas:`);
  for (const a of rel.alertas) {
    console.log(`  [${a.nivel}] ${a.titulo}\n     ${a.motivo}\n     → ${a.recomendacao}`);
    for (const c of a.contexto_exames ?? []) console.log(`     exame: ${c}`);
  }
  console.log(`\nSalvo em ${SAIDA}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) principal();
