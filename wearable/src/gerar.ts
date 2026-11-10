/**
 * Relógio sintético da persona (Roberto, 58 anos). Determinístico: mesma seed = mesmos dados.
 *
 * História (combina com os exames: LDL e glicose subindo há anos):
 *   - FC de repouso ~62 bpm até meados de agosto, depois sobe devagar até ~71 em novembro;
 *   - variabilidade cardíaca (SDNN) cai de ~44 para ~31 ms no mesmo período;
 *   - sono ~7 h, piorando nas últimas 6 semanas (~5,1 h no fim);
 *   - passos ~8.000 (menos no fim de semana), caindo a partir de outubro (~4.500 no fim);
 *   - alguns dias sem dado (relógio esquecido no carregador);
 *   - 5 avisos de ritmo irregular entre 21/10 e 08/11, de madrugada.
 */
import type { Dia, Evento, Lote } from "./tipos";

export const SEED = 42;
export const INICIO = "2026-05-14";
export const FIM = "2026-11-09";

/** Gerador pseudoaleatório pequeno e determinístico (mulberry32). */
function aleatorio(seed: number) {
  let a = seed >>> 0;
  const r = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const normal = (media: number, dp: number) => {
    const u = Math.max(r(), 1e-12), v = r();
    return media + dp * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  return { r, normal };
}

export function somarDias(data: string, n: number): string {
  const d = new Date(data + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function diasEntre(a: string, b: string): number {
  return Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86400000);
}

/** 0 antes de `de`, 1 depois de `ate`, linear entre os dois. */
function rampa(data: string, de: string, ate: string): number {
  const t = diasEntre(de, data) / diasEntre(de, ate);
  return Math.min(1, Math.max(0, t));
}

const r1 = (x: number) => Math.round(x * 10) / 10;

export const EVENTOS_PERSONA: Evento[] = [
  "2026-10-21T03:12", "2026-10-26T02:47", "2026-10-31T04:05", "2026-11-04T01:38", "2026-11-08T03:55",
].map((data_hora) => ({
  data_hora, tipo: "ritmo_irregular" as const,
  detalhe: "Notificação de ritmo irregular do relógio (sinais compatíveis com fibrilação atrial, segundo o relógio)",
}));

export function gerarPersona(seed = SEED): Lote {
  const { r, normal } = aleatorio(seed);
  const dias: Dia[] = [];
  const total = diasEntre(INICIO, FIM);
  for (let i = 0; i <= total; i++) {
    const data = somarDias(INICIO, i);
    const semana = new Date(data + "T12:00:00Z").getUTCDay();
    const fimDeSemana = semana === 0 || semana === 6;

    const piora = rampa(data, "2026-08-15", FIM); // coração
    const sonoPiora = rampa(data, "2026-09-28", FIM);
    const menosPassos = rampa(data, "2026-10-01", FIM);

    const fc = Math.round(normal(62 + 9 * piora, 1.2));
    const vfc = Math.round(normal(44 - 13 * piora, 3));
    const sono = r1(Math.max(3.5, normal(7.0 - 1.9 * sonoPiora + (fimDeSemana ? 0.4 : 0), 0.35)));
    const basePassos = (fimDeSemana ? 6000 : 8200) - 3500 * menosPassos;
    const passos = Math.max(800, Math.round(normal(basePassos, basePassos * 0.15) / 10) * 10);

    // ~4% dos dias sem dado (nunca nos 3 últimos, para a demo ficar limpa)
    const semDado = i < total - 2 && r() < 0.04;
    dias.push(semDado
      ? { data, fc_repouso: null, vfc_ms: null, sono_horas: null, passos: null }
      : { data, fc_repouso: fc, vfc_ms: vfc, sono_horas: sono, passos });
  }
  return { dias, eventos: EVENTOS_PERSONA.filter((e) => e.data_hora.slice(0, 10) <= FIM) };
}
