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

/** consumidor: quem está lendo ("visao_medico", "mcp"); vai para o log que o paciente vê. */
export async function acessar(token: string, consumidor: "visao_medico" | "mcp" = "visao_medico"): Promise<Acesso> {
  const r = await rpcPublica<Resposta>("acessar_historico", { p_token: token, p_consumidor: consumidor });
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

/**
 * Rascunho das recomendações, por regras sobre o que está alterado. É só ponto de partida:
 * o médico edita, apaga ou reescreve antes de enviar (quem decide é ele).
 */
export function rascunhoPlano(i: Insights, alertasRelogio: { id: string }[]): string[] {
  const atencao = new Set(i.areas.filter((a) => a.status === "atencao").map((a) => a.id));
  const nomes = (area: string) =>
    i.series
      .filter((s) => s.area === area && s.alterado)
      .map((s) => s.nome.replace(/ \(.*\)$/, ""))
      // "Glicose em jejum" -> "glicose em jejum" no meio da frase; siglas (LDL, TSH) ficam como estão
      .map((n) => (/^[A-ZÁÉÍÓÚ][a-záéíóúãõç]/.test(n) ? n[0].toLowerCase() + n.slice(1) : n));
  const temAlerta = (id: string) => alertasRelogio.some((a) => a.id === id);
  const itens: string[] = [];

  if (temAlerta("ritmo_irregular"))
    itens.push(
      "Avaliação cardiológica com eletrocardiograma (e Holter, se indicado) pelos avisos de ritmo irregular do relógio. Se tiver palpitação, falta de ar ou desmaio, procurar atendimento.",
    );
  if (atencao.has("glicemia"))
    itens.push(`Repetir ${nomes("glicemia").join(" e ")} em 3 meses. Reduzir açúcar e farinha branca.`);
  if (atencao.has("colesterol"))
    itens.push(
      `Repetir o perfil lipídico em 3 meses (${nomes("colesterol").join(", ")} acima da referência). Menos gordura saturada e ultraprocessados.`,
    );
  if (atencao.has("glicemia") || atencao.has("colesterol") || temAlerta("atividade_caindo"))
    itens.push("Atividade física aeróbica: pelo menos 150 minutos por semana, começando aos poucos.");
  if (atencao.has("rins"))
    itens.push(`Repetir ${nomes("rins").join(" e ")} e creatinina. Beber mais água; moderar carne vermelha e álcool.`);
  if (temAlerta("sono_curto")) itens.push("Priorizar 7 a 9 horas de sono por noite.");
  return itens;
}

const CATEGORIA: Record<string, string> = { exame: "exames", vacina: "vacinas", wearable: "relógio" };

/** ["exame", "vacina"] -> "exames e vacinas" */
export function listaCategorias(c: string[]): string {
  const n = c.map((x) => CATEGORIA[x] ?? x);
  return n.length > 1 ? `${n.slice(0, -1).join(", ")} e ${n[n.length - 1]}` : (n[0] ?? "nada");
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
