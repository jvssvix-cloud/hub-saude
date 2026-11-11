/**
 * Envio de exame, passo 1: recebe o PDF ou a foto (multipart, campo "arquivo"), guarda no Storage, lê com a
 * extração e devolve a PRÉVIA. Nada entra no histórico aqui: quem salva é a ação "Salvar" da tela /enviar.
 */
import { ErroEnvio, lerExame } from "@/lib/envio";
import { pacienteDaSessao } from "@/lib/sessao";

export const maxDuration = 120; // a leitura do Claude leva de 10 a 60 s

export async function POST(req: Request) {
  const p = await pacienteDaSessao();
  if (!p) return Response.json({ erro: "sem_sessao", mensagem: "Entre de novo para enviar." }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const arquivo = form?.get("arquivo");
  if (!(arquivo instanceof File)) return Response.json({ erro: "sem_arquivo", mensagem: "Escolha um arquivo." }, { status: 400 });
  try {
    return Response.json(await lerExame(arquivo, p.id));
  } catch (e) {
    if (e instanceof ErroEnvio) return Response.json({ erro: e.codigo, mensagem: e.message }, { status: e.status });
    console.error("[api/enviar]", e instanceof Error ? e.message : e);
    return Response.json({ erro: "falha", mensagem: "Algo deu errado. Tente de novo." }, { status: 500 });
  }
}
