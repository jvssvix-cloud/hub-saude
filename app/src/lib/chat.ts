/**
 * Chat do app ("Conversar"): pergunta do paciente -> Gemini, com o histórico dele como contexto. SÓ SERVIDOR.
 *
 * O contexto é o texto das mesmas ferramentas do conector MCP (lib/ferramentas.ts): resumo, todos os exames com cada
 * resultado e sua origem, vacinas e relógio. Cabe inteiro na pergunta (são ~200 resultados), então não há busca nem
 * chamada de ferramenta: uma requisição por mensagem.
 *
 * Chave: GEMINI_API_KEY (Google AI Studio, tem cota gratuita) no .env.local da raiz ou no painel da Vercel.
 * Modelo: GEMINI_MODEL (padrão abaixo).
 */
import "server-only";
import { FERRAMENTAS, type Contexto } from "@/lib/ferramentas";

export type Mensagem = { papel: "paciente" | "assistente"; texto: string };

const MODELO_PADRAO = "gemini-flash-latest"; // apelido do Google para o Flash atual (não quebra quando um modelo sai de linha)
const MODELOS_RESERVA = ["gemini-flash-lite-latest", "gemini-3.5-flash"];

export function temChaveChat(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

function contextoEmTexto(c: Contexto): string {
  const f = (nome: string, args: Record<string, unknown> = {}) => FERRAMENTAS.find((x) => x.name === nome)!.executar(c, args);
  const historicos = c.insights.series.map((s) => f("historico_do_exame", { exame: s.analito })).join("\n\n---\n\n");
  return [
    `## Resumo\n${f("resumo_de_saude")}`,
    `## Vacinas\n${f("vacinas")}`,
    `## Relógio\n${f("relogio")}`,
    `## Cada exame, resultado a resultado\n${historicos}`,
  ].join("\n\n");
}

function instrucoes(c: Contexto): string {
  return [
    `Você é o assistente do Hub de Saúde e conversa com ${c.insights.paciente.nome.split(" ")[0]}, o próprio paciente, sobre o histórico de saúde dele. Hoje é ${c.insights.hoje}.`,
    "Regras:",
    "- Responda em português do Brasil, em linguagem simples e calma, em no máximo 3 parágrafos curtos ou uma lista curta. Texto puro, sem markdown.",
    "- Use SOMENTE os dados abaixo. Se a resposta não estiver neles, diga que não há esse dado no histórico.",
    "- Todo número citado vem com a data e o laboratório do laudo (ex.: \"LDL 164 mg/dL em 12/03/2026, Gama Análises Clínicas\").",
    "- A faixa de referência é a do próprio laudo. Não invente faixas \"ideais\".",
    "- Não dê diagnóstico, não indique nem ajuste remédio. Explique, compare ao longo do tempo e sugira o que levar ao médico.",
    "- Sinais de urgência (dor no peito, falta de ar, desmaio): oriente a procurar atendimento agora.",
    "- Cite os exames pelo nome que aparece nos dados, para o app conseguir ligar a resposta à página do exame.",
    "",
    "# Histórico do paciente",
    contextoEmTexto(c),
  ].join("\n");
}

type RespostaGemini = {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  error?: { message?: string };
};

export async function responder(c: Contexto, mensagens: Mensagem[]): Promise<string> {
  const chave = process.env.GEMINI_API_KEY;
  if (!chave) throw new Error("Falta GEMINI_API_KEY");
  const corpo = JSON.stringify({
    systemInstruction: { parts: [{ text: instrucoes(c) }] },
    contents: mensagens.map((m) => ({ role: m.papel === "paciente" ? "user" : "model", parts: [{ text: m.texto }] })),
    generationConfig: { temperature: 0.2, maxOutputTokens: 4000 },
  });
  // modelo sobrecarregado ou no limite da cota gratuita (503/429/500): tenta o reserva antes de desistir
  const modelos = [...new Set([process.env.GEMINI_MODEL || MODELO_PADRAO, ...MODELOS_RESERVA])];
  let falha = "";
  for (const modelo of modelos) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": chave },
      body: corpo,
      cache: "no-store",
    });
    const j = (await r.json().catch(() => ({}))) as RespostaGemini;
    if (!r.ok) {
      falha = `Gemini ${r.status} (${modelo}): ${(j.error?.message ?? "").slice(0, 160)}`;
      if ([429, 500, 503].includes(r.status)) continue;
      throw new Error(falha);
    }
    const texto = (j.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
    if (texto) return texto;
    falha = `Gemini sem texto (${modelo}, ${j.candidates?.[0]?.finishReason ?? "sem candidato"})`;
  }
  throw new Error(falha);
}
