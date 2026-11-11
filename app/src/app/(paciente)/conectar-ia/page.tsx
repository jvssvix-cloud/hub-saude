import type { Metadata } from "next";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { connection } from "next/server";
import { Suspense } from "react";
import { Copiar } from "@/components/Copiar";
import { horaBrasilia } from "@/lib/medico";
import { getServidor, rpcServidor, temChaveServidor } from "@/lib/supabase";
import { consentimentoDoPaciente, pacienteAtual } from "@/lib/sessao";

export const metadata: Metadata = { title: "Conectar IA · Hub de Saúde" };

type Conexao = {
  id: string;
  destinatario_nome: string;
  categorias: string[] | null;
  token: string;
  criado_em: string;
  expira_em: string;
  revogado_em: string | null;
};
type Log = { id: number; em: string; permitido: boolean; motivo: string; consentimento: { destinatario_nome: string } | null };

const ASSISTENTES = ["Claude", "ChatGPT", "Gemini", "Outro assistente"];
const CATEGORIAS = [
  { id: "exame", rotulo: "Exames" },
  { id: "vacina", rotulo: "Vacinas" },
  { id: "wearable", rotulo: "Relógio" },
];
const VALIDADES = [
  { id: "7 days", rotulo: "7 dias" },
  { id: "30 days", rotulo: "30 dias" },
  { id: "90 days", rotulo: "90 dias" },
];

// ---------------------------------------------------------------- ações do paciente (servidor, chave secreta)
async function conectar(form: FormData) {
  "use server";
  const nome = String(form.get("assistente") ?? "");
  const validade = String(form.get("validade") ?? "");
  const marcadas = form.getAll("categoria").map(String).filter((c) => CATEGORIAS.some((k) => k.id === c));
  if (!ASSISTENTES.includes(nome) || !VALIDADES.some((v) => v.id === validade) || marcadas.length === 0) return;
  await rpcServidor("criar_consentimento", {
    p_paciente_id: (await pacienteAtual()).id,
    p_destinatario_tipo: "ia",
    p_destinatario_nome: nome,
    p_validade: validade,
    p_categorias: marcadas.length === CATEGORIAS.length ? null : marcadas,
  });
  refresh();
}

async function desconectar(form: FormData) {
  "use server";
  await rpcServidor("revogar_consentimento", { p_id: await consentimentoDoPaciente(form.get("id")) });
  refresh();
}

/** Conectar o assistente de IA do paciente (Claude, ChatGPT, Gemini) ao histórico, pelo conector MCP, com o mesmo consentimento do médico. */
export default function ConectarIA() {
  return (
    <div className="space-y-7 pt-3">
      <section>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">Conectar IA</h1>
        <p className="mt-1 text-[15px] text-suave">
          Leve seus exames para o assistente que você já usa. Você escolhe o que ele pode ler e por quanto tempo, e desconecta
          quando quiser.
        </p>
      </section>
      <Suspense fallback={<p className="text-sm text-suave">Carregando…</p>}>
        <Conteudo />
      </Suspense>
    </div>
  );
}

async function Conteudo() {
  await connection();
  if (!temChaveServidor()) {
    return (
      <p className="rounded-3xl bg-atencao-fundo p-4 text-sm text-atencao">
        Para criar conexões aqui, o servidor precisa da SUPABASE_SERVICE_ROLE_KEY (no .env.local da raiz do repositório ou no
        painel da Vercel).
      </p>
    );
  }
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const local = /^(localhost|127\.0\.0\.1)(:|$)/.test(host);
  const origem = `${h.get("x-forwarded-proto") ?? (local ? "http" : "https")}://${host}`;

  const PACIENTE = encodeURIComponent((await pacienteAtual()).id);
  const [lista, logs] = await Promise.all([
    getServidor<Conexao[]>(
      `consentimento?paciente_id=eq.${PACIENTE}&destinatario_tipo=eq.ia&status=eq.aprovado&select=id,destinatario_nome,categorias,token,criado_em,expira_em,revogado_em&order=criado_em.desc&limit=20`,
    ),
    getServidor<Log[]>(
      `log_acesso?paciente_id=eq.${PACIENTE}&consumidor=eq.mcp&select=id,em,permitido,motivo,consentimento(destinatario_nome)&order=em.desc&limit=6`,
    ),
  ]);
  const agora = new Date().toISOString();
  const ativas = lista.filter((c) => !c.revogado_em && c.expira_em > agora);

  return (
    <>
      {ativas.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-suave">Conectados agora</h2>
          <ul className="space-y-3">
            {ativas.map((c) => (
              <li key={c.id} className="rounded-3xl border border-salvia bg-cartao p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{c.destinatario_nome}</p>
                    <p className="text-[13px] text-suave">
                      Pode ler: {c.categorias ? c.categorias.map(rotulo).join(", ") : "exames, vacinas e relógio"} · até{" "}
                      {horaBrasilia(c.expira_em)}
                    </p>
                  </div>
                  <form action={desconectar}>
                    <input type="hidden" name="id" value={c.id} />
                    <button className="shrink-0 rounded-xl border border-atencao/40 px-3 py-2 text-sm font-semibold text-atencao hover:bg-atencao-fundo">
                      Desconectar
                    </button>
                  </form>
                </div>
                <p className="mb-1.5 mt-3 text-xs font-semibold uppercase tracking-wider text-suave">Endereço do conector</p>
                <Copiar valor={`${origem}/api/mcp/${c.token}`} rotulo={`Endereço do conector para ${c.destinatario_nome}`} />
                <p className="mt-2 text-xs text-suave">
                  Este endereço é a chave de leitura: cole só no seu assistente e não compartilhe com ninguém.
                </p>
              </li>
            ))}
          </ul>
          {local && (
            <p className="mt-2 rounded-2xl bg-bege px-3 py-2 text-xs text-suave">
              Você está no endereço local: Claude e ChatGPT na web só alcançam o app publicado (https). Aqui dá para testar com
              clientes que rodam neste computador.
            </p>
          )}
        </section>
      )}

      <section className="rounded-3xl border border-linha bg-cartao p-4 sm:p-5">
        <h2 className="text-lg font-bold tracking-tight">{ativas.length ? "Conectar outro assistente" : "Nova conexão"}</h2>
        <form action={conectar} className="mt-3 space-y-4">
          <fieldset>
            <legend className="text-sm font-semibold">Qual assistente</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {ASSISTENTES.map((a, k) => (
                <label key={a} className={CHIP}>
                  <input type="radio" name="assistente" value={a} defaultChecked={k === 0} className="accent-[var(--marca)]" />
                  {a}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-semibold">O que ele pode ler</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {CATEGORIAS.map((k) => (
                <label key={k.id} className={CHIP}>
                  <input type="checkbox" name="categoria" value={k.id} defaultChecked className="accent-[var(--marca)]" />
                  {k.rotulo}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-semibold">Por quanto tempo</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {VALIDADES.map((v, k) => (
                <label key={v.id} className={CHIP}>
                  <input type="radio" name="validade" value={v.id} defaultChecked={k === 1} className="accent-[var(--marca)]" />
                  {v.rotulo}
                </label>
              ))}
            </div>
          </fieldset>
          <button className="w-full rounded-xl bg-marca px-4 py-3 font-semibold text-white hover:bg-marca-hover">
            Gerar endereço do conector
          </button>
          <p className="text-xs text-suave">Só leitura: o assistente não altera nem apaga nada no seu histórico.</p>
        </form>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-suave">Como conectar</h2>
        <ol className="divide-y divide-linha overflow-hidden rounded-3xl border border-linha bg-cartao text-sm">
          {[
            ["Gere o endereço", "Escolha o assistente, o que ele pode ler e o prazo."],
            ["Adicione no assistente", "Claude: Configurações > Conectores > Adicionar conector personalizado. ChatGPT: Configurações > Conectores. Cole o endereço."],
            ["Pergunte", "Por exemplo: “Como evoluiu meu colesterol nos últimos anos?” A resposta cita a data e o laboratório de cada número."],
          ].map(([t, d], k) => (
            <li key={t} className="flex gap-3 px-4 py-3">
              <span className="num grid size-6 shrink-0 place-items-center rounded-full bg-marca-fundo text-xs font-bold text-marca">{k + 1}</span>
              <span>
                <span className="block font-semibold">{t}</span>
                <span className="block text-[13px] text-suave">{d}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {logs.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-suave">Últimas leituras por IA</h2>
          <ul className="divide-y divide-linha overflow-hidden rounded-3xl border border-linha bg-cartao text-sm">
            {logs.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className={l.permitido ? "" : "text-atencao"}>
                  <span className="font-semibold">{l.consentimento?.destinatario_nome ?? "Endereço desconhecido"}</span>{" "}
                  {l.permitido ? "leu seu histórico" : `tentou ler (${MOTIVO[l.motivo] ?? l.motivo})`}
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

const CHIP =
  "flex cursor-pointer items-center gap-2 rounded-full border border-linha px-3 py-1.5 text-sm has-[:checked]:border-marca has-[:checked]:bg-marca-fundo has-[:checked]:text-marca";

const MOTIVO: Record<string, string> = {
  revogado: "conexão encerrada",
  expirado: "conexão expirada",
  token_invalido: "endereço inválido",
};

function rotulo(id: string) {
  return (CATEGORIAS.find((k) => k.id === id)?.rotulo ?? id).toLowerCase();
}
