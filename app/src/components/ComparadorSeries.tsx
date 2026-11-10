"use client";

import { useState } from "react";
import { GraficoSerie } from "@/components/GraficoSerie";
import type { Serie } from "@/lib/insights";

/**
 * Comparar séries: o médico escolhe até 3 exames e vê os gráficos empilhados no mesmo período,
 * cada um com a faixa de referência do próprio laudo (unidades diferentes não dividem o mesmo eixo Y).
 */
export function ComparadorSeries({ series, iniciais }: { series: Serie[]; iniciais: string[] }) {
  const [sel, setSel] = useState<string[]>(iniciais);
  const alternar = (a: string) =>
    setSel((s) => (s.includes(a) ? s.filter((x) => x !== a) : s.length >= 3 ? [...s.slice(1), a] : [...s, a]));
  const escolhidas = sel.map((a) => series.find((s) => s.analito === a)).filter((s): s is Serie => !!s);

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {series.map((s) => {
          const on = sel.includes(s.analito);
          return (
            <button
              key={s.analito}
              type="button"
              onClick={() => alternar(s.analito)}
              aria-pressed={on}
              className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                on ? "border-marca bg-marca text-white" : s.alterado ? "border-atencao/40 text-atencao hover:bg-atencao-fundo" : "border-linha text-suave hover:bg-bege"
              }`}
            >
              {s.nome}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-suave">Até 3 exames. Faixa verde = referência de cada laudo. Clique num ponto para abrir o laudo.</p>
      <div className="mt-3 space-y-4">
        {escolhidas.map((s) => (
          <div key={s.analito}>
            <p className="text-sm font-semibold">
              {s.nome} <span className="font-normal text-suave">· {s.unidade}</span>
              {s.tendencia && s.tendencia.direcao !== "estavel" && (
                <span className={`ml-2 font-normal ${s.alterado ? "text-atencao" : "text-suave"}`}>{s.tendencia.texto}</span>
              )}
            </p>
            <GraficoSerie pontos={s.pontos} unidade={s.unidade} />
          </div>
        ))}
        {!escolhidas.length && <p className="py-8 text-center text-sm text-suave">Escolha um exame acima.</p>}
      </div>
    </div>
  );
}
