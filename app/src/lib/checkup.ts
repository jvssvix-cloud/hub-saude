/**
 * Check-up inicial: blocos, rótulos e validação (sem banco; a gravação fica em app/checkup/acoes.ts).
 *
 * Bloco 1 (básico + aceites) e bloco 2 (altura e peso) são obrigatórios; 3 a 8 podem ser pulados; o 9 conclui
 * ("Reunir meus exames agora" ou "Depois"). Os aceites ficam no bloco 1 de propósito: o consentimento para dado de saúde
 * (LGPD) vem antes de qualquer dado de saúde ser gravado.
 */
import type {
  Alcool, Condicao, CondicaoFamiliar, FamiliaParente, Fumo, HistoricoFamiliar, Medico, Parente, PerfilSaude,
} from "../../../lib/types";

export const TERMOS_VERSAO = "v1-2026-11-11";

export const BLOCOS = [
  { n: 1, titulo: "Sobre você", sub: "O básico para ler seus exames do jeito certo." },
  { n: 2, titulo: "Seu corpo", sub: "Altura e peso entram no cálculo do IMC." },
  { n: 3, titulo: "Seus hábitos", sub: "Ajudam a explicar o que aparece nos exames." },
  { n: 4, titulo: "Saúde até aqui", sub: "Diagnósticos que você já recebeu e remédios que toma todo dia." },
  { n: 5, titulo: "Internações e cirurgias", sub: "Ajudam a saber que exames você deve ter guardados." },
  { n: 6, titulo: "Seus médicos", sub: "Quem acompanha você hoje. Cada especialista costuma pedir os seus exames." },
  { n: 7, titulo: "Sua família", sub: "Alguns riscos passam de pais, irmãos e avós." },
  { n: 8, titulo: "Para terminar", sub: "Alergias e, se for o caso, gestação e menopausa." },
  { n: 9, titulo: "Seus exames", sub: "É com eles que o Zelo começa a trabalhar." },
] as const;
export const TOTAL_BLOCOS = BLOCOS.length;
export const BLOCOS_OPCIONAIS = new Set([3, 4, 5, 6, 7, 8]);
/** Máximo de itens em cada lista (internações, cirurgias, remédios). O banco aceita até 20. */
export const MAX_ITENS = 20;

export const FUMO: { id: Fumo; rotulo: string }[] = [
  { id: "nunca", rotulo: "Nunca fumei" },
  { id: "ex", rotulo: "Já fumei e parei" },
  { id: "atual", rotulo: "Fumo hoje" },
];
export const ALCOOL: { id: Alcool; rotulo: string }[] = [
  { id: "nao", rotulo: "Não bebo" },
  { id: "raramente", rotulo: "Raramente" },
  { id: "semanal", rotulo: "Toda semana" },
  { id: "diario", rotulo: "Quase todo dia" },
];
export const CONDICOES: { id: Condicao; rotulo: string }[] = [
  { id: "diabetes", rotulo: "Diabetes" },
  { id: "hipertensao", rotulo: "Pressão alta" },
  { id: "colesterol_alto", rotulo: "Colesterol alto" },
  { id: "tireoide", rotulo: "Tireoide" },
  { id: "coracao", rotulo: "Coração" },
  { id: "rim", rotulo: "Rim" },
];
/** Resumo antigo da família (perfil_saude.familia): hoje é derivado de familia_parentes (derivarFamilia). */
export const FAMILIA: { id: HistoricoFamiliar; rotulo: string; dica?: string }[] = [
  { id: "infarto_avc_precoce", rotulo: "Infarto ou AVC cedo", dica: "pai ou irmão antes dos 55; mãe ou irmã antes dos 65" },
  { id: "diabetes", rotulo: "Diabetes" },
  { id: "cancer", rotulo: "Câncer" },
];

export const MEDICOS: { id: Medico; rotulo: string }[] = [
  { id: "clinico", rotulo: "Clínico geral" },
  { id: "cardiologista", rotulo: "Cardiologista" },
  { id: "endocrinologista", rotulo: "Endocrinologista" },
  { id: "gastroenterologista", rotulo: "Gastroenterologista" },
  { id: "urologista", rotulo: "Urologista" },
  { id: "ginecologista", rotulo: "Ginecologista" },
  { id: "nefrologista", rotulo: "Nefrologista" },
  { id: "pneumologista", rotulo: "Pneumologista" },
  { id: "geriatra", rotulo: "Geriatra" },
  { id: "neurologista", rotulo: "Neurologista" },
  { id: "ortopedista", rotulo: "Ortopedista" },
];

export const PARENTES: { id: Parente; rotulo: string; dica?: string }[] = [
  { id: "pai", rotulo: "Pai" },
  { id: "mae", rotulo: "Mãe" },
  { id: "irmaos", rotulo: "Irmãos", dica: "algum irmão ou irmã" },
  { id: "avos", rotulo: "Avós", dica: "algum dos quatro" },
];

export const CONDICOES_FAMILIA: { id: CondicaoFamiliar; rotulo: string; dica?: string }[] = [
  { id: "diabetes", rotulo: "Diabetes" },
  { id: "hipertensao", rotulo: "Pressão alta" },
  { id: "colesterol_alto", rotulo: "Colesterol alto" },
  { id: "infarto_avc_cedo", rotulo: "Infarto ou AVC cedo", dica: "homem antes dos 55, mulher antes dos 65" },
  { id: "cancer", rotulo: "Câncer" },
  { id: "demencia", rotulo: "Alzheimer ou demência" },
  { id: "outro", rotulo: "Outro" },
];

/** O resumo antigo (familia) a partir do detalhe por parente: regras e chat que usam familia seguem iguais. */
export function derivarFamilia(fp: Partial<Record<Parente, FamiliaParente>> | null): HistoricoFamiliar[] {
  const todas = new Set(Object.values(fp ?? {}).flatMap((x) => x?.condicoes ?? []));
  const r: HistoricoFamiliar[] = [];
  if (todas.has("infarto_avc_cedo")) r.push("infarto_avc_precoce");
  if (todas.has("diabetes")) r.push("diabetes");
  if (todas.has("cancer")) r.push("cancer");
  return r;
}

/** Atividade física: a tela pergunta horas por semana (de 1 em 1); o banco guarda minutos por semana. */
export const MIN_POR_HORA = 60;
export const ATIVIDADE_MAX_HORAS = 15; // "15+" = 15 h ou mais por semana (a coluna aceita até 3000 min)

/** IMC com 1 casa (null se faltar altura ou peso) e a faixa da OMS em linguagem simples. */
export function imc(alturaCm: number | null, pesoKg: number | null): { valor: number; faixa: string } | null {
  if (!alturaCm || !pesoKg) return null;
  const v = Math.round((pesoKg / (alturaCm / 100) ** 2) * 10) / 10;
  const faixa = v < 18.5 ? "abaixo do peso" : v < 25 ? "peso adequado" : v < 30 ? "sobrepeso" : "obesidade";
  return { valor: v, faixa };
}

// ---------------------------------------------------------------- perfil em texto (tela do perfil e chat)
export type CadastroBasico = { nome: string; nascimento: string; sexo: "M" | "F"; telefone: string | null };
export type SecaoPerfil = { bloco: number; titulo: string; itens: { rotulo: string; valor: string | null }[] };

const n = (v: number | string | null | undefined) => (v === null || v === undefined || v === "" ? null : Number(v));
const br = (v: number, casas = 0) => v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
const rotuloDe = <T extends string>(lista: { id: T; rotulo: string }[], id: T | null | undefined) =>
  lista.find((x) => x.id === id)?.rotulo ?? null;
const listaDe = <T extends string>(lista: { id: T; rotulo: string }[], ids: T[] | null | undefined) =>
  ids?.length ? ids.map((id) => rotuloDe(lista, id) ?? id).join(", ") : null;

export function idade(nascimento: string, hoje = new Date().toISOString().slice(0, 10)): number {
  const [a, m, d] = nascimento.split("-").map(Number);
  const [ha, hm, hd] = hoje.split("-").map(Number);
  return ha - a - (hm < m || (hm === m && hd < d) ? 1 : 0);
}

/** "5511987654321" -> "(11) 98765-4321" */
export function telefoneBr(t: string | null): string | null {
  if (!t) return null;
  const d = t.startsWith("55") ? t.slice(2) : t;
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
}

/** Atividade guardada em min/semana -> "3 h por semana" (ou "90 min por semana" se não fechar hora). */
export function atividadeTexto(minSemana: number | null): string | null {
  if (minSemana === null) return null;
  if (minSemana === 0) return "Nenhuma";
  const h = minSemana / MIN_POR_HORA;
  if (h >= ATIVIDADE_MAX_HORAS) return `${ATIVIDADE_MAX_HORAS} h ou mais por semana`;
  return Number.isInteger(h) ? `${h} h por semana` : `${br(minSemana)} min por semana`;
}

const comAno = (texto: string, ano: number | null | undefined) => (ano ? `${texto} (${ano})` : texto);
function remediosTexto(p: PerfilSaudeLeitura): string | null {
  if (p.remedios_lista?.length) {
    return p.remedios_lista
      .map((r) => [r.nome, r.dose].filter(Boolean).join(" ") + (r.para_que ? `, para ${r.para_que}` : "")
        + (r.horarios?.length ? ` (${horariosTexto(r.horarios)})` : ""))
      .join("; ");
  }
  return p.remedios; // quem preencheu antes da lista
}

/**
 * Horários de remédio digitados livremente ("8h e 20h", "08:00, 20:30", "21") -> ["08:00", "20:00"].
 * Ignora o que não for hora válida; no máximo 6 por remédio; em ordem; sem repetir.
 */
export function lerHorarios(t: FormDataEntryValue | null | undefined): string[] | null {
  if (typeof t !== "string") return null;
  const out = new Set<string>();
  for (const m of t.matchAll(/(\d{1,2})\s*(?:[:h]\s*(\d{2})?)?/gi)) {
    const h = Number(m[1]), min = Number(m[2] ?? 0);
    if (h <= 23 && min <= 59) out.add(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
  }
  const lista = [...out].sort().slice(0, 6);
  return lista.length ? lista : null;
}

/** ["08:00", "20:30"] -> "8h e 20h30" (como se fala). */
export function horariosTexto(h: string[]): string {
  const fala = h.map((x) => { const [hh, mm] = x.split(":"); return `${Number(hh)}h${mm === "00" ? "" : mm}`; });
  return fala.length > 1 ? `${fala.slice(0, -1).join(", ")} e ${fala.at(-1)}` : fala[0] ?? "";
}
function listaComAno<T>(l: T[] | null | undefined, f: (x: T) => string): string | null {
  if (l === null || l === undefined) return null;
  return l.length ? l.map(f).join("; ") : "Nenhuma";
}
function familiaItens(p: PerfilSaudeLeitura): { rotulo: string; valor: string | null }[] {
  const fp = p.familia_parentes;
  if (!fp) {
    // perfil de antes do detalhe por parente
    return [
      { rotulo: "Pais e irmãos tiveram", valor: listaDe(FAMILIA, p.familia) },
      ...(p.familia?.includes("cancer") ? [{ rotulo: "Câncer", valor: p.familia_cancer }] : []),
    ];
  }
  const itens = PARENTES.map((pa) => {
    const x = fp[pa.id];
    const conds = (x?.condicoes ?? []).filter((c) => c !== "outro").map((c) =>
      c === "cancer" && x?.cancer_qual ? `câncer (${x.cancer_qual})` : (rotuloDe(CONDICOES_FAMILIA, c) ?? c),
    );
    if (x?.observacao) conds.push(x.observacao);
    return { rotulo: pa.rotulo, valor: conds.join(", ") || null };
  });
  return itens.some((i) => i.valor) ? itens : [{ rotulo: "Pais, irmãos e avós", valor: "Nada a relatar" }];
}

/** O perfil em seções legíveis (valor null = não informado). Uma seção por bloco do check-up (1 a 6). */
export function secoesPerfil(cad: CadastroBasico, p: PerfilSaudeLeitura): SecaoPerfil[] {
  const altura = n(p.altura_cm);
  const peso = n(p.peso_kg);
  const i = imc(altura, peso);
  const sono = n(p.sono_horas);
  const mulher = cad.sexo === "F";
  const simNao = (v: boolean | null) => (v === true ? "Sim" : v === false ? "Não" : null);
  const [a, m, d] = cad.nascimento.split("-");
  return [
    { bloco: 1, titulo: "Sobre você", itens: [
      { rotulo: "Nome", valor: cad.nome },
      { rotulo: "Idade", valor: `${idade(cad.nascimento)} anos (nascimento em ${d}/${m}/${a})` },
      { rotulo: "Sexo biológico", valor: cad.sexo === "F" ? "Feminino" : "Masculino" },
      { rotulo: "Celular", valor: telefoneBr(cad.telefone) },
    ] },
    { bloco: 2, titulo: "Seu corpo", itens: [
      { rotulo: "Altura", valor: altura ? `${br(altura)} cm` : null },
      { rotulo: "Peso", valor: peso ? `${br(peso, Number.isInteger(peso) ? 0 : 1)} kg` : null },
      { rotulo: "IMC", valor: i ? `${br(i.valor, 1)} (${i.faixa})` : null },
    ] },
    { bloco: 3, titulo: "Seus hábitos", itens: [
      { rotulo: "Cigarro", valor: rotuloDe(FUMO, p.fumo) },
      { rotulo: "Bebida alcoólica", valor: rotuloDe(ALCOOL, p.alcool) },
      { rotulo: "Atividade física", valor: atividadeTexto(n(p.atividade_min_semana)) },
      { rotulo: "Sono", valor: sono !== null ? `${br(sono, Number.isInteger(sono) ? 0 : 1)} h por noite` : null },
    ] },
    { bloco: 4, titulo: "Saúde até aqui", itens: [
      { rotulo: "Diagnósticos", valor: listaDe(CONDICOES, p.condicoes) },
      { rotulo: "Outras condições", valor: p.condicoes_outras },
      { rotulo: "Remédios de uso contínuo", valor: remediosTexto(p) },
    ] },
    { bloco: 5, titulo: "Internações e cirurgias", itens: [
      { rotulo: "Internações", valor: listaComAno(p.internacoes, (i) => comAno(i.motivo, i.ano)) },
      { rotulo: "Cirurgias", valor: listaComAno(p.cirurgias, (c) => comAno(c.nome, c.ano)) },
    ] },
    { bloco: 6, titulo: "Seus médicos", itens: [
      { rotulo: "Acompanha com", valor: [listaDe(MEDICOS, p.medicos), p.medicos_outros].filter(Boolean).join(", ") || null },
    ] },
    { bloco: 7, titulo: "Sua família", itens: familiaItens(p) },
    { bloco: 8, titulo: "Alergias e outros", itens: [
      { rotulo: "Alergias", valor: p.alergias },
      ...(mulher ? [{ rotulo: "Grávida", valor: simNao(p.gestante) }, { rotulo: "Menopausa", valor: simNao(p.menopausa) }] : []),
    ] },
  ];
}

/** Linhas do perfil já respondidas, para o contexto do chat (o que não foi informado fica de fora). */
export function perfilParaTexto(cad: CadastroBasico, p: PerfilSaudeLeitura): string {
  return secoesPerfil(cad, p)
    .filter((s) => s.bloco > 1) // nome, idade e sexo o chat já recebe pelos insights; celular não interessa
    .flatMap((s) => s.itens.filter((x) => x.valor).map((x) => `- ${x.rotulo}: ${x.valor}`))
    .join("\n");
}

/** perfil_saude como chega da API (numeric vem como texto). */
export type PerfilSaudeLeitura = Omit<PerfilSaude, "altura_cm" | "peso_kg" | "sono_horas" | "atividade_min_semana" | "coleta"> & {
  coleta?: PerfilSaude["coleta"];
  altura_cm: number | string | null;
  peso_kg: number | string | null;
  sono_horas: number | string | null;
  atividade_min_semana: number | string | null;
};

// ---------------------------------------------------------------- leitura dos campos (servidor e testes)
/** "1,75" ou "1.75" -> 1.75; vazio -> null; texto inválido -> NaN. */
export function numero(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim().replace(",", ".");
  if (!s) return null;
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
}

export function texto(v: FormDataEntryValue | null, max: number): string | null {
  const s = String(v ?? "").trim().replace(/\s+/g, " ");
  return s ? s.slice(0, max) : null;
}

/** Telefone brasileiro -> só dígitos com DDI 55 ("5511987654321"); null se não tiver DDD + número. */
export function telefone(v: FormDataEntryValue | null): string | null {
  let d = String(v ?? "").replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  return d.length === 10 || d.length === 11 ? `55${d}` : null;
}

/** Altura: aceita cm (175) ou metros (1,75). */
export function alturaCm(v: FormDataEntryValue | null): number | null {
  const n = numero(v);
  if (n === null || Number.isNaN(n)) return n;
  return n < 3 ? Math.round(n * 1000) / 10 : n;
}

export function sim(v: FormDataEntryValue | null): boolean | null {
  return v === "sim" ? true : v === "nao" ? false : null;
}

/** Só valores da lista (o que vem do navegador não é confiável). */
export function escolhas<T extends string>(form: FormData, campo: string, validos: { id: T }[]): T[] {
  const ok = new Set(validos.map((x) => x.id));
  return [...new Set(form.getAll(campo).map(String))].filter((x): x is T => ok.has(x as T));
}

/** Ano de um item (internação, cirurgia): vazio -> null; fora de 1900..ano atual ou não numérico -> NaN. */
export function ano(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return /^\d{4}$/.test(s) && n >= 1900 && n <= new Date().getFullYear() ? n : NaN;
}

/**
 * Lista repetida do formulário (campos `<prefixo>_<campo>`, um valor por linha): junta as colunas pelo índice,
 * descarta linhas sem o primeiro campo e corta em MAX_ITENS.
 */
export function linhas(form: FormData, prefixo: string, campos: string[]): Record<string, string>[] {
  const cols = campos.map((c) => form.getAll(`${prefixo}_${c}`).map((v) => String(v)));
  const n = Math.max(0, ...cols.map((c) => c.length));
  const out: Record<string, string>[] = [];
  for (let i = 0; i < n && out.length < MAX_ITENS; i++) {
    const l = Object.fromEntries(campos.map((c, j) => [c, cols[j][i] ?? ""]));
    if (l[campos[0]].trim()) out.push(l);
  }
  return out;
}

export function uma<T extends string>(v: FormDataEntryValue | null, validos: { id: T }[]): T | null {
  const s = String(v ?? "");
  return validos.some((x) => x.id === s) ? (s as T) : null;
}
