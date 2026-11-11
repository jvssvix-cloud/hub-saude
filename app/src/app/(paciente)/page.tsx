import Link from "next/link";
import { Suspense } from "react";
import { BarraContagem } from "@/components/LinhaIndice";
import { NotaDoMedico } from "@/components/NotaDoMedico";
import { MiniCurva } from "@/components/MiniCurva";
import { ProximoPasso } from "@/components/ProximoPasso";
import { meuRelogio, meusInsights } from "@/lib/dados";
import { serie } from "@/lib/insights";
import { NIVEL, fraseSerie, mediaSemanal, outrasAreas, temas, type Tema } from "@/lib/paciente";

export default async function Inicio() {
  const insights = await meusInsights();
  const relogio = await meuRelogio();
  const { paciente, periodo } = insights;
  const lista = temas(insights, relogio);
  const pendentes = lista.filter((t) => t.nivel === "conversar").length;
  const { atencao, emDia } = outrasAreas(insights);
  const glicose = serie(insights, "glicose");
  const ldl = serie(insights, "ldl");
  const fora = insights.series.filter((s) => s.alterado).length;
  const naFaixa = insights.series.length - fora;
  const anos = Number(periodo.fim.slice(0, 4)) - Number(periodo.inicio.slice(0, 4));

  return (
    <div className="space-y-7">
      <section className="pt-3">
        <p className="text-suave">Olá,</p>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">{paciente.nome.split(" ")[0]}</h1>
        <p className="mt-1.5 text-[15px] text-suave">
          {anos} anos de exames, {periodo.laboratorios.length} laboratórios{relogio ? " e o seu relógio" : ""}, num lugar só.
        </p>
        <Link
          href="/enviar"
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-linha bg-cartao px-4 py-2 text-sm font-semibold text-marca transition-colors hover:border-salvia"
        >
          <span aria-hidden>+</span> Enviar exame
        </Link>
      </section>

      <Suspense fallback={null}>
        <ProximoPasso />
      </Suspense>

      <Link href="/exames" className="block rounded-3xl border border-linha bg-cartao p-4 transition-colors hover:border-salvia sm:p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-bold">
            <span className="num text-2xl">{insights.series.length}</span> exames acompanhados
          </p>
          <span className="shrink-0 text-sm font-semibold text-marca">Ver por sistema ›</span>
        </div>
        <div className="mt-3">
          <BarraContagem ok={naFaixa} fora={fora} grossa />
        </div>
        <div className="mt-2 flex gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-full bg-[var(--ok)]" />
            <span className="num font-semibold">{naFaixa}</span> na faixa
          </span>
          <span className="flex items-center gap-1.5 text-atencao">
            <span aria-hidden className="size-2.5 rounded-full bg-fora" />
            <span className="num font-semibold">{fora}</span> fora da faixa
          </span>
        </div>
      </Link>

      <section className="rounded-3xl bg-bege p-4 sm:p-5">
        <div className="mb-3">
          <h2 className="text-lg font-bold tracking-tight">Como você está</h2>
          <p className="text-sm text-suave">
            {pendentes > 0
              ? `${pendentes} ${pendentes === 1 ? "assunto" : "assuntos"} para levar à próxima consulta`
              : "Nada que peça atenção agora"}
          </p>
        </div>
        <ul className="grid grid-cols-2 gap-2.5">
          {lista.map((t) => (
            <li key={t.id}>
              <CartaoTema tema={t} />
            </li>
          ))}
        </ul>
      </section>

      <Suspense fallback={null}>
        <NotaDoMedico />
      </Suspense>

      <section className="space-y-3">
        <h2 className="text-lg font-bold tracking-tight">Seus índices ao longo do tempo</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {glicose && (
            <CartaoIndice
              titulo="Açúcar no sangue"
              frase={fraseSerie(glicose)}
              periodo={`${anos} anos · exames`}
              href="/exame/glicose"
              valores={glicose.pontos.map((p) => p.valor)}
              faixa={{ min: glicose.ultimo.ref_min, max: glicose.ultimo.ref_max }}
              fora={glicose.alterado}
            />
          )}
          {ldl && (
            <CartaoIndice
              titulo="Colesterol LDL"
              frase={fraseSerie(ldl)}
              periodo={`${anos} anos · exames`}
              href="/exame/ldl"
              valores={ldl.pontos.map((p) => p.valor)}
              faixa={{ min: ldl.ultimo.ref_min, max: ldl.ultimo.ref_max }}
              fora={ldl.alterado}
            />
          )}
          {relogio && (
          <>
          <CartaoIndice
            titulo="Batimento em repouso"
            frase={
              relogio.resumo.fc_repouso.atual_14d !== null && relogio.resumo.fc_repouso.linha_base !== null && relogio.resumo.fc_repouso.atual_14d > relogio.resumo.fc_repouso.linha_base
                ? `Mais alto que o seu normal nas últimas semanas`
                : "No seu normal"
            }
            periodo="6 meses · relógio"
            href="/relogio"
            valores={mediaSemanal(relogio.dias, "fc_repouso")}
            cor="var(--rivio-1)"
            fora={relogio.alertas.some((a) => a.id === "fc_repouso_subindo")}
          />
          <CartaoIndice
            titulo="Sono"
            frase={relogio.alertas.some((a) => a.id === "sono_curto") ? "Noites mais curtas nas últimas semanas" : "No seu normal"}
            periodo="6 meses · relógio"
            href="/relogio"
            valores={mediaSemanal(relogio.dias, "sono_horas")}
            faixa={{ min: 7, max: 9 }}
            cor="var(--rivio-2)"
            fora={relogio.alertas.some((a) => a.id === "sono_curto")}
          />
          </>
          )}
        </div>
        <Link href="/evolucao" className="inline-block text-sm font-semibold text-marca hover:underline">
          Ver todos os índices ›
        </Link>
      </section>

      <section className="rounded-3xl border border-linha bg-cartao p-4 sm:p-5">
        <h2 className="text-lg font-bold tracking-tight">Outros exames</h2>
        <ul className="mt-2 divide-y divide-linha">
          {atencao.map((a) => (
            <li key={a.id}>
              <Link href={`/exame/${a.analitos.find((x) => serie(insights, x)?.alterado) ?? a.analitos[0]}`} className="flex items-center justify-between gap-3 py-3">
                <span>
                  <span className="block font-semibold">{a.nome}</span>
                  <span className="text-sm text-atencao">{NIVEL.conversar.texto}</span>
                </span>
                <span aria-hidden className="text-suave">›</span>
              </Link>
            </li>
          ))}
          <li className="py-3">
            <span className="block font-semibold">Em dia</span>
            <span className="text-sm text-suave">{emDia.map((a) => a.nome).join(", ")}</span>
          </li>
        </ul>
      </section>

      <Link
        href="/compartilhar"
        className="flex items-center justify-between gap-3 rounded-3xl bg-marca px-5 py-4 text-white transition-colors hover:bg-marca-hover"
      >
        <span>
          <span className="block font-bold">Compartilhar com meu médico</span>
          <span className="block text-sm text-white/75">Você escolhe o que ele vê e por quanto tempo</span>
        </span>
        <span aria-hidden className="text-xl">›</span>
      </Link>

      <p className="text-center text-xs text-suave">
        Gerado por regras a partir dos seus exames e do seu relógio. Não é diagnóstico.
        {/* Selinho: mostra se os exames vieram do banco (Supabase) ou do insights.json (plano B). */}
        <span className="mt-1 block opacity-70" data-origem={insights.origem}>
          Dados: {insights.origem === "banco" ? "banco" : "arquivo de demonstração"}
        </span>
      </p>
    </div>
  );
}

function CartaoTema({ tema: t }: { tema: Tema }) {
  const n = NIVEL[t.nivel];
  return (
    <Link href={t.href} className="flex h-full flex-col rounded-2xl bg-cartao p-3.5 transition-shadow hover:shadow-[0_0_0_1.5px_var(--salvia)]">
      <span className="flex items-center gap-2">
        <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${n.ponto}`} />
        <span className="font-bold">{t.titulo}</span>
      </span>
      <span className={`mt-1.5 text-[13px] font-semibold leading-snug ${n.classe}`}>{n.texto}</span>
      <span className="mt-1 text-[13px] leading-snug text-suave">{t.frase}</span>
    </Link>
  );
}

function CartaoIndice({
  titulo, frase, periodo, href, valores, faixa, fora, cor,
}: {
  titulo: string;
  frase: string;
  periodo: string;
  href: string;
  valores: number[];
  faixa?: { min: number | null; max: number | null };
  fora: boolean;
  cor?: string;
}) {
  return (
    <Link href={href} className="block rounded-3xl border border-linha bg-cartao p-4 transition-colors hover:border-salvia">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-bold">{titulo}</h3>
        <span className="shrink-0 text-xs text-suave">{periodo}</span>
      </div>
      <p className={`mt-0.5 text-sm ${fora ? "text-atencao" : "text-suave"}`}>{frase}</p>
      <div className="mt-3">
        <MiniCurva valores={valores} faixa={faixa} destaqueFora={fora} cor={cor} />
      </div>
      <p className="mt-2 text-sm font-semibold text-marca">Ver evolução ›</p>
    </Link>
  );
}
