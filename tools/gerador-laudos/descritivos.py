"""
Laudos DESCRITIVOS sintéticos da persona (fictícios) + gabarito: o resultado é um texto com conclusão.

Quatro documentos, coerentes com a história do Roberto (achados leves, nada que contradiga os exames de sangue):
  - ecg-2024:            eletrocardiograma, 1 página, conclusão no fim
  - eco-2025:            ecocardiograma, 2 páginas: medidas na 1ª, CONCLUSÃO NA 2ª (testa a página certa)
  - endoscopia-2023:     endoscopia digestiva alta, com "Impressão diagnóstica" (+ foto)
  - us-rins-2021:        ultrassom de rins e vias urinárias e próstata
Clínicas com nomes fictícios. O gabarito guarda trechos que a conclusão extraída precisa conter.
"""
import json
import random
import zlib
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from persona import PERSONA, SEED

W, H = A4
NOME = "ROBERTO ALMEIDA SIQUEIRA"
NASC = "14/05/1968"

DOCS = [
    {
        "id": "ecg-2024", "area": "coracao", "clinica": "Clínica Cardio Exemplo", "data": "2024-03-12",
        "titulo": "ELETROCARDIOGRAMA DE REPOUSO (12 DERIVAÇÕES)",
        "paginas": [[
            ("Indicação", "Avaliação de rotina (check-up)."),
            ("Descrição", "Ritmo sinusal regular. Frequência cardíaca de 68 bpm. Eixo elétrico do QRS em +30 graus. "
                          "Intervalo PR de 160 ms. Duração do QRS de 90 ms. QTc de 410 ms. "
                          "Ausência de alterações de repolarização ventricular."),
            ("Conclusão", "Eletrocardiograma dentro dos limites da normalidade."),
        ]],
        "pagina_conclusao": 1,
        "trechos": ["dentro dos limites da normalidade"],
    },
    {
        "id": "eco-2025", "area": "coracao", "clinica": "Instituto do Coração Modelo", "data": "2025-06-03",
        "titulo": "ECOCARDIOGRAMA TRANSTORÁCICO",
        "paginas": [
            [
                ("Medidas", "Aorta: 32 mm. Átrio esquerdo: 38 mm. Diâmetro diastólico do VE: 50 mm. "
                            "Diâmetro sistólico do VE: 32 mm. Septo: 10 mm. Parede posterior: 10 mm. "
                            "Fração de ejeção (Teichholz): 66%."),
                ("Análise", "Ventrículo esquerdo com dimensões normais e espessura de paredes no limite superior. "
                            "Contratilidade global e segmentar preservada. Valvas com morfologia normal. "
                            "Fluxo mitral com relação E/A invertida."),
            ],
            [
                ("Conclusão", "Função sistólica do ventrículo esquerdo preservada.\n"
                              "Disfunção diastólica do ventrículo esquerdo grau I (alteração do relaxamento).\n"
                              "Valvas sem alterações significativas."),
            ],
        ],
        "pagina_conclusao": 2,
        "trechos": ["função sistólica", "preservada", "disfunção diastólica", "grau i"],
    },
    {
        "id": "endoscopia-2023", "area": "gastro", "clinica": "Centro de Endoscopia Fictício", "data": "2023-10-19",
        "titulo": "ENDOSCOPIA DIGESTIVA ALTA",
        "paginas": [[
            ("Preparo", "Jejum de 8 horas. Sedação consciente com midazolam."),
            ("Achados", "Esôfago: calibre e distensibilidade normais, mucosa íntegra, transição esofagogástrica a 40 cm "
                        "da arcada dentária. Estômago: mucosa do antro com enantema leve e difuso. Piloro pérvio. "
                        "Duodeno: bulbo e segunda porção sem alterações. Realizado teste da urease."),
            ("Impressão diagnóstica", "Gastrite enantematosa leve de antro.\nTeste da urease negativo."),
        ]],
        "pagina_conclusao": 1,
        "trechos": ["gastrite enantematosa leve", "urease negativo"],
        "foto": True,
    },
    {
        "id": "us-rins-2021", "area": "rins", "clinica": "Imagem Modelo Diagnósticos", "data": "2021-09-08",
        "titulo": "ULTRASSONOGRAFIA DE RINS E VIAS URINÁRIAS E PRÓSTATA (VIA ABDOMINAL)",
        "paginas": [[
            ("Relatório", "Rim direito tópico, com 10,8 cm, contornos regulares e espessura do parênquima preservada. "
                          "Rim esquerdo tópico, com 11,2 cm, sem alterações. Ausência de cálculos ou dilatação "
                          "pielocalicial. Bexiga com boa repleção e paredes finas. Próstata com contornos regulares "
                          "e volume estimado em 32 cm³."),
            ("Conclusão", "Rins de dimensões e ecotextura normais, sem cálculos.\n"
                          "Próstata com volume discretamente aumentado (32 cm³)."),
        ]],
        "pagina_conclusao": 1,
        "trechos": ["sem cálculos", "próstata", "32 cm"],
    },
]


def br(iso):
    a, m, d = iso.split("-")
    return f"{d}/{m}/{a}"


def quebra(texto, largura, fonte="Helvetica", tam=10):
    from reportlab.pdfbase.pdfmetrics import stringWidth
    linhas = []
    for par in texto.split("\n"):
        atual = ""
        for p in par.split(" "):
            t = f"{atual} {p}".strip()
            if stringWidth(t, fonte, tam) > largura and atual:
                linhas.append(atual)
                atual = p
            else:
                atual = t
        linhas.append(atual)
    return linhas


def gerar_pdf(doc, destino):
    c = canvas.Canvas(str(destino), pagesize=A4, invariant=1)
    c.setTitle(f"{doc['titulo']} (fictício)")
    total = len(doc["paginas"])
    for i, secoes in enumerate(doc["paginas"]):
        # cabeçalho da clínica
        c.setFillColorRGB(0.18, 0.28, 0.42)
        c.rect(36, H - 70, W - 72, 34, fill=1, stroke=0)
        c.setFillColorRGB(1, 1, 1)
        c.setFont("Helvetica-Bold", 13)
        c.drawString(46, H - 52, doc["clinica"].upper())
        c.setFont("Helvetica", 7)
        c.drawRightString(W - 46, H - 52, "Documento fictício para testes")
        c.setFillGray(0.1)
        c.setFont("Helvetica", 8.5)
        c.drawString(40, H - 88, f"Paciente: {NOME}")
        c.drawString(330, H - 88, f"Nascimento: {NASC}")
        c.drawString(40, H - 101, f"Data do exame: {br(doc['data'])}")
        c.drawString(330, H - 101, f"Atendimento: {zlib.crc32(doc['id'].encode()) % 900000 + 100000}")
        c.setStrokeGray(0.6)
        c.line(40, H - 108, W - 40, H - 108)
        y = H - 132
        if i == 0:
            c.setFont("Helvetica-Bold", 12)
            c.drawCentredString(W / 2, y, doc["titulo"])
            y -= 26
        for rotulo, texto in secoes:
            c.setFont("Helvetica-Bold", 10)
            c.drawString(46, y, f"{rotulo.upper()}:")
            y -= 15
            c.setFont("Helvetica", 10)
            for linha in quebra(texto, W - 100):
                c.drawString(52, y, linha)
                y -= 13.5
            y -= 10
        if i == total - 1:
            c.setFont("Helvetica-Oblique", 9)
            c.drawString(W - 230, 120, "Dr(a). Médico Fictício")
            c.setFont("Helvetica", 7.5)
            c.drawString(W - 230, 108, "CRM-SP 000000 (fictício)")
            c.drawString(40, 70, f"Liberado em {br(doc['data'])}. Laudo assinado eletronicamente.")
        c.setFont("Helvetica", 7.5)
        c.drawRightString(W - 40, 40, f"Página {i + 1} de {total}")
        c.showPage()
    c.save()


def gerar_todas(saida: Path, fotografar):
    """Gera os laudos descritivos, fotos e gabaritos. `fotografar` vem do gerar.py."""
    (saida / "descritivos").mkdir(parents=True, exist_ok=True)
    (saida / "gabarito_descritivos").mkdir(parents=True, exist_ok=True)
    for doc in DOCS:
        pdf = saida / "descritivos" / f"{doc['id']}.pdf"
        gerar_pdf(doc, pdf)
        fotos = []
        if doc.get("foto"):
            foto = saida / "fotos" / f"{doc['id']}_p1.jpg"
            fotografar(pdf, 0, foto, random.Random(f"{SEED}-foto-{doc['id']}"), False)
            fotos.append({"arquivo": f"fotos/{doc['id']}_p1.jpg", "pagina": 1})
        g = {
            "documento_id": doc["id"], "tipo": "laudo_descritivo", "arquivo_pdf": f"descritivos/{doc['id']}.pdf",
            "fotos": fotos,
            "documento": {"emissor": doc["clinica"], "nome_paciente_impresso": NOME, "paginas": len(doc["paginas"]),
                          "paciente": {"sexo": PERSONA["sexo"], "nascimento": PERSONA["nascimento"]}},
            "descritivo": {"exame_nome": doc["titulo"], "area": doc["area"], "data_exame": doc["data"],
                           "pagina_conclusao": doc["pagina_conclusao"], "conclusao_contem": doc["trechos"],
                           # o texto da conclusão como está impresso (o seed do Roberto usa este)
                           "conclusao": next(t for pag in doc["paginas"] for r, t in pag
                                             if r in ("Conclusão", "Impressão diagnóstica"))},
        }
        with open(saida / "gabarito_descritivos" / f"{doc['id']}.json", "w", encoding="utf-8") as f:
            json.dump(g, f, ensure_ascii=False, indent=2)
        print(f"  descritivo {doc['id']:<18} {doc['area']:<8} conclusão na p. {doc['pagina_conclusao']}"
              f"{' (+ foto)' if fotos else ''}")
