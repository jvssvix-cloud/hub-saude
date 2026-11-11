// O app importa a extração de ../extraction/src (envio de exame). Na Vercel só o app/ é instalado,
// então aqui instalamos as dependências de extraction/ (SDK da Anthropic + zod) logo depois do `npm install`.
// No computador de cada um, extraction/node_modules já existe (npm install lá) e nada é feito.
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const EXTRACAO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../extraction");

if (!process.env.VERCEL && existsSync(path.join(EXTRACAO, "node_modules"))) process.exit(0);
console.log("[instalar-extracao] instalando dependências de extraction/");
execSync("npm ci --omit=dev --no-audit --no-fund", { cwd: EXTRACAO, stdio: "inherit" });
