import Image from "next/image";

/** Logo do Zelo (public/zelo.png: coração com batimento + "zelo", fundo transparente). A altura vem da classe. */
export function Logo({ className = "h-7 w-auto" }: { className?: string }) {
  return <Image src="/zelo.png" alt="Zelo" width={511} height={164} priority className={className} />;
}
