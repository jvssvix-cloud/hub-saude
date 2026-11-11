"use server";
/**
 * Entrar, criar conta, entrar na demonstração e sair. A sessão fica no cookie httpOnly (lib/sessao.ts).
 * Depois de entrar: quem já tem paciente vai para o Início; quem não tem, para o check-up (o proxy e
 * pacienteAtual() fazem esse desvio).
 */
import { redirect } from "next/navigation";
import { clienteAuth } from "@/lib/sessao";

export type EstadoEntrar = { erro?: string; email?: string };

const SENHA_MIN = 8;

function mensagem(codigo: string | undefined): string {
  switch (codigo) {
    case "invalid_credentials":
      return "E-mail ou senha não conferem.";
    case "user_already_exists":
    case "email_exists":
      return "Já existe uma conta com este e-mail. Entre com a sua senha.";
    case "weak_password":
      return `Senha fraca: use pelo menos ${SENHA_MIN} caracteres, misturando letras e números.`;
    case "email_address_invalid":
      return "Confira o e-mail.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Muitas tentativas seguidas. Espere um minuto e tente de novo.";
    case "email_not_confirmed":
      return "Confirme o e-mail antes de entrar.";
    default:
      return "Não conseguimos entrar agora. Tente de novo.";
  }
}

function lerCampos(form: FormData) {
  return {
    email: String(form.get("email") ?? "").trim().toLowerCase(),
    senha: String(form.get("senha") ?? ""),
  };
}

export async function entrar(_: EstadoEntrar, form: FormData): Promise<EstadoEntrar> {
  const { email, senha } = lerCampos(form);
  if (!email || !senha) return { erro: "Preencha e-mail e senha.", email };
  const sb = await clienteAuth();
  const { error } = await sb.auth.signInWithPassword({ email, password: senha });
  if (error) return { erro: mensagem(error.code), email };
  redirect("/");
}

export async function criarConta(_: EstadoEntrar, form: FormData): Promise<EstadoEntrar> {
  const { email, senha } = lerCampos(form);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { erro: "Confira o e-mail.", email };
  if (senha.length < SENHA_MIN) return { erro: `A senha precisa de pelo menos ${SENHA_MIN} caracteres.`, email };
  const sb = await clienteAuth();
  const { data, error } = await sb.auth.signUp({ email, password: senha });
  if (error) return { erro: mensagem(error.code), email };
  // Com a confirmação de e-mail ligada no Supabase não vem sessão: avisa em vez de fingir que entrou.
  if (!data.session) return { erro: "Conta criada. Abra o e-mail de confirmação e depois entre aqui.", email };
  redirect("/checkup");
}

/** Conta de demonstração (Roberto). E-mail e senha só nas variáveis de ambiente DEMO_EMAIL e DEMO_SENHA. */
export async function entrarDemonstracao(): Promise<EstadoEntrar> {
  const email = process.env.DEMO_EMAIL;
  const senha = process.env.DEMO_SENHA;
  if (!email || !senha) return { erro: "A demonstração não está configurada neste ambiente." };
  const sb = await clienteAuth();
  const { error } = await sb.auth.signInWithPassword({ email, password: senha });
  if (error) {
    console.error("[entrar] demonstração:", error.code ?? error.message);
    return { erro: "Não conseguimos abrir a demonstração agora. Tente de novo." };
  }
  redirect("/");
}

export async function sair() {
  const sb = await clienteAuth();
  await sb.auth.signOut();
  redirect("/entrar");
}
