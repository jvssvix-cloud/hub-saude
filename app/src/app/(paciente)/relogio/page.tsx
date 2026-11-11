import type { Metadata } from "next";
import Link from "next/link";
import { GraficoRelogio } from "@/components/GraficoRelogio";
import {
  FONTE, alertasOrdenados, dataHoraBr, decimal, inteiro, relogio, serieDoContexto, type Alerta,
} from "@/lib/relogio";
import { meusInsights } from "@/lib/dados";
import { dataBr, type Serie } from "@/lib/insights";

export const metadata: Metadata = { title: "Relógio · Hub de Saúde" };

export default async function Relogio() {
  const { series } = await meusInsights();
  const { resumo: r, eventos, dias } = relogio;
  const alertas = alertasOrdenados();
  const atencao = alertas.filter((a) => a.nivel === "atencao");

  return (
    <div className="space-y-6 pt-3">

      <section>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">Relógio</h1>
        <p className="mt-1 text-sm text-suave">
          {FONTE[relogio.fonte]} · última sincronização {dataHoraBr(relogio.ultima_sincronizacao)} ·{" "}
          {dias.length} dias desde {dataBr(relogio.periodo.inicio)}
        </p>
      </section>

      {atencao.length > 0 && (
        <section className="rounded-3xl border border-atencao/25 bg-atencao-fundo p-4">
          <h2 className="font-semibold text-atencao">
            {atencao.length === 1 ? "1 sinal para levar ao médico" : `${atencao.length} sinais para levar ao médico`}
          </h2>
          <p className="mt-1 text-sm text-tinta/80">
            {atencao.map((a) => a.titulo).join(" e ")}, ao lado do que seus exames já mostram.
          </p>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3">
        <Cartao
          titulo="FC de repouso"
          valor={inteiro(r.fc_repouso.atual_14d)}
          unidade="bpm"
          detalhe={`sua base: ${inteiro(r.fc_repouso.linha_base)} bpm`}
          alerta={alertas.some((a) => a.id === "fc_repouso_subindo")}
        />
        <Cartao
          titulo="Ritmo irregular"
          valor={String(r.eventos_ritmo_14d)}
          unidade={r.eventos_ritmo_14d === 1 ? "aviso" : "avisos"}
          detalhe="últimos 14 dias"
          alerta={alertas.some((a) => a.id === "ritmo_irregular")}
        />
        <Cartao
          titulo="Sono"
          valor={decimal(r.sono_horas.atual_14d)}
          unidade="h/noite"
          detalhe="média de 14 dias"
          alerta={alertas.some((a) => a.id === "sono_curto")}
        />
        <Cartao
          titulo="Passos"
          valor={inteiro(r.passos.atual_30d)}
          unidade="por dia"
          detalhe={`antes: ${inteiro(r.passos.anterior_90d)}`}
          alerta={alertas.some((a) => a.id === "atividade_caindo")}
        />
      </section>

      {alertas.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-suave">Alertas</h2>
          {alertas.map((a) => (
            <CartaoAlerta key={a.id} alerta={a} series={series} />
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-suave">Últimos 6 meses</h2>
        <Grafico
          titulo="Frequência cardíaca de repouso (bpm)"
          legenda={`Linha tracejada: sua média de ${r.fc_repouso.linha_base_periodo}. Marcas vermelhas: avisos de ritmo irregular.`}
        >
          <GraficoRelogio
            dias={dias}
            campo="fc_repouso"
            unidade="bpm"
            referencia={r.fc_repouso.linha_base}
            rotuloReferencia="sua base"
            eventos={eventos}
          />
        </Grafico>
        <Grafico titulo="Variabilidade cardíaca (ms)" legenda="Quanto maior, em geral melhor. Caindo junto com a FC subindo.">
          <GraficoRelogio dias={dias} campo="vfc_ms" unidade="ms" referencia={r.vfc_ms.linha_base} rotuloReferencia="sua base" />
        </Grafico>
        <Grafico titulo="Sono (horas por noite)" legenda="Linha tracejada: 6 h, o limite da regra de sono curto.">
          <GraficoRelogio dias={dias} campo="sono_horas" unidade="h" tipo="barras" referencia={6} casas={1} />
        </Grafico>
        <Grafico titulo="Passos por dia" legenda="Dias sem barra: relógio sem dado (no carregador).">
          <GraficoRelogio dias={dias} campo="passos" unidade="passos" tipo="barras" />
        </Grafico>
      </section>

      {eventos.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-suave">Avisos de ritmo irregular</h2>
          <ul className="divide-y divide-linha rounded-3xl border border-linha bg-cartao px-4 text-sm">
            {[...eventos].reverse().map((e) => (
              <li key={e.data_hora} className="flex items-center justify-between gap-3 py-2.5">
                <span className="num">{dataHoraBr(e.data_hora)}</span>
                <span className="text-right text-xs text-suave">{e.detalhe}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-8 text-center text-xs text-suave">
        Alertas gerados por regras a partir dos dados do relógio. Não é diagnóstico: leve ao seu médico.
      </p>
    </div>
  );
}

function Cartao({
  titulo, valor, unidade, detalhe, alerta,
}: { titulo: string; valor: string; unidade: string; detalhe: string; alerta: boolean }) {
  return (
    <div className={`rounded-3xl border p-4 ${alerta ? "border-atencao/30 bg-atencao-fundo" : "border-linha bg-cartao"}`}>
      <p className="text-xs text-suave">{titulo}</p>
      <p className="num mt-1">
        <span className={`text-2xl font-semibold ${alerta ? "text-atencao" : ""}`}>{valor}</span>{" "}
        <span className="text-sm text-suave">{unidade}</span>
      </p>
      <p className="text-xs text-suave">{detalhe}</p>
    </div>
  );
}

function CartaoAlerta({ alerta: a, series }: { alerta: Alerta; series: Serie[] }) {
  const atencao = a.nivel === "atencao";
  return (
    <article className="rounded-3xl border border-linha bg-cartao p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold">{a.titulo}</h3>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            atencao ? "bg-atencao-fundo text-atencao" : "bg-marca-fundo text-marca"
          }`}
        >
          {atencao ? "Atenção" : "Para acompanhar"}
        </span>
      </div>
      <p className="mt-2 text-sm">{a.motivo}</p>
      <p className={`mt-2 text-sm font-medium ${atencao ? "text-atencao" : "text-tinta"}`}>{a.recomendacao}</p>

      {a.contexto_exames && a.contexto_exames.length > 0 && (
        <div className="mt-3 rounded-xl bg-fundo p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-suave">O que seus exames mostram</p>
          <ul className="mt-1.5 space-y-1 text-sm">
            {a.contexto_exames.map((c) => {
              const s = serieDoContexto(series, c);
              return (
                <li key={c} className="flex gap-2">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-atencao" />
                  {s ? (
                    <Link href={`/exame/${s.analito}`} className="hover:text-marca">
                      {c} <span className="text-marca">›</span>
                    </Link>
                  ) : (
                    <span>{c}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="mt-3 text-xs text-suave">{a.aviso}</p>
    </article>
  );
}

function Grafico({ titulo, legenda, children }: { titulo: string; legenda: string; children: React.ReactNode }) {
  return (
    <article className="rounded-3xl border border-linha bg-cartao p-4">
      <h3 className="text-sm font-semibold">{titulo}</h3>
      <p className="mb-2 text-xs text-suave">{legenda}</p>
      {children}
    </article>
  );
}
