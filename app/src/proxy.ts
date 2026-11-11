/**
 * Proxy (o antigo middleware): renova o cookie da sessão do paciente e faz a checagem otimista de login.
 * Sem sessão: páginas vão para /entrar e rotas de API respondem 401. Com sessão, /entrar volta para o Início.
 * A checagem de verdade fica perto dos dados (pacienteAtual / pacienteDaSessao em lib/sessao.ts).
 *
 * Fora do proxy (não mudam, sem login): área do médico (/medico), conector MCP (/api/mcp, por token) e arquivos
 * estáticos (laudos de demonstração, /enviados/<uuid>.pdf que o médico abre pelo link).
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { CHAVE_PUBLICA, SUPABASE_URL } from "@/lib/supabase-publico";

export async function proxy(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const sb = createServerClient(SUPABASE_URL, CHAVE_PUBLICA, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (lista) => {
        for (const { name, value } of lista) req.cookies.set(name, value);
        res = NextResponse.next({ request: req });
        for (const { name, value, options } of lista) res.cookies.set(name, value, { ...options, httpOnly: true });
      },
    },
  });

  const { data } = await sb.auth.getClaims();
  const logado = !!data?.claims?.sub;
  const p = req.nextUrl.pathname;

  if (p === "/entrar") return logado ? redirecionar(req, "/", res) : res;
  if (p === "/termos") return res; // pública: o check-up abre os termos em outra aba
  if (logado) return res;
  if (p.startsWith("/api/")) return Response.json({ erro: "sem_sessao" }, { status: 401 });
  return redirecionar(req, "/entrar", res);
}

/** Redireciona levando junto os cookies que o Supabase acabou de renovar. */
function redirecionar(req: NextRequest, para: string, de: NextResponse) {
  const url = req.nextUrl.clone();
  url.pathname = para;
  url.search = "";
  const r = NextResponse.redirect(url);
  for (const c of de.cookies.getAll()) r.cookies.set(c);
  return r;
}

export const config = {
  matcher: ["/((?!_next/|api/mcp/|medico|favicon\\.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
