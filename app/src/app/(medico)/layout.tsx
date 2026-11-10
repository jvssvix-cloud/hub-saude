import Link from "next/link";

/** Área do médico: tela larga (desktop), densa e técnica. Sem login: todo acesso passa pelo token do consentimento. */
export default function LayoutMedico({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-linha bg-fundo">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
          <Link href="/medico" className="flex items-center gap-2 text-[15px] font-bold tracking-tight text-marca">
            <span aria-hidden className="grid size-7 place-items-center rounded-full bg-marca-fundo">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            hub saúde <span className="font-medium text-suave">· médico</span>
          </Link>
          <span className="text-xs text-suave">Acesso só com autorização do paciente · cada leitura é registrada</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 pb-16 pt-6">{children}</main>
    </>
  );
}
