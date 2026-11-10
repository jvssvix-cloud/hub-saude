"use client";

import {
  Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { Ponto } from "@/lib/insights";

type Linha = {
  t: number;
  valor: number;
  faixa: [number, number] | null;
  ponto: Ponto;
};

const fmt = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const dataBr = (iso: string) => iso.split("-").reverse().join("/");

/**
 * Série de um exame ao longo dos anos com a faixa de referência de CADA laudo (a faixa muda de laboratório
 * para laboratório, então é desenhada em degraus). Ponto fora da faixa em destaque; tocar no ponto abre o
 * laudo original na página certa.
 */
export function GraficoSerie({ pontos, unidade }: { pontos: Ponto[]; unidade: string }) {
  const valores = pontos.map((p) => p.valor);
  const refs = pontos.flatMap((p) => [p.ref_min, p.ref_max]).filter((v): v is number => v !== null);
  const lo = Math.min(...valores, ...refs);
  const hi = Math.max(...valores, ...refs);
  // eixo com números redondos: passo "bonito" (1, 2, 2,5 ou 5 × 10^n) para ~4 intervalos
  const folga = (hi - lo) * 0.12 || Math.abs(hi) * 0.1 || 1;
  const bruto = (hi - lo + 2 * folga) / 4;
  const mag = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((p) => p >= bruto)!;
  const yMin = Math.max(0, Math.floor((lo - folga) / passo) * passo);
  const yMax = Math.ceil((hi + folga) / passo) * passo;
  const ticks: number[] = [];
  for (let v = yMin; v <= yMax + passo / 2; v += passo) ticks.push(Math.round(v * 1e6) / 1e6);

  const dados: Linha[] = pontos.map((p) => ({
    t: Date.parse(p.data),
    valor: p.valor,
    // faixa sem limite inferior (ex.: "até 130") vai até a base do gráfico; sem superior, até o topo
    faixa: p.ref_min === null && p.ref_max === null ? null : [p.ref_min ?? yMin, p.ref_max ?? yMax],
    ponto: p,
  }));

  const abrir = (p: Ponto) => window.open(`/${p.fonte.arquivo}#page=${p.fonte.pagina}`, "_blank");

  return (
    <div className="h-64 w-full sm:h-72">
      <ResponsiveContainer>
        <ComposedChart data={dados} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="var(--linha)" vertical={false} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            tickFormatter={(t: number) => String(new Date(t).getUTCFullYear())}
            tick={{ fill: "var(--suave)", fontSize: 12 }}
            stroke="var(--linha)"
            padding={{ left: 12, right: 12 }}
          />
          <YAxis
            domain={[yMin, yMax]}
            ticks={ticks}
            tickFormatter={(v: number) => fmt(v)}
            tick={{ fill: "var(--suave)", fontSize: 12 }}
            stroke="var(--linha)"
            width={56}
          />
          <Area
            dataKey="faixa"
            type="step" /* cada faixa centrada no seu ponto: a do último laudo também aparece */
            stroke="none"
            fill="var(--faixa)"
            fillOpacity={1}
            isAnimationActive={false}
            activeDot={false}
            name="Referência"
          />
          <Line
            dataKey="valor"
            type="linear"
            stroke="var(--marca)"
            strokeWidth={2}
            isAnimationActive={false}
            dot={(props) => {
              const { cx, cy, payload, index } = props as { cx?: number; cy?: number; payload: Linha; index: number };
              if (cx === undefined || cy === undefined) return <g key={index} />;
              const fora = payload.ponto.fora_da_faixa;
              return (
                <circle
                  key={index}
                  cx={cx}
                  cy={cy}
                  r={fora ? 5.5 : 4.5}
                  fill={fora ? "var(--fora)" : "var(--cartao)"}
                  stroke={fora ? "var(--fora)" : "var(--marca)"}
                  strokeWidth={2}
                  style={{ cursor: "pointer" }}
                  onClick={() => abrir(payload.ponto)}
                />
              );
            }}
            activeDot={(props) => {
              const { cx, cy, payload } = props as { cx?: number; cy?: number; payload: Linha };
              if (cx === undefined || cy === undefined) return <g />;
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={8}
                  fill={payload.ponto.fora_da_faixa ? "var(--fora)" : "var(--marca)"}
                  stroke="var(--cartao)"
                  strokeWidth={2}
                  style={{ cursor: "pointer" }}
                  onClick={() => abrir(payload.ponto)}
                />
              );
            }}
          />
          <Tooltip
            cursor={{ stroke: "var(--linha)" }}
            content={({ active, payload }) => {
              const l = active && payload?.[0] ? (payload[0].payload as Linha) : null;
              if (!l) return null;
              const p = l.ponto;
              return (
                <div className="max-w-56 rounded-xl border border-linha bg-cartao px-3 py-2 text-xs shadow-sm">
                  <p className="num text-sm font-semibold">
                    {p.qualificador ?? ""}
                    {fmt(p.valor)} {unidade}
                    {p.fora_da_faixa && <span className="ml-1.5 font-medium text-fora">fora da referência</span>}
                  </p>
                  <p className="text-suave">
                    {dataBr(p.data)} · {p.fonte.laboratorio}
                  </p>
                  <p className="mt-1 text-marca">Toque para abrir o laudo (p. {p.fonte.pagina})</p>
                </div>
              );
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
