/**
 * Normalização determinística: unidade impressa -> unidade canônica, e validações.
 * Nada aqui usa IA: toda conversão é uma regra explicável.
 */
import type {
  Analito, Descritivo, DescritivoNormalizado, DoseExtraida, DoseNormalizada, Extracao, ExtracaoNormalizada,
  ResultadoExtraido, ResultadoNormalizado,
} from "./schema";

export const UNIDADE_CANONICA: Record<Analito, string> = {
  hemacias: "milhões/mm³", hemoglobina: "g/dL", hematocrito: "%", leucocitos: "/mm³",
  plaquetas: "/mm³", glicose: "mg/dL", hba1c: "%", colesterol_total: "mg/dL", hdl: "mg/dL",
  ldl: "mg/dL", triglicerides: "mg/dL", creatinina: "mg/dL", acido_urico: "mg/dL",
  tgo: "U/L", tgp: "U/L", tsh: "µUI/mL", psa: "ng/mL", vitamina_d: "ng/mL",
  insulina: "µUI/mL", colesterol_nao_hdl: "mg/dL", vldl: "mg/dL", fosfatase_alcalina: "U/L", ggt: "U/L",
  bilirrubina_total: "mg/dL", bilirrubina_direta: "mg/dL", bilirrubina_indireta: "mg/dL",
  ferritina: "ng/mL", vitamina_b12: "pg/mL", t4_livre: "ng/dL", anti_tpo: "UI/mL", anti_tireoglobulina: "UI/mL",
  tfg: "mL/min/1,73m²", magnesio: "mg/dL", lipase: "U/L", cortisol: "µg/dL", pth: "pg/mL",
  homocisteina: "µmol/L", glicemia_media_estimada: "mg/dL", anti_endomisio: "", anti_transglutaminase_iga: "U/mL",
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
  ferritina: [1, 10000], vitamina_b12: [50, 5000], t4_livre: [0.1, 10], anti_tpo: [0, 10000],
  anti_tireoglobulina: [0, 10000], tfg: [1, 200], magnesio: [0.5, 6], lipase: [1, 5000], cortisol: [0.1, 100],
  pth: [1, 3000], homocisteina: [1, 200], glicemia_media_estimada: [40, 600], anti_endomisio: [0, 1e6],
  anti_transglutaminase_iga: [0, 1000],
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
// Hemácias como número inteiro ("4.290.000 /mm3"): divide por 1 milhão (laudo real de outro laboratório)
const HEMACIAS_UNIDADE = ["/mm3", "mm3", "/ul", "celulas/mm3"];
const MICRO_UI = { "uui/ml": 1, "uiu/ml": 1, "mui/l": 1, "miu/l": 1, "uu/ml": 1, "microui/ml": 1, "microu/ml": 1 };

/** Fator para converter o valor impresso para a unidade canônica (null = unidade desconhecida). */
const FATOR: Record<Analito, Record<string, number>> = {
  hemacias: { ...Object.fromEntries(HEMACIAS.map((u) => [u, 1])), ...Object.fromEntries(HEMACIAS_UNIDADE.map((u) => [u, 1e-6])) },
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
  tsh: MICRO_UI,
  psa: { "ng/ml": 1 },
  vitamina_d: { "ng/ml": 1 },
  insulina: MICRO_UI,
  colesterol_nao_hdl: { "mg/dl": 1 },
  vldl: { "mg/dl": 1 },
  fosfatase_alcalina: { "u/l": 1, "ui/l": 1 },
  ggt: { "u/l": 1, "ui/l": 1 },
  bilirrubina_total: { "mg/dl": 1 },
  bilirrubina_direta: { "mg/dl": 1 },
  bilirrubina_indireta: { "mg/dl": 1 },
  ferritina: { "ng/ml": 1, "ug/l": 1 },
  vitamina_b12: { "pg/ml": 1, "pgml": 1, "ng/l": 1 },
  t4_livre: { "ng/dl": 1 },
  anti_tpo: { "ui/ml": 1, "u/ml": 1, "kui/l": 1 },
  anti_tireoglobulina: { "ui/ml": 1, "u/ml": 1, "kui/l": 1 },
  tfg: { "ml/min/1,73m2": 1, "ml/min/1.73m2": 1, "ml/min/1,73": 1, "ml/min": 1 },
  magnesio: { "mg/dl": 1 },
  lipase: { "u/l": 1, "ui/l": 1 },
  cortisol: { "ug/dl": 1, "mcg/dl": 1 },
  pth: { "pg/ml": 1 },
  homocisteina: { "umol/l": 1, "micromol/l": 1 },
  glicemia_media_estimada: { "mg/dl": 1 },
  anti_endomisio: { "": 1 },
  anti_transglutaminase_iga: { "u/ml": 1, "ui/ml": 1 },
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
  [/ferritina/i, "ferritina"],
  [/vitamina\s*b\s*12|cobalamina/i, "vitamina_b12"],
  [/t4\s*livre|tiroxina\s+livre/i, "t4_livre"],
  [/tireoperoxidase|anti[\s-]*tpo/i, "anti_tpo"],
  [/tireoglobulina,?\s*anticorpos|anti[\s-]*tireoglobulina/i, "anti_tireoglobulina"],
  [/filtra[cç][aã]o\s+glomerular|\btfg\b|\begfr\b|\brfg\b/i, "tfg"],
  [/magn[eé]sio/i, "magnesio"],
  [/lipase/i, "lipase"],
  [/cortisol/i, "cortisol"],
  [/paratorm[oô]nio|\bpth\b/i, "pth"],
  [/homociste[ií]na/i, "homocisteina"],
  [/glicemia\s+m[eé]dia\s+estimada/i, "glicemia_media_estimada"],
  [/endom[ií]sio/i, "anti_endomisio"],
  [/transglutaminase|\bttg\b/i, "anti_transglutaminase_iga"],
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

/** "Resultado (GLICOSE)" -> "GLICOSE": o modelo às vezes junta o rótulo do valor ao nome da seção (laudo real, v6). */
function limparNome(r: ResultadoExtraido): ResultadoExtraido {
  const m = /^\s*resultados?\s*[(:\-–]\s*(.+?)\)?\s*$/i.exec(r.nome_impresso);
  return m && m[1].trim() ? { ...r, nome_impresso: m[1].trim() } : r;
}

export function normalizarResultado(original: ResultadoExtraido): ResultadoNormalizado {
  const r = reclassificar(limparNome(original));
  const alertas: string[] = [];
  if (r.analito === "outro") {
    return { ...r, unidade_canonica: null, valor_canonico: null, ref_min_canonico: null, ref_max_canonico: null, alertas: ["exame fora do dicionário"] };
  }
  // Resultado só em texto ("NÃO REAGENTE"): não há número nem unidade para converter
  if (r.valor_numerico === null && r.resultado_texto) {
    return { ...r, unidade_canonica: UNIDADE_CANONICA[r.analito], valor_canonico: null,
      ref_min_canonico: null, ref_max_canonico: null, alertas };
  }
  let fator: number | undefined = FATOR[r.analito][chaveUnidade(r.unidade_impressa)];
  if (fator === undefined && r.unidade_impressa.trim() === "" && r.valor_numerico !== null) {
    // Unidade não impressa na linha (ex.: plaquetas "167.000" sob cabeçalho de coluna):
    // deduz pela ordem de grandeza, testando fator 1 e depois 1000 (contagens em "mil").
    const [lo, hi] = PLAUSIVEL[r.analito];
    fator = [1, 1000].find((f) => r.valor_numerico! * f >= lo && r.valor_numerico! * f <= hi);
    if (fator !== undefined) alertas.push(`unidade não impressa; deduzida pela ordem de grandeza (${fator === 1 ? "" : "× 1000 → "}${UNIDADE_CANONICA[r.analito]})`);
  }
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
  // Com qualificador ("< 0,2", "> 90") o valor é só um limite: mantém a marcação lida
  if (r.valor_numerico !== null && !r.qualificador) {
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

/** Dose de vacina: só validações (data válida, não futura, depois do nascimento). */
export function normalizarDose(d: DoseExtraida, nascimento?: string): DoseNormalizada {
  const alertas: string[] = [];
  if (d.vacina === "outra") alertas.push("vacina fora do dicionário");
  if (!d.data || !/^\d{4}-\d{2}-\d{2}$/.test(d.data) || Number.isNaN(Date.parse(d.data))) {
    alertas.push("data ilegível ou inválida");
  } else {
    if (d.data > new Date().toISOString().slice(0, 10)) alertas.push("data no futuro: conferir leitura");
    if (nascimento && d.data < nascimento) alertas.push("data antes do nascimento: conferir leitura");
  }
  if (d.confianca === "baixa") alertas.push("leitura com baixa confiança");
  return { ...d, alertas };
}

export function normalizar(e: Extracao, nascimento?: string): ExtracaoNormalizada {
  // Laudo com várias datas de coleta: se a data do documento veio vazia, usa a coleta mais recente
  const datas = (e.resultados ?? []).map((r) => r.data_coleta).filter((d): d is string => !!d).sort();
  const documento = e.documento.data_coleta || !datas.length ? e.documento : { ...e.documento, data_coleta: datas.at(-1)! };
  return {
    ...e,
    documento,
    tipo_documento: e.tipo_documento ?? "laudo_exame", // leituras antigas (prompt v1-v3) não tinham o campo
    resultados: (e.resultados ?? []).map(normalizarResultado),
    doses: (e.doses ?? []).map((d) => normalizarDose(d, nascimento)),
    descritivo: e.tipo_documento === "laudo_descritivo" && e.descritivo ? normalizarDescritivo(e.descritivo, nascimento) : null,
  };
}

/** Laudo descritivo: só confere a data e a conclusão (o texto é copiado do laudo, não há o que converter). */
export function normalizarDescritivo(d: Descritivo, nascimento?: string): DescritivoNormalizado {
  const alertas: string[] = [];
  if (!d.data_exame || !/^\d{4}-\d{2}-\d{2}$/.test(d.data_exame) || Number.isNaN(Date.parse(d.data_exame))) {
    alertas.push("data do exame não encontrada ou inválida");
  } else {
    if (d.data_exame > new Date().toISOString().slice(0, 10)) alertas.push("data no futuro: conferir leitura");
    if (nascimento && d.data_exame < nascimento) alertas.push("data antes do nascimento: conferir leitura");
  }
  if (!d.conclusao.trim()) alertas.push("conclusão não encontrada");
  if (d.confianca === "baixa") alertas.push("leitura com baixa confiança");
  return { ...d, conclusao: d.conclusao.trim(), alertas };
}
