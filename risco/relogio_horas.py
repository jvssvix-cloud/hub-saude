"""Sinais finos do relógio a partir do resumo POR HORA do acelerômetro de pulso (NHANES PAXHR).

A soma do dia (PAXDAY) mistura volume com tempo acordado. Aqui medimos ritmo e padrão,
coisas que um relógio comum (Apple Saúde / Health Connect) também registra hora a hora:

- intensidade_acordado: movimento por minuto acordado (MIMS/min)
- horas_ativas / horas_paradas: horas acordado com movimento alto / baixo (cortes do treino)
- sono_h, sono_irregular_h: média e desvio-padrão das horas dormidas por noite
- meio_sono_h, meio_sono_irregular_h: horário médio do meio do sono e sua variação entre noites
- amplitude_ritmo: (M10 - L5) / (M10 + L5), contraste entre as 10 h mais ativas e as 5 h mais quietas
- estabilidade_ritmo: quanto o perfil de 24 h se repete de um dia para o outro (IS)
- variabilidade_dias: coeficiente de variação do movimento diário

Saída: dados/relogio_horas.csv. Rodar: .venv/Scripts/python relogio_horas.py
"""
from pathlib import Path

import numpy as np
import pandas as pd

PASTA = Path(__file__).parent / "dados"
CICLOS = ["G", "H"]


def segundos(hhmmss) -> float:
    s = hhmmss.decode() if isinstance(hhmmss, bytes) else str(hhmmss)
    h, m, x = (int(v) for v in s.split(":"))
    return h * 3600 + m * 60 + x


def ler_horas(sufixo: str) -> pd.DataFrame:
    hd = pd.read_sas(PASTA / f"PAXHD_{sufixo}.xpt", format="xport", encoding=None)
    hd = hd[hd["PAXSTS"] == 1][["SEQN", "PAXFTIME"]]
    hd["inicio_s"] = hd["PAXFTIME"].map(segundos)
    hr = pd.read_sas(PASTA / f"PAXHR_{sufixo}.xpt", format="xport", encoding=None)
    hr = hr[["SEQN", "PAXDAYH", "PAXSSNHP", "PAXMTSH", "PAXWWMH", "PAXSWMH", "PAXUMH", "PAXQFH"]]
    hr = hr.merge(hd[["SEQN", "inicio_s"]], on="SEQN")
    # Horas desde a meia-noite do 1º dia; hora do relógio = t mod 24.
    hr["t"] = (hr["inicio_s"] + hr["PAXSSNHP"] / 80) / 3600
    hr["hora"] = np.floor(hr["t"]).astype(int) % 24
    hr["uso_min"] = hr["PAXWWMH"] + hr["PAXSWMH"] + hr["PAXUMH"]
    hr["mims_min"] = hr["PAXMTSH"] / hr["uso_min"].where(hr["uso_min"] > 0)
    hr["usada"] = (hr["uso_min"] >= 50) & (hr["PAXQFH"] < 5)
    return hr


def dias_validos(sufixo: str) -> pd.DataFrame:
    d = pd.read_sas(PASTA / f"PAXDAY_{sufixo}.xpt", format="xport", encoding=None)
    ok = (d["PAXWWMD"] + d["PAXSWMD"] >= 20 * 60) & (d["PAXQFD"] < 60)
    d = d[ok].copy()
    d["intensidade"] = d["PAXMTSD"] / d["PAXWWMD"].where(d["PAXWWMD"] >= 600)
    return d[["SEQN", "PAXDAYD", "PAXMTSD", "intensidade"]].rename(columns={"PAXDAYD": "PAXDAYH"})


def ritmo(perfil: np.ndarray) -> float:
    """Amplitude relativa: M10 (10 h seguidas mais ativas) vs L5 (5 h seguidas mais quietas), circular."""
    dobrado = np.concatenate([perfil, perfil])
    m10 = max(dobrado[i:i + 10].mean() for i in range(24))
    l5 = min(dobrado[i:i + 5].mean() for i in range(24))
    return (m10 - l5) / (m10 + l5) if (m10 + l5) > 0 else np.nan


def estabilidade(h: pd.DataFrame) -> float:
    """Interdaily stability (IS): variância do perfil médio de 24 h / variância total por hora."""
    x = h["mims_min"].to_numpy()
    if len(x) < 48:
        return np.nan
    perfil = h.groupby("hora")["mims_min"].mean()
    tot = np.var(x)
    return float(np.var(perfil.reindex(h["hora"]).to_numpy()) / tot) if tot > 0 else np.nan


def sinais(sufixo: str, cortes: dict | None) -> tuple[pd.DataFrame, dict]:
    hr = ler_horas(sufixo)
    dias = dias_validos(sufixo)
    h = hr[hr["usada"]].merge(dias[["SEQN", "PAXDAYH"]], on=["SEQN", "PAXDAYH"])

    acordado = h[h["PAXWWMH"] >= 45]
    if cortes is None:  # cortes definidos só no treino (2011-2012)
        cortes = {"ativa": float(acordado["mims_min"].quantile(0.8)),
                  "parada": float(acordado["mims_min"].quantile(0.2))}
    acordado = acordado.assign(ativa=acordado["mims_min"] >= cortes["ativa"],
                               parada=acordado["mims_min"] <= cortes["parada"])
    por_dia = acordado.groupby(["SEQN", "PAXDAYH"]).agg(ativas=("ativa", "sum"), paradas=("parada", "sum"))
    horas_dia = por_dia.groupby("SEQN").mean()

    # Noites: janela de meio-dia a meio-dia; só noites com >= 20 h de uso na janela.
    todas = hr[hr["usada"]].copy()
    todas["noite"] = np.floor((todas["t"] - 12) / 24).astype(int)
    # Hora dentro da janela da noite (12 = meio-dia, 24 = meia-noite, 36 = meio-dia seguinte),
    # +0,5 = meio da hora; o meio do sono é a média ponderada pelos minutos dormidos.
    todas["rel"] = todas["t"] - 24 * todas["noite"] + 0.5
    todas["peso"] = todas["rel"] * todas["PAXSWMH"]
    noites = todas.groupby(["SEQN", "noite"]).agg(
        horas_uso=("PAXSWMH", "size"), sono_min=("PAXSWMH", "sum"), peso=("peso", "sum")).reset_index()
    noites["sono_h"] = noites["sono_min"] / 60
    noites["meio"] = noites["peso"] / noites["sono_min"].where(noites["sono_min"] > 0)
    noites = noites[(noites["horas_uso"] >= 20) & (noites["sono_h"] >= 2)]
    sono = noites.groupby("SEQN").agg(
        sono_h=("sono_h", "mean"), sono_irregular_h=("sono_h", "std"),
        meio_sono_h=("meio", "mean"), meio_sono_irregular_h=("meio", "std"), noites=("sono_h", "size"))
    sono = sono[sono["noites"] >= 3]

    perfil = h.groupby(["SEQN", "hora"])["mims_min"].mean().unstack().reindex(columns=range(24))
    amp = perfil.apply(lambda r: ritmo(r.to_numpy()) if r.notna().all() else np.nan, axis=1)
    est = h.groupby("SEQN").apply(estabilidade, include_groups=False)

    dd = dias.groupby("SEQN").agg(n_dias=("PAXMTSD", "size"),
                                  intensidade_acordado=("intensidade", "mean"),
                                  media_dia=("PAXMTSD", "mean"), dp_dia=("PAXMTSD", "std"))
    dd["variabilidade_dias"] = dd["dp_dia"] / dd["media_dia"]
    dd = dd[dd["n_dias"] >= 4]

    out = (dd[["intensidade_acordado", "variabilidade_dias"]]
           .join(horas_dia.rename(columns={"ativas": "horas_ativas", "paradas": "horas_paradas"}), how="left")
           .join(sono.drop(columns="noites"), how="left")
           .join(amp.rename("amplitude_ritmo"), how="left")
           .join(est.rename("estabilidade_ritmo"), how="left"))
    out = out.reset_index().rename(columns={"SEQN": "seqn"})
    out["seqn"] = out["seqn"].astype(int)
    return out, cortes


def main() -> None:
    treino, cortes = sinais("G", None)
    teste, _ = sinais("H", cortes)
    out = pd.concat([treino, teste], ignore_index=True)
    out.to_csv(PASTA / "relogio_horas.csv", index=False)
    print(f"{len(out)} pessoas; cortes (MIMS/min): {cortes}")
    print(out.describe().T.round(3).to_string())


if __name__ == "__main__":
    main()
