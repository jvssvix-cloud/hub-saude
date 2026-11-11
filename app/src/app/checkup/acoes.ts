"use server";
/**
 * Gravação do perfil de saúde, um bloco por vez. Dois modos: "checkup" (cada "Continuar" salva e vai para o
 * próximo bloco) e "perfil" (edição em Mais > Meu perfil de saúde: salva e volta para /perfil).
 * O paciente nasce no bloco 1, junto com o perfil_saude e os aceites. Tudo com a chave secreta, só no servidor;
 * o que vem do formulário é validado aqui de novo (nunca confiar no navegador).
 */
import { randomUUID } from "node:crypto";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import {
  ALCOOL, ATIVIDADE_MAX_HORAS, CONDICOES, CONDICOES_FAMILIA, FUMO, MEDICOS, MIN_POR_HORA, PARENTES, TERMOS_VERSAO,
  TOTAL_BLOCOS, alturaCm, ano, derivarFamilia, escolhas, linhas, numero, sim, telefone, texto, uma,
} from "@/lib/checkup";
import type { FamiliaParente, Parente } from "../../../../lib/types";
import { tagHistorico } from "@/lib/dados";
import { contaAtual } from "@/lib/sessao";
import { escreverServidor, getServidor } from "@/lib/supabase";

export type EstadoBloco = { erro?: string };
export type Modo = "checkup" | "perfil";

const agora = () => new Date().toISOString();
const depois = (modo: Modo, n: number) => redirect(modo === "perfil" ? "/perfil" : `/checkup?bloco=${n + 1}`);

async function atualizarPerfil(pacienteId: string, campos: Record<string, unknown>) {
  await escreverServidor("PATCH", `perfil_saude?paciente_id=eq.${encodeURIComponent(pacienteId)}`, {
    ...campos, atualizado_em: agora(),
  });
}

export async function salvarBloco(modo: Modo, n: number, _: EstadoBloco, form: FormData): Promise<EstadoBloco> {
  const conta = await contaAtual();
  // editar o perfil é só para quem já concluiu o check-up (e o bloco 7, que conclui, não existe na edição)
  if (modo === "perfil" && (!conta.concluido || n === TOTAL_BLOCOS)) redirect("/checkup");
  if (n === 1) return salvarBasico(modo, conta, form);
  if (!conta.paciente) redirect("/checkup?bloco=1");
  const pid = conta.paciente.id;

  switch (n) {
    case 2: {
      const altura = alturaCm(form.get("altura"));
      const peso = numero(form.get("peso"));
      if (altura === null || peso === null) return { erro: "Altura e peso são necessários para o IMC." };
      if (Number.isNaN(altura) || altura < 50 || altura > 250) return { erro: "Confira a altura (em centímetros, por exemplo 172)." };
      if (Number.isNaN(peso) || peso < 2 || peso > 400) return { erro: "Confira o peso (em quilos, por exemplo 78,5)." };
      await atualizarPerfil(pid, { altura_cm: altura, peso_kg: peso });
      break;
    }
    case 3: {
      const horas = numero(form.get("atividade_horas"));
      const sono = numero(form.get("sono"));
      if (horas !== null && (Number.isNaN(horas) || !Number.isInteger(horas) || horas > ATIVIDADE_MAX_HORAS)) {
        return { erro: "Confira as horas de atividade por semana." };
      }
      if (sono !== null && (Number.isNaN(sono) || sono > 24)) return { erro: "Confira as horas de sono por noite." };
      await atualizarPerfil(pid, {
        fumo: uma(form.get("fumo"), FUMO),
        alcool: uma(form.get("alcool"), ALCOOL),
        atividade_min_semana: horas === null ? null : horas * MIN_POR_HORA,
        sono_horas: sono,
      });
      break;
    }
    case 4:
      await atualizarPerfil(pid, {
        condicoes: escolhas(form, "condicao", CONDICOES),
        condicoes_outras: texto(form.get("condicoes_outras"), 300),
        remedios_lista: linhas(form, "remedio", ["nome", "dose", "para_que"]).map((l) => ({
          nome: texto(l.nome, 80), dose: texto(l.dose, 40), para_que: texto(l.para_que, 80),
        })),
      });
      break;
    case 5: {
      const intern = linhas(form, "internacao", ["motivo", "ano"]).map((l) => ({ motivo: texto(l.motivo, 120), ano: ano(l.ano) }));
      const cirur = linhas(form, "cirurgia", ["nome", "ano"]).map((l) => ({ nome: texto(l.nome, 120), ano: ano(l.ano) }));
      if ([...intern, ...cirur].some((x) => Number.isNaN(x.ano))) {
        return { erro: "Confira os anos: com 4 números (por exemplo 2015) e não depois deste ano." };
      }
      await atualizarPerfil(pid, { internacoes: intern, cirurgias: cirur });
      break;
    }
    case 6:
      await atualizarPerfil(pid, {
        medicos: escolhas(form, "medico", MEDICOS),
        medicos_outros: texto(form.get("medicos_outros"), 200),
      });
      break;
    case 7: {
      const fp: Partial<Record<Parente, FamiliaParente>> = {};
      for (const pa of PARENTES) {
        const condicoes = escolhas(form, `fam_${pa.id}`, CONDICOES_FAMILIA);
        const observacao = texto(form.get(`fam_${pa.id}_obs`), 200);
        if (!condicoes.length && !observacao) continue;
        fp[pa.id] = {
          condicoes,
          cancer_qual: condicoes.includes("cancer") ? texto(form.get(`fam_${pa.id}_cancer`), 100) : null,
          observacao,
        };
      }
      const cancer = PARENTES.filter((pa) => fp[pa.id]?.condicoes.includes("cancer"))
        .map((pa) => `${pa.rotulo.toLowerCase()}${fp[pa.id]?.cancer_qual ? ` (${fp[pa.id]?.cancer_qual})` : ""}`);
      await atualizarPerfil(pid, {
        familia_parentes: fp,
        familia: derivarFamilia(fp), // resumo antigo, que regras e chat já usam
        familia_cancer: cancer.length ? cancer.join(", ").slice(0, 200) : null,
      });
      break;
    }
    case 8: {
      const mulher = conta.sexo === "F";
      await atualizarPerfil(pid, {
        alergias: texto(form.get("alergias"), 300),
        gestante: mulher ? sim(form.get("gestante")) : null,
        menopausa: mulher ? sim(form.get("menopausa")) : null,
      });
      break;
    }
    case TOTAL_BLOCOS: {
      // concluir: só com o corpo preenchido (bloco 2 é obrigatório)
      const [p] = await getServidor<{ altura_cm: number | null; peso_kg: number | null }[]>(
        `perfil_saude?paciente_id=eq.${encodeURIComponent(pid)}&select=altura_cm,peso_kg`,
      );
      if (!p?.altura_cm || !p?.peso_kg) redirect("/checkup?bloco=2");
      await atualizarPerfil(pid, { checkup_concluido_em: agora() });
      redirect(form.get("destino") === "enviar" ? "/reunir" : "/");
    }
    default:
      redirect("/checkup");
  }
  depois(modo, n);
  return {};
}

async function salvarBasico(modo: Modo, conta: Awaited<ReturnType<typeof contaAtual>>, form: FormData): Promise<EstadoBloco> {
  const nome = texto(form.get("nome"), 120);
  const nascimento = String(form.get("nascimento") ?? "");
  const sexo = form.get("sexo");
  const tel = telefone(form.get("telefone"));

  if (!nome || nome.length < 2) return { erro: "Escreva o seu nome." };
  const hoje = agora().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nascimento) || nascimento < "1900-01-01" || nascimento > hoje) {
    return { erro: "Confira a data de nascimento." };
  }
  if (sexo !== "M" && sexo !== "F") return { erro: "Escolha o sexo biológico (as faixas de referência dos exames dependem dele)." };
  if (!tel) return { erro: "Confira o telefone, com DDD. É por ele que o seu médico pede acesso." };
  if (form.get("aceite_termos") !== "on" || form.get("aceite_dados") !== "on") {
    return { erro: "Para continuar, aceite os termos de uso e o uso dos seus dados de saúde." };
  }

  const dados = { nome, nascimento, sexo, telefone: tel };
  try {
    if (conta.paciente) {
      const pid = encodeURIComponent(conta.paciente.id);
      await escreverServidor("PATCH", `paciente?id=eq.${pid}`, dados);
      // paciente antigo sem perfil: cria agora, com os aceites (quem já tem perfil mantém a data do primeiro aceite)
      const [perfil] = await getServidor<{ paciente_id: string }[]>(`perfil_saude?paciente_id=eq.${pid}&select=paciente_id`);
      if (!perfil) {
        const quando = agora();
        await escreverServidor("POST", "perfil_saude", {
          paciente_id: conta.paciente.id, termos_versao: TERMOS_VERSAO, termos_aceitos_em: quando, dados_saude_aceitos_em: quando,
        });
      }
    } else {
      const id = `pac-${randomUUID()}`;
      await escreverServidor("POST", "paciente", { id, ...dados, usuario_id: conta.usuario.id });
      const quando = agora();
      try {
        await escreverServidor("POST", "perfil_saude", {
          paciente_id: id, termos_versao: TERMOS_VERSAO, termos_aceitos_em: quando, dados_saude_aceitos_em: quando,
        });
      } catch (e) {
        await escreverServidor("DELETE", `paciente?id=eq.${id}`).catch(() => undefined); // sem perfil, sem paciente
        throw e;
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("23505") && msg.includes("telefone")) {
      return { erro: "Este telefone já está em outra conta. Confira o número ou entre com a conta que já usa." };
    }
    console.error("[checkup] básico:", msg);
    return { erro: "Não conseguimos salvar agora. Tente de novo." };
  }
  // nome, nascimento e sexo entram nos insights (idade, faixas de referência): renova o cache deste paciente
  if (conta.paciente) updateTag(tagHistorico(conta.paciente.id));
  depois(modo, 1);
  return {};
}
