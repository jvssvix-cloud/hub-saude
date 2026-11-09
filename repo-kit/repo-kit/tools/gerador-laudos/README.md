# Gerador de laudos sintéticos

Gera os laudos de exame da persona fictícia **Roberto Almeida Siqueira** (12 visitas, 2016–2026,
4 laboratórios fictícios) em PDF e em foto, junto com um **gabarito exato** de tudo que foi impresso.
Serve para testar a extração por IA e medir a acurácia ("X% extraído corretamente em N laudos").

Tudo aqui é fictício: pessoa, laboratórios, endereços, responsáveis técnicos e números de registro.

## Como rodar

```bash
cd tools/gerador-laudos
pip install -r requirements.txt
python gerar.py
```

Leva cerca de 20 s. A pasta `saida/` é apagada e recriada a cada execução. O resultado é
**determinístico** (seed fixa em `persona.py`): rodar de novo gera arquivos idênticos.

## Arquivos

| Caminho | O que é |
|---|---|
| `persona.py` | **Fonte única da verdade**: persona, laboratórios, visitas e o valor verdadeiro de cada exame. |
| `gerar.py` | Decide *como* cada laboratório imprime os valores, gera PDFs, fotos e gabarito. |
| `saida/laudos/` | 1 PDF por visita (`2016-03_delta.pdf` …). |
| `saida/fotos/` | Fotos `.jpg` de 4 laudos (2 Delta, 1 Beta, 1 Gama), uma por página (`..._p1.jpg`). |
| `saida/gabarito/` | 1 JSON por laudo, com o mesmo nome do PDF. |
| `saida/gabarito_consolidado.csv` | Todos os resultados de todos os laudos numa tabela só. |
| `saida/persona.json` | Dados da persona (`PERSONA` de `persona.py`). |

## Os 4 layouts

| Lab | Layout | Anos | Características |
|---|---|---|---|
| Delta | D | 2016–2017 | Máquina de escrever (Courier com tremido), MAIÚSCULAS sem acento, decimal com **ponto**, referência como `VR:`, unidades como `MG/DL`, `UUI/ML`, `/MM3`. |
| Alfa | A | 2018–2020, mai/2025 | Tabela Exame / Resultado / Unidade / Valores de referência; valores fora da faixa em negrito. |
| Beta | B | 2021–2023 | Um bloco por exame (material, método, "Resultado:" em destaque), referência em várias linhas, inclusive por sexo. 3 páginas. |
| Gama | C | 2024–2026 | Compacto com pontilhado, asterisco nos valores fora da faixa, nota de rodapé. |

Dificuldades de propósito: nomes diferentes para o mesmo exame (GLICEMIA / Glicemia de jejum / GLICOSE /
Glicose - jejum), unidades diferentes (`/mm³`, `/µL`, `mil/µL`, `mil/mm³`, `x10¹²/L`), decimal com vírgula
ou ponto, separador de milhar, nome do paciente escrito de formas diferentes, LDL com a classificação
antiga (Ótimo/Desejável/…) até 2017 e meta por risco (Baixo/Intermediário/Alto/Muito alto) a partir de 2018,
colesterol total `< 200` até 2017 e `< 190` depois.

## Formato do gabarito (JSON)

```jsonc
{
  "laudo_id": "2024-03",
  "arquivo_pdf": "laudos/2024-03_gama.pdf",
  "fotos": [{"arquivo": "fotos/...jpg", "pagina": 1}],   // vazio se o laudo não virou foto
  "documento": {
    "laboratorio": "Gama Análises Clínicas", "laboratorio_impresso": "...", "layout": "C",
    "data_coleta": "2024-03-20", "data_coleta_impressa": "20/03/2024",
    "nome_paciente_impresso": "SIQUEIRA, ROBERTO ALMEIDA", "atendimento": "24.03.0373",
    "medico_solicitante": "Dr. F. Lima", "paginas": 1, "painel": "checkup"  // ou "repeticao"
  },
  "resultados": [{
    "analito": "leucocitos",            // nome canônico (chave de persona.py)
    "nome_impresso": "Leucócitos",
    "valor_impresso": "7,04",           // texto exato, sem o asterisco
    "valor_numerico": 7.04,             // número na unidade impressa
    "unidade_impressa": "mil/mm³",
    "unidade_canonica": "/mm³",
    "valor_canonico": 7040,
    "referencia_impressa": "(4,00 a 10,00)",   // linhas separadas por \n
    "ref_min": 4.0, "ref_max": 10.0,           // na unidade impressa
    "ref_min_canonico": 4000, "ref_max_canonico": 10000,
    "fora_da_faixa": false,
    "pagina": 1
  }]
}
```

Regras usadas para `ref_min`/`ref_max` e `fora_da_faixa`:
- Valores para **homem adulto** (quando o laudo traz referência por sexo).
- "Até X" inclui X; "< X" / "inferior a X" exclui X (ex.: HbA1c 5,7 com referência `< 5,7` está fora).
- LDL: classificação antiga → dentro até "Desejável" (≤ 129); classificação por risco → meta de **risco baixo** (< 130).
- Classificações com várias faixas (glicose, triglicérides, HbA1c, vitamina D): a faixa "normal/desejável".
- O gabarito vale também para as fotos: mesma página, mesmos valores.

Unidades canônicas: mg/dL (glicose, lipídios, creatinina, ácido úrico), U/L (TGO/TGP), µUI/mL (TSH),
ng/mL (PSA, vitamina D), % (HbA1c, hematócrito), g/dL (hemoglobina), milhões/mm³ (hemácias),
/mm³ (leucócitos e plaquetas). `/µL` = `/mm³`, `x10¹²/L` = `milhões/mm³`, `mil/...` = × 1000.

## Alterar os dados

Mude valores ou visitas em `persona.py` e rode `gerar.py` de novo. Para escolher outros laudos para foto,
edite `FOTOS_EXTRA` em `gerar.py` (todos os laudos do layout D sempre viram foto).
