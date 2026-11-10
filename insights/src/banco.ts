/**
 * Mesma entrada do carregar.ts (laudos, paciente, doses de vacina), mas lida do banco (Supabase).
 * Usa a API REST do Supabase com a chave secreta (service_role): só pode rodar no servidor.
 * Sem dependências (fetch puro) para servir ao app (Next.js) e aos scripts (tsx).
 */
import type { Laudo, Paciente, Resultado } from "./tipos";
import type { DoseVacina } from "./vacinas";

export type Conexao = { url: string; chave: string };

/** Paciente de demonstração do MVP (sem login). */
export const PACIENTE_DEMO = "persona-roberto";

export type LinhaDocumento = {
  id: string; tipo: string; emissor: string | null; data: string | null; arquivo: string | null;
};
export type LinhaObservacao = {
  documento_id: string; categoria: string; codigo: string; data: string;
  nome_impresso: string | null; valor_impresso: string | null; unidade_impressa: string | null;
  referencia_impressa: string | null; pagina: number | null;
  valor_canonico: number | string | null; unidade_canonica: string | null;
  qualificador: string | null; resultado_texto: string | null;
  ref_min_canonico: number | string | null; ref_max_canonico: number | string | null;
  fora_da_faixa: boolean; dose: string | null; lote: string | null; local: string | null;
};

async function get<T>(c: Conexao, caminho: string): Promise<T> {
  const r = await fetch(`${c.url}/rest/v1/${caminho}`, {
    headers: { apikey: c.chave, Authorization: `Bearer ${c.chave}` },
  });
  if (!r.ok) throw new Error(`Supabase ${r.status} em ${caminho.split("?")[0]}: ${(await r.text()).slice(0, 200)}`);
  return r.json() as Promise<T>;
}

/** numeric do Postgres pode chegar como texto: devolve sempre número (ou null). */
const num = (v: number | string | null) => (v === null ? null : Number(v));

export async function carregarDoBanco(c: Conexao, pacienteId = PACIENTE_DEMO): Promise<{
  laudos: Laudo[]; paciente: Paciente; doses: DoseVacina[];
}> {
  const pid = encodeURIComponent(pacienteId);
  const [pacientes, documentos, observacoes] = await Promise.all([
    get<Paciente[]>(c, `paciente?id=eq.${pid}&select=nome,nascimento,sexo`),
    get<LinhaDocumento[]>(c, `documento?paciente_id=eq.${pid}&select=id,tipo,emissor,data,arquivo&order=id`),
    // limite explícito: o padrão da API corta em 1000 linhas
    get<LinhaObservacao[]>(c, `observacao?paciente_id=eq.${pid}&categoria=in.(exame,vacina)&select=*&order=id&limit=10000`),
  ]);
  if (!pacientes[0]) throw new Error(`paciente ${pacienteId} não está no banco`);
  return { ...montarEntrada(documentos, observacoes), paciente: pacientes[0] };
}

/**
 * Linhas do banco (documento + observacao) -> entrada das regras (laudos + doses).
 * Exportada à parte porque a visão do médico recebe essas mesmas linhas de acessar_historico(token).
 */
export function montarEntrada(documentos: LinhaDocumento[], observacoes: LinhaObservacao[]): {
  laudos: Laudo[]; doses: DoseVacina[];
} {
  const docs = new Map(documentos.map((d) => [d.id, d]));
  const laudos = new Map<string, Laudo>();
  for (const d of documentos) {
    if (d.tipo !== "laudo_exame" || !d.data) continue;
    laudos.set(d.id, { id: d.id, arquivo: d.arquivo ?? "", laboratorio: d.emissor ?? "", data_coleta: d.data, resultados: [] });
  }

  const doses: DoseVacina[] = [];
  for (const o of observacoes) {
    if (o.categoria === "exame") {
      const l = laudos.get(o.documento_id);
      if (!l) continue;
      const r: Resultado = {
        analito: o.codigo,
        nome_impresso: o.nome_impresso ?? "",
        valor_impresso: o.valor_impresso ?? "",
        unidade_impressa: o.unidade_impressa ?? "",
        valor_canonico: num(o.valor_canonico),
        unidade_canonica: o.unidade_canonica,
        referencia_impressa: o.referencia_impressa ?? "",
        ref_min_canonico: num(o.ref_min_canonico),
        ref_max_canonico: num(o.ref_max_canonico),
        fora_da_faixa: o.fora_da_faixa,
        pagina: o.pagina ?? 1,
        qualificador: o.qualificador,
        resultado_texto: o.resultado_texto,
        data_coleta: o.data,
      };
      l.resultados.push(r);
    } else {
      const d = docs.get(o.documento_id);
      doses.push({
        vacina: o.codigo, dose: o.dose ?? "outra", data: o.data, lote: o.lote, local: o.local,
        fontes: [{ documento_id: o.documento_id, arquivo: d?.arquivo ?? "", pagina: o.pagina ?? 1 }],
      });
    }
  }
  return { laudos: [...laudos.values()], doses };
}

/** Conexão a partir das variáveis de ambiente; null se faltar a chave secreta (aí quem chama usa o JSON). */
export function conexaoDoAmbiente(): Conexao | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && chave ? { url, chave } : null;
}
