/**
 * Leitura do perfil de saúde (check-up) no servidor. SÓ SERVIDOR (chave secreta).
 * Quem chama passa um id que veio da sessão (pacienteAtual / pacienteDaSessao), nunca do navegador.
 */
import "server-only";
import type { CadastroBasico, PerfilSaudeLeitura } from "@/lib/checkup";
import { pacienteAtual } from "@/lib/sessao";
import { getServidor, temChaveServidor } from "@/lib/supabase";

export type PerfilCompleto = { cad: CadastroBasico; perfil: PerfilSaudeLeitura };

export async function perfilDoPaciente(pacienteId: string): Promise<PerfilCompleto | null> {
  if (!temChaveServidor()) return null;
  const pid = encodeURIComponent(pacienteId);
  const [[cad], [perfil]] = await Promise.all([
    getServidor<CadastroBasico[]>(`paciente?id=eq.${pid}&select=nome,nascimento,sexo,telefone`),
    getServidor<PerfilSaudeLeitura[]>(`perfil_saude?paciente_id=eq.${pid}&select=*`),
  ]);
  return cad && perfil ? { cad, perfil } : null;
}

/** Perfil do paciente logado (sem sessão -> /entrar; sem check-up -> /checkup). */
export async function meuPerfil(): Promise<PerfilCompleto | null> {
  return perfilDoPaciente((await pacienteAtual()).id);
}
