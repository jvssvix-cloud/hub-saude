"use client";

import { useState } from "react";

/** Campo só de leitura com botão "Copiar" (endereço do conector, por exemplo). */
export function Copiar({ valor, rotulo }: { valor: string; rotulo: string }) {
  const [copiado, setCopiado] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // sem permissão de área de transferência: o campo continua selecionável
    }
  }
  return (
    <div className="flex items-stretch gap-2">
      <input
        readOnly
        value={valor}
        aria-label={rotulo}
        onFocus={(e) => e.currentTarget.select()}
        className="num min-w-0 flex-1 rounded-xl border border-linha bg-fundo px-3 py-2 text-[13px] text-tinta outline-none focus:border-marca"
      />
      <button
        type="button"
        onClick={copiar}
        className="shrink-0 rounded-xl bg-marca px-3.5 py-2 text-sm font-semibold text-white hover:bg-marca-hover"
      >
        <span aria-live="polite">{copiado ? "Copiado ✓" : "Copiar"}</span>
      </button>
    </div>
  );
}
