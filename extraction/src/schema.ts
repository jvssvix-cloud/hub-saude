/**
 * Formato de saída da extração (o que o modelo devolve) e do resultado normalizado.
 * Espelha o gabarito de tools/gerador-laudos (ver README de lá): o app consome este formato.
 */
import { z } from "zod";

export const ANALITOS = [
  "hemacias", "hemoglobina", "hematocrito", "leucocitos", "plaquetas",
  "glicose", "hba1c", "colesterol_total", "hdl", "ldl", "triglicerides",
  "creatinina", "acido_urico", "tgo", "tgp", "tsh", "psa", "vitamina_d",
  // incluídos após o 1º laudo real (09/11)
  "insulina", "colesterol_nao_hdl", "vldl", "fosfatase_alcalina", "ggt",
  "bilirrubina_total", "bilirrubina_direta", "bilirrubina_indireta",
  // incluídos após o laudo real de outro laboratório (09/11, 2ª rodada)
  "ferritina", "vitamina_b12", "t4_livre", "anti_tpo", "anti_tireoglobulina", "tfg", "magnesio",
  "lipase", "cortisol", "pth", "homocisteina", "glicemia_media_estimada", "anti_endomisio",
  "anti_transglutaminase_iga",
] as const;
export type Analito = (typeof ANALITOS)[number];

export const ResultadoExtraido = z.object({
  analito: z.enum([...ANALITOS, "outro"]),
  nome_impresso: z.string(),
  valor_impresso: z.string(),
  valor_numerico: z.number().nullable(),
  /** "<" ou ">" quando o laudo dá só um limite ("INFERIOR A 0,2" = "<" 0.2). */
  qualificador: z.enum(["<", ">", "<=", ">="]).nullable(),
  /** Resultado só em texto ("NÃO REAGENTE", "POSITIVO"); null quando numérico. */
  resultado_texto: z.string().nullable(),
  /** Data de coleta DESTE resultado, quando o laudo traz datas diferentes por exame. */
  data_coleta: z.string().nullable(),
  unidade_impressa: z.string(),
  referencia_impressa: z.string(),
  ref_min: z.number().nullable(),
  ref_max: z.number().nullable(),
  fora_da_faixa: z.boolean(),
  pagina: z.number().int(),
  confianca: z.enum(["alta", "media", "baixa"]),
});
export type ResultadoExtraido = z.infer<typeof ResultadoExtraido>;

export const VACINAS = [
  "hepatite_b", "dt", "dtpa", "febre_amarela", "triplice_viral", "influenza", "covid19", "hpv",
  "meningococica", "pneumococica", "varicela", "dengue", "herpes_zoster",
] as const;
export type Vacina = (typeof VACINAS)[number];

export const DoseExtraida = z.object({
  vacina: z.enum([...VACINAS, "outra"]),
  nome_impresso: z.string(),
  dose: z.enum(["1", "2", "3", "reforco", "unica", "anual", "outra"]),
  dose_impressa: z.string(),
  data: z.string().nullable(),
  data_impressa: z.string(),
  lote: z.string().nullable(),
  local: z.string().nullable(),
  pagina: z.number().int(),
  confianca: z.enum(["alta", "media", "baixa"]),
});
export type DoseExtraida = z.infer<typeof DoseExtraida>;

export const Extracao = z.object({
  tipo_documento: z.enum(["laudo_exame", "carteira_vacinacao", "outro"]),
  documento: z.object({
    laboratorio: z.string(),
    data_coleta: z.string().nullable(),
    nome_paciente_impresso: z.string().nullable(),
    sexo_paciente: z.enum(["M", "F"]).nullable(),
    atendimento: z.string().nullable(),
    paginas: z.number().int(),
  }),
  resultados: z.array(ResultadoExtraido),
  doses: z.array(DoseExtraida),
  observacoes: z.string().nullable(),
});
export type Extracao = z.infer<typeof Extracao>;

/** Resultado depois da normalização determinística (unidade canônica + validações). */
export type ResultadoNormalizado = ResultadoExtraido & {
  unidade_canonica: string | null;
  valor_canonico: number | null;
  ref_min_canonico: number | null;
  ref_max_canonico: number | null;
  /** Problemas encontrados pelas validações (vazio = ok). */
  alertas: string[];
};

export type DoseNormalizada = DoseExtraida & { alertas: string[] };

export type ExtracaoNormalizada = Omit<Extracao, "resultados" | "doses"> & {
  resultados: ResultadoNormalizado[];
  doses: DoseNormalizada[];
};
