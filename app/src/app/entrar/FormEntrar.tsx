"use client";

import { useActionState, useState } from "react";
import { criarConta, entrar, entrarDemonstracao, type EstadoEntrar } from "./acoes";

type Modo = "entrar" | "criar";

export function FormEntrar({ demo }: { demo: boolean }) {
  const [modo, setModo] = useState<Modo>("entrar");
  const [estEntrar, acaoEntrar, entrando] = useActionState<EstadoEntrar, FormData>(entrar, {});
  const [estCriar, acaoCriar, criando] = useActionState<EstadoEntrar, FormData>(criarConta, {});
  const [estDemo, acaoDemo, abrindoDemo] = useActionState<EstadoEntrar, FormData>(() => entrarDemonstracao(), {});

  const estado = modo === "entrar" ? estEntrar : estCriar;
  const ocupado = entrando || criando || abrindoDemo;

  return (
    <div className="mt-7">
      <div role="tablist" aria-label="Entrar ou criar conta" className="grid grid-cols-2 rounded-full bg-bege p-1 text-sm font-semibold">
        {(["entrar", "criar"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={modo === m}
            onClick={() => setModo(m)}
            className={`rounded-full py-2 transition-colors ${modo === m ? "bg-cartao text-marca shadow-sm" : "text-suave hover:text-tinta"}`}
          >
            {m === "entrar" ? "Entrar" : "Criar conta"}
          </button>
        ))}
      </div>

      <form key={modo} action={modo === "entrar" ? acaoEntrar : acaoCriar} className="mt-5 space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">E-mail</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={estado.email}
            className="w-full rounded-2xl border border-linha bg-cartao px-4 py-3 text-[15px] outline-none focus:border-salvia"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Senha</span>
          <input
            name="senha"
            type="password"
            autoComplete={modo === "entrar" ? "current-password" : "new-password"}
            required
            minLength={modo === "criar" ? 8 : undefined}
            className="w-full rounded-2xl border border-linha bg-cartao px-4 py-3 text-[15px] outline-none focus:border-salvia"
          />
          {modo === "criar" && <span className="mt-1 block text-xs text-suave">Pelo menos 8 caracteres.</span>}
        </label>

        {estado.erro && (
          <p role="alert" className="rounded-2xl bg-bege px-3 py-2 text-sm text-atencao">
            {estado.erro}
          </p>
        )}

        <button
          type="submit"
          disabled={ocupado}
          className="w-full rounded-2xl bg-marca py-3 font-semibold text-white transition-colors hover:bg-marca-hover disabled:opacity-60"
        >
          {modo === "entrar" ? (entrando ? "Entrando…" : "Entrar") : criando ? "Criando…" : "Criar conta"}
        </button>
        {modo === "criar" && (
          <p className="text-center text-xs text-suave">Depois vem um check-up rápido com os seus dados básicos.</p>
        )}
      </form>

      {demo && (
        <form action={acaoDemo} className="mt-6 border-t border-linha pt-5">
          <button
            type="submit"
            disabled={ocupado}
            className="w-full rounded-2xl border border-linha bg-cartao py-3 font-semibold text-marca transition-colors hover:border-salvia disabled:opacity-60"
          >
            {abrindoDemo ? "Abrindo…" : "Entrar na demonstração"}
          </button>
          <p className="mt-1.5 text-center text-xs text-suave">Roberto, 10 anos de exames sintéticos. Sem cadastro.</p>
          {estDemo.erro && (
            <p role="alert" className="mt-2 rounded-2xl bg-bege px-3 py-2 text-sm text-atencao">
              {estDemo.erro}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
