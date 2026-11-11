/**
 * Sessão do paciente (Supabase Auth, e-mail e senha). SÓ SERVIDOR.
 *
 * O @supabase/ssr só cuida do login e do cookie da sessão (httpOnly, lido aqui no servidor). Tudo o mais continua com
 * fetch puro (lib/supabase.ts). O navegador nunca fala com o Supabase direto: nem a chave pública lê as tabelas.
 *
 * - usuarioAtual(): quem está logado (ou null).
 * - pacienteAtual(): o paciente da conta. Sem sessão -> /entrar; conta sem paciente (check-up não feito) -> /checkup.
 *   Para páginas e Server Actions.
 * - pacienteDaSessao(): igual, mas devolve null em vez de redirecionar. Para rotas de API (respondem 401).
 *
 * Quem lê a sessão lê cookie: fica dentro de <Suspense> (o (paciente)/loading.tsx já cobre as páginas).
 */
import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { getServidor } from "@/lib/supabase";
import { CHAVE_PUBLICA, SUPABASE_URL } from "@/lib/supabase-publico";

export type Usuario = { id: string; email: string | null };
export type PacienteDaConta = { id: string; nome: string };

/** Cliente do Supabase Auth ligado aos cookies desta requisição. */
export async function clienteAuth() {
  const loja = await cookies();
  return createServerClient(SUPABASE_URL, CHAVE_PUBLICA, {
    cookies: {
      getAll: () => loja.getAll(),
      setAll: (lista) => {
        try {
          for (const { name, value, options } of lista) loja.set(name, value, { ...options, httpOnly: true });
        } catch {
          // Server Component não grava cookie; quem renova a sessão é o proxy (src/proxy.ts).
        }
      },
    },
  });
}

export const usuarioAtual = cache(async (): Promise<Usuario | null> => {
  // o cliente do Supabase usa Date.now() ao validar a sessão: só na hora da requisição, nunca no pré-render
  await connection();
  const sb = await clienteAuth();
  const { data, error } = await sb.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return { id: data.claims.sub, email: typeof data.claims.email === "string" ? data.claims.email : null };
});

const pacienteDoUsuario = cache(async (usuarioId: string): Promise<PacienteDaConta | null> => {
  const [p] = await getServidor<PacienteDaConta[]>(`paciente?usuario_id=eq.${encodeURIComponent(usuarioId)}&select=id,nome`);
  return p ?? null;
});

export async function pacienteDaSessao(): Promise<PacienteDaConta | null> {
  const u = await usuarioAtual();
  return u ? pacienteDoUsuario(u.id) : null;
}

export async function pacienteAtual(): Promise<PacienteDaConta> {
  const u = await usuarioAtual();
  if (!u) redirect("/entrar");
  const p = await pacienteDoUsuario(u.id);
  if (!p) redirect("/checkup");
  return p;
}
