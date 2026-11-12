/**
 * "Outros exames": os resultados fora da lista padronizada (urina, sódio, potássio, PCR...), agrupados por exame,
 * com o último valor como está no laudo, a referência impressa e o link para a página do original. Sem gráfico.
 */
import { dataBr, linkLaudo } from "@/lib/insights";
import { agruparOutros, valorOutro, type OutroResultado } from "@/lib/outros";

export function OutrosExames({ lista, titulo = "Outros exames", token }: { lista: OutroResultado[]; titulo?: string; token?: string }) {
  const grupos = agruparOutros(lista);
  if (!grupos.length) return null;
  return (
    <section id="outros" className="scroll-mt-20">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-suave">{titulo}</h2>
      <p className="mb-2 text-xs text-suave">
        Exames fora da nossa lista padronizada: guardados como estão no laudo, sem gráfico.
      </p>
      <ul className="divide-y divide-linha overflow-hidden rounded-3xl border border-linha bg-cartao">
        {grupos.map((g) => {
          const u = g.ultimo;
          return (
            <li key={g.chave} className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 font-semibold">{g.nome}</span>
                <span className={`num shrink-0 font-bold ${u.fora_da_faixa ? "text-atencao" : ""}`}>{valorOutro(u) || "—"}</span>
              </div>
              <div className="mt-0.5 flex items-baseline justify-between gap-3 text-xs text-suave">
                <span className="min-w-0">
                  {u.referencia_impressa ? `Ref.: ${u.referencia_impressa.replace(/\n/g, " / ")}` : "Sem referência"}
                  {g.medicoes.length > 1 ? ` · ${g.medicoes.length} medições` : ""}
                </span>
                <span className="shrink-0">
                  {u.fora_da_faixa ? <span className="font-semibold text-atencao">fora · </span> : null}
                  {u.documento?.arquivo ? (
                    <a href={linkLaudo({ arquivo: u.documento.arquivo, pagina: u.pagina ?? 1 }, token)} target="_blank" className="text-marca hover:underline">
                      {dataBr(u.data)} · p. {u.pagina ?? 1} ↗
                    </a>
                  ) : (
                    dataBr(u.data)
                  )}
                </span>
              </div>
              {g.medicoes.length > 1 ? (
                <p className="mt-1 text-xs text-suave">
                  Antes: {g.medicoes.slice(1, 4).map((o) => `${valorOutro(o)} (${dataBr(o.data)})`).join(" · ")}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
