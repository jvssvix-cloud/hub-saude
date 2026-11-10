import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BarraContagem, LinhaSerie } from "@/components/LinhaIndice";
import { carregarInsights } from "@/lib/dados";
import { seriesDaArea } from "@/lib/insights";

export async function generateStaticParams() {
  const { areas } = await carregarInsights();
  return areas.map((a) => ({ id: a.id }));
}

export async function generateMetadata({ params }: PageProps<"/sistema/[id]">) {
  const { id } = await params;
  const a = (await carregarInsights()).areas.find((x) => x.id === id);
  return { title: a ? `${a.nome} · Hub de Saúde` : "Exames · Hub de Saúde" };
}

export default function Sistema({ params }: PageProps<"/sistema/[id]">) {
  return (
    <Suspense fallback={<p className="text-sm text-suave">Carregando…</p>}>
      <Conteudo params={params} />
    </Suspense>
  );
}

async function Conteudo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const insights = await carregarInsights();
  const area = insights.areas.find((a) => a.id === id);
  if (!area) notFound();
  const series = seriesDaArea(insights, area).sort((a, b) => Number(b.alterado) - Number(a.alterado));
  const fora = series.filter((s) => s.alterado).length;

  return (
    <div className="space-y-5 pt-3">
      <Link href="/exames" className="text-sm font-semibold text-marca hover:underline">
        ‹ Exames
      </Link>
      <section>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">{area.nome}</h1>
        <p className="mt-1 text-[15px] text-suave">
          {series.length - fora} na faixa{fora > 0 && <span className="text-atencao"> · {fora} fora</span>} · último exame em{" "}
          {area.ultimo_exame.split("-").reverse().join("/")}
        </p>
        <div className="mt-3">
          <BarraContagem ok={series.length - fora} fora={fora} grossa />
        </div>
      </section>

      {area.motivos.length > 0 && (
        <ul className="space-y-1 rounded-3xl bg-bege p-4 text-sm">
          {area.motivos.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}

      <ul className="divide-y divide-linha overflow-hidden rounded-3xl border border-linha bg-cartao">
        {series.map((s) => (
          <LinhaSerie key={s.analito} s={s} />
        ))}
      </ul>
    </div>
  );
}
