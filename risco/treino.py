"""Treina e avalia os modelos de risco de glicemia (pré-diabetes e diabetes não diagnosticado).

Avaliação honesta:
- Treino: NHANES 2011-2012. Teste: NHANES 2013-2014 (outras pessoas, nunca vistas).
- Glicose e HbA1c nunca entram como sinal (o rótulo é definido por elas).
- Comparação com o questionário de risco da ADA e entre versões, nas MESMAS pessoas
  (bootstrap pareado, IC 95%).

Dois alvos:
- `alterado`: HbA1c >= 5,7% (pré-diabetes ou diabetes não diagnosticado; ~30% dos adultos).
- `diabetes_oculto`: HbA1c >= 6,5% (diabetes que a pessoa não sabe que tem; ~3%).

Quatro versões, conforme os dados que a pessoa tem no Zelo: perfil, perfil+exames,
perfil+relógio, completo. O modelo EXPORTADO (saida/modelo.json) é treinado nos dois ciclos
juntos (mais dados, prevalência média); a calibração dele é conferida por validação cruzada.

Rodar: .venv/Scripts/python treino.py  ->  saida/modelo.json, saida/resultados.csv, saida/relatorio.md
"""
from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, roc_auc_score, roc_curve
from sklearn.model_selection import StratifiedKFold

RAIZ = Path(__file__).parent
SAIDA = RAIZ / "saida"
SEMENTE = 42

PERFIL = ["idade", "masculino", "imc", "familia_diabetes", "pressao_alta",
          "exercicio_h_semana", "fumante"]
EXAMES = ["hdl", "triglicerides", "colesterol_total", "tgp", "tgo", "ggt", "acido_urico", "creatinina"]
# Relógio: sinais que o app consegue calcular de passos por hora + horários de sono (ver README).
RELOGIO = ["fc_repouso", "intensidade_percentil", "sono_h", "sono_extremo_h", "sono_irregular_h",
           "meio_sono_h", "meio_sono_irregular_h", "amplitude_ritmo", "estabilidade_ritmo",
           "variabilidade_dias"]

# Sinais com cauda longa entram em log (TGP 300 não pesa 10x mais que TGP 30).
LOG = {"triglicerides", "tgp", "tgo", "ggt", "exercicio_h_semana"}

VERSOES = {
    "perfil": PERFIL,
    "perfil_exames": PERFIL + EXAMES,
    "perfil_relogio": PERFIL + RELOGIO,
    "completo": PERFIL + EXAMES + RELOGIO,
}
# Dados mínimos de cada versão (a pessoa precisa ter ao menos estes).
EXIGE = {
    "perfil": ["idade", "imc"],
    "perfil_exames": ["idade", "imc", "hdl", "triglicerides"],
    "perfil_relogio": ["idade", "imc", "intensidade_percentil", "sono_h", "amplitude_ritmo"],
    "completo": ["idade", "imc", "hdl", "triglicerides", "intensidade_percentil", "sono_h", "amplitude_ritmo"],
}
ALVOS = {
    "alterado": "Glicemia alterada (HbA1c >= 5,7%): pré-diabetes ou diabetes não diagnosticado",
    "diabetes_oculto": "Diabetes não diagnosticado (HbA1c >= 6,5%)",
}

NOMES = {
    "idade": "Idade", "masculino": "Sexo masculino", "imc": "IMC",
    "familia_diabetes": "Diabetes na família", "pressao_alta": "Pressão alta",
    "exercicio_h_semana": "Atividade física (h/semana)", "fumante": "Fuma",
    "hdl": "HDL", "triglicerides": "Triglicérides", "colesterol_total": "Colesterol total",
    "tgp": "TGP", "tgo": "TGO", "ggt": "GGT", "acido_urico": "Ácido úrico", "creatinina": "Creatinina",
    "fc_repouso": "Frequência cardíaca de repouso",
    "intensidade_percentil": "Movimento enquanto acordado",
    "sono_h": "Horas de sono", "sono_extremo_h": "Sono fora de 7-8 h",
    "sono_irregular_h": "Irregularidade do sono", "meio_sono_h": "Horário do meio do sono",
    "meio_sono_irregular_h": "Variação do horário de dormir", "amplitude_ritmo": "Contraste dia/noite",
    "estabilidade_ritmo": "Regularidade da rotina", "variabilidade_dias": "Variação do movimento entre dias",
}


def ada(df: pd.DataFrame) -> pd.Series:
    """Questionário de risco da ADA (Bang et al., 2009). Sem o item de etnia; IMC com cortes gerais."""
    p = pd.Series(0.0, index=df.index)
    p += np.select([df.idade >= 60, df.idade >= 50, df.idade >= 40], [3, 2, 1], 0)
    p += df.masculino
    p += df.diabetes_gestacional.fillna(0)
    p += df.familia_diabetes.fillna(0)
    p += df.pressao_alta.fillna(0)
    p += (df.exercicio_h_semana.fillna(0) < 2.5).astype(float)  # < 150 min/semana = não ativo
    p += np.select([df.imc >= 40, df.imc >= 30, df.imc >= 25], [3, 2, 1], 0)
    return p


class Modelo:
    """Regressão logística com: mediana para faltantes, corte nos percentis 1-99, log, padronização."""

    def __init__(self, cols: list[str]):
        self.cols = cols

    def _bruto(self, df: pd.DataFrame) -> np.ndarray:
        X = df[self.cols].copy()
        for c in self.cols:
            X[c] = X[c].fillna(self.medianas[c]).clip(*self.limites[c])
            if c in LOG:
                X[c] = np.log1p(X[c].clip(lower=0))
        return X.to_numpy(dtype=float)

    def _x(self, df: pd.DataFrame) -> np.ndarray:
        return (self._bruto(df) - self.media) / self.desvio

    def fit(self, df: pd.DataFrame, y: np.ndarray) -> "Modelo":
        self.medianas = {c: float(df[c].median()) for c in self.cols}
        self.limites = {c: (float(df[c].quantile(0.01)), float(df[c].quantile(0.99))) for c in self.cols}
        X = self._bruto(df)
        self.media, self.desvio = X.mean(0), X.std(0)
        self.desvio[self.desvio == 0] = 1
        self.lr = LogisticRegression(C=1.0, max_iter=3000).fit(self._x(df), y)
        return self

    def prob(self, df: pd.DataFrame) -> np.ndarray:
        return self.lr.predict_proba(self._x(df))[:, 1]

    def json(self) -> dict:
        return {
            "sinais": self.cols,
            "medianas": {c: round(v, 4) for c, v in self.medianas.items()},
            "limites": {c: [round(a, 4), round(b, 4)] for c, (a, b) in self.limites.items()},
            "media": [round(float(v), 6) for v in self.media],
            "desvio": [round(float(v), 6) for v in self.desvio],
            "coeficientes": [round(float(v), 6) for v in self.lr.coef_[0]],
            "intercepto": round(float(self.lr.intercept_[0]), 6),
        }


def auc_ic(y: np.ndarray, p: np.ndarray, amostras: list[np.ndarray]) -> tuple[float, float, float]:
    vals = [roc_auc_score(y[i], p[i]) for i in amostras if y[i].min() != y[i].max()]
    return float(roc_auc_score(y, p)), float(np.percentile(vals, 2.5)), float(np.percentile(vals, 97.5))


def calibracao(y: np.ndarray, p: np.ndarray, faixas: int = 5) -> list[dict]:
    q = pd.qcut(p, faixas, labels=False, duplicates="drop")
    return [{"previsto": round(float(p[q == k].mean()), 3), "observado": round(float(y[q == k].mean()), 3),
             "n": int((q == k).sum())} for k in sorted(set(q))]


def limiar_sensibilidade(y: np.ndarray, p: np.ndarray, alvo: float = 0.8) -> float:
    _, tpr, thr = roc_curve(y, p)
    return float(thr[np.argmax(tpr >= alvo)])


def sens_esp(y: np.ndarray, p: np.ndarray, limiar: float) -> tuple[float, float]:
    pos = p >= limiar
    return float(pos[y == 1].mean()), float((~pos)[y == 0].mean())


def carregar() -> pd.DataFrame:
    base = pd.read_csv(RAIZ / "dados" / "base.csv")
    base = base.merge(pd.read_csv(RAIZ / "dados" / "relogio_horas.csv"), on="seqn", how="left")
    base["sono_extremo_h"] = (base["sono_h"] - 7.5).abs()
    # Intensidade vira percentil (0-100) na população do treino: no app, passos/hora acordado -> percentil.
    ref = base.loc[base.ciclo == "2011-2012", "intensidade_acordado"].dropna().sort_values().to_numpy()
    base["intensidade_percentil"] = base["intensidade_acordado"].map(
        lambda v: np.nan if pd.isna(v) else 100 * np.searchsorted(ref, v) / len(ref))
    return base


def main() -> None:
    SAIDA.mkdir(exist_ok=True)
    base = carregar()
    treino_all, teste_all = base[base.ciclo == "2011-2012"], base[base.ciclo == "2013-2014"]
    rng = np.random.default_rng(SEMENTE)

    saida: dict = {
        "gerado_em": date.today().isoformat(),
        "fonte": "NHANES 2011-2014 (CDC/EUA, dados públicos). Avaliação: treino 2011-2012, teste 2013-2014.",
        "aviso": "Estimativa de risco para orientar a procurar um médico e pedir exame. Não é diagnóstico.",
        "transformacao_log1p": sorted(LOG),
        "nomes": NOMES,
        "alvos": {},
    }
    linhas, relatorio = [], []

    for alvo, descricao in ALVOS.items():
        relatorio.append(f"\n## {descricao}\n")
        bloco: dict = {"descricao": descricao, "versoes": {}}
        probs_comuns: dict[str, np.ndarray] = {}
        comum = teste_all.dropna(subset=EXIGE["completo"])  # mesmas pessoas para as comparações
        y_comum = comum[alvo].to_numpy()
        amostras_comum = [rng.integers(0, len(comum), len(comum)) for _ in range(1000)]

        for nome, cols in VERSOES.items():
            tr = treino_all.dropna(subset=EXIGE[nome])
            te = teste_all.dropna(subset=EXIGE[nome])
            ytr, yte = tr[alvo].to_numpy(), te[alvo].to_numpy()

            m = Modelo(cols).fit(tr, ytr)
            p = m.prob(te)
            p_ada = ada(te).to_numpy()
            p_hgb = (HistGradientBoostingClassifier(max_depth=3, learning_rate=0.05, max_iter=300,
                                                    random_state=SEMENTE)
                     .fit(tr[cols], ytr).predict_proba(te[cols])[:, 1])
            amostras = [rng.integers(0, len(te), len(te)) for _ in range(500)]
            auc, lo, hi = auc_ic(yte, p, amostras)
            auc_ada, _, _ = auc_ic(yte, p_ada, amostras)
            limiar = limiar_sensibilidade(ytr, m.prob(tr), 0.8)
            sens, esp = sens_esp(yte, p, limiar)
            probs_comuns[nome] = m.prob(comum)

            # Modelo final: os dois ciclos juntos; calibração conferida por validação cruzada (5 partes).
            todos = base.dropna(subset=EXIGE[nome])
            y_todos = todos[alvo].to_numpy()
            p_cv = np.zeros(len(todos))
            for i_tr, i_te in StratifiedKFold(5, shuffle=True, random_state=SEMENTE).split(todos, y_todos):
                p_cv[i_te] = Modelo(cols).fit(todos.iloc[i_tr], y_todos[i_tr]).prob(todos.iloc[i_te])
            final = Modelo(cols).fit(todos, y_todos)
            limiar_final = limiar_sensibilidade(y_todos, p_cv, 0.8)

            linhas.append({"alvo": alvo, "versao": nome, "n_teste": len(te), "positivos_teste": int(yte.sum()),
                           "auc": round(auc, 3), "auc_ic95": f"{lo:.3f}-{hi:.3f}", "auc_ada": round(auc_ada, 3),
                           "auc_arvores": round(float(roc_auc_score(yte, p_hgb)), 3),
                           "brier": round(brier_score_loss(yte, p), 4),
                           "sensibilidade": round(sens, 3), "especificidade": round(esp, 3)})
            bloco["versoes"][nome] = {
                **final.json(),
                "exige": EXIGE[nome],
                "limiar_procurar_medico": round(limiar_final, 4),
                "prevalencia": round(float(y_todos.mean()), 4),
                "avaliacao": {
                    "teste_2013_2014": {"n": len(te), "positivos": int(yte.sum()), "auc": round(auc, 3),
                                        "auc_ic95": [round(lo, 3), round(hi, 3)], "auc_ada": round(auc_ada, 3),
                                        "sensibilidade": round(sens, 3), "especificidade": round(esp, 3)},
                    "calibracao_validacao_cruzada": calibracao(y_todos, p_cv),
                },
            }

        probs_comuns["ada"] = ada(comum).to_numpy()
        comparacoes = [("perfil", "ada"), ("perfil_exames", "perfil"), ("perfil_relogio", "perfil"),
                       ("completo", "perfil_exames")]
        bloco["comparacoes_pareadas"] = []
        relatorio.append(f"Comparações nas mesmas {len(comum)} pessoas do teste "
                         f"({int(y_comum.sum())} com o alvo):\n")
        relatorio.append("| Versão | contra | ΔAUC | IC 95% |\n|---|---|---|---|")
        for a, b in comparacoes:
            d = [roc_auc_score(y_comum[i], probs_comuns[a][i]) - roc_auc_score(y_comum[i], probs_comuns[b][i])
                 for i in amostras_comum]
            delta = roc_auc_score(y_comum, probs_comuns[a]) - roc_auc_score(y_comum, probs_comuns[b])
            lo, hi = np.percentile(d, [2.5, 97.5])
            bloco["comparacoes_pareadas"].append({"versao": a, "contra": b, "delta_auc": round(float(delta), 3),
                                                  "ic95": [round(float(lo), 3), round(float(hi), 3)]})
            relatorio.append(f"| {a} | {b} | {delta:+.3f} | {lo:+.3f} a {hi:+.3f} |")
        saida["alvos"][alvo] = bloco

    # Referência para o app: percentis da intensidade (MIMS/min acordado) no treino.
    ref = base.loc[base.ciclo == "2011-2012", "intensidade_acordado"].dropna()
    saida["intensidade_percentis_mims_min"] = [round(float(ref.quantile(q / 100)), 3) for q in range(0, 101, 5)]

    (SAIDA / "modelo.json").write_text(json.dumps(saida, ensure_ascii=False, indent=2), encoding="utf-8")
    tabela = pd.DataFrame(linhas)
    tabela.to_csv(SAIDA / "resultados.csv", index=False)

    md = ["# Modelo de risco de glicemia: resultados", "",
          f"Gerado por `treino.py` em {saida['gerado_em']}. {saida['fonte']}", "",
          "## Todas as versões (teste 2013-2014)", "", tabela.to_markdown(index=False), *relatorio]
    for alvo, bloco in saida["alvos"].items():
        md.append(f"\n## Pesos do modelo final: {alvo} (padronizados; + aumenta o risco)\n")
        for nome, v in bloco["versoes"].items():
            pares = sorted(zip(v["sinais"], v["coeficientes"]), key=lambda t: -abs(t[1]))
            md.append(f"- **{nome}:** " + ", ".join(f"{NOMES[c]} {b:+.2f}" for c, b in pares))
        md.append(f"\nCalibração (validação cruzada, versão completo): "
                  f"{bloco['versoes']['completo']['avaliacao']['calibracao_validacao_cruzada']}")
    (SAIDA / "relatorio.md").write_text("\n".join(md) + "\n", encoding="utf-8")
    print("\n".join(md))


if __name__ == "__main__":
    main()
