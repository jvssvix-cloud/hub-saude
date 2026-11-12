"""Baixa os arquivos públicos do NHANES com elastografia hepática (FibroScan).

Treino: 2017-mar/2020 (prefixo P_). Teste: ago/2021-ago/2023 (sufixo _L).
Arquivos em risco/dados/figado/ (fora do Git). Rodar: ../.venv/Scripts/python baixar.py
"""
from pathlib import Path
import urllib.request

ARQUIVOS = [
    "DEMO",    # idade, sexo
    "BMX",     # IMC, cintura
    "LUX",     # elastografia: rigidez (kPa) e CAP (dB/m) -> rótulos
    "BIOPRO",  # TGO, TGP, GGT, fosfatase, bilirrubina, albumina, triglicérides, glicose...
    "CBC",     # plaquetas
    "GHB",     # HbA1c
    "HDL",     # HDL
    "INS",     # insulina (subamostra em jejum)
    "FERTIN",  # ferritina
    "HEPC",    # hepatite C (excluímos RNA positivo)
    "HEPBD",   # hepatite B (excluímos HBsAg positivo)
    "ALQ",     # álcool
    "DIQ",     # diabetes informado
    "BPQ",     # pressão alta informada
    "SMQ",     # tabagismo
]
CICLOS = {"P_{}": 2017, "{}_L": 2021}
PASTA = Path(__file__).resolve().parent.parent / "dados" / "figado"


def main() -> None:
    PASTA.mkdir(parents=True, exist_ok=True)
    for padrao, ano in CICLOS.items():
        for nome in ARQUIVOS:
            arquivo = padrao.format(nome) + ".xpt"
            destino = PASTA / arquivo
            if destino.exists():
                continue
            url = f"https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/{ano}/DataFiles/{arquivo}"
            print("baixando", url)
            urllib.request.urlretrieve(url, destino)
    print("ok:", sorted(p.name for p in PASTA.glob("*.xpt")))


if __name__ == "__main__":
    main()
