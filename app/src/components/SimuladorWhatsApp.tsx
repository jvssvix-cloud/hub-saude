"use client";
/**
 * Zelo no WhatsApp: simulação com dois celulares (o paciente e o filho que cuida dele).
 * O CANAL é simulado. O cenário "Mandar um exame" é real: o arquivo vai para /api/enviar (a mesma leitura do /enviar)
 * e o "Salvar" usa a ação salvar, então o exame entra de verdade no histórico. Os outros cenários são roteiros
 * com os dados do paciente (exames, datas, o que falta, remédios); remédio, médica e consulta de exemplo são fictícios.
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { descartar, salvar } from "@/app/(paciente)/enviar/acoes";
import type { Previa } from "@/lib/envio";

export type DadosSimulador = {
  nome: string;
  sexo: "M" | "F";
  historico: { laudos: number; laboratorios: number; de: string; ate: string };
  destaques: string[];
  pedido: { nome: string; feito: string | null; alterado: boolean }[];
  faltam: string[];
  remedios: { nome: string; horarios: string[] }[];
};

type Botao = { rotulo: string; acao?: () => void; href?: string };
type Msg = { id: number; de: "zelo" | "eu"; texto: string; hora: string; botoes?: Botao[]; anexo?: string; usado?: boolean };
type Celular = "paciente" | "filho";

const FILHO = "Lucas";
const espera = (ms: number) => new Promise((ok) => setTimeout(ok, ms));
let proximoId = 1;

const CENARIOS: { id: string; titulo: string; real?: boolean }[] = [
  { id: "exame", titulo: "Mandar um exame", real: true },
  { id: "historico", titulo: "Trazer exames antigos" },
  { id: "pedido", titulo: "Pedido médico" },
  { id: "consulta", titulo: "Consulta amanhã" },
  { id: "remedio", titulo: "Lembrete de remédio" },
  { id: "acesso", titulo: "Médica pede acesso" },
  { id: "familia", titulo: "Filho manda o exame" },
];

export function SimuladorWhatsApp({ dados }: { dados: DadosSimulador }) {
  const [msgs, setMsgs] = useState<Record<Celular, Msg[]>>({ paciente: [], filho: [] });
  const [digitando, setDigitando] = useState<Celular | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aba, setAba] = useState<Celular>("paciente"); // no celular (tela estreita) mostra um aparelho por vez
  const arquivo = useRef<HTMLInputElement>(null);
  const relogio = useRef("09:12");

  const pai = dados.sexo === "M" ? "seu pai" : "sua mãe";
  const Pai = dados.sexo === "M" ? "Seu pai" : "Sua mãe";
  const parente = dados.sexo === "M" ? "Pai" : "Mãe";

  function hora(h?: string) {
    if (h) relogio.current = h;
    return relogio.current;
  }
  function por(cel: Celular, m: Omit<Msg, "id" | "hora"> & { hora?: string }) {
    const id = proximoId++;
    setMsgs((x) => ({ ...x, [cel]: [...x[cel], { ...m, id, hora: hora(m.hora) }] }));
    return id;
  }
  async function zelo(cel: Celular, texto: string, extra: Partial<Msg> & { hora?: string } = {}) {
    setDigitando(cel);
    await espera(Math.min(1400, 450 + texto.length * 6));
    setDigitando(null);
    return por(cel, { de: "zelo", texto, ...extra });
  }
  /** Um botão vale uma vez: depois de usado, some. */
  function usar(cel: Celular, id: number) {
    setMsgs((x) => ({ ...x, [cel]: x[cel].map((m) => (m.id === id ? { ...m, usado: true } : m)) }));
  }
  const botao = (cel: Celular, idRef: { id: number }, rotulo: string, fn: () => Promise<void> | void): Botao => ({
    rotulo,
    acao: () => { usar(cel, idRef.id); void fn(); },
  });

  async function rodar(id: string) {
    if (ocupado) return;
    if (id === "exame") return arquivo.current?.click();
    setOcupado(true);
    try {
      await ROTEIROS[id]?.();
    } finally {
      setOcupado(false);
    }
  }

  // ---------------- roteiros ----------------
  const ROTEIROS: Record<string, () => Promise<void>> = {
    async historico() {
      setAba("paciente");
      await zelo("paciente", "Quer trazer os exames antigos de uma vez? Abra a conversa do laboratório no WhatsApp › toque nos 3 pontinhos › Mais › Exportar conversa › Incluir mídia, e mande aqui.", { hora: "10:05" });
      await espera(500);
      por("paciente", { de: "eu", texto: "", anexo: "Conversa do WhatsApp com o laboratório.zip" });
      await zelo("paciente", `Achei ${dados.historico.laudos} laudos de ${dados.historico.de} a ${dados.historico.ate}, de ${dados.historico.laboratorios} laboratórios. Já estão no seu histórico.`);
      if (dados.destaques.length) {
        await zelo("paciente", `Juntando tudo, uma coisa chama atenção:\n• ${dados.destaques.join("\n• ")}\nVale mostrar ao seu médico.`, {
          botoes: [{ rotulo: "Ver no Zelo", href: "/exames" }],
        });
      }
    },

    async pedido() {
      setAba("paciente");
      por("paciente", { de: "eu", texto: "", anexo: "Foto do pedido médico.jpg", hora: "11:40" });
      const feitos = dados.pedido.filter((p) => p.feito);
      const nao = dados.pedido.filter((p) => !p.feito);
      await zelo("paciente", `Li o pedido: ${dados.pedido.length} exames.`);
      const linhas = [
        feitos.length ? `Você já fez ${feitos.length} deles nos últimos 12 meses:\n${feitos.map((p) => `• ${p.nome}, ${p.feito}${p.alterado ? " (alterado)" : ""}`).join("\n")}` : "",
        nao.length ? `Ainda não tem: ${nao.map((p) => p.nome).join(", ")}.` : "",
      ].filter(Boolean).join("\n\n");
      await zelo("paciente", `${linhas}\n\nMostre este resumo ao médico antes de refazer: pode ser que não precise repetir tudo.`, {
        botoes: [{ rotulo: "Abrir o resumo para o médico", href: "/compartilhar" }],
      });
    },

    async consulta() {
      setAba("paciente");
      por("paciente", { de: "eu", texto: "Mensagem da clínica: \"Sua consulta com Endocrinologia está confirmada para amanhã, 14h.\"", hora: "18:20" });
      const ref = { id: 0 };
      ref.id = await zelo("paciente", "Anotei: endocrinologista amanhã às 14h. Quer que o médico veja seu histórico na consulta?", {
        botoes: [
          botao("paciente", ref, "Sim, gerar o link", async () => {
            por("paciente", { de: "eu", texto: "Sim, gerar o link" });
            await zelo("paciente", "Pronto. Na consulta, mostre o QR ou mande o link ao médico. Ele vê exames, vacinas e o resumo; você cancela quando quiser.", {
              botoes: [{ rotulo: "Gerar o QR no Zelo", href: "/compartilhar" }],
            });
            await zelo("filho", `${Pai} tem endocrinologista amanhã às 14h. O histórico já está liberado para o médico.`, { hora: "18:21" });
            await zelo("paciente", "Bom dia! Hoje, 14h, endocrinologista. Leve o celular com o QR. 🙂", { hora: "08:00" });
            await zelo("paciente", "Como foi a consulta? Se o médico pediu exames ou receitou remédio, mande a foto aqui que eu organizo.", { hora: "16:30" });
          }),
          botao("paciente", ref, "Agora não", () => { por("paciente", { de: "eu", texto: "Agora não" }); }),
        ],
      });
    },

    async remedio() {
      setAba("paciente");
      let nome: string, horario: string;
      if (dados.remedios.length) {
        nome = dados.remedios[0].nome;
        horario = dados.remedios[0].horarios.at(-1)!;
        await zelo("paciente", `Seus lembretes estão ligados: ${dados.remedios.map((r) => `${r.nome} (${r.horarios.join(", ")})`).join("; ")}.`, { hora: "08:30" });
      } else {
        nome = "Atorvastatina 20 mg";
        horario = "21:00";
        por("paciente", { de: "eu", texto: "", anexo: "Foto da receita.jpg", hora: "16:35" });
        const ref = { id: 0 };
        await new Promise<void>((pronto) => {
          void zelo("paciente", `Li a receita: ${nome}, 1 vez ao dia, à noite (remédio de exemplo). Quer que eu lembre todo dia às 21h?`, {
            botoes: [botao("paciente", ref, "Sim, às 21h", async () => {
              por("paciente", { de: "eu", texto: "Sim, às 21h" });
              await zelo("paciente", `Combinado. Se você não confirmar, aviso o ${FILHO}.`);
              pronto();
            })],
          }).then((id) => { ref.id = id; });
        });
      }
      const ref = { id: 0 };
      ref.id = await zelo("paciente", `💊 ${horario.replace(":00", "h")}: hora de tomar ${nome}.`, {
        hora: horario,
        botoes: [
          botao("paciente", ref, "Tomei", async () => {
            por("paciente", { de: "eu", texto: "Tomei ✅" });
            await zelo("paciente", "Anotado. 7 de 7 dias nesta semana. 👏");
          }),
          botao("paciente", ref, "Simular: não respondeu", async () => {
            const ref2 = { id: 0 };
            ref2.id = await zelo("paciente", `Lembrete de novo: ${nome}. Já tomou?`, {
              hora: horario.replace(":00", ":30"),
              botoes: [botao("paciente", ref2, "Tomei agora", () => { por("paciente", { de: "eu", texto: "Tomei agora ✅" }); })],
            });
            setAba("filho");
            const ref3 = { id: 0 };
            ref3.id = await zelo("filho", `${Pai} ainda não confirmou o remédio das ${horario.replace(":00", "h")} (${nome}).`, {
              hora: horario.replace(":00", ":45"),
              botoes: [
                botao("filho", ref3, "Liguei, já tomou", async () => {
                  por("filho", { de: "eu", texto: "Liguei, já tomou" });
                  await zelo("filho", "Obrigado! Anotei para ele. 💙");
                }),
                botao("filho", ref3, "Vou ligar", () => { por("filho", { de: "eu", texto: "Vou ligar" }); }),
              ],
            });
          }),
        ],
      });
    },

    async acesso() {
      setAba("paciente");
      const ref = { id: 0 };
      ref.id = await zelo("paciente", "A Dra. Helena Prado (médica de exemplo) pediu para ver seu histórico antes da consulta de amanhã. Ela vai ver exames, vacinas e o resumo, por 30 dias.", {
        hora: "19:02",
        botoes: [
          botao("paciente", ref, "Aprovar", async () => {
            por("paciente", { de: "eu", texto: "Aprovar" });
            await zelo("paciente", "Aprovado. Você vê quem acessou e pode cancelar a qualquer momento.", {
              botoes: [{ rotulo: "Ver quem pode acessar", href: "/compartilhar" }],
            });
            await zelo("filho", `${Pai} liberou o histórico para a Dra. Helena Prado (consulta amanhã).`, { hora: "19:03" });
          }),
          botao("paciente", ref, "Recusar", async () => {
            por("paciente", { de: "eu", texto: "Recusar" });
            await zelo("paciente", "Recusado. A médica não vê nada.");
          }),
        ],
      });
    },

    async familia() {
      setAba("filho");
      por("filho", { de: "eu", texto: "", anexo: "Resultado do laboratório.pdf", hora: "12:10" });
      const ref = { id: 0 };
      ref.id = await zelo("filho", "De quem é este exame?", {
        botoes: [parente, "Meu"].map((quem) =>
          botao("filho", ref, quem, async () => {
            por("filho", { de: "eu", texto: quem });
            await zelo("filho", quem === "Meu"
              ? "Salvo no seu perfil."
              : `Salvo no perfil d${dados.sexo === "M" ? "o" : "a"} ${dados.nome}. ${Pai} também recebe o resumo no WhatsApp.`);
            if (quem !== "Meu") await zelo("paciente", `O ${FILHO} mandou um exame seu. Já está no seu histórico.`, { hora: "12:11" });
          })),
      });
    },
  };

  // ---------------- exame real ----------------
  async function enviarArquivo(f: File | undefined) {
    if (arquivo.current) arquivo.current.value = "";
    if (!f || ocupado) return;
    setOcupado(true);
    setAba("paciente");
    try {
      por("paciente", { de: "eu", texto: "", anexo: f.name, hora: "09:12" });
      if (f.size > 4 * 1024 * 1024) {
        await zelo("paciente", "Esse arquivo passa de 4 MB. Mande um PDF menor ou uma foto.");
        return;
      }
      await zelo("paciente", "Recebi! Estou lendo seu exame, leva até 1 minuto. ⏳");
      const form = new FormData();
      form.append("arquivo", f);
      setDigitando("paciente");
      const r = await fetch("/api/enviar", { method: "POST", body: form });
      setDigitando(null);
      const corpo = await r.json().catch(() => null);
      if (!r.ok) {
        await zelo("paciente", corpo?.mensagem ?? "Não consegui ler este documento. Tente uma foto mais nítida.");
        return;
      }
      const p = corpo as Previa;
      if (!p.podeSalvar) {
        await zelo("paciente", "Não reconheci este documento como exame ou carteira de vacinação. Pode mandar outro?");
        await descartar(p.envioId);
        return;
      }
      const data = p.data ? p.data.slice(0, 10).split("-").reverse().join("/") : "sem data";
      const fora = p.exames.filter((e) => e.fora && e.reconhecido).map((e) => e.nome);
      const resumo = p.tipo === "carteira_vacinacao"
        ? `Carteira de vacinação: ${p.doses.length} doses lidas.`
        : p.tipo === "laudo_descritivo" && p.descritivo
          ? `Laudo de ${data}, ${p.emissor}.`
          : `Exame de ${data}, ${p.emissor}: ${p.exames.length} resultados.${fora.length ? `\nFora da referência: ${fora.slice(0, 5).join(", ")}${fora.length > 5 ? "…" : ""}.` : "\nTodos dentro da referência."}`;
      const ref = { id: 0 };
      ref.id = await zelo("paciente", `${resumo}\nConfere? Se estiver certo, eu guardo no seu histórico.`, {
        botoes: [
          { rotulo: "Ver o que eu li", href: p.arquivo },
          botao("paciente", ref, "Salvar", async () => {
            por("paciente", { de: "eu", texto: "Salvar" });
            const s = await salvar(p.envioId);
            if (!s.ok) return void (await zelo("paciente", s.mensagem));
            await zelo("paciente", `Salvo ✅ ${s.exames ? `${s.exames} resultados` : `${s.doses} doses`} no seu histórico. Cada número aponta para este arquivo.`, {
              botoes: [{ rotulo: "Abrir no Zelo", href: `/documentos/${s.documentoId}` }],
            });
            setAba("filho");
            await zelo("filho", `📋 Chegou um exame novo d${dados.sexo === "M" ? "o seu pai" : "a sua mãe"} (${data}).${fora.length ? ` Fora da referência: ${fora.slice(0, 3).join(", ")}.` : " Tudo dentro da referência."}`, {
              botoes: [{ rotulo: "Ver no Zelo", href: `/documentos/${s.documentoId}` }],
            });
          }),
          botao("paciente", ref, "Descartar", async () => {
            por("paciente", { de: "eu", texto: "Descartar" });
            await descartar(p.envioId);
            await zelo("paciente", "Descartado. Nada foi guardado.");
          }),
        ],
      });
    } catch {
      setDigitando(null);
      await zelo("paciente", "Algo deu errado aqui. Tente de novo.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="rounded-2xl bg-bege px-4 py-3 text-sm">
        <b>Simulação do WhatsApp.</b> O canal é simulado; os dados são os seus. Em <b>Mandar um exame</b>, o arquivo passa
        pela leitura de verdade e, se você salvar, entra no seu histórico. Remédio, médica e consulta dos outros exemplos são fictícios.
      </p>

      <div className="flex flex-wrap gap-2">
        {CENARIOS.map((c) => (
          <button
            key={c.id}
            onClick={() => rodar(c.id)}
            disabled={ocupado}
            className="rounded-full border border-linha bg-cartao px-3.5 py-2 text-sm font-semibold hover:bg-marca-fundo disabled:opacity-50"
          >
            {c.titulo}
            {c.real && <span className="ml-1.5 rounded-full bg-marca px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">real</span>}
          </button>
        ))}
        <button
          onClick={() => { setMsgs({ paciente: [], filho: [] }); setDigitando(null); setOcupado(false); relogio.current = "09:12"; }}
          className="rounded-full px-3.5 py-2 text-sm text-suave hover:underline"
        >
          Limpar conversas
        </button>
        <input ref={arquivo} type="file" accept="application/pdf,image/*" className="sr-only" onChange={(e) => enviarArquivo(e.target.files?.[0])} />
      </div>

      <div className="flex gap-2 md:hidden">
        {(["paciente", "filho"] as Celular[]).map((c) => (
          <button key={c} onClick={() => setAba(c)} className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${aba === c ? "bg-marca text-white" : "bg-cartao"}`}>
            {c === "paciente" ? `Celular d${dados.sexo === "M" ? "o" : "a"} ${dados.nome}` : `Celular do ${FILHO} (filho)`}
          </button>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Aparelho
          dono={`${dados.nome}`}
          legenda="o paciente"
          msgs={msgs.paciente}
          digitando={digitando === "paciente"}
          visivel={aba === "paciente"}
          anexar={() => rodar("exame")}
          ocupado={ocupado}
        />
        <Aparelho
          dono={FILHO}
          legenda={`filho d${dados.sexo === "M" ? "o" : "a"} ${dados.nome}, cuida ${dados.sexo === "M" ? "do pai" : "da mãe"}`}
          msgs={msgs.filho}
          digitando={digitando === "filho"}
          visivel={aba === "filho"}
        />
      </div>
      <p className="text-xs text-suave">
        Fora da simulação, isto usa a API oficial do WhatsApp (número do Zelo). Lembretes que o Zelo inicia precisam do seu
        aceite. Nada de diagnóstico pelo WhatsApp: só receber, confirmar, lembrar e mandar links.
      </p>
    </div>
  );
}

function Aparelho(props: {
  dono: string; legenda: string; msgs: Msg[]; digitando: boolean; visivel: boolean; anexar?: () => void; ocupado?: boolean;
}) {
  const fim = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = fim.current?.parentElement;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [props.msgs.length, props.digitando]);

  return (
    <div className={`${props.visivel ? "" : "hidden"} md:block`}>
      <p className="mb-1.5 text-center text-xs text-suave">Celular de <b className="text-tinta">{props.dono}</b> · {props.legenda}</p>
      <div className="mx-auto flex h-[600px] max-w-[380px] flex-col overflow-hidden rounded-[2rem] border-[6px] border-neutral-800 bg-[#efeae2] shadow-lg">
        <div className="flex items-center gap-3 bg-[#075e54] px-4 py-3 text-white">
          <span className="grid size-9 place-items-center rounded-full bg-white text-sm font-bold text-[#075e54]">Z</span>
          <div className="leading-tight">
            <p className="font-semibold">Zelo</p>
            <p className="text-[11px] opacity-80">{props.digitando ? "digitando…" : "conta comercial"}</p>
          </div>
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3 text-[14px]">
          {props.msgs.length === 0 && (
            <p className="mx-auto mt-8 max-w-[85%] rounded-lg bg-[#fff5c4] px-3 py-2 text-center text-xs text-neutral-700">
              Escolha um exemplo acima para começar a conversa.
            </p>
          )}
          {props.msgs.map((m) => (
            <div key={m.id} className={`flex ${m.de === "eu" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-lg px-2.5 py-1.5 shadow-sm ${m.de === "eu" ? "bg-[#d9fdd3]" : "bg-white"}`}>
                {m.anexo && (
                  <p className="mb-1 flex items-center gap-2 rounded bg-black/5 px-2 py-1.5 text-[13px] font-medium text-neutral-800">
                    <span aria-hidden>📎</span>{m.anexo}
                  </p>
                )}
                {m.texto && <p className="whitespace-pre-line text-neutral-900">{m.texto}</p>}
                <p className="mt-0.5 text-right text-[10px] text-neutral-500">{m.hora}{m.de === "eu" ? " ✓✓" : ""}</p>
                {m.botoes && !m.usado && (
                  <div className="-mx-2.5 mt-1 border-t border-black/10">
                    {m.botoes.map((b) =>
                      b.href ? (
                        <Link key={b.rotulo} href={b.href} className="block border-b border-black/5 px-2.5 py-1.5 text-center text-[13px] font-semibold text-[#027eb5] last:border-0 hover:bg-black/5">
                          {b.rotulo}
                        </Link>
                      ) : (
                        <button key={b.rotulo} onClick={b.acao} className="block w-full border-b border-black/5 px-2.5 py-1.5 text-[13px] font-semibold text-[#027eb5] last:border-0 hover:bg-black/5">
                          {b.rotulo}
                        </button>
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {props.digitando && (
            <div className="flex justify-start">
              <span className="rounded-lg bg-white px-3 py-2 text-neutral-500 shadow-sm">…</span>
            </div>
          )}
          <div ref={fim} />
        </div>
        <div className="flex items-center gap-2 bg-[#f0f2f5] px-3 py-2">
          {props.anexar ? (
            <button onClick={props.anexar} disabled={props.ocupado} aria-label="Anexar um exame" className="text-xl text-neutral-600 disabled:opacity-40">📎</button>
          ) : (
            <span aria-hidden className="text-xl text-neutral-400">📎</span>
          )}
          <span className="flex-1 rounded-full bg-white px-3 py-1.5 text-sm text-neutral-400">Mensagem</span>
        </div>
      </div>
    </div>
  );
}
