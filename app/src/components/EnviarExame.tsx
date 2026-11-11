"use client";
/**
 * Tela de envio: escolher arquivo -> (foto reduzida no navegador) -> /api/enviar lê -> prévia -> Salvar ou Descartar.
 * Nenhum dado da prévia volta ao servidor: o "Salvar" manda só o id do envio.
 */
import Link from "next/link";
import { useRef, useState } from "react";
import { descartar, salvar } from "@/app/(paciente)/enviar/acoes";
import type { Previa } from "@/lib/envio";

type Estado =
  | { fase: "escolher"; erro?: string }
  | { fase: "lendo"; nome: string }
  | { fase: "previa"; previa: Previa; erro?: string; ocupado?: "salvar" | "descartar" }
  | { fase: "salvo"; exames: number; doses: number };

const TAMANHO_MAX = 4 * 1024 * 1024;
const LADO_MAX = 2000;

/** Foto do celular costuma ter 3-8 MB: reduz para JPEG (lado maior 2000 px), o que também barateia a leitura. */
async function prepararArquivo(f: File): Promise<File> {
  if (f.type === "application/pdf") return f;
  const pronta = ["image/jpeg", "image/png", "image/webp"].includes(f.type) && f.size <= 1.5 * 1024 * 1024;
  if (pronta) return f;
  const img = await createImageBitmap(f);
  const escala = Math.min(1, LADO_MAX / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * escala);
  canvas.height = Math.round(img.height * escala);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.85));
  if (!blob) throw new Error("não deu para converter a foto");
  return new File([blob], f.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}

const dataBr = (iso: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "sem data");
const TIPO: Record<Previa["tipo"], string> = {
  laudo_exame: "Laudo de exame",
  carteira_vacinacao: "Carteira de vacinação",
  outro: "Documento não reconhecido",
};

export function EnviarExame() {
  const [estado, setEstado] = useState<Estado>({ fase: "escolher" });
  const entrada = useRef<HTMLInputElement>(null);

  async function enviar(f: File | undefined) {
    if (!f) return;
    setEstado({ fase: "lendo", nome: f.name });
    try {
      const arquivo = await prepararArquivo(f);
      if (arquivo.size > TAMANHO_MAX) throw new Error("O arquivo passa de 4 MB. Envie um PDF menor ou uma foto.");
      const form = new FormData();
      form.append("arquivo", arquivo);
      const r = await fetch("/api/enviar", { method: "POST", body: form });
      const corpo = await r.json().catch(() => null);
      if (!r.ok) throw new Error(corpo?.mensagem ?? "Não conseguimos ler este documento.");
      setEstado({ fase: "previa", previa: corpo as Previa });
    } catch (e) {
      setEstado({ fase: "escolher", erro: e instanceof Error ? e.message : "Algo deu errado. Tente de novo." });
    } finally {
      if (entrada.current) entrada.current.value = "";
    }
  }

  if (estado.fase === "escolher" || estado.fase === "lendo") {
    const lendo = estado.fase === "lendo";
    return (
      <div className="space-y-3">
        <label
          className={`flex flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-salvia bg-cartao px-5 py-10 text-center transition-colors ${
            lendo ? "opacity-70" : "cursor-pointer hover:bg-marca-fundo"
          }`}
        >
          {lendo ? (
            <>
              <span aria-hidden className="size-8 animate-spin rounded-full border-4 border-marca-fundo border-t-marca" />
              <span className="font-bold">Lendo o exame…</span>
              <span className="text-sm text-suave">Costuma levar até 1 minuto. {estado.nome}</span>
            </>
          ) : (
            <>
              <span aria-hidden className="grid size-12 place-items-center rounded-full bg-marca-fundo text-2xl text-marca">+</span>
              <span className="font-bold">Escolher PDF ou foto</span>
              <span className="text-sm text-suave">No celular, dá para tirar a foto na hora. Até 4 MB.</span>
            </>
          )}
          <input
            ref={entrada}
            type="file"
            accept="application/pdf,image/*"
            className="sr-only"
            disabled={lendo}
            onChange={(e) => enviar(e.target.files?.[0])}
          />
        </label>
        {estado.fase === "escolher" && estado.erro ? (
          <p role="alert" className="rounded-2xl bg-atencao-fundo px-4 py-3 text-sm text-atencao">
            {estado.erro}
          </p>
        ) : null}
        <p className="text-center text-xs text-suave">
          A leitura é feita por IA e pode errar: você confere tudo antes de salvar. Não é diagnóstico.
        </p>
      </div>
    );
  }

  if (estado.fase === "salvo") {
    const n = estado.exames || estado.doses;
    const oque = estado.exames ? (n === 1 ? "resultado" : "resultados") : n === 1 ? "dose de vacina" : "doses de vacina";
    return (
      <div className="space-y-4 rounded-3xl border border-linha bg-cartao p-5 text-center">
        <p className="text-lg font-bold">Pronto! {n} {oque} no seu histórico.</p>
        <p className="text-sm text-suave">Os gráficos e os avisos já levam em conta este documento.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href="/" className="rounded-full bg-marca px-5 py-2.5 font-semibold text-white hover:bg-marca-hover">
            Ver na Início
          </Link>
          <Link href="/exames" className="rounded-full border border-linha px-5 py-2.5 font-semibold text-marca hover:border-salvia">
            Ver exames
          </Link>
          <button
            type="button"
            onClick={() => setEstado({ fase: "escolher" })}
            className="rounded-full border border-linha px-5 py-2.5 font-semibold text-marca hover:border-salvia"
          >
            Enviar outro
          </button>
        </div>
      </div>
    );
  }

  const { previa, erro, ocupado } = estado;
  const reconhecidos = previa.exames.filter((x) => x.reconhecido);
  const fora = reconhecidos.filter((x) => x.fora).length;

  async function aoSalvar() {
    setEstado({ fase: "previa", previa, ocupado: "salvar" });
    const r = await salvar(previa.envioId);
    if (r.ok) setEstado({ fase: "salvo", exames: r.exames, doses: r.doses });
    else setEstado({ fase: "previa", previa, erro: r.mensagem });
  }
  async function aoDescartar() {
    setEstado({ fase: "previa", previa, ocupado: "descartar" });
    await descartar(previa.envioId);
    setEstado({ fase: "escolher" });
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-linha bg-cartao p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-suave">Confira antes de salvar</p>
        <h2 className="mt-1 text-xl font-bold">{TIPO[previa.tipo]}</h2>
        <p className="mt-1 text-[15px] text-suave">
          {previa.emissor || "Emissor não identificado"} · {dataBr(previa.data)} · {previa.paginas}{" "}
          {previa.paginas === 1 ? "página" : "páginas"}
        </p>
        <a href={previa.arquivo} target="_blank" rel="noopener" className="mt-2 inline-block text-sm font-semibold text-marca">
          Abrir o original ›
        </a>
        {previa.tipo === "laudo_exame" ? (
          <p className="mt-3 text-sm">
            <span className="num font-bold">{reconhecidos.length}</span> resultados lidos
            {fora ? (
              <>
                {" · "}
                <span className="font-semibold text-atencao">{fora} fora da faixa</span>
              </>
            ) : null}
          </p>
        ) : null}
      </section>

      {previa.avisos.length ? (
        <ul className="space-y-1.5 rounded-2xl bg-atencao-fundo px-4 py-3 text-sm text-atencao">
          {previa.avisos.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      ) : null}

      {previa.exames.length ? (
        <ul className="divide-y divide-linha overflow-hidden rounded-3xl border border-linha bg-cartao">
          {previa.exames.map((x, i) => (
            <li key={i} className={`px-4 py-3 ${x.reconhecido ? "" : "opacity-55"}`}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 font-semibold">{x.nome}</span>
                <span className={`num shrink-0 font-bold ${x.fora ? "text-atencao" : ""}`}>
                  {x.valor} <span className="text-sm font-normal text-suave">{x.unidade}</span>
                </span>
              </div>
              <div className="mt-0.5 flex items-baseline justify-between gap-3 text-xs text-suave">
                <span className="min-w-0">{x.referencia ? `Referência: ${x.referencia}` : "Sem referência"}</span>
                <span className="shrink-0">
                  {x.fora ? <span className="font-semibold text-atencao">fora da faixa · </span> : null}pág. {x.pagina}
                </span>
              </div>
              {!x.reconhecido ? <p className="mt-0.5 text-xs text-suave">Não reconhecido: fica de fora dos gráficos.</p> : null}
              {x.alertas.length ? <p className="mt-0.5 text-xs text-atencao">Conferir: {x.alertas.join("; ")}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}

      {previa.doses.length ? (
        <ul className="divide-y divide-linha overflow-hidden rounded-3xl border border-linha bg-cartao">
          {previa.doses.map((d, i) => (
            <li key={i} className={`px-4 py-3 ${d.valida ? "" : "opacity-55"}`}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 font-semibold">{d.nome}</span>
                <span className="num shrink-0 text-sm">{dataBr(d.data)}</span>
              </div>
              <p className="mt-0.5 text-xs text-suave">
                {d.dose}
                {d.lote ? ` · lote ${d.lote}` : ""} · pág. {d.pagina}
              </p>
              {!d.valida ? <p className="mt-0.5 text-xs text-suave">Não reconhecida ou sem data: fica de fora.</p> : null}
              {d.alertas.length ? <p className="mt-0.5 text-xs text-atencao">Conferir: {d.alertas.join("; ")}</p> : null}
            </li>
          ))}
        </ul>
      ) : null}

      {erro ? (
        <p role="alert" className="rounded-2xl bg-atencao-fundo px-4 py-3 text-sm text-atencao">
          {erro}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={aoSalvar}
          disabled={!previa.podeSalvar || !!ocupado}
          className="flex-1 rounded-full bg-marca px-5 py-3 font-semibold text-white hover:bg-marca-hover disabled:opacity-50"
        >
          {ocupado === "salvar" ? "Salvando…" : "Salvar no meu histórico"}
        </button>
        <button
          type="button"
          onClick={aoDescartar}
          disabled={!!ocupado}
          className="rounded-full border border-linha px-5 py-3 font-semibold text-marca hover:border-salvia disabled:opacity-50"
        >
          {ocupado === "descartar" ? "Descartando…" : "Descartar"}
        </button>
      </div>
      {!previa.podeSalvar ? (
        <p className="text-center text-sm text-suave">Nada para salvar: não reconhecemos resultados com data neste documento.</p>
      ) : null}
    </div>
  );
}
