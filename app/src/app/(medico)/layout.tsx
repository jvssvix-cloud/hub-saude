import Link from "next/link";
import { Logo } from "@/components/Logo";

/** Área do médico: tela larga (desktop), densa e técnica. Sem login: todo acesso passa pelo token do consentimento. */
export default function LayoutMedico({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-linha bg-fundo">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
          <Link href="/medico" className="flex items-center gap-2 text-[15px]" aria-label="Zelo para médicos">
            <Logo />
            <span className="font-medium text-suave">· médico</span>
          </Link>
          <span className="text-xs text-suave">Acesso só com autorização do paciente · cada leitura é registrada</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-16 pt-6">{children}</main>
    </>
  );
}
