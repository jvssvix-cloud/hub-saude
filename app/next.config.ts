import { existsSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

// Raiz do repositório: o app importa as regras de insights/ (../insights/src) e lê o .env.local da raiz,
// o mesmo que extração e insights usam. Na Vercel as variáveis vêm do painel.
const RAIZ = path.resolve(__dirname, "..");
for (const nome of [".env.local", ".env"]) {
  const p = path.join(RAIZ, nome);
  if (existsSync(p)) process.loadEnvFile(p);
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: RAIZ,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
