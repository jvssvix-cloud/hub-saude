/**
 * Entrada e saída dos insights.
 * Entrada = os FATOS guardados (resultados de cada laudo, no formato da extração/gabarito).
 * Saída = INFORMAÇÃO calculada na hora por regras (nada aqui é guardado no banco).
 */

/** Um resultado de exame, como sai da extração (já normalizado para a unidade canônica). */
export type Resultado = {
  analito: string;
  nome_impresso: string;
  valor_impresso: string;
  unidade_impressa: string;
  valor_canonico: number | null;
  unidade_canonica: string | null;
  referencia_impressa: string;
  ref_min_canonico: number | null;
  ref_max_canonico: number | null;
  fora_da_faixa: boolean;
  pagina: number;
};

/** Um laudo (documento de origem) com seus resultados. */
export type Laudo = {
  id: string;
  arquivo: string;
  laboratorio: string;
  data_coleta: string; // AAAA-MM-DD
  resultados: Resultado[];
};

export type Paciente = { nome: string; nascimento: string; sexo: "M" | "F" };

/** Onde um número nasceu: laudo + página (rastreabilidade). */
export type Fonte = { laudo_id: string; arquivo: string; laboratorio: string; pagina: number };

export type Ponto = {
  data: string;
  valor: number;
  ref_min: number | null;
  ref_max: number | null;
  fora_da_faixa: boolean;
  valor_impresso: string;
  unidade_impressa: string;
  referencia_impressa: string;
  fonte: Fonte;
};

export type Tendencia = {
  direcao: "subindo" | "caindo" | "estavel";
  /** 0 a 1: quanto os pontos seguem a linha de tendência (R²). */
  consistencia: number;
  variacao_pct: number;
  anos: number;
  primeiro: Ponto;
  ultimo: Ponto;
  /** Data a partir da qual o exame está fora da referência sem interrupção (se estiver hoje). */
  fora_desde: string | null;
  texto: string;
};

export type Serie = {
  analito: string;
  nome: string;
  unidade: string;
  area: string;
  pontos: Ponto[];
  ultimo: Ponto;
  /** Último resultado fora da referência. */
  alterado: boolean;
  /** "acima" ou "abaixo" da referência, quando alterado. */
  sentido: "acima" | "abaixo" | null;
  /** Quantos exames seguidos (contando do último) estão fora da referência. */
  fora_seguidos: number;
  persistente: boolean;
  tendencia: Tendencia | null;
};

export type StatusArea = "atencao" | "em_dia" | "sem_dados_recentes";

export type Area = {
  id: string;
  nome: string;
  status: StatusArea;
  motivos: string[];
  analitos: string[];
  ultimo_exame: string;
};

export type Repeticao = {
  dias: number;
  analitos: string[];
  de: Fonte & { data: string };
  para: Fonte & { data: string };
  texto: string;
};

export type ProximoExame = {
  analito: string;
  nome: string;
  ultimo: string;
  previsto: string;
  situacao: "em_dia" | "vencido" | "atrasado";
};

export type Insights = {
  paciente: Paciente;
  hoje: string;
  periodo: { inicio: string; fim: string; laudos: number; laboratorios: string[] };
  series: Serie[];
  areas: Area[];
  repeticoes: Repeticao[];
  proximos: ProximoExame[];
  vacinacao: {
    fonte: string;
    doses: import("./vacinas").DoseVacina[];
    situacao: import("./vacinas").SituacaoVacina[];
  } | null;
  resumo_medico: string[];
};
