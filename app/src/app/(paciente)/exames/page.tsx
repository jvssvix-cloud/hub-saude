import type { Metadata } from "next";
import Link from "next/link";
import { BarraContagem } from "@/components/LinhaIndice";
import { carregarInsights } from "@/lib/dados";
import { laudos } from "@/lib/documentos";
import { areasOrdenadas, seriesDaArea } from "@/lib/insights";
import { relogio } from "@/lib/relogio";

export const metadata: Metadata = { title: "Exames · Hub de Saúde" };

/** Exames por sistema do corpo: quantos estão na faixa e quantos fora, num olhar. Toque abre o sistema. */
export default async function Exames() {
  const insights = await carregarInsights();
  const areas = areasOrdenadas(insights)
    .map((a) => {
      const series = seriesDaArea(insights, a);
      const fora = series.filter((s) => s.alterado).length;
      return { area: a, total: series.length, fora };
    })
    .filter((x) => x.total > 0);
  const fora = insights.series.filter((s) => s.alterado).length;
  const atencaoRelogio = relogio.alertas.filter((a) => a.nivel === "atencao").length;
  const nLaudos = laudos(insights).length;

  return (
    <div className="space-y-6 pt-3">
      <section>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">Exames</h1>
        <p className="mt-1 text-[15px] text-suave">
          {insights.series.length} exames acompanhados · <span className="text-atencao">{fora} fora da faixa</span>
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-suave">Por sistema</h2>
        <ul className="divide-y divide-linha overflow-hidden rounded-3xl border border-linha bg-cartao">
          {areas.map(({ area, total, fora }) => (
            <li key={area.id}>
              <Link href={`/sistema/${area.id}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-fundo">
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold">{area.nome}</span>
                    <span className="num shrink-0 text-[13px] text-suave">
                      {fora > 0 ? <span className="font-semibold text-atencao">{fora} fora · </span> : null}
                      {total} {total === 1 ? "exame" : "exames"}
                    </span>
                  </span>
                  <span className="mt-2 block">
                    <BarraContagem ok={total - fora} fora={fora} />
                  </span>
                </span>
                <span aria-hidden className="text-suave">›</span>
              </Link>
            </li>
          ))}
          <li>
            <Link href="/relogio" className="flex items-center gap-3 px-4 py-3.5 hover:bg-fundo">
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold">Coração e sono · relógio</span>
                  <span className="shrink-0 text-[13px] text-suave">
                    {atencaoRelogio > 0 ? <span className="font-semibold text-atencao">{atencaoRelogio} avisos · </span> : null}
                    {relogio.dias.length} dias
                  </span>
                </span>
                <span className="mt-1 block text-[13px] text-suave">Batimento em repouso, ritmo, sono e passos</span>
              </span>
              <span aria-hidden className="text-suave">›</span>
            </Link>
          </li>
        </ul>
      </section>

      <Link
        href="/documentos"
        className="flex items-center gap-3 rounded-3xl bg-bege px-4 py-4 transition-colors hover:bg-bege-forte"
      >
        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-2xl bg-cartao text-marca">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 3h7l4 4v14H7z" />
            <path d="M14 3v4h4" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Documentos</span>
          <span className="block text-[13px] text-suave">{nLaudos} laudos originais, de onde vem cada número</span>
        </span>
        <span aria-hidden className="text-suave">›</span>
      </Link>

      <Link href="/evolucao" className="inline-block text-sm font-semibold text-marca hover:underline">
        Ver a evolução de todos os índices ›
      </Link>
    </div>
  );
}
