import type { Area, Serie } from "@/lib/insights";

const STATUS: Record<Area["status"], { texto: string; classe: string }> = {
  atencao: { texto: "Atenção", classe: "bg-atencao-fundo text-atencao" },
  em_dia: { texto: "Em dia", classe: "bg-ok-fundo text-ok" },
  sem_dados_recentes: { texto: "Sem dados recentes", classe: "bg-linha text-suave" },
};

export function SeloStatus({ status }: { status: Area["status"] }) {
  const s = STATUS[status];
  return <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.classe}`}>{s.texto}</span>;
}

/** Seta da tendência: só aparece quando a regra de tendência detectou subida/queda consistente. */
export function SetaTendencia({ serie }: { serie: Serie }) {
  const d = serie.tendencia?.direcao;
  if (!d || d === "estavel") return null;
  return (
    <span aria-label={d === "subindo" ? "subindo" : "caindo"} className="text-suave">
      {d === "subindo" ? "↗" : "↘"}
    </span>
  );
}

export function AvisoNaoDiagnostico() {
  return (
    <p className="mt-8 text-center text-xs text-suave">
      Gerado por regras a partir dos laudos. Não é diagnóstico: leve ao seu médico.
    </p>
  );
}
