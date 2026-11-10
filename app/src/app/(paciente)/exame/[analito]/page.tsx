import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GraficoSerie } from "@/components/GraficoSerie";
import { AvisoNaoDiagnostico, SeloStatus } from "@/components/ui";
import { carregarInsights } from "@/lib/dados";
import { EXPLICACOES } from "@/lib/explicacoes";
import { areaDe, dataBr, faixa, linkLaudo, numero, serie, seriesEmOrdem } from "@/lib/insights";

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
  const explicacao = EXPLICACOES[s.analito];
  const ordem = seriesEmOrdem(insights);
  const pos = ordem.findIndex((x) => x.analito === s.analito);
  const anterior = pos > 0 ? ordem[pos - 1] : null;
  const proximo = pos >= 0 && pos < ordem.length - 1 ? ordem[pos + 1] : null;

  return (
    <div className="space-y-5 pt-3">
      <div className="flex items-center justify-between gap-3">
        <Link href={area ? `/sistema/${area.id}` : "/exames"} className="text-sm font-semibold text-marca hover:underline">
          ‹ {area ? area.nome : "Exames"}
        </Link>
        <nav aria-label="Outros exames" className="flex items-center gap-1.5">
          <span className="num mr-1 text-xs text-suave">
            {pos + 1} de {ordem.length}
          </span>
          <SetaExame para={anterior} sentido="anterior" />
          <SetaExame para={proximo} sentido="proximo" />
        </nav>
      </div>

      <section>
        <div className="flex items-start justify-between gap-3">
          <div>
            {area && <p className="text-sm text-suave">{area.nome}</p>}
            <h1 className="text-[28px] font-bold leading-tight tracking-tight">{s.nome}</h1>
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

      <section className="rounded-3xl border border-linha bg-cartao p-3 pt-4">
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

      {explicacao && (
        <section className="rounded-3xl bg-bege p-4 sm:p-5">
          <h2 className="text-lg font-bold tracking-tight">Entender este exame</h2>
          <dl className="mt-2 space-y-3 text-[15px]">
            {[
              ["O que é", explicacao.oQueE],
              ["Por que importa", explicacao.porQueImporta],
              ["O que costuma ajudar", explicacao.oQueAjuda],
            ].map(([t, texto]) => (
              <div key={t}>
                <dt className="text-sm font-semibold text-marca">{t}</dt>
                <dd className="text-tinta">{texto}</dd>
              </div>
            ))}
          </dl>
          {s.alterado && (
            <p className="mt-3 rounded-2xl bg-cartao px-3 py-2 text-sm text-atencao">
              Seu último resultado está fora da referência do laudo: vale levar à próxima consulta.
            </p>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-suave">Cada resultado e sua origem</h2>
        <ul className="divide-y divide-linha overflow-hidden rounded-3xl border border-linha bg-cartao">
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

      {(anterior || proximo) && (
        <nav aria-label="Exame anterior e próximo" className="grid grid-cols-2 gap-3">
          {anterior ? (
            <Link href={`/exame/${anterior.analito}`} className="rounded-3xl border border-linha bg-cartao px-4 py-3 hover:bg-fundo">
              <span className="block text-xs text-suave">‹ Anterior</span>
              <span className={`block truncate font-semibold ${anterior.alterado ? "text-atencao" : ""}`}>{anterior.nome}</span>
            </Link>
          ) : (
            <span />
          )}
          {proximo && (
            <Link href={`/exame/${proximo.analito}`} className="rounded-3xl border border-linha bg-cartao px-4 py-3 text-right hover:bg-fundo">
              <span className="block text-xs text-suave">Próximo ›</span>
              <span className={`block truncate font-semibold ${proximo.alterado ? "text-atencao" : ""}`}>{proximo.nome}</span>
            </Link>
          )}
        </nav>
      )}

      <AvisoNaoDiagnostico />
    </div>
  );
}

function SetaExame({ para, sentido }: { para: { analito: string; nome: string } | null; sentido: "anterior" | "proximo" }) {
  const seta = sentido === "anterior" ? "‹" : "›";
  const classe = "grid size-9 place-items-center rounded-full border border-linha bg-cartao text-lg leading-none";
  if (!para) return <span aria-hidden className={`${classe} text-linha`}>{seta}</span>;
  return (
    <Link
      href={`/exame/${para.analito}`}
      aria-label={`${sentido === "anterior" ? "Exame anterior" : "Próximo exame"}: ${para.nome}`}
      className={`${classe} text-marca hover:bg-bege`}
    >
      {seta}
    </Link>
  );
}
