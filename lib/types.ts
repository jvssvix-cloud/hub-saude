/**
 * Tipos compartilhados entre entrada (A · extraction/, insights/) e saídas (B · app/, MCP, API).
 * Espelham as tabelas de supabase/migrations/20261109000000_contrato.sql.
 * Mudou um tipo aqui ou uma coluna lá? Mude os dois e avise o outro.
 */

export type Sexo = "M" | "F";

export type Paciente = {
  id: string;
  nome: string;
  nascimento: string; // AAAA-MM-DD
  sexo: Sexo;
};

export type TipoDocumento = "laudo_exame" | "carteira_vacinacao" | "wearable" | "outro";

/** Canal por onde o dado entrou. É o que a demo mostra como "várias fontes, um histórico". */
export type Origem = "upload_pdf" | "upload_foto" | "email" | "meu_sus" | "wearable" | "clinica_api" | "seed";

export type Documento = {
  id: string;
  paciente_id: string;
  tipo: TipoDocumento;
  origem: Origem;
  emissor: string | null; // laboratório, "Meu SUS Digital", "Apple Health"
  data: string | null; // coleta do laudo; null em carteira de vacina
  arquivo: string | null; // caminho no Storage
  paginas: number | null;
};

export type Categoria = "exame" | "vacina" | "wearable";

/**
 * Uma observação: resultado de exame, dose de vacina ou agregado diário de wearable.
 * Os nomes seguem extraction/src/schema.ts (ResultadoNormalizado) e insights/src/tipos.ts (Resultado);
 * `codigo` = `analito` (exame), `vacina` (vacina) ou métrica (wearable, ex.: "fc_repouso").
 */
export type Observacao = {
  id: number;
  documento_id: string;
  categoria: Categoria;
  codigo: string;
  data: string; // AAAA-MM-DD

  nome_impresso: string | null;
  valor_impresso: string | null;
  unidade_impressa: string | null;
  referencia_impressa: string | null;
  pagina: number | null;

  valor_canonico: number | null;
  unidade_canonica: string | null;
  qualificador: "<" | ">" | "<=" | ">=" | null;
  resultado_texto: string | null;
  ref_min_canonico: number | null;
  ref_max_canonico: number | null;
  fora_da_faixa: boolean;

  dose: string | null;
  lote: string | null;
  local: string | null;

  confianca: "alta" | "media" | "baixa" | null;
  alertas: string[];
};

/** Linha a gravar (o banco gera id e criado_em). */
export type NovaObservacao = Omit<Observacao, "id"> & { paciente_id: string };

export type DestinatarioTipo = "medico" | "ia" | "app_terceiro";

export type Consentimento = {
  id: string;
  paciente_id: string;
  token: string; // segredo do QR / link / config do MCP
  destinatario_tipo: DestinatarioTipo;
  destinatario_nome: string;
  categorias: Categoria[] | null; // null = todas
  codigos: string[] | null; // null = todos
  desde: string | null;
  criado_em: string;
  expira_em: string;
  revogado_em: string | null;
};

export type MotivoAcesso = "ok" | "token_invalido" | "revogado" | "expirado";

export type LogAcesso = {
  id: number;
  consentimento_id: string | null;
  paciente_id: string | null;
  em: string;
  consumidor: string; // "visao_medico" | "mcp" | "api"
  permitido: boolean;
  motivo: MotivoAcesso;
  qtd_observacoes: number;
  filtros: { categorias?: string[]; codigos?: string[]; desde?: string } | null;
};

/** Parâmetros de rpc("acessar_historico"). Os filtros só estreitam o escopo do consentimento. */
export type AcessarHistoricoParams = {
  p_token: string;
  p_consumidor: string;
  p_categorias?: Categoria[] | null;
  p_codigos?: string[] | null;
  p_desde?: string | null;
};

/** Resposta de rpc("acessar_historico"): o que médico, MCP e API recebem. */
export type RespostaHistorico =
  | { ok: false; motivo: Exclude<MotivoAcesso, "ok"> }
  | {
      ok: true;
      motivo: "ok";
      consentimento: Pick<Consentimento, "destinatario_tipo" | "destinatario_nome" | "categorias" | "codigos" | "desde" | "expira_em">;
      paciente: Omit<Paciente, "id">;
      documentos: Omit<Documento, "paciente_id">[];
      observacoes: Observacao[];
    };
