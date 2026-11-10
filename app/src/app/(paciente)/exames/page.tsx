import type { Metadata } from "next";
import { carregarInsights } from "@/lib/dados";
import { dataBr, linkLaudo, serie, type Insights } from "@/lib/insights";

export const metadata: Metadata = { title: "Exames · Hub de Saúde" };

type Laudo = { id: string; arquivo: string; laboratorio: string; data: string; exames: number };

/** Os laudos originais, do mais recente ao mais antigo, montados a partir da origem de cada resultado. */
function laudos(i: Insights): Laudo[] {
  const m = new Map<string, Laudo>();
  for (const s of i.series) {
    for (const p of s.pontos) {
      const l = m.get(p.fonte.laudo_id) ?? { id: p.fonte.laudo_id, arquivo: p.fonte.arquivo, laboratorio: p.fonte.laboratorio, data: p.data, exames: 0 };
      l.exames += 1;
      m.set(l.id, l);
    }
  }
  return [...m.values()].sort((a, b) => b.data.localeCompare(a.data));
}

const nomeCurto = (lab: string) =>
  lab.toLowerCase().replace(/(^|\s)(\p{L})/gu, (_, e, c) => e + c.toUpperCase()).replace(/ De | Da | Do /g, (x) => x.toLowerCase());

export default async function Exames() {
  const insights = await carregarInsights();
  const lista = laudos(insights);

  return (
    <div className="space-y-7 pt-3">
      <section>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">Exames</h1>
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
        {lista.map((l) => (
          <li key={l.id}>
            <a href={linkLaudo({ arquivo: l.arquivo, pagina: 1 })} target="_blank" className="flex items-center gap-3 px-4 py-3 hover:bg-fundo">
              <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-2xl bg-marca-fundo text-marca">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 3h7l4 4v14H7z" />
                  <path d="M14 3v4h4" />
                </svg>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{dataBr(l.data)}</span>
                <span className="block truncate text-[13px] text-suave">
                  {nomeCurto(l.laboratorio)} · {l.exames} resultados
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold text-marca">Abrir ↗</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
