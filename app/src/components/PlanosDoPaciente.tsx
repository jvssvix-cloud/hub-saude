import Link from "next/link";
import { refresh } from "next/cache";
import { connection } from "next/server";
import { carregarInsights } from "@/lib/dados";
import { seriesCitadas } from "@/lib/insights";
import { horaBrasilia } from "@/lib/medico";
import { escreverServidor, getServidor, temChaveServidor } from "@/lib/supabase";
import { pacienteAtual } from "@/lib/sessao";

type Plano = { id: string; titulo: string; itens: string[]; seguindo: boolean; criado_em: string };

const ID = /^[0-9a-f-]{36}$/;

async function seguir(form: FormData) {
  "use server";
  const id = String(form.get("id"));
  if (!ID.test(id)) return;
  const pid = encodeURIComponent((await pacienteAtual()).id); // a ação confere a sessão de novo
  // um plano por vez: marcar um desmarca os outros
  const marcar = form.get("seguindo") !== "true";
  if (marcar) await escreverServidor("PATCH", `plano_paciente?paciente_id=eq.${pid}&seguindo=is.true`, { seguindo: false });
  await escreverServidor("PATCH", `plano_paciente?id=eq.${id}&paciente_id=eq.${pid}`, { seguindo: marcar });
  refresh();
}

async function apagar(form: FormData) {
  "use server";
  const id = String(form.get("id"));
  if (!ID.test(id)) return;
  const pid = encodeURIComponent((await pacienteAtual()).id);
  await escreverServidor("DELETE", `plano_paciente?id=eq.${id}&paciente_id=eq.${pid}`);
  refresh();
}

/** Planos que o paciente salvou a partir do chat. Cada passo ganha atalhos para os exames que cita. */
export async function PlanosDoPaciente() {
  await connection();
  if (!temChaveServidor()) return null;
  const paciente = await pacienteAtual();
  const planos = await getServidor<Plano[]>(
    `plano_paciente?paciente_id=eq.${encodeURIComponent(paciente.id)}&select=id,titulo,itens,seguindo,criado_em&order=seguindo.desc,criado_em.desc&limit=10`,
  ).catch(() => null);
  if (planos === null) return null; // tabela ainda não existe neste banco

  if (planos.length === 0) {
    return (
      <section className="rounded-3xl border border-dashed border-linha p-4 sm:p-5">
        <h2 className="text-lg font-bold tracking-tight">Seus planos</h2>
        <p className="mt-1 text-sm text-suave">
          Converse sobre os seus exames e toque em “Criar plano com esta conversa”. O plano fica guardado aqui.
        </p>
        <Link href="/conversar" className="mt-3 inline-block rounded-xl bg-marca px-4 py-2.5 text-sm font-semibold text-white hover:bg-marca-hover">
          Conversar
        </Link>
      </section>
    );
  }

  const insights = await carregarInsights(paciente.id);
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-suave">Seus planos</h2>
      <ul className="space-y-3">
        {planos.map((p) => (
          <li key={p.id} className={`rounded-3xl bg-cartao p-4 sm:p-5 ${p.seguindo ? "border-2 border-marca" : "border border-linha"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold leading-snug tracking-tight">{p.titulo}</h3>
              {p.seguindo && <span className="rounded-full bg-marca px-2.5 py-0.5 text-xs font-semibold text-white">Seguindo</span>}
            </div>
            <p className="mt-0.5 text-xs text-suave">
              Criado no chat em {horaBrasilia(p.criado_em)} · gerado por IA, ainda não revisado pelo médico
            </p>
            <ol className="mt-3 space-y-3 text-[15px]">
              {p.itens.map((t, k) => {
                const citados = seriesCitadas(insights, t);
                return (
                  <li key={k} className="flex gap-3">
                    <span className="num mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-marca-fundo text-xs font-bold text-marca">
                      {k + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block">{t}</span>
                      {citados.length > 0 && (
                        <span className="mt-1.5 flex flex-wrap gap-1.5">
                          {citados.map((s) => (
                            <Link
                              key={s.analito}
                              href={`/exame/${s.analito}`}
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold hover:underline ${
                                s.alterado ? "bg-atencao-fundo text-atencao" : "bg-marca-fundo text-marca"
                              }`}
                            >
                              <span aria-hidden className={`size-1.5 rounded-full ${s.alterado ? "bg-fora" : "bg-[var(--ok)]"}`} />
                              {s.nome.replace(/ \(.*\)$/, "")} <span aria-hidden>›</span>
                            </Link>
                          ))}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>
            <form className="mt-4 flex items-center gap-2">
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="seguindo" value={String(p.seguindo)} />
              <button
                formAction={seguir}
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  p.seguindo ? "border border-linha text-tinta hover:bg-bege" : "bg-marca text-white hover:bg-marca-hover"
                }`}
              >
                {p.seguindo ? "Parar de seguir" : "Seguir este plano"}
              </button>
              <button formAction={apagar} className="rounded-xl px-3 py-2 text-sm font-semibold text-suave hover:bg-bege">
                Apagar
              </button>
            </form>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-suave">Planos criados no chat são sugestões a partir dos seus laudos. Mostre ao seu médico antes de mudar a rotina.</p>
    </section>
  );
}
