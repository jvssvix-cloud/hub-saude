/**
 * Regras de alerta do relógio. Cada limiar está aqui, à vista, para explicar na demo.
 * Alerta = regra explicável com os números que a dispararam. Nunca diagnóstico.
 */
import { somarDias } from "./gerar";
import type { Alerta, Dia, Evento, Lote, RelogioJson, Resumo } from "./tipos";

export const LIMIARES = {
  ritmo: { eventos: 3, janela_dias: 14 },
  fc: { janela_dias: 14, base_de: 180, base_ate: 90, subida_bpm: 5 }, // base = 90 a 180 dias atrás
  sono: { janela_dias: 14, minimo_horas: 6 },
  passos: { janela_dias: 30, anterior_dias: 90, queda: 0.25 },
  minimo_dias_com_dado: 7, // menos que isso na janela = não dá para afirmar nada
};

const AVISO = "Isto não é diagnóstico." as const;

// ---------- utilidades ----------
type Campo = "fc_repouso" | "vfc_ms" | "sono_horas" | "passos";

/** Valores de um campo nos dias de (hoje - ateDiasAtras, hoje - deDiasAtras], ignorando dias sem dado. */
function valores(dias: Dia[], campo: Campo, hoje: string, deDiasAtras: number, ateDiasAtras = 0): number[] {
  const ini = somarDias(hoje, -deDiasAtras), fim = somarDias(hoje, -ateDiasAtras);
  return dias.filter((d) => d.data > ini && d.data <= fim && d[campo] !== null).map((d) => d[campo] as number);
}
const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const fmt = (x: number, casas = 0) => x.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
const dataBr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const mesAno = (iso: string) => `${MESES[Number(iso.slice(5, 7)) - 1]}/${iso.slice(0, 4)}`;

function eventosNaJanela(eventos: Evento[], hoje: string, dias: number) {
  const ini = somarDias(hoje, -dias);
  return eventos.filter((e) => e.tipo === "ritmo_irregular" && e.data_hora.slice(0, 10) > ini && e.data_hora.slice(0, 10) <= hoje);
}

// ---------- resumo (cartões da tela) ----------
export function montarResumo(dias: Dia[], eventos: Evento[], hoje: string): Resumo {
  const L = LIMIARES;
  const r = (x: number | null, c = 0) => (x === null ? null : Math.round(x * 10 ** c) / 10 ** c);
  const baseIni = somarDias(hoje, -L.fc.base_de + 1), baseFim = somarDias(hoje, -L.fc.base_ate);
  const ult30 = dias.filter((d) => d.data > somarDias(hoje, -30) && d.data <= hoje);
  return {
    fc_repouso: {
      atual_14d: r(media(valores(dias, "fc_repouso", hoje, L.fc.janela_dias))),
      linha_base: r(media(valores(dias, "fc_repouso", hoje, L.fc.base_de, L.fc.base_ate))),
      linha_base_periodo: `${mesAno(baseIni)} a ${mesAno(baseFim)}`,
    },
    vfc_ms: {
      atual_14d: r(media(valores(dias, "vfc_ms", hoje, L.fc.janela_dias))),
      linha_base: r(media(valores(dias, "vfc_ms", hoje, L.fc.base_de, L.fc.base_ate))),
    },
    sono_horas: { atual_14d: r(media(valores(dias, "sono_horas", hoje, L.sono.janela_dias)), 1) },
    passos: {
      atual_30d: r(media(valores(dias, "passos", hoje, L.passos.janela_dias))),
      anterior_90d: r(media(valores(dias, "passos", hoje, L.passos.janela_dias + L.passos.anterior_dias, L.passos.janela_dias))),
    },
    eventos_ritmo_14d: eventosNaJanela(eventos, hoje, L.ritmo.janela_dias).length,
    dias_sem_dado_30d: 30 - ult30.filter((d) => d.fc_repouso !== null || d.passos !== null).length,
  };
}

// ---------- as 4 regras ----------
export function regraRitmo(eventos: Evento[], hoje: string): Alerta | null {
  const { eventos: n, janela_dias } = LIMIARES.ritmo;
  const recentes = eventosNaJanela(eventos, hoje, janela_dias);
  if (recentes.length < n) return null;
  const todos = eventos.filter((e) => e.tipo === "ritmo_irregular").sort((a, b) => a.data_hora.localeCompare(b.data_hora));
  const desde = todos.length > recentes.length ? `; ${todos.length} desde ${dataBr(todos[0].data_hora)}` : "";
  return {
    id: "ritmo_irregular", titulo: "Avisos de ritmo irregular", nivel: "atencao",
    motivo: `O relógio deu ${recentes.length} avisos de ritmo irregular nos últimos ${janela_dias} dias${desde}. A regra é: ${n} ou mais em ${janela_dias} dias.`,
    evidencias: todos.map((e) => ({ data: e.data_hora, valor: `aviso às ${e.data_hora.slice(11, 16)}` })),
    recomendacao: "Procure um cardiologista e leve este resumo. Se sentir palpitação com falta de ar, dor no peito ou desmaio, procure um pronto-socorro.",
    aviso: AVISO,
  };
}

export function regraFcRepouso(dias: Dia[], hoje: string): Alerta | null {
  const L = LIMIARES.fc;
  const atual = valores(dias, "fc_repouso", hoje, L.janela_dias);
  const base = valores(dias, "fc_repouso", hoje, L.base_de, L.base_ate);
  if (atual.length < LIMIARES.minimo_dias_com_dado || base.length < 30) return null;
  const a = media(atual)!, b = media(base)!;
  if (a - b < L.subida_bpm) return null;
  const periodo = `${mesAno(somarDias(hoje, -L.base_de + 1))} a ${mesAno(somarDias(hoje, -L.base_ate))}`;
  return {
    id: "fc_repouso_subindo", titulo: "Frequência cardíaca de repouso subindo", nivel: "atencao",
    motivo: `Sua frequência de repouso nas últimas 2 semanas foi ${fmt(a)} bpm em média, ${fmt(a - b)} acima da sua média de ${periodo} (${fmt(b)} bpm). A regra é: ${L.subida_bpm} bpm ou mais acima da sua linha de base.`,
    evidencias: [
      { data: `${somarDias(hoje, -L.base_de + 1)} a ${somarDias(hoje, -L.base_ate)}`, valor: `${fmt(b)} bpm (média, ${base.length} dias)` },
      { data: `${somarDias(hoje, -L.janela_dias + 1)} a ${hoje}`, valor: `${fmt(a)} bpm (média, ${atual.length} dias)` },
    ],
    recomendacao: "Vale comentar com seu médico, junto com os outros sinais. Pode ter causas simples (estresse, sono, infecção, falta de exercício).",
    aviso: AVISO,
  };
}

export function regraSono(dias: Dia[], hoje: string): Alerta | null {
  const L = LIMIARES.sono;
  const xs = valores(dias, "sono_horas", hoje, L.janela_dias);
  if (xs.length < LIMIARES.minimo_dias_com_dado) return null;
  const m = media(xs)!;
  if (m >= L.minimo_horas) return null;
  return {
    id: "sono_curto", titulo: "Sono curto nas últimas semanas", nivel: "info",
    motivo: `Você dormiu ${fmt(m, 1)} h por noite em média nos últimos ${L.janela_dias} dias (${xs.filter((x) => x < L.minimo_horas).length} de ${xs.length} noites abaixo de ${L.minimo_horas} h). A regra é: média abaixo de ${L.minimo_horas} h.`,
    evidencias: [{ data: `${somarDias(hoje, -L.janela_dias + 1)} a ${hoje}`, valor: `${fmt(m, 1)} h (média, ${xs.length} noites)` }],
    recomendacao: "Sono curto por semanas afeta pressão, glicose e coração. Se continuar, converse com seu médico.",
    aviso: AVISO,
  };
}

export function regraPassos(dias: Dia[], hoje: string): Alerta | null {
  const L = LIMIARES.passos;
  const atual = valores(dias, "passos", hoje, L.janela_dias);
  const antes = valores(dias, "passos", hoje, L.janela_dias + L.anterior_dias, L.janela_dias);
  if (atual.length < LIMIARES.minimo_dias_com_dado || antes.length < 30) return null;
  const a = media(atual)!, b = media(antes)!;
  const queda = (b - a) / b;
  if (queda < L.queda) return null;
  return {
    id: "atividade_caindo", titulo: "Atividade física caindo", nivel: "info",
    motivo: `Você deu ${fmt(Math.round(a / 10) * 10)} passos por dia em média no último mês, ${fmt(queda * 100)}% a menos que nos 3 meses anteriores (${fmt(Math.round(b / 10) * 10)}). A regra é: queda de ${fmt(L.queda * 100)}% ou mais.`,
    evidencias: [
      { data: `${somarDias(hoje, -(L.janela_dias + L.anterior_dias) + 1)} a ${somarDias(hoje, -L.janela_dias)}`, valor: `${fmt(Math.round(b))} passos/dia` },
      { data: `${somarDias(hoje, -L.janela_dias + 1)} a ${hoje}`, valor: `${fmt(Math.round(a))} passos/dia` },
    ],
    recomendacao: "Tente voltar ao seu ritmo de caminhada. Se a queda veio com cansaço ou falta de ar, comente com seu médico.",
    aviso: AVISO,
  };
}

// ---------- cruzamento com os exames ----------
type InsightsMin = { areas?: { id: string; status: string; motivos: string[] }[] };
const AREAS_CORACAO = ["colesterol", "glicemia"]; // fatores de risco cardiovascular vindos dos exames
/** Dentro dessas áreas, os exames que mais pesam para o coração (o resto fica no detalhe da área). */
const EXAMES_CORACAO = /^(LDL|Glicose|Hemoglobina glicada)/;

export function contextoExames(insights: InsightsMin | null): string[] {
  if (!insights?.areas) return [];
  const motivos = insights.areas.filter((a) => AREAS_CORACAO.includes(a.id) && a.status === "atencao").flatMap((a) => a.motivos);
  const principais = motivos.filter((m) => EXAMES_CORACAO.test(m));
  return (principais.length ? principais : motivos).map((m) => m.split(";")[0]); // frase curta, sem o histórico
}

// ---------- tudo junto ----------
export function gerarAlertas(lote: Lote, hoje: string, insights: InsightsMin | null = null): Alerta[] {
  const alertas = [
    regraRitmo(lote.eventos, hoje), regraFcRepouso(lote.dias, hoje), regraSono(lote.dias, hoje), regraPassos(lote.dias, hoje),
  ].filter((a): a is Alerta => a !== null);
  const ctx = contextoExames(insights);
  if (ctx.length) {
    for (const a of alertas) {
      if (a.id === "ritmo_irregular" || a.id === "fc_repouso_subindo") {
        a.contexto_exames = ctx;
        a.recomendacao += " Seus exames também mostram fatores de risco para o coração: leve os dois ao médico.";
      }
    }
  }
  return alertas;
}

export function montarRelogio(
  lote: Lote, hoje: string, fonte: RelogioJson["fonte"], ultima: string, insights: InsightsMin | null = null,
  paciente_id = "persona-roberto",
): RelogioJson {
  const dias = [...lote.dias].sort((a, b) => a.data.localeCompare(b.data));
  const eventos = [...lote.eventos].sort((a, b) => a.data_hora.localeCompare(b.data_hora));
  return {
    gerado_em: hoje, ultima_sincronizacao: ultima, fonte, paciente_id,
    periodo: { inicio: dias[0]?.data ?? hoje, fim: dias.at(-1)?.data ?? hoje },
    dias, eventos,
    resumo: montarResumo(dias, eventos, hoje),
    alertas: gerarAlertas({ dias, eventos }, hoje, insights),
  };
}
