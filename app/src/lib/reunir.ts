/**
 * "Reunir meus exames" (/reunir): o passo a passo por área para quem tem uma pasta cheia de exames.
 *
 * Cada área diz o que procurar e POR QUE, a partir do perfil (idade, sexo, diagnósticos, médicos, família). São regras
 * simples e explicáveis, sem IA: servem para lembrar a pessoa do que ela provavelmente tem guardado, não para
 * recomendar exame. O progresso fica em perfil_saude.coleta ({area: enviado | nao_tenho | pulado}).
 *
 * As áreas daqui são "de onde vem o papel" e são diferentes das AREAS de insights/src/regras.ts (grupos de analitos
 * do exame de sangue): tudo que é laboratório cai em "sangue".
 */
import { idade, type PerfilSaudeLeitura } from "@/lib/checkup";
import type { SituacaoColeta } from "../../../lib/types";

export type TipoColeta = "laboratorio" | "vacina" | "descritivo";
export type AreaColeta = {
  id: string;
  titulo: string;
  sub: string;
  /** O que procurar na pasta (nomes como aparecem no papel). */
  procurar: string[];
  tipo: TipoColeta;
};
export type Contexto = { idade: number; sexo: "M" | "F"; perfil: PerfilSaudeLeitura };

export const AREAS_COLETA: AreaColeta[] = [
  {
    id: "sangue", titulo: "Exames de sangue e urina", tipo: "laboratorio",
    sub: "Os mais comuns. Costumam vir do laboratório em PDF ou em papel, com várias páginas.",
    procurar: ["Hemograma", "Glicose e hemoglobina glicada", "Colesterol e triglicérides", "Creatinina e ureia", "TSH", "Urina tipo 1", "PSA"],
  },
  {
    id: "coracao", titulo: "Coração", tipo: "descritivo",
    sub: "Laudos de cardiologia: em geral um texto com a conclusão no final, às vezes com o traçado.",
    procurar: ["Eletrocardiograma (ECG)", "Ecocardiograma", "Teste ergométrico (esteira)", "Holter 24 h", "MAPA (pressão 24 h)", "Cateterismo"],
  },
  {
    id: "gastro", titulo: "Estômago e intestino", tipo: "descritivo",
    sub: "Laudos de endoscopia e colonoscopia (às vezes com fotos) e ultrassom de abdome.",
    procurar: ["Endoscopia", "Colonoscopia", "Ultrassom de abdome", "Biópsia (anatomopatológico)"],
  },
  {
    id: "rins", titulo: "Rins e vias urinárias", tipo: "descritivo",
    sub: "Ultrassons e laudos de urologia ou nefrologia.",
    procurar: ["Ultrassom de rins e vias urinárias", "Ultrassom de próstata", "Urina de 24 horas"],
  },
  {
    id: "mulher", titulo: "Saúde da mulher", tipo: "descritivo",
    sub: "Exames que o ginecologista pede de rotina.",
    procurar: ["Mamografia", "Ultrassom de mamas", "Papanicolau (preventivo)", "Ultrassom transvaginal"],
  },
  {
    id: "ossos", titulo: "Ossos", tipo: "descritivo",
    sub: "Mede a força dos ossos. Costuma ser pedido depois dos 50 ou na menopausa.",
    procurar: ["Densitometria óssea", "Raio-x de coluna ou articulações"],
  },
  {
    id: "pulmao", titulo: "Pulmão", tipo: "descritivo",
    sub: "Imagens e testes de respiração.",
    procurar: ["Raio-x de tórax", "Tomografia de tórax", "Espirometria (prova de função pulmonar)"],
  },
  {
    id: "outros", titulo: "Outros exames de imagem", tipo: "descritivo",
    sub: "O que sobrou na pasta: qualquer laudo com conclusão escrita.",
    procurar: ["Tomografia", "Ressonância", "Ultrassom de tireoide", "Doppler de carótidas ou pernas"],
  },
  {
    id: "vacinas", titulo: "Vacinas", tipo: "vacina",
    sub: "A carteira de vacinação (foto de cada página) ou o comprovante do Meu SUS Digital.",
    procurar: ["Carteira de vacinação", "Certificado do Meu SUS Digital"],
  },
];

export const AREA_IDS = new Set(AREAS_COLETA.map((a) => a.id));
export const SITUACOES: SituacaoColeta[] = ["enviado", "nao_tenho", "pulado"];

export function contexto(cad: { nascimento: string; sexo: "M" | "F" }, perfil: PerfilSaudeLeitura): Contexto {
  return { idade: idade(cad.nascimento), sexo: cad.sexo, perfil };
}

const tem = <T>(l: T[] | null | undefined, x: T) => !!l?.includes(x);
function familiaTem(p: PerfilSaudeLeitura, c: string): string[] {
  const nomes: Record<string, string> = { pai: "seu pai", mae: "sua mãe", irmaos: "um irmão ou irmã", avos: "um avô ou avó" };
  return Object.entries(p.familia_parentes ?? {})
    .filter(([, x]) => (x?.condicoes as string[] | undefined)?.includes(c))
    .map(([k]) => nomes[k] ?? k);
}
function cancerNaFamilia(p: PerfilSaudeLeitura, termos: RegExp): boolean {
  const qual = Object.values(p.familia_parentes ?? {}).map((x) => x?.cancer_qual ?? "").join(" ") + " " + (p.familia_cancer ?? "");
  return termos.test(qual.toLowerCase());
}
const textoLivre = (p: PerfilSaudeLeitura) =>
  [...(p.cirurgias ?? []).map((c) => c.nome), ...(p.internacoes ?? []).map((i) => i.motivo), p.condicoes_outras ?? ""]
    .join(" ").toLowerCase();

/** As áreas que fazem sentido para esta pessoa, na ordem do passo a passo. */
export function areasPara(c: Contexto): AreaColeta[] {
  const p = c.perfil;
  return AREAS_COLETA.filter((a) => {
    if (a.id === "mulher") return c.sexo === "F";
    if (a.id === "ossos") return (c.sexo === "F" && c.idade >= 45) || c.idade >= 60 || tem(p.medicos, "ortopedista") || tem(p.medicos, "geriatra");
    if (a.id === "pulmao") return (p.fumo !== null && p.fumo !== "nunca") || tem(p.medicos, "pneumologista") || c.idade >= 60;
    return true;
  }).map((a) => (a.id === "sangue" && c.sexo === "F" ? { ...a, procurar: a.procurar.filter((x) => x !== "PSA") } : a))
    .map((a) => (a.id === "rins" && c.sexo === "F" ? { ...a, procurar: a.procurar.filter((x) => !x.includes("próstata")) } : a));
}

/** Por que vale procurar nesta área, em frases curtas a partir do perfil (vazio = nada específico). */
export function motivos(a: AreaColeta, c: Contexto): string[] {
  const p = c.perfil;
  const m: string[] = [];
  switch (a.id) {
    case "sangue":
      m.push("Quase todo check-up tem. Quanto mais anos você juntar, melhor o Zelo mostra a evolução.");
      if (tem(p.condicoes, "diabetes")) m.push("Você tem diabetes: procure as hemoglobinas glicadas (HbA1c) dos últimos anos.");
      if (tem(p.condicoes, "colesterol_alto")) m.push("Você tem colesterol alto: os perfis lipídicos antigos mostram se o tratamento funcionou.");
      if (tem(p.condicoes, "tireoide")) m.push("Você trata a tireoide: procure os TSH e T4 livre.");
      if (c.sexo === "M" && c.idade >= 45) m.push("Depois dos 45, o PSA costuma entrar nos exames de rotina do homem.");
      break;
    case "coracao": {
      if (tem(p.medicos, "cardiologista")) m.push("Você acompanha com cardiologista: quase sempre há eletrocardiograma e ecocardiograma.");
      if (tem(p.condicoes, "coracao")) m.push("Você já teve problema no coração: os laudos antigos ajudam a comparar.");
      if (tem(p.condicoes, "hipertensao")) m.push("Quem tem pressão alta costuma ter ECG, ecocardiograma ou MAPA.");
      const inf = familiaTem(p, "infarto_avc_cedo");
      if (inf.length) m.push(`Infarto ou AVC cedo na família (${inf.join(", ")}): o teste ergométrico é comum nesse caso.`);
      if (!m.length && c.idade >= 40) m.push("Depois dos 40, o eletrocardiograma costuma aparecer nos check-ups e nas cirurgias.");
      break;
    }
    case "gastro":
      if (tem(p.medicos, "gastroenterologista")) m.push("Você acompanha com gastroenterologista: procure as endoscopias e colonoscopias.");
      if (c.idade >= 45) m.push("A partir dos 45, a colonoscopia faz parte do rastreio de câncer de intestino.");
      if (cancerNaFamilia(p, /intestin|c[oó]lon|reto|est[oô]mago|g[aá]stric/)) m.push("Câncer de intestino ou estômago na família: esses laudos são importantes.");
      if (/ves[ií]cula|h[ée]rnia|ap[eê]ndic/.test(textoLivre(p))) m.push("Você contou uma cirurgia no abdome: costuma haver ultrassom de antes.");
      break;
    case "rins":
      if (tem(p.condicoes, "rim") || tem(p.medicos, "nefrologista")) m.push("Você acompanha os rins: procure ultrassons e urina de 24 horas.");
      if (tem(p.medicos, "urologista")) m.push("Você acompanha com urologista: costuma haver ultrassom de rins, bexiga ou próstata.");
      if (tem(p.condicoes, "diabetes") || tem(p.condicoes, "hipertensao")) m.push("Diabetes e pressão alta afetam os rins com o tempo.");
      if (/c[aá]lculo|pedra no rim/.test(textoLivre(p))) m.push("Você contou cálculo renal: o ultrassom da época ajuda.");
      break;
    case "mulher":
      if (tem(p.medicos, "ginecologista")) m.push("Você acompanha com ginecologista: os preventivos e as mamografias ficam com você.");
      if (c.idade >= 40) m.push("A partir dos 40, a mamografia costuma ser anual ou a cada 2 anos.");
      if (c.idade >= 25 && c.idade <= 64) m.push("Dos 25 aos 64, o preventivo (Papanicolau) é de rotina.");
      if (cancerNaFamilia(p, /mama|ov[aá]rio/)) m.push("Câncer de mama ou ovário na família: esses laudos são importantes.");
      break;
    case "ossos":
      if (c.sexo === "F" && (p.menopausa || c.idade >= 50)) m.push("Depois da menopausa, a densitometria é pedida com frequência.");
      if (c.idade >= 65) m.push("Depois dos 65, a densitometria costuma entrar no check-up.");
      if (tem(p.medicos, "ortopedista")) m.push("Você acompanha com ortopedista: procure raio-x e densitometria.");
      break;
    case "pulmao":
      if (p.fumo === "atual" || p.fumo === "ex") m.push("Quem fuma ou já fumou costuma ter raio-x ou tomografia de tórax.");
      if (tem(p.medicos, "pneumologista")) m.push("Você acompanha com pneumologista: procure a espirometria.");
      if ((p.internacoes ?? []).some((i) => /pneumon|covid|pulm/.test(i.motivo.toLowerCase()))) m.push("Você contou uma internação pelo pulmão: o raio-x da época ajuda.");
      break;
    case "outros":
      if ((p.cirurgias ?? []).length) m.push("Antes de cada cirurgia costumam pedir exames de imagem: procure os da época.");
      if (tem(p.condicoes, "tireoide")) m.push("Você trata a tireoide: procure o ultrassom de tireoide.");
      break;
    case "vacinas":
      m.push("A carteira mostra o que está em dia e o que falta (gripe, tétano, hepatite B, pneumonia...).");
      if (c.idade >= 60) m.push("Depois dos 60, a vacina da gripe é anual e a da pneumonia é recomendada.");
      break;
  }
  return m;
}

/** Quantos documentos desta área já estão no Zelo. */
export type DocResumo = { tipo: string; data: string | null; area?: string | null };
export function enviadosNaArea(a: AreaColeta, docs: DocResumo[]): DocResumo[] {
  if (a.tipo === "laboratorio") return docs.filter((d) => d.tipo === "laudo_exame");
  if (a.tipo === "vacina") return docs.filter((d) => d.tipo === "carteira_vacinacao");
  return docs.filter((d) => d.tipo === "laudo_descritivo" && d.area === a.id);
}

/** A primeira área ainda sem resposta (null = todas respondidas: mostra o resumo). */
export function proximaArea(areas: AreaColeta[], coleta: Partial<Record<string, SituacaoColeta>> | undefined): AreaColeta | null {
  return areas.find((a) => !coleta?.[a.id]) ?? null;
}
