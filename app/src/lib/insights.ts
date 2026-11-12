/**
 * Tipos e funções das telas. Os dados vêm de carregarInsights() (lib/dados.ts): banco ou, sem a chave, insights.json.
 * Tipos: só o que as telas usam, espelhando insights/src/tipos.ts.
 */

export type Fonte = { laudo_id: string; arquivo: string; laboratorio: string; pagina: number };

export type Ponto = {
  data: string;
  valor: number;
  ref_min: number | null;
  ref_max: number | null;
  fora_da_faixa: boolean;
  valor_impresso: string;
  unidade_impressa: string;
  referencia_impressa: string;
  qualificador: string | null;
  fonte: Fonte;
};

export type Tendencia = {
  direcao: "subindo" | "caindo" | "estavel";
  consistencia: number;
  variacao_pct: number;
  anos: number;
  fora_desde: string | null;
  texto: string;
};

export type Serie = {
  analito: string;
  nome: string;
  unidade: string;
  area: string;
  pontos: Ponto[];
  ultimo: Ponto;
  alterado: boolean;
  sentido: "acima" | "abaixo" | null;
  fora_seguidos: number;
  persistente: boolean;
  tendencia: Tendencia | null;
};

/** Resultado só em texto ("NÃO REAGENTE"): não vira série; é o estado "outros" dos filtros. */
export type ResultadoTexto = {
  analito: string; nome: string; data: string; texto: string; fora_da_faixa: boolean; referencia_impressa: string; fonte: Fonte;
};

export type Area = {
  id: string;
  nome: string;
  status: "atencao" | "em_dia" | "sem_dados_recentes";
  motivos: string[];
  analitos: string[];
  ultimo_exame: string;
};

export type Repeticao = {
  dias: number;
  analitos: string[];
  de: Fonte & { data: string };
  para: Fonte & { data: string };
  texto: string;
};

export type Insights = {
  paciente: { nome: string; nascimento: string; sexo: "M" | "F" };
  hoje: string;
  periodo: { inicio: string; fim: string; laudos: number; laboratorios: string[] };
  series: Serie[];
  resultados_texto?: ResultadoTexto[];
  areas: Area[];
  repeticoes: Repeticao[];
  /** Próximo exame de rotina de cada analito, pelo intervalo a partir do último resultado. */
  proximos: { analito: string; nome: string; ultimo: string; previsto: string; situacao: string }[];
  /** Regra 8 (insights/src/faltantes.ts): pedidos que faltam para as ferramentas de apoio ao médico. */
  exames_que_faltam?: import("@insights/faltantes").ExameQueFalta[];
  /** Situação vacinal pelo calendário oficial (null quando o escopo não libera vacinas). */
  vacinacao?: {
    fonte: string;
    doses?: { vacina: string; dose: string; data: string; fontes: { documento_id: string; arquivo: string; pagina: number }[] }[];
    situacao: { vacina: string; nome: string; status: string; texto: string }[];
  } | null;
  resumo_medico: string[];
};

const ORDEM_STATUS: Record<Area["status"], number> = { atencao: 0, sem_dados_recentes: 1, em_dia: 2 };

/** Áreas com "atenção" primeiro. */
export function areasOrdenadas(insights: Insights): Area[] {
  return [...insights.areas].sort((a, b) => ORDEM_STATUS[a.status] - ORDEM_STATUS[b.status]);
}

export function serie(insights: Insights, analito: string): Serie | undefined {
  return insights.series.find((s) => s.analito === analito);
}

export function seriesDaArea(insights: Insights, area: Area): Serie[] {
  return area.analitos.map((a) => serie(insights, a)).filter((s): s is Serie => !!s);
}

/** Todos os exames na ordem em que aparecem em Exames (sistema a sistema): base do anterior/próximo. */
export function seriesEmOrdem(insights: Insights): Serie[] {
  const vistos = new Set<string>();
  const ordem: Serie[] = [];
  const por = (lista: Serie[]) => {
    for (const s of lista) {
      if (vistos.has(s.analito)) continue;
      vistos.add(s.analito);
      ordem.push(s);
    }
  };
  for (const a of areasOrdenadas(insights)) {
    por(seriesDaArea(insights, a).sort((x, y) => Number(y.alterado) - Number(x.alterado)));
  }
  por(insights.series);
  return ordem;
}

const semAcento = (t: string) =>
  t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Exames citados num texto livre (nota do médico), pelo nome ou pela sigla: "LDL", "glicose em jejum", "HbA1c". */
export function seriesCitadas(insights: Insights, texto: string): Serie[] {
  const alvo = ` ${semAcento(texto)} `;
  const achados = insights.series.flatMap((s) => {
    const sigla = s.nome.match(/\(([^)]+)\)/)?.[1];
    const termos = [s.nome.replace(/ \(.*\)$/, ""), ...(sigla ? [sigla] : [])].map(semAcento);
    const termo = termos.find((t) => alvo.includes(` ${t} `));
    return termo ? [{ s, termo }] : [];
  });
  // "hemoglobina glicada" não pode puxar também "Hemoglobina": vale o nome mais longo
  return achados
    .filter((a) => !achados.some((b) => b !== a && b.termo.length > a.termo.length && ` ${b.termo} `.includes(` ${a.termo} `)))
    .map((a) => a.s);
}

export function areaDe(insights: Insights, s: Serie): Area | undefined {
  return insights.areas.find((a) => a.id === s.area);
}

/**
 * Link para o documento original na página certa (o navegador abre o PDF na página).
 * Arquivo enviado pelo app (enviados/...) só abre para o paciente dono (sessão) ou com o token de um consentimento
 * válido: a visão do médico passa o token, que vai como ?t= e é conferido a cada abertura (revogou, parou de abrir).
 */
export function linkLaudo(f: Pick<Fonte, "arquivo" | "pagina">, token?: string): string {
  const t = token && f.arquivo.startsWith("enviados/") ? `?t=${encodeURIComponent(token)}` : "";
  return `/${f.arquivo}${t}#page=${f.pagina}`;
}

// ---------------------------------------------------------------- formatação (pt-BR)
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function dataBr(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

export function mesAno(iso: string): string {
  const [a, m] = iso.split("-");
  return `${MESES[Number(m) - 1]}/${a}`;
}

export function numero(v: number): string {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

export function idade(nascimento: string, hoje: string): number {
  const [an, mn, dn] = nascimento.split("-").map(Number);
  const [ah, mh, dh] = hoje.split("-").map(Number);
  return ah - an - (mh < mn || (mh === mn && dh < dn) ? 1 : 0);
}

/** "até 130", "70 a 99", "acima de 40" */
export function faixa(min: number | null, max: number | null, unidade: string): string {
  if (min !== null && max !== null) return `${numero(min)} a ${numero(max)} ${unidade}`;
  if (max !== null) return `até ${numero(max)} ${unidade}`;
  if (min !== null) return `acima de ${numero(min)} ${unidade}`;
  return "sem referência numérica";
}
