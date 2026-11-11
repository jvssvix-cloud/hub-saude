import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { TERMOS_VERSAO } from "@/lib/checkup";

export const metadata: Metadata = { title: "Termos e uso de dados · Zelo" };

/** Termos de uso e uso de dados de saúde (aceitos separadamente no bloco 1 do check-up). Página pública. */
export default function Termos() {
  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-6">
      <Link href="/entrar" aria-label="Zelo">
        <Logo className="h-8 w-auto" />
      </Link>
      <h1 className="mt-6 text-[28px] font-bold leading-tight tracking-tight">Termos e uso dos seus dados</h1>
      <p className="mt-1 text-sm text-suave">Versão {TERMOS_VERSAO}. Protótipo feito para um desafio; usa só dados sintéticos ou do próprio time.</p>

      <section id="termos" className="mt-8 space-y-3 text-[15px] leading-relaxed">
        <h2 className="text-lg font-bold tracking-tight">Termos de uso</h2>
        <p>O Zelo junta os seus exames, vacinas e dados do relógio num lugar só e mostra como cada número mudou ao longo do tempo.</p>
        <p>
          <strong>O Zelo não faz diagnóstico.</strong> Os avisos são regras simples e explicáveis (por exemplo, &ldquo;fora da faixa de
          referência do laudo nos últimos 3 exames&rdquo;) para você levar à consulta. Quem interpreta é o seu médico.
        </p>
        <p>As sugestões do chat são geradas por IA a partir dos seus próprios laudos e podem errar. Confira sempre o documento original, que fica a um toque de cada número.</p>
        <p>Você é responsável pela conta (e-mail e senha) e pelos documentos que envia.</p>
      </section>

      <section id="dados" className="mt-8 space-y-3 text-[15px] leading-relaxed">
        <h2 className="text-lg font-bold tracking-tight">Uso dos seus dados de saúde</h2>
        <p>Dados de saúde são dados sensíveis pela LGPD (Lei 13.709/2018). Por isso pedimos este consentimento à parte, e guardamos a data e a hora em que você aceitou.</p>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Para quê:</strong> guardar e organizar o seu histórico e mostrar a evolução, os avisos e o resumo para você.</li>
          <li><strong>Quem vê:</strong> só você. Um médico ou um assistente de IA só vê o que você autorizar, pelo tempo que você escolher, e cada leitura fica registrada para você ver.</li>
          <li><strong>Revogar:</strong> você encerra qualquer acesso na hora, em Compartilhar ou em Conectar IA.</li>
          <li><strong>Leitura dos documentos:</strong> para extrair os valores, o arquivo que você envia é lido por um serviço de IA (Claude, da Anthropic). Nada é vendido nem usado para propaganda.</li>
          <li><strong>Apagar:</strong> você pode pedir para apagar a conta e todo o histórico.</li>
        </ul>
      </section>
    </main>
  );
}
