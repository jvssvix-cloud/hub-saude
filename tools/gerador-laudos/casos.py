"""
Casos de teste sintéticos criados a partir de LIÇÕES de laudos reais (sem guardar os laudos reais).

caso-misto: paciente fictícia (feminino), laboratório fictício "Ômega", 4 páginas, com o que um laudo real
de outro laboratório mostrou (09/11):
  - hemácias como número inteiro ("4.520.000 /mm3"); unidade "microUI/mL"
  - exames novos (T4 livre, anti-TPO, TFG, ferritina, B12, anti-endomísio, anti-TTG, cortisol)
  - duas datas de coleta no mesmo laudo (cada exame com a sua)
  - resultado com sinal ("SUPERIOR A 90", "INFERIOR A 0,2") e só em texto ("NÃO REAGENTE")
  - referências por sexo (usar a feminina)
"""
import json
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

W, H = A4
PACIENTE = {"nome": "ANA PAULA TEIXEIRA ROCHA", "sexo": "F", "nascimento": "1995-07-21"}
D1, D2 = ("03/02/2026", "2026-02-03"), ("10/02/2026", "2026-02-10")

# (página, nome impresso, resultado impresso, unidade, linhas de referência, data, gabarito)
EXAMES = [
    (1, "Hemacias", "4.520.000", "/mm3", ["3.900.000 A 5.000.000/mm3"], D1,
     dict(analito="hemacias", valor_canonico=4.52, ref=(3.9, 5.0))),
    (1, "Hemoglobina", "13,1", "g/dl", ["12,0 A 16,0 g/dl"], D1, dict(analito="hemoglobina", valor_canonico=13.1, ref=(12, 16))),
    (1, "Leucocitos - Global", "6.240", "/mm3", ["4.000 A 11.000/mm3"], D1, dict(analito="leucocitos", valor_canonico=6240, ref=(4000, 11000))),
    (1, "Plaquetas", "289.000", "/mm3", ["150.000 A 450.000/mm3"], D1, dict(analito="plaquetas", valor_canonico=289000, ref=(150000, 450000))),
    (2, "TSH ULTRA SENSÍVEL", "1,87", "microUI/mL", ["ADULTOS : DE 0,35 A 4,94 microUI/mL", "GESTANTES 1º TRIMESTRE: DE 0,13 A 4,16 microUI/mL"], D1,
     dict(analito="tsh", valor_canonico=1.87, ref=(0.35, 4.94))),
    (2, "T4 LIVRE", "1,05", "ng/dL", ["ADULTOS : DE 0,75 A 1,22 ng/dL"], D2, dict(analito="t4_livre", valor_canonico=1.05, ref=(0.75, 1.22))),
    (2, "TIREOPEROXIDASE, ANTICORPOS ANTI - TPO", "0,40", "UI/mL", ["INFERIOR OU IGUAL A 5,61 UI/mL"], D2,
     dict(analito="anti_tpo", valor_canonico=0.4, ref=(None, 5.61))),
    (3, "CREATININA SERICA", "0,74", "mg/dL", ["HOMEM : DE 0,60 A 1,30 mg/dL", "MULHER : DE 0,50 A 1,10 mg/dL"], D2,
     dict(analito="creatinina", valor_canonico=0.74, ref=(0.5, 1.1))),
    (3, "RITMO DE FILTRAÇÃO GLOMERULAR", "SUPERIOR A 90", "mL/min/1,73 m2", ["ADULTOS: SUPERIOR A 60 mL/min/1,73 m2"], D2,
     dict(analito="tfg", valor_canonico=90, ref=(60, None), qualificador=">", valor_impresso="SUPERIOR A 90")),
    (3, "FERRITINA SÉRICA", "15,2", "ng/mL", ["ADULTO FEMININO: DE 20,0 A 300,0 ng/mL", "ADULTO MASCULINO: DE 30,0 A 476,0 ng/mL"], D2,
     dict(analito="ferritina", valor_canonico=15.2, ref=(20, 300), fora=True)),
    (3, "VITAMINA B12", "410", "pg/mL", ["DE 181 a 906 pg/mL"], D2, dict(analito="vitamina_b12", valor_canonico=410, ref=(181, 906))),
    (4, "ENDOMISIO IGA ANTICORPOS ANTI", "NÃO REAGENTE", "", ["NÃO REAGENTE"], D1,
     dict(analito="anti_endomisio", valor_canonico=None, ref=(None, None), resultado_texto="NÃO REAGENTE", valor_impresso="NÃO REAGENTE")),
    (4, "TTG, ANTICORPOS ANTI-TRANSGLUTAMINASE TECIDUAL-IgA", "INFERIOR A 0,2", "U/mL",
     ["NÃO REAGENTE : INFERIOR A 7,0 U/mL", "INDETERMINADO: DE 7,0 A 10,0 U/mL", "REAGENTE : SUPERIOR A 10,0 U/mL"], D1,
     dict(analito="anti_transglutaminase_iga", valor_canonico=0.2, ref=(None, 7), qualificador="<", valor_impresso="INFERIOR A 0,2")),
    (4, "CORTISOL BASAL", "12,4", "mcg/dL", ["MATUTINO (ANTES DAS 10 HORAS) : DE 3,7 A 19,4 mcg/dL", "VESPERTINO (ENTRE 15 E 17 HORAS): DE 3,3 A 11,9 mcg/dL"], D1,
     dict(analito="cortisol", valor_canonico=12.4, ref=(3.7, 19.4))),
]


def gerar_caso_misto(saida: Path):
    pdf = saida / "laudos" / "caso-misto.pdf"
    c = canvas.Canvas(str(pdf), pagesize=A4, invariant=1)
    c.setTitle("Caso de teste (fictício)")
    paginas = max(e[0] for e in EXAMES)
    gab = []
    for pag in range(1, paginas + 1):
        c.setFont("Helvetica-Bold", 13)
        c.drawString(48, H - 50, "LABORATÓRIO ÔMEGA DE ANÁLISES (FICTÍCIO)")
        c.setFont("Helvetica", 7.5)
        c.drawString(48, H - 62, f"CLIENTE: {PACIENTE['nome']}   DN: 21/07/1995   CONVÊNIO: PARTICULAR   Documento de teste, sem validade")
        c.line(48, H - 68, W - 48, H - 68)
        y = H - 92
        for p, nome, res, un, refs, (data_br, _), _g in [e for e in EXAMES if e[0] == pag]:
            c.setFont("Helvetica-Bold", 10)
            c.drawString(48, y, nome)
            c.setFont("Helvetica", 8)
            c.drawString(48, y - 13, "Material : Soro          Metodo : AUTOMATIZADO")
            c.setFont("Helvetica-Bold", 10)
            c.drawString(48, y - 30, f"RESULTADO:   {res}   {un}")
            c.setFont("Helvetica", 8)
            c.drawString(48, y - 45, f"VR : {refs[0]}")
            for k, linha in enumerate(refs[1:]):
                c.drawString(68, y - 56 - 11 * k, linha)
            yb = y - 60 - 11 * max(0, len(refs) - 1)
            c.drawString(48, yb, f"Data/Hora Coleta: {data_br} - 07:{40 + pag:02d}:12")
            c.line(48, yb - 8, W - 48, yb - 8)
            y = yb - 28
        c.setFont("Helvetica", 7)
        c.drawRightString(W - 48, 36, f"Página {pag} de {paginas}")
        c.showPage()
    c.save()
    for p, nome, res, un, refs, (_, data_iso), g in EXAMES:
        mn, mx = g["ref"]
        gab.append({
            "analito": g["analito"], "nome_impresso": nome, "valor_impresso": g.get("valor_impresso", res),
            "valor_canonico": g["valor_canonico"], "unidade_impressa": un,
            "ref_min_canonico": mn, "ref_max_canonico": mx, "fora_da_faixa": g.get("fora", False), "pagina": p,
            "qualificador": g.get("qualificador"), "resultado_texto": g.get("resultado_texto"), "data_coleta": data_iso,
        })
    doc = {
        "laudo_id": "caso-misto", "arquivo_pdf": "laudos/caso-misto.pdf", "fotos": [],
        "origem": "Caso sintético criado a partir de lições de um laudo real (que não foi guardado).",
        "documento": {"laboratorio": "LABORATÓRIO ÔMEGA DE ANÁLISES (FICTÍCIO)", "layout": "X", "data_coleta": D2[1],
                      "nome_paciente_impresso": PACIENTE["nome"], "paginas": paginas,
                      "paciente": {"sexo": PACIENTE["sexo"], "nascimento": PACIENTE["nascimento"]}},
        "resultados": gab,
    }
    with open(saida / "gabarito" / "caso-misto.json", "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)
    print(f"  caso   caso-misto.pdf          {paginas} pág.  {len(gab)} resultados (lições de laudo real)")
