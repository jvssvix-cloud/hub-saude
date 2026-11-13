/**
 * Regra 9: trajetória pessoal. O que o histórico DA PRÓPRIA PESSOA prevê para cada exame.
 *
 * Nenhum modelo populacional (NHANES, FIB-4, SAFE) tem isto: a série de cada exame ao longo dos anos, de vários
 * laboratórios. Com ela:
 *  - para onde o exame vai, com faixa de incerteza (intervalo de previsão de 80%);
 *  - QUANDO ele deve cruzar um limite (a referência do laudo ou um limite clínico, como HbA1c 6,5%);
 *  - se o próximo resultado é previsível e normal (repetir agora agrega pouco: o médico decide).
 *
 * Método: regressão linear do valor no tempo (anos), com o intervalo de previsão clássico
 * ŷ ± t · s · √(1 + 1/n + (t₀ − t̄)² / Sxx). Simples, explicável, e honesto sobre a incerteza: com poucos pontos
 * ou muita oscilação, a faixa fica larga e a regra diz "sem tendência definida". Não é diagnóstico.
 */

export type PontoSerie = { data: string; valor: number; ref_min: number | null; ref_max: number | null; qualificador?: string | null };
export type SerieEntrada = { analito: string; nome: string; unidade: string; pontos: PontoSerie[] };

/** Limites clínicos além da referência do laudo (critérios diagnósticos usados na prática). */
export const LIMITES_CLINICOS: Record<string, { valor: number; rotulo: string }[]> = {
  hba1c: [{ valor: 5.7, rotulo: "faixa de pré-diabetes" }, { valor: 6.5, rotulo: "critério de diabetes" }],
  glicose: [{ valor: 100, rotulo: "glicemia de jejum alterada" }, { valor: 126, rotulo: "critério de diabetes" }],
  ldl: [{ valor: 190, rotulo: "LDL muito alto (≥ 190)" }],
  triglicerides: [{ valor: 500, rotulo: "risco de pancreatite (≥ 500)" }],
};

export const NIVEL = 0.8; // intervalo de previsão de 80%: "provável", legível para o médico
export const HORIZONTE_ANOS = 15;

export type Cruzamento = {
  limite: number;
  rotulo: string;
  sentido: "acima" | "abaixo";
  /** Já está do outro lado do limite no último resultado. */
  ja_cruzou: boolean;
  /** Data central em que a linha cruza o limite, e a janela provável (bordas da faixa de 80%). null = além do horizonte. */
  central: string | null;
  cedo: string | null;
  tarde: string | null;
};

export type Trajetoria = {
  analito: string;
  nome: string;
  unidade: string;
  n: number;
  anos: number;
  /** Variação por ano (unidade/ano) e se ela é clara (|b| > 2 erros-padrão). */
  por_ano: number;
  tendencia_clara: boolean;
  r2: number;
  /** Previsão para 12 meses depois do último exame. */
  em_12_meses: { data: string; valor: number; lo: number; hi: number };
  cruzamentos: Cruzamento[];
  /** Próximo resultado (12 meses) quase certamente dentro da referência e sem tendência clara. */
  previsivel_normal: boolean;
  /** Pontos observados e a linha prevista (do primeiro exame até o horizonte) para o gráfico. */
  observados: { data: string; valor: number }[];
  linha: { data: string; valor: number; lo: number; hi: number }[];
  texto: string;
};

const ANO_MS = 365.25 * 24 * 3600 * 1000;
const anoDe = (iso: string) => new Date(iso + "T00:00:00Z").getTime() / ANO_MS;
const isoDe = (ano: number) => new Date(ano * ANO_MS).toISOString().slice(0, 10);

/** Quantil t (bicaudal, nível NIVEL) por aproximação de Cornish-Fisher: suficiente para 80%. */
function quantilT(df: number): number {
  const z = 1.2816; // z de 0,90
  return z + (z ** 3 + z) / (4 * df) + (5 * z ** 5 + 16 * z ** 3 + 3 * z) / (96 * df * df);
}

/** Casas decimais pela grandeza: 7.343 | 238 | 42,1 | 6,2 | 1,05. */
const num = (v: number, casas?: number) => v.toLocaleString("pt-BR", {
  maximumFractionDigits: casas ?? (Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2),
});
const mesAno = (iso: string) => {
  const M = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${M[Number(iso.slice(5, 7)) - 1]}/${iso.slice(0, 4)}`;
};

export function trajetoria(s: SerieEntrada): Trajetoria | null {
  const pts = s.pontos.filter((p) => !p.qualificador && Number.isFinite(p.valor));
  if (pts.length < 4) return null;
  const t = pts.map((p) => anoDe(p.data));
  const y = pts.map((p) => p.valor);
  const n = pts.length;
  const anos = t[n - 1] - t[0];
  if (anos < 2) return null;

  const tm = t.reduce((a, b) => a + b, 0) / n;
  const ym = y.reduce((a, b) => a + b, 0) / n;
  const sxx = t.reduce((a, ti) => a + (ti - tm) ** 2, 0);
  const b = t.reduce((a, ti, i) => a + (ti - tm) * (y[i] - ym), 0) / sxx;
  const a0 = ym - b * tm;
  const res = y.map((yi, i) => yi - (a0 + b * t[i]));
  const sse = res.reduce((a, r) => a + r * r, 0);
  const sst = y.reduce((a, yi) => a + (yi - ym) ** 2, 0);
  const s2 = sse / (n - 2);
  const sd = Math.sqrt(s2);
  const seB = Math.sqrt(s2 / sxx);
  const tq = quantilT(n - 2);
  const prever = (t0: number) => {
    const v = a0 + b * t0;
    const m = tq * sd * Math.sqrt(1 + 1 / n + (t0 - tm) ** 2 / sxx);
    return { valor: v, lo: v - m, hi: v + m };
  };
  // clara = estatisticamente (|b| > 2 erros-padrão) E clinicamente (mudou 8% ou mais no período observado)
  const relevante = Math.abs(b) * (t[n - 1] - t[0]) >= 0.08 * Math.abs(ym);
  const tendencia_clara = Math.abs(b) > 2 * seB && sd > 0 && relevante;

  const ultimo = pts[n - 1];
  const tUlt = t[n - 1];
  const p12 = prever(tUlt + 1);

  // limites: referência do último laudo + limites clínicos do exame
  const limites: { valor: number; rotulo: string }[] = [];
  if (b >= 0 && ultimo.ref_max !== null) limites.push({ valor: ultimo.ref_max, rotulo: "limite da referência do laudo" });
  if (b < 0 && ultimo.ref_min !== null) limites.push({ valor: ultimo.ref_min, rotulo: "limite da referência do laudo" });
  for (const l of LIMITES_CLINICOS[s.analito] ?? []) if (!limites.some((x) => x.valor === l.valor)) limites.push(l);

  const passo = 1 / 12; // mês a mês
  const cruzamentos: Cruzamento[] = limites.map((l) => {
    const sentido: "acima" | "abaixo" = b >= 0 ? "acima" : "abaixo";
    const passou = (v: number) => (sentido === "acima" ? v >= l.valor : v <= l.valor);
    const ja = passou(ultimo.valor);
    let central: string | null = null, cedo: string | null = null, tarde: string | null = null;
    if (!ja && tendencia_clara) {
      for (let x = tUlt; x <= tUlt + HORIZONTE_ANOS; x += passo) {
        const p = prever(x);
        const borda = sentido === "acima" ? p.hi : p.lo; // a borda mais pessimista cruza primeiro
        const oposta = sentido === "acima" ? p.lo : p.hi;
        if (!cedo && passou(borda)) cedo = isoDe(x);
        if (!central && passou(p.valor)) central = isoDe(x);
        if (!tarde && passou(oposta)) { tarde = isoDe(x); break; }
      }
    }
    return { limite: l.valor, rotulo: l.rotulo, sentido, ja_cruzou: ja, central, cedo, tarde };
  });

  const previsivel_normal = !tendencia_clara && pts.every((p) => p.ref_min !== null || p.ref_max !== null)
    && (ultimo.ref_min === null || p12.lo >= ultimo.ref_min) && (ultimo.ref_max === null || p12.hi <= ultimo.ref_max);

  const fim = Math.max(tUlt + 2, ...cruzamentos.map((c) => (c.central ? anoDe(c.central) + 0.5 : 0)));
  const linha: Trajetoria["linha"] = [];
  for (let x = t[0]; x <= Math.min(fim, tUlt + HORIZONTE_ANOS) + 1e-9; x += 0.25) {
    const p = prever(x);
    linha.push({ data: isoDe(x), valor: p.valor, lo: p.lo, hi: p.hi });
  }

  // frase para o médico
  const u = s.unidade;
  let texto: string;
  const proximo = cruzamentos.find((c) => !c.ja_cruzou && c.central);
  if (!tendencia_clara) {
    texto = previsivel_normal
      ? `Estável em ${n} exames (${num(anos, 0)} anos). Próximo resultado provável: ${num(p12.lo)} a ${num(p12.hi)} ${u}, dentro da referência.`
      : `Sem tendência definida em ${n} exames: oscila mais do que muda.`;
  } else if (proximo) {
    texto = `${b > 0 ? "Sobe" : "Cai"} ${num(Math.abs(b))} ${u} por ano (${n} exames, ${num(anos, 0)} anos). Nesse ritmo, passa de ${num(proximo.limite)} ${u} (${proximo.rotulo}) por volta de ${mesAno(proximo.central!)}`
      + (proximo.cedo && proximo.tarde ? `; janela provável ${mesAno(proximo.cedo)} a ${mesAno(proximo.tarde)}.` : ".");
  } else {
    const ja = cruzamentos.filter((c) => c.ja_cruzou).at(-1);
    texto = `${b > 0 ? "Sobe" : "Cai"} ${num(Math.abs(b))} ${u} por ano (${n} exames)${ja ? `; já está ${ja.sentido} de ${num(ja.limite)} ${u} (${ja.rotulo})` : ""}. Em 12 meses, provável ${num(p12.lo)} a ${num(p12.hi)} ${u}.`;
  }

  return {
    analito: s.analito, nome: s.nome, unidade: u, n, anos: Math.round(anos * 10) / 10,
    por_ano: b, tendencia_clara, r2: sst > 0 ? 1 - sse / sst : 0,
    em_12_meses: { data: isoDe(tUlt + 1), ...p12 },
    cruzamentos, previsivel_normal,
    observados: pts.map((p) => ({ data: p.data, valor: p.valor })),
    linha, texto,
  };
}

/**
 * Teste de trás para frente no próprio histórico: tira o último exame, prevê com o resto e confere se o valor real
 * caiu dentro da faixa de 80%. Diz o quanto confiar na faixa para ESTA pessoa.
 */
export function testeRetroativo(series: SerieEntrada[]): { testados: number; dentro: number; detalhes: { analito: string; real: number; lo: number; hi: number; dentro: boolean }[] } {
  const detalhes = [];
  for (const s of series) {
    const pts = s.pontos.filter((p) => !p.qualificador);
    if (pts.length < 5) continue;
    const tr = trajetoria({ ...s, pontos: pts.slice(0, -1) });
    if (!tr) continue;
    const real = pts[pts.length - 1];
    // previsão para a data do último exame (re-ajuste com os pontos anteriores)
    const anos = anoDe(real.data) - anoDe(pts[pts.length - 2].data);
    const alvo = tr.linha.length ? interpolar(tr, real.data) : null;
    if (!alvo || anos <= 0) continue;
    detalhes.push({ analito: s.analito, real: real.valor, lo: alvo.lo, hi: alvo.hi, dentro: real.valor >= alvo.lo && real.valor <= alvo.hi });
  }
  return { testados: detalhes.length, dentro: detalhes.filter((d) => d.dentro).length, detalhes };
}

function interpolar(tr: Trajetoria, data: string) {
  const x = anoDe(data);
  const L = tr.linha;
  for (let i = 1; i < L.length; i++) {
    const a = anoDe(L[i - 1].data), b = anoDe(L[i].data);
    if (x >= a && x <= b) {
      const f = (x - a) / (b - a || 1);
      return { lo: L[i - 1].lo + f * (L[i].lo - L[i - 1].lo), hi: L[i - 1].hi + f * (L[i].hi - L[i - 1].hi) };
    }
  }
  return null;
}
