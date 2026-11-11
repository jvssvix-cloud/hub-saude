/**
 * Documento original de um exame enviado pelo app (bucket privado `documentos`).
 * O endereço é o mesmo que linkLaudo() monta a partir de documento.arquivo ("enviados/<uuid>.pdf"),
 * então "abrir o laudo" funciona igual para o seed (public/laudos) e para os envios.
 * O nome é um UUID aleatório: só quem recebeu o link (paciente, médico com consentimento) chega aqui.
 */
import { baixarArquivo } from "@/lib/envio";

const NOME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg|png|webp)$/;

export async function GET(_req: Request, ctx: RouteContext<"/enviados/[arquivo]">) {
  const { arquivo } = await ctx.params;
  if (!NOME.test(arquivo)) return new Response("Não encontrado", { status: 404 });
  const r = await baixarArquivo(`enviados/${arquivo}`);
  if (!r.ok || !r.body) return new Response("Não encontrado", { status: 404 });
  return new Response(r.body, {
    headers: {
      "Content-Type": r.headers.get("Content-Type") ?? "application/octet-stream",
      "Content-Disposition": "inline",
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
