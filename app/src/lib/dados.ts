/**
 * De onde as telas tiram os dados do paciente. SÓ SERVIDOR (usa a chave secreta do Supabase).
 *
 * Com SUPABASE_SERVICE_ROLE_KEY: lê documentos + observações do banco e roda as regras de insights/ na hora
 * (mesmo código do `npm run insights`). Sem a chave, ou se o banco falhar: usa o insights.json copiado
 * (plano B), que é do Roberto e por isso SÓ vale para ele.
 *
 * Cache por paciente: o pacienteId entra na chave do "use cache" e na etiqueta (`historico:<id>`). Quem gravar algo no
 * banco (envio de exame) chama updateTag(tagHistorico(id)) e a próxima tela daquele paciente já vem com o dado novo.
 *
 * As telas chamam meusInsights(), que resolve o paciente pela sessão. carregarInsights(id) não confere a sessão:
 * só chame com um id que veio de pacienteAtual()/pacienteDaSessao().
 */
import { cacheLife, cacheTag } from "next/cache";
import { carregarDoBanco, conexaoDoAmbiente, PACIENTE_DEMO } from "@insights/banco";
import { gerarInsights, HOJE_PADRAO } from "@insights/regras";
import dadosJson from "@/dados/insights.json";
import type { Insights } from "@/lib/insights";
import { pacienteAtual } from "@/lib/sessao";

export const tagHistorico = (pacienteId: string) => `historico:${pacienteId}`;

export type Origem = "banco" | "json";

export async function carregarInsights(pacienteId: string): Promise<Insights & { origem: Origem }> {
  "use cache";
  cacheLife("hours");
  cacheTag(tagHistorico(pacienteId));

  const c = conexaoDoAmbiente();
  if (c) {
    try {
      const { laudos, paciente, doses } = await carregarDoBanco(c, pacienteId);
      const i: Insights = gerarInsights(laudos, paciente, HOJE_PADRAO, doses);
      return { ...i, origem: "banco" };
    } catch (e) {
      console.error("[dados] banco indisponível:", e instanceof Error ? e.message : e);
      if (pacienteId !== PACIENTE_DEMO) throw e;
    }
  }
  // o arquivo é do Roberto: outro paciente nunca pode cair nele
  if (pacienteId !== PACIENTE_DEMO) throw new Error("Sem banco: só a demonstração tem o arquivo de reserva.");
  return { ...(dadosJson as unknown as Insights), origem: "json" };
}

/** Insights do paciente logado (sem sessão -> /entrar; sem check-up -> /checkup). */
export async function meusInsights() {
  const p = await pacienteAtual();
  return carregarInsights(p.id);
}
