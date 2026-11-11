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

// Cabeçalhos de segurança em todas as respostas. Referrer-Policy: o token do médico/MCP está na URL e não pode
// vazar para outros sites pelo Referer. Sem CSP por enquanto (o Next usa scripts inline; entra depois com nonce).
const SEGURANCA = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), interest-cohort=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SEGURANCA }];
  },
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
