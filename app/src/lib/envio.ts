/**
 * Envio de exame pelo app: PDF ou foto -> Storage -> extração (Claude) -> PRÉVIA -> paciente salva -> documento + observacao.
 * SÓ SERVIDOR (chave secreta do Supabase e da Anthropic).
 *
 * A leitura fica guardada na tabela `envio` entre a prévia e o "Salvar": o navegador só manda o id do envio,
 * nunca os dados. Assim ninguém grava no histórico um valor que não saiu do documento.
 *
 * Cada função recebe o paciente da SESSÃO (quem chama resolve com pacienteDaSessao/pacienteAtual); nunca um id vindo
 * do navegador. Proteção de custo: no máximo ENVIO_LIMITE_HORA leituras por hora por paciente (padrão 40) e o
 * interruptor ENVIO_DESLIGADO=1 (na Vercel) desliga o envio sem novo deploy de código.
 */
import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { extrairDocumento } from "@extraction/extrair";
import type { ExtracaoNormalizada } from "@extraction/schema";
import type { Envio } from "../../../lib/types";
import { escreverServidor, getServidor, SUPABASE_URL } from "@/lib/supabase";

export const TAMANHO_MAX = 4 * 1024 * 1024; // limite do corpo da requisição na Vercel é 4,5 MB
const EXTENSAO: Record<string, string> = {
  "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
};
const BUCKET = "documentos";

export function envioLigado(): boolean {
  return process.env.ENVIO_DESLIGADO !== "1" && !!process.env.ANTHROPIC_API_KEY && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}
const limitePorHora = () => Number(process.env.ENVIO_LIMITE_HORA) || 40; // quem reúne a pasta toda passa de 10/h

// ---------------------------------------------------------------- Storage (bucket privado)
function cabecalhosStorage(extra: Record<string, string> = {}) {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return { apikey: k, Authorization: `Bearer ${k}`, ...extra };
}

async function subirArquivo(caminho: string, dados: Buffer, mime: string) {
  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${caminho}`, {
    method: "POST",
    headers: cabecalhosStorage({ "Content-Type": mime, "x-upsert": "false" }),
    body: new Uint8Array(dados),
  });
  if (!r.ok) throw new Error(`Storage ${r.status}: ${(await r.text()).slice(0, 200)}`);
}

export async function baixarArquivo(caminho: string): Promise<Response> {
  return fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${caminho}`, { headers: cabecalhosStorage(), cache: "no-store" });
}

async function apagarArquivo(caminho: string) {
  await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${caminho}`, { method: "DELETE", headers: cabecalhosStorage() }).catch(
    () => undefined,
  );
}

// ---------------------------------------------------------------- prévia (o que o paciente confere)
/**
 * reconhecido: vai para o histórico (tem data). outro: exame fora do dicionário, guardado em "Outros exames" com o
 * valor e a referência impressos, sem gráfico e sem regra (a unidade e a faixa não são padronizadas).
 */
export type ItemExame = {
  nome: string; valor: string; unidade: string; referencia: string; pagina: number;
  fora: boolean; reconhecido: boolean; outro: boolean; alertas: string[];
};
export type ItemDose = { nome: string; dose: string; data: string | null; lote: string | null; pagina: number; valida: boolean; alertas: string[] };
/** Laudo descritivo (ECG, eco, endoscopia, imagem): a conclusão copiada do laudo, com a página. */
export type ItemDescritivo = {
  exame: string; area: string; data: string | null; conclusao: string; pagina: number; alertas: string[];
};
export type Previa = {
  envioId: string;
  arquivo: string; // link para abrir o original (/enviados/...)
  tipo: "laudo_exame" | "carteira_vacinacao" | "laudo_descritivo" | "outro";
  descritivo: ItemDescritivo | null;
  emissor: string;
  data: string | null;
  paginas: number;
  exames: ItemExame[];
  doses: ItemDose[];
  avisos: string[];
  podeSalvar: boolean;
  segundos: number;
};

type Cadastro = { nome: string; nascimento: string; sexo: "M" | "F" };

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** O que vai e o que não vai para o histórico, com os motivos (mesma regra do salvar). */
export function montarPrevia(envio: Pick<Envio, "id" | "arquivo">, e: ExtracaoNormalizada, cadastro: Cadastro, segundos = 0): Previa {
  const dataDoc = e.documento.data_coleta;
  const exames: ItemExame[] = e.resultados.map((r) => ({
    nome: r.nome_impresso, valor: r.valor_impresso, unidade: r.unidade_impressa, referencia: r.referencia_impressa,
    pagina: r.pagina, fora: r.fora_da_faixa, reconhecido: !!(r.data_coleta ?? dataDoc), outro: r.analito === "outro",
    alertas: r.alertas.filter((a) => a !== "exame fora do dicionário"), // o selo "outros exames" já diz isso
  }));
  const doses: ItemDose[] = e.doses.map((d) => ({
    nome: d.nome_impresso, dose: d.dose_impressa, data: d.data, lote: d.lote, pagina: d.pagina,
    valida: d.vacina !== "outra" && !!d.data && /^\d{4}-\d{2}-\d{2}$/.test(d.data), alertas: d.alertas,
  }));

  const avisos: string[] = [];
  const impresso = e.documento.nome_paciente_impresso;
  const primeiro = semAcento(cadastro.nome.split(" ")[0]);
  if (impresso && !semAcento(impresso).includes(primeiro)) {
    avisos.push(`O nome no documento não parece ser o de ${cadastro.nome.split(" ")[0]}. Confira se é o exame certo.`);
  }
  if (e.documento.sexo_paciente && e.documento.sexo_paciente !== cadastro.sexo) avisos.push("O sexo no documento é diferente do seu cadastro.");
  if (e.tipo_documento === "outro") avisos.push("Não parece um laudo de exame nem uma carteira de vacinação.");
  const d = e.tipo_documento === "laudo_descritivo" ? e.descritivo : null;
  if (e.tipo_documento === "laudo_descritivo" && !d?.conclusao) avisos.push("Não achamos a conclusão do laudo.");
  if (d?.alertas.length) avisos.push(...d.alertas.map((a) => `Conferir: ${a}.`));
  if (e.tipo_documento === "laudo_exame" && !dataDoc) avisos.push("Não achamos a data da coleta no documento.");
  const ignorados = exames.filter((x) => !x.reconhecido).length + doses.filter((x) => !x.valida).length;
  if (ignorados) avisos.push(`${ignorados} ${ignorados === 1 ? "item ficou sem data e não será guardado" : "itens ficaram sem data e não serão guardados"}.`);
  const nOutros = !d ? exames.filter((x) => x.outro && x.reconhecido).length : 0;
  if (nOutros) {
    avisos.push(`${nOutros} ${nOutros === 1 ? "exame fora da nossa lista fica guardado" : "exames fora da nossa lista ficam guardados"} em Outros exames, com o valor e a referência do laudo, sem gráfico.`);
  }

  const nExames = exames.filter((x) => x.reconhecido).length;
  const nDoses = doses.filter((x) => x.valida).length;
  const podeSalvar =
    (e.tipo_documento === "laudo_exame" && !!dataDoc && nExames > 0) || (e.tipo_documento === "carteira_vacinacao" && nDoses > 0)
    || (e.tipo_documento === "laudo_descritivo" && !!d?.conclusao);

  return {
    envioId: envio.id, arquivo: `/${envio.arquivo}`, tipo: e.tipo_documento, emissor: e.documento.laboratorio,
    data: d ? (d.data_exame ?? dataDoc) : dataDoc, paginas: e.documento.paginas, exames: d ? [] : exames, doses, avisos,
    podeSalvar, segundos,
    descritivo: d
      ? { exame: d.exame_nome, area: d.area, data: d.data_exame, conclusao: d.conclusao, pagina: d.pagina_conclusao, alertas: d.alertas }
      : null,
  };
}

// ---------------------------------------------------------------- 1) ler (extração + prévia)
export class ErroEnvio extends Error {
  constructor(public codigo: string, mensagem: string, public status = 400) {
    super(mensagem);
  }
}

async function cadastroDoPaciente(pacienteId: string): Promise<Cadastro> {
  const [p] = await getServidor<Cadastro[]>(`paciente?id=eq.${encodeURIComponent(pacienteId)}&select=nome,nascimento,sexo`);
  if (!p) throw new ErroEnvio("sem_paciente", "Não achamos o seu cadastro. Entre de novo.", 500);
  return p;
}

export async function lerExame(arquivo: File, pacienteId: string): Promise<Previa> {
  const pid = encodeURIComponent(pacienteId);
  if (!envioLigado()) throw new ErroEnvio("desligado", "O envio de exames está desligado no momento.", 503);
  const mime = arquivo.type;
  if (!EXTENSAO[mime]) throw new ErroEnvio("tipo", "Envie um PDF ou uma foto (JPG, PNG ou WebP).");
  if (arquivo.size > TAMANHO_MAX) throw new ErroEnvio("tamanho", "O arquivo passa de 4 MB. Envie um PDF menor ou uma foto.");
  if (arquivo.size === 0) throw new ErroEnvio("vazio", "O arquivo está vazio.");

  const dados = Buffer.from(await arquivo.arrayBuffer());
  const sha256 = createHash("sha256").update(dados).digest("hex");
  const cadastro = await cadastroDoPaciente(pacienteId);

  // Já está no histórico?
  const [jaSalvo] = await getServidor<{ id: string; emissor: string | null; data: string | null }[]>(
    `documento?paciente_id=eq.${pid}&sha256=eq.${sha256}&select=id,emissor,data`,
  );
  if (jaSalvo) throw new ErroEnvio("repetido", "Este arquivo já está no seu histórico.", 409);

  // Já foi lido e está esperando? Reaproveita a leitura (não paga de novo)
  const [pendente] = await getServidor<Envio[]>(
    `envio?paciente_id=eq.${pid}&sha256=eq.${sha256}&situacao=eq.pronto&select=*&order=criado_em.desc&limit=1`,
  );
  if (pendente?.extracao) return montarPrevia(pendente, pendente.extracao as ExtracaoNormalizada, cadastro, pendente.uso?.segundos ?? 0);

  // Limite de leituras por hora (cada leitura custa uma chamada à API)
  const desde = new Date(Date.now() - 3600_000).toISOString();
  const recentes = await getServidor<{ id: string }[]>(
    `envio?paciente_id=eq.${pid}&criado_em=gte.${encodeURIComponent(desde)}&select=id&limit=${limitePorHora()}`,
  );
  if (recentes.length >= limitePorHora()) {
    throw new ErroEnvio("limite", "Muitos envios na última hora. Tente de novo mais tarde.", 429);
  }

  const id = randomUUID();
  const caminho = `enviados/${id}.${EXTENSAO[mime]}`;
  await escreverServidor("POST", "envio", { id, paciente_id: pacienteId, sha256, arquivo: caminho, mime, situacao: "lendo" });

  try {
    await subirArquivo(caminho, dados, mime);
    const r = await extrairDocumento([{ dados, mime }], { paciente: { sexo: cadastro.sexo, nascimento: cadastro.nascimento } });
    const uso = { modelo: r.modelo, ...r.uso };
    await escreverServidor("PATCH", `envio?id=eq.${id}`, { situacao: "pronto", extracao: r.normalizado, uso });
    return montarPrevia({ id, arquivo: caminho }, r.normalizado, cadastro, r.uso.segundos);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[envio] leitura:", msg);
    await escreverServidor("PATCH", `envio?id=eq.${id}`, { situacao: "erro", erro: msg.slice(0, 500) }).catch(() => undefined);
    await apagarArquivo(caminho);
    throw new ErroEnvio("leitura", "Não conseguimos ler este documento. Tente uma foto mais nítida ou o PDF do laboratório.", 502);
  }
}

// ---------------------------------------------------------------- 2) salvar ou descartar
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function envioPronto(id: string, pacienteId: string): Promise<Envio> {
  if (!UUID.test(id)) throw new ErroEnvio("id", "Envio inválido.");
  // só acha envio do próprio paciente: o id que vem do navegador não alcança o de outro
  const [envio] = await getServidor<Envio[]>(`envio?id=eq.${id}&paciente_id=eq.${encodeURIComponent(pacienteId)}&select=*`);
  if (!envio) throw new ErroEnvio("id", "Envio não encontrado.", 404);
  if (envio.situacao !== "pronto" || !envio.extracao) throw new ErroEnvio("situacao", "Este envio já foi salvo ou descartado.", 409);
  return envio;
}

/** Grava documento + observações a partir da leitura guardada. Devolve o id do documento. */
export async function salvarEnvio(
  id: string, pacienteId: string,
): Promise<{ documentoId: string; exames: number; doses: number; area: string | null }> {
  const envio = await envioPronto(id, pacienteId);
  const e = envio.extracao as ExtracaoNormalizada;
  const previa = montarPrevia(envio, e, await cadastroDoPaciente(pacienteId));
  if (!previa.podeSalvar) throw new ErroEnvio("nada", "Não há resultados reconhecidos para salvar.");

  const documentoId = `envio-${id.slice(0, 8)}`;
  const dataDoc = e.documento.data_coleta;

  // laudo descritivo: só o documento, com a conclusão copiada e a página (não há valor para virar observação)
  const d = e.tipo_documento === "laudo_descritivo" ? e.descritivo : null;
  if (d) {
    const data = d.data_exame && /^\d{4}-\d{2}-\d{2}$/.test(d.data_exame) ? d.data_exame : null;
    await escreverServidor("POST", "documento", {
      id: documentoId, paciente_id: pacienteId, tipo: "laudo_descritivo",
      origem: envio.mime === "application/pdf" ? "upload_pdf" : "upload_foto",
      emissor: e.documento.laboratorio || null, data, arquivo: envio.arquivo, paginas: e.documento.paginas,
      sha256: envio.sha256, area: d.area, exame_nome: d.exame_nome.slice(0, 200), conclusao: d.conclusao.slice(0, 4000),
      conclusao_pagina: Math.max(1, d.pagina_conclusao),
    });
    await escreverServidor("PATCH", `envio?id=eq.${id}`, { situacao: "salvo", documento_id: documentoId });
    return { documentoId, exames: 0, doses: 0, area: d.area };
  }
  const tipo = e.tipo_documento === "carteira_vacinacao" ? "carteira_vacinacao" : "laudo_exame";

  const observacoes =
    tipo === "laudo_exame"
      ? e.resultados
          .filter((r) => r.data_coleta ?? dataDoc)
          .map((r) => {
            // fora do dicionário ("outro"): guarda na unidade IMPRESSA (sem conversão) e as regras ignoram
            const outro = r.analito === "outro";
            return {
              paciente_id: pacienteId, documento_id: documentoId, categoria: "exame", codigo: r.analito,
              data: r.data_coleta ?? dataDoc,
              nome_impresso: r.nome_impresso, valor_impresso: r.valor_impresso, unidade_impressa: r.unidade_impressa,
              referencia_impressa: r.referencia_impressa || null, pagina: r.pagina,
              valor_canonico: outro ? r.valor_numerico : r.valor_canonico,
              unidade_canonica: outro ? r.unidade_impressa || null : r.unidade_canonica,
              qualificador: r.qualificador, resultado_texto: r.resultado_texto,
              ref_min_canonico: outro ? r.ref_min : r.ref_min_canonico,
              ref_max_canonico: outro ? r.ref_max : r.ref_max_canonico,
              fora_da_faixa: r.fora_da_faixa, confianca: r.confianca, alertas: r.alertas,
            };
          })
      : e.doses
          .filter((d) => d.vacina !== "outra" && d.data && /^\d{4}-\d{2}-\d{2}$/.test(d.data))
          .map((d) => ({
            paciente_id: pacienteId, documento_id: documentoId, categoria: "vacina", codigo: d.vacina, data: d.data,
            nome_impresso: d.nome_impresso, valor_impresso: d.dose_impressa, pagina: d.pagina,
            dose: d.dose, lote: d.lote, local: d.local, confianca: d.confianca, alertas: d.alertas,
          }));

  await escreverServidor("POST", "documento", {
    id: documentoId, paciente_id: pacienteId, tipo,
    origem: envio.mime === "application/pdf" ? "upload_pdf" : "upload_foto",
    emissor: e.documento.laboratorio || null, data: tipo === "laudo_exame" ? dataDoc : null,
    arquivo: envio.arquivo, paginas: e.documento.paginas, sha256: envio.sha256,
  });
  try {
    await escreverServidor("POST", "observacao", observacoes);
  } catch (err) {
    await escreverServidor("DELETE", `documento?id=eq.${documentoId}`).catch(() => undefined); // não deixa documento vazio
    throw err;
  }
  await escreverServidor("PATCH", `envio?id=eq.${id}`, { situacao: "salvo", documento_id: documentoId });
  return {
    documentoId,
    exames: tipo === "laudo_exame" ? observacoes.length : 0,
    doses: tipo === "carteira_vacinacao" ? observacoes.length : 0,
    area: tipo === "laudo_exame" ? "sangue" : "vacinas", // área do /reunir que este documento cobre
  };
}

export async function descartarEnvio(id: string, pacienteId: string): Promise<void> {
  const envio = await envioPronto(id, pacienteId);
  await escreverServidor("PATCH", `envio?id=eq.${id}`, { situacao: "descartado" });
  await apagarArquivo(envio.arquivo);
}
