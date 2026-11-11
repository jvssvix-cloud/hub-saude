import type { Metadata } from "next";
import { LinhaIndice as Linha, LinhaSerie } from "@/components/LinhaIndice";
import { meuRelogio, meusInsights } from "@/lib/dados";
import { areasOrdenadas, seriesDaArea } from "@/lib/insights";
import { mediaSemanal } from "@/lib/paciente";

export const metadata: Metadata = { title: "Evolução · Zelo" };

/** Todos os índices, agrupados por tema. Só forma + frase; número e laudo ficam um toque adiante. */
export default async function Evolucao() {
  const insights = await meusInsights();
  const areas = areasOrdenadas(insights);
  const relogio = await meuRelogio();
  const temRitmo = !!relogio?.alertas.some((a) => a.id === "ritmo_irregular" || a.id === "fc_repouso_subindo");

  return (
    <div className="space-y-7 pt-3">
      <section>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">Evolução</h1>
        <p className="mt-1 text-[15px] text-suave">Como cada índice mudou ao longo do tempo. Toque para ver os detalhes.</p>
      </section>

      {relogio && (
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-suave">Do seu relógio · 6 meses</h2>
        <ul className="divide-y divide-linha overflow-hidden rounded-3xl border border-linha bg-cartao">
          <Linha
            href="/relogio"
            titulo="Batimento em repouso"
            frase={temRitmo ? "Mais alto que o seu normal nas últimas semanas" : "No seu normal"}
            fora={temRitmo}
            valores={mediaSemanal(relogio.dias, "fc_repouso")}
            cor="var(--rivio-1)"
          />
          <Linha
            href="/relogio"
            titulo="Sono"
            frase={relogio.alertas.some((a) => a.id === "sono_curto") ? "Noites mais curtas nas últimas semanas" : "No seu normal"}
            fora={relogio.alertas.some((a) => a.id === "sono_curto")}
            valores={mediaSemanal(relogio.dias, "sono_horas")}
            cor="var(--rivio-2)"
          />
          <Linha
            href="/relogio"
            titulo="Passos"
            frase={relogio.alertas.some((a) => a.id === "atividade_caindo") ? "Andando menos que antes" : "No seu normal"}
            fora={relogio.alertas.some((a) => a.id === "atividade_caindo")}
            valores={mediaSemanal(relogio.dias, "passos")}
            cor="var(--rivio-3)"
          />
        </ul>
      </section>
      )}

      {areas.map((area) => {
        const series = seriesDaArea(insights, area);
        if (!series.length) return null;
        return (
          <section key={area.id}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-suave">{area.nome} · exames</h2>
            <ul className="divide-y divide-linha overflow-hidden rounded-3xl border border-linha bg-cartao">
              {series.map((s) => (
                <LinhaSerie key={s.analito} s={s} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
