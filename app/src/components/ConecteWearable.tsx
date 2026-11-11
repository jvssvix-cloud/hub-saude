import Link from "next/link";

/**
 * Convite "Conecte seu wearable" onde o app mostraria dados do relógio (sono, batimento, passos) e o paciente ainda não
 * tem. Leva para /relogio/conectar, que explica a conexão. A conexão de verdade (Apple Saúde, Health Connect) é do app
 * do Zelo para celular; na web é só a apresentação.
 */
export function ConecteWearable({ variante = "cartao" }: { variante?: "cartao" | "linha" }) {
  if (variante === "linha") {
    return (
      <Link href="/relogio/conectar" className="flex items-center gap-3 px-4 py-3.5 hover:bg-fundo">
        <IconeRelogio />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Coração e sono · relógio</span>
          <span className="block text-[13px] text-suave">Conecte seu wearable para ver batimento, sono e passos</span>
        </span>
        <span className="shrink-0 text-sm font-semibold text-marca">Conectar ›</span>
      </Link>
    );
  }
  return (
    <Link
      href="/relogio/conectar"
      className="flex items-center gap-4 rounded-3xl border border-dashed border-salvia bg-marca-fundo/50 p-4 transition-colors hover:bg-marca-fundo sm:p-5"
    >
      <IconeRelogio grande />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold uppercase tracking-wider text-marca">Conecte seu wearable</span>
        <span className="mt-0.5 block font-bold leading-snug">Sono, batimento e passos ao lado dos seus exames</span>
        <span className="mt-0.5 block text-sm text-suave">Apple Saúde, Health Connect e relógios compatíveis.</span>
      </span>
      <span aria-hidden className="text-xl text-marca">›</span>
    </Link>
  );
}

export function IconeRelogio({ grande = false }: { grande?: boolean }) {
  const t = grande ? "size-12 rounded-2xl" : "size-10 rounded-2xl";
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center bg-cartao text-marca ${t}`}>
      <svg width={grande ? 22 : 18} height={grande ? 22 : 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="6" y="6" width="12" height="12" rx="3" />
        <path d="M9 6V3h6v3M9 18v3h6v-3" />
        <path d="M8.5 12h2l1-2 1.5 4 1-2h1.5" />
      </svg>
    </span>
  );
}
