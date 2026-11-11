import Link from "next/link";

/**
 * Estado vazio de quem ainda não enviou exames: explica o que acontece e leva ao envio.
 * "completo" (Início) mostra os 3 passos; "curto" (Exames, Evolução, Documentos) só a frase e o botão.
 */
export function SemExames({ variante = "curto", texto }: { variante?: "completo" | "curto"; texto?: string }) {
  return (
    <section className="rounded-3xl border border-linha bg-cartao p-5">
      <span aria-hidden className="grid size-12 place-items-center rounded-2xl bg-marca-fundo text-marca">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 3h7l4 4v14H7z" />
          <path d="M14 3v4h4" />
          <path d="M12.5 11v6M9.5 14h6" />
        </svg>
      </span>
      <h2 className="mt-3 text-lg font-bold tracking-tight">Você ainda não tem exames aqui</h2>
      <p className="mt-1 text-[15px] text-suave">
        {texto ??
          "Envie o PDF ou uma foto do seu último check-up. O Zelo lê os resultados e monta a evolução de cada exame."}
      </p>
      {variante === "completo" && (
        <ol className="mt-4 space-y-2.5 text-[15px]">
          {[
            ["Envie", "PDF do laboratório ou foto do laudo, de qualquer ano."],
            ["Confira", "Você vê o que foi lido antes de salvar. Nada entra sem a sua conferência."],
            ["Acompanhe", "Cada exame vira uma curva, com a faixa de referência e o documento de origem."],
          ].map(([t, d], k) => (
            <li key={t} className="flex gap-3">
              <span className="num grid size-6 shrink-0 place-items-center rounded-full bg-marca-fundo text-xs font-bold text-marca">{k + 1}</span>
              <span>
                <span className="font-semibold">{t}.</span> <span className="text-suave">{d}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
      <Link
        href="/enviar"
        className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-marca px-4 py-2.5 text-sm font-semibold text-white hover:bg-marca-hover"
      >
        <span aria-hidden>+</span> Enviar meu primeiro exame
      </Link>
    </section>
  );
}
