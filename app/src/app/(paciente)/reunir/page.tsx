import type { Metadata } from "next";
import Link from "next/link";
import { EnviarExame } from "@/components/EnviarExame";
import { envioLigado } from "@/lib/envio";
import { meuPerfil } from "@/lib/perfil";
import {
  areasPara, contexto, enviadosNaArea, motivos, proximaArea, type AreaColeta, type DocResumo,
} from "@/lib/reunir";
import { pacienteAtual } from "@/lib/sessao";
import { getServidor } from "@/lib/supabase";
import type { SituacaoColeta } from "../../../../../lib/types";
import { responderArea, reverArea } from "./acoes";

export const metadata: Metadata = { title: "Reunir meus exames · Zelo" };

const SITUACAO_TEXTO: Record<SituacaoColeta, string> = { enviado: "Enviado", nao_tenho: "Não tenho", pulado: "Pulado" };
const anos = (docs: DocResumo[]) => {
  const a = docs.map((d) => d.data?.slice(0, 4)).filter(Boolean).sort();
  return a.length ? (a[0] === a[a.length - 1] ? ` de ${a[0]}` : ` de ${a[0]} a ${a[a.length - 1]}`) : "";
};

/**
 * Reunir meus exames: o passo a passo, UMA ÁREA POR TELA (sangue, coração, estômago e intestino...). Cada área diz o
 * que procurar na pasta e por que (regras de lib/reunir.ts sobre o perfil). "Enviar", "Não tenho" ou "Pular";
 * a pessoa sai e volta de onde parou (perfil_saude.coleta). ?area=<id> abre uma área específica.
 */
export default async function Reunir({ searchParams }: PageProps<"/reunir">) {
  const p = await pacienteAtual();
  const perfil = await meuPerfil();
  if (!perfil) {
    return <p className="pt-6 text-suave">Não conseguimos carregar o seu perfil agora. Tente de novo em instantes.</p>;
  }
  const ctx = contexto(perfil.cad, perfil.perfil);
  const areas = areasPara(ctx);
  const coleta = perfil.perfil.coleta ?? {};
  const docs = await getServidor<DocResumo[]>(`documento?paciente_id=eq.${encodeURIComponent(p.id)}&select=*`).catch(() => []);

  const pedida = (await searchParams).area;
  const area = areas.find((a) => a.id === pedida) ?? proximaArea(areas, coleta);
  const respondidas = areas.filter((a) => coleta[a.id]).length;

  return (
    <div className="space-y-6 pt-3">
      <section>
        <p className="text-sm text-suave">Reunir meus exames</p>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">{area ? area.titulo : "Tudo revisado"}</h1>
        <div className="mt-3 flex gap-1" aria-hidden>
          {areas.map((a) => (
            <span
              key={a.id}
              className={`h-1.5 flex-1 rounded-full ${
                a.id === area?.id ? "bg-salvia" : coleta[a.id] === "enviado" ? "bg-marca" : coleta[a.id] ? "bg-bege-forte" : "bg-bege"
              }`}
            />
          ))}
        </div>
        <p className="mt-1.5 text-xs font-semibold text-suave">
          {area ? `Área ${areas.indexOf(area) + 1} de ${areas.length}` : `${respondidas} de ${areas.length} áreas`}
          {" · "}uma área por vez, no seu ritmo
        </p>
      </section>

      {area ? <PassoArea area={area} motivos={motivos(area, ctx)} docs={enviadosNaArea(area, docs)} situacao={coleta[area.id]} /> : null}

      <Resumo areas={areas} atual={area} coleta={coleta} docs={docs} />
    </div>
  );
}

function PassoArea({
  area, motivos: porque, docs, situacao,
}: { area: AreaColeta; motivos: string[]; docs: DocResumo[]; situacao?: SituacaoColeta }) {
  const naoTenho = responderArea.bind(null, area.id, "nao_tenho");
  const pular = responderArea.bind(null, area.id, "pulado");
  const seguir = responderArea.bind(null, area.id, "enviado");
  return (
    <>
      <section className="rounded-3xl border border-linha bg-cartao p-5">
        <p className="text-[15px] text-suave">{area.sub}</p>
        <h2 className="mt-4 text-sm font-semibold uppercase tracking-wider text-suave">Procure na sua pasta</h2>
        <ul className="mt-2 flex flex-wrap gap-2">
          {area.procurar.map((x) => (
            <li key={x} className="rounded-full bg-bege px-3 py-1.5 text-sm font-semibold">
              {x}
            </li>
          ))}
        </ul>
        {porque.length ? (
          <>
            <h2 className="mt-5 text-sm font-semibold uppercase tracking-wider text-suave">Por que procurar</h2>
            <ul className="mt-2 space-y-1.5 text-[15px]">
              {porque.map((m) => (
                <li key={m} className="border-l-2 border-salvia pl-3">
                  {m}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <p className="mt-5 rounded-2xl bg-marca-fundo px-4 py-3 text-sm">
          {docs.length ? (
            <>
              <span className="font-semibold text-marca">Já no Zelo:</span> {docs.length}{" "}
              {docs.length === 1 ? "documento" : "documentos"}
              {anos(docs)}.
            </>
          ) : (
            <span className="text-suave">Nenhum documento desta área no Zelo ainda.</span>
          )}
        </p>
      </section>

      {envioLigado() ? (
        <EnviarExame area={area.id} />
      ) : (
        <p className="rounded-3xl border border-linha bg-cartao p-5 text-suave">O envio de exames está desligado no momento.</p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {situacao === "enviado" || docs.length ? (
          <form action={seguir} className="flex-1">
            <button className="w-full rounded-full bg-marca px-5 py-3 font-semibold text-white hover:bg-marca-hover">
              Terminei esta área ›
            </button>
          </form>
        ) : (
          <form action={naoTenho} className="flex-1">
            <button className="w-full rounded-full border border-linha bg-cartao px-5 py-3 font-semibold text-marca hover:border-salvia">
              Não tenho exames desta área
            </button>
          </form>
        )}
        <form action={pular}>
          <button className="w-full rounded-full px-5 py-3 font-semibold text-suave hover:text-tinta">Pular por agora</button>
        </form>
      </div>
    </>
  );
}

function Resumo({
  areas, atual, coleta, docs,
}: { areas: AreaColeta[]; atual: AreaColeta | null; coleta: Partial<Record<string, SituacaoColeta>>; docs: DocResumo[] }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-suave">{atual ? "Todas as áreas" : "Suas áreas"}</h2>
      {!atual && (
        <p className="mb-3 text-[15px] text-suave">
          Você passou por todas. Achou mais algum exame? Abra a área e envie quando quiser.{" "}
          <Link href="/" className="font-semibold text-marca">
            Ver meu histórico ›
          </Link>
        </p>
      )}
      <ul className="divide-y divide-linha overflow-hidden rounded-3xl border border-linha bg-cartao">
        {areas.map((a) => {
          const n = enviadosNaArea(a, docs).length;
          const s = coleta[a.id];
          return (
            <li key={a.id} className={a.id === atual?.id ? "bg-marca-fundo" : ""}>
              <form action={reverArea.bind(null, a.id)}>
                <button className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-fundo">
                  <span className="min-w-0">
                    <span className="block font-semibold">{a.titulo}</span>
                    <span className="block text-[13px] text-suave">
                      {n ? `${n} ${n === 1 ? "documento" : "documentos"} no Zelo` : "nenhum documento ainda"}
                    </span>
                  </span>
                  <span className={`shrink-0 text-xs font-semibold ${s === "enviado" ? "text-marca" : "text-suave"}`}>
                    {a.id === atual?.id ? "agora" : s ? SITUACAO_TEXTO[s] : "a fazer"} ›
                  </span>
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
