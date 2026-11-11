"use server";
/** Envio de exame, passo 2: o paciente conferiu a prévia e salva (ou descarta). Só o id do envio vem do navegador. */
import { updateTag } from "next/cache";
import { tagHistorico } from "@/lib/dados";
import { descartarEnvio, ErroEnvio, salvarEnvio } from "@/lib/envio";
import { pacienteDaSessao } from "@/lib/sessao";
import { PACIENTE_ID } from "@/lib/usuario";

export type RespostaSalvar = { ok: true; documentoId: string; exames: number; doses: number } | { ok: false; mensagem: string };

export async function salvar(envioId: string): Promise<RespostaSalvar> {
  if (!(await pacienteDaSessao())) return { ok: false, mensagem: "Sua sessão terminou. Entre de novo." };
  try {
    const r = await salvarEnvio(envioId);
    // TODO fatia 2 (paciente da sessão): o envio ainda grava no paciente fixo; trocar pelo id da sessão
    updateTag(tagHistorico(PACIENTE_ID)); // gráficos, alertas, médico e conector já veem o exame novo
    return { ok: true, ...r };
  } catch (e) {
    console.error("[enviar] salvar:", e instanceof Error ? e.message : e);
    return { ok: false, mensagem: e instanceof ErroEnvio ? e.message : "Não conseguimos salvar. Tente de novo." };
  }
}

export async function descartar(envioId: string): Promise<{ ok: boolean }> {
  if (!(await pacienteDaSessao())) return { ok: false };
  try {
    await descartarEnvio(envioId);
    return { ok: true };
  } catch (e) {
    console.error("[enviar] descartar:", e instanceof Error ? e.message : e);
    return { ok: false };
  }
}
