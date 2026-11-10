import { test } from "node:test";
import assert from "node:assert/strict";
import { gerarPersona, somarDias, FIM } from "./gerar";
import { regraRitmo, regraFcRepouso, regraSono, regraPassos, gerarAlertas, contextoExames, montarRelogio } from "./regras";
import { mesclar } from "./sincronizar";
import type { Dia, Evento } from "./tipos";

const HOJE = "2026-11-09";

/** n dias terminando em HOJE, com valores dados por função do índice (0 = mais antigo). */
function serie(n: number, f: (i: number) => Partial<Dia>): Dia[] {
  return Array.from({ length: n }, (_, i) => ({
    data: somarDias(HOJE, i - n + 1), fc_repouso: 62, vfc_ms: 40, sono_horas: 7, passos: 8000, ...f(i),
  }));
}
const ev = (data_hora: string): Evento => ({ data_hora, tipo: "ritmo_irregular", detalhe: "teste" });

test("ritmo: 3 avisos em 14 dias dispara; 2 não; aviso antigo não conta", () => {
  assert.ok(regraRitmo([ev("2026-10-30T03:00"), ev("2026-11-02T03:00"), ev("2026-11-08T03:00")], HOJE));
  assert.equal(regraRitmo([ev("2026-11-02T03:00"), ev("2026-11-08T03:00")], HOJE), null);
  assert.equal(regraRitmo([ev("2026-09-01T03:00"), ev("2026-11-02T03:00"), ev("2026-11-08T03:00")], HOJE), null);
});

test("FC de repouso: +8 bpm sobre a base dispara; +2 não", () => {
  const sobe = serie(180, (i) => ({ fc_repouso: i >= 166 ? 70 : 62 }));
  const a = regraFcRepouso(sobe, HOJE);
  assert.ok(a);
  assert.match(a!.motivo, /70 bpm/);
  assert.equal(regraFcRepouso(serie(180, (i) => ({ fc_repouso: i >= 166 ? 64 : 62 })), HOJE), null);
});

test("FC: poucos dias com dado não dispara (não dá para afirmar)", () => {
  const poucos = serie(180, (i) => ({ fc_repouso: i >= 166 ? (i % 3 === 0 ? 75 : null) : 62 }));
  assert.equal(regraFcRepouso(poucos, HOJE), null);
});

test("sono: média 5,5 h dispara; 6,5 h não", () => {
  assert.ok(regraSono(serie(14, () => ({ sono_horas: 5.5 })), HOJE));
  assert.equal(regraSono(serie(14, () => ({ sono_horas: 6.5 })), HOJE), null);
});

test("passos: queda de 40% dispara; de 10% não", () => {
  assert.ok(regraPassos(serie(120, (i) => ({ passos: i >= 90 ? 4800 : 8000 })), HOJE));
  assert.equal(regraPassos(serie(120, (i) => ({ passos: i >= 90 ? 7200 : 8000 })), HOJE), null);
});

test("dias sem dado ficam fora das médias", () => {
  const dias = serie(14, (i) => (i % 2 ? { sono_horas: null } : { sono_horas: 5 }));
  assert.match(regraSono(dias, HOJE)!.motivo, /5,0 h/);
});

test("cruzamento: só áreas do coração em atenção entram no contexto", () => {
  const ins = { areas: [
    { id: "colesterol", status: "atencao", motivos: ["LDL 164 mg/dL"] },
    { id: "glicemia", status: "em_dia", motivos: ["ok"] },
    { id: "vitaminas", status: "atencao", motivos: ["vit D baixa"] },
  ] };
  assert.deepEqual(contextoExames(ins), ["LDL 164 mg/dL"]);
  const al = gerarAlertas({ dias: [], eventos: [ev("2026-11-01T01:00"), ev("2026-11-03T01:00"), ev("2026-11-05T01:00")] }, HOJE, ins);
  assert.deepEqual(al[0].contexto_exames, ["LDL 164 mg/dL"]);
});

test("sincronização: dia repetido substitui, evento repetido não duplica", () => {
  const base = { dias: serie(2, () => ({ sono_horas: null })), eventos: [ev("2026-11-08T03:00")] };
  const r = mesclar(base, { dias: [{ ...base.dias[1], sono_horas: 6.2 }], eventos: [ev("2026-11-08T03:00")] });
  assert.equal(r.dias_atualizados, 1);
  assert.equal(r.eventos_novos, 0);
  assert.equal(r.lote.eventos.length, 1);
  assert.equal(r.lote.dias.at(-1)!.sono_horas, 6.2);
});

test("persona: determinística e dispara os 4 alertas na data da demo", () => {
  assert.deepEqual(gerarPersona(), gerarPersona());
  const rel = montarRelogio(gerarPersona(), FIM, "sintetico", `${FIM}T07:00`);
  assert.deepEqual(rel.alertas.map((a) => a.id).sort(), ["atividade_caindo", "fc_repouso_subindo", "ritmo_irregular", "sono_curto"]);
  assert.equal(rel.dias.length, 180);
});

test("persona: em setembro ainda não havia alerta de coração", () => {
  const rel = montarRelogio(gerarPersona(), "2026-09-15", "sintetico", "");
  assert.ok(!rel.alertas.some((a) => a.id === "ritmo_irregular" || a.id === "fc_repouso_subindo"));
});
