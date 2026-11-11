"use server";
/** Passo a passo do /reunir: "Não tenho", "Pular" e "Rever esta área". Só a área vem do navegador (conferida). */
import { redirect } from "next/navigation";
import { areaValida, marcarColeta, reabrirColeta } from "@/lib/coleta";
import { pacienteAtual } from "@/lib/sessao";

export async function responderArea(area: string, situacao: "nao_tenho" | "pulado" | "enviado"): Promise<void> {
  const p = await pacienteAtual();
  const a = areaValida(area);
  if (a) await marcarColeta(p.id, a, situacao);
  redirect("/reunir"); // a página abre a próxima área sem resposta (ou o resumo)
}

export async function reverArea(area: string): Promise<void> {
  const p = await pacienteAtual();
  const a = areaValida(area);
  if (a) await reabrirColeta(p.id, a);
  redirect(a ? `/reunir?area=${a}` : "/reunir");
}
