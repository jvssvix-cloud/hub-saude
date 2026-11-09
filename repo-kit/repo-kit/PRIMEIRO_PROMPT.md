Leia o CLAUDE.md e o docs/contexto.md. Depois crie o gerador de laudos sintéticos em `tools/gerador-laudos/`, usando o arquivo `tools/gerador-laudos/persona.py` que já está no repositório (é a fonte única dos valores verdadeiros).

Objetivo: ter laudos de exame realistas e variados para testar a extração por IA, com gabarito exato para medir a acurácia.

Requisitos:
1. Python 3 + reportlab + Pillow. Um script `gerar.py` que gera tudo de forma determinística (seed fixa) em `tools/gerador-laudos/saida/`.
2. Um laudo PDF por visita em `VISITAS`, com 4 layouts diferentes, um por laboratório fictício:
   - Layout D (Delta, 2016-2017): estilo antigo de máquina de escrever, fonte Courier, tudo em maiúsculas, decimal com ponto, referência como "VR:". Serve para imprimir e fotografar.
   - Layout A (Alfa): tabela com colunas Exame | Resultado | Unidade | Valores de referência.
   - Layout B (Beta): um bloco por exame (nome em negrito, material e método, "Resultado:" em destaque, referência em várias linhas, inclusive por sexo, ex.: "Homens: 0,70 a 1,30 / Mulheres: 0,50 a 1,10").
   - Layout C (Gama): compacto, linhas com pontilhado "Glicose - jejum ........ 104 mg/dL (70 a 99)", asterisco nos valores fora da faixa e nota de rodapé.
3. Variações que dificultam a leitura (é o objetivo):
   - Nomes diferentes para o mesmo exame em cada laboratório (ex.: GLICOSE / Glicemia de jejum / Glicose - jejum / GLICEMIA; LDL-COLESTEROL / Colesterol LDL (calculado - Friedewald) / LDL Colesterol / COLEST. LDL; TGO (AST) / Aspartato aminotransferase / AST/TGO).
   - Unidades diferentes para leucócitos e plaquetas (/mm³ vs /µL vs mil/mm³, ex.: 6.800 vs 6,8 mil/mm³; 240.000 vs 240 mil/mm³).
   - Decimal com vírgula (padrão BR), exceto no layout D.
   - Referência do LDL no formato antigo (Ótimo/Desejável/Limítrofe/Alto) em 2016-2017 e por categoria de risco (Baixo/Intermediário/Alto/Muito alto) a partir de 2018.
   - Cabeçalho com nome do paciente escrito de formas diferentes (completo, abreviado, maiúsculas), data de coleta e nº de atendimento fictício. Nada de CPF.
   - Hemograma (hemácias, hemoglobina, hematócrito, leucócitos, plaquetas), glicose, perfil lipídico, creatinina, TGO, TGP, TSH, ácido úrico; HbA1c a partir de 2020; PSA a partir de 2018; vitamina D em 2022 e 2024.
4. Gabarito: para cada laudo, um JSON em `saida/gabarito/` com dados do documento (laboratório, data de coleta, nome do paciente como impresso, páginas) e uma lista de resultados com: analito canônico, nome como impresso, valor como impresso, valor numérico, unidade impressa, unidade canônica, valor na unidade canônica, texto da referência como impresso, ref_min, ref_max, fora_da_faixa (true/false) e página. Também um `gabarito_consolidado.csv` com todos os resultados.
5. Fotos: transforme 4 a 6 laudos (todos do layout D e mais 1 de B e 1 de C) em fotos realistas em `saida/fotos/` (.jpg): fundo de papel, rotação leve, perspectiva, sombra em gradiente, leve desfoque, ruído e compressão JPEG. O gabarito vale para elas também.
6. Gere `persona.json` (dados de PERSONA) e um `README.md` explicando como rodar e o que cada pasta contém.
7. Todos os nomes de laboratório, responsáveis técnicos e endereços são fictícios. Nenhum pode imitar laboratório real.

Ao terminar: rode o script, abra 2 ou 3 PDFs e 1 foto para conferir que estão legíveis e realistas, mostre um resumo (quantos laudos, quantos resultados, quantos fora da faixa) e faça commit numa branch `p1/gerador-laudos`.
