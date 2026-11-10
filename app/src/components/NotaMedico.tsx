"use client";

import { useActionState } from "react";
import type { EstadoNota } from "@/app/(medico)/medico/acesso/[token]/acoes";

/** Formulário do médico: rascunho editável (uma recomendação por linha) que vai para o app do paciente. */
export function NotaMedico({
  rascunho,
  acao,
}: {
  rascunho: string[];
  acao: (anterior: EstadoNota, form: FormData) => Promise<EstadoNota>;
}) {
  const [estado, enviar, enviando] = useActionState(acao, null);

  return (
    <form action={enviar} className="space-y-3">
      <textarea
        name="itens"
        defaultValue={rascunho.join("\n")}
        rows={Math.max(4, rascunho.length + 1)}
        className="w-full rounded-2xl border border-linha bg-fundo p-3 text-sm leading-relaxed outline-none focus:border-marca"
        aria-label="Recomendações, uma por linha"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-suave">Uma recomendação por linha (até 10). Rascunho gerado por regras: revise antes de enviar.</p>
        <button
          disabled={enviando}
          className="rounded-xl bg-marca px-4 py-2.5 text-sm font-semibold text-white hover:bg-marca-hover disabled:opacity-60"
        >
          {enviando ? "Enviando…" : "Revisar e enviar ao paciente"}
        </button>
      </div>
      {estado?.ok && (
        <p className="rounded-xl bg-marca-fundo px-3 py-2 text-sm font-semibold text-marca">
          Enviado em {estado.enviadoEm}. O paciente vê no app como “Revisado por você”.
        </p>
      )}
      {estado && !estado.ok && <p className="rounded-xl bg-atencao-fundo px-3 py-2 text-sm text-atencao">{estado.erro}</p>}
    </form>
  );
}
