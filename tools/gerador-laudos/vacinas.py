"""
Carteiras de vacinação sintéticas da persona (fictícias) + gabarito.

Dois documentos, com o mesmo histórico de persona.VACINAS:
  - caderneta:   cartão de papel com grade impressa, letra de mão, carimbos e assinaturas
  - comprovante: comprovante digital impresso de um sistema municipal FICTÍCIO (não imita SUS/apps reais)
"""
import json
import math
import random
from datetime import date
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

from persona import PERSONA, POSTOS, SEED, VACINAS

W, H = A4

# Letra de mão: Ink Free (Windows). Sem ela, cai numa fonte itálica comum.
MAO = "Helvetica-Oblique"
for caminho in [Path("C:/Windows/Fonts/Inkfree.ttf"), Path.home() / "Library/Fonts/Inkfree.ttf"]:
    if caminho.exists():
        pdfmetrics.registerFont(TTFont("Mao", str(caminho)))
        MAO = "Mao"
        break

# ---------------------------------------------------------------------------
# Como cada documento imprime nomes e doses
# ---------------------------------------------------------------------------
CADERNETA_SECOES = [  # (vacina, título impresso, rótulos impressos de cada quadro)
    ("dt", "DUPLA ADULTO (dT) - DIFTERIA E TÉTANO", ["Dose / Reforço"] * 4),
    ("hepatite_b", "HEPATITE B", ["1ª dose", "2ª dose", "3ª dose"]),
    ("febre_amarela", "FEBRE AMARELA", ["Dose única", "Reforço"]),
    ("triplice_viral", "TRÍPLICE VIRAL (SARAMPO, CAXUMBA, RUBÉOLA)", ["1ª dose", "2ª dose"]),
    ("influenza", "GRIPE (INFLUENZA)", ["Dose anual"] * 4),
]
# Na caderneta, o que vai escrito à mão no campo de dose (quando o rótulo não diz)
DOSE_MAO = {"reforco": "Ref.", "1": "1ª", "2": "2ª", "3": "3ª", "unica": "DU", "anual": "dose"}

COMPROVANTE_NOMES = {
    "febre_amarela": "Febre Amarela (atenuada)",
    "influenza": "Influenza Trivalente",
    "covid19": "COVID-19",
}
COMPROVANTE_DOSE = {"1": "1ª Dose", "2": "2ª Dose", "reforco": "Reforço", "unica": "Dose Única", "anual": "Dose"}
COVID_NOMES = {"2021-07-15": "COVID-19 (vetor viral)", "2021-10-07": "COVID-19 (vetor viral)",
               "2022-01-20": "COVID-19 (RNAm)", "2023-04-10": "COVID-19 Bivalente (RNAm)"}


def br(iso, ano2=False):
    d = date.fromisoformat(iso)
    return d.strftime("%d/%m/%y" if ano2 else "%d/%m/%Y")


# ---------------------------------------------------------------------------
# Caderneta de papel
# ---------------------------------------------------------------------------
def _mao(c, x, y, texto, rng, tam=11, cor=(0.08, 0.12, 0.45)):
    """Texto 'à mão': leve rotação, tamanho variável, tinta azul."""
    c.saveState()
    c.translate(x + rng.uniform(-1.5, 1.5), y + rng.uniform(-1.2, 1.2))
    c.rotate(rng.uniform(-4, 4))
    c.setFillColorRGB(*cor)
    c.setFont(MAO, tam * rng.uniform(0.93, 1.08))
    c.drawString(0, 0, texto)
    c.restoreState()


def _carimbo(c, x, y, posto, rng):
    c.saveState()
    c.translate(x, y)
    c.rotate(rng.uniform(-14, 14))
    c.setStrokeColorRGB(0.20, 0.25, 0.70)
    c.setFillColorRGB(0.20, 0.25, 0.70)
    c.setStrokeAlpha(0.55)
    c.setFillAlpha(0.55)
    c.setLineWidth(1.2)
    c.roundRect(-46, -13, 92, 26, 4, stroke=1, fill=0)
    c.setFont("Helvetica-Bold", 6.3)
    c.drawCentredString(0, 2.5, posto.upper())
    c.setFont("Helvetica", 5.6)
    c.drawCentredString(0, -7, "SÃO PAULO - SP")
    c.restoreState()


def _assinatura(c, x, y, rng):
    c.saveState()
    c.setStrokeColorRGB(0.08, 0.12, 0.45)
    c.setLineWidth(0.8)
    p = c.beginPath()
    p.moveTo(x, y)
    for k in range(1, 7):
        p.curveTo(x + k * 6 - 4, y + rng.uniform(4, 9), x + k * 6 - 2, y - rng.uniform(2, 6), x + k * 6, y + rng.uniform(-1, 2))
    c.drawPath(p)
    c.restoreState()


def gerar_caderneta(destino):
    rng = random.Random(f"{SEED}-caderneta")
    c = canvas.Canvas(str(destino), pagesize=A4, invariant=1)
    c.setTitle("Cartão de vacinação (fictício)")
    doses = [v for v in VACINAS if "caderneta" in v["docs"]]
    gab = []
    # Cabeçalho impresso
    c.setFillColorRGB(0.15, 0.35, 0.30)
    c.rect(36, H - 74, W - 72, 40, fill=1, stroke=0)
    c.setFillColorRGB(1, 1, 1)
    c.setFont("Helvetica-Bold", 15)
    c.drawCentredString(W / 2, H - 52, "CARTÃO DE VACINAÇÃO DO ADULTO")
    c.setFont("Helvetica", 7.5)
    c.drawCentredString(W / 2, H - 66, "Modelo fictício para testes - guarde este cartão e leve sempre que for se vacinar")
    c.setFillGray(0.1)
    c.setFont("Helvetica", 8)
    c.drawString(40, H - 96, "Nome:")
    c.drawString(40, H - 114, "Data de nascimento:")
    c.drawString(330, H - 114, "Sexo:")
    c.setStrokeGray(0.6)
    c.setLineWidth(0.5)
    c.line(68, H - 98, W - 40, H - 98)
    c.line(118, H - 116, 320, H - 116)
    c.line(356, H - 116, W - 40, H - 116)
    nome_impresso = "Roberto A. Siqueira"
    _mao(c, 74, H - 95, nome_impresso, rng, 14)
    _mao(c, 124, H - 113, "14/05/68", rng, 12)
    _mao(c, 362, H - 113, "M", rng, 12)

    y = H - 140
    lx = (W - 80) / 4
    hq = 74
    postos_rng = random.Random(f"{SEED}-postos")
    for vacina, titulo, rotulos in CADERNETA_SECOES:
        c.setFillGray(0.86)
        c.rect(40, y - 14, W - 80, 15, fill=1, stroke=0)
        c.setFillGray(0.1)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(46, y - 10, titulo)
        y -= 14
        da_secao = [v for v in doses if v["vacina"] == vacina]
        for k, rot in enumerate(rotulos):
            x = 40 + k * lx
            c.setStrokeGray(0.55)
            c.rect(x, y - hq, lx, hq, stroke=1, fill=0)
            c.setFillGray(0.35)
            c.setFont("Helvetica", 6.5)
            c.drawString(x + 4, y - 10, rot)
            c.drawString(x + 4, y - 30, "Data:")
            c.drawString(x + 4, y - 46, "Lote:")
            c.drawString(x + 4, y - 64, "Ass.:")
            # quadro preenchido? (doses entram na ordem; hep B/SCR no quadro do número da dose)
            v = None
            if vacina in ("hepatite_b", "triplice_viral"):
                v = next((d for d in da_secao if d["dose"] == str(k + 1)), None)
            elif vacina == "febre_amarela":
                v = da_secao[0] if k == 0 and da_secao else None
            elif k < len(da_secao):
                v = da_secao[k]
            if not v:
                continue
            posto = postos_rng.choice(POSTOS)
            dose_impressa = rot
            if rot in ("Dose / Reforço",):  # dose escrita à mão
                dose_impressa = DOSE_MAO[v["dose"]]
                _mao(c, x + 64, y - 11, dose_impressa, rng, 11)
            elif rot == "Dose anual":
                dose_impressa = "Dose anual"
            data_impressa = br(v["data"], ano2=True)
            _mao(c, x + 24, y - 31, data_impressa, rng, 12)
            _mao(c, x + 24, y - 47, v["lote"], rng, 10)
            _assinatura(c, x + 24, y - 63, rng)
            _carimbo(c, x + lx - 34, y - 62 + rng.uniform(-3, 3), posto, rng)
            gab.append({
                "vacina": v["vacina"], "nome_impresso": titulo, "dose": v["dose"], "dose_impressa": dose_impressa,
                "data": v["data"], "data_impressa": data_impressa, "lote": v["lote"], "local": posto, "pagina": 1,
            })
        y -= hq + 12
    c.setFont("Helvetica", 6.5)
    c.setFillGray(0.4)
    c.drawCentredString(W / 2, 40, "Documento fictício gerado para testes do Hub de Saúde. Não tem validade.")
    c.showPage()
    c.save()
    return {"emissor": "Cartão de vacinação do adulto (papel)", "nome_paciente_impresso": nome_impresso,
            "paginas": 1}, sorted(gab, key=lambda g: g["data"])


# ---------------------------------------------------------------------------
# Comprovante digital
# ---------------------------------------------------------------------------
def gerar_comprovante(destino):
    rng = random.Random(f"{SEED}-comprovante")
    c = canvas.Canvas(str(destino), pagesize=A4, invariant=1)
    c.setTitle("Comprovante de vacinação (fictício)")
    doses = sorted([v for v in VACINAS if "comprovante" in v["docs"]], key=lambda v: v["data"], reverse=True)
    emissao = "2025-06-02"
    c.setFillColorRGB(0.12, 0.30, 0.55)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(48, H - 58, "SISTEMA MUNICIPAL DE IMUNIZAÇÃO (FICTÍCIO)")
    c.setFont("Helvetica", 8)
    c.setFillGray(0.35)
    c.drawString(48, H - 71, "Secretaria Municipal de Saúde de Cidade Exemplo - documento de teste, sem validade")
    c.setStrokeColorRGB(0.12, 0.30, 0.55)
    c.line(48, H - 80, W - 48, H - 80)
    c.setFillGray(0.05)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(48, H - 100, "COMPROVANTE DE VACINAÇÃO")
    c.setFont("Helvetica", 9)
    nome = PERSONA["nome"].upper()
    c.drawString(48, H - 118, f"Nome: {nome}")
    c.drawString(48, H - 131, f"Data de nascimento: {br(PERSONA['nascimento'])}     Sexo: Masculino")
    c.drawString(48, H - 144, f"Emitido em: {br(emissao)}")
    cols = [48, 210, 285, 360, 425]
    y = H - 172
    c.setFillGray(0.9)
    c.rect(44, y - 4, W - 88, 15, fill=1, stroke=0)
    c.setFillGray(0.1)
    c.setFont("Helvetica-Bold", 8)
    for x, t in zip(cols, ["Vacina", "Dose", "Data de aplicação", "Lote", "Estabelecimento"]):
        c.drawString(x, y, t)
    y -= 17
    gab = []
    c.setFont("Helvetica", 8)
    for v in doses:
        nome_v = COVID_NOMES[v["data"]] if v["vacina"] == "covid19" else COMPROVANTE_NOMES[v["vacina"]]
        dose = COMPROVANTE_DOSE[v["dose"]]
        if v["vacina"] == "covid19" and v["data"] == "2023-04-10":
            dose = "Reforço Bivalente"
        posto = rng.choice(POSTOS)
        data_impressa = br(v["data"])
        for x, t in zip(cols, [nome_v, dose, data_impressa, v["lote"], posto]):
            c.drawString(x, y, t)
        c.setStrokeGray(0.85)
        c.line(44, y - 5, W - 44, y - 5)
        gab.append({"vacina": v["vacina"], "nome_impresso": nome_v, "dose": v["dose"], "dose_impressa": dose,
                    "data": v["data"], "data_impressa": data_impressa, "lote": v["lote"], "local": posto, "pagina": 1})
        y -= 16
    c.setFont("Helvetica-Oblique", 7)
    c.setFillGray(0.4)
    c.drawString(48, y - 14, "Registros de doses aplicadas nos estabelecimentos da rede municipal e conveniados.")
    c.showPage()
    c.save()
    return {"emissor": "Sistema Municipal de Imunização (fictício)", "nome_paciente_impresso": nome,
            "paginas": 1}, sorted(gab, key=lambda g: g["data"])


def gerar_todas(saida: Path, fotografar):
    """Gera os 2 documentos, fotos e gabaritos. `fotografar` vem do gerar.py."""
    (saida / "vacinas").mkdir(parents=True, exist_ok=True)
    (saida / "gabarito_vacinas").mkdir(parents=True, exist_ok=True)
    resumo = []
    for doc_id, func, antigo in [("vacinas-caderneta", gerar_caderneta, True), ("vacinas-comprovante", gerar_comprovante, False)]:
        pdf = saida / "vacinas" / f"{doc_id}.pdf"
        documento, doses = func(pdf)
        foto = saida / "fotos" / f"{doc_id}_p1.jpg"
        fotografar(pdf, 0, foto, random.Random(f"{SEED}-foto-{doc_id}"), antigo)
        g = {
            "documento_id": doc_id, "tipo": "carteira_vacinacao", "arquivo_pdf": f"vacinas/{doc_id}.pdf",
            "fotos": [{"arquivo": f"fotos/{doc_id}_p1.jpg", "pagina": 1}],
            "documento": {**documento, "paciente": {"sexo": PERSONA["sexo"], "nascimento": PERSONA["nascimento"]}},
            "doses": doses,
        }
        with open(saida / "gabarito_vacinas" / f"{doc_id}.json", "w", encoding="utf-8") as f:
            json.dump(g, f, ensure_ascii=False, indent=2)
        resumo.append((doc_id, len(doses)))
        print(f"  vacina {doc_id:<22} {len(doses)} doses (+ foto)")
    return resumo
