import Link from "next/link";
import { connection } from "next/server";
import { carregarInsights } from "@/lib/dados";
import { mesAno, type Insights } from "@/lib/insights";
import { temas } from "@/lib/paciente";
import { relogioDe, type Relogio } from "@/lib/relogio";
import { pacienteAtual } from "@/lib/sessao";
import { getServidor, temChaveServidor } from "@/lib/supabase";

type Passo = { rotulo: string; titulo: string; texto: string; href: string; acao: string; urgente?: boolean };

type Consentimento = {
  destinatario_nome: string;
  destinatario_tipo: string;
  status: "pendente" | "aprovado" | "recusado";
  expira_em: string;
  revogado_em: string | null;
};

/**
 * UM passo por vez, escolhido por regras, do mais urgente ao menos:
 * 1. pedido de acesso de um médico esperando resposta;
 * 2. há assunto para a consulta e nenhum médico com acesso: compartilhar;
 * 3. exame de rotina vencido;
 * 4. vacina pendente pelo calendário oficial;
 * 5. nada pendente: quando é o próximo check-up.
 */
function escolher(i: Insights, relogio: Relogio | null, consentimentos: Consentimento[] | null): Passo {
  const agora = new Date().toISOString();
  const vivos = (consentimentos ?? []).filter((c) => !c.revogado_em && c.expira_em > agora);

  const pedido = vivos.find((c) => c.status === "pendente");
  if (pedido) {
    return {
      rotulo: "Pedido de acesso",
      titulo: `${pedido.destinatario_nome} quer ver seu histórico`,
      texto: "Você escolhe o que mostrar e por quanto tempo. O pedido expira em poucos minutos.",
      href: "/compartilhar",
      acao: "Responder",
      urgente: true,
    };
  }

  const assuntos = temas(i, relogio).filter((t) => t.nivel === "conversar");
  const medicoComAcesso = vivos.some((c) => c.status === "aprovado" && c.destinatario_tipo === "medico");
  if (assuntos.length > 0 && consentimentos !== null && !medicoComAcesso) {
    const nomes = assuntos.map((t) => t.titulo.toLowerCase());
    const lista = nomes.length > 1 ? `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}` : nomes[0];
    return {
      rotulo: "Próximo passo",
      titulo: "Mostre seu histórico ao seu médico",
      texto: `Há ${assuntos.length === 1 ? "um assunto" : `${assuntos.length} assuntos`} para a próxima consulta: ${lista}. Ele vê os exames com o laudo de origem e devolve as recomendações aqui.`,
      href: "/compartilhar",
      acao: "Compartilhar",
    };
  }

  const vencidos = i.proximos.filter((p) => p.situacao !== "em_dia");
  if (vencidos.length > 0) {
    const nomes = vencidos.slice(0, 3).map((p) => p.nome.replace(/ \(.*\)$/, ""));
    return {
      rotulo: "Próximo passo",
      titulo: vencidos.length === 1 ? `Hora de refazer ${nomes[0]}` : `${vencidos.length} exames de rotina para refazer`,
      texto: `${nomes.join(", ")}${vencidos.length > 3 ? " e outros" : ""}: o intervalo de rotina já passou. Combine com o seu médico.`,
      href: "/plano",
      acao: "Ver o plano",
    };
  }

  const vacinas = (i.vacinacao?.situacao ?? []).filter((v) => v.status === "atencao");
  if (vacinas.length > 0) {
    return {
      rotulo: "Próximo passo",
      titulo: vacinas.length === 1 ? `Vacina para conferir: ${vacinas[0].nome}` : `${vacinas.length} vacinas para conferir`,
      texto: vacinas.length === 1 ? vacinas[0].texto : `${vacinas.map((v) => v.nome).join(" e ")}: pelo calendário oficial, falta dose ou reforço. Confirme na unidade de saúde.`,
      href: "/documentos#vacinacao",
      acao: "Ver a carteira",
    };
  }

  const proximo = [...i.proximos].sort((a, b) => a.previsto.localeCompare(b.previsto))[0];
  return {
    rotulo: "Tudo em dia",
    titulo: proximo ? `Próximo check-up em ${mesAno(proximo.previsto)}` : "Nada pendente agora",
    texto: "Seus exames de rotina estão dentro do intervalo. Quando chegar um laudo novo, envie por aqui.",
    href: "/plano",
    acao: "Ver o plano",
  };
}

/** Cartão único no topo da Início. Lido na hora (pedidos de acesso mudam a qualquer momento). */
export async function ProximoPasso() {
  await connection();
  const p = await pacienteAtual();
  const insights = await carregarInsights(p.id);
  const consentimentos = temChaveServidor()
    ? await getServidor<Consentimento[]>(
        `consentimento?paciente_id=eq.${encodeURIComponent(p.id)}&select=destinatario_nome,destinatario_tipo,status,expira_em,revogado_em&order=criado_em.desc&limit=30`,
      ).catch(() => null)
    : null;
  const passo = escolher(insights, relogioDe(p.id), consentimentos);

  return (
    <Link
      href={passo.href}
      className={`block rounded-3xl p-4 transition-colors sm:p-5 ${
        passo.urgente ? "border-2 border-marca bg-cartao" : "bg-marca-fundo hover:bg-salvia/50"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-marca">{passo.rotulo}</p>
      <h2 className="mt-1 text-lg font-bold leading-snug tracking-tight">{passo.titulo}</h2>
      <p className="mt-1 text-sm text-suave">{passo.texto}</p>
      <span className="mt-3 inline-block rounded-xl bg-marca px-4 py-2 text-sm font-semibold text-white">{passo.acao} ›</span>
    </Link>
  );
}
