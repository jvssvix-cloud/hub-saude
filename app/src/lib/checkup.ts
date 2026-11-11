/**
 * Check-up inicial: blocos, rótulos e validação (sem banco; a gravação fica em app/checkup/acoes.ts).
 *
 * Bloco 1 (básico + aceites) e bloco 2 (altura e peso) são obrigatórios; 3 a 6 podem ser pulados; o 7 conclui
 * ("Enviar exames agora" ou "Depois"). Os aceites ficam no bloco 1 de propósito: o consentimento para dado de saúde
 * (LGPD) vem antes de qualquer dado de saúde ser gravado.
 */
import type { Alcool, Condicao, Fumo, HistoricoFamiliar, PerfilSaude } from "../../../lib/types";

export const TERMOS_VERSAO = "v1-2026-11-11";

export const BLOCOS = [
  { n: 1, titulo: "Sobre você", sub: "O básico para ler seus exames do jeito certo." },
  { n: 2, titulo: "Seu corpo", sub: "Altura e peso entram no cálculo do IMC." },
  { n: 3, titulo: "Seus hábitos", sub: "Ajudam a explicar o que aparece nos exames." },
  { n: 4, titulo: "Saúde até aqui", sub: "Diagnósticos que você já recebeu e remédios que toma todo dia." },
  { n: 5, titulo: "Sua família", sub: "Alguns riscos passam de pais e irmãos." },
  { n: 6, titulo: "Para terminar", sub: "Alergias e, se for o caso, gestação e menopausa." },
  { n: 7, titulo: "Seus exames", sub: "É com eles que o Zelo começa a trabalhar." },
] as const;
export const TOTAL_BLOCOS = BLOCOS.length;
export const BLOCOS_OPCIONAIS = new Set([3, 4, 5, 6]);

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
export const FAMILIA: { id: HistoricoFamiliar; rotulo: string; dica?: string }[] = [
  { id: "infarto_avc_precoce", rotulo: "Infarto ou AVC cedo", dica: "pai ou irmão antes dos 55; mãe ou irmã antes dos 65" },
  { id: "diabetes", rotulo: "Diabetes" },
  { id: "cancer", rotulo: "Câncer" },
];

/** Atividade física: a tela pergunta horas por dia (de 1 em 1); o banco guarda minutos por semana. */
export const MIN_SEMANA_POR_HORA_DIA = 7 * 60;
export const ATIVIDADE_MAX_HORAS = 6; // 6 h/dia = 2520 min/semana (a coluna aceita até 3000)

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

/** Atividade guardada em min/semana -> "1 h por dia" (ou "90 min por semana" se não fechar hora por dia). */
export function atividadeTexto(minSemana: number | null): string | null {
  if (minSemana === null) return null;
  if (minSemana === 0) return "Nenhuma";
  const h = minSemana / MIN_SEMANA_POR_HORA_DIA;
  return Number.isInteger(h) ? `${h} h por dia` : `${br(minSemana)} min por semana`;
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
      { rotulo: "Remédios de uso contínuo", valor: p.remedios },
    ] },
    { bloco: 5, titulo: "Sua família", itens: [
      { rotulo: "Pais e irmãos tiveram", valor: listaDe(FAMILIA, p.familia) },
      ...(p.familia?.includes("cancer") ? [{ rotulo: "Câncer", valor: p.familia_cancer }] : []),
    ] },
    { bloco: 6, titulo: "Alergias e outros", itens: [
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
export type PerfilSaudeLeitura = Omit<PerfilSaude, "altura_cm" | "peso_kg" | "sono_horas" | "atividade_min_semana"> & {
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

export function uma<T extends string>(v: FormDataEntryValue | null, validos: { id: T }[]): T | null {
  const s = String(v ?? "");
  return validos.some((x) => x.id === s) ? (s as T) : null;
}
