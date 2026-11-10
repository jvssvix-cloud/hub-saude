/**
 * Leitura do relogio.json (gerado por wearable/, copiado por scripts/copiar-dados.mjs).
 * Tipos espelham wearable/src/tipos.ts. Quando a rota /api/relogio/sync gravar no banco, só este arquivo muda.
 */
import dados from "@/dados/relogio.json";
import { insights, type Serie } from "@/lib/insights";

export type Dia = {
  data: string;
  fc_repouso: number | null;
  vfc_ms: number | null;
  sono_horas: number | null;
  passos: number | null;
};

export type Evento = { data_hora: string; tipo: "ritmo_irregular"; detalhe: string };

export type Alerta = {
  id: "ritmo_irregular" | "fc_repouso_subindo" | "sono_curto" | "atividade_caindo";
  titulo: string;
  nivel: "atencao" | "info";
  motivo: string;
  evidencias: { data: string; valor: string }[];
  recomendacao: string;
  aviso: string;
  contexto_exames?: string[];
};

export type Relogio = {
  gerado_em: string;
  ultima_sincronizacao: string;
  fonte: "sintetico" | "simulador" | "apple_saude";
  paciente_id: string;
  periodo: { inicio: string; fim: string };
  dias: Dia[];
  eventos: Evento[];
  resumo: {
    fc_repouso: { atual_14d: number | null; linha_base: number | null; linha_base_periodo: string };
    vfc_ms: { atual_14d: number | null; linha_base: number | null };
    sono_horas: { atual_14d: number | null };
    passos: { atual_30d: number | null; anterior_90d: number | null };
    eventos_ritmo_14d: number;
    dias_sem_dado_30d: number;
  };
  alertas: Alerta[];
};

export const relogio = dados as unknown as Relogio;

export const FONTE: Record<Relogio["fonte"], string> = {
  sintetico: "Relógio simulado (dados sintéticos)",
  simulador: "Relógio simulado (sincronizando)",
  apple_saude: "Apple Saúde",
};

/** Alertas de atenção primeiro. */
export function alertasOrdenados(): Alerta[] {
  return [...relogio.alertas].sort((a, b) => (a.nivel === b.nivel ? 0 : a.nivel === "atencao" ? -1 : 1));
}

/** Frase do contexto de exames ("LDL 164 mg/dL em mar/2026...") → série do exame, para virar link. */
export function serieDoContexto(frase: string): Serie | undefined {
  return insights.series.find((s) => frase.startsWith(s.nome));
}

/** Últimos n dias do relógio (para os gráficos). */
export function ultimosDias(n: number): Dia[] {
  return relogio.dias.slice(-n);
}

/** "2026-11-09T07:00" → "09/11 às 07:00" */
export function dataHoraBr(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)} às ${iso.slice(11, 16)}`;
}

export function inteiro(v: number | null): string {
  return v === null ? "—" : Math.round(v).toLocaleString("pt-BR");
}

export function decimal(v: number | null): string {
  return v === null ? "—" : v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
