"use client";

import { useState } from "react";

/**
 * Botão "Conectar" de cada fonte. No app do Zelo para celular ele abre a autorização do sistema (HealthKit no iPhone,
 * Health Connect no Android). Na web não há como ler o relógio: o toque explica isso, sem fingir que conectou.
 */
export function BotaoConectar({ fonte }: { fonte: string }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="rounded-xl bg-marca px-4 py-2 text-sm font-semibold text-white hover:bg-marca-hover"
      >
        Conectar
      </button>
      {aberto && (
        <p role="status" className="mt-3 rounded-2xl bg-bege px-3 py-2 text-sm">
          A conexão com o {fonte} acontece no <strong>app do Zelo para celular</strong>: este botão abre a tela do próprio
          celular onde você escolhe o que liberar. Na versão web ainda não dá para ler o relógio.
        </p>
      )}
    </div>
  );
}
