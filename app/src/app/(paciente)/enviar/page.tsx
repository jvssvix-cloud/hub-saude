import type { Metadata } from "next";
import { EnviarExame } from "@/components/EnviarExame";
import { envioLigado } from "@/lib/envio";

export const metadata: Metadata = { title: "Enviar exame · Zelo" };

/** Enviar um laudo (PDF ou foto) ou a carteira de vacinação: a IA lê, você confere e só então entra no histórico. */
export default function Enviar() {
  return (
    <div className="space-y-6 pt-3">
      <section>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">Enviar exame</h1>
        <p className="mt-1 text-[15px] text-suave">
          PDF do laboratório ou foto do laudo ou da carteira de vacinação. A gente lê, você confere e só depois entra no seu histórico.
        </p>
      </section>
      {envioLigado() ? (
        <EnviarExame />
      ) : (
        <p className="rounded-3xl border border-linha bg-cartao p-5 text-suave">O envio de exames está desligado no momento.</p>
      )}
    </div>
  );
}
