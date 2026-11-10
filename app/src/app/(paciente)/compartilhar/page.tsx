import type { Metadata } from "next";
import { refresh } from "next/cache";
import { connection } from "next/server";
import { Suspense } from "react";
import { AutoAtualizar } from "@/components/VigiaAcesso";
import { horaBrasilia } from "@/lib/medico";
import { PACIENTE_ID as PACIENTE } from "@/lib/usuario";
import { getServidor, rpcServidor, temChaveServidor } from "@/lib/supabase";

export const metadata: Metadata = { title: "Compartilhar · Hub de Saúde" };


type Consentimento = {
  id: string;
  destinatario_nome: string;
  motivo: string | null;
  status: "pendente" | "aprovado" | "recusado";
  canal: "qr" | "solicitacao";
  categorias: string[] | null;
  validade: string | null;
  criado_em: string;
  expira_em: string;
  revogado_em: string | null;
};
type Log = {
  id: number;
  em: string;
  consumidor: string;
  permitido: boolean;
  motivo: string;
  qtd_observacoes: number;
  consentimento: { destinatario_nome: string } | null;
};

const CATEGORIAS = [
  { id: "exame", rotulo: "Exames" },
  { id: "vacina", rotulo: "Vacinas" },
  { id: "wearable", rotulo: "Relógio" },
];

// ---------------------------------------------------------------- ações do paciente (servidor, chave secreta)
async function aprovar(form: FormData) {
  "use server";
  const marcadas = form.getAll("categoria").map(String);
  await rpcServidor("responder_solicitacao", {
    p_id: String(form.get("id")),
    p_aprovar: true,
    // todas marcadas = sem restrição (null); senão, só as escolhidas
    p_categorias: marcadas.length === CATEGORIAS.length ? null : marcadas,
  });
  refresh();
}

async function recusar(form: FormData) {
  "use server";
  await rpcServidor("responder_solicitacao", { p_id: String(form.get("id")), p_aprovar: false });
  refresh();
}

async function revogar(form: FormData) {
  "use server";
  await rpcServidor("revogar_consentimento", { p_id: String(form.get("id")) });
  refresh();
}

export default function Compartilhar() {
  return (
    <div className="space-y-7 pt-3">
      <section>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">Compartilhar</h1>
        <p className="mt-1 text-[15px] text-suave">
          Seu médico pede acesso pelo seu telefone. Você decide o que ele vê e por quanto tempo, e pode encerrar quando quiser.
        </p>
      </section>
      <Suspense fallback={<p className="text-sm text-suave">Carregando…</p>}>
        <Conteudo />
      </Suspense>
    </div>
  );
}

async function Conteudo() {
  await connection(); // sempre na hora: pedidos e acessos mudam a cada segundo
  if (!temChaveServidor()) {
    return (
      <p className="rounded-3xl bg-atencao-fundo p-4 text-sm text-atencao">
        Para aprovar pedidos aqui, o servidor precisa da SUPABASE_SERVICE_ROLE_KEY (no .env.local da raiz do repositório ou
        no painel da Vercel).
      </p>
    );
  }
  const [lista, logs] = await Promise.all([
    getServidor<Consentimento[]>(
      `consentimento?paciente_id=eq.${PACIENTE}&select=id,destinatario_nome,motivo,status,canal,categorias,validade,criado_em,expira_em,revogado_em&order=criado_em.desc&limit=30`,
    ),
    getServidor<Log[]>(
      `log_acesso?paciente_id=eq.${PACIENTE}&select=id,em,consumidor,permitido,motivo,qtd_observacoes,consentimento(destinatario_nome)&order=em.desc&limit=8`,
    ),
  ]);
  const agora = new Date().toISOString();
  const vivo = (c: Consentimento) => !c.revogado_em && c.expira_em > agora;
  const pendentes = lista.filter((c) => c.status === "pendente" && vivo(c));
  const ativos = lista.filter((c) => c.status === "aprovado" && vivo(c));

  return (
    <>
      <AutoAtualizar segundos={3} />

      {pendentes.map((c) => (
        <section key={c.id} className="rounded-3xl border-2 border-marca bg-cartao p-4 sm:p-5">
          <p className="text-sm font-semibold text-marca">Novo pedido de acesso</p>
          <h2 className="mt-1 text-xl font-bold leading-snug">{c.destinatario_nome} quer ver seu histórico</h2>
          <p className="mt-1 text-sm text-suave">
            {c.motivo ? `${c.motivo} · ` : ""}por {duracao(c.validade)} · pedido às {horaBrasilia(c.criado_em).split(" às ")[1]}
          </p>
          <form className="mt-4 space-y-4">
            <input type="hidden" name="id" value={c.id} />
            <fieldset>
              <legend className="text-sm font-semibold">O que compartilhar</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {CATEGORIAS.map((k) => (
                  <label key={k.id} className="flex cursor-pointer items-center gap-2 rounded-full border border-linha px-3 py-1.5 text-sm has-[:checked]:border-marca has-[:checked]:bg-marca-fundo has-[:checked]:text-marca">
                    <input type="checkbox" name="categoria" value={k.id} defaultChecked className="accent-[var(--marca)]" />
                    {k.rotulo}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid grid-cols-2 gap-2">
              <button formAction={recusar} className="rounded-xl border border-linha px-4 py-3 font-semibold text-suave hover:bg-bege">
                Recusar
              </button>
              <button formAction={aprovar} className="rounded-xl bg-marca px-4 py-3 font-semibold text-white hover:bg-marca-hover">
                Autorizar
              </button>
            </div>
          </form>
        </section>
      ))}

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-suave">Quem pode ver agora</h2>
        {ativos.length === 0 ? (
          <p className="rounded-3xl bg-bege p-4 text-sm text-suave">Ninguém. Seu histórico só é aberto com a sua autorização.</p>
        ) : (
          <ul className="divide-y divide-linha overflow-hidden rounded-3xl border border-linha bg-cartao">
            {ativos.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0">
                  <span className="block font-semibold">{c.destinatario_nome}</span>
                  <span className="block text-[13px] text-suave">
                    {c.categorias ? c.categorias.map(rotulo).join(", ") : "Tudo"} · até {horaBrasilia(c.expira_em)}
                  </span>
                </span>
                <form action={revogar}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="shrink-0 rounded-xl border border-atencao/40 px-3 py-2 text-sm font-semibold text-atencao hover:bg-atencao-fundo">
                    Encerrar acesso
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {logs.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-suave">Últimos acessos</h2>
          <ul className="divide-y divide-linha overflow-hidden rounded-3xl border border-linha bg-cartao text-sm">
            {logs.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="min-w-0">
                  <span className="block font-semibold">{l.consentimento?.destinatario_nome ?? "Link desconhecido"}</span>
                  <span className={`block text-[13px] ${l.permitido ? "text-suave" : "text-atencao"}`}>
                    {l.permitido ? `Viu seu histórico (${l.qtd_observacoes} registros)` : `Tentou abrir: ${MOTIVO[l.motivo] ?? l.motivo}`}
                  </span>
                </span>
                <span className="num shrink-0 text-[13px] text-suave">{horaBrasilia(l.em)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

const MOTIVO: Record<string, string> = {
  revogado: "acesso já encerrado",
  expirado: "acesso expirado",
  recusado: "pedido recusado",
  token_invalido: "link inválido",
};

function rotulo(id: string) {
  return CATEGORIAS.find((k) => k.id === id)?.rotulo ?? id;
}

/** "24:00:00" -> "24 horas"; "2 days" -> "2 dias" */
function duracao(v: string | null): string {
  if (!v) return "24 horas";
  const h = v.match(/^(\d+):00:00$/);
  if (h) return `${Number(h[1])} horas`;
  const d = v.match(/^(\d+) days?/);
  return d ? `${d[1]} dias` : v;
}
