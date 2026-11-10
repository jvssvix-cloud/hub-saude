/**
 * Confere que os insights calculados a partir do BANCO são iguais aos calculados a partir do gabarito (JSON).
 *   npm run conferir-banco                      (hoje = 2026-11-09, igual ao cli.ts)
 * Precisa de NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local da raiz. Só lê; custo zero.
 */
import { isDeepStrictEqual } from "node:util";
import { carregarDoBanco, conexaoDoAmbiente } from "./banco";
import { carregarDoGabarito, carregarVacinasDoGabarito } from "./carregar";
import { gerarInsights, HOJE_PADRAO } from "./regras";

// carrega o .env.local da raiz (mesmo esquema da extração)
for (const nome of [".env.local", ".env"]) {
  try { process.loadEnvFile(new URL(`../../${nome}`, import.meta.url)); } catch { /* sem arquivo */ }
}

const hoje = process.argv.find((a) => a.startsWith("--hoje="))?.split("=")[1] ?? HOJE_PADRAO;
const c = conexaoDoAmbiente();
if (!c) {
  console.error("Falta SUPABASE_SERVICE_ROLE_KEY (ou NEXT_PUBLIC_SUPABASE_URL) no .env.local da raiz.");
  process.exit(1);
}

const g = carregarDoGabarito();
const doJson = gerarInsights(g.laudos, g.paciente, hoje, carregarVacinasDoGabarito());
const b = await carregarDoBanco(c);
const doBanco = gerarInsights(b.laudos, b.paciente, hoje, b.doses);

console.log(`Banco: ${b.laudos.length} laudos, ${b.laudos.reduce((n, l) => n + l.resultados.length, 0)} resultados, ${b.doses.length} doses.`);
console.log(`JSON:  ${g.laudos.length} laudos, ${g.laudos.reduce((n, l) => n + l.resultados.length, 0)} resultados.`);

const diferencas = (Object.keys(doJson) as (keyof typeof doJson)[]).filter((k) => !isDeepStrictEqual(doJson[k], doBanco[k]));
if (diferencas.length === 0) {
  console.log("OK: insights do banco = insights do JSON.");
} else {
  console.error(`DIFERENTE em: ${diferencas.join(", ")}`);
  for (const k of diferencas) {
    const a = JSON.stringify(doJson[k]), z = JSON.stringify(doBanco[k]);
    let i = 0;
    while (i < a.length && a[i] === z[i]) i++;
    console.error(`  ${k}: JSON  …${a.slice(Math.max(0, i - 80), i + 80)}`);
    console.error(`  ${k}: banco …${z.slice(Math.max(0, i - 80), i + 80)}`);
  }
  process.exit(1);
}
