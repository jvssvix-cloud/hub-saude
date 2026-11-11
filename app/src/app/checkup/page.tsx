import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { sair } from "@/app/entrar/acoes";
import { pacienteDaSessao, usuarioAtual } from "@/lib/sessao";

export const metadata: Metadata = { title: "Check-up inicial · Zelo" };

/**
 * Check-up inicial: quem tem conta mas ainda não tem paciente cai aqui (pacienteAtual() redireciona).
 * Fatia 1 (conta + sessão): só a casca. Os blocos do questionário entram na fatia do check-up.
 */
export default function Checkup() {
  return (
    <main className="mx-auto max-w-sm px-4 py-10">
      <Suspense fallback={<p className="text-sm text-suave">Carregando…</p>}>
        <Conteudo />
      </Suspense>
    </main>
  );
}

async function Conteudo() {
  const u = await usuarioAtual();
  if (!u) redirect("/entrar");
  if (await pacienteDaSessao()) redirect("/");

  return (
    <div className="space-y-4">
      <p className="text-sm text-suave">{u.email}</p>
      <h1 className="text-[28px] font-bold leading-tight tracking-tight">Check-up inicial</h1>
      <p className="text-[15px] text-suave">
        Sua conta foi criada. O questionário com os seus dados básicos está chegando: é por ele que o app passa a ser seu.
      </p>
      <form action={sair}>
        <button type="submit" className="text-sm font-semibold text-marca hover:underline">
          Sair
        </button>
      </form>
    </div>
  );
}
