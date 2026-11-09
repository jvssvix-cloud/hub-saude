/** Carrega .env.local da raiz do repositório (só nos scripts; no Next.js isso é automático). */
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

for (const nome of [".env.local", ".env"]) {
  const p = path.join(RAIZ, nome);
  if (existsSync(p)) process.loadEnvFile(p);
}

export function exigirChave() {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    console.error(
      "Falta a chave da API. Copie .env.example para .env.local na raiz do repositório e preencha\n" +
        "ANTHROPIC_API_KEY=sk-ant-...  (o .env.local é ignorado pelo Git e não vai para o GitHub)",
    );
    process.exit(1);
  }
}
