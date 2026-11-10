"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CHAVE_PUBLICA, SUPABASE_URL } from "@/lib/supabase-publico";

/**
 * Pergunta ao banco, a cada `segundos`, se a situação do acesso mudou (situacao_acesso: sem dados, sem log).
 * Mudou (paciente aprovou, revogou, expirou) -> recarrega a tela do servidor. É o que faz o médico perder o
 * acesso "na hora" quando o paciente revoga.
 */
export function VigiaAcesso({ token, atual, segundos = 3 }: { token: string; atual: string; segundos?: number }) {
  const router = useRouter();
  useEffect(() => {
    let vivo = true;
    const id = setInterval(async () => {
      try {
        const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/situacao_acesso`, {
          method: "POST",
          headers: { apikey: CHAVE_PUBLICA, Authorization: `Bearer ${CHAVE_PUBLICA}`, "Content-Type": "application/json" },
          body: JSON.stringify({ p_token: token }),
        });
        const { situacao } = (await r.json()) as { situacao: string };
        if (vivo && situacao !== atual) router.refresh();
      } catch {
        /* rede instável: tenta de novo no próximo ciclo */
      }
    }, segundos * 1000);
    return () => {
      vivo = false;
      clearInterval(id);
    };
  }, [token, atual, segundos, router]);
  return null;
}

/** Recarrega a tela do servidor a cada `segundos` (app do paciente esperando pedidos de acesso). */
export function AutoAtualizar({ segundos = 3 }: { segundos?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), segundos * 1000);
    return () => clearInterval(id);
  }, [segundos, router]);
  return null;
}
