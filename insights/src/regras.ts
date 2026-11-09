/**
 * Regras que transformam resultados (fatos) em informação.
 * Tudo determinístico e explicável. NUNCA diagnóstico: só descreve o que os laudos mostram.
 * "Normal" e "alterado" vêm sempre da referência impressa no próprio laudo.
 */
import type {
  Area, Insights, Laudo, Paciente, Ponto, ProximoExame, Repeticao, Serie, StatusArea, Tendencia,
} from "./tipos";

// ---------------- parâmetros aprovados (09/11) ----------------
export const PARAMETROS = {
  persistente_min_seguidos: 3,  // fora da referência em N exames seguidos = persistente
  tendencia_min_pontos: 3,      // tendência só com pelo menos N resultados...
  tendencia_min_anos: 2,        // ...cobrindo pelo menos N anos
  tendencia_min_consistencia: 0.6, // R² da linha de tendência: abaixo disso é oscilação, não tendência
  tendencia_estavel_pct: 5,     // variação da linha abaixo disso = estável
  repeticao_max_dias: 90,       // mesmo exame em laudos diferentes com menos de N dias = repetido
  rotina_previsto_meses: 12,    // exame de rotina: próximo previsto N meses após o último
  rotina_atrasado_meses: 18,    // passou disso = atrasado
};

export const NOMES: Record<string, string> = {
  hemacias: "Hemácias", hemoglobina: "Hemoglobina", hematocrito: "Hematócrito",
  leucocitos: "Leucócitos", plaquetas: "Plaquetas", glicose: "Glicose em jejum",
  hba1c: "Hemoglobina glicada (HbA1c)", colesterol_total: "Colesterol total", hdl: "HDL",
  ldl: "LDL", triglicerides: "Triglicérides", creatinina: "Creatinina", acido_urico: "Ácido úrico",
  tgo: "TGO (AST)", tgp: "TGP (ALT)", tsh: "TSH", psa: "PSA", vitamina_d: "Vitamina D",
};

export const AREAS: { id: string; nome: string; analitos: string[] }[] = [
  { id: "glicemia", nome: "Glicemia", analitos: ["glicose", "hba1c"] },
  { id: "colesterol", nome: "Colesterol", analitos: ["colesterol_total", "hdl", "ldl", "triglicerides"] },
  { id: "rins", nome: "Rins e ácido úrico", analitos: ["creatinina", "acido_urico"] },
  { id: "figado", nome: "Fígado", analitos: ["tgo", "tgp"] },
  { id: "tireoide", nome: "Tireoide", analitos: ["tsh"] },
  { id: "sangue", nome: "Sangue (hemograma)", analitos: ["hemacias", "hemoglobina", "hematocrito", "leucocitos", "plaquetas"] },
  { id: "prostata", nome: "Próstata", analitos: ["psa"] },
  { id: "vitaminas", nome: "Vitaminas", analitos: ["vitamina_d"] },
];

/** Exames de check-up com repetição esperada (vitamina D fica fora: não é rotina). */
function rotina(p: Paciente): string[] {
  const base = ["hemacias", "hemoglobina", "hematocrito", "leucocitos", "plaquetas", "glicose", "hba1c",
    "colesterol_total", "hdl", "ldl", "triglicerides", "creatinina", "tgo", "tgp", "tsh"];
  return p.sexo === "M" ? [...base, "psa"] : base;
}

// ---------------- utilidades ----------------
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const mesAno = (d: string) => `${MESES[Number(d.slice(5, 7)) - 1]}/${d.slice(0, 4)}`;
export const dataBr = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
const num = (x: number) => x.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const dias = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
function somaMeses(d: string, m: number) {
  const dt = new Date(`${d}T00:00:00Z`);
  dt.setUTCMonth(dt.getUTCMonth() + m);
  return dt.toISOString().slice(0, 10);
}
export function textoRef(p: Ponto, unidade: string) {
  if (p.ref_min !== null && p.ref_max !== null) return `${num(p.ref_min)} a ${num(p.ref_max)} ${unidade}`;
  if (p.ref_max !== null) return `até ${num(p.ref_max)} ${unidade}`;
  if (p.ref_min !== null) return `acima de ${num(p.ref_min)} ${unidade}`;
  return "sem referência";
}
const lista = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} e ${xs.at(-1)}`);

// ---------------- regra 1: séries ----------------
export function montarSeries(laudos: Laudo[]): Serie[] {
  const porAnalito = new Map<string, Ponto[]>();
  const unidades = new Map<string, string>();
  for (const l of laudos) {
    for (const r of l.resultados) {
      if (r.valor_canonico === null || !NOMES[r.analito]) continue; // sem número ou exame fora do dicionário
      unidades.set(r.analito, r.unidade_canonica ?? "");
      const pontos = porAnalito.get(r.analito) ?? [];
      pontos.push({
        data: l.data_coleta, valor: r.valor_canonico, ref_min: r.ref_min_canonico, ref_max: r.ref_max_canonico,
        fora_da_faixa: r.fora_da_faixa, valor_impresso: r.valor_impresso, unidade_impressa: r.unidade_impressa,
        referencia_impressa: r.referencia_impressa,
        fonte: { laudo_id: l.id, arquivo: l.arquivo, laboratorio: l.laboratorio, pagina: r.pagina },
      });
      porAnalito.set(r.analito, pontos);
    }
  }
  const series: Serie[] = [];
  for (const [analito, pontos] of porAnalito) {
    pontos.sort((a, b) => a.data.localeCompare(b.data));
    const ultimo = pontos.at(-1)!;
    // regra 2: alterado / persistente
    let seguidos = 0;
    for (let i = pontos.length - 1; i >= 0 && pontos[i].fora_da_faixa; i--) seguidos++;
    const sentido = !ultimo.fora_da_faixa ? null
      : ultimo.ref_max !== null && ultimo.valor >= ultimo.ref_max ? "acima" : "abaixo";
    const area = AREAS.find((a) => a.analitos.includes(analito))?.id ?? "outros";
    const s: Serie = {
      analito, nome: NOMES[analito], unidade: unidades.get(analito) ?? "", area, pontos, ultimo,
      alterado: ultimo.fora_da_faixa, sentido, fora_seguidos: seguidos,
      persistente: seguidos >= PARAMETROS.persistente_min_seguidos, tendencia: null,
    };
    s.tendencia = calcularTendencia(s);
    series.push(s);
  }
  const ordem = AREAS.flatMap((a) => a.analitos);
  return series.sort((a, b) => ordem.indexOf(a.analito) - ordem.indexOf(b.analito));
}

// ---------------- regra 4: tendência ----------------
function calcularTendencia(s: Serie): Tendencia | null {
  const p = s.pontos;
  if (p.length < PARAMETROS.tendencia_min_pontos) return null;
  const primeiro = p[0], ultimo = p.at(-1)!;
  const anos = dias(primeiro.data, ultimo.data) / 365.25;
  if (anos < PARAMETROS.tendencia_min_anos || primeiro.valor === 0) return null;
  // Linha que melhor passa por TODOS os pontos (mínimos quadrados, tempo em anos).
  // consistencia (R²) = quanto os pontos seguem a linha: 1 = perfeitamente, 0 = oscilação sem direção.
  const xs = p.map((q) => dias(primeiro.data, q.data) / 365.25), ys = p.map((q) => q.valor);
  const mx = xs.reduce((a, b) => a + b) / xs.length, my = ys.reduce((a, b) => a + b) / ys.length;
  const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  const sxy = xs.reduce((a, x, k) => a + (x - mx) * (ys[k] - my), 0);
  const syy = ys.reduce((a, y) => a + (y - my) ** 2, 0);
  const incl = sxy / sxx;
  const consistencia = syy === 0 ? 0 : (sxy * sxy) / (sxx * syy);
  const inicioLinha = my - incl * mx, fimLinha = inicioLinha + incl * xs.at(-1)!;
  const variacaoLinha = inicioLinha === 0 ? 0 : ((fimLinha - inicioLinha) / Math.abs(inicioLinha)) * 100;
  const direcao = consistencia < PARAMETROS.tendencia_min_consistencia
    || Math.abs(variacaoLinha) < PARAMETROS.tendencia_estavel_pct ? "estavel" : incl > 0 ? "subindo" : "caindo";
  // No texto, a variação usa os valores reais (primeiro e último), que a pessoa consegue conferir no laudo
  const variacao = ((ultimo.valor - primeiro.valor) / primeiro.valor) * 100;
  // Fora da referência desde: início da sequência atual de resultados alterados (se houve normal antes)
  let fora_desde: string | null = null;
  if (s.fora_seguidos > 0 && s.fora_seguidos < p.length) fora_desde = p[p.length - s.fora_seguidos].data;
  if (s.fora_seguidos === p.length) fora_desde = primeiro.data;
  const a = Math.round(anos);
  const de = `${num(primeiro.valor)} → ${num(ultimo.valor)} ${s.unidade}`;
  let texto = direcao === "estavel"
    ? `sem tendência em ${a} ${a === 1 ? "ano" : "anos"} (oscilou entre ${num(Math.min(...ys))} e ${num(Math.max(...ys))} ${s.unidade})`
    : `${direcao === "subindo" ? "subiu" : "caiu"} ${Math.abs(Math.round(variacao))}% em ${a} anos (${de})`;
  if (fora_desde) texto += `; ${s.sentido} da referência desde ${mesAno(fora_desde)}`;
  return { direcao, consistencia: Math.round(consistencia * 100) / 100, variacao_pct: Math.round(variacao * 10) / 10, anos: Math.round(anos * 10) / 10, primeiro, ultimo, fora_desde, texto };
}

// ---------------- regra 3: status por área ----------------
function motivoAlterado(s: Serie): string {
  const u = s.ultimo;
  let t = `${s.nome} ${num(u.valor)} ${s.unidade} em ${mesAno(u.data)}, ${s.sentido} da referência (${textoRef(u, s.unidade)})`;
  if (s.persistente) t += `; alterado nos últimos ${s.fora_seguidos} exames`;
  return t;
}

export function montarAreas(series: Serie[], paciente: Paciente, hoje: string): Area[] {
  const rot = rotina(paciente);
  const out: Area[] = [];
  for (const a of AREAS) {
    const ss = series.filter((s) => a.analitos.includes(s.analito));
    if (!ss.length) continue;
    const ultimo = ss.map((s) => s.ultimo.data).sort().at(-1)!;
    const alterados = ss.filter((s) => s.alterado);
    const antigos = ss.filter((s) => rot.includes(s.analito)
      && hoje > somaMeses(s.ultimo.data, PARAMETROS.rotina_atrasado_meses));
    let status: StatusArea = "em_dia";
    let motivos: string[];
    if (alterados.length) {
      status = "atencao";
      motivos = alterados.map(motivoAlterado);
    } else if (antigos.length) {
      status = "sem_dados_recentes";
      motivos = antigos.map((s) => `${s.nome}: último exame em ${mesAno(s.ultimo.data)}`);
    } else {
      motivos = [`Todos os exames dentro da referência no último resultado (${mesAno(ultimo)})`];
    }
    out.push({ id: a.id, nome: a.nome, status, motivos, analitos: ss.map((s) => s.analito), ultimo_exame: ultimo });
  }
  return out;
}

// ---------------- regra 5: exame repetido ----------------
export function acharRepeticoes(series: Serie[]): Repeticao[] {
  const pares = new Map<string, Repeticao>();
  for (const s of series) {
    for (let i = 1; i < s.pontos.length; i++) {
      const a = s.pontos[i - 1], b = s.pontos[i];
      const d = dias(a.data, b.data);
      if (a.fonte.laudo_id === b.fonte.laudo_id || d > PARAMETROS.repeticao_max_dias) continue;
      const k = `${a.fonte.laudo_id}>${b.fonte.laudo_id}`;
      const r = pares.get(k) ?? { dias: d, analitos: [], de: { ...a.fonte, data: a.data }, para: { ...b.fonte, data: b.data }, texto: "" };
      r.analitos.push(s.analito);
      pares.set(k, r);
    }
  }
  return [...pares.values()].map((r) => ({
    ...r,
    texto: `${lista(r.analitos.map((x) => NOMES[x]))} refeitos ${r.dias} dias depois `
      + `(${r.de.laboratorio}, ${dataBr(r.de.data)} → ${r.para.laboratorio}, ${dataBr(r.para.data)})`,
  }));
}

// ---------------- regra 6: próximo exame ----------------
export function proximosExames(series: Serie[], paciente: Paciente, hoje: string): ProximoExame[] {
  return series.filter((s) => rotina(paciente).includes(s.analito)).map((s) => {
    const previsto = somaMeses(s.ultimo.data, PARAMETROS.rotina_previsto_meses);
    const limite = somaMeses(s.ultimo.data, PARAMETROS.rotina_atrasado_meses);
    const situacao = hoje > limite ? "atrasado" : hoje >= previsto ? "vencido" : "em_dia";
    return { analito: s.analito, nome: s.nome, ultimo: s.ultimo.data, previsto, situacao };
  });
}

// ---------------- regra 7: resumo para o médico ----------------
function fonte(p: Ponto) {
  return `[${p.fonte.laboratorio}, ${dataBr(p.data)}, p. ${p.fonte.pagina}]`;
}

export function resumoMedico(i: Omit<Insights, "resumo_medico">): string[] {
  const idade = Math.floor(dias(i.paciente.nascimento, i.hoje) / 365.25);
  const L: string[] = [];
  L.push(`${i.paciente.nome}, ${idade} anos, ${i.paciente.sexo === "M" ? "masculino" : "feminino"}.`);
  L.push(`Histórico: ${i.periodo.laudos} laudos de ${mesAno(i.periodo.inicio)} a ${mesAno(i.periodo.fim)}, `
    + `${i.periodo.laboratorios.length} laboratórios (${lista(i.periodo.laboratorios)}).`);
  const alterados = i.series.filter((s) => s.alterado);
  L.push("", alterados.length ? "Alterados no último resultado:" : "Nenhum exame alterado no último resultado.");
  for (const s of alterados) {
    const t = s.tendencia && s.tendencia.direcao !== "estavel" ? `; ${s.tendencia.texto}` : "";
    L.push(`- ${s.nome}: ${num(s.ultimo.valor)} ${s.unidade} (ref. ${textoRef(s.ultimo, s.unidade)})`
      + `${s.persistente ? `, alterado nos últimos ${s.fora_seguidos} exames` : ""}${t} ${fonte(s.ultimo)}`);
  }
  const tendencias = i.series.filter((s) => !s.alterado && s.tendencia && s.tendencia.direcao !== "estavel");
  if (tendencias.length) {
    L.push("", "Mudanças relevantes dentro da referência:");
    for (const s of tendencias) L.push(`- ${s.nome}: ${s.tendencia!.texto} ${fonte(s.ultimo)}`);
  }
  if (i.repeticoes.length) {
    L.push("", "Exames repetidos em curto intervalo:");
    for (const r of i.repeticoes) L.push(`- ${r.texto}`);
  }
  const pendentes = i.proximos.filter((p) => p.situacao !== "em_dia");
  L.push("", pendentes.length
    ? `Exames de rotina vencidos: ${lista(pendentes.map((p) => `${p.nome} (último ${mesAno(p.ultimo)})`))}.`
    : `Exames de rotina em dia; próximo check-up previsto para ${mesAno(i.proximos.map((p) => p.previsto).sort()[0] ?? i.hoje)}.`);
  L.push("", "Cada valor indica o laudo e a página de origem. Resumo gerado por regras a partir dos laudos; não é diagnóstico.");
  return L;
}

// ---------------- tudo junto ----------------
export function gerarInsights(laudos: Laudo[], paciente: Paciente, hoje: string): Insights {
  const ordenados = [...laudos].sort((a, b) => a.data_coleta.localeCompare(b.data_coleta));
  const series = montarSeries(ordenados);
  const base = {
    paciente,
    hoje,
    periodo: {
      inicio: ordenados[0]?.data_coleta ?? hoje,
      fim: ordenados.at(-1)?.data_coleta ?? hoje,
      laudos: ordenados.length,
      laboratorios: [...new Set(ordenados.map((l) => l.laboratorio))],
    },
    series,
    areas: montarAreas(series, paciente, hoje),
    repeticoes: acharRepeticoes(series),
    proximos: proximosExames(series, paciente, hoje),
  };
  return { ...base, resumo_medico: resumoMedico(base) };
}
