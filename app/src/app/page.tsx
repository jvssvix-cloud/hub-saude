import Link from "next/link";
import { CartaoRelogio } from "@/components/CartaoRelogio";
import { AvisoNaoDiagnostico, SeloStatus, SetaTendencia } from "@/components/ui";
import {
  areasOrdenadas, dataBr, idade, insights, linkLaudo, mesAno, numero, serie, seriesDaArea,
} from "@/lib/insights";

export default function Inicio() {
  const { paciente, periodo, hoje, repeticoes } = insights;
  const areas = areasOrdenadas();
  const emAtencao = areas.filter((a) => a.status === "atencao");

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm text-suave">Olá,</p>
        <h1 className="text-2xl font-semibold tracking-tight">{paciente.nome.split(" ")[0]}</h1>
        <p className="mt-1 text-sm text-suave">
          {idade(paciente.nascimento, hoje)} anos · {periodo.laudos} laudos de {periodo.laboratorios.length}{" "}
          laboratórios · {mesAno(periodo.inicio)} a {mesAno(periodo.fim)}
        </p>
      </section>

      {emAtencao.length > 0 && (
        <section className="rounded-2xl border border-atencao/25 bg-atencao-fundo p-4">
          <h2 className="font-semibold text-atencao">
            {emAtencao.length === 1 ? "1 área para levar ao médico" : `${emAtencao.length} áreas para levar ao médico`}
          </h2>
          <p className="mt-1 text-sm text-tinta/80">
            {emAtencao.map((a) => a.nome).join(", ")}. Cada ponto abaixo mostra o número, a referência do laudo e
            de onde ele veio.
          </p>
        </section>
      )}

      <CartaoRelogio />

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-suave">Suas áreas</h2>
        {areas.map((area) => {
          const series = seriesDaArea(area);
          return (
            <article key={area.id} className="rounded-2xl border border-linha bg-cartao p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{area.nome}</h3>
                  <p className="text-xs text-suave">Último exame em {dataBr(area.ultimo_exame)}</p>
                </div>
                <SeloStatus status={area.status} />
              </div>

              {area.status === "atencao" && (
                <ul className="mt-3 space-y-1.5 text-sm">
                  {area.motivos.map((m) => (
                    <li key={m} className="flex gap-2">
                      <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-atencao" />
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              )}

              {series.length > 0 && (
                <ul className="mt-3 divide-y divide-linha border-t border-linha">
                  {series.map((s) => (
                    <li key={s.analito}>
                      <Link
                        href={`/exame/${s.analito}`}
                        className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-marca"
                      >
                        <span>{s.nome}</span>
                        <span className="num flex items-center gap-2">
                          <span className={s.alterado ? "font-semibold text-fora" : ""}>
                            {s.ultimo.qualificador ?? ""}
                            {numero(s.ultimo.valor)} <span className="font-normal text-suave">{s.unidade}</span>
                          </span>
                          <SetaTendencia serie={s} />
                          <span aria-hidden className="text-suave">›</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </section>

      {repeticoes.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-suave">Exames repetidos</h2>
          {repeticoes.map((r) => (
            <article key={r.de.laudo_id + r.para.laudo_id} className="rounded-2xl border border-linha bg-cartao p-4 text-sm">
              <p className="font-medium">
                Refeitos {r.dias} dias depois: {r.analitos.map((a) => serie(a)?.nome ?? a).join(", ")}
              </p>
              <p className="mt-1 text-suave">
                Com o histórico num lugar só, o médico teria visto o exame anterior.
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                <a className="text-marca underline-offset-2 hover:underline" href={linkLaudo(r.de)} target="_blank">
                  {r.de.laboratorio}, {dataBr(r.de.data)}
                </a>
                <a className="text-marca underline-offset-2 hover:underline" href={linkLaudo(r.para)} target="_blank">
                  {r.para.laboratorio}, {dataBr(r.para.data)}
                </a>
              </div>
            </article>
          ))}
        </section>
      )}

      <AvisoNaoDiagnostico />
    </div>
  );
}
