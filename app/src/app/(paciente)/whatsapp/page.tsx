import type { Metadata } from "next";
import { SimuladorWhatsApp, type DadosSimulador } from "@/components/SimuladorWhatsApp";
import { meusInsights } from "@/lib/dados";
import { mesAno } from "@/lib/insights";
import { meuPerfil } from "@/lib/perfil";

export const metadata: Metadata = { title: "Zelo no WhatsApp · Zelo" };

/** Pedido médico de exemplo (check-up comum) e a série do histórico que responde cada item. */
const PEDIDO: { nome: string; analito: string }[] = [
  { nome: "Hemograma completo", analito: "plaquetas" },
  { nome: "Glicemia de jejum", analito: "glicose" },
  { nome: "Hemoglobina glicada (HbA1c)", analito: "hba1c" },
  { nome: "Colesterol total e frações", analito: "ldl" },
  { nome: "TGO e TGP", analito: "tgp" },
  { nome: "Gama-GT (GGT)", analito: "ggt" },
  { nome: "TSH", analito: "tsh" },
];

const meses = (de: string, ate: string) =>
  (Number(ate.slice(0, 4)) - Number(de.slice(0, 4))) * 12 + Number(ate.slice(5, 7)) - Number(de.slice(5, 7));

/**
 * Zelo no WhatsApp (simulação, 12/11). O CANAL é simulado; os dados são os do paciente logado e o laudo enviado
 * na conversa passa pela leitura real (/api/enviar) e entra no histórico (ação salvar), como no /enviar.
 */
export default async function ZeloNoWhatsApp() {
  const [i, perfil] = await Promise.all([meusInsights(), meuPerfil()]);
  const ultimo = new Map(i.series.map((s) => [s.analito, s.ultimo]));

  const dados: DadosSimulador = {
    nome: (perfil?.cad.nome ?? i.paciente.nome).split(" ")[0],
    sexo: perfil?.cad.sexo ?? i.paciente.sexo,
    historico: {
      laudos: i.periodo.laudos,
      laboratorios: i.periodo.laboratorios.length,
      de: i.periodo.inicio.slice(0, 4),
      ate: i.periodo.fim.slice(0, 4),
    },
    // o que mais chama atenção no histórico: alterado e subindo (ex.: glicose)
    destaques: i.series
      .filter((s) => s.alterado && s.tendencia?.direcao === "subindo")
      .slice(0, 2)
      .map((s) => `${s.nome}: ${s.tendencia!.texto}`),
    pedido: PEDIDO.map((p) => {
      const u = ultimo.get(p.analito);
      return {
        nome: p.nome,
        feito: u && meses(u.data, i.hoje) < 12 ? mesAno(u.data) : null,
        alterado: !!u?.fora_da_faixa,
      };
    }),
    faltam: (i.exames_que_faltam ?? []).filter((e) => e.prioridade <= 2).map((e) => e.nome),
    remedios: (perfil?.perfil.remedios_lista ?? [])
      .filter((r) => r.horarios?.length)
      .map((r) => ({ nome: [r.nome, r.dose].filter(Boolean).join(" "), horarios: r.horarios! })),
  };

  return (
    <div className="space-y-5 pt-3">
      <section>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">Zelo no WhatsApp</h1>
        <p className="mt-1 text-[15px] text-suave">
          Para quem não usa aplicativo, mas usa WhatsApp: mandar exames, lembrar consultas e remédios, e a família junto.
        </p>
      </section>
      <SimuladorWhatsApp dados={dados} />
    </div>
  );
}
