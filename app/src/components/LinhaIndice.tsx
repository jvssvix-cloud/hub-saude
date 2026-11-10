import Link from "next/link";
import { MiniCurva } from "@/components/MiniCurva";
import type { Serie } from "@/lib/insights";
import { fraseSerie } from "@/lib/paciente";

/** Uma linha de lista: nome + frase curta + minicurva. Usada em Evolução e na tela de cada sistema. */
export function LinhaIndice({
  href, titulo, frase, fora, valores, faixa, cor,
}: {
  href: string;
  titulo: string;
  frase: string;
  fora: boolean;
  valores: number[];
  faixa?: { min: number | null; max: number | null };
  cor?: string;
}) {
  return (
    <li>
      <Link href={href} className="grid grid-cols-[minmax(0,1fr)_96px_auto] items-center gap-3 px-4 py-3 hover:bg-fundo">
        <span className="min-w-0">
          <span className="block font-semibold">{titulo}</span>
          <span className={`block text-[13px] leading-snug ${fora ? "text-atencao" : "text-suave"}`}>{frase}</span>
        </span>
        <MiniCurva valores={valores} faixa={faixa} destaqueFora={fora} cor={cor} altura={44} largura={110} />
        <span aria-hidden className="text-suave">›</span>
      </Link>
    </li>
  );
}

export function LinhaSerie({ s }: { s: Serie }) {
  return (
    <LinhaIndice
      href={`/exame/${s.analito}`}
      titulo={s.nome}
      frase={fraseSerie(s)}
      fora={s.alterado}
      valores={s.pontos.map((p) => p.valor)}
      faixa={{ min: s.ultimo.ref_min, max: s.ultimo.ref_max }}
    />
  );
}

/** Barra fina dividida: verde-sálvia = na faixa, laranja = fora. */
export function BarraContagem({ ok, fora, grossa = false }: { ok: number; fora: number; grossa?: boolean }) {
  const total = ok + fora || 1;
  return (
    <span className={`flex w-full overflow-hidden rounded-full bg-bege ${grossa ? "h-3 gap-1" : "h-1.5 gap-0.5"}`} aria-hidden>
      {ok > 0 && <span className="rounded-full bg-[var(--ok)]" style={{ width: `${(ok / total) * 100}%` }} />}
      {fora > 0 && <span className="rounded-full bg-fora" style={{ width: `${(fora / total) * 100}%` }} />}
    </span>
  );
}
