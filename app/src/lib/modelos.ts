/**
 * Modelos preditivos (risco/) calculados no app. Roda no servidor E no navegador (as páginas de Previsões
 * recalculam enquanto o médico mexe nos dados). Os parâmetros vêm direto dos JSONs gerados em Python
 * (risco/saida/figado.json e modelo.json): nada de número escrito à mão.
 *
 * Cada previsão devolve, além da probabilidade, a contribuição de cada sinal (coef · x padronizado) e quais sinais
 * foram ESTIMADOS pela mediana da população (faltaram). Apoio à decisão do médico; não é diagnóstico.
 */
import figadoJson from "../../../risco/saida/figado.json";
import glicemiaJson from "../../../risco/saida/modelo.json";

type Versao = {
  sinais: string[]; medianas: Record<string, number>; limites: Record<string, number[]>;
  media: number[]; desvio: number[]; coeficientes: number[]; intercepto: number;
};
type VersaoFigado = Versao & {
  auc_teste: number; auc_teste_ic95: number[]; corte_encaminhar?: number; cortes_faixas?: number[];
  calibracao_validacao_cruzada: { previsto: number; observado: number; n: number }[];
};
type VersaoGlicemia = Versao & {
  exige: string[]; limiar_procurar_medico: number; prevalencia: number;
  avaliacao: { teste_2013_2014: { n: number; auc: number; auc_ic95: number[]; auc_ada: number; sensibilidade: number; especificidade: number } };
};
type Encaminhamento = { pct_encaminhados_sens80_teste: number; encaminhar_para_achar_1: number; sensibilidade: number };
type AlvoFigado = {
  descricao: string; versoes: Record<string, VersaoFigado>;
  comparacoes: { modelo: string; contra: string; delta_auc: number; ic95: number[] }[];
  encaminhamento_80: Record<string, Encaminhamento>;
};

const FIG = figadoJson as unknown as {
  fonte: string; transformacao_log: string[]; nomes: Record<string, string>;
  alvos: Record<"esteatose" | "fibrose" | "fibrose_avancada", AlvoFigado>;
  indices_clinicos: Record<string, { nome: string; formula: string; cortes?: number[]; referencia: string; nota?: string }>;
};
const GLI = glicemiaJson as unknown as {
  fonte: string; transformacao_log1p: string[]; nomes: Record<string, string>;
  alvos: Record<"alterado" | "diabetes_oculto", {
    descricao: string; versoes: Record<string, VersaoGlicemia>;
    comparacoes_pareadas: { versao: string; contra: string; delta_auc: number; ic95: number[] }[];
  }>;
};

export const FIGADO = FIG;
export const GLICEMIA = GLI;

export type Entrada = Record<string, number | null | undefined>;
export type Contribuicao = { sinal: string; nome: string; valor: number | null; estimado: boolean; efeito: number };
export type Previsao = { p: number; contribuicoes: Contribuicao[]; estimados: string[] };

function avaliar(v: Versao, x: Entrada, transformar: (sinal: string, valor: number) => number, nomes: Record<string, string>): Previsao {
  let z = v.intercepto;
  const contribuicoes: Contribuicao[] = v.sinais.map((s, i) => {
    const bruto = x[s];
    const estimado = bruto === null || bruto === undefined || !Number.isFinite(bruto);
    const [lo, hi] = v.limites[s];
    const usado = Math.min(Math.max(estimado ? v.medianas[s] : (bruto as number), lo), hi);
    const efeito = (v.coeficientes[i] * (transformar(s, usado) - v.media[i])) / v.desvio[i];
    z += efeito;
    return { sinal: s, nome: nomes[s] ?? s, valor: estimado ? null : (bruto as number), estimado, efeito };
  });
  return {
    p: 1 / (1 + Math.exp(-z)),
    contribuicoes: contribuicoes.sort((a, b) => Math.abs(b.efeito) - Math.abs(a.efeito)),
    estimados: contribuicoes.filter((c) => c.estimado).map((c) => c.sinal),
  };
}

// ---------------- fígado ----------------
export type AlvoFig = keyof typeof FIG.alvos;
export const ALVOS_FIGADO: AlvoFig[] = ["esteatose", "fibrose", "fibrose_avancada"];
export const NOME_ALVO_FIGADO: Record<AlvoFig, string> = {
  esteatose: "Gordura no fígado (esteatose)",
  fibrose: "Fibrose significativa (F2+)",
  fibrose_avancada: "Fibrose avançada (F3+)",
};

/** Entrada com a razão TGO/TGP calculada. Plaquetas em mil/mm³. */
function comRazao(x: Entrada): Entrada {
  return { ...x, razao_tgo_tgp: x.tgo && x.tgp ? x.tgo / x.tgp : null };
}

export function previsaoFigado(alvo: AlvoFig, x: Entrada, versao = "perfil_exames"): Previsao & { corte: number; acima: boolean } {
  const v = FIG.alvos[alvo].versoes[versao];
  const log = new Set(FIG.transformacao_log);
  const r = avaliar(v, comRazao(x), (s, val) => (log.has(s) ? Math.log(Math.max(val, 1e-3)) : val), FIG.nomes);
  const corte = v.corte_encaminhar ?? 0.5;
  return { ...r, corte, acima: r.p >= corte };
}

/** FIB-4 = idade × TGO / (plaquetas[mil/mm³] × √TGP). */
export function fib4(x: Entrada): number | null {
  const { idade, tgo, tgp, plaquetas } = x;
  if (!idade || !tgo || !tgp || !plaquetas) return null;
  return (idade * tgo) / (plaquetas * Math.sqrt(tgp));
}
export function faixaFib4(f: number): { nivel: "baixo" | "indeterminado" | "alto"; texto: string } {
  if (f < 1.3) return { nivel: "baixo", texto: "baixo risco de fibrose avançada" };
  if (f <= 2.67) return { nivel: "indeterminado", texto: "zona indeterminada" };
  return { nivel: "alto", texto: "alto risco de fibrose avançada" };
}
/** Hepatic Steatosis Index = 8·TGP/TGO + IMC + 2·diabetes + 2·mulher (Lee 2010). */
export function hsi(x: Entrada): number | null {
  if (!x.tgo || !x.tgp || !x.imc) return null;
  return (8 * x.tgp) / x.tgo + x.imc + 2 * (x.diabetes === 1 ? 1 : 0) + 2 * (x.masculino === 0 ? 1 : 0);
}

// ---------------- glicemia ----------------
export type AlvoGli = keyof typeof GLI.alvos;
export const NOME_ALVO_GLICEMIA: Record<AlvoGli, string> = {
  alterado: "Glicemia alterada (HbA1c ≥ 5,7%)",
  diabetes_oculto: "Diabetes não diagnosticado (HbA1c ≥ 6,5%)",
};

/** Escolhe a versão do modelo de glicemia pelos dados que existem (exames e/ou relógio). */
export function versaoGlicemia(x: Entrada): string {
  const exames = x.hdl != null && x.triglicerides != null;
  const relogio = x.sono_h != null;
  return exames && relogio ? "completo" : exames ? "perfil_exames" : relogio ? "perfil_relogio" : "perfil";
}

export function previsaoGlicemia(alvo: AlvoGli, x: Entrada, versao = versaoGlicemia(x)): Previsao & { corte: number; acima: boolean; versao: string } {
  const v = GLI.alvos[alvo].versoes[versao];
  const log = new Set(GLI.transformacao_log1p);
  const r = avaliar(v, { ...x, sono_extremo_h: x.sono_h != null ? Math.abs(x.sono_h - 7.5) : null },
    (s, val) => (log.has(s) ? Math.log1p(Math.max(val, 0)) : val), GLI.nomes);
  return { ...r, corte: v.limiar_procurar_medico, acima: r.p >= v.limiar_procurar_medico, versao };
}

/** Sinais com relação clínica clara (o que o painel mostra em "o que mais pesou"; os outros ficam em "outros"). */
export const SINAIS_CLINICOS = new Set([
  "idade", "imc", "diabetes", "masculino", "tgo", "tgp", "razao_tgo_tgp", "ggt", "plaquetas", "triglicerides", "hdl",
  "hba1c", "glicose", "insulina", "bilirrubina_total", "familia_diabetes", "pressao_alta", "fc_repouso", "sono_h",
  "sono_irregular_h", "meio_sono_irregular_h", "exercicio_h_semana", "alcool", "acido_urico",
]);
