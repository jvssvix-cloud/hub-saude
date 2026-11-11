import type { Metadata } from "next";
import Link from "next/link";
import { FormEntrar } from "./FormEntrar";

export const metadata: Metadata = { title: "Entrar · Hub de Saúde" };

/** Entrada do paciente. O médico não passa por aqui: pede acesso pelo telefone em /medico. */
export default function Entrar() {
  const demo = !!process.env.DEMO_EMAIL && !!process.env.DEMO_SENHA;
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-4px)] max-w-sm flex-col justify-center px-4 py-10">
      <div className="mb-7 flex items-center gap-2 text-[15px] font-bold tracking-tight text-marca">
        <span aria-hidden className="grid size-8 place-items-center rounded-full bg-marca-fundo">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
        hub saúde
      </div>
      <h1 className="text-[28px] font-bold leading-tight tracking-tight">Seu histórico de saúde num lugar só</h1>
      <p className="mt-2 text-[15px] text-suave">Exames de anos, dados do relógio e o seu médico vendo só o que você autorizar.</p>

      <FormEntrar demo={demo} />

      <p className="mt-8 text-center text-sm text-suave">
        É médico ou secretária?{" "}
        <Link href="/medico" className="font-semibold text-marca hover:underline">
          Pedir acesso a um paciente
        </Link>
      </p>
    </main>
  );
}
