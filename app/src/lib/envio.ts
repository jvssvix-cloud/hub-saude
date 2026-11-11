/**
 * Envio de exame pelo app: PDF ou foto -> Storage -> extração (Claude) -> PRÉVIA -> paciente salva -> documento + observacao.
 * SÓ SERVIDOR (chave secreta do Supabase e da Anthropic).
 *
 * A leitura fica guardada na tabela `envio` entre a prévia e o "Salvar": o navegador só manda o id do envio,
 * nunca os dados. Assim ninguém grava no histórico um valor que não saiu do documento.
 *
 * Proteção enquanto não há login: no máximo ENVIO_LIMITE_HORA leituras por hora (padrão 10) e o interruptor
 * ENVIO_DESLIGADO=1 (na Vercel) desliga o envio sem novo deploy de código.
 */
import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { extrairDocumento } from "@extraction/extrair";
import type { ExtracaoNormalizada } from "@extraction/schema";
import type { Envio } from "../../../lib/types";
import { escreverServidor, getServidor, SUPABASE_URL } from "@/lib/supabase";
import { PACIENTE_ID } from "@/lib/usuario";

export const TAMANHO_MAX = 4 * 1024 * 1024; // limite do corpo da requisição na Vercel é 4,5 MB
const EXTENSAO: Record<string, string> = {
  "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
};
const BUCKET = "documentos";

export function envioLigado(): boolean {
  return process.env.ENVIO_DESLIGADO !== "1" && !!process.env.ANTHROPIC_API_KEY && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}
const limitePorHora = () => Number(process.env.ENVIO_LIMITE_HORA) || 10;

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
export type ItemExame = {
  nome: string; valor: string; unidade: string; referencia: string; pagina: number;
  fora: boolean; reconhecido: boolean; alertas: string[];
};
export type ItemDose = { nome: string; dose: string; data: string | null; lote: string | null; pagina: number; valida: boolean; alertas: string[] };
export type Previa = {
  envioId: string;
  arquivo: string; // link para abrir o original (/enviados/...)
  tipo: "laudo_exame" | "carteira_vacinacao" | "outro";
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
    pagina: r.pagina, fora: r.fora_da_faixa, reconhecido: r.analito !== "outro" && !!(r.data_coleta ?? dataDoc), alertas: r.alertas,
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
  if (e.tipo_documento === "laudo_exame" && !dataDoc) avisos.push("Não achamos a data da coleta no documento.");
  const ignorados = exames.filter((x) => !x.reconhecido).length + doses.filter((x) => !x.valida).length;
  if (ignorados) avisos.push(`${ignorados} ${ignorados === 1 ? "item não foi reconhecido e fica" : "itens não foram reconhecidos e ficam"} de fora dos gráficos.`);

  const nExames = exames.filter((x) => x.reconhecido).length;
  const nDoses = doses.filter((x) => x.valida).length;
  const podeSalvar =
    (e.tipo_documento === "laudo_exame" && !!dataDoc && nExames > 0) || (e.tipo_documento === "carteira_vacinacao" && nDoses > 0);

  return {
    envioId: envio.id, arquivo: `/${envio.arquivo}`, tipo: e.tipo_documento, emissor: e.documento.laboratorio,
    data: dataDoc, paginas: e.documento.paginas, exames, doses, avisos, podeSalvar, segundos,
  };
}

// ---------------------------------------------------------------- 1) ler (extração + prévia)
export class ErroEnvio extends Error {
  constructor(public codigo: string, mensagem: string, public status = 400) {
    super(mensagem);
  }
}

async function cadastroDoPaciente(): Promise<Cadastro> {
  const [p] = await getServidor<Cadastro[]>(`paciente?id=eq.${PACIENTE_ID}&select=nome,nascimento,sexo`);
  if (!p) throw new ErroEnvio("sem_paciente", "Paciente de demonstração não está no banco.", 500);
  return p;
}

export async function lerExame(arquivo: File): Promise<Previa> {
  if (!envioLigado()) throw new ErroEnvio("desligado", "O envio de exames está desligado no momento.", 503);
  const mime = arquivo.type;
  if (!EXTENSAO[mime]) throw new ErroEnvio("tipo", "Envie um PDF ou uma foto (JPG, PNG ou WebP).");
  if (arquivo.size > TAMANHO_MAX) throw new ErroEnvio("tamanho", "O arquivo passa de 4 MB. Envie um PDF menor ou uma foto.");
  if (arquivo.size === 0) throw new ErroEnvio("vazio", "O arquivo está vazio.");

  const dados = Buffer.from(await arquivo.arrayBuffer());
  const sha256 = createHash("sha256").update(dados).digest("hex");
  const cadastro = await cadastroDoPaciente();

  // Já está no histórico?
  const [jaSalvo] = await getServidor<{ id: string; emissor: string | null; data: string | null }[]>(
    `documento?paciente_id=eq.${PACIENTE_ID}&sha256=eq.${sha256}&select=id,emissor,data`,
  );
  if (jaSalvo) throw new ErroEnvio("repetido", "Este arquivo já está no seu histórico.", 409);

  // Já foi lido e está esperando? Reaproveita a leitura (não paga de novo)
  const [pendente] = await getServidor<Envio[]>(
    `envio?paciente_id=eq.${PACIENTE_ID}&sha256=eq.${sha256}&situacao=eq.pronto&select=*&order=criado_em.desc&limit=1`,
  );
  if (pendente?.extracao) return montarPrevia(pendente, pendente.extracao as ExtracaoNormalizada, cadastro, pendente.uso?.segundos ?? 0);

  // Limite de leituras por hora (cada leitura custa uma chamada à API)
  const desde = new Date(Date.now() - 3600_000).toISOString();
  const recentes = await getServidor<{ id: string }[]>(
    `envio?paciente_id=eq.${PACIENTE_ID}&criado_em=gte.${encodeURIComponent(desde)}&select=id&limit=${limitePorHora()}`,
  );
  if (recentes.length >= limitePorHora()) {
    throw new ErroEnvio("limite", "Muitos envios na última hora. Tente de novo mais tarde.", 429);
  }

  const id = randomUUID();
  const caminho = `enviados/${id}.${EXTENSAO[mime]}`;
  await escreverServidor("POST", "envio", { id, paciente_id: PACIENTE_ID, sha256, arquivo: caminho, mime, situacao: "lendo" });

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

async function envioPronto(id: string): Promise<Envio> {
  if (!UUID.test(id)) throw new ErroEnvio("id", "Envio inválido.");
  const [envio] = await getServidor<Envio[]>(`envio?id=eq.${id}&paciente_id=eq.${PACIENTE_ID}&select=*`);
  if (!envio) throw new ErroEnvio("id", "Envio não encontrado.", 404);
  if (envio.situacao !== "pronto" || !envio.extracao) throw new ErroEnvio("situacao", "Este envio já foi salvo ou descartado.", 409);
  return envio;
}

/** Grava documento + observações a partir da leitura guardada. Devolve o id do documento. */
export async function salvarEnvio(id: string): Promise<{ documentoId: string; exames: number; doses: number }> {
  const envio = await envioPronto(id);
  const e = envio.extracao as ExtracaoNormalizada;
  const previa = montarPrevia(envio, e, await cadastroDoPaciente());
  if (!previa.podeSalvar) throw new ErroEnvio("nada", "Não há resultados reconhecidos para salvar.");

  const documentoId = `envio-${id.slice(0, 8)}`;
  const dataDoc = e.documento.data_coleta;
  const tipo = e.tipo_documento === "carteira_vacinacao" ? "carteira_vacinacao" : "laudo_exame";

  const observacoes =
    tipo === "laudo_exame"
      ? e.resultados
          .filter((r) => r.analito !== "outro" && (r.data_coleta ?? dataDoc))
          .map((r) => ({
            paciente_id: PACIENTE_ID, documento_id: documentoId, categoria: "exame", codigo: r.analito,
            data: r.data_coleta ?? dataDoc,
            nome_impresso: r.nome_impresso, valor_impresso: r.valor_impresso, unidade_impressa: r.unidade_impressa,
            referencia_impressa: r.referencia_impressa || null, pagina: r.pagina,
            valor_canonico: r.valor_canonico, unidade_canonica: r.unidade_canonica, qualificador: r.qualificador,
            resultado_texto: r.resultado_texto, ref_min_canonico: r.ref_min_canonico, ref_max_canonico: r.ref_max_canonico,
            fora_da_faixa: r.fora_da_faixa, confianca: r.confianca, alertas: r.alertas,
          }))
      : e.doses
          .filter((d) => d.vacina !== "outra" && d.data && /^\d{4}-\d{2}-\d{2}$/.test(d.data))
          .map((d) => ({
            paciente_id: PACIENTE_ID, documento_id: documentoId, categoria: "vacina", codigo: d.vacina, data: d.data,
            nome_impresso: d.nome_impresso, valor_impresso: d.dose_impressa, pagina: d.pagina,
            dose: d.dose, lote: d.lote, local: d.local, confianca: d.confianca, alertas: d.alertas,
          }));

  await escreverServidor("POST", "documento", {
    id: documentoId, paciente_id: PACIENTE_ID, tipo,
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
  };
}

export async function descartarEnvio(id: string): Promise<void> {
  const envio = await envioPronto(id);
  await escreverServidor("PATCH", `envio?id=eq.${id}`, { situacao: "descartado" });
  await apagarArquivo(envio.arquivo);
}
