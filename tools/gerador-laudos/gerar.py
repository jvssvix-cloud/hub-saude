#!/usr/bin/env python3
"""
Gerador de laudos sintéticos + gabarito (dados de teste da extração).

Uso:  python gerar.py
Saída: ./saida/  (apagada e recriada a cada execução; resultado determinístico)

Fonte da verdade dos valores: persona.py. Este script só decide COMO cada
laboratório fictício imprime esses valores (nomes, unidades, decimais,
referências, layout) e grava exatamente o que foi impresso no gabarito.
"""
import csv
import io
import json
import math
import random
import shutil
import sys
import unicodedata
from datetime import date, timedelta
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI))
from persona import LABS, PERSONA, SEED, VISITAS, valores_da_visita  # noqa: E402

SAIDA = AQUI / "saida"
W, H = A4

# Laudos que viram foto: todos do layout D + 1 do B + 1 do C
FOTOS_EXTRA = ["2022-08", "2025-03"]

# ---------------------------------------------------------------------------
# Catálogo canônico
# ---------------------------------------------------------------------------
UNID_CANON = {
    "hemacias": "milhões/mm³", "hemoglobina": "g/dL", "hematocrito": "%",
    "leucocitos": "/mm³", "plaquetas": "/mm³",
    "glicose": "mg/dL", "hba1c": "%", "colesterol_total": "mg/dL", "hdl": "mg/dL",
    "ldl": "mg/dL", "triglicerides": "mg/dL", "creatinina": "mg/dL",
    "acido_urico": "mg/dL", "tgo": "U/L", "tgp": "U/L",
    "tsh": "µUI/mL", "psa": "ng/mL", "vitamina_d": "ng/mL",
}
GRUPOS = [
    ("hemato", ["hemacias", "hemoglobina", "hematocrito", "leucocitos", "plaquetas"]),
    ("bioq", ["glicose", "hba1c", "colesterol_total", "hdl", "ldl", "triglicerides",
              "creatinina", "acido_urico", "tgo", "tgp"]),
    ("imuno", ["tsh", "psa", "vitamina_d"]),
]
TITULO_GRUPO = {
    "D": {"hemato": "H E M O G R A M A", "bioq": "B I O Q U I M I C A", "imuno": "H O R M O N I O S"},
    "A": {"hemato": "Hemograma", "bioq": "Bioquímica", "imuno": "Hormônios e marcadores"},
    "B": {"hemato": "HEMATOLOGIA", "bioq": "BIOQUÍMICA", "imuno": "HORMÔNIOS E MARCADORES"},
    "C": {"hemato": "HEMATOLOGIA", "bioq": "BIOQUÍMICA", "imuno": "IMUNOENSAIOS"},
}

# Nome impresso de cada exame em cada layout
NOMES = {
    "D": {"hemacias": "HEMACIAS", "hemoglobina": "HEMOGLOBINA", "hematocrito": "HEMATOCRITO",
          "leucocitos": "LEUCOCITOS", "plaquetas": "PLAQUETAS", "glicose": "GLICEMIA",
          "hba1c": "HEMOGLOBINA GLICOSILADA", "colesterol_total": "COLESTEROL TOTAL",
          "hdl": "COLEST. HDL", "ldl": "COLEST. LDL", "triglicerides": "TRIGLICERIDES",
          "creatinina": "CREATININA", "acido_urico": "ACIDO URICO",
          "tgo": "TRANSAMINASE OXALACETICA - TGO", "tgp": "TRANSAMINASE PIRUVICA - TGP",
          "tsh": "TSH - HORMONIO TIREOESTIMULANTE", "psa": "P.S.A. TOTAL", "vitamina_d": "VITAMINA D"},
    "A": {"hemacias": "Hemácias", "hemoglobina": "Hemoglobina", "hematocrito": "Hematócrito",
          "leucocitos": "Leucócitos", "plaquetas": "Plaquetas", "glicose": "Glicemia de jejum",
          "hba1c": "Hemoglobina glicada (HbA1c)", "colesterol_total": "Colesterol total",
          "hdl": "Colesterol HDL", "ldl": "Colesterol LDL (calculado - Friedewald)",
          "triglicerides": "Triglicerídeos", "creatinina": "Creatinina", "acido_urico": "Ácido úrico",
          "tgo": "TGO (AST)", "tgp": "TGP (ALT)", "tsh": "TSH", "psa": "PSA total",
          "vitamina_d": "Vitamina D (25-hidroxi)"},
    "B": {"hemacias": "ERITRÓCITOS", "hemoglobina": "HEMOGLOBINA", "hematocrito": "HEMATÓCRITO",
          "leucocitos": "LEUCÓCITOS TOTAIS", "plaquetas": "CONTAGEM DE PLAQUETAS", "glicose": "GLICOSE",
          "hba1c": "HEMOGLOBINA GLICADA - HbA1c", "colesterol_total": "COLESTEROL TOTAL",
          "hdl": "HDL-COLESTEROL", "ldl": "LDL-COLESTEROL", "triglicerides": "TRIGLICÉRIDES",
          "creatinina": "CREATININA", "acido_urico": "ÁCIDO ÚRICO",
          "tgo": "ASPARTATO AMINOTRANSFERASE", "tgp": "ALANINA AMINOTRANSFERASE",
          "tsh": "HORMÔNIO TIREOESTIMULANTE (TSH)", "psa": "ANTÍGENO PROSTÁTICO ESPECÍFICO (PSA) TOTAL",
          "vitamina_d": "25-HIDROXIVITAMINA D"},
    "C": {"hemacias": "Hemácias", "hemoglobina": "Hb", "hematocrito": "Ht", "leucocitos": "Leucócitos",
          "plaquetas": "Plaquetas", "glicose": "Glicose - jejum", "hba1c": "HbA1c",
          "colesterol_total": "Colesterol Total", "hdl": "HDL Colesterol", "ldl": "LDL Colesterol",
          "triglicerides": "Triglicérides", "creatinina": "Creatinina sérica", "acido_urico": "Ácido Úrico",
          "tgo": "AST/TGO", "tgp": "ALT/TGP", "tsh": "TSH ultrassensível", "psa": "PSA Total",
          "vitamina_d": "Vitamina D (25-OH)"},
}

# (unidade impressa, fator [canônico = impresso * fator], casas decimais, separador de milhar)
_MG = ("mg/dL", 1, 0, "")
UNID = {
    "D": {"hemacias": ("MILHOES/MM3", 1, 2, ""), "hemoglobina": ("G/DL", 1, 1, ""),
          "hematocrito": ("%", 1, 1, ""), "leucocitos": ("/MM3", 1, 0, ""),
          "plaquetas": ("/MM3", 1, 0, ""), "glicose": ("MG/DL", 1, 0, ""), "hba1c": ("%", 1, 1, ""),
          "colesterol_total": ("MG/DL", 1, 0, ""), "hdl": ("MG/DL", 1, 0, ""), "ldl": ("MG/DL", 1, 0, ""),
          "triglicerides": ("MG/DL", 1, 0, ""), "creatinina": ("MG/DL", 1, 2, ""),
          "acido_urico": ("MG/DL", 1, 1, ""), "tgo": ("U/L", 1, 0, ""), "tgp": ("U/L", 1, 0, ""),
          "tsh": ("UUI/ML", 1, 2, ""), "psa": ("NG/ML", 1, 2, ""), "vitamina_d": ("NG/ML", 1, 1, "")},
    "A": {"hemacias": ("milhões/mm³", 1, 2, ""), "hemoglobina": ("g/dL", 1, 1, ""),
          "hematocrito": ("%", 1, 1, ""), "leucocitos": ("/mm³", 1, 0, "."),
          "plaquetas": ("/mm³", 1, 0, "."), "glicose": _MG, "hba1c": ("%", 1, 1, ""),
          "colesterol_total": _MG, "hdl": _MG, "ldl": _MG, "triglicerides": _MG,
          "creatinina": ("mg/dL", 1, 2, ""), "acido_urico": ("mg/dL", 1, 1, ""),
          "tgo": ("U/L", 1, 0, ""), "tgp": ("U/L", 1, 0, ""), "tsh": ("µUI/mL", 1, 2, ""),
          "psa": ("ng/mL", 1, 2, ""), "vitamina_d": ("ng/mL", 1, 1, "")},
    "B": {"hemacias": ("milhões/µL", 1, 2, ""), "hemoglobina": ("g/dL", 1, 1, ""),
          "hematocrito": ("%", 1, 1, ""), "leucocitos": ("/µL", 1, 0, "."),
          "plaquetas": ("mil/µL", 1000, 0, ""), "glicose": _MG, "hba1c": ("%", 1, 1, ""),
          "colesterol_total": _MG, "hdl": _MG, "ldl": _MG, "triglicerides": _MG,
          "creatinina": ("mg/dL", 1, 2, ""), "acido_urico": ("mg/dL", 1, 1, ""),
          "tgo": ("U/L", 1, 0, ""), "tgp": ("U/L", 1, 0, ""), "tsh": ("µUI/mL", 1, 2, ""),
          "psa": ("ng/mL", 1, 2, ""), "vitamina_d": ("ng/mL", 1, 1, "")},
    "C": {"hemacias": ("x10¹²/L", 1, 2, ""), "hemoglobina": ("g/dL", 1, 1, ""),
          "hematocrito": ("%", 1, 1, ""), "leucocitos": ("mil/mm³", 1000, 2, ""),
          "plaquetas": ("mil/mm³", 1000, 0, ""), "glicose": _MG, "hba1c": ("%", 1, 1, ""),
          "colesterol_total": _MG, "hdl": _MG, "ldl": _MG, "triglicerides": _MG,
          "creatinina": ("mg/dL", 1, 2, ""), "acido_urico": ("mg/dL", 1, 1, ""),
          "tgo": ("U/L", 1, 0, ""), "tgp": ("U/L", 1, 0, ""), "tsh": ("µUI/mL", 1, 2, ""),
          "psa": ("ng/mL", 1, 2, ""), "vitamina_d": ("ng/mL", 1, 1, "")},
}
DEC = {"D": ".", "A": ",", "B": ",", "C": ","}

# Material e método (usados nos layouts D e B)
MATERIAL = {
    **{a: ("Sangue total (EDTA)", "Citometria de fluxo / impedância")
       for a in ["hemacias", "hemoglobina", "hematocrito", "leucocitos", "plaquetas"]},
    "glicose": ("Plasma (fluoreto)", "Enzimático - glicose oxidase"),
    "hba1c": ("Sangue total (EDTA)", "HPLC - cromatografia líquida"),
    "colesterol_total": ("Soro", "Enzimático colorimétrico"),
    "hdl": ("Soro", "Enzimático homogêneo"),
    "ldl": ("Soro", "Calculado - equação de Friedewald"),
    "triglicerides": ("Soro", "Enzimático colorimétrico (GPO)"),
    "creatinina": ("Soro", "Jaffé cinético"),
    "acido_urico": ("Soro", "Enzimático - uricase"),
    "tgo": ("Soro", "Cinético UV (IFCC)"), "tgp": ("Soro", "Cinético UV (IFCC)"),
    "tsh": ("Soro", "Eletroquimioluminescência"), "psa": ("Soro", "Quimioluminescência"),
    "vitamina_d": ("Soro", "Quimioluminescência"),
}


# ---------------------------------------------------------------------------
# Valores de referência (números na MESMA unidade impressa)
# ---------------------------------------------------------------------------
def R(texto, mn=None, mx=None, mn_estrito=False, mx_estrito=False):
    return {"texto": texto, "min": mn, "max": mx, "min_estrito": mn_estrito, "max_estrito": mx_estrito}


LDL_ANTIGO = [("Ótimo", "< 100", "inferior a 100"), ("Desejável", "100 a 129", "100 a 129"),
              ("Limítrofe", "130 a 159", "130 a 159"), ("Alto", "160 a 189", "160 a 189"),
              ("Muito alto", ">= 190", "igual ou superior a 190")]
LDL_RISCO = [("Baixo", "< 130", "inferior a 130"), ("Intermediário", "< 100", "inferior a 100"),
             ("Alto", "< 70", "inferior a 70"), ("Muito alto", "< 50", "inferior a 50")]


def ref_ldl(layout, novo):
    """2016-2017: classificação antiga (até 'Desejável' = dentro). 2018+: meta por risco (baixo = < 130)."""
    tab = LDL_RISCO if novo else LDL_ANTIGO
    lim = dict(mx=130, mx_estrito=True) if novo else dict(mx=129)
    if layout == "D":
        pref = "RISCO " if novo else ""
        linhas = [f"{sem_acento(pref + n).upper():.<17}: {v.upper()}" for n, v, _ in tab]
        txt = "VR: " + "\n    ".join(linhas)
    elif layout == "A":
        txt = "\n".join(f"{'Risco ' + n.lower() if novo else n}: {v} mg/dL" for n, v, _ in tab)
    elif layout == "B":
        cab = ["Meta conforme categoria de risco:"] if novo else []
        txt = "\n".join(cab + [f"{n}: {e} mg/dL" for n, _, e in tab])
    else:
        if novo:
            txt = "(baixo <130; interm. <100; alto <70; muito alto <50)"
        else:
            txt = "(ótimo <100; desejável 100-129; limítrofe 130-159; alto >=160)"
    return R(txt, None, lim["mx"], mx_estrito=lim.get("mx_estrito", False))


def ref_ct(layout, novo):
    """Colesterol total: < 200 até 2017; < 190 a partir de 2018."""
    lim = 190 if novo else 200
    txt = {
        "D": f"VR: DESEJAVEL: < {lim}\n    LIMITROFE: {lim} A 239\n    ALTO.....: >= 240",
        "A": f"Desejável: < {lim} mg/dL",
        "B": f"Desejável: inferior a {lim} mg/dL",
        "C": f"(< {lim})",
    }[layout]
    return R(txt, None, lim, mx_estrito=True)


REFS = {
    "D": {
        "glicose": R("VR: 70 A 99 MG/DL", 70, 99),
        "hba1c": R("VR: 4.0 A 6.0 %", 4.0, 6.0),
        "hdl": R("VR: > 40 MG/DL", 40, None, mn_estrito=True),
        "triglicerides": R("VR: DESEJAVEL.: < 150\n    LIMITROFE.: 150 A 199\n    ALTO......: 200 A 499"
                           "\n    MUITO ALTO: >= 500", None, 150, mx_estrito=True),
        "creatinina": R("VR: 0.70 A 1.30 MG/DL", 0.70, 1.30),
        "acido_urico": R("VR: 3.5 A 7.2 MG/DL", 3.5, 7.2),
        "tgo": R("VR: 5 A 40 U/L", 5, 40), "tgp": R("VR: 7 A 56 U/L", 7, 56),
        "tsh": R("VR: 0.40 A 4.00 UUI/ML", 0.40, 4.00),
        "psa": R("VR: ATE 4.00 NG/ML", None, 4.0),
        "vitamina_d": R("VR: 30.0 A 100.0 NG/ML", 30, 100),
        "hemacias": R("VR: 4.50 A 5.90", 4.50, 5.90), "hemoglobina": R("VR: 13.5 A 17.5", 13.5, 17.5),
        "hematocrito": R("VR: 39.0 A 50.0", 39.0, 50.0), "leucocitos": R("VR: 4000 A 10000", 4000, 10000),
        "plaquetas": R("VR: 150000 A 400000", 150000, 400000),
    },
    "A": {
        "glicose": R("70 a 99 mg/dL", 70, 99),
        "hba1c": R("Normal: < 5,7%\nPré-diabetes: 5,7 a 6,4%\nDiabetes: 6,5% ou mais", None, 5.7, mx_estrito=True),
        "hdl": R("Desejável: > 40 mg/dL", 40, None, mn_estrito=True),
        "triglicerides": R("Desejável: < 150 mg/dL", None, 150, mx_estrito=True),
        "creatinina": R("0,70 a 1,20 mg/dL", 0.70, 1.20),
        "acido_urico": R("3,4 a 7,0 mg/dL", 3.4, 7.0),
        "tgo": R("Até 40 U/L", None, 40), "tgp": R("Até 41 U/L", None, 41),
        "tsh": R("0,27 a 4,20 µUI/mL", 0.27, 4.20),
        "psa": R("Até 4,00 ng/mL", None, 4.0),
        "vitamina_d": R("Acima de 20 ng/mL (população geral)\n30 a 60 ng/mL (grupos de risco)",
                        20, None, mn_estrito=True),
        "hemacias": R("4,30 a 5,70 milhões/mm³", 4.30, 5.70), "hemoglobina": R("13,5 a 17,5 g/dL", 13.5, 17.5),
        "hematocrito": R("39,0 a 50,0 %", 39.0, 50.0),
        "leucocitos": R("3.500 a 10.500 /mm³", 3500, 10500),
        "plaquetas": R("150.000 a 450.000 /mm³", 150000, 450000),
    },
    "B": {
        "glicose": R("Normal: 70 a 99 mg/dL\nGlicemia de jejum alterada: 100 a 125 mg/dL"
                     "\nDiabetes: igual ou superior a 126 mg/dL", 70, 99),
        "hba1c": R("Normal: inferior a 5,7%\nPré-diabetes: 5,7% a 6,4%\nDiabetes: igual ou superior a 6,5%",
                   None, 5.7, mx_estrito=True),
        "hdl": R("Desejável: superior a 40 mg/dL", 40, None, mn_estrito=True),
        "triglicerides": R("Desejável (com jejum): inferior a 150 mg/dL\nDesejável (sem jejum): inferior a 175 mg/dL",
                           None, 150, mx_estrito=True),
        "creatinina": R("Homens: 0,70 a 1,30 mg/dL\nMulheres: 0,50 a 1,10 mg/dL", 0.70, 1.30),
        "acido_urico": R("Homens: 3,5 a 7,2 mg/dL\nMulheres: 2,6 a 6,0 mg/dL", 3.5, 7.2),
        "tgo": R("Homens: até 40 U/L\nMulheres: até 32 U/L", None, 40),
        "tgp": R("Homens: até 41 U/L\nMulheres: até 33 U/L", None, 41),
        "tsh": R("Adultos: 0,40 a 4,30 µUI/mL", 0.40, 4.30),
        "psa": R("Até 4,0 ng/mL\n(o valor de corte pode variar com a idade)", None, 4.0),
        "vitamina_d": R("Deficiência: inferior a 20 ng/mL\nInsuficiência: 20 a 29 ng/mL"
                        "\nSuficiência: 30 a 100 ng/mL\nRisco de toxicidade: superior a 100 ng/mL", 30, 100),
        "hemacias": R("Homens: 4,50 a 5,90 milhões/µL\nMulheres: 4,00 a 5,20 milhões/µL", 4.50, 5.90),
        "hemoglobina": R("Homens: 13,5 a 17,5 g/dL\nMulheres: 12,0 a 15,5 g/dL", 13.5, 17.5),
        "hematocrito": R("Homens: 41 a 53 %\nMulheres: 36 a 46 %", 41, 53),
        "leucocitos": R("4.000 a 11.000 /µL", 4000, 11000),
        "plaquetas": R("150 a 450 mil/µL", 150, 450),
    },
    "C": {
        "glicose": R("(70 a 99)", 70, 99), "hba1c": R("(< 5,7)", None, 5.7, mx_estrito=True),
        "hdl": R("(> 40)", 40, None, mn_estrito=True),
        "triglicerides": R("(< 150)", None, 150, mx_estrito=True),
        "creatinina": R("(0,70 a 1,30)", 0.70, 1.30), "acido_urico": R("(3,5 a 7,2)", 3.5, 7.2),
        "tgo": R("(até 40)", None, 40), "tgp": R("(até 41)", None, 41),
        "tsh": R("(0,45 a 4,50)", 0.45, 4.50), "psa": R("(< 4,0)", None, 4.0, mx_estrito=True),
        "vitamina_d": R("(> 20)", 20, None, mn_estrito=True),
        "hemacias": R("(4,50 a 5,90)", 4.50, 5.90), "hemoglobina": R("(13,5 a 17,5)", 13.5, 17.5),
        "hematocrito": R("(40 a 52)", 40, 52), "leucocitos": R("(4,00 a 10,00)", 4.0, 10.0),
        "plaquetas": R("(150 a 400)", 150, 400),
    },
}


def referencia(layout, analito, ano):
    novo = ano >= 2018
    if analito == "ldl":
        return ref_ldl(layout, novo)
    if analito == "colesterol_total":
        return ref_ct(layout, novo)
    return REFS[layout][analito]


def fora_da_faixa(v, r):
    mn, mx = r["min"], r["max"]
    if mn is not None and (v < mn or (r["min_estrito"] and v == mn)):
        return True
    if mx is not None and (v > mx or (r["max_estrito"] and v == mx)):
        return True
    return False


# ---------------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------------
def sem_acento(s):
    return "".join(ch for ch in unicodedata.normalize("NFKD", s) if not unicodedata.combining(ch))


def fmt(x, casas, dec, mil):
    s = f"{x:,.{casas}f}"
    return s.replace(",", "\0").replace(".", dec).replace("\0", mil)


def br(d):
    return d.strftime("%d/%m/%Y")


def idade(nasc, d):
    return d.year - nasc.year - ((d.month, d.day) < (nasc.month, nasc.day))


def canon(num, fator):
    if fator == 1:
        return num
    return int(round(num * fator))


def para_canon(x, fator):
    return None if x is None else canon(x, fator)


def quebra(texto, fonte, tam, largura):
    """Quebra um texto em linhas que caibam na largura (pontos)."""
    out = []
    for par in texto.split("\n"):
        linha = ""
        for p in par.split(" "):
            t = (linha + " " + p).strip()
            if stringWidth(t, fonte, tam) <= largura or not linha:
                linha = t
            else:
                out.append(linha)
                linha = p
        out.append(linha)
    return out


class Doc:
    """Controla página atual, posição vertical e cabeçalho/rodapé."""

    def __init__(self, c, cab, rod, base):
        self.c, self.cab, self.rod, self.base = c, cab, rod, base
        self.pag = 1
        self.y = cab(self)

    def precisa(self, h):
        if self.y - h < self.base:
            self.rod(self)
            self.c.showPage()
            self.pag += 1
            self.y = self.cab(self)

    def fim(self):
        self.rod(self)
        self.c.showPage()


def grupos_presentes(itens):
    por = {i["analito"]: i for i in itens}
    for g, lista in GRUPOS:
        sel = [por[a] for a in lista if a in por]
        if sel:
            yield g, sel


# ---------------------------------------------------------------------------
# Layout D — Delta (máquina de escrever, Courier, maiúsculas, ponto decimal)
# ---------------------------------------------------------------------------
def render_D(c, ctx):
    rng = random.Random(f"{SEED}-maquina-{ctx['id']}")
    F, S, L = "Courier", 9, 12
    cw = stringWidth("M", F, S)
    X0, COLS = 52, 86

    def tw(col, y, s, negrito=False):
        x0 = X0 + col * cw
        deriva = rng.uniform(-0.4, 0.4)
        for i, ch in enumerate(s):
            if ch == " ":
                continue
            c.setFillGray(rng.uniform(0.04, 0.33))
            c.setFont("Courier-Bold" if negrito else F, S)
            x, yy = x0 + i * cw + rng.uniform(-0.3, 0.3), y + deriva + rng.uniform(-0.4, 0.4)
            c.drawString(x, yy, ch)
            if negrito or rng.random() < 0.05:
                c.drawString(x + 0.35, yy + 0.1, ch)

    def centro(y, s, **k):
        tw(max(0, (COLS - len(s)) // 2), y, s, **k)

    lab = ctx["lab"]

    def cab(doc):
        y = H - 58
        centro(y, sem_acento(lab["nome"]).upper(), negrito=True)
        y -= L
        centro(y, sem_acento(lab["end"]).upper())
        y -= L
        centro(y, "FONE: (11) 0000-0000  -  ATENDIMENTO DE 2A A SABADO")
        y -= L
        tw(0, y, "=" * COLS)
        y -= L
        tw(0, y, f"PACIENTE...: {ctx['nome_pac']:<44}SEXO: M")
        y -= L
        tw(0, y, f"IDADE......: {ctx['idade']} ANOS{'':<36}PROTOCOLO: {ctx['atend']}")
        y -= L
        tw(0, y, f"DATA COLETA: {ctx['data_txt']}{'':<22}MEDICO: {sem_acento(ctx['medico']).upper()}")
        y -= L
        tw(0, y, "=" * COLS)
        return y - 1.6 * L

    def rod(doc):
        tw(0, 74, "-" * COLS)
        tw(0, 62, "LIBERADO POR: " + sem_acento(lab["rt"]).upper())
        tw(0, 50, f"DATA DE EMISSAO: {ctx['liberacao_txt']}{'':<34}PAG. {doc.pag}/{ctx['total'] or '?'}")

    doc = Doc(c, cab, rod, base=96)
    for g, itens in grupos_presentes(ctx["itens"]):
        doc.precisa(4 * L)
        centro(doc.y, TITULO_GRUPO["D"][g], negrito=True)
        doc.y -= 1.5 * L
        if g == "hemato":
            mat, met = MATERIAL["hemacias"]
            tw(0, doc.y, f"MATERIAL: {sem_acento(mat).upper()}   METODO: CONTADOR AUTOMATICO")
            doc.y -= 1.5 * L
            for it in itens:
                doc.precisa(L)
                it["pagina"] = doc.pag
                tw(0, doc.y, f"{it['nome'] + ' ':.<26}: {it['valor_txt']:>8} {it['unidade']:<14} {it['ref']['texto']}")
                doc.y -= L
            doc.y -= L
        else:
            for it in itens:
                ref = it["ref"]["texto"].split("\n")
                doc.precisa((3 + len(ref)) * L)
                it["pagina"] = doc.pag
                mat, met = MATERIAL[it["analito"]]
                tw(0, doc.y, it["nome"], negrito=True)
                doc.y -= L
                tw(3, doc.y, f"MATERIAL: {sem_acento(mat).upper()}   METODO: {sem_acento(met).upper()}")
                doc.y -= L
                tw(3, doc.y, f"RESULTADO.: {it['valor_txt']} {it['unidade']}")
                for k, linha in enumerate(ref):
                    tw(42, doc.y - k * L, linha)
                doc.y -= (len(ref) + 0.8) * L
    doc.precisa(3 * L)
    tw(0, doc.y, "OBS.: RESULTADOS CONFERIDOS E LIBERADOS PELO RESPONSAVEL TECNICO.")
    doc.fim()
    return doc.pag


# ---------------------------------------------------------------------------
# Layout A — Alfa (tabela Exame | Resultado | Unidade | Valores de referência)
# ---------------------------------------------------------------------------
def render_A(c, ctx):
    AZUL = (0.10, 0.31, 0.58)
    X = [48, 250, 322, 392]
    DIR = W - 48
    lab = ctx["lab"]

    def cab(doc):
        c.setFillColorRGB(*AZUL)
        c.rect(0, H - 74, W, 74, fill=1, stroke=0)
        c.setFillColorRGB(1, 1, 1)
        c.setFont("Helvetica-Bold", 18)
        c.drawString(48, H - 40, lab["nome"])
        c.setFont("Helvetica", 8.5)
        c.drawString(48, H - 56, lab["end"] + "  ·  www.alfa-diagnosticos.exemplo")
        c.setFillGray(0)
        y = H - 92
        c.setStrokeGray(0.75)
        c.roundRect(48, y - 58, DIR - 48, 62, 4, stroke=1, fill=0)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(58, y - 12, f"Paciente: {ctx['nome_pac']}")
        c.setFont("Helvetica", 8.5)
        c.drawString(58, y - 27, f"Data de nascimento: {ctx['nasc_txt']}    Sexo: Masculino    "
                                 f"Idade: {ctx['idade']} anos")
        c.drawString(58, y - 40, f"Data da coleta: {ctx['data_txt']}    Atendimento: {ctx['atend']}")
        c.drawString(58, y - 53, f"Médico solicitante: {ctx['medico']}")
        y -= 76
        c.setFillGray(0.88)
        c.rect(48, y - 4, DIR - 48, 16, fill=1, stroke=0)
        c.setFillGray(0.1)
        c.setFont("Helvetica-Bold", 8.5)
        for x, t in zip(X, ["Exame", "Resultado", "Unidade", "Valores de referência"]):
            c.drawString(x + 4, y + 1, t)
        return y - 18

    def rod(doc):
        c.setStrokeGray(0.6)
        c.line(48, 62, DIR, 62)
        c.setFillGray(0.3)
        c.setFont("Helvetica", 7.5)
        c.drawString(48, 50, f"Responsável técnico: {lab['rt']}")
        c.drawString(48, 40, f"Laudo liberado eletronicamente em {ctx['liberacao_txt']}. "
                             "Resultados devem ser interpretados pelo médico solicitante.")
        c.drawRightString(DIR, 50, f"Página {doc.pag} de {ctx['total'] or '?'}")

    doc = Doc(c, cab, rod, base=78)
    zebra = False
    for g, itens in grupos_presentes(ctx["itens"]):
        doc.precisa(36)
        c.setFillColorRGB(*AZUL)
        c.setFont("Helvetica-Bold", 9.5)
        c.drawString(X[0] + 4, doc.y, TITULO_GRUPO["A"][g])
        doc.y -= 15
        for it in itens:
            nome_l = quebra(it["nome"], "Helvetica", 8.5, X[1] - X[0] - 10)
            ref_l = quebra(it["ref"]["texto"], "Helvetica", 7.5, DIR - X[3] - 8)
            n = max(len(nome_l), len(ref_l))
            h = n * 10 + 6
            doc.precisa(h)
            it["pagina"] = doc.pag
            if zebra:
                c.setFillGray(0.965)
                c.rect(48, doc.y - h + 9, DIR - 48, h, fill=1, stroke=0)
            zebra = not zebra
            c.setFillGray(0.05)
            c.setFont("Helvetica", 8.5)
            for k, t in enumerate(nome_l):
                c.drawString(X[0] + 4, doc.y - k * 10, t)
            c.setFont("Helvetica-Bold" if it["fora"] else "Helvetica", 9)
            c.drawString(X[1] + 4, doc.y, it["valor_txt"])
            c.setFont("Helvetica", 8.5)
            c.drawString(X[2] + 4, doc.y, it["unidade"])
            c.setFont("Helvetica", 7.5)
            c.setFillGray(0.25)
            for k, t in enumerate(ref_l):
                c.drawString(X[3] + 4, doc.y - k * 10, t)
            doc.y -= h
        doc.y -= 8
    doc.fim()
    return doc.pag


# ---------------------------------------------------------------------------
# Layout B — Beta (um bloco por exame, referência em várias linhas e por sexo)
# ---------------------------------------------------------------------------
def render_B(c, ctx):
    VINHO = (0.45, 0.10, 0.18)
    ESQ, DIR, XREF = 52, W - 52, 335
    lab = ctx["lab"]

    def cab(doc):
        c.setFillColorRGB(*VINHO)
        c.setFont("Times-Bold", 17)
        c.drawString(ESQ, H - 52, lab["nome"])
        c.setFont("Helvetica", 7.5)
        c.setFillGray(0.35)
        c.drawString(ESQ, H - 64, lab["end"])
        c.drawRightString(DIR, H - 52, f"Nº do atendimento: {ctx['atend']}")
        c.setStrokeColorRGB(*VINHO)
        c.setLineWidth(1.2)
        c.line(ESQ, H - 72, DIR, H - 72)
        c.setLineWidth(0.4)
        c.line(ESQ, H - 75, DIR, H - 75)
        c.setFillGray(0.05)
        c.setFont("Times-Roman", 10)
        c.drawString(ESQ, H - 92, f"Paciente: {ctx['nome_pac']}")
        c.drawString(ESQ, H - 105, f"Nascimento: {ctx['nasc_txt']} ({ctx['idade']} anos)   |   Sexo: Masculino")
        c.drawString(ESQ, H - 118, f"Data da coleta: {ctx['data_txt']} 07:{ctx['minuto']:02d}   |   "
                                   f"Data de liberação: {ctx['liberacao_txt']}")
        c.drawString(ESQ, H - 131, f"Médico(a) solicitante: {ctx['medico']}")
        c.setLineWidth(0.4)
        c.setStrokeGray(0.6)
        c.line(ESQ, H - 140, DIR, H - 140)
        return H - 162

    def rod(doc):
        c.setStrokeGray(0.6)
        c.line(ESQ, 64, DIR, 64)
        c.setFont("Times-Italic", 8)
        c.setFillGray(0.3)
        c.drawString(ESQ, 52, f"{lab['rt']} - Responsável técnico")
        c.drawString(ESQ, 42, "Este laudo foi assinado digitalmente. Valores de referência conforme literatura vigente.")
        c.drawRightString(DIR, 52, f"Página {doc.pag}/{ctx['total'] or '?'}")

    doc = Doc(c, cab, rod, base=78)
    for g, itens in grupos_presentes(ctx["itens"]):
        doc.precisa(70)
        c.setFillColorRGB(*VINHO)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(ESQ, doc.y, TITULO_GRUPO["B"][g])
        doc.y -= 18
        for it in itens:
            ref_l = quebra(it["ref"]["texto"], "Helvetica", 8, DIR - XREF)
            h = max(50, 13 + len(ref_l) * 10.5) + 12
            doc.precisa(h)
            it["pagina"] = doc.pag
            y = doc.y
            c.setFillGray(0.02)
            c.setFont("Helvetica-Bold", 10.5)
            for k, t in enumerate(quebra(it["nome"], "Helvetica-Bold", 10.5, XREF - ESQ - 12)[:1]):
                c.drawString(ESQ, y, t)
            mat, met = MATERIAL[it["analito"]]
            c.setFont("Helvetica", 7.2)
            c.setFillGray(0.4)
            c.drawString(ESQ, y - 12, f"Material: {mat}   Método: {met}")
            c.setFillColorRGB(0.97, 0.94, 0.86)
            c.roundRect(ESQ - 3, y - 41, 200, 20, 3, fill=1, stroke=0)
            c.setFillGray(0.05)
            c.setFont("Helvetica", 9)
            c.drawString(ESQ + 3, y - 34, "Resultado:")
            c.setFont("Helvetica-Bold", 13)
            c.drawString(ESQ + 56, y - 35, it["valor_txt"])
            wv = stringWidth(it["valor_txt"], "Helvetica-Bold", 13)
            c.setFont("Helvetica", 9)
            c.drawString(ESQ + 60 + wv, y - 34, it["unidade"])
            c.setFont("Helvetica-Oblique", 7.5)
            c.setFillGray(0.35)
            c.drawString(XREF, y, "Valores de referência:")
            c.setFont("Helvetica", 8)
            c.setFillGray(0.15)
            for k, t in enumerate(ref_l):
                c.drawString(XREF, y - 13 - k * 10.5, t)
            c.setDash(1, 2)
            c.setStrokeGray(0.7)
            c.line(ESQ, y - h + 12, DIR, y - h + 12)
            c.setDash()
            doc.y -= h + 4
        doc.y -= 6
    doc.fim()
    return doc.pag


# ---------------------------------------------------------------------------
# Layout C — Gama (compacto, pontilhado, asterisco fora da faixa, rodapé)
# ---------------------------------------------------------------------------
def render_C(c, ctx):
    VERDE = (0.05, 0.40, 0.35)
    ESQ, DIR, XV = 50, W - 50, 262
    F, S, L = "Helvetica", 8.5, 12
    lab = ctx["lab"]

    def cab(doc):
        c.setFillColorRGB(*VERDE)
        c.setFont("Helvetica-Bold", 14)
        c.drawString(ESQ, H - 50, lab["nome"])
        c.setFont("Helvetica", 7)
        c.setFillGray(0.35)
        c.drawRightString(DIR, H - 44, lab["end"])
        c.drawRightString(DIR, H - 53, "SAC (11) 0000-0000")
        c.setStrokeColorRGB(*VERDE)
        c.line(ESQ, H - 60, DIR, H - 60)
        c.setFillGray(0.05)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(ESQ, H - 73, f"Paciente: {ctx['nome_pac']}")
        c.setFont("Helvetica", 7.5)
        c.drawString(ESQ, H - 84, f"Nasc. {ctx['nasc_txt']}  |  Sexo M  |  Coleta {ctx['data_txt']}  |  "
                                  f"Atend. {ctx['atend']}  |  Sol.: {ctx['medico']}")
        c.line(ESQ, H - 90, DIR, H - 90)
        return H - 108

    def rod(doc):
        c.setFont("Helvetica", 6.8)
        c.setFillGray(0.3)
        c.drawString(ESQ, 70, "* Valor fora do intervalo de referência. Referências para adultos do sexo masculino.")
        c.drawString(ESQ, 61, "LDL: metas conforme a categoria de risco cardiovascular definida pelo médico.")
        c.setStrokeGray(0.6)
        c.line(ESQ, 54, DIR, 54)
        c.drawString(ESQ, 44, f"RT: {lab['rt']}  |  Liberado em {ctx['liberacao_txt']}")
        c.drawRightString(DIR, 44, f"pág. {doc.pag}/{ctx['total'] or '?'}")

    doc = Doc(c, cab, rod, base=84)
    wdot = stringWidth(".", F, S)
    for g, itens in grupos_presentes(ctx["itens"]):
        doc.precisa(3 * L)
        c.setFillColorRGB(*VERDE)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(ESQ, doc.y, TITULO_GRUPO["C"][g])
        doc.y -= L
        for it in itens:
            doc.precisa(L)
            it["pagina"] = doc.pag
            c.setFillGray(0.05)
            c.setFont(F, S)
            c.drawString(ESQ + 6, doc.y, it["nome"])
            x = ESQ + 6 + stringWidth(it["nome"] + " ", F, S)
            n = int((XV - 4 - x) / wdot)
            c.setFillGray(0.45)
            c.drawString(x, doc.y, "." * max(n, 2))
            c.setFillGray(0.05)
            v = it["valor_txt"] + ("*" if it["fora"] else "")
            c.setFont("Helvetica-Bold", S)
            c.drawString(XV, doc.y, v)
            x = XV + stringWidth(v + " ", "Helvetica-Bold", S)
            c.setFont(F, S)
            c.drawString(x, doc.y, f"{it['unidade']} {it['ref']['texto']}")
            doc.y -= L
        doc.y -= 6
    doc.fim()
    return doc.pag


RENDER = {"D": render_D, "A": render_A, "B": render_B, "C": render_C}

# ---------------------------------------------------------------------------
# Montagem de cada laudo
# ---------------------------------------------------------------------------
NOMES_PAC = {
    "D": ["ROBERTO ALMEIDA SIQUEIRA", "ROBERTO A. SIQUEIRA"],
    "A": ["Roberto Almeida Siqueira", "Roberto A. Siqueira", "ROBERTO ALMEIDA SIQUEIRA"],
    "B": ["ROBERTO A. SIQUEIRA", "Sr. Roberto Almeida Siqueira"],
    "C": ["SIQUEIRA, ROBERTO ALMEIDA", "Siqueira, Roberto A."],
}
MEDICOS = ["Dr. A. Ribeiro", "Dra. C. Mendes", "Dr. F. Lima", "Dra. R. Costa"]


def montar_contexto(visita):
    rng = random.Random(f"{SEED}-laudo-{visita['id']}")
    lab = LABS[visita["lab"]]
    layout = lab["layout"]
    d = date.fromisoformat(visita["data"])
    nasc = date.fromisoformat(PERSONA["nascimento"])
    ano = d.year
    yy, mm, dd = d.strftime("%y"), d.strftime("%m"), d.strftime("%d")
    atend = {
        "D": f"{yy}{mm}{dd}-{rng.randint(100, 999):04d}",
        "A": f"{rng.randint(10, 99):04d}-{rng.randint(100000, 999999)}",
        "B": f"B{yy}-{mm}{dd}-{rng.randint(1000, 9999)}",
        "C": f"{yy}.{mm}.{rng.randint(1, 400):04d}",
    }[layout]
    medico = MEDICOS[3] if visita.get("painel") == "repeticao" else MEDICOS[(ano - 2016) // 3 % 3]
    valores = valores_da_visita(visita)
    itens = []
    for _, lista in GRUPOS:
        for a in lista:
            if a not in valores:
                continue
            unid, fator, casas, mil = UNID[layout][a]
            num = round(valores[a] / fator, casas)
            if casas == 0:
                num = int(num)
            r = referencia(layout, a, ano)
            itens.append({
                "analito": a, "nome": NOMES[layout][a], "valor_txt": fmt(num, casas, DEC[layout], mil),
                "valor_num": num, "unidade": unid, "fator": fator, "ref": r,
                "fora": fora_da_faixa(num, r), "pagina": None,
            })
    return {
        "id": visita["id"], "visita": visita, "lab": lab, "layout": layout, "data": d,
        "data_txt": br(d), "liberacao_txt": br(d + timedelta(days=2)), "nasc_txt": br(nasc),
        "idade": idade(nasc, d), "nome_pac": rng.choice(NOMES_PAC[layout]), "atend": atend,
        "medico": medico, "minuto": rng.randint(5, 55), "itens": itens, "total": None,
    }


def gerar_pdf(ctx, destino):
    # 1ª passada só para contar páginas ("Página X de N"); 2ª passada grava.
    c = canvas.Canvas(io.BytesIO(), pagesize=A4, invariant=1)
    ctx["total"] = RENDER[ctx["layout"]](c, ctx)
    c = canvas.Canvas(str(destino), pagesize=A4, invariant=1)
    c.setTitle(f"Laudo {ctx['id']} - {ctx['lab']['nome']}")
    c.setAuthor(ctx["lab"]["nome"] + " (fictício)")
    paginas = RENDER[ctx["layout"]](c, ctx)
    c.save()
    assert paginas == ctx["total"]
    return paginas


# ---------------------------------------------------------------------------
# Fotos realistas
# ---------------------------------------------------------------------------
def ruido(rng, tam):
    return Image.frombytes("L", tam, rng.randbytes(tam[0] * tam[1]))


def coef_perspectiva(saida, entrada):
    """Coeficientes do Image.PERSPECTIVE (mapeia pontos da saída -> entrada)."""
    A, b = [], []
    for (x, y), (X, Y) in zip(saida, entrada):
        A.append([x, y, 1, 0, 0, 0, -x * X, -y * X]); b.append(X)
        A.append([0, 0, 0, x, y, 1, -x * Y, -y * Y]); b.append(Y)
    n = 8
    M = [A[i] + [b[i]] for i in range(n)]
    for col in range(n):
        piv = max(range(col, n), key=lambda r: abs(M[r][col]))
        M[col], M[piv] = M[piv], M[col]
        for r in range(n):
            if r != col:
                f = M[r][col] / M[col][col]
                M[r] = [a - f * p for a, p in zip(M[r], M[col])]
    return [M[i][n] / M[i][i] for i in range(n)]


def fotografar(pdf, pagina, destino, rng, antigo):
    import pymupdf

    with pymupdf.open(pdf) as doc:
        pix = doc[pagina].get_pixmap(dpi=150, alpha=False)
        papel = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    w, h = papel.size

    # Papel: tom, manchas de baixa frequência, dobra (nos antigos)
    cor = (236, 226, 198) if antigo else (247, 245, 238)
    papel = ImageChops.multiply(papel, Image.new("RGB", papel.size, cor))
    lo = 222 if antigo else 240
    tex = ruido(rng, (w // 110 + 2, h // 110 + 2)).resize((w, h), Image.BICUBIC)
    tex = tex.point(lambda v: int(lo + v * (255 - lo) / 255))
    papel = ImageChops.multiply(papel, Image.merge("RGB", (tex, tex, tex)))
    dobra = Image.new("L", (w, h), 255)
    dd = ImageDraw.Draw(dobra)
    for frac in ([1 / 3, 2 / 3] if antigo else [0.5]):
        y0 = int(h * frac + rng.uniform(-15, 15))
        dd.line([(0, y0), (w, y0 + rng.randint(-12, 12))], fill=185 if antigo else 225, width=3)
    papel = ImageChops.multiply(papel, dobra.filter(ImageFilter.GaussianBlur(4)).convert("RGB"))

    # Fundo (mesa) com textura
    BW, BH = int(w * 1.32), int(h * 1.20)
    cor_fundo = rng.choice([(122, 86, 58), (74, 76, 82), (150, 138, 120), (96, 70, 52)])
    fundo = Image.new("RGB", (BW, BH), cor_fundo)
    tf = ruido(rng, (BW // 6, BH // 40)).resize((BW, BH), Image.BICUBIC).point(lambda v: int(185 + v * 70 / 255))
    fundo = ImageChops.multiply(fundo, Image.merge("RGB", (tf, tf, tf)))

    # Rotação leve + perspectiva
    ang = math.radians(rng.uniform(-4.5, 4.5))
    s = min(BW / w, BH / h) * rng.uniform(0.80, 0.86)
    cx, cy = BW / 2 + rng.uniform(-25, 25), BH / 2 + rng.uniform(-25, 25)
    topo = rng.uniform(0.0, 0.045)  # celular inclinado: topo mais estreito
    dst = []
    for (sx, sy) in [(0, 0), (w, 0), (w, h), (0, h)]:
        px, py = (sx - w / 2) * s, (sy - h / 2) * s
        if sy == 0:
            px *= 1 - topo
        px += rng.uniform(-0.008, 0.008) * w * s
        py += rng.uniform(-0.008, 0.008) * h * s
        dst.append((cx + px * math.cos(ang) - py * math.sin(ang), cy + px * math.sin(ang) + py * math.cos(ang)))
    coef = coef_perspectiva(dst, [(0, 0), (w, 0), (w, h), (0, h)])
    papel_t = papel.transform((BW, BH), Image.PERSPECTIVE, coef, Image.BICUBIC)
    mascara = Image.new("L", (w, h), 255).transform((BW, BH), Image.PERSPECTIVE, coef, Image.BICUBIC)

    # Sombra do papel sobre a mesa
    sombra = ImageChops.offset(mascara, 10, 14).filter(ImageFilter.GaussianBlur(16)).point(lambda v: int(v * 0.55))
    fundo = Image.composite(fundo.point(lambda v: int(v * 0.4)), fundo, sombra)
    img = Image.composite(papel_t, fundo, mascara)

    # Luz em gradiente + sombra difusa (mão/celular)
    g = Image.linear_gradient("L").resize((512, 512)).rotate(rng.uniform(0, 360), resample=Image.BICUBIC)
    g = g.crop((76, 76, 436, 436)).resize((BW, BH), Image.BICUBIC)
    g = g.point(lambda v: int(165 + v * 90 / 255))
    img = ImageChops.multiply(img, Image.merge("RGB", (g, g, g)))
    blob = Image.new("L", (BW, BH), 255)
    bx, by = rng.choice([(0, BH), (BW, BH), (BW, 0)])
    rr = int(BW * rng.uniform(0.35, 0.5))
    ImageDraw.Draw(blob).ellipse([bx - rr, by - rr, bx + rr, by + rr], fill=175)
    blob = blob.filter(ImageFilter.GaussianBlur(BW // 10))
    img = ImageChops.multiply(img, Image.merge("RGB", (blob, blob, blob)))
    img = ImageChops.multiply(img, Image.new("RGB", img.size, (255, 249, 238)))  # luz quente

    # Desfoque, ruído do sensor, redução e JPEG
    img = img.filter(ImageFilter.GaussianBlur(rng.uniform(0.7, 1.2)))
    n = ruido(rng, img.size).point(lambda v: int(128 + (v - 128) * 0.11))
    img = ImageChops.add(img, Image.merge("RGB", (n, n, n)), 1.0, -128)
    img = img.resize((int(BW * 0.9), int(BH * 0.9)), Image.LANCZOS)
    img.save(destino, "JPEG", quality=rng.randint(64, 78), optimize=True)


# ---------------------------------------------------------------------------
# Gabarito
# ---------------------------------------------------------------------------
def linha_gabarito(it):
    r, f = it["ref"], it["fator"]
    return {
        "analito": it["analito"],
        "nome_impresso": it["nome"],
        "valor_impresso": it["valor_txt"],
        "valor_numerico": it["valor_num"],
        "unidade_impressa": it["unidade"],
        "unidade_canonica": UNID_CANON[it["analito"]],
        "valor_canonico": canon(it["valor_num"], f),
        "referencia_impressa": r["texto"],
        "ref_min": r["min"],
        "ref_max": r["max"],
        "ref_min_canonico": para_canon(r["min"], f),
        "ref_max_canonico": para_canon(r["max"], f),
        "fora_da_faixa": it["fora"],
        "pagina": it["pagina"],
    }


def main():
    if SAIDA.exists():
        shutil.rmtree(SAIDA)
    for sub in ("laudos", "gabarito", "fotos"):
        (SAIDA / sub).mkdir(parents=True)

    laudos = []
    for v in VISITAS:
        ctx = montar_contexto(v)
        nome_pdf = f"{v['id']}_{v['lab']}.pdf"
        paginas = gerar_pdf(ctx, SAIDA / "laudos" / nome_pdf)
        laudos.append((ctx, nome_pdf, paginas))
        print(f"  laudo {nome_pdf:<22} layout {ctx['layout']}  {paginas} pág.  {len(ctx['itens'])} resultados")

    # Fotos
    fotos_por_laudo = {}
    for ctx, nome_pdf, paginas in laudos:
        if ctx["layout"] != "D" and ctx["id"] not in FOTOS_EXTRA:
            continue
        lista = []
        for p in range(paginas):
            nome_foto = f"{ctx['id']}_{ctx['visita']['lab']}_p{p + 1}.jpg"
            rng = random.Random(f"{SEED}-foto-{ctx['id']}-{p}")
            fotografar(SAIDA / "laudos" / nome_pdf, p, SAIDA / "fotos" / nome_foto, rng, ctx["layout"] == "D")
            lista.append({"arquivo": f"fotos/{nome_foto}", "pagina": p + 1})
            print(f"  foto  {nome_foto}")
        fotos_por_laudo[ctx["id"]] = lista

    # Carteiras de vacinação (vacinas.py)
    import vacinas
    vacinas.gerar_todas(SAIDA, fotografar)
    import casos
    casos.gerar_caso_misto(SAIDA)

    # Gabaritos
    campos = None
    linhas_csv = []
    for ctx, nome_pdf, paginas in laudos:
        lab = ctx["lab"]
        doc = {
            "laudo_id": ctx["id"],
            "arquivo_pdf": f"laudos/{nome_pdf}",
            "fotos": fotos_por_laudo.get(ctx["id"], []),
            "documento": {
                "laboratorio": lab["nome"],
                "laboratorio_impresso": sem_acento(lab["nome"]).upper() if ctx["layout"] == "D" else lab["nome"],
                "layout": ctx["layout"],
                "data_coleta": ctx["data"].isoformat(),
                "data_coleta_impressa": ctx["data_txt"],
                "nome_paciente_impresso": ctx["nome_pac"],
                "atendimento": ctx["atend"],
                "medico_solicitante": ctx["medico"],
                "paginas": paginas,
                "painel": ctx["visita"].get("painel", "checkup"),
            },
            "resultados": [linha_gabarito(it) for it in ctx["itens"]],
        }
        with open(SAIDA / "gabarito" / f"{ctx['id']}_{ctx['visita']['lab']}.json", "w", encoding="utf-8") as f:
            json.dump(doc, f, ensure_ascii=False, indent=2)
        for res in doc["resultados"]:
            linha = {"laudo_id": ctx["id"], "arquivo_pdf": doc["arquivo_pdf"], "laboratorio": lab["nome"],
                     "layout": ctx["layout"], "data_coleta": doc["documento"]["data_coleta"], **res}
            campos = campos or list(linha)
            linhas_csv.append(linha)
    # utf-8-sig: o Excel abre com acentos corretos
    with open(SAIDA / "gabarito_consolidado.csv", "w", encoding="utf-8-sig", newline="") as f:
        wr = csv.DictWriter(f, fieldnames=campos)
        wr.writeheader()
        wr.writerows(linhas_csv)

    with open(SAIDA / "persona.json", "w", encoding="utf-8") as f:
        json.dump(PERSONA, f, ensure_ascii=False, indent=2)

    # Resumo
    fora = [r for r in linhas_csv if r["fora_da_faixa"]]
    n_fotos = sum(len(x) for x in fotos_por_laudo.values())
    print()
    print(f"Laudos: {len(laudos)}  |  páginas: {sum(p for *_, p in laudos)}  |  fotos: {n_fotos} "
          f"({len(fotos_por_laudo)} laudos)")
    print(f"Resultados: {len(linhas_csv)}  |  fora da faixa: {len(fora)}")
    por_analito = {}
    for r in fora:
        por_analito.setdefault(r["analito"], []).append(r["laudo_id"])
    for a, ids in sorted(por_analito.items()):
        print(f"  {a:<17} {len(ids):>2}x  {', '.join(ids)}")
    print(f"\nSaída em: {SAIDA}")


if __name__ == "__main__":
    main()
