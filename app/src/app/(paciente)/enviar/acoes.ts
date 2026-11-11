"use server";
/** Envio de exame, passo 2: o paciente conferiu a prévia e salva (ou descarta). Só o id do envio vem do navegador. */
import { updateTag } from "next/cache";
import { TAG_HISTORICO } from "@/lib/dados";
import { descartarEnvio, ErroEnvio, salvarEnvio } from "@/lib/envio";

export type RespostaSalvar = { ok: true; documentoId: string; exames: number; doses: number } | { ok: false; mensagem: string };

export async function salvar(envioId: string): Promise<RespostaSalvar> {
  try {
    const r = await salvarEnvio(envioId);
    updateTag(TAG_HISTORICO); // gráficos, alertas, médico e conector já veem o exame novo
    return { ok: true, ...r };
  } catch (e) {
    console.error("[enviar] salvar:", e instanceof Error ? e.message : e);
    return { ok: false, mensagem: e instanceof ErroEnvio ? e.message : "Não conseguimos salvar. Tente de novo." };
  }
}

export async function descartar(envioId: string): Promise<{ ok: boolean }> {
  try {
    await descartarEnvio(envioId);
    return { ok: true };
  } catch (e) {
    console.error("[enviar] descartar:", e instanceof Error ? e.message : e);
    return { ok: false };
  }
}
