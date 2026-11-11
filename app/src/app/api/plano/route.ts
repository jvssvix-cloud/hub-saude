/**
 * "Criar plano" do chat: a conversa vira um plano curto (título + passos), gerado pelo Gemini com o histórico do paciente,
 * e é salvo em plano_paciente. A tela Plano lista, deixa marcar "seguindo" e apagar.
 */
import { montarPlano, temChaveChat, type Mensagem } from "@/lib/chat";
import { carregarInsights } from "@/lib/dados";
import { relogioDe } from "@/lib/relogio";
import { escreverServidor, temChaveServidor } from "@/lib/supabase";
import { pacienteDaSessao } from "@/lib/sessao";

const MAX_MENSAGENS = 12;
const MAX_TEXTO = 2000;

export async function POST(req: Request) {
  if (!temChaveChat()) return Response.json({ erro: "sem_chave" }, { status: 503 });
  if (!temChaveServidor()) return Response.json({ erro: "sem_banco" }, { status: 503 });
  const p = await pacienteDaSessao();
  if (!p) return Response.json({ erro: "sem_sessao" }, { status: 401 });

  const corpo = (await req.json().catch(() => null)) as { mensagens?: unknown } | null;
  const mensagens: Mensagem[] = (Array.isArray(corpo?.mensagens) ? corpo.mensagens : [])
    .filter(
      (m): m is Mensagem =>
        !!m && typeof m === "object" && ["paciente", "assistente"].includes((m as Mensagem).papel) && typeof (m as Mensagem).texto === "string",
    )
    .map((m) => ({ papel: m.papel, texto: m.texto.slice(0, MAX_TEXTO) }))
    .slice(-MAX_MENSAGENS);
  while (mensagens.length && mensagens[0].papel !== "paciente") mensagens.shift();
  // o plano nasce de uma conversa que já teve resposta
  if (mensagens.length < 2 || mensagens[mensagens.length - 1].papel !== "assistente") {
    return Response.json({ erro: "sem_conversa" }, { status: 400 });
  }

  let plano;
  try {
    const insights = await carregarInsights(p.id);
    plano = await montarPlano({ insights, relogio: relogioDe(p.id), origem: new URL(req.url).origin }, mensagens);
  } catch (e) {
    console.error("[plano] geração:", e instanceof Error ? e.message : e);
    return Response.json({ erro: "falha" }, { status: 502 });
  }

  try {
    const [linha] = await escreverServidor<{ id: string }[]>("POST", "plano_paciente", {
      paciente_id: p.id, titulo: plano.titulo, itens: plano.itens, origem: "chat",
    });
    return Response.json({ id: linha.id, titulo: plano.titulo, itens: plano.itens });
  } catch (e) {
    console.error("[plano] gravação:", e instanceof Error ? e.message : e);
    return Response.json({ erro: "nao_salvou" }, { status: 502 });
  }
}
