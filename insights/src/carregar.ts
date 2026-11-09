/**
 * De onde vêm os laudos. Hoje: arquivos JSON do gerador (mesmo formato da extração).
 * Quando o banco existir, basta trocar esta função por uma consulta às tabelas.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Laudo, Paciente } from "./tipos";

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SAIDA_GERADOR = path.join(RAIZ, "tools/gerador-laudos/saida");

export function carregarDoGabarito(): { laudos: Laudo[]; paciente: Paciente } {
  const dir = path.join(SAIDA_GERADOR, "gabarito");
  const laudos: Laudo[] = readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => {
    const g = JSON.parse(readFileSync(path.join(dir, f), "utf-8"));
    return {
      id: g.laudo_id,
      arquivo: g.arquivo_pdf,
      laboratorio: g.documento.laboratorio,
      data_coleta: g.documento.data_coleta,
      resultados: g.resultados,
    };
  });
  const p = JSON.parse(readFileSync(path.join(SAIDA_GERADOR, "persona.json"), "utf-8"));
  return { laudos, paciente: { nome: p.nome, nascimento: p.nascimento, sexo: p.sexo } };
}
