/**
 * Visão do médico: tudo passa pelo token do consentimento.
 * acessar_historico(token) confere o consentimento, aplica o escopo e grava o log; aqui só transformamos as
 * linhas liberadas na mesma "informação" do app (regras de insights/), para o médico ver o que o paciente
 * autorizou, e nada além.
 */
import { montarEntrada, type LinhaDocumento, type LinhaObservacao } from "@insights/banco";
import { gerarInsights, HOJE_PADRAO } from "@insights/regras";
import type { Insights } from "@/lib/insights";
import { rpcPublica } from "@/lib/supabase";

export type Situacao = "ok" | "pendente" | "revogado" | "expirado" | "recusado" | "token_invalido";

export type Escopo = {
  destinatario_tipo: string;
  destinatario_nome: string;
  categorias: string[] | null;
  codigos: string[] | null;
  desde: string | null;
  expira_em: string;
};

export type Acesso =
  | { situacao: "ok"; escopo: Escopo; insights: Insights; documentos: number }
  | { situacao: "pendente"; prazo: string }
  | { situacao: Exclude<Situacao, "ok" | "pendente"> };

type Resposta =
  | { ok: false; motivo: Exclude<Situacao, "ok">; prazo_resposta?: string }
  | {
      ok: true;
      consentimento: Escopo;
      paciente: { nome: string; nascimento: string; sexo: "M" | "F" };
      documentos: LinhaDocumento[];
      observacoes: LinhaObservacao[];
    };

export async function acessar(token: string): Promise<Acesso> {
  const r = await rpcPublica<Resposta>("acessar_historico", { p_token: token, p_consumidor: "visao_medico" });
  if (!r.ok) {
    if (r.motivo === "pendente") return { situacao: "pendente", prazo: r.prazo_resposta ?? "" };
    return { situacao: r.motivo };
  }
  const { laudos, doses } = montarEntrada(r.documentos, r.observacoes);
  const insights = gerarInsights(laudos, r.paciente, HOJE_PADRAO, doses) as unknown as Insights;
  return { situacao: "ok", escopo: r.consentimento, insights, documentos: r.documentos.length };
}

/** O escopo libera o relógio? (null = tudo). O relógio ainda vem do relogio.json, não do banco. */
export function liberaRelogio(e: Escopo): boolean {
  return e.categorias === null || e.categorias.includes("wearable");
}

export const SITUACAO_TEXTO: Record<Exclude<Situacao, "ok" | "pendente">, { titulo: string; texto: string }> = {
  revogado: { titulo: "O paciente encerrou este acesso", texto: "O histórico não está mais disponível neste link." },
  expirado: { titulo: "Este acesso expirou", texto: "Peça um novo acesso ao paciente, se precisar." },
  recusado: { titulo: "O paciente não autorizou", texto: "Nenhum dado foi compartilhado." },
  token_invalido: { titulo: "Link inválido", texto: "Confira o endereço ou peça um novo acesso." },
};

/** "2026-11-11T15:34:00+00:00" -> "11/11 às 12:34" no horário de Brasília (o banco guarda em UTC). */
export function horaBrasilia(iso: string): string {
  const f = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  }).formatToParts(new Date(iso));
  const p = (t: string) => f.find((x) => x.type === t)?.value ?? "";
  return `${p("day")}/${p("month")} às ${p("hour")}:${p("minute")}`;
}
