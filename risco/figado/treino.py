"""Apoio à decisão do médico: esteatose e fibrose hepática a partir de exames de rotina.

Prevê o resultado da elastografia (FibroScan) com exames que o paciente já tem, para o médico
decidir quem precisa de ultrassom/elastografia/hepatologista. Não é diagnóstico.

- Treino: NHANES 2017-2020. Teste: NHANES 2021-2023 (outras pessoas, outro período).
- Comparação nas MESMAS pessoas com os índices que o médico usa hoje:
  esteatose -> HSI e FLI; fibrose -> FIB-4 e NFS (bootstrap pareado, IC 95%).
- Zona cinzenta: com a MESMA sensibilidade (descartar) e especificidade (confirmar) dos cortes
  clássicos, quantos pacientes ficam "indeterminados" com o índice e com o modelo.

Rodar: ../.venv/Scripts/python treino.py -> ../saida/figado.json, ../saida/figado_relatorio.md
"""
from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import StratifiedKFold

RAIZ = Path(__file__).resolve().parent
DADOS = RAIZ.parent / "dados" / "figado"
SAIDA = RAIZ.parent / "saida"
SEMENTE = 42

PERFIL = ["idade", "masculino", "imc", "diabetes", "pressao_alta", "alcool", "fumante"]
FIB4_INSUMOS = ["idade", "tgo", "tgp", "plaquetas"]
EXAMES = ["tgo", "tgp", "razao_tgo_tgp", "ggt", "fosfatase_alcalina", "bilirrubina_total", "plaquetas",
          "triglicerides", "colesterol_total", "hdl", "glicose", "hba1c", "acido_urico", "creatinina",
          "ferritina", "insulina"]
LOG = {"tgo", "tgp", "ggt", "fosfatase_alcalina", "bilirrubina_total", "triglicerides", "ferritina",
       "insulina", "razao_tgo_tgp"}
EXIGE = ["idade", "imc", "tgo", "tgp", "plaquetas"]  # mínimo para usar (e para o FIB-4 existir)

VERSOES = {
    "mesmos_dados_fib4": FIB4_INSUMOS,                   # ML com os mesmos 4 números do FIB-4
    "perfil_exames": PERFIL + EXAMES,                    # tudo o que o Zelo tem
}
ALVOS = {
    "esteatose": {"descricao": "Esteatose na elastografia (CAP >= 285 dB/m)",
                  "indices": ["hsi", "fli"], "cortes": {"hsi": (30, 36), "fli": (30, 60)}},
    "fibrose": {"descricao": "Fibrose significativa na elastografia (rigidez >= 8 kPa)",
                "indices": ["fib4", "nfs"], "cortes": {"fib4": (1.3, 2.67), "nfs": (-1.455, 0.676)}},
    # O FIB-4 e o NFS foram desenhados para fibrose AVANÇADA: comparação no terreno deles.
    "fibrose_avancada": {"descricao": "Fibrose avançada na elastografia (rigidez >= 9,7 kPa, F3 ou mais)",
                         "indices": ["fib4", "nfs"], "cortes": {"fib4": (1.3, 2.67), "nfs": (-1.455, 0.676)}},
}
NOMES = {
    "idade": "Idade", "masculino": "Sexo masculino", "imc": "IMC", "diabetes": "Diabetes",
    "pressao_alta": "Pressão alta", "alcool": "Álcool", "fumante": "Fuma",
    "tgo": "TGO", "tgp": "TGP", "razao_tgo_tgp": "Razão TGO/TGP", "ggt": "GGT",
    "fosfatase_alcalina": "Fosfatase alcalina", "bilirrubina_total": "Bilirrubina total",
    "plaquetas": "Plaquetas", "triglicerides": "Triglicérides", "colesterol_total": "Colesterol total",
    "hdl": "HDL", "glicose": "Glicose", "hba1c": "HbA1c", "acido_urico": "Ácido úrico",
    "creatinina": "Creatinina", "ferritina": "Ferritina", "insulina": "Insulina",
}


# Índices clínicos (fórmulas publicadas) --------------------------------------------------------
def indices(df: pd.DataFrame) -> pd.DataFrame:
    out = pd.DataFrame(index=df.index)
    out["fib4"] = df.idade * df.tgo / (df.plaquetas * np.sqrt(df.tgp))                       # Sterling 2006
    glic_alterada = ((df.diabetes == 1) | (df.glicose >= 110)).astype(float)
    out["nfs"] = (-1.675 + 0.037 * df.idade + 0.094 * df.imc + 1.13 * glic_alterada          # Angulo 2007
                  + 0.99 * df.tgo / df.tgp - 0.013 * df.plaquetas - 0.66 * df.albumina)
    out["hsi"] = 8 * df.tgp / df.tgo + df.imc + 2 * (df.diabetes == 1) + 2 * (df.masculino == 0)  # Lee 2010
    y = (0.953 * np.log(df.triglicerides) + 0.139 * df.imc + 0.718 * np.log(df.ggt)          # Bedogni 2006
         + 0.053 * df.cintura - 15.745)
    out["fli"] = 100 * np.exp(y) / (1 + np.exp(y))
    return out


class Modelo:
    """Regressão logística: mediana para faltantes, corte nos percentis 1-99, log, padronização."""

    def __init__(self, cols: list[str]):
        self.cols = cols

    def _bruto(self, df: pd.DataFrame) -> np.ndarray:
        X = df[self.cols].copy()
        for c in self.cols:
            X[c] = X[c].fillna(self.medianas[c]).clip(*self.limites[c])
            if c in LOG:
                X[c] = np.log(X[c].clip(lower=1e-3))
        return X.to_numpy(dtype=float)

    def fit(self, df: pd.DataFrame, y: np.ndarray) -> "Modelo":
        self.medianas = {c: float(df[c].median()) for c in self.cols}
        self.limites = {c: (float(df[c].quantile(0.01)), float(df[c].quantile(0.99))) for c in self.cols}
        X = self._bruto(df)
        self.media, self.desvio = X.mean(0), X.std(0)
        self.desvio[self.desvio == 0] = 1
        self.lr = LogisticRegression(C=1.0, max_iter=5000).fit((X - self.media) / self.desvio, y)
        return self

    def prob(self, df: pd.DataFrame) -> np.ndarray:
        return self.lr.predict_proba((self._bruto(df) - self.media) / self.desvio)[:, 1]

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


def auc_ic(y, p, amostras):
    vals = [roc_auc_score(y[i], p[i]) for i in amostras]
    return float(roc_auc_score(y, p)), float(np.percentile(vals, 2.5)), float(np.percentile(vals, 97.5))


def delta_ic(y, pa, pb, amostras):
    d = [roc_auc_score(y[i], pa[i]) - roc_auc_score(y[i], pb[i]) for i in amostras]
    return float(roc_auc_score(y, pa) - roc_auc_score(y, pb)), float(np.percentile(d, 2.5)), float(np.percentile(d, 97.5))


def faixas(y, p, baixo, alto) -> dict:
    """Três faixas (descartar < baixo <= indeterminado <= alto < confirmar)."""
    b, a = p < baixo, p > alto
    meio = ~b & ~a
    return {
        "pct_baixo": round(float(b.mean()), 3), "pct_indeterminado": round(float(meio.mean()), 3),
        "pct_alto": round(float(a.mean()), 3),
        "sensibilidade_descartar": round(float((~b)[y == 1].mean()), 3),   # casos que NÃO caem em "baixo"
        "vpn_baixo": round(float((y[b] == 0).mean()), 3) if b.any() else None,
        "especificidade_confirmar": round(float((~a)[y == 0].mean()), 3),
        "vpp_alto": round(float((y[a] == 1).mean()), 3) if a.any() else None,
    }


def cortes_equivalentes(y, p, idx_tr, baixo_idx, alto_idx) -> tuple[float, float]:
    """Cortes do modelo com a mesma sensibilidade/especificidade que o índice clássico no treino."""
    sens = ((idx_tr >= baixo_idx)[y == 1]).mean()
    esp = ((idx_tr <= alto_idx)[y == 0]).mean()
    baixo = float(np.quantile(p[y == 1], 1 - sens))   # sens do modelo = sens do índice
    alto = float(np.quantile(p[y == 0], esp))         # esp do modelo = esp do índice
    return baixo, alto


def calibracao(y, p, n=5):
    q = pd.qcut(p, n, labels=False, duplicates="drop")
    return [{"previsto": round(float(p[q == k].mean()), 3), "observado": round(float(y[q == k].mean()), 3),
             "n": int((q == k).sum())} for k in sorted(set(q))]


def main() -> None:
    SAIDA.mkdir(exist_ok=True)
    base = pd.read_csv(DADOS / "base.csv")
    base["razao_tgo_tgp"] = base.tgo / base.tgp
    base["fibrose_avancada"] = (base.rigidez_kpa >= 9.7).astype(int)  # Eddowes 2019 (F3)
    base = base.dropna(subset=EXIGE)
    base = pd.concat([base, indices(base)], axis=1)
    tr_all, te_all = base[base.ciclo == "2017-2020"], base[base.ciclo == "2021-2023"]
    rng = np.random.default_rng(SEMENTE)

    saida = {
        "gerado_em": date.today().isoformat(),
        "fonte": "NHANES 2017-2023 com elastografia hepática (CDC/EUA). Treino 2017-2020, teste 2021-2023.",
        "aviso": "Apoio à decisão do médico: probabilidade do achado na elastografia. Não é diagnóstico.",
        "transformacao_log": sorted(LOG), "nomes": NOMES, "exige": EXIGE, "alvos": {},
    }
    md = ["# Fígado: apoio à decisão (esteatose e fibrose)", "",
          f"Gerado por `figado/treino.py` em {saida['gerado_em']}. {saida['fonte']}", ""]

    for alvo, cfg in ALVOS.items():
        ytr, yte = tr_all[alvo].to_numpy(), te_all[alvo].to_numpy()
        amostras = [rng.integers(0, len(yte), len(yte)) for _ in range(1000)]
        md += [f"## {cfg['descricao']}", "",
               f"Teste: {len(te_all)} pessoas, {int(yte.sum())} com o achado ({yte.mean():.1%}).", "",
               "| Método | AUC (IC 95%) |", "|---|---|"]
        bloco = {"descricao": cfg["descricao"], "versoes": {}, "indices": {}, "comparacoes": []}
        probs: dict[str, np.ndarray] = {}

        for i in cfg["indices"]:
            ok = te_all[i].notna().to_numpy()
            auc, lo, hi = auc_ic(yte[ok], te_all[i].to_numpy()[ok], [rng.integers(0, ok.sum(), ok.sum()) for _ in range(500)])
            md.append(f"| Índice {i.upper()} (fórmula clínica) | {auc:.3f} ({lo:.3f}-{hi:.3f}) |")

        for nome, cols in VERSOES.items():
            m = Modelo(cols).fit(tr_all, ytr)
            probs[nome] = m.prob(te_all)
            auc, lo, hi = auc_ic(yte, probs[nome], amostras)
            md.append(f"| Modelo `{nome}` (regressão logística) | {auc:.3f} ({lo:.3f}-{hi:.3f}) |")
            hgb = HistGradientBoostingClassifier(max_depth=3, learning_rate=0.05, max_iter=400,
                                                 random_state=SEMENTE).fit(tr_all[cols], ytr)
            p_hgb = hgb.predict_proba(te_all[cols])[:, 1]
            md.append(f"| Modelo `{nome}` (árvores, referência) | {roc_auc_score(yte, p_hgb):.3f} |")

            # Modelo final (dois ciclos) + calibração por validação cruzada
            y_all = base[alvo].to_numpy()
            p_cv = np.zeros(len(base))
            for a, b in StratifiedKFold(5, shuffle=True, random_state=SEMENTE).split(base, y_all):
                p_cv[b] = Modelo(cols).fit(base.iloc[a], y_all[a]).prob(base.iloc[b])
            final = Modelo(cols).fit(base, y_all)
            bloco["versoes"][nome] = {**final.json(), "auc_teste": round(auc, 3),
                                      "auc_teste_ic95": [round(lo, 3), round(hi, 3)],
                                      "calibracao_validacao_cruzada": calibracao(y_all, p_cv),
                                      "prevalencia": round(float(y_all.mean()), 4)}
            m_tr = m.prob(tr_all)
            bloco["versoes"][nome]["_p_tr"] = m_tr  # removidos antes de salvar
            bloco["versoes"][nome]["_p_tr_full"] = m_tr

        # Comparações pareadas (só quem tem o índice calculável)
        md += ["", "| Comparação (mesmas pessoas) | ΔAUC | IC 95% |", "|---|---|---|"]
        for i in cfg["indices"]:
            ok = te_all[i].notna().to_numpy()
            am = [rng.integers(0, ok.sum(), ok.sum()) for _ in range(1000)]
            for nome in VERSOES:
                d, lo, hi = delta_ic(yte[ok], probs[nome][ok], te_all[i].to_numpy()[ok], am)
                bloco["comparacoes"].append({"modelo": nome, "contra": i, "delta_auc": round(d, 3),
                                             "ic95": [round(lo, 3), round(hi, 3)], "n": int(ok.sum())})
                md.append(f"| `{nome}` vs {i.upper()} | {d:+.3f} | {lo:+.3f} a {hi:+.3f} |")

        # Zona cinzenta: índice com cortes clássicos vs modelo com a mesma sens/esp (definidas no treino)
        principal = cfg["indices"][0]
        b_idx, a_idx = cfg["cortes"][principal]
        ok_tr = tr_all[principal].notna().to_numpy()
        ok_te = te_all[principal].notna().to_numpy()
        md += ["", f"**Zona cinzenta** (cortes clássicos do {principal.upper()}: < {b_idx} descarta, > {a_idx} confirma; "
               "o modelo usa cortes com a mesma sensibilidade e especificidade, definidos no treino):", "",
               "| Método | Baixo | Indeterminado | Alto | Sens. (não descartar quem tem) | VPN do baixo | VPP do alto |",
               "|---|---|---|---|---|---|---|"]
        f_idx = faixas(yte[ok_te], te_all[principal].to_numpy()[ok_te], b_idx, a_idx)
        bloco["zona_cinzenta"] = {principal: {"cortes": [b_idx, a_idx], **f_idx}}
        md.append(f"| {principal.upper()} | {f_idx['pct_baixo']:.1%} | {f_idx['pct_indeterminado']:.1%} | "
                  f"{f_idx['pct_alto']:.1%} | {f_idx['sensibilidade_descartar']:.1%} | {f_idx['vpn_baixo']:.1%} | "
                  f"{f_idx['vpp_alto']:.1%} |")
        for nome in VERSOES:
            p_tr = bloco["versoes"][nome].pop("_p_tr")
            cb, ca = cortes_equivalentes(ytr[ok_tr], p_tr[ok_tr], tr_all[principal].to_numpy()[ok_tr], b_idx, a_idx)
            f = faixas(yte[ok_te], probs[nome][ok_te], cb, ca)
            bloco["zona_cinzenta"][nome] = {"cortes": [round(cb, 4), round(ca, 4)], **f}
            bloco["versoes"][nome]["cortes_faixas"] = [round(cb, 4), round(ca, 4)]
            md.append(f"| Modelo `{nome}` | {f['pct_baixo']:.1%} | {f['pct_indeterminado']:.1%} | {f['pct_alto']:.1%} | "
                      f"{f['sensibilidade_descartar']:.1%} | {f['vpn_baixo']:.1%} | {f['vpp_alto']:.1%} |")

        # Encaminhamento: para achar 80% dos casos (corte definido no treino), quantos precisam ir
        # para a elastografia e quantos encaminhados são precisos para achar 1 caso.
        md += ["", "**Encaminhamento para achar 80% dos casos** (corte definido no treino, medido no teste):", "",
               "| Método | Encaminhados | Casos achados | VPP | Encaminhar N para achar 1 | Encaminhados com sens. igualada em 80% no teste |", "|---|---|---|---|---|---|"]
        bloco["encaminhamento_80"] = {}
        candidatos = {i: (tr_all[i].to_numpy(), te_all[i].to_numpy()) for i in cfg["indices"]}
        for nome in VERSOES:
            candidatos[nome] = (bloco["versoes"][nome]["_p_tr_full"], probs[nome])
        for nome, (p_tr, p_te) in candidatos.items():
            okt, oke = ~np.isnan(p_tr), ~np.isnan(p_te)
            corte = float(np.quantile(p_tr[okt][ytr[okt] == 1], 0.2))
            enc = p_te[oke] >= corte
            vpp = float(yte[oke][enc].mean())
            r = {"corte": round(corte, 4), "pct_encaminhados": round(float(enc.mean()), 3),
                 "sensibilidade": round(float(enc[yte[oke] == 1].mean()), 3), "vpp": round(vpp, 3),
                 "encaminhar_para_achar_1": round(1 / vpp, 1),
                 "pct_encaminhados_sens80_teste": round(float((p_te[oke] >= np.quantile(p_te[oke][yte[oke] == 1], 0.2)).mean()), 3)}
            bloco["encaminhamento_80"][nome] = r
            if nome in VERSOES:
                bloco["versoes"][nome]["corte_encaminhar"] = r["corte"]
            rot = f"Modelo `{nome}`" if nome in VERSOES else nome.upper()
            md.append(f"| {rot} | {r['pct_encaminhados']:.1%} | {r['sensibilidade']:.1%} | {vpp:.1%} | "
                      f"{r['encaminhar_para_achar_1']} | {r['pct_encaminhados_sens80_teste']:.1%} |")
        for nome in VERSOES:
            bloco["versoes"][nome].pop("_p_tr_full")

        md += ["", "Pesos do modelo final (padronizados; + aumenta a chance):", ""]
        for nome, v in bloco["versoes"].items():
            pares = sorted(zip(v["sinais"], v["coeficientes"]), key=lambda t: -abs(t[1]))
            md.append(f"- **{nome}:** " + ", ".join(f"{NOMES[c]} {b:+.2f}" for c, b in pares))
            md.append(f"  - calibração (validação cruzada): {v['calibracao_validacao_cruzada']}")
        md.append("")
        saida["alvos"][alvo] = bloco

    (SAIDA / "figado.json").write_text(json.dumps(saida, ensure_ascii=False, indent=2), encoding="utf-8")
    (SAIDA / "figado_relatorio.md").write_text("\n".join(md) + "\n", encoding="utf-8")
    print("\n".join(md))


if __name__ == "__main__":
    main()
