import { connection } from "next/server";
import { horaBrasilia } from "@/lib/medico";
import { PACIENTE_ID } from "@/lib/usuario";
import { getServidor, temChaveServidor } from "@/lib/supabase";

type Nota = { id: string; autor_nome: string; itens: string[]; criado_em: string };

/** A última nota que um médico revisou e enviou pelo painel. Lida na hora (fora do cache da página). */
export async function NotaDoMedico({ vazio = null }: { vazio?: React.ReactNode } = {}) {
  await connection();
  if (!temChaveServidor()) return vazio;
  const [nota] = await getServidor<Nota[]>(
    `nota_medico?paciente_id=eq.${PACIENTE_ID}&select=id,autor_nome,itens,criado_em&order=criado_em.desc&limit=1`,
  ).catch(() => [] as Nota[]);
  if (!nota) return vazio;

  return (
    <section className="rounded-3xl border border-salvia bg-cartao p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold tracking-tight">Recomendações do seu médico</h2>
        <span className="rounded-full bg-marca-fundo px-3 py-1 text-xs font-semibold text-marca">
          ✓ Revisado por {nota.autor_nome} · {horaBrasilia(nota.criado_em)}
        </span>
      </div>
      <ul className="mt-3 space-y-2 text-[15px]">
        {nota.itens.map((t, k) => (
          <li key={k} className="flex gap-2.5">
            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-marca" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
