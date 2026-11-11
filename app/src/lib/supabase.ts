/**
 * Chamadas ao Supabase sem SDK (fetch puro), em dois níveis:
 * - rpcPublica: chave publicável. Só alcança as funções liberadas para anon (solicitar_acesso,
 *   acessar_historico, situacao_acesso), que conferem o token. Pode rodar no navegador.
 * - rpcServidor / getServidor: chave secreta (service_role). Ações do paciente (aprovar, recusar, revogar)
 *   e leituras das próprias tabelas. SÓ SERVIDOR.
 */

import "server-only";
import { CHAVE_PUBLICA, SUPABASE_URL } from "@/lib/supabase-publico";

export { CHAVE_PUBLICA, SUPABASE_URL };

function cabecalhos(chave: string) {
  return { apikey: chave, Authorization: `Bearer ${chave}`, "Content-Type": "application/json" };
}

async function resposta<T>(r: Response, onde: string): Promise<T> {
  if (!r.ok) throw new Error(`Supabase ${r.status} em ${onde}: ${(await r.text()).slice(0, 200)}`);
  return r.json() as Promise<T>;
}

export async function rpcPublica<T>(funcao: string, args: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${funcao}`, {
    method: "POST",
    headers: cabecalhos(CHAVE_PUBLICA),
    body: JSON.stringify(args),
    cache: "no-store",
  });
  return resposta<T>(r, funcao);
}

export function temChaveServidor(): boolean {
  return !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

function chaveServidor(): string {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY no .env.local (raiz do repositório) ou no painel da Vercel.");
  return k;
}

export async function rpcServidor<T>(funcao: string, args: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${funcao}`, {
    method: "POST",
    headers: cabecalhos(chaveServidor()),
    body: JSON.stringify(args),
    cache: "no-store",
  });
  return resposta<T>(r, funcao);
}

export async function getServidor<T>(caminho: string): Promise<T> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${caminho}`, { headers: cabecalhos(chaveServidor()), cache: "no-store" });
  return resposta<T>(r, caminho.split("?")[0]);
}

/** Grava, altera ou apaga linhas de uma tabela do paciente (chave secreta). Devolve as linhas afetadas. */
export async function escreverServidor<T>(metodo: "POST" | "PATCH" | "DELETE", caminho: string, corpo?: unknown): Promise<T> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${caminho}`, {
    method: metodo,
    headers: { ...cabecalhos(chaveServidor()), Prefer: "return=representation" },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
    cache: "no-store",
  });
  return resposta<T>(r, caminho.split("?")[0]);
}
