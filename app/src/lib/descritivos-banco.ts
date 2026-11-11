/**
 * Laudos descritivos do paciente da sessão, lidos no servidor (chave secreta). Médico e MCP não passam por aqui:
 * recebem os laudos de acessar_historico(token), dentro do escopo do consentimento (lib/medico.ts).
 */
import "server-only";
import type { LaudoDescritivo } from "@/lib/descritivos";
import { getServidor, temChaveServidor } from "@/lib/supabase";

export async function descritivosDoPaciente(pacienteId: string): Promise<LaudoDescritivo[]> {
  if (!temChaveServidor()) return [];
  return getServidor<LaudoDescritivo[]>(
    `documento?paciente_id=eq.${encodeURIComponent(pacienteId)}&tipo=eq.laudo_descritivo` +
      "&select=id,area,exame_nome,data,emissor,conclusao,conclusao_pagina,arquivo&order=data.desc.nullslast",
  ).catch(() => []);
}
