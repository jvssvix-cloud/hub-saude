/**
 * Normalização determinística: unidade impressa -> unidade canônica, e validações.
 * Nada aqui usa IA: toda conversão é uma regra explicável.
 */
import type {
  Analito, Extracao, ExtracaoNormalizada, ResultadoExtraido, ResultadoNormalizado,
} from "./schema";

export const UNIDADE_CANONICA: Record<Analito, string> = {
  hemacias: "milhões/mm³", hemoglobina: "g/dL", hematocrito: "%", leucocitos: "/mm³",
  plaquetas: "/mm³", glicose: "mg/dL", hba1c: "%", colesterol_total: "mg/dL", hdl: "mg/dL",
  ldl: "mg/dL", triglicerides: "mg/dL", creatinina: "mg/dL", acido_urico: "mg/dL",
  tgo: "U/L", tgp: "U/L", tsh: "µUI/mL", psa: "ng/mL", vitamina_d: "ng/mL",
  insulina: "µUI/mL", colesterol_nao_hdl: "mg/dL", vldl: "mg/dL", fosfatase_alcalina: "U/L", ggt: "U/L",
  bilirrubina_total: "mg/dL", bilirrubina_direta: "mg/dL", bilirrubina_indireta: "mg/dL",
};

/** Faixa plausível (unidade canônica) para pegar erro de leitura/escala. Não é referência clínica. */
const PLAUSIVEL: Record<Analito, [number, number]> = {
  hemacias: [1, 9], hemoglobina: [3, 25], hematocrito: [10, 75], leucocitos: [500, 100000],
  plaquetas: [5000, 2000000], glicose: [20, 1000], hba1c: [3, 20], colesterol_total: [50, 600],
  hdl: [5, 200], ldl: [10, 500], triglicerides: [20, 5000], creatinina: [0.1, 20],
  acido_urico: [0.5, 20], tgo: [1, 5000], tgp: [1, 5000], tsh: [0.001, 200], psa: [0, 1000],
  vitamina_d: [2, 200], insulina: [0.1, 300], colesterol_nao_hdl: [20, 500], vldl: [1, 200],
  fosfatase_alcalina: [5, 2000], ggt: [1, 3000], bilirrubina_total: [0.05, 40],
  bilirrubina_direta: [0, 30], bilirrubina_indireta: [0, 30],
};

/** Deixa a unidade comparável: minúsculas, sem espaço, sem acento, µ/u unificados, ³ -> 3. */
export function chaveUnidade(u: string): string {
  return u
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[µμ]/g, "u")
    .replace(/\s+/g, "")
    .replace(/³/g, "3").replace(/²/g, "2").replace(/¹/g, "1").replace(/⁶/g, "6").replace(/⁹/g, "9")
    .replace(/\^/g, "")
    .replace(/[x×]10/g, "10");
}

const CONTAGEM_1 = ["/mm3", "mm3", "/ul", "celulas/mm3", "/mm3(ul)", "n°/mm3", "no/mm3", "n/mm3"];
const CONTAGEM_MIL = ["mil/mm3", "mil/ul", "103/ul", "103/mm3", "109/l", "10e3/ul", "k/ul"];
// "10/ul": laboratório que imprime "x10/µL" sem o expoente (laudo real One Life); a faixa plausível protege
const HEMACIAS = ["milhoes/mm3", "milhoes/ul", "106/ul", "106/mm3", "1012/l", "tera/l", "milh/mm3", "10/ul"];

/** Fator para converter o valor impresso para a unidade canônica (null = unidade desconhecida). */
const FATOR: Record<Analito, Record<string, number>> = {
  hemacias: Object.fromEntries(HEMACIAS.map((u) => [u, 1])),
  hemoglobina: { "g/dl": 1 },
  hematocrito: { "%": 1 },
  leucocitos: { ...Object.fromEntries(CONTAGEM_1.map((u) => [u, 1])), ...Object.fromEntries(CONTAGEM_MIL.map((u) => [u, 1000])) },
  plaquetas: { ...Object.fromEntries(CONTAGEM_1.map((u) => [u, 1])), ...Object.fromEntries(CONTAGEM_MIL.map((u) => [u, 1000])) },
  glicose: { "mg/dl": 1 },
  hba1c: { "%": 1 },
  colesterol_total: { "mg/dl": 1 },
  hdl: { "mg/dl": 1 },
  ldl: { "mg/dl": 1 },
  triglicerides: { "mg/dl": 1 },
  creatinina: { "mg/dl": 1 },
  acido_urico: { "mg/dl": 1 },
  tgo: { "u/l": 1, "ui/l": 1 },
  tgp: { "u/l": 1, "ui/l": 1 },
  tsh: { "uui/ml": 1, "uiu/ml": 1, "mui/l": 1, "miu/l": 1, "uu/ml": 1 },
  psa: { "ng/ml": 1 },
  vitamina_d: { "ng/ml": 1 },
  insulina: { "uui/ml": 1, "uiu/ml": 1, "mui/l": 1, "miu/l": 1, "uu/ml": 1 },
  colesterol_nao_hdl: { "mg/dl": 1 },
  vldl: { "mg/dl": 1 },
  fosfatase_alcalina: { "u/l": 1, "ui/l": 1 },
  ggt: { "u/l": 1, "ui/l": 1 },
  bilirrubina_total: { "mg/dl": 1 },
  bilirrubina_direta: { "mg/dl": 1 },
  bilirrubina_indireta: { "mg/dl": 1 },
};

/** Rede de segurança: se a IA marcou "outro", tenta reconhecer o exame pelo nome impresso. */
const SINONIMOS: [RegExp, Analito][] = [
  [/^insulina/i, "insulina"],
  [/n[aã]o[\s-]*hdl/i, "colesterol_nao_hdl"],
  [/vldl/i, "vldl"],
  [/fosfatase\s+alcalina/i, "fosfatase_alcalina"],
  [/gama[\s-]*glutamil|\bggt\b|gama[\s-]*gt/i, "ggt"],
  [/bilirrubina\s+total/i, "bilirrubina_total"],
  [/bilirrubina\s+direta/i, "bilirrubina_direta"],
  [/bilirrubina\s+indireta/i, "bilirrubina_indireta"],
];
export function reclassificar(r: ResultadoExtraido): ResultadoExtraido {
  if (r.analito !== "outro") return r;
  const achado = SINONIMOS.find(([re]) => re.test(r.nome_impresso));
  return achado ? { ...r, analito: achado[1] } : r;
}

/** Multiplica sem lixo de ponto flutuante (6.8 * 1000 = 6800, não 6799.999...). */
function vezes(x: number, f: number): number {
  return f === 1 ? x : Math.round(x * f * 1e6) / 1e6;
}

export function normalizarResultado(original: ResultadoExtraido): ResultadoNormalizado {
  const r = reclassificar(original);
  const alertas: string[] = [];
  if (r.analito === "outro") {
    return { ...r, unidade_canonica: null, valor_canonico: null, ref_min_canonico: null, ref_max_canonico: null, alertas: ["exame fora do dicionário"] };
  }
  const fator = FATOR[r.analito][chaveUnidade(r.unidade_impressa)];
  if (fator === undefined) alertas.push(`unidade desconhecida para ${r.analito}: "${r.unidade_impressa}"`);
  const conv = (x: number | null) => (x === null || fator === undefined ? null : vezes(x, fator));
  const valor = conv(r.valor_numerico);
  if (r.valor_numerico === null) alertas.push("valor não numérico");
  if (valor !== null) {
    const [lo, hi] = PLAUSIVEL[r.analito];
    if (valor < lo || valor > hi) alertas.push(`valor implausível (${valor} ${UNIDADE_CANONICA[r.analito]}): conferir leitura`);
  }
  // Coerência entre o marcador fora_da_faixa e os limites lidos.
  // Regra: valor claramente fora da referência => alterado, mesmo que a IA não tenha marcado.
  // O contrário (marcado, mas dentro) só vira alerta: a marcação pode vir do próprio laboratório.
  let fora = r.fora_da_faixa;
  if (r.valor_numerico !== null) {
    const v = r.valor_numerico;
    const claramenteFora = (r.ref_min !== null && v < r.ref_min) || (r.ref_max !== null && v > r.ref_max);
    const claramenteDentro = (r.ref_min === null || v > r.ref_min) && (r.ref_max === null || v < r.ref_max)
      && (r.ref_min !== null || r.ref_max !== null);
    if (claramenteFora && !fora) {
      fora = true;
      alertas.push("marcado como alterado pela regra: valor fora da referência lida");
    }
    if (claramenteDentro && fora) alertas.push("marcado como alterado, mas dentro da referência lida");
  }
  if (r.confianca === "baixa") alertas.push("leitura com baixa confiança");
  return {
    ...r,
    fora_da_faixa: fora,
    unidade_canonica: UNIDADE_CANONICA[r.analito],
    valor_canonico: valor,
    ref_min_canonico: conv(r.ref_min),
    ref_max_canonico: conv(r.ref_max),
    alertas,
  };
}

export function normalizar(e: Extracao): ExtracaoNormalizada {
  return { ...e, resultados: e.resultados.map(normalizarResultado) };
}
