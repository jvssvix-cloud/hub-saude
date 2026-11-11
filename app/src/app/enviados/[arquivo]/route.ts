/**
 * Documento original de um exame enviado pelo app (bucket privado `documentos`).
 * O endereço é o mesmo que linkLaudo() monta a partir de documento.arquivo ("enviados/<uuid>.pdf"),
 * então "abrir o laudo" funciona igual para o seed (public/laudos) e para os envios.
 *
 * Só abre para:
 * - o paciente dono do documento (sessão), ou
 * - quem tem o token de um consentimento válido (?t=, a visão do médico) cujo escopo inclui este documento.
 *   O token passa por acessar_historico: confere status, validade e revogação, aplica o escopo e grava o log.
 *   Revogou, o link para de abrir na hora (sem cache).
 * Qualquer outro caso responde 404 (não diz se o arquivo existe).
 */
import { baixarArquivo } from "@/lib/envio";
import { pacienteDaSessao } from "@/lib/sessao";
import { getServidor, rpcPublica } from "@/lib/supabase";

const NOME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg|png|webp)$/;
const naoEncontrado = () => new Response("Não encontrado", { status: 404, headers: { "Cache-Control": "no-store" } });

type RespostaToken = { ok: boolean; documentos?: { arquivo: string | null }[] };

async function podeAbrir(caminho: string, token: string | null): Promise<boolean> {
  const [doc] = await getServidor<{ paciente_id: string }[]>(
    `documento?arquivo=eq.${encodeURIComponent(caminho)}&select=paciente_id&limit=1`,
  ).catch(() => []);
  if (!doc) return false;

  const p = await pacienteDaSessao().catch(() => null);
  if (p && p.id === doc.paciente_id) return true;

  if (!token || token.length > 200) return false;
  const r = await rpcPublica<RespostaToken>("acessar_historico", { p_token: token, p_consumidor: "visao_medico" }).catch(
    () => null,
  );
  return !!r?.ok && !!r.documentos?.some((d) => d.arquivo === caminho);
}

export async function GET(req: Request, ctx: RouteContext<"/enviados/[arquivo]">) {
  const { arquivo } = await ctx.params;
  if (!NOME.test(arquivo)) return naoEncontrado();
  const caminho = `enviados/${arquivo}`;
  if (!(await podeAbrir(caminho, new URL(req.url).searchParams.get("t")))) return naoEncontrado();

  const r = await baixarArquivo(caminho);
  if (!r.ok || !r.body) return naoEncontrado();
  return new Response(r.body, {
    headers: {
      "Content-Type": r.headers.get("Content-Type") ?? "application/octet-stream",
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
