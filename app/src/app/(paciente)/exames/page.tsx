import type { Metadata } from "next";
import Link from "next/link";
import { FiltroExames, type ExameFiltravel } from "@/components/FiltroExames";
import { ConecteWearable } from "@/components/ConecteWearable";
import { OutrosExames } from "@/components/OutrosExames";
import { outrosDoPaciente } from "@/lib/outros-banco";
import { pacienteAtual } from "@/lib/sessao";
import { BarraContagem } from "@/components/LinhaIndice";
import { SemExames } from "@/components/SemExames";
import { meuRelogio, meusInsights } from "@/lib/dados";
import { laudos } from "@/lib/documentos";
import { areasOrdenadas, seriesDaArea } from "@/lib/insights";
import { fraseSerie } from "@/lib/paciente";
import type { Relogio } from "@/lib/relogio";

export const metadata: Metadata = { title: "Exames · Zelo" };

/** Exames por sistema do corpo: quantos estão na faixa e quantos fora, num olhar. Toque abre o sistema. */
const avisosRelogio = (r: Relogio) => r.alertas.filter((a) => a.nivel === "atencao").length;

export default async function Exames() {
  const [insights, relogio, outros] = await Promise.all([
    meusInsights(),
    meuRelogio(),
    pacienteAtual().then((p) => outrosDoPaciente(p.id)),
  ]);
  const areas = areasOrdenadas(insights)
    .map((a) => {
      const series = seriesDaArea(insights, a);
      const fora = series.filter((s) => s.alterado).length;
      return { area: a, total: series.length, fora };
    })
    .filter((x) => x.total > 0);
  const fora = insights.series.filter((s) => s.alterado).length;
  const nLaudos = laudos(insights).length;
  const semExames = insights.series.length === 0;
  const exames: ExameFiltravel[] = insights.series.map((s) => ({
    analito: s.analito,
    nome: s.nome,
    unidade: s.unidade,
    frase: fraseSerie(s),
    alterado: s.alterado,
    faixa: { min: s.ultimo.ref_min, max: s.ultimo.ref_max },
    pontos: s.pontos.map((p) => ({ data: p.data, valor: p.valor, fora: p.fora_da_faixa, qualificador: p.qualificador ?? null })),
  }));
  const textos = (insights.resultados_texto ?? []).map((t) => ({
    analito: t.analito, nome: t.nome, data: t.data, texto: t.texto, fora: t.fora_da_faixa, fonte: t.fonte,
  }));

  return (
    <div className="space-y-6 pt-3">
      <section>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[28px] font-bold leading-tight tracking-tight">Exames</h1>
          <Link
            href="/enviar"
            className="shrink-0 rounded-full border border-linha bg-cartao px-4 py-2 text-sm font-semibold text-marca transition-colors hover:border-salvia"
          >
            + Enviar
          </Link>
        </div>
        {!semExames && (
          <p className="mt-1 text-[15px] text-suave">
            {insights.series.length} exames acompanhados · <span className="text-atencao">{fora} fora da faixa</span>
          </p>
        )}
      </section>

      {semExames && (
        <>
          <SemExames />
          {!relogio && (
            <div className="overflow-hidden rounded-3xl border border-linha bg-cartao">
              <ConecteWearable variante="linha" />
            </div>
          )}
        </>
      )}

      {!semExames && (
      <>

      <FiltroExames exames={exames} textos={textos}>
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
          {relogio && (
          <li>
            <Link href="/relogio" className="flex items-center gap-3 px-4 py-3.5 hover:bg-fundo">
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold">Coração e sono · relógio</span>
                  <span className="shrink-0 text-[13px] text-suave">
                    {avisosRelogio(relogio) > 0 ? <span className="font-semibold text-atencao">{avisosRelogio(relogio)} avisos · </span> : null}
                    {relogio.dias.length} dias
                  </span>
                </span>
                <span className="mt-1 block text-[13px] text-suave">Batimento em repouso, ritmo, sono e passos</span>
              </span>
              <span aria-hidden className="text-suave">›</span>
            </Link>
          </li>
          )}
          {!relogio && (
            <li>
              <ConecteWearable variante="linha" />
            </li>
          )}
        </ul>
      </section>
      </FiltroExames>

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
      </>
      )}

      <OutrosExames lista={outros} />
    </div>
  );
}
