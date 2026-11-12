/**
 * Outros exames: resultados FORA do dicionário da extração (observacao.codigo = "outro"), como urina tipo 1, sódio,
 * potássio, ureia, PCR e VHS. Ficam guardados com o valor, a unidade e a referência IMPRESSOS no laudo, com a fonte
 * (laudo e página), mas sem gráfico e sem regra: a unidade e a faixa não são padronizadas entre laboratórios.
 *
 * O mesmo exame em laudos diferentes é juntado pela chave do nome (chaveNomeOutro, a mesma do teste de acurácia).
 */
import { chaveNomeOutro } from "@extraction/normalizar";
import { dataBr } from "@/lib/insights";

export type OutroResultado = {
  documento_id: string;
  data: string;
  nome_impresso: string | null;
  valor_impresso: string | null;
  unidade_impressa: string | null;
  referencia_impressa: string | null;
  resultado_texto: string | null;
  fora_da_faixa: boolean;
  pagina: number | null;
  /** do documento de origem (embed do PostgREST ou montado a partir de acessar_historico) */
  documento: { emissor: string | null; arquivo: string | null } | null;
};

export type GrupoOutro = {
  chave: string;
  nome: string;
  ultimo: OutroResultado;
  /** do mais novo para o mais antigo */
  medicoes: OutroResultado[];
};

/** Junta por exame (nome normalizado), o grupo com o resultado mais recente primeiro; grupos em ordem alfabética. */
export function agruparOutros(lista: OutroResultado[]): GrupoOutro[] {
  const m = new Map<string, OutroResultado[]>();
  for (const o of lista) {
    const k = chaveNomeOutro(o.nome_impresso ?? "") || "sem nome";
    m.set(k, [...(m.get(k) ?? []), o]);
  }
  return [...m.entries()]
    .map(([chave, l]) => {
      const medicoes = [...l].sort((a, b) => b.data.localeCompare(a.data));
      return { chave, nome: (medicoes[0].nome_impresso ?? chave).trim(), ultimo: medicoes[0], medicoes };
    })
    .sort((a, b) => a.chave.localeCompare(b.chave));
}

export const valorOutro = (o: OutroResultado) =>
  [o.valor_impresso ?? o.resultado_texto ?? "", o.unidade_impressa ?? ""].filter(Boolean).join(" ");

/** Texto para um modelo de IA (chat e MCP): cada exame com as medições, a referência impressa e a fonte. */
export function outrosEmTexto(lista: OutroResultado[]): string {
  if (!lista.length) return "Nenhum exame fora da lista padronizada no histórico.";
  return agruparOutros(lista)
    .map((g) => {
      const med = g.medicoes
        .map((o) => {
          const fonte = [o.documento?.emissor, o.pagina ? `p. ${o.pagina}` : null].filter(Boolean).join(", ");
          return `${valorOutro(o)} em ${dataBr(o.data)}${o.fora_da_faixa ? " (FORA DA FAIXA)" : ""}${fonte ? ` · fonte: ${fonte}` : ""}`;
        })
        .join("; ");
      const ref = g.ultimo.referencia_impressa ? ` (referência impressa no último laudo: ${g.ultimo.referencia_impressa.replace(/\n/g, " / ")})` : "";
      return `- ${g.nome}: ${med}${ref}`;
    })
    .join("\n");
}
