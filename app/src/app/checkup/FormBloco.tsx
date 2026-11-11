"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { ATIVIDADE_MAX_HORAS, MAX_ITENS, MIN_POR_HORA, imc } from "@/lib/checkup";
import type { EstadoBloco } from "./acoes";

export const CAMPO =
  "w-full rounded-2xl border border-linha bg-cartao px-4 py-3 text-[15px] outline-none focus:border-salvia";

/** Formulário de um bloco: mostra o erro que a ação devolve e trava os botões enquanto salva. */
export function FormBloco({
  acao, n, opcional, ultimo, edicao = false, children,
}: {
  acao: (estado: EstadoBloco, form: FormData) => Promise<EstadoBloco>;
  n: number;
  opcional: boolean;
  ultimo: boolean;
  /** Edição em Mais > Meu perfil de saúde: "Cancelar" e "Salvar" no lugar de "Voltar", "Pular" e "Continuar". */
  edicao?: boolean;
  children: React.ReactNode;
}) {
  const [estado, enviar, salvando] = useActionState(acao, {});
  // onSubmit em vez de action={...}: com action o React limpa o formulário a cada envio, e num erro
  // ("telefone já está em outra conta") a pessoa perderia tudo o que digitou
  function aoEnviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const quem = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const dados = new FormData(e.currentTarget, quem);
    startTransition(() => enviar(dados));
  }
  return (
    <form onSubmit={aoEnviar} className="space-y-5">
      {children}
      {estado.erro && (
        <p role="alert" className="rounded-2xl bg-bege px-3 py-2 text-sm text-atencao">
          {estado.erro}
        </p>
      )}
      {edicao ? (
        <div className="flex items-center gap-3">
          <Link href="/perfil" className="rounded-2xl px-3 py-3 text-sm font-semibold text-suave hover:text-tinta">
            Cancelar
          </Link>
          <span className="flex-1" />
          <button
            type="submit"
            disabled={salvando}
            className="rounded-2xl bg-marca px-6 py-3 font-semibold text-white hover:bg-marca-hover disabled:opacity-60"
          >
            {salvando ? "Salvando…" : "Salvar"}
          </button>
        </div>
      ) : ultimo ? (
        <div className="space-y-2.5">
          <button
            name="destino"
            value="enviar"
            disabled={salvando}
            className="w-full rounded-2xl bg-marca py-3 font-semibold text-white hover:bg-marca-hover disabled:opacity-60"
          >
            {salvando ? "Salvando…" : "Enviar exames agora"}
          </button>
          <button
            name="destino"
            value="depois"
            disabled={salvando}
            className="w-full rounded-2xl border border-linha bg-cartao py-3 font-semibold text-marca hover:border-salvia disabled:opacity-60"
          >
            Depois
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          {n > 1 && (
            <Link href={`/checkup?bloco=${n - 1}`} className="rounded-2xl px-3 py-3 text-sm font-semibold text-suave hover:text-tinta">
              ‹ Voltar
            </Link>
          )}
          <span className="flex-1" />
          {opcional && (
            <Link href={`/checkup?bloco=${n + 1}`} className="rounded-2xl px-3 py-3 text-sm font-semibold text-suave hover:text-tinta">
              Pular
            </Link>
          )}
          <button
            type="submit"
            disabled={salvando}
            className="rounded-2xl bg-marca px-6 py-3 font-semibold text-white hover:bg-marca-hover disabled:opacity-60"
          >
            {salvando ? "Salvando…" : "Continuar"}
          </button>
        </div>
      )}
    </form>
  );
}

/**
 * Bloco 3: atividade física em horas por semana, com − e + (de 1 em 1 hora, até ATIVIDADE_MAX_HORAS = "15+").
 * O banco guarda minutos por semana (a medida das recomendações): 1 h/semana = 60 min.
 */
export function CampoAtividade({ minSemana }: { minSemana: number | null }) {
  return (
    <Contador
      nome="atividade_horas"
      inicial={minSemana === null ? null : Math.min(ATIVIDADE_MAX_HORAS, Math.round(minSemana / MIN_POR_HORA))}
      max={ATIVIDADE_MAX_HORAS}
      unidade={(n) => (n === 0 ? "nenhuma na semana" : n === 1 ? "hora por semana" : "horas por semana")}
      dica={(n) =>
        n === 0
          ? "A recomendação é de pelo menos 2 h e meia por semana (150 minutos). Caminhada conta."
          : n < 3
            ? "Some a semana toda. A recomendação é de pelo menos 2 h e meia. Caminhada, academia, esporte e bicicleta contam."
            : "Some a semana toda: caminhada, academia, esporte e bicicleta contam."
      }
      maisNoMax
    />
  );
}

/**
 * Lista com "+ Adicionar" e "Remover" (internações, cirurgias, remédios). Cada coluna vai como `<prefixo>_<campo>`,
 * um valor por linha; o servidor junta pelo índice (lib/checkup.ts linhas()). Linha sem o primeiro campo é ignorada.
 */
export function ListaRepetida({
  prefixo, campos, iniciais, adicionar, vazio,
}: {
  prefixo: string;
  campos: { id: string; rotulo: string; placeholder?: string; largura?: "curto"; numerico?: boolean }[];
  iniciais: Record<string, string>[];
  adicionar: string;
  vazio: string;
}) {
  const [itens, setItens] = useState(() => iniciais.map((v, i) => ({ k: i, v })));
  const [prox, setProx] = useState(iniciais.length);
  const novo = () => {
    setItens((l) => [...l, { k: prox, v: {} }]);
    setProx((n) => n + 1);
  };
  return (
    <div className="space-y-2.5">
      {itens.length === 0 && <p className="rounded-2xl bg-bege px-4 py-3 text-sm text-suave">{vazio}</p>}
      {itens.map((it, idx) => (
        <div key={it.k} className="rounded-2xl border border-linha bg-cartao p-3">
          <div className="flex flex-wrap gap-2">
            {campos.map((c, j) => (
              <label key={c.id} className={c.largura === "curto" ? "w-24" : "min-w-0 flex-1 basis-40"}>
                <span className="mb-1 block text-xs font-semibold text-suave">{c.rotulo}</span>
                <input
                  name={`${prefixo}_${c.id}`}
                  defaultValue={it.v[c.id] ?? ""}
                  placeholder={c.placeholder}
                  inputMode={c.numerico ? "numeric" : undefined}
                  maxLength={c.numerico ? 4 : 120}
                  autoFocus={j === 0 && idx === itens.length - 1 && it.k >= iniciais.length}
                  className={CAMPO}
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setItens((l) => l.filter((x) => x.k !== it.k))}
            className="mt-2 text-xs font-semibold text-suave hover:text-atencao"
          >
            Remover
          </button>
        </div>
      ))}
      {itens.length < MAX_ITENS && (
        <button
          type="button"
          onClick={novo}
          className="w-full rounded-2xl border border-dashed border-salvia py-3 text-sm font-semibold text-marca hover:bg-marca-fundo"
        >
          + {adicionar}
        </button>
      )}
    </div>
  );
}

/**
 * Contador com − e + (de 1 em 1). Começa sem resposta ("—"): o primeiro toque em + vai para 1.
 * O valor vai num campo escondido; vazio = não informou.
 */
function Contador({
  nome, inicial, max, unidade, dica, maisNoMax = false,
}: {
  nome: string;
  inicial: number | null;
  max: number;
  unidade: (n: number) => string;
  dica?: (n: number) => string;
  /** No máximo mostra "15+" (o máximo vale "isso ou mais"). */
  maisNoMax?: boolean;
}) {
  const [v, setV] = useState<number | null>(inicial);
  const botao =
    "grid size-12 place-items-center rounded-full border border-linha bg-cartao text-2xl font-semibold text-marca transition-colors hover:border-salvia active:bg-marca-fundo disabled:opacity-35";
  return (
    <div className="rounded-2xl border border-linha bg-cartao p-4">
      <input type="hidden" name={nome} value={v ?? ""} />
      <div className="flex items-center justify-between gap-3">
        <button type="button" aria-label="Menos" className={botao} disabled={!v} onClick={() => setV((x) => Math.max(0, (x ?? 0) - 1))}>
          −
        </button>
        <p className="text-center" aria-live="polite">
          <span className="num block text-4xl font-bold tracking-tight">{v === null ? "—" : maisNoMax && v >= max ? `${max}+` : v}</span>
          <span className="text-sm text-suave">{v === null ? "toque em + para responder" : unidade(v)}</span>
        </p>
        <button type="button" aria-label="Mais" className={botao} disabled={v !== null && v >= max} onClick={() => setV((x) => Math.min(max, (x ?? 0) + 1))}>
          +
        </button>
      </div>
      <div className="mt-3 flex gap-1" aria-hidden>
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${v !== null && i < v ? "bg-marca" : "bg-bege"}`} />
        ))}
      </div>
      {v !== null && dica && <p className="mt-2 text-center text-xs text-suave">{dica(v)}</p>}
    </div>
  );
}

/** Bloco 2: altura e peso, com o IMC calculado na hora. */
export function CamposCorpo({ altura, peso }: { altura: number | null; peso: number | null }) {
  const [a, setA] = useState(altura ? String(altura).replace(".", ",") : "");
  const [p, setP] = useState(peso ? String(peso).replace(".", ",") : "");
  const num = (s: string) => (s.trim() ? Number(s.replace(",", ".")) || null : null);
  const alt = num(a);
  const r = imc(alt !== null && alt < 3 ? alt * 100 : alt, num(p));
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Altura (cm)</span>
          <input name="altura" inputMode="decimal" required placeholder="172" value={a} onChange={(e) => setA(e.target.value)} className={CAMPO} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Peso (kg)</span>
          <input name="peso" inputMode="decimal" required placeholder="78,5" value={p} onChange={(e) => setP(e.target.value)} className={CAMPO} />
        </label>
      </div>
      <div className="rounded-2xl bg-bege px-4 py-3">
        <p className="text-sm text-suave">IMC</p>
        {r && r.valor > 8 && r.valor < 90 ? (
          <p>
            <span className="num text-2xl font-bold">{r.valor.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>{" "}
            <span className="text-sm text-suave">· {r.faixa}</span>
          </p>
        ) : (
          <p className="text-sm text-suave">Preencha altura e peso.</p>
        )}
      </div>
    </>
  );
}
