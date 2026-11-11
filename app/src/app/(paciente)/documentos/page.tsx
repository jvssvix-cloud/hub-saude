import type { Metadata } from "next";
import Link from "next/link";
import { carregarInsights } from "@/lib/dados";
import { laudos, nomeLab } from "@/lib/documentos";
import { dataBr, serie } from "@/lib/insights";

export const metadata: Metadata = { title: "Documentos · Hub de Saúde" };

/** Os documentos originais por categoria (exames de laboratório, vacinação). Cada laudo abre a lista dos resultados que saíram dele. */
export default async function Documentos() {
  const insights = await carregarInsights();
  const lista = laudos(insights);
  // carteiras e comprovantes de vacinação: um por arquivo de origem das doses
  const porArquivo = new Map<string, { arquivo: string; doses: number; de: string; ate: string }>();
  for (const d of insights.vacinacao?.doses ?? []) {
    for (const f of d.fontes) {
      const v = porArquivo.get(f.arquivo) ?? { arquivo: f.arquivo, doses: 0, de: d.data, ate: d.data };
      porArquivo.set(f.arquivo, { ...v, doses: v.doses + 1, de: d.data < v.de ? d.data : v.de, ate: d.data > v.ate ? d.data : v.ate });
    }
  }
  const vacinas = [...porArquivo.values()].sort((a, b) => b.ate.localeCompare(a.ate));
  const pendentes = (insights.vacinacao?.situacao ?? []).filter((v) => v.status === "atencao");
  const categorias = [
    { id: "exames", nome: "Exames de laboratório", n: lista.length },
    { id: "vacinacao", nome: "Vacinação", n: vacinas.length },
  ].filter((c) => c.n > 0);

  return (
    <div className="space-y-6 pt-3">
      <Link href="/exames" className="text-sm font-semibold text-marca hover:underline">
        ‹ Exames
      </Link>
      <section>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">Documentos</h1>
        <p className="mt-1 text-[15px] text-suave">
          {lista.length + vacinas.length} documentos originais. Cada número do app vem de um deles.
        </p>
        <nav aria-label="Categorias" className="mt-3 flex flex-wrap gap-2">
          {categorias.map((c) => (
            <a
              key={c.id}
              href={`#${c.id}`}
              className="rounded-full border border-linha bg-cartao px-3.5 py-1.5 text-sm font-semibold hover:bg-bege"
            >
              {c.nome} <span className="num font-normal text-suave">{c.n}</span>
            </a>
          ))}
        </nav>
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

      <section id="exames" className="scroll-mt-20">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-suave">
          Exames de laboratório · {insights.periodo.laboratorios.length} laboratórios
        </h2>
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
      </section>

      {vacinas.length > 0 && (
        <section id="vacinacao" className="scroll-mt-20">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-suave">Vacinação</h2>
          <ul className="divide-y divide-linha overflow-hidden rounded-3xl border border-linha bg-cartao">
            {vacinas.map((v) => (
              <li key={v.arquivo}>
                <a href={`/${v.arquivo}`} target="_blank" className="flex items-center gap-3 px-4 py-3 hover:bg-fundo">
                  <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-2xl bg-marca-fundo text-marca">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 3h7l4 4v14H7z" />
                      <path d="M14 3v4h4" />
                      <path d="M12.5 11v6M9.5 14h6" />
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{/caderneta/.test(v.arquivo) ? "Carteira de vacinação" : "Comprovante de vacinação"}</span>
                    <span className="block truncate text-[13px] text-suave">
                      {v.doses} {v.doses === 1 ? "dose registrada" : "doses registradas"} ·{" "}
                      {v.de.slice(0, 4) === v.ate.slice(0, 4) ? v.ate.slice(0, 4) : `${v.de.slice(0, 4)} a ${v.ate.slice(0, 4)}`}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-marca">abrir ↗</span>
                </a>
              </li>
            ))}
          </ul>
          {pendentes.length > 0 && (
            <ul className="mt-3 space-y-2 rounded-3xl bg-bege p-4 text-sm">
              {pendentes.map((p) => (
                <li key={p.vacina}>
                  <span className="font-semibold text-atencao">{p.nome}:</span> {p.texto}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <p className="text-center text-xs text-suave">
        Receitas, exames de imagem e outros documentos aparecem aqui, na sua categoria, quando forem enviados.
      </p>
    </div>
  );
}
