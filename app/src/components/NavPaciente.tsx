"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const comeca = (p: string, ...prefixos: string[]) => prefixos.some((x) => p === x || p.startsWith(x + "/"));

const ITENS = [
  { href: "/", rotulo: "Início", icone: IconeCasa, ativo: (p: string) => p === "/" },
  {
    href: "/exames",
    rotulo: "Exames",
    icone: IconeGrafico,
    ativo: (p: string) => comeca(p, "/exames", "/exame", "/sistema", "/evolucao", "/documentos"),
  },
  { href: "/plano", rotulo: "Plano", icone: IconePlano, ativo: (p: string) => comeca(p, "/plano") },
  { href: "/mais", rotulo: "Mais", icone: IconeMais, ativo: (p: string) => comeca(p, "/mais", "/relogio", "/compartilhar") },
];

/** Barra inferior no celular; no desktop vira menu no topo (mesmos itens). */
export function NavPaciente({ variante }: { variante: "barra" | "topo" }) {
  const p = usePathname();
  if (variante === "topo") {
    return (
      <nav className="hidden items-center gap-1 sm:flex">
        {ITENS.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
              i.ativo(p) ? "bg-marca-fundo font-semibold text-marca" : "text-suave hover:text-tinta"
            }`}
          >
            {i.rotulo}
          </Link>
        ))}
      </nav>
    );
  }
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-linha bg-fundo/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {ITENS.map((i) => {
          const ativo = i.ativo(p);
          const Icone = i.icone;
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] ${ativo ? "font-semibold text-marca" : "text-suave"}`}
              >
                <Icone />
                {i.rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const svg = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
function IconeCasa() {
  return <svg {...svg}><path d="M4 11l8-7 8 7" /><path d="M6 10v9h12v-9" /><path d="M10 19v-5h4v5" /></svg>;
}
function IconeGrafico() {
  return <svg {...svg}><path d="M4 19h16" /><path d="M5 15l4-4 3 3 6-7" /></svg>;
}
function IconePlano() {
  return <svg {...svg}><rect x="5" y="4" width="14" height="17" rx="2.5" /><path d="M9 4.5V3h6v1.5" /><path d="M8.5 11l1.5 1.5 3-3M8.5 16.5h7" /></svg>;
}
function IconeMais() {
  return <svg {...svg}><circle cx="6" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="18" cy="12" r="1.3" /></svg>;
}
