import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Chat } from "@/components/Chat";
import { temChaveChat } from "@/lib/chat";
import { carregarInsights } from "@/lib/dados";
import type { Insights } from "@/lib/insights";

export const metadata: Metadata = { title: "Conversar · Hub de Saúde" };

/** Perguntas de partida tiradas dos próprios dados: o que está fora da faixa, vacinas pendentes, próxima consulta. */
function sugestoes(i: Insights): string[] {
  const curto = (n: string) => n.replace(/ \(.*\)$/, "");
  const fora = i.series.filter((s) => s.alterado);
  const lista = ["O que mudou nos meus últimos exames?"];
  if (fora[0]) lista.push(`Como evoluiu ${artigo(curto(fora[0].nome))} nos últimos anos?`);
  if (fora.length > 1) lista.push("O que devo levar para a próxima consulta?");
  if (i.vacinacao?.situacao.some((v) => v.status === "atencao")) lista.push("Minhas vacinas estão em dia?");
  lista.push("O que o relógio mostrou sobre o meu coração e o meu sono?");
  return lista.slice(0, 5);
}

/** "Glicose em jejum" -> "minha glicose em jejum"; siglas ficam como estão ("meu LDL"). */
function artigo(nome: string): string {
  const sigla = /^[A-Z0-9]{2,}/.test(nome);
  const feminino = /^(glicose|hemoglobina|creatinina|vitamina|plaquetas|hemácias)/i.test(nome);
  return `${feminino ? "minha" : "meu"} ${sigla ? nome : nome[0].toLowerCase() + nome.slice(1)}`;
}

export default function Conversar() {
  return (
    <Suspense fallback={<p className="pt-3 text-sm text-suave">Carregando…</p>}>
      <Conteudo />
    </Suspense>
  );
}

async function Conteudo() {
  await connection(); // a chave do chat é lida do ambiente na hora
  const insights = await carregarInsights();
  return <Chat nome={insights.paciente.nome.split(" ")[0]} sugestoes={sugestoes(insights)} ligado={temChaveChat()} />;
}
