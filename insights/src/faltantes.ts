/**
 * Regra 8: o exame que falta.
 *
 * As ferramentas de apoio ao médico (FIB-4, modelo do fígado em risco/figado/, glicemia) precisam de exames
 * RECENTES. Esta regra olha o histórico e diz, agrupado por PEDIDO (como o médico escreve a guia), o que falta
 * ou está desatualizado, o que cada pedido destrava e quanto ele pesa. Assim o modelo guia a coleta:
 * "a GGT nunca foi feita; ela é um dos exames que mais pesam na avaliação do fígado".
 *
 * Só regra e os pesos publicados no risco/saida/figado.json: nada de IA, nada de diagnóstico.
 */
import figadoJson from "../../risco/saida/figado.json";
import type { Serie } from "./tipos";

/** Exame mais antigo que isto não vale como "atual" para as ferramentas. */
export const VALIDADE_MESES = 12;

/** Pedidos com relação clínica com fígado e metabolismo, como o médico escreve, e os analitos que trazem. */
export const PEDIDOS: { id: string; nome: string; analitos: string[] }[] = [
  { id: "hemograma", nome: "Hemograma completo (plaquetas)", analitos: ["plaquetas"] },
  { id: "transaminases", nome: "TGO e TGP", analitos: ["tgo", "tgp"] },
  { id: "ggt", nome: "Gama-GT (GGT)", analitos: ["ggt"] },
  { id: "glicemia", nome: "Glicemia de jejum e HbA1c", analitos: ["glicose", "hba1c"] },
  { id: "lipidico", nome: "Perfil lipídico (colesterol, HDL, triglicérides)", analitos: ["colesterol_total", "hdl", "triglicerides"] },
  { id: "fosfatase", nome: "Fosfatase alcalina", analitos: ["fosfatase_alcalina"] },
  { id: "bilirrubinas", nome: "Bilirrubinas", analitos: ["bilirrubina_total"] },
  { id: "insulina", nome: "Insulina de jejum", analitos: ["insulina"] },
];
// Fora de propósito: creatinina, ácido úrico e ferritina também têm peso no modelo, mas por efeito estatístico
// (massa muscular, sexo) e não por relação clínica com o fígado. Pedir por isso confundiria o médico.

export type ExameQueFalta = {
  pedido: string;
  nome: string;
  analitos: string[];
  /** Analitos do pedido sem resultado nenhum / com o último resultado velho. */
  nunca_feitos: string[];
  desatualizados: { analito: string; ultimo: string }[];
  /** Ferramentas que SÓ funcionam com este pedido (sem ele, não há cálculo). */
  destrava: string[];
  /** Peso no modelo do fígado (maior |coeficiente padronizado| entre os achados). 0 = não entra. */
  peso: number;
  /** 1 = destrava uma ferramenta; 2 = pesa muito (>= 0,3); 3 = pesa (>= 0,1). */
  prioridade: 1 | 2 | 3;
  texto: string;
};

type VersaoModelo = { sinais: string[]; coeficientes: number[] };
type FigadoJson = { exige: string[]; alvos: Record<string, { versoes: Record<string, VersaoModelo> }> };

/** Maior |peso padronizado| de cada exame no modelo completo do fígado (todos os achados). */
export function pesosFigado(m: FigadoJson = figadoJson as unknown as FigadoJson): Record<string, number> {
  const pesos: Record<string, number> = {};
  for (const alvo of Object.values(m.alvos)) {
    const v = alvo.versoes.perfil_exames;
    if (!v) continue;
    v.sinais.forEach((s, i) => {
      // a razão TGO/TGP vem dos dois exames
      for (const a of s === "razao_tgo_tgp" ? ["tgo", "tgp"] : [s]) {
        pesos[a] = Math.max(pesos[a] ?? 0, Math.abs(v.coeficientes[i]));
      }
    });
  }
  return pesos;
}

function mesesEntre(de: string, ate: string): number {
  const [a, b] = [new Date(de), new Date(ate)];
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + (b.getDate() < a.getDate() ? -1 : 0);
}

const mesAno = (d: string) => `${d.slice(5, 7)}/${d.slice(0, 4)}`;

export function examesQueFaltam(series: Serie[], hoje: string, pesos = pesosFigado()): ExameQueFalta[] {
  const ultimo = new Map(series.map((s) => [s.analito, s.ultimo.data]));
  const recente = (a: string) => {
    const d = ultimo.get(a);
    return d !== undefined && mesesEntre(d, hoje) < VALIDADE_MESES;
  };

  // O que cada ferramenta exige (sem estes exames recentes, ela não calcula).
  const ferramentas: { nome: string; exige: string[] }[] = [
    { nome: "FIB-4", exige: ["tgo", "tgp", "plaquetas"] },
    { nome: "avaliação do fígado (modelo)", exige: (figadoJson as unknown as FigadoJson).exige.filter((x) => !["idade", "imc"].includes(x)) },
  ];
  // Sem HbA1c nem glicemia recentes, a pergunta "a glicemia está alterada?" fica sem resposta direta.
  const glicemiaDireta = recente("hba1c") || recente("glicose");

  const out: ExameQueFalta[] = [];
  for (const p of PEDIDOS) {
    const faltam = p.analitos.filter((a) => !recente(a));
    if (!faltam.length) continue;
    const nunca = faltam.filter((a) => !ultimo.has(a));
    const velhos = faltam.filter((a) => ultimo.has(a)).map((a) => ({ analito: a, ultimo: ultimo.get(a)! }));

    const destrava = ferramentas.filter((f) => f.exige.some((a) => faltam.includes(a))).map((f) => f.nome);
    if (p.id === "glicemia" && !glicemiaDireta) destrava.push("resposta direta sobre a glicemia");
    const peso = Math.max(0, ...faltam.map((a) => pesos[a] ?? 0));
    if (!destrava.length && peso < 0.1) continue; // não muda nenhuma ferramenta: não vale pedir por isso

    const prioridade: 1 | 2 | 3 = destrava.length ? 1 : peso >= 0.3 ? 2 : 3;
    const situacao = [
      nunca.length ? (nunca.length === p.analitos.length ? "nunca feito no histórico" : `sem ${nunca.join(", ")} no histórico`) : "",
      velhos.length ? `último em ${mesAno(velhos.map((v) => v.ultimo).sort()[0])}` : "",
    ].filter(Boolean).join("; ");
    const motivo = destrava.length
      ? `sem este pedido não dá para calcular: ${destrava.join(", ")}`
      : `${prioridade === 2 ? "pesa muito" : "pesa"} na estimativa do fígado`;
    out.push({
      pedido: p.id, nome: p.nome, analitos: p.analitos, nunca_feitos: nunca, desatualizados: velhos,
      destrava, peso: Math.round(peso * 100) / 100, prioridade,
      texto: `${p.nome}: ${situacao}. ${motivo[0].toUpperCase()}${motivo.slice(1)}.`,
    });
  }
  return out.sort((a, b) => a.prioridade - b.prioridade || b.peso - a.peso);
}
