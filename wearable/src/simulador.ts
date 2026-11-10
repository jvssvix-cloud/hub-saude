/**
 * Simulador de sincronização: finge ser o relógio mandando dados de X em X segundos.
 *
 * npm run simular -- --inicio=2026-10-20 --intervalo=5
 *   - começa com o histórico até o dia anterior a --inicio (como se o relógio já estivesse conectado);
 *   - a cada --intervalo segundos "sincroniza" 1 dia novo (+ os avisos daquele dia) e reenvia o dia anterior
 *     (o sono chega atrasado), roda as regras e regrava wearable/saida/relogio.json;
 *   - mostra quando um alerta aparece. Na demo: o alerta de ritmo irregular nasce ao vivo.
 *
 * Depois: o app troca "regravar o arquivo" por um POST em /api/relogio/sync com o mesmo lote.
 */
import { FIM, gerarPersona, somarDias } from "./gerar";
import { montarRelogio } from "./regras";
import { mesclar } from "./sincronizar";
import { carregarInsights, opcao, salvar } from "./cli-gerar";
import type { Lote } from "./tipos";

const inicio = opcao("inicio") ?? "2026-10-20";
const intervalo = Number(opcao("intervalo") ?? 5);
const insights = carregarInsights(process.argv.includes("--sem-exames"));
const completo = gerarPersona();

let guardado: Lote = {
  dias: completo.dias.filter((d) => d.data < inicio),
  eventos: completo.eventos.filter((e) => e.data_hora.slice(0, 10) < inicio),
};
let hoje = somarDias(inicio, -1);
let alertasAntes = new Set(montarRelogio(guardado, hoje, "simulador", "", insights).alertas.map((a) => a.id));
console.log(`Simulador: histórico até ${hoje} (${guardado.dias.length} dias). Sincronizando 1 dia a cada ${intervalo}s até ${FIM}.`);
console.log(`Alertas já ativos: ${[...alertasAntes].join(", ") || "nenhum"}\n`);

const agora = () => new Date().toLocaleString("sv-SE").slice(0, 16).replace(" ", "T");

function sincronizar() {
  hoje = somarDias(hoje, 1);
  const chegou: Lote = {
    dias: completo.dias.filter((d) => d.data === hoje || d.data === somarDias(hoje, -1)),
    eventos: completo.eventos.filter((e) => e.data_hora.slice(0, 10) === hoje),
  };
  const r = mesclar(guardado, chegou);
  guardado = r.lote;
  const rel = montarRelogio(guardado, hoje, "simulador", agora(), insights);
  salvar(rel);

  const d = chegou.dias.find((x) => x.data === hoje);
  const dado = d?.fc_repouso == null ? "sem dado (relógio no carregador)" : `FC ${d.fc_repouso} bpm, sono ${d.sono_horas} h, ${d.passos} passos`;
  const ev = r.eventos_novos ? ` | ${r.eventos_novos} aviso de ritmo irregular` : "";
  console.log(`[sync ${rel.ultima_sincronizacao}] dia ${hoje}: ${dado}${ev}  (+${r.dias_novos} dia, ${r.dias_atualizados} atualizado)`);
  for (const a of rel.alertas) {
    if (!alertasAntes.has(a.id)) console.log(`   >>> NOVO ALERTA [${a.nivel}] ${a.titulo}: ${a.motivo}`);
  }
  alertasAntes = new Set(rel.alertas.map((a) => a.id));
  if (hoje >= FIM) {
    console.log(`\nFim da simulação. relogio.json com ${rel.dias.length} dias e ${rel.alertas.length} alertas.`);
    clearInterval(timer);
  }
}

const timer = setInterval(sincronizar, intervalo * 1000);
sincronizar();
