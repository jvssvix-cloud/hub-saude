import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ComparadorSeries } from "@/components/ComparadorSeries";
import { GraficoRelogio } from "@/components/GraficoRelogio";
import { VigiaAcesso } from "@/components/VigiaAcesso";
import { dataBr, faixa, idade, linkLaudo, mesAno, numero, serie, type Insights, type Serie } from "@/lib/insights";
import { NotaMedico } from "@/components/NotaMedico";
import { SITUACAO_TEXTO, acessar, horaBrasilia, listaCategorias, rascunhoPlano, type Escopo } from "@/lib/medico";
import { enviarNota } from "./acoes";
import { alertasOrdenados, dataHoraBr, decimal, inteiro, serieDoContexto, type Relogio } from "@/lib/relogio";

export const metadata: Metadata = { title: "Histórico do paciente · Hub de Saúde" };

export default function PaginaAcesso({ params }: PageProps<"/medico/acesso/[token]">) {
  return (
    <Suspense fallback={<p className="py-20 text-center text-suave">Conferindo a autorização…</p>}>
      <Acesso params={params} />
    </Suspense>
  );
}

async function Acesso({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const a = await acessar(token);

  if (a.situacao === "pendente") {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <VigiaAcesso token={token} atual="pendente" />
        <span aria-hidden className="mx-auto mb-5 block size-12 animate-pulse rounded-full bg-marca-fundo" />
        <h1 className="text-2xl font-bold tracking-tight">Esperando o paciente autorizar</h1>
        <p className="mt-2 text-suave">
          O pedido apareceu no app dele. Esta tela abre o histórico sozinha assim que ele aprovar.
        </p>
        <p className="mt-6 text-xs text-suave">O pedido vale por 15 minutos. Nenhum dado é mostrado antes da aprovação.</p>
      </div>
    );
  }

  if (a.situacao !== "ok") {
    const t = SITUACAO_TEXTO[a.situacao];
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <span aria-hidden className="mx-auto mb-5 grid size-12 place-items-center rounded-full bg-bege text-xl text-suave">
          ✕
        </span>
        <h1 className="text-2xl font-bold tracking-tight">{t.titulo}</h1>
        <p className="mt-2 text-suave">{t.texto}</p>
        <Link href="/medico" className="mt-6 inline-block font-semibold text-marca hover:underline">
          Fazer um novo pedido
        </Link>
      </div>
    );
  }

  return (
    <>
      <VigiaAcesso token={token} atual="ok" />
      <Painel insights={a.insights} escopo={a.escopo} token={token} relogio={a.relogio} />
    </>
  );
}

function Painel({
  insights: i, escopo, token, relogio,
}: { insights: Insights; escopo: Escopo; token: string; relogio: Relogio | null }) {
  const alteradas = i.series.filter((s) => s.alterado);
  // null: o escopo não libera o relógio ou o paciente não tem relógio
  const comRelogio = relogio !== null;
  const alertas = relogio ? alertasOrdenados(relogio) : [];
  const iniciais = ["glicose", "ldl", "hba1c"].filter((a) => i.series.some((s) => s.analito === a));

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-end justify-between gap-4 border-b border-linha pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{i.paciente.nome}</h1>
          <p className="mt-1 text-sm text-suave">
            {i.paciente.sexo === "M" ? "Masculino" : "Feminino"}, {idade(i.paciente.nascimento, i.hoje)} anos · {i.periodo.laudos} laudos de{" "}
            {i.periodo.laboratorios.length} laboratórios ({mesAno(i.periodo.inicio)} a {mesAno(i.periodo.fim)})
            {relogio && ` · relógio: ${relogio.dias.length} dias`}
          </p>
        </div>
        <div className="text-right text-sm">
          <p className="rounded-full bg-marca-fundo px-3 py-1 font-semibold text-marca">
            Acesso até {horaBrasilia(escopo.expira_em)}
          </p>
          <p className="mt-1 text-xs text-suave">
            Autorizado para {escopo.destinatario_nome} · {escopo.categorias ? `só ${listaCategorias(escopo.categorias)}` : "histórico completo"} ·
            cada acesso é registrado
          </p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {alteradas.slice(0, comRelogio ? 3 : 4).map((s) => (
          <Indicador key={s.analito} s={s} />
        ))}
        {relogio && (
          <div className="rounded-2xl border border-linha bg-cartao p-4">
            <p className="text-xs text-suave">FC de repouso (14 d)</p>
            <p className="num mt-0.5 text-2xl font-bold text-fora">
              {inteiro(relogio.resumo.fc_repouso.atual_14d)} <span className="text-sm font-normal text-suave">bpm</span>
            </p>
            <p className="text-xs text-suave">
              base {inteiro(relogio.resumo.fc_repouso.linha_base)} bpm ({relogio.resumo.fc_repouso.linha_base_periodo})
            </p>
          </div>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="rounded-3xl border border-linha bg-cartao p-5">
          <h2 className="mb-3 font-bold">Comparar séries</h2>
          <ComparadorSeries series={i.series} iniciais={iniciais} />
        </section>

        <div className="space-y-5">
          <section className="rounded-3xl border border-linha bg-cartao p-5">
            <h2 className="font-bold">Correlações e sinais</h2>
            <p className="mb-3 text-xs text-suave">Regras explicáveis sobre os dados; não é diagnóstico.</p>
            <ul className="space-y-3 text-sm">
              {alertas
                .filter((a) => a.nivel === "atencao")
                .map((a) => (
                  <li key={a.id} className="border-l-2 border-fora pl-3">
                    <p className="font-semibold">{a.titulo}</p>
                    <p className="text-suave">{a.motivo}</p>
                    {a.contexto_exames && a.contexto_exames.length > 0 && (
                      <p className="mt-1">
                        <span className="text-suave">Nos exames: </span>
                        {a.contexto_exames.map((c, k) => {
                          const s = serieDoContexto(i.series, c);
                          return (
                            <span key={c}>
                              {k > 0 && "; "}
                              {s ? `${s.nome} ${numero(s.ultimo.valor)} ${s.unidade}` : c}
                            </span>
                          );
                        })}
                      </p>
                    )}
                  </li>
                ))}
              {alertas
                .filter((a) => a.nivel !== "atencao")
                .map((a) => (
                  <li key={a.id} className="border-l-2 border-salvia pl-3">
                    <p className="font-semibold">{a.titulo}</p>
                    <p className="text-suave">{a.motivo}</p>
                  </li>
                ))}
              {i.repeticoes.map((rp) => (
                <li key={rp.de.laudo_id + rp.para.laudo_id} className="border-l-2 border-bege-forte pl-3">
                  <p className="font-semibold">Exames repetidos em {rp.dias} dias</p>
                  <p className="text-suave">
                    {rp.analitos.map((x) => serie(i, x)?.nome ?? x).join(", ")}:{" "}
                    <a className="text-marca hover:underline" href={linkLaudo(rp.de)} target="_blank">
                      {dataBr(rp.de.data)}
                    </a>{" "}
                    →{" "}
                    <a className="text-marca hover:underline" href={linkLaudo(rp.para)} target="_blank">
                      {dataBr(rp.para.data)}
                    </a>
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {relogio && (
            <section className="rounded-3xl border border-linha bg-cartao p-5">
              <h2 className="font-bold">Relógio · FC de repouso</h2>
              <p className="mb-2 text-xs text-suave">
                Tracejado: base pessoal. Marcas: avisos de ritmo irregular ({relogio.eventos.length}, último{" "}
                {relogio.eventos.length ? dataHoraBr(relogio.eventos[relogio.eventos.length - 1].data_hora) : "—"}). Sono{" "}
                {decimal(relogio.resumo.sono_horas.atual_14d)} h/noite; passos {inteiro(relogio.resumo.passos.atual_30d)}/dia.
              </p>
              <GraficoRelogio
                dias={relogio.dias}
                campo="fc_repouso"
                unidade="bpm"
                referencia={relogio.resumo.fc_repouso.linha_base}
                rotuloReferencia="base"
                eventos={relogio.eventos}
              />
            </section>
          )}
        </div>
      </div>

      <section className="overflow-hidden rounded-3xl border border-linha bg-cartao">
        <h2 className="px-5 pt-5 font-bold">Todos os exames</h2>
        <div className="overflow-x-auto">
          <table className="mt-3 w-full min-w-[760px] text-sm">
            <thead className="bg-fundo text-left text-xs text-suave">
              <tr>
                <th className="px-5 py-2 font-semibold">Exame</th>
                <th className="px-3 py-2 font-semibold">Último</th>
                <th className="px-3 py-2 font-semibold">Referência</th>
                <th className="px-3 py-2 font-semibold">Tendência</th>
                <th className="px-3 py-2 font-semibold">Fora seguidos</th>
                <th className="px-5 py-2 text-right font-semibold">Origem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linha">
              {[...i.series]
                .sort((a, b) => Number(b.alterado) - Number(a.alterado))
                .map((s) => (
                  <tr key={s.analito}>
                    <td className="px-5 py-2.5 font-semibold">{s.nome}</td>
                    <td className={`num px-3 py-2.5 ${s.alterado ? "font-bold text-fora" : ""}`}>
                      {s.ultimo.qualificador ?? ""}
                      {numero(s.ultimo.valor)} <span className="font-normal text-suave">{s.unidade}</span>
                    </td>
                    <td className="px-3 py-2.5 text-suave">{faixa(s.ultimo.ref_min, s.ultimo.ref_max, s.unidade)}</td>
                    <td className="px-3 py-2.5 text-suave">
                      {s.tendencia && s.tendencia.direcao !== "estavel"
                        ? `${s.tendencia.direcao === "subindo" ? "↑" : "↓"} ${numero(Math.abs(s.tendencia.variacao_pct))}% em ${s.tendencia.anos} a`
                        : "estável"}
                    </td>
                    <td className="num px-3 py-2.5">{s.fora_seguidos || "—"}</td>
                    <td className="px-5 py-2.5 text-right">
                      <a href={linkLaudo(s.ultimo.fonte)} target="_blank" className="text-marca hover:underline">
                        {dataBr(s.ultimo.data)} · p. {s.ultimo.fonte.pagina} ↗
                      </a>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-3xl bg-bege p-5">
        <h2 className="font-bold">Resumo pré-consulta</h2>
        <div className="mt-2 space-y-1 text-sm">
          {i.resumo_medico.filter(Boolean).map((l, k) => (
            <p key={k} className={l.startsWith("-") ? "pl-3 text-tinta" : "font-semibold"}>
              {l}
            </p>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border-2 border-marca bg-cartao p-5">
        <h2 className="font-bold">Recomendações para o paciente</h2>
        <p className="mb-3 text-sm text-suave">
          O que você enviar aparece no app de {i.paciente.nome.split(" ")[0]} como “Revisado por {escopo.destinatario_nome}”.
        </p>
        <NotaMedico rascunho={rascunhoPlano(i, alertas)} acao={enviarNota.bind(null, token)} />
      </section>
    </div>
  );
}

function Indicador({ s }: { s: Serie }) {
  return (
    <div className="rounded-2xl border border-linha bg-cartao p-4">
      <p className="text-xs text-suave">{s.nome}</p>
      <p className="num mt-0.5 text-2xl font-bold text-fora">
        {s.ultimo.qualificador ?? ""}
        {numero(s.ultimo.valor)} <span className="text-sm font-normal text-suave">{s.unidade}</span>
      </p>
      <p className="text-xs text-suave">
        ref. {faixa(s.ultimo.ref_min, s.ultimo.ref_max, s.unidade)}
        {s.tendencia && s.tendencia.direcao !== "estavel" && ` · ${s.tendencia.direcao === "subindo" ? "↑" : "↓"}${numero(Math.abs(s.tendencia.variacao_pct))}%`}
      </p>
    </div>
  );
}
