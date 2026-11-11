// Conta de demonstração: cria (ou atualiza) o usuário DEMO_EMAIL / DEMO_SENHA no Supabase Auth e liga ao Roberto
// (paciente.usuario_id). Idempotente: rodar de novo só confere a senha e o vínculo.
//
//   node scripts/criar-conta-demo.mjs
//
// Lê o .env.local da raiz do repositório. Se DEMO_EMAIL/DEMO_SENHA não existirem, gera uma senha aleatória e grava
// as duas variáveis no .env.local (nunca no código nem no .env.example). Não imprime a senha.
// Na Vercel: copie DEMO_EMAIL e DEMO_SENHA do .env.local para o painel (Environment Variables).
import { randomBytes } from "node:crypto";
import { appendFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ENV = path.join(RAIZ, ".env.local");
if (existsSync(ENV)) process.loadEnvFile(ENV);

const PACIENTE = "persona-roberto";
// mesmo padrão de src/lib/supabase-publico.ts (a URL é pública)
const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "https://eimnpafybehiylzukoja.supabase.co";
const CHAVE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!CHAVE) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY no .env.local.");

let email = process.env.DEMO_EMAIL;
let senha = process.env.DEMO_SENHA;
if (!email || !senha) {
  email ??= "roberto.demo@example.com";
  senha ??= randomBytes(18).toString("base64url");
  appendFileSync(ENV, `\n# Conta de demonstração (Roberto), criada por app/scripts/criar-conta-demo.mjs\nDEMO_EMAIL=${email}\nDEMO_SENHA=${senha}\n`);
  console.log("DEMO_EMAIL e DEMO_SENHA gravados no .env.local");
}

const h = { apikey: CHAVE, Authorization: `Bearer ${CHAVE}`, "Content-Type": "application/json" };

async function chamar(metodo, caminho, corpo) {
  const r = await fetch(`${URL_SB}${caminho}`, { method: metodo, headers: h, body: corpo && JSON.stringify(corpo) });
  const texto = await r.text();
  if (!r.ok) throw new Error(`${metodo} ${caminho.split("?")[0]}: ${r.status} ${texto.slice(0, 200)}`);
  return texto ? JSON.parse(texto) : null;
}

async function acharUsuario() {
  for (let pagina = 1; pagina < 50; pagina++) {
    const { users } = await chamar("GET", `/auth/v1/admin/users?page=${pagina}&per_page=200`);
    const u = users.find((x) => x.email?.toLowerCase() === email.toLowerCase());
    if (u || users.length < 200) return u ?? null;
  }
  return null;
}

let usuario = await acharUsuario();
if (usuario) {
  await chamar("PUT", `/auth/v1/admin/users/${usuario.id}`, { password: senha, email_confirm: true });
  console.log("usuário de demonstração já existia: senha conferida");
} else {
  usuario = await chamar("POST", "/auth/v1/admin/users", { email, password: senha, email_confirm: true });
  console.log("usuário de demonstração criado");
}

await chamar("PATCH", `/rest/v1/paciente?id=eq.${PACIENTE}`, { usuario_id: usuario.id });
const ligado = await chamar("GET", `/rest/v1/paciente?id=eq.${PACIENTE}&select=id,usuario_id`);
if (ligado[0]?.usuario_id !== usuario.id) throw new Error("não conseguiu ligar a conta ao Roberto");
console.log(`ligado ao paciente ${PACIENTE}`);
