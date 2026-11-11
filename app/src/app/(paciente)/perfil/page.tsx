import type { Metadata } from "next";
import Link from "next/link";
import { secoesPerfil } from "@/lib/checkup";
import { horaBrasilia } from "@/lib/medico";
import { meuPerfil } from "@/lib/perfil";

export const metadata: Metadata = { title: "Meu perfil de saúde · Zelo" };

/** Mais > Meu perfil de saúde: o que foi respondido no check-up, por bloco, cada um com "Editar". */
export default async function Perfil() {
  const p = await meuPerfil();
  if (!p) {
    return <p className="pt-6 text-sm text-suave">Não conseguimos abrir o seu perfil agora. Tente de novo em instantes.</p>;
  }
  const secoes = secoesPerfil(p.cad, p.perfil);

  return (
    <div className="space-y-6 pt-3">
      <section>
        <Link href="/mais" className="text-sm font-semibold text-marca hover:underline">
          ‹ Mais
        </Link>
        <h1 className="mt-2 text-[28px] font-bold leading-tight tracking-tight">Meu perfil de saúde</h1>
        <p className="mt-1 text-[15px] text-suave">
          O que você contou no check-up. Ajuda a ler os seus exames e entra nas conversas com o assistente.
        </p>
      </section>

      {secoes.map((s) => (
        <section key={s.bloco} className="rounded-3xl border border-linha bg-cartao p-4 sm:p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-bold tracking-tight">{s.titulo}</h2>
            <Link
              href={`/perfil/editar?bloco=${s.bloco}`}
              className="shrink-0 rounded-full px-3 py-1 text-sm font-semibold text-marca hover:bg-marca-fundo"
            >
              Editar ›
            </Link>
          </div>
          <dl className="mt-2 divide-y divide-linha">
            {s.itens.map((i) => (
              <div key={i.rotulo} className="flex items-baseline justify-between gap-4 py-2.5 text-[15px]">
                <dt className="shrink-0 text-suave">{i.rotulo}</dt>
                <dd className={`text-right ${i.valor ? "font-semibold" : "text-suave"}`}>{i.valor ?? "Não informado"}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      <p className="text-center text-xs text-suave">
        Você aceitou os{" "}
        <Link href="/termos" className="underline">
          termos de uso e o uso dos seus dados de saúde
        </Link>{" "}
        ({p.perfil.termos_versao}) em {horaBrasilia(p.perfil.dados_saude_aceitos_em)}. Ninguém vê este perfil sem a sua
        autorização.
      </p>
    </div>
  );
}
