"""Baixa os arquivos públicos do NHANES (CDC, EUA) usados no modelo de risco.

Dois ciclos com acelerômetro de pulso: 2011-2012 (sufixo G, treino) e 2013-2014 (sufixo H, teste).
Os arquivos ficam em risco/dados/ (fora do Git). Rodar: .venv/Scripts/python baixar.py
"""
from pathlib import Path
import urllib.request

CICLOS = {"G": 2011, "H": 2013}
ARQUIVOS = [
    "DEMO",    # idade, sexo, etnia, renda
    "BMX",     # peso, altura, IMC, cintura
    "BPX",     # pressão e pulso em repouso
    "GHB",     # HbA1c (rótulo)
    "HDL",     # colesterol HDL
    "BIOPRO",  # bioquímica: triglicérides, colesterol, TGO, TGP, GGT, ácido úrico, creatinina
    "DIQ",     # diabetes já diagnosticado (excluímos), pré-diabetes informado
    "MCQ",     # histórico familiar de diabetes
    "BPQ",     # pressão alta informada e remédio
    "PAQ",     # atividade física informada
    "SLQ",     # horas de sono informadas
    "SMQ",     # tabagismo
    "RHQ",     # diabetes gestacional (mulheres)
    "PAXDAY",  # acelerômetro de pulso: resumo por dia (movimento, sono, uso)
    "PAXHD",   # acelerômetro: cabeçalho (hora de início da gravação)
    "PAXHR",   # acelerômetro: resumo por hora (~120 MB por ciclo)
]

PASTA = Path(__file__).parent / "dados"


def main() -> None:
    PASTA.mkdir(exist_ok=True)
    for sufixo, ano in CICLOS.items():
        for nome in ARQUIVOS:
            arquivo = f"{nome}_{sufixo}.xpt"
            destino = PASTA / arquivo
            if destino.exists():
                continue
            url = f"https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/{ano}/DataFiles/{arquivo}"
            print("baixando", url)
            urllib.request.urlretrieve(url, destino)
    print("ok:", sorted(p.name for p in PASTA.glob("*.xpt")))


if __name__ == "__main__":
    main()
