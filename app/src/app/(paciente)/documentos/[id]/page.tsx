import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OutrosExames } from "@/components/OutrosExames";
import { meusInsights } from "@/lib/dados";
import { laudos, nomeLab, type Laudo } from "@/lib/documentos";
import { dataBr, faixa, linkLaudo, numero } from "@/lib/insights";
import { outrosDoPaciente } from "@/lib/outros-banco";
import { pacienteAtual } from "@/lib/sessao";

// Os laudos são de cada paciente (sessão): nada é gerado no build e o título não depende dos dados.
export const metadata: Metadata = { title: "Documento · Zelo" };

export default function Documento({ params }: PageProps<"/documentos/[id]">) {
  return (
    <Suspense fallback={<p className="text-sm text-suave">Carregando…</p>}>
      <Conteudo params={params} />
    </Suspense>
  );
}

async function Conteudo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await pacienteAtual();
  const [insights, outros] = await Promise.all([meusInsights(), outrosDoPaciente(p.id, id)]);
  // laudo só com exames fora da lista (ex.: urina tipo 1) não tem série: monta o cabeçalho pelos outros
  const l: Laudo | undefined =
    laudos(insights).find((x) => x.id === id) ??
    (outros[0]?.documento?.arquivo
      ? { id, arquivo: outros[0].documento.arquivo, laboratorio: outros[0].documento.emissor ?? "", data: outros[0].data, resultados: [] }
      : undefined);
  if (!l) notFound();
  const fora = l.resultados.filter((r) => r.fora).length + outros.filter((o) => o.fora_da_faixa).length;
  const total = l.resultados.length + outros.length;

  return (
    <div className="space-y-5 pt-3">
      <Link href="/documentos" className="text-sm font-semibold text-marca hover:underline">
        ‹ Documentos
      </Link>

      <section className="rounded-3xl border border-linha bg-cartao p-4 sm:p-5">
        <p className="text-sm text-suave">{nomeLab(l.laboratorio)}</p>
        <h1 className="text-2xl font-bold tracking-tight">Laudo de {dataBr(l.data)}</h1>
        <p className="mt-1 text-sm">
          {total} resultados
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

      {l.resultados.length > 0 && (
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
      )}

      <OutrosExames lista={outros} titulo="Outros exames deste laudo" />
    </div>
  );
}
