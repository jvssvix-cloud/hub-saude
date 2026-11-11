import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { rpcPublica } from "@/lib/supabase";

export const metadata: Metadata = { title: "Médico · Zelo" };

async function solicitar(form: FormData) {
  "use server";
  const telefone = String(form.get("telefone") ?? "");
  const nome = String(form.get("nome") ?? "").trim() || "Médico(a)";
  const motivo = String(form.get("motivo") ?? "").trim() || null;
  const r = await rpcPublica<{ token?: string; erro?: string }>("solicitar_acesso", {
    p_telefone: telefone,
    p_destinatario_nome: nome,
    p_motivo: motivo,
  });
  if (!r.token) redirect("/medico?erro=telefone");
  redirect(`/medico/acesso/${r.token}`);
}

/** Pedido de acesso: o médico (ou a secretária) digita o telefone; o paciente aprova no app dele. */
export default function Medico({ searchParams }: PageProps<"/medico">) {
  return (
    <div className="mx-auto grid max-w-4xl gap-8 pt-6 md:grid-cols-[1.1fr_1fr]">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wider text-suave">Para médicos</p>
        <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight">
          O histórico completo do seu paciente, com a autorização dele
        </h1>
        <p className="mt-3 text-suave">
          Exames de vários laboratórios e anos, dados do relógio e as correlações entre eles, numa tela só. Cada
          número leva ao laudo original.
        </p>
        <ol className="mt-6 space-y-3 text-sm">
          {[
            ["Peça o acesso", "Digite o telefone que o paciente cadastrou no app."],
            ["O paciente aprova", "Ele vê quem pede, o motivo e por quanto tempo, e pode limitar o que compartilha."],
            ["Você vê o histórico", "Por 24 horas. O paciente pode encerrar a qualquer momento, e cada acesso fica registrado."],
          ].map(([t, d], k) => (
            <li key={t} className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-marca-fundo text-sm font-bold text-marca">{k + 1}</span>
              <span>
                <span className="block font-semibold">{t}</span>
                <span className="text-suave">{d}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <form action={solicitar} className="h-fit space-y-4 rounded-3xl border border-linha bg-cartao p-6">
        <h2 className="text-lg font-bold">Solicitar acesso</h2>
        <label className="block">
          <span className="text-sm font-semibold">Telefone do paciente</span>
          <input
            name="telefone"
            required
            inputMode="tel"
            placeholder="(11) 98765-4321"
            className="mt-1 w-full rounded-xl border border-linha bg-fundo px-3 py-2.5 outline-none focus:border-marca"
          />
          <Suspense>
            <ErroTelefone searchParams={searchParams} />
          </Suspense>
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Seu nome</span>
          <input
            name="nome"
            required
            placeholder="Dra. Ana Lima (cardiologia)"
            className="mt-1 w-full rounded-xl border border-linha bg-fundo px-3 py-2.5 outline-none focus:border-marca"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Motivo</span>
          <input
            name="motivo"
            placeholder="Consulta de 14/11"
            className="mt-1 w-full rounded-xl border border-linha bg-fundo px-3 py-2.5 outline-none focus:border-marca"
          />
        </label>
        <button className="w-full rounded-xl bg-marca px-4 py-3 font-semibold text-white transition-colors hover:bg-marca-hover">
          Pedir acesso ao paciente
        </button>
        <p className="text-xs text-suave">Demonstração: o telefone do Roberto (fictício) é (11) 98765-4321.</p>
      </form>
    </div>
  );
}

async function ErroTelefone({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if ((await searchParams).erro !== "telefone") return null;
  return <span className="mt-1 block text-sm text-atencao">Confira o telefone, com DDD.</span>;
}
