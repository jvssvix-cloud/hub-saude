import Link from "next/link";
import { Suspense } from "react";
import { NavPaciente } from "@/components/NavPaciente";
import { pacienteDaSessao } from "@/lib/sessao";

/** Área do paciente: coluna estreita (feita para o celular), linguagem simples, navegação embaixo. */
export default function LayoutPaciente({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-10 bg-fundo/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 text-[15px] font-bold tracking-tight text-marca">
            <span aria-hidden className="grid size-7 place-items-center rounded-full bg-marca-fundo">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            hub saúde
          </Link>
          <Suspense fallback={<NavPaciente variante="topo" caminho="" />}>
            <NavPaciente variante="topo" />
          </Suspense>
          <Suspense fallback={<span aria-hidden className={AVATAR} />}>
            <Avatar />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 pb-28 pt-2 sm:pb-16">{children}</main>
      <Suspense fallback={<NavPaciente variante="barra" caminho="" />}>
        <NavPaciente variante="barra" />
      </Suspense>
    </>
  );
}

const AVATAR = "grid size-8 place-items-center rounded-full bg-bege text-sm font-semibold text-marca sm:hidden";

/** Inicial do paciente da sessão (só no celular; leva para Mais, onde fica o "Sair"). */
async function Avatar() {
  const p = await pacienteDaSessao();
  if (!p) return <span aria-hidden className={AVATAR} />;
  return (
    <Link href="/mais" aria-label={`${p.nome.split(" ")[0]}: conta`} className={AVATAR}>
      {p.nome.trim().charAt(0).toUpperCase()}
    </Link>
  );
}
