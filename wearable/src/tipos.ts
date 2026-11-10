/**
 * Dados do relógio.
 * A fonte (sintético hoje; Apple Saúde depois) manda o RESUMO DIÁRIO pronto + EVENTOS um a um.
 * Nada aqui passa pela IA: é só número e regra (custo de API zero).
 */

/** Uma linha por dia. null = sem dado naquele dia (relógio no carregador, não dormiu com ele...). */
export type Dia = {
  data: string; // AAAA-MM-DD
  fc_repouso: number | null; // bpm (a Apple calcula 1 por dia)
  vfc_ms: number | null; // variabilidade cardíaca, SDNN em ms (padrão da Apple)
  sono_horas: number | null; // horas dormidas na noite que TERMINA neste dia
  passos: number | null; // soma do dia
};

/** Evento isolado: não vira média, cada um é guardado. */
export type Evento = {
  data_hora: string; // AAAA-MM-DDTHH:MM
  tipo: "ritmo_irregular";
  detalhe: string;
};

/** O que cada sincronização manda (e o que o app guarda). */
export type Lote = { dias: Dia[]; eventos: Evento[] };

export type Evidencia = { data: string; valor: string };

export type Alerta = {
  id: "ritmo_irregular" | "fc_repouso_subindo" | "sono_curto" | "atividade_caindo";
  titulo: string;
  nivel: "atencao" | "info";
  motivo: string; // frase simples, com os números
  evidencias: Evidencia[];
  recomendacao: string;
  aviso: "Isto não é diagnóstico.";
  /** Cruzamento com os exames (vem do insights.json, quando existe). */
  contexto_exames?: string[];
};

export type Resumo = {
  fc_repouso: { atual_14d: number | null; linha_base: number | null; linha_base_periodo: string };
  vfc_ms: { atual_14d: number | null; linha_base: number | null };
  sono_horas: { atual_14d: number | null };
  passos: { atual_30d: number | null; anterior_90d: number | null };
  eventos_ritmo_14d: number;
  dias_sem_dado_30d: number;
};

/** Contrato com o app: wearable/saida/relogio.json */
export type RelogioJson = {
  gerado_em: string; // AAAA-MM-DD (o "hoje" das regras)
  ultima_sincronizacao: string; // data e hora
  fonte: "sintetico" | "simulador" | "apple_saude";
  paciente_id: string;
  periodo: { inicio: string; fim: string };
  dias: Dia[];
  eventos: Evento[];
  resumo: Resumo;
  alertas: Alerta[];
};
