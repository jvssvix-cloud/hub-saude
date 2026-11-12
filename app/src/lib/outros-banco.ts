/**
 * Outros exames (codigo "outro") do paciente da sessão, lidos no servidor (chave secreta). O médico e o MCP não
 * passam por aqui: recebem as mesmas linhas de acessar_historico(token), dentro do escopo (lib/medico.ts).
 */
import "server-only";
import type { OutroResultado } from "@/lib/outros";
import { getServidor, temChaveServidor } from "@/lib/supabase";

const CAMPOS =
  "documento_id,data,nome_impresso,valor_impresso,unidade_impressa,referencia_impressa,resultado_texto,fora_da_faixa,pagina," +
  "documento(emissor,arquivo)";

export async function outrosDoPaciente(pacienteId: string, documentoId?: string): Promise<OutroResultado[]> {
  if (!temChaveServidor()) return [];
  const doc = documentoId ? `&documento_id=eq.${encodeURIComponent(documentoId)}` : "";
  return getServidor<OutroResultado[]>(
    `observacao?paciente_id=eq.${encodeURIComponent(pacienteId)}&categoria=eq.exame&codigo=eq.outro${doc}` +
      `&select=${CAMPOS}&order=data.desc,pagina.asc`,
  ).catch(() => []);
}
