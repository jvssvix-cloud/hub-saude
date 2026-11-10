/**
 * De onde as telas tiram os dados do paciente. SÓ SERVIDOR (usa a chave secreta do Supabase).
 *
 * Com SUPABASE_SERVICE_ROLE_KEY: lê documentos + observações do banco e roda as regras de insights/ na hora
 * (mesmo código do `npm run insights`). Sem a chave, ou se o banco falhar: usa o insights.json copiado
 * (plano B para a demo nunca quebrar).
 *
 * Cache: o resultado fica guardado com a etiqueta "historico". Quem gravar algo no banco (envio de exame)
 * chama updateTag(TAG_HISTORICO) e a próxima tela já vem com o dado novo.
 */
import { cacheLife, cacheTag } from "next/cache";
import { carregarDoBanco, conexaoDoAmbiente } from "@insights/banco";
import { gerarInsights, HOJE_PADRAO } from "@insights/regras";
import dadosJson from "@/dados/insights.json";
import type { Insights } from "@/lib/insights";

export const TAG_HISTORICO = "historico";

export type Origem = "banco" | "json";

export async function carregarInsights(): Promise<Insights & { origem: Origem }> {
  "use cache";
  cacheLife("hours");
  cacheTag(TAG_HISTORICO);

  const c = conexaoDoAmbiente();
  if (c) {
    try {
      const { laudos, paciente, doses } = await carregarDoBanco(c);
      const i: Insights = gerarInsights(laudos, paciente, HOJE_PADRAO, doses);
      return { ...i, origem: "banco" };
    } catch (e) {
      console.error("[dados] banco indisponível, usando insights.json:", e instanceof Error ? e.message : e);
    }
  }
  return { ...(dadosJson as unknown as Insights), origem: "json" };
}
