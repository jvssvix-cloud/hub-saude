/**
 * Chat do app: recebe a conversa, responde com o Gemini usando o histórico do paciente do app (lib/chat.ts) e devolve
 * também os exames citados na resposta, para a tela mostrar os atalhos (exame -> gráfico -> laudo de origem).
 */
import { responder, temChaveChat, type Mensagem } from "@/lib/chat";
import { carregarInsights } from "@/lib/dados";
import { seriesCitadas } from "@/lib/insights";
import { relogio } from "@/lib/relogio";

const MAX_MENSAGENS = 12;
const MAX_TEXTO = 2000;

export async function POST(req: Request) {
  if (!temChaveChat()) return Response.json({ erro: "sem_chave" }, { status: 503 });

  const corpo = (await req.json().catch(() => null)) as { mensagens?: unknown } | null;
  const mensagens: Mensagem[] = (Array.isArray(corpo?.mensagens) ? corpo.mensagens : [])
    .filter(
      (m): m is Mensagem =>
        !!m && typeof m === "object" && ["paciente", "assistente"].includes((m as Mensagem).papel) && typeof (m as Mensagem).texto === "string",
    )
    .map((m) => ({ papel: m.papel, texto: m.texto.slice(0, MAX_TEXTO) }))
    .slice(-MAX_MENSAGENS);
  // a conversa enviada ao modelo começa e termina com o paciente
  while (mensagens.length && mensagens[0].papel !== "paciente") mensagens.shift();
  if (!mensagens.length || mensagens[mensagens.length - 1].papel !== "paciente" || !mensagens[mensagens.length - 1].texto.trim()) {
    return Response.json({ erro: "pergunta_vazia" }, { status: 400 });
  }

  const insights = await carregarInsights();
  try {
    const texto = await responder({ insights, relogio, origem: new URL(req.url).origin }, mensagens);
    const exames = seriesCitadas(insights, texto).map((s) => ({ analito: s.analito, nome: s.nome.replace(/ \(.*\)$/, ""), fora: s.alterado }));
    return Response.json({ texto, exames });
  } catch (e) {
    console.error("[chat]", e instanceof Error ? e.message : e);
    return Response.json({ erro: "falha" }, { status: 502 });
  }
}
