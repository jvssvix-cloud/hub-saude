/**
 * Conector MCP do Zelo (Streamable HTTP, sem sessão): o assistente de IA do paciente (Claude, ChatGPT, Gemini…)
 * conecta nesta URL e lê o histórico que o paciente liberou.
 *
 * O token da URL é o do consentimento (destinatário "ia", criado em /conectar-ia). Cada chamada de ferramenta passa por
 * acessar_historico(token, "mcp"): confere o consentimento, aplica o escopo e grava o log que o paciente vê.
 * Revogou? A próxima chamada já responde "acesso encerrado". Só leitura.
 */
import { FERRAMENTAS, INSTRUCOES, type Contexto } from "@/lib/ferramentas";
import { acessar, SITUACAO_TEXTO } from "@/lib/medico";

const VERSOES = ["2025-06-18", "2025-03-26", "2024-11-05"];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version",
};

type Pedido = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };
type Resposta = { jsonrpc: "2.0"; id: string | number | null; result?: unknown; error?: { code: number; message: string } };

const ok = (id: Pedido["id"], result: unknown): Resposta => ({ jsonrpc: "2.0", id: id ?? null, result });
const erro = (id: Pedido["id"], code: number, message: string): Resposta => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
const texto = (t: string, isError = false) => ({ content: [{ type: "text", text: t }], isError });

async function chamarFerramenta(token: string, origem: string, params: Record<string, unknown>) {
  const f = FERRAMENTAS.find((x) => x.name === params.name);
  if (!f) return texto(`Ferramenta desconhecida: ${String(params.name)}`, true);

  const a = await acessar(token, "mcp");
  if (a.situacao === "pendente") return texto("O paciente ainda não autorizou este acesso.", true);
  if (a.situacao !== "ok") {
    const s = SITUACAO_TEXTO[a.situacao];
    return texto(`${s.titulo}. ${s.texto} Peça ao paciente uma nova conexão em Zelo > Mais > Conectar IA.`, true);
  }
  const c: Contexto = { insights: a.insights, relogio: a.relogio, origem, descritivos: a.descritivos };
  const args = (params.arguments ?? {}) as Record<string, unknown>;
  return texto(f.executar(c, args));
}

async function responder(p: Pedido, token: string, origem: string): Promise<Resposta | null> {
  if (p.id === undefined || p.id === null) return null; // notificação: sem resposta
  switch (p.method) {
    case "initialize": {
      const pedida = String(p.params?.protocolVersion ?? "");
      return ok(p.id, {
        protocolVersion: VERSOES.includes(pedida) ? pedida : VERSOES[0],
        capabilities: { tools: {} },
        serverInfo: { name: "zelo", title: "Zelo", version: "0.1.0" },
        instructions: INSTRUCOES,
      });
    }
    case "ping":
      return ok(p.id, {});
    case "tools/list":
      return ok(p.id, {
        tools: FERRAMENTAS.map(({ name, description, inputSchema }) => ({
          name, description, inputSchema, annotations: { readOnlyHint: true, openWorldHint: false },
        })),
      });
    case "tools/call":
      try {
        return ok(p.id, await chamarFerramenta(token, origem, p.params ?? {}));
      } catch (e) {
        console.error("[mcp]", e instanceof Error ? e.message : e);
        return ok(p.id, texto("Não foi possível ler o histórico agora. Tente de novo em instantes.", true));
      }
    case "resources/list":
      return ok(p.id, { resources: [] });
    case "prompts/list":
      return ok(p.id, { prompts: [] });
    default:
      return erro(p.id, -32601, `Método não suportado: ${p.method}`);
  }
}

export async function POST(req: Request, ctx: RouteContext<"/api/mcp/[token]">) {
  const { token } = await ctx.params;
  const origem = new URL(req.url).origin;
  let corpo: unknown;
  try {
    corpo = await req.json();
  } catch {
    return Response.json(erro(null, -32700, "JSON inválido"), { status: 400, headers: CORS });
  }
  const lote = Array.isArray(corpo);
  const pedidos = (lote ? corpo : [corpo]) as Pedido[];
  const respostas = (await Promise.all(pedidos.map((p) => responder(p, token, origem)))).filter((r): r is Resposta => r !== null);
  if (respostas.length === 0) return new Response(null, { status: 202, headers: CORS });
  return Response.json(lote ? respostas : respostas[0], { headers: CORS });
}

/** Sem fluxo aberto pelo servidor (SSE): o protocolo manda responder 405 no GET. */
export function GET() {
  return new Response("Conector MCP do Zelo: use POST (Streamable HTTP).", { status: 405, headers: { ...CORS, Allow: "POST" } });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
