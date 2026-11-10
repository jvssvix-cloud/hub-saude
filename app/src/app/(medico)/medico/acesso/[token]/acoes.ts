"use server";

import { horaBrasilia } from "@/lib/medico";
import { rpcPublica } from "@/lib/supabase";

export type EstadoNota = { ok: true; enviadoEm: string } | { ok: false; erro: string } | null;

const ERRO: Record<string, string> = {
  revogado: "O paciente encerrou este acesso; a nota não foi enviada.",
  expirado: "O acesso expirou; a nota não foi enviada.",
  vazio: "Escreva pelo menos uma recomendação.",
};

/** O token do consentimento é a credencial do médico: registrar_nota só grava com acesso aprovado e válido. */
export async function enviarNota(token: string, _anterior: EstadoNota, form: FormData): Promise<EstadoNota> {
  const itens = String(form.get("itens") ?? "")
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
  const r = await rpcPublica<{ ok: boolean; motivo?: string; criado_em?: string }>("registrar_nota", {
    p_token: token,
    p_itens: itens,
  });
  if (!r.ok) return { ok: false, erro: ERRO[r.motivo ?? ""] ?? "Não foi possível enviar a nota." };
  return { ok: true, enviadoEm: horaBrasilia(r.criado_em!) };
}
