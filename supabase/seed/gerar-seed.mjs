// Gera supabase/seed.sql a partir do gabarito do gerador de laudos (persona Roberto).
// Assim o app, a visão do médico, a API e o MCP têm o histórico completo desde o 1º dia,
// sem depender da extração. Determinístico; sem dependências.
//
//   node supabase/seed/gerar-seed.mjs
//
// O Supabase CLI roda supabase/seed.sql sozinho no `supabase db reset`.
// No Supabase na nuvem: cole o arquivo no SQL Editor (depois da migration).
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SAIDA = path.join(RAIZ, "tools/gerador-laudos/saida");
const ler = (p) => JSON.parse(readFileSync(p, "utf-8"));

const q = (v) => {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (Array.isArray(v)) return v.length ? `array[${v.map(q).join(", ")}]` : "'{}'::text[]";
  return `'${String(v).replace(/'/g, "''")}'`;
};
const linha = (vals) => `  (${vals.map(q).join(", ")})`;

const persona = ler(path.join(SAIDA, "persona.json"));
const PID = persona.id;

const documentos = [];
const observacoes = [];

// Laudos (os "caso-*" são de outra paciente fictícia, só para testar a extração)
const dirLaudos = path.join(SAIDA, "gabarito");
for (const f of readdirSync(dirLaudos).filter((f) => f.endsWith(".json") && !f.startsWith("caso-")).sort()) {
  const g = ler(path.join(dirLaudos, f));
  documentos.push([g.laudo_id, PID, "laudo_exame", "seed", g.documento.laboratorio, g.documento.data_coleta,
    g.arquivo_pdf, g.documento.paginas ?? null]);
  for (const r of g.resultados) {
    observacoes.push([PID, g.laudo_id, "exame", r.analito, r.data_coleta ?? g.documento.data_coleta,
      r.nome_impresso, r.valor_impresso, r.unidade_impressa, r.referencia_impressa ?? null, r.pagina,
      r.valor_canonico ?? null, r.unidade_canonica ?? null, r.qualificador ?? null, r.resultado_texto ?? null,
      r.ref_min_canonico ?? null, r.ref_max_canonico ?? null, r.fora_da_faixa,
      null, null, null, "alta"]);
  }
}

// Carteiras de vacinação
const dirVac = path.join(SAIDA, "gabarito_vacinas");
for (const f of readdirSync(dirVac).filter((f) => f.endsWith(".json")).sort()) {
  const g = ler(path.join(dirVac, f));
  documentos.push([g.documento_id, PID, "carteira_vacinacao", "seed", g.documento.emissor ?? null, null,
    g.arquivo_pdf, g.documento.paginas ?? null]);
  for (const d of g.doses) {
    observacoes.push([PID, g.documento_id, "vacina", d.vacina, d.data,
      d.nome_impresso, d.dose_impressa ?? null, null, null, d.pagina,
      null, null, null, null, null, null, false,
      d.dose, d.lote ?? null, d.local ?? null, "alta"]);
  }
}

const sql = `-- GERADO por supabase/seed/gerar-seed.mjs a partir de tools/gerador-laudos/saida. Não edite à mão.
-- Persona sintética: ${persona.nome}. ${documentos.length} documentos, ${observacoes.length} observações.

delete from paciente where id = ${q(PID)};  -- cascade: documentos, observações, consentimentos, logs

insert into paciente (id, nome, nascimento, sexo) values
${linha([PID, persona.nome, persona.nascimento, persona.sexo])};

insert into documento (id, paciente_id, tipo, origem, emissor, data, arquivo, paginas) values
${documentos.map(linha).join(",\n")};

insert into observacao (paciente_id, documento_id, categoria, codigo, data,
  nome_impresso, valor_impresso, unidade_impressa, referencia_impressa, pagina,
  valor_canonico, unidade_canonica, qualificador, resultado_texto,
  ref_min_canonico, ref_max_canonico, fora_da_faixa,
  dose, lote, local, confianca) values
${observacoes.map(linha).join(",\n")};
`;

const destino = path.join(RAIZ, "supabase/seed.sql");
writeFileSync(destino, sql);
console.log(`seed.sql: ${documentos.length} documentos, ${observacoes.length} observações -> ${path.relative(RAIZ, destino)}`);
