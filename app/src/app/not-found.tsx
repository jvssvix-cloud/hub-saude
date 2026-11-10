import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <div className="py-16 text-center">
      <p className="text-sm text-suave">Página não encontrada</p>
      <h1 className="mt-1 text-xl font-semibold">Não achamos esse exame no seu histórico</h1>
      <Link href="/" className="mt-4 inline-block text-marca hover:underline">
        Voltar ao início
      </Link>
    </div>
  );
}
