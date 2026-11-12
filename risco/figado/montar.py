"""Monta a base do fígado: uma linha por adulto com elastografia válida.

Rótulos (exame de referência, FibroScan):
- esteatose: CAP >= 285 dB/m (gordura no fígado)
- fibrose:   rigidez >= 8,0 kPa (fibrose significativa, F2 ou mais)
População: 20+ anos, exame completo (LUAXSTAT = 1), sem hepatite B (HBsAg+) ou C (RNA+).
Álcool fica como sinal (o médico precisa ver), não como exclusão.

Saída: risco/dados/figado/base.csv. Rodar: ../.venv/Scripts/python montar.py
"""
from pathlib import Path

import numpy as np
import pandas as pd

PASTA = Path(__file__).resolve().parent.parent / "dados" / "figado"
CICLOS = {"P_{}": "2017-2020", "{}_L": "2021-2023"}


def ler(padrao: str, nome: str, colunas: list[str]) -> pd.DataFrame:
    df = pd.read_sas(PASTA / (padrao.format(nome) + ".xpt"), format="xport", encoding=None)
    faltando = [c for c in colunas if c not in df.columns]
    if faltando:
        raise KeyError(f"{padrao.format(nome)}: colunas ausentes {faltando}")
    return df[["SEQN", *colunas]]


def sim(s: pd.Series) -> pd.Series:
    return s.map({1: 1.0, 2: 0.0})


def alcool(df: pd.DataFrame) -> pd.Series:
    """Mesma escala do check-up do Zelo: 0 não bebe, 1 raramente, 2 toda semana, 3 quase todo dia."""
    freq = df["ALQ121"]
    nivel = np.select(
        [df["ALQ111"] == 2, freq == 0, freq.isin([1, 2]), freq.isin([3, 4, 5]), freq.isin([6, 7, 8, 9, 10])],
        [0, 0, 3, 2, 1], np.nan)
    return pd.Series(nivel, index=df.index)


def ciclo(padrao: str) -> pd.DataFrame:
    partes = [
        ler(padrao, "DEMO", ["RIDAGEYR", "RIAGENDR"]),
        ler(padrao, "BMX", ["BMXBMI", "BMXWAIST"]),
        ler(padrao, "LUX", ["LUAXSTAT", "LUXSMED", "LUXCAPM"]),
        ler(padrao, "BIOPRO", ["LBXSATSI", "LBXSASSI", "LBXSGTSI", "LBXSAPSI", "LBXSTB", "LBXSAL",
                               "LBXSTR", "LBXSCH", "LBXSUA", "LBXSCR", "LBXSGL"]),
        ler(padrao, "CBC", ["LBXPLTSI"]),
        ler(padrao, "GHB", ["LBXGH"]),
        ler(padrao, "HDL", ["LBDHDD"]),
        ler(padrao, "INS", ["LBXIN"]),
        ler(padrao, "FERTIN", ["LBXFER"]),
        ler(padrao, "HEPC", ["LBXHCR"]),
        ler(padrao, "HEPBD", ["LBDHBG"]),
        ler(padrao, "ALQ", ["ALQ111", "ALQ121"]),
        ler(padrao, "DIQ", ["DIQ010"]),
        ler(padrao, "BPQ", ["BPQ020"]),
        ler(padrao, "SMQ", ["SMQ020", "SMQ040"]),
    ]
    df = partes[0]
    for p in partes[1:]:
        df = df.merge(p, on="SEQN", how="left")

    df = df[(df["RIDAGEYR"] >= 20) & (df["LUAXSTAT"] == 1) & df["LUXSMED"].notna() & df["LUXCAPM"].notna()]
    df = df[(df["LBXHCR"] != 1) & (df["LBDHBG"] != 1)]

    fumante = np.where(df["SMQ020"] == 2, 0.0,
                       np.where(df["SMQ040"].isin([1, 2]), 1.0, np.where(df["SMQ040"] == 3, 0.0, np.nan)))
    return pd.DataFrame({
        "seqn": df["SEQN"].astype(int),
        "ciclo": CICLOS[padrao],
        "cap": df["LUXCAPM"],
        "rigidez_kpa": df["LUXSMED"],
        "esteatose": (df["LUXCAPM"] >= 285).astype(int),
        "fibrose": (df["LUXSMED"] >= 8.0).astype(int),
        # perfil (check-up do Zelo)
        "idade": df["RIDAGEYR"],
        "masculino": (df["RIAGENDR"] == 1).astype(float),
        "imc": df["BMXBMI"],
        "cintura": df["BMXWAIST"],  # só para o índice FLI (o Zelo não pergunta cintura)
        "diabetes": sim(df["DIQ010"]).fillna(0),
        "pressao_alta": sim(df["BPQ020"]),
        "alcool": alcool(df),
        "fumante": fumante,
        # exames (códigos do dicionário da extração)
        "tgo": df["LBXSASSI"],
        "tgp": df["LBXSATSI"],
        "ggt": df["LBXSGTSI"],
        "fosfatase_alcalina": df["LBXSAPSI"],
        "bilirrubina_total": df["LBXSTB"],
        "plaquetas": df["LBXPLTSI"],          # mil/mm³
        "triglicerides": df["LBXSTR"],
        "colesterol_total": df["LBXSCH"],
        "hdl": df["LBDHDD"],
        "glicose": df["LBXSGL"],
        "hba1c": df["LBXGH"],
        "acido_urico": df["LBXSUA"],
        "creatinina": df["LBXSCR"],
        "ferritina": df["LBXFER"],
        "insulina": df["LBXIN"],
        "albumina": df["LBXSAL"],            # só para o NFS (fora do dicionário do Zelo)
    })


def main() -> None:
    base = pd.concat([ciclo(p) for p in CICLOS], ignore_index=True)
    base.to_csv(PASTA / "base.csv", index=False)
    print(f"{len(base)} pessoas")
    print(base.groupby("ciclo")[["esteatose", "fibrose"]].agg(["size", "mean"]).round(3))
    print("\nPreenchimento (% não vazio):")
    print((base.notna().mean() * 100).round(1).to_string())


if __name__ == "__main__":
    main()
