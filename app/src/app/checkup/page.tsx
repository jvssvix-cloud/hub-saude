import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { sair } from "@/app/entrar/acoes";
import { Logo } from "@/components/Logo";
import { ALCOOL, BLOCOS, BLOCOS_OPCIONAIS, CONDICOES, FAMILIA, FUMO, TOTAL_BLOCOS } from "@/lib/checkup";
import { contaAtual } from "@/lib/sessao";
import { getServidor } from "@/lib/supabase";
import type { PerfilSaude } from "../../../../lib/types";
import { salvarBloco } from "./acoes";
import { CAMPO, CamposCorpo, FormBloco } from "./FormBloco";

export const metadata: Metadata = { title: "Check-up inicial · Zelo" };

/** Check-up inicial: um bloco por tela, com barra de progresso. Quem não concluiu é trazido para cá ao entrar. */
export default function Checkup({ searchParams }: PageProps<"/checkup">) {
  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-6">
      <Logo className="h-8 w-auto" />
      <Suspense fallback={<p className="mt-8 text-sm text-suave">Carregando…</p>}>
        <Conteudo searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

type Cadastro = { nome: string; nascimento: string; sexo: "M" | "F"; telefone: string | null };

async function Conteudo({ searchParams }: { searchParams: PageProps<"/checkup">["searchParams"] }) {
  const conta = await contaAtual();
  if (conta.concluido) redirect("/");
  const pid = conta.paciente ? encodeURIComponent(conta.paciente.id) : null;
  const [[cad], [perfil]] = pid
    ? await Promise.all([
        getServidor<Cadastro[]>(`paciente?id=eq.${pid}&select=nome,nascimento,sexo,telefone`),
        getServidor<PerfilSaude[]>(`perfil_saude?paciente_id=eq.${pid}&select=*`),
      ])
    : [[], []];

  // até onde pode ir: sem cadastro, só o bloco 1; sem altura e peso, até o 2
  const max = !cad || !perfil ? 1 : !perfil.altura_cm || !perfil.peso_kg ? 2 : TOTAL_BLOCOS;
  const pedido = Number((await searchParams).bloco);
  const n = Number.isInteger(pedido) && pedido >= 1 && pedido <= max ? pedido : max === TOTAL_BLOCOS ? 3 : max;
  const bloco = BLOCOS[n - 1];

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between text-xs font-semibold text-suave">
        <span>
          Passo {n} de {TOTAL_BLOCOS}
        </span>
        {BLOCOS_OPCIONAIS.has(n) && <span>opcional</span>}
      </div>
      <div className="mt-2 flex gap-1" aria-hidden>
        {BLOCOS.map((b) => (
          <span key={b.n} className={`h-1.5 flex-1 rounded-full ${b.n <= n ? "bg-marca" : "bg-bege"}`} />
        ))}
      </div>

      <h1 className="mt-6 text-[28px] font-bold leading-tight tracking-tight">{bloco.titulo}</h1>
      <p className="mt-1 text-[15px] text-suave">{bloco.sub}</p>

      <div className="mt-6">
        <FormBloco
          key={n}
          acao={salvarBloco.bind(null, n)}
          n={n}
          opcional={BLOCOS_OPCIONAIS.has(n)}
          ultimo={n === TOTAL_BLOCOS}
        >
          <Campos n={n} cad={cad ?? null} perfil={perfil ?? null} email={conta.usuario.email} />
        </FormBloco>
      </div>

      <form action={sair} className="mt-10 text-center">
        <button type="submit" className="text-sm text-suave hover:text-tinta">
          Sair e continuar depois
        </button>
      </form>
    </div>
  );
}

function Rotulo({ children, dica }: { children: React.ReactNode; dica?: string }) {
  return (
    <span className="mb-1 block text-sm font-semibold">
      {children}
      {dica && <span className="block text-xs font-normal text-suave">{dica}</span>}
    </span>
  );
}

/** Opções em pílulas (rádio ou caixa), boas de tocar no celular. */
function Opcoes({
  nome, tipo, opcoes, marcadas,
}: {
  nome: string;
  tipo: "radio" | "checkbox";
  opcoes: { id: string; rotulo: string; dica?: string }[];
  marcadas: (string | null | undefined)[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {opcoes.map((o) => (
        <label key={o.id} className="cursor-pointer">
          <input type={tipo} name={nome} value={o.id} defaultChecked={marcadas.includes(o.id)} className="peer sr-only" />
          <span className="block rounded-2xl border border-linha bg-cartao px-4 py-2.5 text-sm font-semibold peer-checked:border-marca peer-checked:bg-marca-fundo peer-checked:text-marca peer-focus-visible:border-salvia">
            {o.rotulo}
            {o.dica && <span className="block text-xs font-normal text-suave">{o.dica}</span>}
          </span>
        </label>
      ))}
    </div>
  );
}

const SIM_NAO = [
  { id: "sim", rotulo: "Sim" },
  { id: "nao", rotulo: "Não" },
];
const num = (v: number | string | null | undefined) => (v === null || v === undefined || v === "" ? null : Number(v));
const simNao = (v: boolean | null | undefined) => (v === true ? "sim" : v === false ? "nao" : null);

function Campos({ n, cad, perfil, email }: { n: number; cad: Cadastro | null; perfil: PerfilSaude | null; email: string | null }) {
  switch (n) {
    case 1:
      return (
        <>
          <label className="block">
            <Rotulo>Nome</Rotulo>
            <input name="nome" required autoComplete="name" defaultValue={cad?.nome} className={CAMPO} />
          </label>
          <label className="block">
            <Rotulo>Data de nascimento</Rotulo>
            <input name="nascimento" type="date" required defaultValue={cad?.nascimento} className={CAMPO} />
          </label>
          <div>
            <Rotulo dica="As faixas de referência de vários exames mudam com ele.">Sexo biológico</Rotulo>
            <Opcoes nome="sexo" tipo="radio" opcoes={[{ id: "F", rotulo: "Feminino" }, { id: "M", rotulo: "Masculino" }]} marcadas={[cad?.sexo]} />
          </div>
          <label className="block">
            <Rotulo dica="É por ele que o seu médico pede acesso. Você sempre aprova antes.">Celular com DDD</Rotulo>
            <input
              name="telefone"
              type="tel"
              required
              autoComplete="tel-national"
              placeholder="(11) 91234-5678"
              defaultValue={cad?.telefone ? cad.telefone.slice(2) : undefined}
              className={CAMPO}
            />
          </label>
          <fieldset className="space-y-3 rounded-2xl bg-bege p-4 text-sm">
            <legend className="sr-only">Aceites</legend>
            <label className="flex gap-3">
              <input type="checkbox" name="aceite_termos" required defaultChecked={!!perfil} className="mt-0.5 size-4 accent-[var(--marca)]" />
              <span>
                Li e aceito os{" "}
                <Link href="/termos#termos" target="_blank" className="font-semibold text-marca underline">
                  termos de uso
                </Link>
                .
              </span>
            </label>
            <label className="flex gap-3">
              <input type="checkbox" name="aceite_dados" required defaultChecked={!!perfil} className="mt-0.5 size-4 accent-[var(--marca)]" />
              <span>
                Autorizo o Zelo a guardar e organizar os meus{" "}
                <Link href="/termos#dados" target="_blank" className="font-semibold text-marca underline">
                  dados de saúde
                </Link>{" "}
                para me mostrar. Ninguém mais vê sem a minha autorização.
              </span>
            </label>
          </fieldset>
          {email && <p className="text-xs text-suave">Conta: {email}</p>}
        </>
      );
    case 2:
      // numeric chega do banco como texto ("174.0")
      return <CamposCorpo altura={num(perfil?.altura_cm)} peso={num(perfil?.peso_kg)} />;
    case 3:
      return (
        <>
          <div>
            <Rotulo>Cigarro</Rotulo>
            <Opcoes nome="fumo" tipo="radio" opcoes={FUMO} marcadas={[perfil?.fumo]} />
          </div>
          <div>
            <Rotulo>Bebida alcoólica</Rotulo>
            <Opcoes nome="alcool" tipo="radio" opcoes={ALCOOL} marcadas={[perfil?.alcool]} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <Rotulo dica="caminhada conta">Atividade física (min por semana)</Rotulo>
              <input name="atividade" inputMode="numeric" placeholder="150" defaultValue={perfil?.atividade_min_semana ?? undefined} className={CAMPO} />
            </label>
            <label className="block">
              <Rotulo dica="numa noite comum">Sono (horas por noite)</Rotulo>
              <input name="sono" inputMode="decimal" placeholder="7" defaultValue={num(perfil?.sono_horas)?.toLocaleString("pt-BR") ?? undefined} className={CAMPO} />
            </label>
          </div>
        </>
      );
    case 4:
      return (
        <>
          <div>
            <Rotulo dica="Marque só o que um médico já diagnosticou.">Você tem ou já teve</Rotulo>
            <Opcoes nome="condicao" tipo="checkbox" opcoes={CONDICOES} marcadas={perfil?.condicoes ?? []} />
          </div>
          <label className="block">
            <Rotulo>Outras condições</Rotulo>
            <input name="condicoes_outras" maxLength={300} defaultValue={perfil?.condicoes_outras ?? undefined} className={CAMPO} />
          </label>
          <label className="block">
            <Rotulo dica="Nome e dose, se souber. Um por linha.">Remédios que você toma todo dia</Rotulo>
            <textarea name="remedios" rows={3} maxLength={500} defaultValue={perfil?.remedios ?? undefined} className={CAMPO} />
          </label>
        </>
      );
    case 5:
      return (
        <>
          <div>
            <Rotulo dica="Pais e irmãos.">Na sua família alguém teve</Rotulo>
            <Opcoes nome="familia" tipo="checkbox" opcoes={FAMILIA} marcadas={perfil?.familia ?? []} />
          </div>
          <label className="block">
            <Rotulo dica="Só se marcou câncer.">Qual câncer e quem teve</Rotulo>
            <input name="familia_cancer" maxLength={200} placeholder="mama, mãe" defaultValue={perfil?.familia_cancer ?? undefined} className={CAMPO} />
          </label>
        </>
      );
    case 6:
      return (
        <>
          <label className="block">
            <Rotulo dica="Remédios, alimentos ou outras.">Alergias</Rotulo>
            <input name="alergias" maxLength={300} placeholder="dipirona" defaultValue={perfil?.alergias ?? undefined} className={CAMPO} />
          </label>
          {cad?.sexo === "F" && (
            <>
              <div>
                <Rotulo>Está grávida?</Rotulo>
                <Opcoes nome="gestante" tipo="radio" opcoes={SIM_NAO} marcadas={[simNao(perfil?.gestante)]} />
              </div>
              <div>
                <Rotulo>Já entrou na menopausa?</Rotulo>
                <Opcoes nome="menopausa" tipo="radio" opcoes={SIM_NAO} marcadas={[simNao(perfil?.menopausa)]} />
              </div>
            </>
          )}
        </>
      );
    default:
      return (
        <div className="rounded-2xl bg-marca-fundo p-4 text-[15px]">
          <p className="font-semibold text-marca">Pronto, seu perfil está salvo.</p>
          <p className="mt-1 text-suave">
            Envie um PDF ou uma foto dos seus exames de laboratório. O Zelo lê, você confere e ele monta a evolução de cada
            exame ao longo dos anos. Pode ser agora ou quando quiser.
          </p>
        </div>
      );
  }
}
