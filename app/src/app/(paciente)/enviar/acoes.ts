"use server";
/** Envio de exame, passo 2: o paciente conferiu a prévia e salva (ou descarta). Só o id do envio vem do navegador. */
import { updateTag } from "next/cache";
import { areaValida, marcarColeta } from "@/lib/coleta";
import { tagHistorico } from "@/lib/dados";
import { descartarEnvio, ErroEnvio, salvarEnvio } from "@/lib/envio";
import { pacienteDaSessao } from "@/lib/sessao";

export type RespostaSalvar = { ok: true; documentoId: string; exames: number; doses: number } | { ok: false; mensagem: string };

/** area: quando o envio vem do /reunir, marca a área como "enviado" no progresso. */
export async function salvar(envioId: string, area?: string): Promise<RespostaSalvar> {
  const p = await pacienteDaSessao();
  if (!p) return { ok: false, mensagem: "Sua sessão terminou. Entre de novo." };
  try {
    const r = await salvarEnvio(envioId, p.id);
    updateTag(tagHistorico(p.id)); // gráficos, alertas, médico e conector já veem o exame novo
    const a = areaValida(area);
    if (a) await marcarColeta(p.id, a, "enviado").catch((e) => console.error("[enviar] coleta:", e));
    return { ok: true, ...r };
  } catch (e) {
    console.error("[enviar] salvar:", e instanceof Error ? e.message : e);
    return { ok: false, mensagem: e instanceof ErroEnvio ? e.message : "Não conseguimos salvar. Tente de novo." };
  }
}

export async function descartar(envioId: string): Promise<{ ok: boolean }> {
  const p = await pacienteDaSessao();
  if (!p) return { ok: false };
  try {
    await descartarEnvio(envioId, p.id);
    return { ok: true };
  } catch (e) {
    console.error("[enviar] descartar:", e instanceof Error ? e.message : e);
    return { ok: false };
  }
}
