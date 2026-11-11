/**
 * Linguagem do paciente: traduz as regras técnicas (insights + relógio) em temas e frases curtas e calmas.
 * Nada é calculado aqui além de escolher e encurtar: o "porquê" continua nas regras de insights/ e wearable/,
 * e o detalhe completo fica um toque adiante (Evolução, Relógio, Exames).
 */
import type { Area, Insights, Serie } from "@/lib/insights";
import type { Alerta, Dia, Relogio } from "@/lib/relogio";

export type Nivel = "conversar" | "observar" | "bem";

export const NIVEL: Record<Nivel, { texto: string; classe: string; ponto: string }> = {
  conversar: { texto: "Conversar com o médico", classe: "text-atencao", ponto: "bg-fora" },
  observar: { texto: "Fique de olho", classe: "text-[#7a6a2a]", ponto: "bg-[#d4b86a]" },
  bem: { texto: "Tudo certo", classe: "text-ok", ponto: "bg-salvia" },
};

export type Tema = {
  id: "coracao" | "acucar" | "colesterol" | "sono";
  titulo: string;
  nivel: Nivel;
  frase: string;
  href: string;
};

const ano = (iso: string | null | undefined) => (iso ? iso.slice(0, 4) : "");

/** Frase curta de uma série de exame, sem números. */
export function fraseSerie(s: Serie): string {
  const t = s.tendencia;
  const desde = t?.fora_desde ? ` desde ${ano(t.fora_desde)}` : "";
  if (s.alterado) {
    const lado = s.sentido === "abaixo" ? "abaixo do ideal" : "acima do ideal";
    if (t?.direcao === "subindo") return `Subindo aos poucos, ${lado}${desde}`;
    if (t?.direcao === "caindo") return `Caindo aos poucos, ${lado}${desde}`;
    return `Um pouco ${lado}${desde}`;
  }
  if (t?.direcao === "subindo") return "Subindo aos poucos, ainda no ideal";
  if (t?.direcao === "caindo") return "Caindo aos poucos, ainda no ideal";
  return "Estável e no ideal";
}

function nivelDaArea(a: Area | undefined): Nivel {
  if (!a) return "bem";
  return a.status === "atencao" ? "conversar" : a.status === "sem_dados_recentes" ? "observar" : "bem";
}

function nivelDosAlertas(alertas: Alerta[], ids: Alerta["id"][]): Nivel {
  const meus = alertas.filter((a) => ids.includes(a.id));
  if (meus.some((a) => a.nivel === "atencao")) return "conversar";
  if (meus.length) return "observar";
  return "bem";
}

/** Sem relógio (r = null), ficam só os temas dos exames: coração e sono dependem do relógio. */
export function temas(i: Insights, r: Relogio | null): Tema[] {
  const area = (id: string) => i.areas.find((a) => a.id === id);
  const s = (id: string) => i.series.find((x) => x.analito === id);
  const alertas = r?.alertas ?? [];
  const tem = (id: Alerta["id"]) => alertas.some((a) => a.id === id);

  const coracao = nivelDosAlertas(alertas, ["ritmo_irregular", "fc_repouso_subindo"]);
  const sono = nivelDosAlertas(alertas, ["sono_curto", "atividade_caindo"]);
  const glicose = s("glicose");
  const ldl = s("ldl");

  const lista: Tema[] = [
    {
      id: "coracao",
      titulo: "Coração",
      nivel: coracao,
      frase: tem("ritmo_irregular")
        ? "O relógio notou batimentos irregulares algumas vezes"
        : tem("fc_repouso_subindo")
          ? "Batimento em repouso mais alto que o seu normal"
          : "Batimentos dentro do seu normal",
      href: "/relogio",
    },
    {
      id: "acucar",
      titulo: "Açúcar no sangue",
      nivel: nivelDaArea(area("glicemia")),
      frase: glicose ? fraseSerie(glicose) : "Sem exames recentes",
      href: "/exame/glicose",
    },
    {
      id: "colesterol",
      titulo: "Colesterol",
      nivel: nivelDaArea(area("colesterol")),
      frase: ldl ? `LDL: ${fraseSerie(ldl).toLowerCase()}` : "Sem exames recentes",
      href: "/exame/ldl",
    },
    {
      id: "sono",
      titulo: "Sono e movimento",
      nivel: sono,
      frase: tem("sono_curto")
        ? "Dormindo menos de 6 horas nas últimas semanas"
        : tem("atividade_caindo")
          ? "Andando menos que antes"
          : "Sono e passos no seu normal",
      href: "/relogio",
    },
  ];
  return r ? lista : lista.filter((t) => t.id !== "coracao" && t.id !== "sono");
}

/** Áreas de exame fora dos 4 temas: as em atenção viram uma linha; o resto vira "em dia". */
export function outrasAreas(i: Insights): { atencao: Area[]; emDia: Area[] } {
  const cobertas = new Set(["glicemia", "colesterol"]);
  const resto = i.areas.filter((a) => !cobertas.has(a.id));
  return { atencao: resto.filter((a) => a.status === "atencao"), emDia: resto.filter((a) => a.status !== "atencao") };
}

/** Média por semana de uma métrica do relógio (para a minicurva de 6 meses ficar suave). */
export function mediaSemanal(dias: Dia[], campo: "fc_repouso" | "sono_horas" | "passos" | "vfc_ms"): number[] {
  const out: number[] = [];
  for (let k = 0; k < dias.length; k += 7) {
    const v = dias.slice(k, k + 7).map((d) => d[campo]).filter((x): x is number => x !== null);
    if (v.length) out.push(v.reduce((a, b) => a + b, 0) / v.length);
  }
  return out;
}

export function saudacao(hora: number): string {
  return hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
}
