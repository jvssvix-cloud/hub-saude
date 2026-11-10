import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GraficoSerie } from "@/components/GraficoSerie";
import { AvisoNaoDiagnostico, SeloStatus } from "@/components/ui";
import { carregarInsights } from "@/lib/dados";
import { areaDe, dataBr, faixa, linkLaudo, numero, serie } from "@/lib/insights";

export async function generateStaticParams() {
  const { series } = await carregarInsights();
  return series.map((s) => ({ analito: s.analito }));
}

export async function generateMetadata({ params }: PageProps<"/exame/[analito]">) {
  const s = serie(await carregarInsights(), (await params).analito);
  return { title: s ? `${s.nome} · Hub de Saúde` : "Exame · Hub de Saúde" };
}

// As páginas dos exames que já existem são geradas no build (generateStaticParams); o Suspense só satisfaz a regra do Next 16
// de não ler o endereço fora de um limite de carregamento.
export default function DetalheExame({ params }: PageProps<"/exame/[analito]">) {
  return (
    <Suspense fallback={<p className="text-sm text-suave">Carregando…</p>}>
      <Conteudo params={params} />
    </Suspense>
  );
}

async function Conteudo({ params }: { params: Promise<{ analito: string }> }) {
  const insights = await carregarInsights();
  const s = serie(insights, (await params).analito);
  if (!s) notFound();
  const area = areaDe(insights, s);
  const u = s.ultimo;
  const laboratorios = new Set(s.pontos.map((p) => p.fonte.laboratorio)).size;
  const pontosRecentes = [...s.pontos].reverse();

  return (
    <div className="space-y-5">
      <Link href="/" className="text-sm text-marca hover:underline">
        ‹ Início
      </Link>

      <section>
        <div className="flex items-start justify-between gap-3">
          <div>
            {area && <p className="text-sm text-suave">{area.nome}</p>}
            <h1 className="text-2xl font-semibold tracking-tight">{s.nome}</h1>
          </div>
          <SeloStatus status={s.alterado ? "atencao" : "em_dia"} />
        </div>

        <div className="mt-3 flex items-baseline gap-2">
          <span className={`num text-4xl font-semibold tracking-tight ${s.alterado ? "text-fora" : ""}`}>
            {u.qualificador ?? ""}
            {numero(u.valor)}
          </span>
          <span className="text-suave">{s.unidade}</span>
        </div>
        <p className="text-sm text-suave">
          Último resultado, {dataBr(u.data)} · referência {faixa(u.ref_min, u.ref_max, s.unidade)}
        </p>

        {(s.tendencia || s.persistente) && (
          <ul className="mt-3 space-y-1 text-sm">
            {s.tendencia && s.tendencia.direcao !== "estavel" && (
              <li>
                <span className="font-medium">{s.tendencia.direcao === "subindo" ? "Subindo:" : "Caindo:"}</span>{" "}
                {s.tendencia.texto}
              </li>
            )}
            {s.persistente && (
              <li>
                <span className="font-medium">Persistente:</span> fora da referência nos últimos {s.fora_seguidos} exames
              </li>
            )}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-linha bg-cartao p-3 pt-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
          <h2 className="text-sm font-medium">
            {s.pontos.length} resultados · {laboratorios} {laboratorios === 1 ? "laboratório" : "laboratórios"}
          </h2>
          <div className="flex items-center gap-3 text-xs text-suave">
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="inline-block h-2.5 w-4 rounded-sm bg-[var(--faixa)]" /> referência do laudo
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="inline-block size-2.5 rounded-full bg-fora" /> fora
            </span>
          </div>
        </div>
        <GraficoSerie pontos={s.pontos} unidade={s.unidade} />
        <p className="px-1 pt-1 text-xs text-suave">Toque num ponto para abrir o laudo original.</p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-suave">Cada resultado e sua origem</h2>
        <ul className="divide-y divide-linha overflow-hidden rounded-2xl border border-linha bg-cartao">
          {pontosRecentes.map((p) => (
            <li key={p.fonte.laudo_id + p.data}>
              <a
                href={linkLaudo(p.fonte)}
                target="_blank"
                className="flex items-start justify-between gap-3 px-4 py-3 text-sm hover:bg-fundo"
              >
                <div className="min-w-0">
                  <p className="font-medium">{dataBr(p.data)}</p>
                  <p className="truncate text-suave">{p.fonte.laboratorio}</p>
                  <p className="mt-0.5 text-xs text-suave">
                    Impresso: “{p.valor_impresso} {p.unidade_impressa}” · ref. {faixa(p.ref_min, p.ref_max, s.unidade)}
                  </p>
                </div>
                <div className="num shrink-0 text-right">
                  <p className={p.fora_da_faixa ? "font-semibold text-fora" : "font-medium"}>
                    {p.qualificador ?? ""}
                    {numero(p.valor)}
                  </p>
                  <p className="text-xs text-marca">laudo p. {p.fonte.pagina} ↗</p>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <AvisoNaoDiagnostico />
    </div>
  );
}
