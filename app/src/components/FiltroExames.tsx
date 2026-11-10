"use client";

import { useState, type ReactNode } from "react";
import { LinhaIndice } from "@/components/LinhaIndice";
import { dataBr, linkLaudo, numero, type Fonte } from "@/lib/insights";

/** O mínimo de cada exame que o filtro precisa (montado no servidor, em /exames). */
export type ExameFiltravel = {
  analito: string;
  nome: string;
  unidade: string;
  frase: string;
  alterado: boolean;
  faixa: { min: number | null; max: number | null };
  pontos: { data: string; valor: number; fora: boolean; qualificador: string | null }[];
};

export type TextoFiltravel = { analito: string; nome: string; data: string; texto: string; fora: boolean; fonte: Fonte };

type Status = "todos" | "na_faixa" | "fora" | "outros" | "novos";

/**
 * Filtros da aba Exames: por situação (todos, na faixa, fora, outros, novos) e por data de coleta.
 * Sem filtro, mostra a lista por sistema (children). Com filtro, a lista direta dos exames que batem.
 * "Novos" = exames que vieram no laudo mais recente. Com data escolhida, a situação é a daquele dia.
 */
export function FiltroExames({
  exames, textos, children,
}: {
  exames: ExameFiltravel[];
  textos: TextoFiltravel[];
  children: ReactNode;
}) {
  const [status, setStatus] = useState<Status>("todos");
  const [data, setData] = useState("");

  const datas = [...new Set([...exames.flatMap((e) => e.pontos.map((p) => p.data)), ...textos.map((t) => t.data)])].sort().reverse();
  const maisRecente = datas[0] ?? "";

  // com data escolhida, cada exame vale pelo resultado daquele dia; sem data, pelo último
  const noDia = exames.flatMap((e) => {
    const p = data ? e.pontos.find((x) => x.data === data) : e.pontos[e.pontos.length - 1];
    return p ? [{ e, p, fora: data ? p.fora : e.alterado }] : [];
  });
  const textosNoDia = textos.filter((t) => !data || t.data === data);

  const n: Record<Status, number> = {
    todos: noDia.length + textosNoDia.length,
    na_faixa: noDia.filter((x) => !x.fora).length,
    fora: noDia.filter((x) => x.fora).length,
    outros: textosNoDia.length,
    novos: noDia.filter((x) => x.p.data === maisRecente).length + textosNoDia.filter((t) => t.data === maisRecente).length,
  };

  const opcoes: { id: Status; texto: string }[] = [
    { id: "todos", texto: "Todos" },
    { id: "na_faixa", texto: "Na faixa" },
    { id: "fora", texto: "Fora da faixa" },
    ...(textos.length > 0 ? [{ id: "outros" as const, texto: "Outros" }] : []),
    { id: "novos", texto: "Novos" },
  ];

  const semFiltro = status === "todos" && !data;
  const linhas = noDia.filter(({ p, fora }) =>
    status === "na_faixa" ? !fora : status === "fora" ? fora : status === "novos" ? p.data === maisRecente : status !== "outros",
  );
  const linhasTexto = textosNoDia.filter((t) =>
    status === "outros" || status === "todos" ? true : status === "novos" ? t.data === maisRecente : false,
  );
  linhas.sort((a, b) => Number(b.fora) - Number(a.fora));

  return (
    <div className="space-y-4">
      <div className="space-y-2.5">
        <div role="group" aria-label="Filtrar por situação" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none]">
          {opcoes.map((o) => {
            const ativo = status === o.id;
            return (
              <button
                key={o.id}
                type="button"
                aria-pressed={ativo}
                onClick={() => setStatus(o.id)}
                className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  ativo ? "border-marca bg-marca text-white" : "border-linha bg-cartao text-tinta hover:bg-bege"
                }`}
              >
                {o.texto} <span className={`num font-normal ${ativo ? "text-white/80" : "text-suave"}`}>{n[o.id]}</span>
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-2 text-sm text-suave">
          Data da coleta
          <select
            value={data}
            onChange={(ev) => setData(ev.target.value)}
            className="num rounded-full border border-linha bg-cartao px-3 py-1.5 text-sm font-semibold text-tinta outline-none focus:border-marca"
          >
            <option value="">Todas</option>
            {datas.map((d) => (
              <option key={d} value={d}>
                {dataBr(d)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {semFiltro ? (
        children
      ) : (
        <section>
          <p className="mb-2 text-[13px] text-suave" aria-live="polite">
            {linhas.length + linhasTexto.length} {linhas.length + linhasTexto.length === 1 ? "exame" : "exames"}
            {status === "novos" && maisRecente ? ` do laudo mais recente (${dataBr(maisRecente)})` : ""}
            {data ? ` · coleta de ${dataBr(data)}` : ""}
          </p>
          {linhas.length + linhasTexto.length === 0 ? (
            <p className="rounded-3xl bg-bege px-4 py-5 text-sm text-suave">Nenhum exame com esse filtro.</p>
          ) : (
            <ul className="divide-y divide-linha overflow-hidden rounded-3xl border border-linha bg-cartao">
              {linhas.map(({ e, p, fora }) => (
                <LinhaIndice
                  key={e.analito}
                  href={`/exame/${e.analito}`}
                  titulo={e.nome}
                  frase={
                    data
                      ? `${p.qualificador ?? ""}${numero(p.valor)} ${e.unidade} · ${fora ? "fora da faixa do laudo" : "na faixa"}`
                      : e.frase
                  }
                  fora={fora}
                  valores={e.pontos.map((x) => x.valor)}
                  faixa={e.faixa}
                />
              ))}
              {linhasTexto.map((t) => (
                <li key={t.analito + t.data}>
                  <a href={linkLaudo(t.fonte)} target="_blank" className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-fundo">
                    <span className="min-w-0">
                      <span className="block font-semibold">{t.nome}</span>
                      <span className={`block text-[13px] leading-snug ${t.fora ? "text-atencao" : "text-suave"}`}>
                        {t.texto} · {dataBr(t.data)}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-marca">laudo p. {t.fonte.pagina} ↗</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
