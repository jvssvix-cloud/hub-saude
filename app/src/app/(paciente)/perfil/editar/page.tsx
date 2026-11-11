import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { salvarBloco } from "@/app/checkup/acoes";
import { Campos } from "@/app/checkup/Campos";
import { FormBloco } from "@/app/checkup/FormBloco";
import { BLOCOS, TOTAL_BLOCOS } from "@/lib/checkup";
import { meuPerfil } from "@/lib/perfil";
import type { PerfilSaude } from "../../../../../../lib/types";

export const metadata: Metadata = { title: "Editar perfil · Zelo" };

/** Edita um bloco do perfil (1 a 6) com os mesmos campos do check-up; "Salvar" volta para /perfil. */
export default async function EditarPerfil({ searchParams }: PageProps<"/perfil/editar">) {
  const n = Number((await searchParams).bloco);
  if (!Number.isInteger(n) || n < 1 || n >= TOTAL_BLOCOS) redirect("/perfil");
  const p = await meuPerfil();
  if (!p) redirect("/perfil");
  const bloco = BLOCOS[n - 1];

  return (
    <div className="space-y-6 pt-3">
      <section>
        <p className="text-sm text-suave">Meu perfil de saúde</p>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight">{bloco.titulo}</h1>
        <p className="mt-1 text-[15px] text-suave">{bloco.sub}</p>
      </section>
      <FormBloco acao={salvarBloco.bind(null, "perfil", n)} n={n} opcional={false} ultimo={false} edicao>
        {/* numeric chega como texto; Campos converte o que precisa */}
        <Campos n={n} cad={p.cad} perfil={p.perfil as unknown as PerfilSaude} email={null} edicao />
      </FormBloco>
    </div>
  );
}
