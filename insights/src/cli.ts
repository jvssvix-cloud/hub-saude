/**
 * Gera os insights da persona e imprime de forma legível.
 *   npm run insights                      (hoje = HOJE_PADRAO, a mesma data fixa do relógio)
 *   npm run insights -- --hoje=2026-11-14 (simular outra data)
 * Também grava o JSON que o app consome em insights/saida/insights.json
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { carregarDoGabarito, carregarVacinasDoGabarito, RAIZ } from "./carregar";
import { gerarInsights, HOJE_PADRAO, mesAno } from "./regras";

const hoje = process.argv.find((a) => a.startsWith("--hoje="))?.split("=")[1] ?? HOJE_PADRAO;
const { laudos, paciente } = carregarDoGabarito();
const i = gerarInsights(laudos, paciente, hoje, carregarVacinasDoGabarito());

const ROTULO = { atencao: "ATENÇÃO", em_dia: "Em dia", sem_dados_recentes: "Sem dados recentes" };
console.log(`\n=== ${paciente.nome} | hoje ${hoje} | ${i.periodo.laudos} laudos ===\n`);

console.log("ÁREAS");
for (const a of i.areas) {
  console.log(`  [${ROTULO[a.status]}] ${a.nome}`);
  for (const m of a.motivos) console.log(`      - ${m}`);
}

console.log("\nSÉRIES (regra 1) e TENDÊNCIAS (regra 4)");
for (const s of i.series) {
  const pts = s.pontos.map((p) => `${p.fora_da_faixa ? "*" : ""}${p.valor}`).join(" ");
  console.log(`  ${s.nome.padEnd(28)} ${pts}`);
  if (s.tendencia) console.log(`  ${"".padEnd(28)} -> ${s.tendencia.texto}`);
}

console.log("\nEXAMES REPETIDOS (regra 5)");
for (const r of i.repeticoes) console.log(`  - ${r.texto}`);
if (!i.repeticoes.length) console.log("  nenhum");

console.log("\nPRÓXIMOS EXAMES (regra 6)");
const pend = i.proximos.filter((p) => p.situacao !== "em_dia");
console.log(pend.length ? pend.map((p) => `  - ${p.nome}: ${p.situacao}`).join("\n")
  : `  todos em dia (próximo previsto: ${mesAno(i.proximos.map((p) => p.previsto).sort()[0])})`);

if (i.vacinacao) {
  console.log(`\nVACINAÇÃO (${i.vacinacao.doses.length} doses consolidadas; ${i.vacinacao.fonte})`);
  const R = { em_dia: "Em dia", atencao: "ATENÇÃO", informativo: "Info", fora_do_calendario: "-" };
  for (const v of i.vacinacao.situacao) console.log(`  [${R[v.status]}] ${v.nome}: ${v.texto}`);
}

console.log("\nRESUMO PARA O MÉDICO (regra 7)\n");
for (const l of i.resumo_medico) console.log(`  ${l}`);

const dir = path.join(RAIZ, "insights/saida");
mkdirSync(dir, { recursive: true });
writeFileSync(path.join(dir, "insights.json"), JSON.stringify(i, null, 2));
console.log(`\n(* = fora da referência)  JSON para o app: insights/saida/insights.json`);
