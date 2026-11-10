/**
 * Junta o que chegou numa sincronização com o que já estava guardado.
 * É a lógica que a rota do app (/api/relogio/sync) vai usar.
 *   - Dia: o mesmo dia pode chegar de novo (sono da noite chega atrasado): a versão nova substitui.
 *   - Evento: pode chegar repetido: mesma data/hora + tipo = o mesmo evento, guardado 1 vez.
 */
import type { Lote } from "./tipos";

export type ResultadoSync = { lote: Lote; dias_novos: number; dias_atualizados: number; eventos_novos: number };

export function mesclar(atual: Lote, chegou: Lote): ResultadoSync {
  const dias = new Map(atual.dias.map((d) => [d.data, d]));
  let dias_novos = 0, dias_atualizados = 0;
  for (const d of chegou.dias) {
    if (dias.has(d.data)) dias_atualizados++;
    else dias_novos++;
    dias.set(d.data, d);
  }
  const chave = (e: { data_hora: string; tipo: string }) => `${e.tipo}|${e.data_hora}`;
  const eventos = new Map(atual.eventos.map((e) => [chave(e), e]));
  let eventos_novos = 0;
  for (const e of chegou.eventos) {
    if (!eventos.has(chave(e))) eventos_novos++;
    eventos.set(chave(e), e);
  }
  return {
    lote: {
      dias: [...dias.values()].sort((a, b) => a.data.localeCompare(b.data)),
      eventos: [...eventos.values()].sort((a, b) => a.data_hora.localeCompare(b.data_hora)),
    },
    dias_novos, dias_atualizados, eventos_novos,
  };
}
