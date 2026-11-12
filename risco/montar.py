"""Monta a base de treino a partir dos arquivos do NHANES (risco/dados/*.xpt).

Uma linha por pessoa: adultos (20+), SEM diabetes já diagnosticado e sem gestação.
Rótulo `alterado` = HbA1c >= 5,7% (pré-diabetes ou diabetes ainda não diagnosticado),
o grupo que a ADA recomenda rastrear. Glicose e HbA1c NUNCA entram como sinal
(seria vazamento: o rótulo é definido por elas).

Saída: risco/dados/base.csv. Rodar: .venv/Scripts/python montar.py
"""
from pathlib import Path

import numpy as np
import pandas as pd

PASTA = Path(__file__).parent / "dados"
CICLOS = {"G": "2011-2012", "H": "2013-2014"}


def ler(nome: str, sufixo: str, colunas: list[str]) -> pd.DataFrame:
    df = pd.read_sas(PASTA / f"{nome}_{sufixo}.xpt", format="xport", encoding=None)
    faltando = [c for c in colunas if c not in df.columns]
    if faltando:
        raise KeyError(f"{nome}_{sufixo}: colunas ausentes {faltando}")
    return df[["SEQN", *colunas]]


def sim(serie: pd.Series) -> pd.Series:
    """Código NHANES 1 = sim, 2 = não; o resto (7, 9, vazio) vira vazio."""
    return serie.map({1: 1.0, 2: 0.0})


def minutos_semana(df: pd.DataFrame, pergunta: str, dias: str, minutos: str) -> pd.Series:
    """Atividade de um domínio do PAQ em minutos por semana (0 se respondeu que não faz)."""
    faz = df[pergunta]
    d = df[dias].where(df[dias] <= 7)
    m = df[minutos].where(df[minutos] <= 1000)
    total = d * m
    total = total.where(faz != 2, 0.0)
    return total.where(faz.isin([1, 2]))


def relogio(sufixo: str) -> pd.DataFrame:
    """Resumo do acelerômetro de pulso: média por dia válido (>= 20 h de uso, sem flag de qualidade alta)."""
    df = ler("PAXDAY", sufixo, ["PAXWWMD", "PAXSWMD", "PAXMTSD", "PAXQFD"])
    valido = (df["PAXWWMD"] + df["PAXSWMD"] >= 20 * 60) & (df["PAXQFD"] < 60)
    df = df[valido]
    g = df.groupby("SEQN").agg(
        dias_validos=("PAXMTSD", "size"),
        movimento_dia=("PAXMTSD", "mean"),       # MIMS por dia
        sono_relogio_h=("PAXSWMD", "mean"),
    )
    g["sono_relogio_h"] = g["sono_relogio_h"] / 60
    g = g[g["dias_validos"] >= 4]
    return g.reset_index()


def ciclo(sufixo: str) -> pd.DataFrame:
    demo = ler("DEMO", sufixo, ["RIDAGEYR", "RIAGENDR", "RIDEXPRG"])
    ghb = ler("GHB", sufixo, ["LBXGH"])
    bmx = ler("BMX", sufixo, ["BMXBMI", "BMXWAIST"])
    bpx = ler("BPX", sufixo, ["BPXPLS"])
    hdl = ler("HDL", sufixo, ["LBDHDD"])
    bio = ler("BIOPRO", sufixo, ["LBXSTR", "LBXSCH", "LBXSATSI", "LBXSASSI", "LBXSGTSI", "LBXSUA", "LBXSCR"])
    diq = ler("DIQ", sufixo, ["DIQ010"])
    mcq = ler("MCQ", sufixo, ["MCQ300C"])
    bpq = ler("BPQ", sufixo, ["BPQ020"])
    paq = ler("PAQ", sufixo, ["PAQ605", "PAQ610", "PAD615", "PAQ620", "PAQ625", "PAD630",
                              "PAQ635", "PAQ640", "PAD645", "PAQ650", "PAQ655", "PAD660",
                              "PAQ665", "PAQ670", "PAD675"])
    slq = ler("SLQ", sufixo, ["SLD010H"])
    smq = ler("SMQ", sufixo, ["SMQ020", "SMQ040"])
    rhq = ler("RHQ", sufixo, ["RHQ162"])

    df = demo
    for outro in [ghb, bmx, bpx, hdl, bio, diq, mcq, bpq, paq, slq, smq, rhq]:
        df = df.merge(outro, on="SEQN", how="left")
    df = df.merge(relogio(sufixo), on="SEQN", how="left")

    # População: adultos, sem diabetes diagnosticado, sem gestação, com HbA1c medida.
    df = df[(df["RIDAGEYR"] >= 20) & (df["DIQ010"] != 1) & (df["RIDEXPRG"] != 1) & df["LBXGH"].notna()]

    exercicio = (minutos_semana(df, "PAQ650", "PAQ655", "PAD660")
                 + minutos_semana(df, "PAQ665", "PAQ670", "PAD675"))
    deslocamento = minutos_semana(df, "PAQ635", "PAQ640", "PAD645")

    fumante = np.where(df["SMQ020"] == 2, 0.0,
                       np.where(df["SMQ040"].isin([1, 2]), 1.0,
                                np.where(df["SMQ040"] == 3, 0.0, np.nan)))

    base = pd.DataFrame({
        "seqn": df["SEQN"].astype(int),
        "ciclo": CICLOS[sufixo],
        "hba1c": df["LBXGH"],
        "alterado": (df["LBXGH"] >= 5.7).astype(int),
        "diabetes_oculto": (df["LBXGH"] >= 6.5).astype(int),
        # perfil (check-up do Zelo)
        "idade": df["RIDAGEYR"],
        "masculino": (df["RIAGENDR"] == 1).astype(float),
        "imc": df["BMXBMI"],
        "cintura": df["BMXWAIST"],
        "familia_diabetes": sim(df["MCQ300C"]),
        "pressao_alta": sim(df["BPQ020"]),
        "exercicio_h_semana": (exercicio + deslocamento) / 60,
        "fumante": fumante,
        "sono_informado_h": df["SLD010H"].where(df["SLD010H"] <= 24),
        "diabetes_gestacional": np.where(df["RIAGENDR"] == 2, sim(df["RHQ162"]), 0.0),
        # exames de sangue (sem glicose e sem HbA1c)
        "hdl": df["LBDHDD"],
        "triglicerides": df["LBXSTR"],
        "colesterol_total": df["LBXSCH"],
        "tgp": df["LBXSATSI"],
        "tgo": df["LBXSASSI"],
        "ggt": df["LBXSGTSI"],
        "acido_urico": df["LBXSUA"],
        "creatinina": df["LBXSCR"],
        # relógio
        "fc_repouso": df["BPXPLS"],
        "movimento_dia": df["movimento_dia"],
        "sono_relogio_h": df["sono_relogio_h"],
        "dias_relogio": df["dias_validos"],
    })
    return base


def main() -> None:
    base = pd.concat([ciclo(s) for s in CICLOS], ignore_index=True)
    destino = PASTA / "base.csv"
    base.to_csv(destino, index=False)
    print(f"{len(base)} pessoas -> {destino}")
    print(base.groupby("ciclo")[["alterado", "diabetes_oculto"]].agg(["size", "mean"]).round(3))
    print("\nPreenchimento (% não vazio):")
    print((base.notna().mean() * 100).round(1).to_string())


if __name__ == "__main__":
    main()
