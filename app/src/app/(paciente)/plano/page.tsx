import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NotaDoMedico } from "@/components/NotaDoMedico";
import { PlanosDoPaciente } from "@/components/PlanosDoPaciente";
import { meusInsights } from "@/lib/dados";
import { mesAno } from "@/lib/insights";
import type { ExameQueFalta } from "@insights/faltantes";
import { horariosTexto } from "@/lib/checkup";
import { meuPerfil } from "@/lib/perfil";

export const metadata: Metadata = { title: "Plano · Zelo" };

/** O que fazer agora: as recomendações revisadas pelo médico e os próximos exames de rotina. */
export default async function Plano() {
  const [insights, perfil] = await Promise.all([meusInsights(), meuPerfil()]);
  const remedios = perfil?.perfil.remedios_lista ?? [];
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
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-suave">Remédios e lembretes</h2>
        {remedios.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-linha p-4 text-sm text-suave sm:p-5">
            Nenhum remédio de uso contínuo no seu perfil.{" "}
            <Link href="/perfil/editar?bloco=4" className="font-semibold text-marca hover:underline">Adicionar remédio e horários</Link>
          </div>
        ) : (
          <ul className="divide-y divide-linha overflow-hidden rounded-3xl border border-linha bg-cartao">
            {remedios.map((r, k) => (
              <li key={k} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">{[r.nome, r.dose].filter(Boolean).join(" ")}</p>
                  <p className="text-[13px] text-suave">{r.para_que ? `Para ${r.para_que}` : "Uso contínuo"}</p>
                </div>
                <p className="shrink-0 text-right text-sm font-semibold">
                  {r.horarios?.length ? horariosTexto(r.horarios) : <Link href="/perfil/editar?bloco=4" className="text-marca hover:underline">pôr horário</Link>}
                </p>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs text-suave">
          Com os horários, o Zelo lembra você pelo WhatsApp e avisa a família se você não confirmar.{" "}
          <Link href="/whatsapp" className="font-semibold text-marca hover:underline">Ver como funciona</Link>
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-suave">Próximos exames de rotina</h2>
        {meses.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-linha p-4 text-sm text-suave sm:p-5">
            O calendário dos próximos exames sai do intervalo de cada um a partir do último resultado.{" "}
            <Link href="/enviar" className="font-semibold text-marca hover:underline">
              Envie seus exames
            </Link>{" "}
            para ver quando refazer cada um.
          </div>
        ) : (
        <ul className="divide-y divide-linha overflow-hidden rounded-3xl border border-linha bg-cartao">
          {meses.map(([mes, nomes]) => (
            <li key={mes} className="px-4 py-3">
              <p className="font-semibold">{mesAno(mes + "-01")}</p>
              <p className="text-[13px] text-suave">{nomes.join(", ")}</p>
            </li>
          ))}
        </ul>
        )}
        <p className="mt-2 text-xs text-suave">
          Calculado pelo intervalo de cada exame a partir do último resultado. Se o médico pediu antes, vale o que ele pediu.
        </p>
      </section>

      {meses.length > 0 && <ExamesQueFaltam faltam={insights.exames_que_faltam ?? []} />}
    </div>
  );
}

/** Regra 8 (insights/src/faltantes.ts): o que levar ao próximo pedido para o médico avaliar fígado e glicemia. */
function ExamesQueFaltam({ faltam }: { faltam: ExameQueFalta[] }) {
  const lista = faltam.filter((e) => e.prioridade <= 2);
  if (!lista.length) return null;
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-suave">Para levar ao próximo pedido</h2>
      <ul className="divide-y divide-linha overflow-hidden rounded-3xl border border-linha bg-cartao">
        {lista.map((e) => (
          <li key={e.pedido} className="px-4 py-3">
            <p className="font-semibold">{e.nome}</p>
            <p className="text-[13px] text-suave">
              {e.desatualizados.length && !e.nunca_feitos.length
                ? `Último em ${mesAno(e.desatualizados.map((d) => d.ultimo).sort()[0])}.`
                : "Não aparece no seu histórico."}{" "}
              {e.destrava.length
                ? "Seu médico precisa dele para avaliar fígado e glicose."
                : "Ajuda seu médico a avaliar o fígado."}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-suave">
        Exames que as ferramentas de apoio ao seu médico usam e que faltam ou têm mais de 12 meses. Quem decide o que pedir é o médico.
      </p>
    </section>
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
