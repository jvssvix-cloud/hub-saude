import type { Metadata } from "next";
import Link from "next/link";
import { sair } from "@/app/entrar/acoes";

export const metadata: Metadata = { title: "Mais · Hub de Saúde" };

const GRUPOS: { titulo: string; itens: { href: string; nome: string; desc: string }[] }[] = [
  {
    titulo: "Seus dados",
    itens: [
      { href: "/relogio", nome: "Relógio", desc: "Batimento, ritmo, sono e passos dos últimos 6 meses" },
      { href: "/documentos", nome: "Documentos", desc: "Os laudos originais de onde vem cada número" },
      { href: "/evolucao", nome: "Evolução completa", desc: "Todos os índices ao longo do tempo" },
    ],
  },
  {
    titulo: "Privacidade",
    itens: [
      { href: "/compartilhar", nome: "Compartilhar com médicos", desc: "Pedidos, quem pode ver agora e o histórico de acessos" },
      { href: "/conectar-ia", nome: "Conectar IA", desc: "Leve seus exames para o Claude, o ChatGPT ou o Gemini, com o seu consentimento" },
    ],
  },
];

export default function Mais() {
  return (
    <div className="space-y-6 pt-3">
      <h1 className="text-[28px] font-bold leading-tight tracking-tight">Mais</h1>
      {GRUPOS.map((g) => (
        <section key={g.titulo}>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-suave">{g.titulo}</h2>
          <ul className="divide-y divide-linha overflow-hidden rounded-3xl border border-linha bg-cartao">
            {g.itens.map((i) => (
              <li key={i.href}>
                <Link href={i.href} className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-fundo">
                  <span className="min-w-0">
                    <span className="block font-semibold">{i.nome}</span>
                    <span className="block text-[13px] text-suave">{i.desc}</span>
                  </span>
                  <span aria-hidden className="text-suave">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <form action={sair}>
        <button
          type="submit"
          className="w-full rounded-3xl border border-linha bg-cartao px-4 py-3.5 text-left font-semibold text-marca hover:bg-fundo"
        >
          Sair da conta
        </button>
      </form>
      <p className="text-center text-xs text-suave">Gerado por regras a partir dos seus exames e do seu relógio. Não é diagnóstico.</p>
    </div>
  );
}
