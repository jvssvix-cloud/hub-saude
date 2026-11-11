/**
 * Sessão do paciente (Supabase Auth, e-mail e senha). SÓ SERVIDOR.
 *
 * O @supabase/ssr só cuida do login e do cookie da sessão (httpOnly, lido aqui no servidor). Tudo o mais continua com
 * fetch puro (lib/supabase.ts). O navegador nunca fala com o Supabase direto: nem a chave pública lê as tabelas.
 *
 * - usuarioAtual(): quem está logado (ou null).
 * - pacienteAtual(): o paciente da conta. Sem sessão -> /entrar; check-up não concluído (sem paciente ou sem
 *   perfil_saude.checkup_concluido_em) -> /checkup. Para páginas e Server Actions.
 * - pacienteDaSessao(): igual, mas devolve null em vez de redirecionar. Para rotas de API (respondem 401).
 * - contaAtual(): para o próprio check-up (conta com ou sem paciente).
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

type LinhaConta = PacienteDaConta & {
  sexo: "M" | "F";
  perfil_saude: { checkup_concluido_em: string | null } | { checkup_concluido_em: string | null }[] | null;
};

/** O paciente da conta e se o check-up já foi concluído (perfil_saude.checkup_concluido_em). */
const contaDoUsuario = cache(async (usuarioId: string) => {
  const [p] = await getServidor<LinhaConta[]>(
    `paciente?usuario_id=eq.${encodeURIComponent(usuarioId)}&select=id,nome,sexo,perfil_saude(checkup_concluido_em)`,
  );
  if (!p) return { paciente: null, sexo: null, concluido: false };
  const perfil = Array.isArray(p.perfil_saude) ? p.perfil_saude[0] : p.perfil_saude;
  return { paciente: { id: p.id, nome: p.nome }, sexo: p.sexo, concluido: !!perfil?.checkup_concluido_em };
});

/** Para o check-up: a conta logada, com ou sem paciente, com ou sem check-up concluído. Sem sessão -> /entrar. */
export async function contaAtual() {
  const u = await usuarioAtual();
  if (!u) redirect("/entrar");
  return { usuario: u, ...(await contaDoUsuario(u.id)) };
}

/** Paciente da sessão para as rotas de API: null sem sessão ou com o check-up por fazer (a rota responde 401). */
export async function pacienteDaSessao(): Promise<PacienteDaConta | null> {
  const u = await usuarioAtual();
  if (!u) return null;
  const c = await contaDoUsuario(u.id);
  return c.concluido ? c.paciente : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Para as ações que recebem o id de um consentimento do navegador (aprovar, recusar, revogar, desconectar):
 * confere que ele é do paciente da sessão. Sem isso, um paciente aprovaria o pedido feito para o telefone de outro.
 * Devolve o id conferido; se não for do paciente, lança erro (a ação não faz nada).
 */
export async function consentimentoDoPaciente(id: FormDataEntryValue | null): Promise<string> {
  const p = await pacienteAtual();
  const v = String(id ?? "");
  if (!UUID.test(v)) throw new Error("consentimento inválido");
  const [c] = await getServidor<{ id: string }[]>(
    `consentimento?id=eq.${v}&paciente_id=eq.${encodeURIComponent(p.id)}&select=id`,
  );
  if (!c) throw new Error("consentimento de outro paciente");
  return c.id;
}

export async function pacienteAtual(): Promise<PacienteDaConta> {
  const u = await usuarioAtual();
  if (!u) redirect("/entrar");
  const c = await contaDoUsuario(u.id);
  if (!c.paciente || !c.concluido) redirect("/checkup");
  return c.paciente;
}
