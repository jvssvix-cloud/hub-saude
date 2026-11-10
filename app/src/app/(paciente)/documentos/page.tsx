import type { Metadata } from "next";
import Link from "next/link";
import { carregarInsights } from "@/lib/dados";
import { laudos, nomeLab } from "@/lib/documentos";
import { dataBr, serie } from "@/lib/insights";

export const metadata: Metadata = { title: "Documentos · Hub de Saúde" };

/** Os laudos originais, do mais recente ao mais antigo. Cada um abre a lista dos resultados que saíram dele. */
export default async function Documentos() {
  const insights = await carregarInsights();
  const lista = laudos(insights);

  return (
    <div className="space-y-6 pt-3">
      <Link href="/exames" className="text-sm font-semibold text-marca hover:underline">
        ‹ Exames
      </Link>
      <section>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">Documentos</h1>
        <p className="mt-1 text-[15px] text-suave">
          {lista.length} laudos de {insights.periodo.laboratorios.length} laboratórios. Cada número do app vem de um deles.
        </p>
      </section>

      {insights.repeticoes.map((r) => (
        <section key={r.de.laudo_id + r.para.laudo_id} className="rounded-3xl bg-bege p-4">
          <p className="font-semibold">Exames feitos duas vezes</p>
          <p className="mt-1 text-sm text-suave">
            {r.analitos.map((a) => serie(insights, a)?.nome ?? a).join(", ")} foram refeitos {r.dias} dias depois, em outro
            laboratório. Com tudo num lugar só, o médico teria visto o anterior.
          </p>
        </section>
      ))}

      <ul className="divide-y divide-linha overflow-hidden rounded-3xl border border-linha bg-cartao">
        {lista.map((l) => {
          const fora = l.resultados.filter((r) => r.fora).length;
          return (
            <li key={l.id}>
              <Link href={`/documentos/${l.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-fundo">
                <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-2xl bg-marca-fundo text-marca">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 3h7l4 4v14H7z" />
                    <path d="M14 3v4h4" />
                  </svg>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{dataBr(l.data)}</span>
                  <span className="block truncate text-[13px] text-suave">
                    {nomeLab(l.laboratorio)} · {l.resultados.length} resultados
                    {fora > 0 && <span className="text-atencao"> · {fora} fora</span>}
                  </span>
                </span>
                <span aria-hidden className="text-suave">›</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
