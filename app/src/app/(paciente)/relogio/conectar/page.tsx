import type { Metadata } from "next";
import Link from "next/link";
import { IconeRelogio } from "@/components/ConecteWearable";
import { BotaoConectar } from "./BotaoConectar";

export const metadata: Metadata = { title: "Conecte seu wearable · Zelo" };

const FONTES = [
  {
    nome: "Apple Saúde",
    onde: "iPhone e Apple Watch",
    texto: "E qualquer relógio ou app que grave no Apple Saúde (Garmin, Fitbit, Oura e outros).",
  },
  {
    nome: "Health Connect",
    onde: "Android",
    texto: "Samsung Health, Google Fit, Fitbit, Garmin, Xiaomi e outros apps que gravam no Health Connect.",
  },
];

const DADOS = [
  ["Batimento em repouso", "e se ele está subindo em relação ao seu normal"],
  ["Avisos de ritmo irregular", "que o próprio relógio registra"],
  ["Sono", "horas por noite"],
  ["Passos", "e se você está andando menos que antes"],
];

/**
 * Como o paciente conecta o relógio. A conexão é do app do Zelo para celular (HealthKit / Health Connect só existem lá);
 * esta página apresenta a ideia e o que é lido. Os dados que chegam passam pelas mesmas regras do relógio (wearable/).
 */
export default function ConectarWearable() {
  return (
    <div className="space-y-6 pt-3">
      <Link href="/relogio" className="text-sm font-semibold text-marca hover:underline">
        ‹ Relógio
      </Link>
      <section className="flex items-start gap-4">
        <IconeRelogio grande />
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight">Conecte seu wearable</h1>
          <p className="mt-1 text-[15px] text-suave">
            Seu relógio vê o que acontece entre um exame e outro. Juntos, contam a história inteira para você e para o seu médico.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        {FONTES.map((f) => (
          <div key={f.nome} className="rounded-3xl border border-linha bg-cartao p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold tracking-tight">{f.nome}</p>
                <p className="text-sm font-semibold text-marca">{f.onde}</p>
                <p className="mt-1 text-sm text-suave">{f.texto}</p>
              </div>
            </div>
            <div className="mt-3">
              <BotaoConectar fonte={f.nome} />
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-3xl bg-bege p-4 sm:p-5">
        <h2 className="text-lg font-bold tracking-tight">O que o Zelo lê</h2>
        <ul className="mt-2 space-y-2 text-[15px]">
          {DADOS.map(([t, d]) => (
            <li key={t} className="flex gap-2.5">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-marca" />
              <span>
                <span className="font-semibold">{t}</span> <span className="text-suave">{d}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-suave">Como funciona</h2>
        <ol className="space-y-2.5 text-[15px]">
          {[
            "No app do Zelo, toque em Conectar e escolha no seu celular o que liberar.",
            "O Zelo só lê. Não escreve nada no seu relógio nem no seu celular.",
            "Os dados aparecem em Relógio, ao lado dos exames, com avisos por regras simples. Não é diagnóstico.",
            "Seu médico só vê o relógio se você marcar \"Relógio\" ao compartilhar. Você desconecta quando quiser.",
          ].map((t, k) => (
            <li key={k} className="flex gap-3">
              <span className="num grid size-6 shrink-0 place-items-center rounded-full bg-marca-fundo text-xs font-bold text-marca">{k + 1}</span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
