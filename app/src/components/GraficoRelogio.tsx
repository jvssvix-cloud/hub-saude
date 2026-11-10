"use client";

import {
  Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { Dia, Evento } from "@/lib/relogio";

type Campo = "fc_repouso" | "vfc_ms" | "sono_horas" | "passos";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const fmt = (v: number, casas: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
const diaMes = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/**
 * Uma métrica diária do relógio. Linha (FC, variabilidade) ou barras (sono, passos).
 * Linha tracejada = referência explicável (linha de base pessoal ou limiar da regra).
 * Avisos de ritmo irregular aparecem como marcas verticais no dia em que aconteceram.
 */
export function GraficoRelogio({
  dias, campo, unidade, tipo = "linha", referencia, rotuloReferencia, eventos = [], casas = 0,
}: {
  dias: Dia[];
  campo: Campo;
  unidade: string;
  tipo?: "linha" | "barras";
  referencia?: number | null;
  rotuloReferencia?: string;
  eventos?: Evento[];
  casas?: number;
}) {
  const dados = dias.map((d) => ({ data: d.data, valor: d[campo] }));
  const diasEvento = new Set(eventos.map((e) => e.data_hora.slice(0, 10)));
  const valores = dados.map((d) => d.valor).filter((v): v is number => v !== null);
  const lo = Math.min(...valores, referencia ?? Infinity);
  const hi = Math.max(...valores, referencia ?? -Infinity);
  const folga = (hi - lo) * 0.15 || 1;
  const dominio: [number, number] = tipo === "barras" ? [0, Math.ceil(hi * 1.1)] : [Math.floor(lo - folga), Math.ceil(hi + folga)];
  // um rótulo por mês no eixo X
  const ticks = dados.filter((d) => d.data.endsWith("-01")).map((d) => d.data);

  return (
    <div className="h-48 w-full sm:h-56">
      <ResponsiveContainer>
        <ComposedChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="var(--linha)" vertical={false} />
          <XAxis
            dataKey="data"
            ticks={ticks}
            tickFormatter={(d: string) => MESES[Number(d.slice(5, 7)) - 1]}
            tick={{ fill: "var(--suave)", fontSize: 12 }}
            stroke="var(--linha)"
            interval={0}
          />
          <YAxis
            domain={dominio}
            tickFormatter={(v: number) => fmt(v, 0)}
            tick={{ fill: "var(--suave)", fontSize: 12 }}
            stroke="var(--linha)"
            width={52}
            allowDecimals={false}
          />
          {[...diasEvento].map((d) => (
            <ReferenceLine key={d} x={d} stroke="var(--fora)" strokeWidth={1.5} strokeOpacity={0.7} />
          ))}
          {referencia != null && (
            <ReferenceLine
              y={referencia}
              stroke="var(--suave)"
              strokeDasharray="4 4"
              label={rotuloReferencia ? { value: rotuloReferencia, position: "insideTopLeft", fill: "var(--suave)", fontSize: 11 } : undefined}
            />
          )}
          {tipo === "barras" ? (
            <Bar dataKey="valor" fill="var(--marca)" fillOpacity={0.55} isAnimationActive={false} />
          ) : (
            <Line
              dataKey="valor"
              type="monotone"
              stroke="var(--marca)"
              strokeWidth={1.75}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}
          <Tooltip
            cursor={{ stroke: "var(--linha)", fill: "var(--linha)", fillOpacity: 0.4 }}
            content={({ active, payload }) => {
              const l = active && payload?.[0] ? (payload[0].payload as { data: string; valor: number | null }) : null;
              if (!l) return null;
              return (
                <div className="rounded-xl border border-linha bg-cartao px-3 py-2 text-xs shadow-sm">
                  <p className="num text-sm font-semibold">
                    {l.valor === null ? "sem dado" : `${fmt(l.valor, casas)} ${unidade}`}
                  </p>
                  <p className="text-suave">{diaMes(l.data)}</p>
                  {diasEvento.has(l.data) && <p className="mt-1 font-medium text-fora">aviso de ritmo irregular</p>}
                </div>
              );
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
