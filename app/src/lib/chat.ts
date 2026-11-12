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

const MODELO_PADRAO = "gemini-3.5-flash";
// se o principal estiver sobrecarregado, sem cota ou demorar demais, tenta os reservas nesta ordem
const MODELOS_RESERVA = ["gemini-flash-lite-latest", "gemini-flash-latest"];
const ESPERA_MS = 25_000;

export function temChaveChat(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

function contextoEmTexto(c: Contexto): string {
  const f = (nome: string, args: Record<string, unknown> = {}) => FERRAMENTAS.find((x) => x.name === nome)!.executar(c, args);
  const historicos = c.insights.series.map((s) => f("historico_do_exame", { exame: s.analito })).join("\n\n---\n\n");
  return [
    ...(c.perfil ? [`## Perfil de saúde (informado pelo próprio paciente no check-up; não é exame)\n${c.perfil}`] : []),
    `## Resumo\n${f("resumo_de_saude")}`,
    `## Laudos descritivos (ECG, eco, endoscopia, imagem)\n${f("laudos_descritivos")}`,
    `## Outros exames (fora da lista padronizada, como impressos no laudo)\n${f("outros_exames")}`,
    `## Vacinas\n${f("vacinas")}`,
    `## Relógio\n${f("relogio")}`,
    `## Cada exame, resultado a resultado\n${historicos}`,
  ].join("\n\n");
}

function instrucoes(c: Contexto): string {
  return [
    `Você é o assistente do Zelo e conversa com ${c.insights.paciente.nome.split(" ")[0]}, o próprio paciente, sobre o histórico de saúde dele. Hoje é ${c.insights.hoje}.`,
    "Regras:",
    "- Responda em português do Brasil, em linguagem simples e calma, em no máximo 3 parágrafos curtos ou uma lista curta. Texto puro, sem markdown.",
    "- Use SOMENTE os dados abaixo. Se a resposta não estiver neles, diga que não há esse dado no histórico.",
    "- Todo número citado vem com a data e o laboratório do laudo (ex.: \"LDL 164 mg/dL em 12/03/2026, Gama Análises Clínicas\").",
    "- A faixa de referência é a do próprio laudo. Não invente faixas \"ideais\".",
    "- Não dê diagnóstico, não indique nem ajuste remédio. Explique, compare ao longo do tempo e sugira o que levar ao médico.",
    "- Sinais de urgência (dor no peito, falta de ar, desmaio): oriente a procurar atendimento agora.",
    "- Cite os exames pelo nome que aparece nos dados, para o app conseguir ligar a resposta à página do exame.",
    "- O perfil de saúde (hábitos, diagnósticos, remédios, família) foi o paciente quem contou: use para dar contexto (ex.: IMC, sono, histórico familiar), dizendo que é o que ele informou, nunca como resultado de exame.",
    "",
    "# Histórico do paciente",
    contextoEmTexto(c),
  ].join("\n");
}

type RespostaGemini = {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  error?: { message?: string };
};

type ConversaGemini = { role: "user" | "model"; parts: { text: string }[] }[];

const paraGemini = (mensagens: Mensagem[]): ConversaGemini =>
  mensagens.map((m) => ({ role: m.papel === "paciente" ? "user" : "model", parts: [{ text: m.texto }] }));

/** Uma chamada ao Gemini, com modelos reserva quando o principal está sobrecarregado ou sem cota (503/429/500). */
async function gerar(c: Contexto, contents: ConversaGemini, config: Record<string, unknown> = {}): Promise<string> {
  const chave = process.env.GEMINI_API_KEY;
  if (!chave) throw new Error("Falta GEMINI_API_KEY");
  const corpo = JSON.stringify({
    systemInstruction: { parts: [{ text: instrucoes(c) }] },
    contents,
    generationConfig: { temperature: 0.2, maxOutputTokens: 4000, ...config },
  });
  const modelos = [...new Set([process.env.GEMINI_MODEL || MODELO_PADRAO, ...MODELOS_RESERVA])];
  let falha = "";
  for (const modelo of modelos) {
    let r: Response;
    let j: RespostaGemini;
    try {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": chave },
        body: corpo,
        cache: "no-store",
        signal: AbortSignal.timeout(ESPERA_MS),
      });
      j = (await r.json().catch(() => ({}))) as RespostaGemini;
    } catch (e) {
      // sem resposta no prazo (o modelo às vezes fica pendurado) ou rede: próximo modelo
      falha = `Gemini sem resposta (${modelo}): ${e instanceof Error ? e.name : "erro"}`;
      continue;
    }
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

export function responder(c: Contexto, mensagens: Mensagem[]): Promise<string> {
  return gerar(c, paraGemini(mensagens));
}

export type PlanoGerado = { titulo: string; itens: string[] };

const PEDIDO_PLANO = [
  "Com base nesta conversa e no meu histórico, monte um plano curto para eu seguir até a próxima consulta.",
  "Responda SÓ com JSON, no formato {\"titulo\": string, \"itens\": string[]}.",
  "- titulo: até 60 caracteres, sobre o assunto da conversa (ex.: \"Cuidar do colesterol até a consulta\").",
  "- itens: de 3 a 6 passos práticos, cada um em uma frase de até 200 caracteres, começando por um verbo.",
  "- Hábitos (alimentação, movimento, sono), o que acompanhar, quando repetir exame de rotina e o que levar ou perguntar ao médico.",
  "- Quando o passo vier de um exame, cite o nome do exame, o valor e a data do laudo.",
  "- Nada de remédio, dose, suplemento ou diagnóstico. Inclua um passo para confirmar o plano com o médico.",
].join("\n");

/** A conversa vira um plano: título + passos, pronto para salvar. Mesmas regras do chat (só os dados, sem diagnóstico). */
export async function montarPlano(c: Contexto, mensagens: Mensagem[]): Promise<PlanoGerado> {
  const bruto = await gerar(c, [...paraGemini(mensagens), { role: "user", parts: [{ text: PEDIDO_PLANO }] }], {
    responseMimeType: "application/json",
  });
  const j = JSON.parse(bruto.replace(/^```(?:json)?\s*|\s*```$/g, "")) as { titulo?: unknown; itens?: unknown };
  const titulo = typeof j.titulo === "string" ? j.titulo.trim().slice(0, 120) : "";
  const itens = (Array.isArray(j.itens) ? j.itens : [])
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim().slice(0, 300))
    .slice(0, 8);
  if (!titulo || itens.length === 0) throw new Error("Plano em formato inesperado");
  return { titulo, itens };
}
