import Link from "next/link";
import { alertasOrdenados, dataHoraBr, inteiro, type Relogio } from "@/lib/relogio";

/** Entrada da tela do relógio na Início: o alerta mais importante + a última sincronização. */
export function CartaoRelogio({ relogio }: { relogio: Relogio }) {
  const alertas = alertasOrdenados(relogio);
  const principal = alertas[0];
  const atencao = principal?.nivel === "atencao";
  const r = relogio.resumo;

  return (
    <Link
      href="/relogio"
      className={`block rounded-2xl border p-4 transition-colors hover:border-marca ${
        atencao ? "border-atencao/30 bg-cartao" : "border-linha bg-cartao"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Relógio</h2>
          <p className="text-xs text-suave">Sincronizado {dataHoraBr(relogio.ultima_sincronizacao)}</p>
        </div>
        {alertas.length > 0 && (
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              atencao ? "bg-atencao-fundo text-atencao" : "bg-marca-fundo text-marca"
            }`}
          >
            {alertas.length === 1 ? "1 alerta" : `${alertas.length} alertas`}
          </span>
        )}
      </div>
      {principal && <p className={`mt-3 text-sm ${atencao ? "font-medium text-atencao" : ""}`}>{principal.motivo}</p>}
      <p className="num mt-2 flex flex-wrap gap-x-4 text-sm text-suave">
        <span>FC repouso {inteiro(r.fc_repouso.atual_14d)} bpm</span>
        <span>{r.eventos_ritmo_14d} avisos de ritmo em 14 dias</span>
        <span className="text-marca">Ver relógio ›</span>
      </p>
    </Link>
  );
}
