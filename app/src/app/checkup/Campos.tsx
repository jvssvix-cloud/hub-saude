/**
 * Campos de cada bloco do perfil de saúde, usados no check-up (/checkup) e na edição (/perfil/editar).
 * Componente de servidor: só os pedaços interativos (IMC, contador de atividade) são de cliente.
 */
import Link from "next/link";
import { ALCOOL, CONDICOES, CONDICOES_FAMILIA, FUMO, horariosTexto, MEDICOS, PARENTES } from "@/lib/checkup";
import type { PerfilSaude } from "../../../../lib/types";
import { CAMPO, CampoAtividade, CamposCorpo, ListaRepetida } from "./FormBloco";

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
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

/** Remédios para a lista: a lista salva ou, de quem preencheu antes, o texto antigo (um por linha). */
function remediosIniciais(perfil: PerfilSaude | null): Record<string, string>[] {
  if (perfil?.remedios_lista?.length) {
    return perfil.remedios_lista.map((r) => ({
      nome: r.nome, dose: str(r.dose), para_que: str(r.para_que), horarios: r.horarios?.length ? horariosTexto(r.horarios) : "",
    }));
  }
  return (perfil?.remedios ?? "").split(/\n|;/).map((x) => x.trim()).filter(Boolean).map((nome) => ({ nome }));
}

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
          <div>
            <Rotulo dica="Um por remédio. A dose está na caixa ou na receita; se não souber, deixe em branco. Com os horários, o Zelo lembra você pelo WhatsApp.">
              Remédios que você toma todo dia
            </Rotulo>
            <ListaRepetida
              prefixo="remedio"
              campos={[
                { id: "nome", rotulo: "Remédio", placeholder: "Losartana" },
                { id: "dose", rotulo: "Dose", placeholder: "50 mg", largura: "curto" },
                { id: "para_que", rotulo: "Para quê", placeholder: "pressão" },
                { id: "horarios", rotulo: "Horários", placeholder: "8h e 20h" },
              ]}
              iniciais={remediosIniciais(perfil)}
              adicionar="Adicionar remédio"
              vazio="Nenhum remédio de uso contínuo."
            />
          </div>
        </>
      );
    case 5:
      return (
        <>
          <div>
            <Rotulo dica="Quando ficou pelo menos uma noite no hospital.">Já ficou internado?</Rotulo>
            <ListaRepetida
              prefixo="internacao"
              campos={[
                { id: "motivo", rotulo: "Motivo", placeholder: "pneumonia" },
                { id: "ano", rotulo: "Ano", placeholder: "2019", largura: "curto", numerico: true },
              ]}
              iniciais={(perfil?.internacoes ?? []).map((i) => ({ motivo: i.motivo, ano: str(i.ano) }))}
              adicionar="Adicionar internação"
              vazio="Nenhuma internação."
            />
          </div>
          <div>
            <Rotulo dica="Inclusive as pequenas (vesícula, hérnia, catarata...).">Já fez alguma cirurgia?</Rotulo>
            <ListaRepetida
              prefixo="cirurgia"
              campos={[
                { id: "nome", rotulo: "Cirurgia", placeholder: "vesícula" },
                { id: "ano", rotulo: "Ano", placeholder: "2015", largura: "curto", numerico: true },
              ]}
              iniciais={(perfil?.cirurgias ?? []).map((c) => ({ nome: c.nome, ano: str(c.ano) }))}
              adicionar="Adicionar cirurgia"
              vazio="Nenhuma cirurgia."
            />
          </div>
        </>
      );
    case 6:
      return (
        <>
          <div>
            <Rotulo dica="Marque quem você consultou nos últimos anos.">Médicos que acompanham você</Rotulo>
            <Opcoes nome="medico" tipo="checkbox" opcoes={MEDICOS} marcadas={perfil?.medicos ?? []} />
          </div>
          <label className="block">
            <Rotulo>Outros especialistas</Rotulo>
            <input name="medicos_outros" maxLength={200} placeholder="oftalmologista" defaultValue={perfil?.medicos_outros ?? undefined} className={CAMPO} />
          </label>
        </>
      );
    case 7:
      return (
        <>
          <p className="text-sm text-suave">Marque o que cada um teve. Se não souber, deixe em branco.</p>
          {PARENTES.map((pa) => {
            const x = perfil?.familia_parentes?.[pa.id];
            return (
              <fieldset key={pa.id} className="space-y-3 rounded-2xl border border-linha bg-cartao p-4">
                <legend className="px-1 text-base font-bold">
                  {pa.rotulo}
                  {pa.dica && <span className="ml-2 text-xs font-normal text-suave">{pa.dica}</span>}
                </legend>
                <Opcoes nome={`fam_${pa.id}`} tipo="checkbox" opcoes={CONDICOES_FAMILIA} marcadas={x?.condicoes ?? []} />
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-suave">Se teve câncer, qual</span>
                    <input name={`fam_${pa.id}_cancer`} maxLength={100} placeholder="próstata" defaultValue={x?.cancer_qual ?? undefined} className={CAMPO} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-suave">Outro problema ou observação</span>
                    <input name={`fam_${pa.id}_obs`} maxLength={200} placeholder="faleceu aos 70, do coração" defaultValue={x?.observacao ?? undefined} className={CAMPO} />
                  </label>
                </div>
              </fieldset>
            );
          })}
        </>
      );
    case 8:
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
            Agora vamos reunir os seus exames, uma área por vez: sangue, coração, estômago e intestino, rins, vacinas... Para
            cada uma, o Zelo diz o que procurar na sua pasta. Você envia PDFs ou fotos, confere e pode parar quando quiser.
          </p>
        </div>
      );
  }
}
