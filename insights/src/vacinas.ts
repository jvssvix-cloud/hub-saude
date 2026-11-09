/**
 * Regras de vacinação: carteira consolidada + situação de cada vacina pelo calendário oficial.
 * Fonte: Calendário Nacional de Vacinação 2026, Ministério da Saúde
 *   - adulto (25 a 59 anos) e adolescente/jovem (10 a 24 anos), população geral.
 * É recomendação, não diagnóstico: o texto sempre orienta confirmar com o médico.
 */
import { dataBr, mesAno } from "./regras";
import type { Paciente } from "./tipos";

export type DoseVacina = {
  vacina: string;
  dose: string; // "1" | "2" | "3" | "reforco" | "unica" | "anual" | "outra"
  data: string;
  lote: string | null;
  local: string | null;
  fontes: { documento_id: string; arquivo: string; pagina: number }[];
};

export type SituacaoVacina = {
  vacina: string;
  nome: string;
  status: "em_dia" | "atencao" | "informativo" | "fora_do_calendario";
  detalhe: "em_dia" | "vencida" | "incompleta" | "sem_registro" | "campanha" | "registrada" | "faixa_etaria";
  texto: string;
  doses: DoseVacina[];
};

export const FONTE_CALENDARIO = "Calendário Nacional de Vacinação 2026 (Ministério da Saúde)";
/** Doses da infância raramente estão em documentos digitais: avisar em vez de afirmar que não existem. */
const SEM_REGISTRO = "Nenhuma dose nos documentos enviados. Doses da infância podem estar só na caderneta de papel.";

export const NOMES_VACINA: Record<string, string> = {
  hepatite_b: "Hepatite B", dt: "Dupla adulto (dT)", dtpa: "dTpa", febre_amarela: "Febre amarela",
  triplice_viral: "Tríplice viral (sarampo, caxumba, rubéola)", influenza: "Gripe (influenza)",
  covid19: "COVID-19", hpv: "HPV", meningococica: "Meningocócica", pneumococica: "Pneumocócica",
  varicela: "Varicela", dengue: "Dengue", herpes_zoster: "Herpes-zóster", outra: "Outra",
};

const idadeEm = (nasc: string, d: string) => {
  const [a, b] = [new Date(`${nasc}T00:00:00Z`), new Date(`${d}T00:00:00Z`)];
  return b.getUTCFullYear() - a.getUTCFullYear() - (b < new Date(Date.UTC(b.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate())) ? 1 : 0);
};
const somaAnos = (d: string, n: number) => `${Number(d.slice(0, 4)) + n}${d.slice(4)}`;

/** Junta as doses de todos os documentos; a mesma vacina na mesma data é uma dose só (com várias fontes). */
export function consolidar(doses: DoseVacina[]): DoseVacina[] {
  const m = new Map<string, DoseVacina>();
  for (const d of doses) {
    const k = `${d.vacina}|${d.data}`;
    const ja = m.get(k);
    if (ja) ja.fontes.push(...d.fontes);
    else m.set(k, { ...d, fontes: [...d.fontes] });
  }
  return [...m.values()].sort((a, b) => a.data.localeCompare(b.data));
}

/** Situação de cada vacina para a idade da pessoa hoje. */
export function situacaoVacinal(doses: DoseVacina[], paciente: Paciente, hoje: string): SituacaoVacina[] {
  const idade = idadeEm(paciente.nascimento, hoje);
  const de = (v: string) => doses.filter((d) => d.vacina === v);
  const out: SituacaoVacina[] = [];
  const rotina = idade >= 20 && idade <= 59;
  const s = (vacina: string, status: SituacaoVacina["status"], detalhe: SituacaoVacina["detalhe"], texto: string, ds = de(vacina)): SituacaoVacina =>
    ({ vacina, nome: NOMES_VACINA[vacina] ?? vacina, status, detalhe, doses: ds,
      texto: status === "atencao" ? `${texto} Confirme com seu médico ou na unidade de saúde.` : texto });

  if (!rotina) {
    out.push(s("rotina", "fora_do_calendario", "faixa_etaria",
      `Regras de calendário incluídas por enquanto só para 20 a 59 anos (idade atual: ${idade}). Confira com seu médico.`, []));
  } else {
    // Hepatite B: 3 doses
    const hb = de("hepatite_b");
    out.push(hb.length >= 3
      ? s("hepatite_b", "em_dia", "em_dia", `Esquema completo (${hb.length} doses registradas).`)
      : s("hepatite_b", "atencao", hb.length ? "incompleta" : "sem_registro",
        hb.length ? `Esquema incompleto: ${hb.length} de 3 doses registradas (última em ${mesAno(hb.at(-1)!.data)}).`
          : `${SEM_REGISTRO} O calendário recomenda 3 doses.`));
    // dT/dTpa: reforço a cada 10 anos
    const dt = [...de("dt"), ...de("dtpa")].sort((a, b) => a.data.localeCompare(b.data));
    if (!dt.length) {
      out.push(s("dt", "atencao", "sem_registro",
        `${SEM_REGISTRO} O reforço de dT é a cada 10 anos.`, dt));
    } else {
      const ultima = dt.at(-1)!.data, vence = somaAnos(ultima, 10);
      out.push(hoje > vence
        ? s("dt", "atencao", "vencida", `Último reforço em ${mesAno(ultima)}; o calendário recomenda a cada 10 anos (vencido desde ${mesAno(vence)}).`, dt)
        : s("dt", "em_dia", "em_dia", `Último reforço em ${mesAno(ultima)}; próximo previsto para ${mesAno(vence)}.`, dt));
    }
    // Febre amarela: 1 dose
    const fa = de("febre_amarela");
    out.push(fa.length
      ? s("febre_amarela", "em_dia", "em_dia", `Dose registrada em ${dataBr(fa[0].data)} (dose única).`)
      : s("febre_amarela", "atencao", "sem_registro", `${SEM_REGISTRO} O calendário recomenda 1 dose.`));
    // Tríplice viral: 2 doses até 29 anos, 1 dose de 30 a 59
    const scr = de("triplice_viral"), precisa = idade <= 29 ? 2 : 1;
    out.push(scr.length >= precisa
      ? s("triplice_viral", "em_dia", "em_dia", `${scr.length} dose(s) registrada(s); recomendado ${precisa} na sua idade.`)
      : s("triplice_viral", "atencao", scr.length ? "incompleta" : "sem_registro",
        `${scr.length ? `${scr.length} de ${precisa}` : `${SEM_REGISTRO} Recomendadas ${precisa}`} dose(s) para ${idade <= 29 ? "até 29 anos" : "30 a 59 anos"}.`));
  }
  // Campanhas: só informa a última dose
  for (const v of ["influenza", "covid19"]) {
    const ds = de(v);
    if (ds.length) out.push(s(v, "informativo", "campanha", `Última dose em ${dataBr(ds.at(-1)!.data)} (${ds.length} no total). Vacinação por campanha.`));
  }
  // Demais vacinas registradas: só lista
  const tratadas = new Set(["hepatite_b", "dt", "dtpa", "febre_amarela", "triplice_viral", "influenza", "covid19"]);
  for (const v of new Set(doses.map((d) => d.vacina))) {
    if (!tratadas.has(v)) out.push(s(v, "informativo", "registrada", `${de(v).length} dose(s) registrada(s).`));
  }
  return out;
}
