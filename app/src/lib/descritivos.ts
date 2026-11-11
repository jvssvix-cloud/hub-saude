/**
 * Laudos descritivos (ECG, ecocardiograma, endoscopia, ultrassom, mamografia...): o resultado é um texto.
 * O Zelo guarda a conclusão COPIADA do laudo, com a página, e não interpreta: não vira gráfico nem alerta.
 * Aparecem em Documentos, no /reunir, na visão do médico e nas ferramentas do chat e do conector MCP.
 */
import { dataBr } from "@/lib/insights";

export type LaudoDescritivo = {
  id: string;
  area: string | null;
  exame_nome: string | null;
  data: string | null;
  emissor: string | null;
  conclusao: string | null;
  conclusao_pagina: number | null;
  arquivo: string | null;
};

export const AREA_NOME: Record<string, string> = {
  coracao: "Coração", gastro: "Estômago e intestino", rins: "Rins e vias urinárias", mulher: "Saúde da mulher",
  ossos: "Ossos", pulmao: "Pulmão", outros: "Outros exames de imagem",
};

/** "ECOCARDIOGRAMA TRANSTORÁCICO" -> "Ecocardiograma transtorácico" */
export const nomeExame = (s: string | null) => {
  const t = (s ?? "Laudo").trim();
  return t === t.toUpperCase() ? t.charAt(0) + t.slice(1).toLowerCase() : t;
};

/** Os documentos que são laudos descritivos (de uma lista vinda do banco ou de acessar_historico), do mais novo. */
export function soDescritivos<T extends { tipo?: string | null; data?: string | null }>(docs: T[]): T[] {
  return docs.filter((d) => d.tipo === "laudo_descritivo").sort((a, b) => (b.data ?? "").localeCompare(a.data ?? ""));
}

/** Texto para um modelo de IA (chat e MCP): exame, data, local, conclusão copiada e a página. */
export function descritivosEmTexto(lista: LaudoDescritivo[], origem: string): string {
  if (!lista.length) return "Nenhum laudo descritivo (ECG, eco, endoscopia, imagem) no histórico.";
  return lista
    .map((l) => {
      const onde = [l.emissor, l.data ? dataBr(l.data) : "sem data"].filter(Boolean).join(", ");
      const link = l.arquivo ? ` · original: ${origem}/${l.arquivo}#page=${l.conclusao_pagina ?? 1}` : "";
      return `- ${nomeExame(l.exame_nome)} (${AREA_NOME[l.area ?? ""] ?? "outros"}; ${onde}). Conclusão copiada do laudo, p. ${l.conclusao_pagina ?? "?"}: "${(l.conclusao ?? "").replace(/\n/g, " ")}"${link}`;
    })
    .join("\n");
}
