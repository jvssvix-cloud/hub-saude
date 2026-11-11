import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NotaDoMedico } from "@/components/NotaDoMedico";
import { PlanosDoPaciente } from "@/components/PlanosDoPaciente";
import { carregarInsights } from "@/lib/dados";
import { mesAno } from "@/lib/insights";

export const metadata: Metadata = { title: "Plano · Hub de Saúde" };

/** O que fazer agora: as recomendações revisadas pelo médico e os próximos exames de rotina. */
export default async function Plano() {
  const insights = await carregarInsights();
  // próximos exames agrupados pelo mês previsto
  const porMes = new Map<string, string[]>();
  for (const p of insights.proximos) {
    const k = p.previsto.slice(0, 7);
    porMes.set(k, [...(porMes.get(k) ?? []), p.nome.replace(/ \(.*\)$/, "")]);
  }
  const meses = [...porMes.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="space-y-6 pt-3">
      <section>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">Plano</h1>
        <p className="mt-1 text-[15px] text-suave">O que o seu médico recomendou e quando refazer cada exame.</p>
      </section>

      <Suspense fallback={null}>
        <NotaDoMedico vazio={<SemNota />} />
      </Suspense>

      <Suspense fallback={null}>
        <PlanosDoPaciente />
      </Suspense>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-suave">Próximos exames de rotina</h2>
        <ul className="divide-y divide-linha overflow-hidden rounded-3xl border border-linha bg-cartao">
          {meses.map(([mes, nomes]) => (
            <li key={mes} className="px-4 py-3">
              <p className="font-semibold">{mesAno(mes + "-01")}</p>
              <p className="text-[13px] text-suave">{nomes.join(", ")}</p>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-suave">
          Calculado pelo intervalo de cada exame a partir do último resultado. Se o médico pediu antes, vale o que ele pediu.
        </p>
      </section>
    </div>
  );
}

function SemNota() {
  return (
    <section className="rounded-3xl bg-bege p-4 sm:p-5">
      <h2 className="text-lg font-bold tracking-tight">Ainda sem recomendações do médico</h2>
      <p className="mt-1 text-sm text-suave">
        Compartilhe seu histórico com o seu médico. Depois de revisar, ele pode enviar recomendações que aparecem aqui.
      </p>
      <Link href="/compartilhar" className="mt-3 inline-block rounded-xl bg-marca px-4 py-2.5 text-sm font-semibold text-white hover:bg-marca-hover">
        Compartilhar com meu médico
      </Link>
    </section>
  );
}
