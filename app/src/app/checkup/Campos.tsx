/**
 * Campos de cada bloco do perfil de saúde, usados no check-up (/checkup) e na edição (/perfil/editar).
 * Componente de servidor: só os pedaços interativos (IMC, contador de atividade) são de cliente.
 */
import Link from "next/link";
import { ALCOOL, CONDICOES, FAMILIA, FUMO } from "@/lib/checkup";
import type { PerfilSaude } from "../../../../lib/types";
import { CAMPO, CampoAtividade, CamposCorpo } from "./FormBloco";

export type Cadastro = { nome: string; nascimento: string; sexo: "M" | "F"; telefone: string | null };

export function Rotulo({ children, dica }: { children: React.ReactNode; dica?: string }) {
  return (
    <span className="mb-1 block text-sm font-semibold">
      {children}
      {dica && <span className="block text-xs font-normal text-suave">{dica}</span>}
    </span>
  );
}

/** Opções em pílulas (rádio ou caixa), boas de tocar no celular. */
export function Opcoes({
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
export const num = (v: number | string | null | undefined) => (v === null || v === undefined || v === "" ? null : Number(v));
const simNao = (v: boolean | null | undefined) => (v === true ? "sim" : v === false ? "nao" : null);

export function Campos({
  n, cad, perfil, email, edicao = false,
}: {
  n: number;
  cad: Cadastro | null;
  perfil: PerfilSaude | null;
  email: string | null;
  edicao?: boolean;
}) {
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
          {edicao && perfil ? (
            <>
              {/* aceites já dados: a edição mantém (a data do primeiro aceite não muda) */}
              <input type="hidden" name="aceite_termos" value="on" />
              <input type="hidden" name="aceite_dados" value="on" />
            </>
          ) : (
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
          )}
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
          <div>
            <Rotulo>Atividade física</Rotulo>
            <CampoAtividade minSemana={num(perfil?.atividade_min_semana)} />
          </div>
          <label className="block">
            <Rotulo dica="numa noite comum">Sono (horas por noite)</Rotulo>
            <input name="sono" inputMode="decimal" placeholder="7" defaultValue={num(perfil?.sono_horas)?.toLocaleString("pt-BR") ?? undefined} className={CAMPO} />
          </label>
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
