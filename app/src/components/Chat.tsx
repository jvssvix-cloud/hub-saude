"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type ExameCitado = { analito: string; nome: string; fora: boolean };
type Msg = { papel: "paciente" | "assistente"; texto: string; exames?: ExameCitado[]; erro?: boolean };

const ERRO: Record<string, string> = {
  sem_chave: "O chat ainda não está ligado neste ambiente (falta a chave do Gemini no servidor).",
  falha: "Não consegui responder agora. Tente de novo em instantes.",
  pergunta_vazia: "Escreva uma pergunta.",
};

/** Conversa com os próprios dados. Cada resposta traz atalhos para os exames citados (gráfico e laudo de origem). */
export function Chat({ nome, sugestoes, ligado }: { nome: string; sugestoes: string[]; ligado: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [texto, setTexto] = useState("");
  const [esperando, setEsperando] = useState(false);
  const fim = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fim.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, esperando]);

  async function enviar(pergunta: string) {
    const p = pergunta.trim();
    if (!p || esperando) return;
    const conversa: Msg[] = [...msgs.filter((m) => !m.erro), { papel: "paciente", texto: p }];
    setMsgs([...msgs, { papel: "paciente", texto: p }]);
    setTexto("");
    setEsperando(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensagens: conversa.map(({ papel, texto }) => ({ papel, texto })) }),
      });
      const j = (await r.json().catch(() => ({}))) as { texto?: string; exames?: ExameCitado[]; erro?: string };
      setMsgs((m) => [
        ...m,
        r.ok && j.texto
          ? { papel: "assistente", texto: j.texto, exames: j.exames ?? [] }
          : { papel: "assistente", texto: ERRO[j.erro ?? "falha"] ?? ERRO.falha, erro: true },
      ]);
    } catch {
      setMsgs((m) => [...m, { papel: "assistente", texto: ERRO.falha, erro: true }]);
    } finally {
      setEsperando(false);
    }
  }

  const vazio = msgs.length === 0;

  return (
    <div className="flex min-h-[calc(100dvh-13rem)] flex-col">
      <div className="flex-1 space-y-4">
        {vazio ? (
          <section className="pt-2">
            <h1 className="text-[28px] font-bold leading-tight tracking-tight">Olá, {nome}.</h1>
            <p className="mt-1 text-[15px] text-suave">Pergunte sobre os seus exames, vacinas e relógio. Por onde começamos?</p>
            {!ligado && <p className="mt-4 rounded-2xl bg-atencao-fundo px-4 py-3 text-sm text-atencao">{ERRO.sem_chave}</p>}
            <ul className="mt-5 space-y-2">
              {sugestoes.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    disabled={!ligado}
                    onClick={() => enviar(s)}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-linha bg-cartao px-4 py-3 text-left text-[15px] font-medium hover:bg-bege disabled:opacity-60"
                  >
                    {s}
                    <span aria-hidden className="text-suave">›</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <ol className="space-y-4 pt-2" aria-live="polite">
            {msgs.map((m, k) =>
              m.papel === "paciente" ? (
                <li key={k} className="flex justify-end">
                  <p className="max-w-[85%] whitespace-pre-wrap rounded-3xl rounded-br-lg bg-marca px-4 py-2.5 text-[15px] text-white">{m.texto}</p>
                </li>
              ) : (
                <li key={k} className="max-w-[92%]">
                  <p
                    className={`whitespace-pre-wrap rounded-3xl rounded-bl-lg border px-4 py-3 text-[15px] leading-relaxed ${
                      m.erro ? "border-atencao/30 bg-atencao-fundo text-atencao" : "border-linha bg-cartao"
                    }`}
                  >
                    {m.texto}
                  </p>
                  {!!m.exames?.length && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-1">
                      <span className="text-xs text-suave">Ver a origem:</span>
                      {m.exames.map((e) => (
                        <Link
                          key={e.analito}
                          href={`/exame/${e.analito}`}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold hover:underline ${
                            e.fora ? "bg-atencao-fundo text-atencao" : "bg-marca-fundo text-marca"
                          }`}
                        >
                          <span aria-hidden className={`size-1.5 rounded-full ${e.fora ? "bg-fora" : "bg-[var(--ok)]"}`} />
                          {e.nome} <span aria-hidden>›</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </li>
              ),
            )}
            {esperando && (
              <li className="text-sm text-suave" role="status">
                Lendo seus exames…
              </li>
            )}
          </ol>
        )}
        <div ref={fim} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          enviar(texto);
        }}
        className="sticky bottom-[4.5rem] mt-4 sm:bottom-4"
      >
        <div className="flex items-end gap-2 rounded-3xl border border-linha bg-cartao p-2 shadow-sm focus-within:border-marca">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviar(texto);
              }
            }}
            rows={1}
            maxLength={2000}
            disabled={!ligado}
            placeholder="Pergunte sobre a sua saúde"
            aria-label="Sua pergunta"
            className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-[15px] outline-none placeholder:text-suave"
          />
          <button
            disabled={!ligado || esperando || !texto.trim()}
            aria-label="Enviar pergunta"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-marca text-white hover:bg-marca-hover disabled:opacity-40"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 19V5M6 11l6-6 6 6" />
            </svg>
          </button>
        </div>
        <p className="mt-1.5 text-center text-[11px] text-suave">Respostas geradas por IA a partir dos seus laudos. Não é diagnóstico.</p>
      </form>
    </div>
  );
}
