import Link from "next/link";
import { connection } from "next/server";
import { carregarInsights } from "@/lib/dados";
import { seriesCitadas, type Serie } from "@/lib/insights";
import { horaBrasilia } from "@/lib/medico";
import { PACIENTE_ID } from "@/lib/usuario";
import { getServidor, temChaveServidor } from "@/lib/supabase";

type Nota = { id: string; autor_nome: string; itens: string[]; criado_em: string };

/**
 * A última nota que um médico revisou e enviou pelo painel. Lida na hora (fora do cache da página).
 * Cada recomendação ganha atalhos para os exames que ela cita, e a nota fecha com os exames fora da faixa hoje.
 */
export async function NotaDoMedico({ vazio = null }: { vazio?: React.ReactNode } = {}) {
  await connection();
  if (!temChaveServidor()) return vazio;
  const [nota] = await getServidor<Nota[]>(
    `nota_medico?paciente_id=eq.${PACIENTE_ID}&select=id,autor_nome,itens,criado_em&order=criado_em.desc&limit=1`,
  ).catch(() => [] as Nota[]);
  if (!nota) return vazio;
  const insights = await carregarInsights();
  const fora = insights.series.filter((s) => s.alterado);

  return (
    <section className="rounded-3xl border border-salvia bg-cartao p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold tracking-tight">Recomendações do seu médico</h2>
        <span className="rounded-full bg-marca-fundo px-3 py-1 text-xs font-semibold text-marca">
          ✓ Revisado por {nota.autor_nome} · {horaBrasilia(nota.criado_em)}
        </span>
      </div>
      <ul className="mt-3 space-y-3 text-[15px]">
        {nota.itens.map((t, k) => {
          const citados = seriesCitadas(insights, t);
          return (
            <li key={k} className="flex gap-2.5">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-marca" />
              <span className="min-w-0">
                <span className="block">{t}</span>
                {citados.length > 0 && (
                  <span className="mt-1.5 flex flex-wrap gap-1.5">
                    {citados.map((s) => (
                      <ChipExame key={s.analito} s={s} />
                    ))}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      {fora.length > 0 && (
        <div className="mt-4 border-t border-linha pt-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-suave">Fora da faixa hoje · toque para ver</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {fora.map((s) => (
              <ChipExame key={s.analito} s={s} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/** Atalho da nota para a página do exame (gráfico, faixa do laudo e documento de origem). */
function ChipExame({ s }: { s: Serie }) {
  return (
    <Link
      href={`/exame/${s.analito}`}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold hover:underline ${
        s.alterado ? "bg-atencao-fundo text-atencao" : "bg-marca-fundo text-marca"
      }`}
    >
      <span aria-hidden className={`size-1.5 rounded-full ${s.alterado ? "bg-fora" : "bg-[var(--ok)]"}`} />
      {s.nome.replace(/ \(.*\)$/, "")}
      <span aria-hidden>›</span>
    </Link>
  );
}
