/**
 * Extração: documento (PDF ou fotos) -> JSON estruturado (Claude, visão + saída estruturada)
 * -> normalização determinística.
 *
 * Uso no app (rota de API) ou em script:
 *   const r = await extrairDocumento([{ dados: buffer, mime: "application/pdf" }]);
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { normalizar } from "./normalizar";
import { INSTRUCAO_USUARIO, PROMPT_SISTEMA } from "./prompt";
import { Extracao, type ExtracaoNormalizada } from "./schema";

export const MODELO = "claude-opus-5-5";
// Preço por 1M tokens (entrada, saída), para estimar custo no relatório
const PRECO = { entrada: 4, saida: 20 };

export type Arquivo = { dados: Buffer; mime: string };
export type Esforco = "low" | "medium" | "high" | "xhigh" | "max";

export type ResultadoExtracao = {
  bruto: Extracao;
  normalizado: ExtracaoNormalizada;
  uso: { entrada: number; saida: number; custo_usd: number; segundos: number };
  modelo: string;
};

let cliente: Anthropic | null = null;
function getCliente() {
  // Lê ANTHROPIC_API_KEY do ambiente (no script, vem do .env.local da raiz)
  cliente ??= new Anthropic();
  return cliente;
}

function blocosDoArquivo(arquivos: Arquivo[]): Anthropic.Beta.BetaContentBlockParam[] {
  const blocos: Anthropic.Beta.BetaContentBlockParam[] = [];
  arquivos.forEach((a, i) => {
    const data = a.dados.toString("base64");
    if (a.mime === "application/pdf") {
      blocos.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data } });
    } else if (a.mime === "image/jpeg" || a.mime === "image/png" || a.mime === "image/webp") {
      if (arquivos.length > 1) blocos.push({ type: "text", text: `Imagem ${i + 1} de ${arquivos.length}:` });
      blocos.push({ type: "image", source: { type: "base64", media_type: a.mime, data } });
    } else {
      throw new Error(`Tipo de arquivo não suportado: ${a.mime}`);
    }
  });
  return blocos;
}

export async function extrairDocumento(
  arquivos: Arquivo[],
  opcoes: { esforco?: Esforco } = {},
): Promise<ResultadoExtracao> {
  const inicio = Date.now();
  const resposta = await getCliente().beta.messages.parse({
    model: MODELO,
    max_tokens: 16000,
    system: PROMPT_SISTEMA,
    messages: [{ role: "user", content: [...blocosDoArquivo(arquivos), { type: "text", text: INSTRUCAO_USUARIO }] }],
    output_config: { format: betaZodOutputFormat(Extracao), effort: opcoes.esforco ?? "medium" },
    // Se o modelo recusar por política, o servidor tenta um modelo reserva na mesma chamada
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  });

  if (resposta.stop_reason === "refusal") {
    throw new Error(`Modelo recusou a extração (${resposta.stop_details?.category ?? "sem categoria"})`);
  }
  if (resposta.stop_reason === "max_tokens") {
    throw new Error("Resposta cortada por max_tokens: laudo grande demais para uma chamada");
  }
  const bruto = resposta.parsed_output;
  if (!bruto) throw new Error("Resposta sem JSON válido");

  const entrada = resposta.usage.input_tokens + (resposta.usage.cache_read_input_tokens ?? 0)
    + (resposta.usage.cache_creation_input_tokens ?? 0);
  const saida = resposta.usage.output_tokens;
  return {
    bruto,
    normalizado: normalizar(bruto),
    uso: {
      entrada,
      saida,
      custo_usd: (entrada * PRECO.entrada + saida * PRECO.saida) / 1e6,
      segundos: (Date.now() - inicio) / 1000,
    },
    modelo: resposta.model,
  };
}

export function mimeDoArquivo(caminho: string): string {
  const ext = caminho.toLowerCase().split(".").pop();
  const m: Record<string, string> = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
  if (!ext || !m[ext]) throw new Error(`Extensão não suportada: ${caminho}`);
  return m[ext];
}
