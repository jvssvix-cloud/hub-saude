import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { carregarInsights } from "@/lib/dados";
import { laudos, nomeLab } from "@/lib/documentos";
import { dataBr, faixa, linkLaudo, numero } from "@/lib/insights";

export async function generateStaticParams() {
  return laudos(await carregarInsights()).map((l) => ({ id: l.id }));
}

export async function generateMetadata({ params }: PageProps<"/documentos/[id]">) {
  const { id } = await params;
  const l = laudos(await carregarInsights()).find((x) => x.id === id);
  return { title: l ? `Laudo de ${dataBr(l.data)} · Hub de Saúde` : "Documento · Hub de Saúde" };
}

export default function Documento({ params }: PageProps<"/documentos/[id]">) {
  return (
    <Suspense fallback={<p className="text-sm text-suave">Carregando…</p>}>
      <Conteudo params={params} />
    </Suspense>
  );
}

async function Conteudo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const l = laudos(await carregarInsights()).find((x) => x.id === id);
  if (!l) notFound();
  const fora = l.resultados.filter((r) => r.fora).length;

  return (
    <div className="space-y-5 pt-3">
      <Link href="/documentos" className="text-sm font-semibold text-marca hover:underline">
        ‹ Documentos
      </Link>

      <section className="rounded-3xl border border-linha bg-cartao p-4 sm:p-5">
        <p className="text-sm text-suave">{nomeLab(l.laboratorio)}</p>
        <h1 className="text-2xl font-bold tracking-tight">Laudo de {dataBr(l.data)}</h1>
        <p className="mt-1 text-sm">
          {l.resultados.length} resultados
          {fora > 0 ? <span className="font-semibold text-atencao"> · {fora} fora da faixa</span> : " · todos na faixa"}
        </p>
        <a
          href={linkLaudo({ arquivo: l.arquivo, pagina: 1 })}
          target="_blank"
          className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-marca px-4 py-2.5 text-sm font-semibold text-white hover:bg-marca-hover"
        >
          Abrir o laudo original ↗
        </a>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-suave">O que saiu deste laudo</h2>
        <ul className="space-y-2">
          {l.resultados.map((r) => (
            <li key={r.analito}>
              <Link
                href={`/exame/${r.analito}`}
                className={`flex items-center justify-between gap-3 rounded-2xl border border-linha border-l-4 bg-cartao px-4 py-3 hover:bg-fundo ${
                  r.fora ? "border-l-fora" : "border-l-[var(--ok)]"
                }`}
              >
                <span className="min-w-0">
                  <span className="block font-semibold">{r.nome}</span>
                  <span className={`block text-[13px] ${r.fora ? "text-atencao" : "text-suave"}`}>
                    {r.fora ? "Fora da faixa" : "Na faixa"} · ref. {faixa(r.ref_min, r.ref_max, r.unidade)}
                  </span>
                </span>
                <span className="num shrink-0 text-right">
                  <span className={`block font-semibold ${r.fora ? "text-fora" : ""}`}>
                    {r.qualificador ?? ""}
                    {numero(r.valor)} <span className="text-xs font-normal text-suave">{r.unidade}</span>
                  </span>
                  <span className="block text-xs text-suave">p. {r.pagina}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
