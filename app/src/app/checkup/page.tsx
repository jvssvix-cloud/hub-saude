import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { sair } from "@/app/entrar/acoes";
import { Logo } from "@/components/Logo";
import { BLOCOS, BLOCOS_OPCIONAIS, TOTAL_BLOCOS } from "@/lib/checkup";
import { contaAtual } from "@/lib/sessao";
import { getServidor } from "@/lib/supabase";
import type { PerfilSaude } from "../../../../lib/types";
import { salvarBloco } from "./acoes";
import { Campos, type Cadastro } from "./Campos";
import { FormBloco } from "./FormBloco";

export const metadata: Metadata = { title: "Check-up inicial · Zelo" };

/** Check-up inicial: um bloco por tela, com barra de progresso. Quem não concluiu é trazido para cá ao entrar. */
export default function Checkup({ searchParams }: PageProps<"/checkup">) {
  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-6">
      <Logo className="h-8 w-auto" />
      <Suspense fallback={<p className="mt-8 text-sm text-suave">Carregando…</p>}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Conteudo({ searchParams }: { searchParams: PageProps<"/checkup">["searchParams"] }) {
  const conta = await contaAtual();
  if (conta.concluido) redirect("/");
  const pid = conta.paciente ? encodeURIComponent(conta.paciente.id) : null;
  const [[cad], [perfil]] = pid
    ? await Promise.all([
        getServidor<Cadastro[]>(`paciente?id=eq.${pid}&select=nome,nascimento,sexo,telefone`),
        getServidor<PerfilSaude[]>(`perfil_saude?paciente_id=eq.${pid}&select=*`),
      ])
    : [[], []];

  // até onde pode ir: sem cadastro, só o bloco 1; sem altura e peso, até o 2
  const max = !cad || !perfil ? 1 : !perfil.altura_cm || !perfil.peso_kg ? 2 : TOTAL_BLOCOS;
  const pedido = Number((await searchParams).bloco);
  const n = Number.isInteger(pedido) && pedido >= 1 && pedido <= max ? pedido : max === TOTAL_BLOCOS ? 3 : max;
  const bloco = BLOCOS[n - 1];

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between text-xs font-semibold text-suave">
        <span>
          Passo {n} de {TOTAL_BLOCOS}
        </span>
        {BLOCOS_OPCIONAIS.has(n) && <span>opcional</span>}
      </div>
      <div className="mt-2 flex gap-1" aria-hidden>
        {BLOCOS.map((b) => (
          <span key={b.n} className={`h-1.5 flex-1 rounded-full ${b.n <= n ? "bg-marca" : "bg-bege"}`} />
        ))}
      </div>

      <h1 className="mt-6 text-[28px] font-bold leading-tight tracking-tight">{bloco.titulo}</h1>
      <p className="mt-1 text-[15px] text-suave">{bloco.sub}</p>

      <div className="mt-6">
        <FormBloco
          key={n}
          acao={salvarBloco.bind(null, "checkup", n)}
          n={n}
          opcional={BLOCOS_OPCIONAIS.has(n)}
          ultimo={n === TOTAL_BLOCOS}
        >
          <Campos n={n} cad={cad ?? null} perfil={perfil ?? null} email={conta.usuario.email} />
        </FormBloco>
      </div>

      <form action={sair} className="mt-10 text-center">
        <button type="submit" className="text-sm text-suave hover:text-tinta">
          Sair e continuar depois
        </button>
      </form>
    </div>
  );
}
