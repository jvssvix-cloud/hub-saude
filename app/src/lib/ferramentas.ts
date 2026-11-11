/**
 * Ferramentas de leitura do histórico, em texto, para um modelo de IA usar.
 * Servem a dois consumidores: o conector MCP (Claude, ChatGPT, Gemini do paciente; /api/mcp/[token]) e o chat do app.
 * Nada é calculado aqui: é o mesmo resultado das regras de insights/ e do relógio, escrito com a origem de cada número
 * (laboratório, data, página do laudo e link). Só leitura.
 */
import { dataBr, faixa, numero, type Insights, type Serie } from "@/lib/insights";
import type { Relogio } from "@/lib/relogio";

export type Contexto = {
  insights: Insights;
  /** null quando o consentimento não libera o relógio. */
  relogio: Relogio | null;
  /** "https://app..." para montar o link do laudo original. */
  origem: string;
  /**
   * Perfil de saúde do check-up, em texto (lib/checkup.ts perfilParaTexto). Só o chat do próprio paciente recebe:
   * o consentimento do médico e do MCP ainda não tem a categoria "perfil", então lá fica de fora.
   */
  perfil?: string | null;
};

export type Ferramenta = {
  name: string;
  description: string;
  inputSchema: { type: "object"; properties: Record<string, unknown>; required?: string[] };
  executar: (c: Contexto, args: Record<string, unknown>) => string;
};

const AVISO = "Dados lidos dos laudos originais do paciente. Não é diagnóstico: decisões cabem ao médico.";

const limpo = (t: string) =>
  t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function situacao(s: Serie): string {
  if (!s.alterado) return "na faixa";
  return s.sentido === "abaixo" ? "FORA DA FAIXA (abaixo)" : "FORA DA FAIXA (acima)";
}

function linhaExame(s: Serie): string {
  const u = s.ultimo;
  const tend = s.tendencia && s.tendencia.direcao !== "estavel" ? `; ${s.tendencia.texto}` : "";
  return (
    `- ${s.nome} [id: ${s.analito}]: ${u.qualificador ?? ""}${numero(u.valor)} ${s.unidade} em ${dataBr(u.data)} ` +
    `(referência do laudo: ${faixa(u.ref_min, u.ref_max, s.unidade)}) · ${situacao(s)}${tend} ` +
    `· fonte: ${u.fonte.laboratorio}, p. ${u.fonte.pagina}`
  );
}

/** Acha o exame pelo id ("ldl") ou pelo nome ("colesterol ldl", "hemoglobina glicada"). */
export function acharExame(i: Insights, pedido: string): Serie | undefined {
  const q = limpo(pedido);
  if (!q) return undefined;
  const nomes = (s: Serie) => [s.analito.replace(/_/g, " "), limpo(s.nome)];
  return (
    i.series.find((s) => nomes(s).includes(q)) ??
    i.series.find((s) => limpo(s.nome).startsWith(q)) ??
    i.series.find((s) => nomes(s).some((n) => ` ${n} `.includes(` ${q} `) || ` ${q} `.includes(` ${n} `)))
  );
}

export const FERRAMENTAS: Ferramenta[] = [
  {
    name: "resumo_de_saude",
    description:
      "Resumo do histórico de saúde do paciente: quem é, período coberto, exames alterados com tendência, mudanças relevantes, vacinas pendentes e avisos do relógio. Comece por aqui.",
    inputSchema: { type: "object", properties: {} },
    executar: ({ insights, relogio }) => {
      const partes = [insights.resumo_medico.join("\n")];
      if (relogio?.alertas.length) {
        partes.push(
          "Relógio (últimos 6 meses), avisos por regras:\n" +
            relogio.alertas.map((a) => `- ${a.titulo}: ${a.motivo} ${a.recomendacao}`).join("\n"),
        );
      }
      return partes.join("\n\n");
    },
  },
  {
    name: "listar_exames",
    description:
      "Lista os exames de laboratório acompanhados, com o último valor, a referência do próprio laudo, a situação e a tendência. Use o id entre colchetes em historico_do_exame.",
    inputSchema: {
      type: "object",
      properties: {
        situacao: { type: "string", enum: ["todos", "fora_da_faixa", "na_faixa"], description: "Filtro opcional (padrão: todos)." },
      },
    },
    executar: ({ insights }, args) => {
      const f = String(args.situacao ?? "todos");
      const lista = insights.series.filter((s) => (f === "fora_da_faixa" ? s.alterado : f === "na_faixa" ? !s.alterado : true));
      if (!lista.length) return "Nenhum exame com esse filtro (ou o paciente não liberou exames para esta conexão).";
      return `${lista.length} exames:\n${lista.map(linhaExame).join("\n")}\n\n${AVISO}`;
    },
  },
  {
    name: "historico_do_exame",
    description:
      "Todos os resultados de um exame ao longo dos anos (ex.: ldl, glicose, hba1c), cada um com data, valor, referência daquele laudo, laboratório, página e link do documento original.",
    inputSchema: {
      type: "object",
      properties: { exame: { type: "string", description: "Id ou nome do exame, como em listar_exames (ex.: \"ldl\")." } },
      required: ["exame"],
    },
    executar: ({ insights, origem }, args) => {
      const s = acharExame(insights, String(args.exame ?? ""));
      if (!s) {
        return `Exame não encontrado. Disponíveis: ${insights.series.map((x) => x.analito).join(", ") || "nenhum"}.`;
      }
      const pontos = s.pontos.map(
        (p) =>
          `- ${dataBr(p.data)}: ${p.qualificador ?? ""}${numero(p.valor)} ${s.unidade}${p.fora_da_faixa ? " (FORA)" : ""} ` +
          `· ref. ${faixa(p.ref_min, p.ref_max, s.unidade)} · impresso no laudo: "${p.valor_impresso} ${p.unidade_impressa}" ` +
          `· ${p.fonte.laboratorio}, p. ${p.fonte.pagina} · ${origem}/${p.fonte.arquivo}#page=${p.fonte.pagina}`,
      );
      const cab = [
        `${s.nome} [id: ${s.analito}] · ${s.pontos.length} resultados · situação hoje: ${situacao(s)}`,
        s.tendencia ? `Tendência: ${s.tendencia.texto}` : null,
        s.persistente ? `Fora da referência nos últimos ${s.fora_seguidos} exames.` : null,
        `Página do exame no app: ${origem}/exame/${s.analito}`,
      ].filter(Boolean);
      return `${cab.join("\n")}\n\n${pontos.join("\n")}\n\nA referência é a de cada laudo (muda com o laboratório e o ano). ${AVISO}`;
    },
  },
  {
    name: "vacinas",
    description: "Situação vacinal do paciente pelo calendário oficial: o que está em dia, vencido ou incompleto.",
    inputSchema: { type: "object", properties: {} },
    executar: ({ insights }) => {
      const v = insights.vacinacao;
      if (!v || !v.situacao.length) return "Sem registros de vacinação (ou o paciente não liberou vacinas para esta conexão).";
      return `Fonte da regra: ${v.fonte}\n${v.situacao.map((x) => `- ${x.nome} (${x.status === "atencao" ? "atenção" : "em dia"}): ${x.texto}`).join("\n")}`;
    },
  },
  {
    name: "relogio",
    description: "Dados do relógio do paciente: batimento em repouso, variabilidade, sono, passos e avisos (ritmo irregular etc.).",
    inputSchema: { type: "object", properties: {} },
    executar: ({ relogio }) => {
      if (!relogio) return "Sem dados de relógio: o paciente não tem relógio conectado ou não liberou o relógio para esta conexão.";
      const r = relogio.resumo;
      const n = (v: number | null, u: string) => (v === null ? "sem dado" : `${numero(Math.round(v * 10) / 10)} ${u}`);
      return [
        `Período: ${dataBr(relogio.periodo.inicio)} a ${dataBr(relogio.periodo.fim)} (${relogio.dias.length} dias).`,
        `Batimento em repouso: ${n(r.fc_repouso.atual_14d, "bpm")} nos últimos 14 dias (base do paciente: ${n(r.fc_repouso.linha_base, "bpm")}).`,
        `Variabilidade (VFC): ${n(r.vfc_ms.atual_14d, "ms")} (base: ${n(r.vfc_ms.linha_base, "ms")}).`,
        `Sono: ${n(r.sono_horas.atual_14d, "h")} por noite nos últimos 14 dias.`,
        `Passos: ${n(r.passos.atual_30d, "por dia")} nos últimos 30 dias (90 dias antes: ${n(r.passos.anterior_90d, "por dia")}).`,
        `Avisos de ritmo irregular nos últimos 14 dias: ${r.eventos_ritmo_14d}.`,
        relogio.alertas.length
          ? `Avisos por regras:\n${relogio.alertas.map((a) => `- ${a.titulo}: ${a.motivo} ${a.recomendacao} (${a.aviso})`).join("\n")}`
          : "Sem avisos.",
      ].join("\n");
    },
  },
];

export const INSTRUCOES =
  "Zelo: histórico de saúde que o próprio paciente decidiu compartilhar com este assistente (exames de laboratório de vários anos, vacinas e relógio). " +
  "Comece por resumo_de_saude. Ao citar um número, diga a data e o laboratório do laudo. " +
  "A faixa de referência é a de cada laudo. Não dê diagnóstico nem mude tratamento: explique, compare e sugira o que levar ao médico. " +
  "O paciente pode encerrar este acesso a qualquer momento; se uma ferramenta disser que o acesso acabou, avise-o.";
