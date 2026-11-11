/**
 * Check-up inicial: blocos, rótulos e validação (sem banco; a gravação fica em app/checkup/acoes.ts).
 *
 * Bloco 1 (básico + aceites) e bloco 2 (altura e peso) são obrigatórios; 3 a 6 podem ser pulados; o 7 conclui
 * ("Enviar exames agora" ou "Depois"). Os aceites ficam no bloco 1 de propósito: o consentimento para dado de saúde
 * (LGPD) vem antes de qualquer dado de saúde ser gravado.
 */
import type { Alcool, Condicao, Fumo, HistoricoFamiliar } from "../../../lib/types";

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

/** IMC com 1 casa (null se faltar altura ou peso) e a faixa da OMS em linguagem simples. */
export function imc(alturaCm: number | null, pesoKg: number | null): { valor: number; faixa: string } | null {
  if (!alturaCm || !pesoKg) return null;
  const v = Math.round((pesoKg / (alturaCm / 100) ** 2) * 10) / 10;
  const faixa = v < 18.5 ? "abaixo do peso" : v < 25 ? "peso adequado" : v < 30 ? "sobrepeso" : "obesidade";
  return { valor: v, faixa };
}

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
