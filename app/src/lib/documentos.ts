/**
 * Documentos: cada laudo original e os resultados que saíram dele, montados a partir da origem de cada ponto das séries.
 * (Todo número do app aponta para um laudo; aqui é o caminho inverso: do laudo para os números.)
 */
import type { Insights } from "@/lib/insights";

export type ResultadoDoLaudo = {
  analito: string;
  nome: string;
  valor: number;
  qualificador: string | null;
  unidade: string;
  ref_min: number | null;
  ref_max: number | null;
  fora: boolean;
  pagina: number;
};

export type Laudo = {
  id: string;
  arquivo: string;
  laboratorio: string;
  data: string;
  resultados: ResultadoDoLaudo[];
};

export function laudos(i: Insights): Laudo[] {
  const m = new Map<string, Laudo>();
  for (const s of i.series) {
    for (const p of s.pontos) {
      const l = m.get(p.fonte.laudo_id) ?? {
        id: p.fonte.laudo_id, arquivo: p.fonte.arquivo, laboratorio: p.fonte.laboratorio, data: p.data, resultados: [],
      };
      l.resultados.push({
        analito: s.analito, nome: s.nome, valor: p.valor, qualificador: p.qualificador ?? null, unidade: s.unidade,
        ref_min: p.ref_min, ref_max: p.ref_max, fora: p.fora_da_faixa, pagina: p.fonte.pagina,
      });
      m.set(l.id, l);
    }
  }
  return [...m.values()]
    .map((l) => ({ ...l, resultados: l.resultados.sort((a, b) => Number(b.fora) - Number(a.fora)) }))
    .sort((a, b) => b.data.localeCompare(a.data));
}

/** "LABORATÓRIO DELTA DE ANÁLISES CLÍNICAS" -> "Laboratório Delta de Análises Clínicas" */
export const nomeLab = (lab: string) =>
  lab.toLowerCase().replace(/(^|\s)(\p{L})/gu, (_, e, c) => e + c.toUpperCase()).replace(/ De | Da | Do /g, (x) => x.toLowerCase());
