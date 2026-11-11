/**
 * Progresso do "Reunir meus exames" (perfil_saude.coleta). SÓ SERVIDOR (chave secreta).
 * Quem chama passa o paciente da SESSÃO; a área e a situação são conferidas contra as listas fixas.
 */
import "server-only";
import { AREA_IDS, SITUACOES } from "@/lib/reunir";
import { escreverServidor, getServidor } from "@/lib/supabase";
import type { SituacaoColeta } from "../../../lib/types";

export function areaValida(v: unknown): string | null {
  return typeof v === "string" && AREA_IDS.has(v) ? v : null;
}

/** Marca a área. "enviado" nunca é rebaixado para "pulado" (quem enviou e depois pulou continua com envio). */
export async function marcarColeta(pacienteId: string, area: string, situacao: SituacaoColeta): Promise<void> {
  if (!AREA_IDS.has(area) || !SITUACOES.includes(situacao)) return;
  const pid = encodeURIComponent(pacienteId);
  const [p] = await getServidor<{ coleta: Record<string, SituacaoColeta> | null }[]>(`perfil_saude?paciente_id=eq.${pid}&select=coleta`);
  const atual = p?.coleta ?? {};
  if (atual[area] === "enviado" && situacao !== "enviado") return;
  await escreverServidor("PATCH", `perfil_saude?paciente_id=eq.${pid}`, {
    coleta: { ...atual, [area]: situacao },
    atualizado_em: new Date().toISOString(),
  });
}

/** Volta a área para "sem resposta" (o paciente quer rever). */
export async function reabrirColeta(pacienteId: string, area: string): Promise<void> {
  if (!AREA_IDS.has(area)) return;
  const pid = encodeURIComponent(pacienteId);
  const [p] = await getServidor<{ coleta: Record<string, SituacaoColeta> | null }[]>(`perfil_saude?paciente_id=eq.${pid}&select=coleta`);
  const resto = { ...(p?.coleta ?? {}) };
  delete resto[area];
  await escreverServidor("PATCH", `perfil_saude?paciente_id=eq.${pid}`, { coleta: resto, atualizado_em: new Date().toISOString() });
}
