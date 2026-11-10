// Copia para dentro do app os dados que vêm das outras pastas do repositório:
//   insights/saida/insights.json            -> src/dados/insights.json  (o que as telas desenham)
//   tools/gerador-laudos/saida/laudos/*.pdf -> public/laudos/            (documento original de cada número)
//   tools/gerador-laudos/saida/vacinas/*.pdf-> public/vacinas/
// Roda sozinho antes de `npm run dev` e `npm run build` (predev/prebuild). As cópias não vão para o Git.
// Quando o banco entrar no app, só esta etapa muda.
import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAIZ = path.resolve(APP, "..");

const copias = [
  ["insights/saida/insights.json", "src/dados/insights.json"],
  ["tools/gerador-laudos/saida/laudos", "public/laudos"],
  ["tools/gerador-laudos/saida/vacinas", "public/vacinas"],
];

for (const [de, para] of copias) {
  const origem = path.join(RAIZ, de);
  if (!existsSync(origem)) {
    console.error(`[copiar-dados] não achei ${de}. Rode "cd insights && npm run insights" ou confira o repositório.`);
    process.exit(1);
  }
  mkdirSync(path.dirname(path.join(APP, para)), { recursive: true });
  cpSync(origem, path.join(APP, para), { recursive: true });
}
console.log("[copiar-dados] insights.json e laudos copiados para o app");
