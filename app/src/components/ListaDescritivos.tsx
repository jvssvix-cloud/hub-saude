/**
 * Lista de laudos descritivos (ECG, eco, endoscopia, imagem): exame, área, local e data, e a conclusão COPIADA do
 * laudo com o link para a página dela no original. Usada em Documentos (paciente) e na visão do médico (com o token).
 */
import { AREA_NOME, nomeExame, type LaudoDescritivo } from "@/lib/descritivos";
import { dataBr, linkLaudo } from "@/lib/insights";
import { nomeLab } from "@/lib/documentos";

export function ListaDescritivos({ lista, token }: { lista: LaudoDescritivo[]; token?: string }) {
  return (
    <ul className="divide-y divide-linha overflow-hidden rounded-3xl border border-linha bg-cartao">
      {lista.map((l) => (
        <li key={l.id} className="px-4 py-3.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 font-semibold">{nomeExame(l.exame_nome)}</span>
            <span className="num shrink-0 text-sm text-suave">{l.data ? dataBr(l.data) : "sem data"}</span>
          </div>
          <p className="text-[13px] text-suave">
            {AREA_NOME[l.area ?? ""] ?? "Outros exames"}
            {l.emissor ? ` · ${nomeLab(l.emissor)}` : ""}
          </p>
          {l.conclusao ? (
            <blockquote className="mt-2 whitespace-pre-line border-l-2 border-salvia pl-3 text-[15px]">{l.conclusao}</blockquote>
          ) : null}
          {l.arquivo ? (
            <a
              href={linkLaudo({ arquivo: l.arquivo, pagina: l.conclusao_pagina ?? 1 }, token)}
              target="_blank"
              className="mt-2 inline-block text-xs font-semibold text-marca hover:underline"
            >
              Conclusão na p. {l.conclusao_pagina ?? 1} do original ↗
            </a>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
