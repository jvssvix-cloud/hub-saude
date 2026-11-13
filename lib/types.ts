/**
 * Tipos compartilhados entre entrada (A · extraction/, insights/) e saídas (B · app/, MCP, API).
 * Espelham as tabelas de supabase/migrations/20261109220119_contrato.sql.
 * Mudou um tipo aqui ou uma coluna lá? Mude os dois e avise o outro.
 */

export type Sexo = "M" | "F";

export type Paciente = {
  id: string;
  nome: string;
  nascimento: string; // AAAA-MM-DD
  sexo: Sexo;
  telefone: string | null; // só dígitos, com DDI: "5511987654321"
  usuario_id: string | null; // auth.users.id da conta que entra como este paciente (null = sem conta)
};

/** Perfil de saúde do check-up inicial (tabela perfil_saude, uma linha por paciente; só o servidor do app). */
export type Fumo = "nunca" | "ex" | "atual";
export type Alcool = "nao" | "raramente" | "semanal" | "diario";
export type Condicao = "diabetes" | "hipertensao" | "colesterol_alto" | "tireoide" | "coracao" | "rim";
export type HistoricoFamiliar = "infarto_avc_precoce" | "diabetes" | "cancer";
export type Medico =
  | "clinico" | "cardiologista" | "endocrinologista" | "gastroenterologista" | "urologista" | "ginecologista"
  | "nefrologista" | "pneumologista" | "geriatra" | "neurologista" | "ortopedista";
export type Parente = "pai" | "mae" | "irmaos" | "avos";
export type CondicaoFamiliar =
  | "diabetes" | "hipertensao" | "colesterol_alto" | "infarto_avc_cedo" | "cancer" | "demencia" | "outro";
export type FamiliaParente = { condicoes: CondicaoFamiliar[]; cancer_qual?: string | null; observacao?: string | null };
export type Internacao = { motivo: string; ano: number | null };
export type Cirurgia = { nome: string; ano: number | null };
/** horarios (12/11, lembretes): "HH:MM" em ordem; dentro do jsonb remedios_lista, sem migration. */
export type Remedio = { nome: string; dose: string | null; para_que: string | null; horarios?: string[] | null };
/** Progresso do "Reunir meus exames" (/reunir), por área. */
export type SituacaoColeta = "enviado" | "nao_tenho" | "pulado";
export type PerfilSaude = {
  paciente_id: string;
  termos_versao: string;
  termos_aceitos_em: string;
  dados_saude_aceitos_em: string;
  altura_cm: number | null;
  peso_kg: number | null;
  fumo: Fumo | null;
  alcool: Alcool | null;
  atividade_min_semana: number | null;
  sono_horas: number | null;
  condicoes: Condicao[];
  condicoes_outras: string | null;
  remedios: string | null;
  familia: HistoricoFamiliar[];
  familia_cancer: string | null;
  familia_parentes: Partial<Record<Parente, FamiliaParente>> | null; // familia (acima) é derivado deste
  internacoes: Internacao[] | null;
  cirurgias: Cirurgia[] | null;
  remedios_lista: Remedio[] | null; // remedios (texto) fica só para leitura de quem preencheu antes
  medicos: Medico[] | null;
  medicos_outros: string | null;
  coleta: Partial<Record<string, SituacaoColeta>>;
  alergias: string | null;
  gestante: boolean | null; // só sexo F
  menopausa: boolean | null; // só sexo F
  checkup_concluido_em: string | null;
  atualizado_em: string;
};

export type TipoDocumento = "laudo_exame" | "carteira_vacinacao" | "laudo_descritivo" | "wearable" | "outro";
/** Área de um laudo descritivo (a mesma do /reunir). */
export type AreaDescritivo = "coracao" | "gastro" | "rins" | "mulher" | "ossos" | "pulmao" | "outros";

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
  sha256?: string | null; // hash do arquivo enviado pelo app (evita o mesmo laudo duas vezes); null no seed
  // só em laudo_descritivo (ECG, eco, endoscopia, imagem): a conclusão copiada do laudo e a página dela
  area?: AreaDescritivo | null;
  exame_nome?: string | null;
  conclusao?: string | null;
  conclusao_pagina?: number | null;
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

/** "qr": o paciente gerou (já nasce aprovado). "solicitacao": o médico pediu pelo telefone. */
export type CanalConsentimento = "qr" | "solicitacao";
export type StatusConsentimento = "pendente" | "aprovado" | "recusado";

export type Consentimento = {
  id: string;
  /** null só em pedido para telefone sem cadastro (fica pendente até expirar). */
  paciente_id: string | null;
  token: string; // segredo do QR / link / config do MCP; num pedido, só funciona depois de aprovado
  destinatario_tipo: DestinatarioTipo;
  destinatario_nome: string;
  canal: CanalConsentimento;
  status: StatusConsentimento;
  motivo: string | null; // "Consulta de cardiologia em 14/11"
  categorias: Categoria[] | null; // null = todas
  codigos: string[] | null; // null = todos
  desde: string | null;
  validade: string | null; // intervalo pedido pelo médico ("24:00:00")
  criado_em: string;
  /** Pendente: prazo para o paciente responder. Aprovado: fim do acesso. */
  expira_em: string;
  respondido_em: string | null;
  revogado_em: string | null;
};

/** rpc("solicitar_acesso"): a tela do médico chama com a chave anon. */
export type SolicitarAcessoParams = {
  p_telefone: string;
  p_destinatario_nome: string;
  p_motivo?: string | null;
  p_destinatario_tipo?: DestinatarioTipo;
  p_validade?: string; // intervalo Postgres: "24 hours"
  p_categorias?: Categoria[] | null;
  p_codigos?: string[] | null;
  p_desde?: string | null;
};
/** Mesma resposta exista ou não o telefone (não revela quem usa o app). */
export type RespostaSolicitacao =
  | { id: string; token: string; prazo_resposta: string }
  | { erro: "telefone_invalido" };

/** rpc("responder_solicitacao"): só o servidor do app do paciente (service_role). Escopo só estreita. */
export type ResponderSolicitacaoParams = {
  p_id: string;
  p_aprovar: boolean;
  p_categorias?: Categoria[] | null;
  p_codigos?: string[] | null;
  p_desde?: string | null;
  p_validade?: string | null;
};

export type MotivoAcesso = "ok" | "token_invalido" | "revogado" | "expirado" | "recusado";

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
  /** Pedido ainda sem resposta do paciente: a tela do médico continua esperando. */
  | { ok: false; motivo: "pendente"; prazo_resposta: string }
  | {
      ok: true;
      motivo: "ok";
      consentimento: Pick<Consentimento, "destinatario_tipo" | "destinatario_nome" | "categorias" | "codigos" | "desde" | "expira_em">;
      paciente: Omit<Paciente, "id" | "telefone">;
      documentos: Omit<Documento, "paciente_id">[];
      observacoes: Observacao[];
    };

/** Tabela nota_medico: recomendações revisadas pelo médico (via registrar_nota com o token do consentimento). */
export type NotaMedico = {
  id: string;
  paciente_id: string;
  consentimento_id: string | null;
  autor_nome: string;
  itens: string[];
  criado_em: string;
};

/** Tabela plano_paciente: plano que o paciente salva a partir do chat do app (sugestão de IA; só o servidor lê e grava). */
export type PlanoPaciente = {
  id: string;
  paciente_id: string;
  titulo: string;
  itens: string[];
  origem: "chat";
  seguindo: boolean;
  criado_em: string;
};

/** Tabela envio: arquivo enviado pelo app (PDF/foto) esperando o paciente conferir a prévia e salvar. Só o servidor. */
export type Envio = {
  id: string;
  paciente_id: string;
  sha256: string;
  arquivo: string; // caminho no bucket 'documentos' (enviados/<id>.<ext>)
  mime: string;
  extracao: unknown | null; // ExtracaoNormalizada (extraction/src/schema.ts)
  uso: { modelo: string; entrada: number; saida: number; custo_usd: number; segundos: number } | null;
  situacao: "lendo" | "pronto" | "salvo" | "descartado" | "erro";
  documento_id: string | null;
  erro: string | null;
  criado_em: string;
};
