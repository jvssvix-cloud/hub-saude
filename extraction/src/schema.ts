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
] as const;
export type Analito = (typeof ANALITOS)[number];

export const ResultadoExtraido = z.object({
  analito: z.enum([...ANALITOS, "outro"]),
  nome_impresso: z.string(),
  valor_impresso: z.string(),
  valor_numerico: z.number().nullable(),
  unidade_impressa: z.string(),
  referencia_impressa: z.string(),
  ref_min: z.number().nullable(),
  ref_max: z.number().nullable(),
  fora_da_faixa: z.boolean(),
  pagina: z.number().int(),
  confianca: z.enum(["alta", "media", "baixa"]),
});
export type ResultadoExtraido = z.infer<typeof ResultadoExtraido>;

export const Extracao = z.object({
  documento: z.object({
    laboratorio: z.string(),
    data_coleta: z.string().nullable(),
    nome_paciente_impresso: z.string().nullable(),
    sexo_paciente: z.enum(["M", "F"]).nullable(),
    atendimento: z.string().nullable(),
    paginas: z.number().int(),
  }),
  resultados: z.array(ResultadoExtraido),
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

export type ExtracaoNormalizada = Omit<Extracao, "resultados"> & {
  resultados: ResultadoNormalizado[];
};
