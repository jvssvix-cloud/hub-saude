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
  areas: Area[];
  repeticoes: Repeticao[];
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

export function areaDe(insights: Insights, s: Serie): Area | undefined {
  return insights.areas.find((a) => a.id === s.area);
}

/** Link para o documento original na página certa (o navegador abre o PDF na página). */
export function linkLaudo(f: Pick<Fonte, "arquivo" | "pagina">): string {
  return `/${f.arquivo}#page=${f.pagina}`;
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
