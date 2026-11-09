"""
Persona sintética e história clínica (fonte única da verdade).

Tudo aqui é FICTÍCIO: pessoa, laboratórios, endereços, responsáveis técnicos.
O gerador lê daqui, imprime os laudos e grava o gabarito com estes mesmos valores.
"""
import random

SEED = 42

PERSONA = {
    "id": "persona-roberto",
    "nome": "Roberto Almeida Siqueira",
    "nascimento": "1968-05-14",
    "sexo": "M",
    "altura_cm": 174,
    "cidade": "São Paulo - SP",
    "historia": (
        "Homem de 58 anos, sem diagnóstico prévio. Fez check-up quase todo ano entre 2016 e 2026, "
        "em 4 laboratórios diferentes (trocou de plano duas vezes). Nenhum médico viu a série inteira. "
        "Juntando tudo: LDL subindo devagar há 10 anos (112 -> 163 mg/dL), HDL caindo, triglicerídeos subindo, "
        "glicose de jejum saindo da faixa desde 2024 e HbA1c chegando a 6,2% (faixa de pré-diabetes), "
        "ácido úrico levemente alto nos últimos 2 anos e vitamina D baixa em 2022. "
        "Em 2025 repetiu o perfil lipídico 2 meses depois do check-up porque o novo médico não tinha o anterior "
        "(exemplo de exame repetido). Em out-nov/2026 o relógio registra episódios de ritmo irregular "
        "(dados do relógio: fora do MVP, só no pitch)."
    ),
    "remedios": [],
    "alergias": [],
}

# Laboratórios fictícios (nenhum imita marca real)
LABS = {
    "delta": {"nome": "LABORATÓRIO DELTA DE ANÁLISES CLÍNICAS", "end": "Rua das Acácias, 120 - Centro - São Paulo/SP",
              "rt": "Dr. Paulo Nogueira - CRBM-SP 00000 (fictício)", "layout": "D"},
    "alfa": {"nome": "Laboratório Alfa Diagnósticos", "end": "Av. Exemplo, 1500 - Pinheiros - São Paulo/SP",
             "rt": "Dra. Helena Prado - CRF-SP 00000 (fictício)", "layout": "A"},
    "beta": {"nome": "Diagnóstica Beta Medicina Laboratorial", "end": "Rua Fictícia, 45 - Vila Mariana - São Paulo/SP",
             "rt": "Dr. Marcos Tavares - CRM-SP 000000 (fictício)", "layout": "B"},
    "gama": {"nome": "Gama Análises Clínicas", "end": "Al. Modelo, 300 - Moema - São Paulo/SP",
             "rt": "Dra. Lúcia Ferraz - CRBM-SP 00000 (fictício)", "layout": "C"},
}

# Visitas (cada uma vira 1 laudo)
VISITAS = [
    {"id": "2016-03", "data": "2016-03-09", "lab": "delta"},
    {"id": "2017-04", "data": "2017-04-18", "lab": "delta"},
    {"id": "2018-03", "data": "2018-03-22", "lab": "alfa"},
    {"id": "2019-03", "data": "2019-03-14", "lab": "alfa"},
    {"id": "2020-09", "data": "2020-09-03", "lab": "alfa"},   # atrasou por causa da pandemia
    {"id": "2021-08", "data": "2021-08-26", "lab": "beta"},
    {"id": "2022-08", "data": "2022-08-17", "lab": "beta"},
    {"id": "2023-09", "data": "2023-09-05", "lab": "beta"},
    {"id": "2024-03", "data": "2024-03-20", "lab": "gama"},
    {"id": "2025-03", "data": "2025-03-11", "lab": "gama"},
    {"id": "2025-05", "data": "2025-05-27", "lab": "alfa", "painel": "repeticao"},  # exame repetido
    {"id": "2026-03", "data": "2026-03-12", "lab": "gama"},
]

ANO0 = 2016

def _serie(inicio, fim, ano, ruido=0.0, rng=None, casas=0):
    """Interpola linearmente de 2016 (inicio) a 2026 (fim) + ruído pequeno."""
    t = (ano - ANO0) / 10.0
    v = inicio + (fim - inicio) * t
    if rng and ruido:
        v += rng.uniform(-ruido, ruido)
    return round(v, casas) if casas else int(round(v))


def valores_da_visita(visita):
    """Valor VERDADEIRO de cada exame, em unidade canônica."""
    rng = random.Random(f"{SEED}-{visita['id']}")
    ano = int(visita["data"][:4]) + (int(visita["data"][5:7]) - 1) / 12
    v = {}
    v["glicose"] = _serie(88, 112, ano, 1.5, rng)                     # mg/dL
    v["colesterol_total"] = _serie(190, 238, ano, 3, rng)             # mg/dL
    v["ldl"] = _serie(112, 163, ano, 1.5, rng)                        # mg/dL
    v["hdl"] = _serie(48, 41, ano, 1, rng)                            # mg/dL
    v["triglicerides"] = _serie(130, 185, ano, 6, rng)                # mg/dL
    v["creatinina"] = _serie(0.98, 1.08, ano, 0.04, rng, 2)           # mg/dL
    v["tgo"] = _serie(24, 29, ano, 3, rng)                            # U/L
    v["tgp"] = _serie(27, 34, ano, 4, rng)                            # U/L
    v["tsh"] = _serie(2.1, 2.4, ano, 0.4, rng, 2)                     # µUI/mL
    v["acido_urico"] = _serie(6.1, 7.4, ano, 0.15, rng, 1)            # mg/dL
    v["hemacias"] = _serie(5.05, 4.9, ano, 0.1, rng, 2)               # milhões/mm³
    v["hemoglobina"] = _serie(15.2, 14.8, ano, 0.3, rng, 1)           # g/dL
    v["hematocrito"] = _serie(45.0, 44.0, ano, 0.8, rng, 1)           # %
    v["leucocitos"] = int(round(_serie(6800, 7200, ano, 500, rng), -1))   # /mm³
    v["plaquetas"] = int(round(_serie(245000, 232000, ano, 15000, rng), -3))  # /mm³
    if ano >= 2020:
        v["hba1c"] = _serie(5.3, 6.2, ano, 0.05, rng, 1)              # %
    if ano >= 2018:
        v["psa"] = _serie(0.7, 1.4, ano, 0.08, rng, 2)                # ng/mL
    if visita["id"] in ("2022-08",):
        v["vitamina_d"] = 22.4                                        # ng/mL (baixa)
    if visita["id"] in ("2024-03",):
        v["vitamina_d"] = 31.8
    if visita.get("painel") == "repeticao":
        keep = {"glicose", "colesterol_total", "ldl", "hdl", "triglicerides"}
        v = {k: x for k, x in v.items() if k in keep}
    return v
