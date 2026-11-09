-- GERADO por supabase/seed/gerar-seed.mjs a partir de tools/gerador-laudos/saida. Não edite à mão.
-- Persona sintética: Roberto Almeida Siqueira. 14 documentos, 205 observações.

delete from paciente where id = 'persona-roberto';  -- cascade: documentos, observações, consentimentos, logs

insert into paciente (id, nome, nascimento, sexo) values
  ('persona-roberto', 'Roberto Almeida Siqueira', '1968-05-14', 'M');

insert into documento (id, paciente_id, tipo, origem, emissor, data, arquivo, paginas) values
  ('2016-03', 'persona-roberto', 'laudo_exame', 'seed', 'LABORATÓRIO DELTA DE ANÁLISES CLÍNICAS', '2016-03-09', 'laudos/2016-03_delta.pdf', 2),
  ('2017-04', 'persona-roberto', 'laudo_exame', 'seed', 'LABORATÓRIO DELTA DE ANÁLISES CLÍNICAS', '2017-04-18', 'laudos/2017-04_delta.pdf', 2),
  ('2018-03', 'persona-roberto', 'laudo_exame', 'seed', 'Laboratório Alfa Diagnósticos', '2018-03-22', 'laudos/2018-03_alfa.pdf', 1),
  ('2019-03', 'persona-roberto', 'laudo_exame', 'seed', 'Laboratório Alfa Diagnósticos', '2019-03-14', 'laudos/2019-03_alfa.pdf', 1),
  ('2020-09', 'persona-roberto', 'laudo_exame', 'seed', 'Laboratório Alfa Diagnósticos', '2020-09-03', 'laudos/2020-09_alfa.pdf', 1),
  ('2021-08', 'persona-roberto', 'laudo_exame', 'seed', 'Diagnóstica Beta Medicina Laboratorial', '2021-08-26', 'laudos/2021-08_beta.pdf', 3),
  ('2022-08', 'persona-roberto', 'laudo_exame', 'seed', 'Diagnóstica Beta Medicina Laboratorial', '2022-08-17', 'laudos/2022-08_beta.pdf', 3),
  ('2023-09', 'persona-roberto', 'laudo_exame', 'seed', 'Diagnóstica Beta Medicina Laboratorial', '2023-09-05', 'laudos/2023-09_beta.pdf', 3),
  ('2024-03', 'persona-roberto', 'laudo_exame', 'seed', 'Gama Análises Clínicas', '2024-03-20', 'laudos/2024-03_gama.pdf', 1),
  ('2025-03', 'persona-roberto', 'laudo_exame', 'seed', 'Gama Análises Clínicas', '2025-03-11', 'laudos/2025-03_gama.pdf', 1),
  ('2025-05', 'persona-roberto', 'laudo_exame', 'seed', 'Laboratório Alfa Diagnósticos', '2025-05-27', 'laudos/2025-05_alfa.pdf', 1),
  ('2026-03', 'persona-roberto', 'laudo_exame', 'seed', 'Gama Análises Clínicas', '2026-03-12', 'laudos/2026-03_gama.pdf', 1),
  ('vacinas-caderneta', 'persona-roberto', 'carteira_vacinacao', 'seed', 'Cartão de vacinação do adulto (papel)', null, 'vacinas/vacinas-caderneta.pdf', 1),
  ('vacinas-comprovante', 'persona-roberto', 'carteira_vacinacao', 'seed', 'Sistema Municipal de Imunização (fictício)', null, 'vacinas/vacinas-comprovante.pdf', 1);

insert into observacao (paciente_id, documento_id, categoria, codigo, data,
  nome_impresso, valor_impresso, unidade_impressa, referencia_impressa, pagina,
  valor_canonico, unidade_canonica, qualificador, resultado_texto,
  ref_min_canonico, ref_max_canonico, fora_da_faixa,
  dose, lote, local, confianca) values
  ('persona-roberto', '2016-03', 'exame', 'hemacias', '2016-03-09', 'HEMACIAS', '4.99', 'MILHOES/MM3', 'VR: 4.50 A 5.90', 1, 4.99, 'milhões/mm³', null, null, 4.5, 5.9, false, null, null, null, 'alta'),
  ('persona-roberto', '2016-03', 'exame', 'hemoglobina', '2016-03-09', 'HEMOGLOBINA', '15.5', 'G/DL', 'VR: 13.5 A 17.5', 1, 15.5, 'g/dL', null, null, 13.5, 17.5, false, null, null, null, 'alta'),
  ('persona-roberto', '2016-03', 'exame', 'hematocrito', '2016-03-09', 'HEMATOCRITO', '45.5', '%', 'VR: 39.0 A 50.0', 1, 45.5, '%', null, null, 39, 50, false, null, null, null, 'alta'),
  ('persona-roberto', '2016-03', 'exame', 'leucocitos', '2016-03-09', 'LEUCOCITOS', '7270', '/MM3', 'VR: 4000 A 10000', 1, 7270, '/mm³', null, null, 4000, 10000, false, null, null, null, 'alta'),
  ('persona-roberto', '2016-03', 'exame', 'plaquetas', '2016-03-09', 'PLAQUETAS', '250000', '/MM3', 'VR: 150000 A 400000', 1, 250000, '/mm³', null, null, 150000, 400000, false, null, null, null, 'alta'),
  ('persona-roberto', '2016-03', 'exame', 'glicose', '2016-03-09', 'GLICEMIA', '88', 'MG/DL', 'VR: 70 A 99 MG/DL', 1, 88, 'mg/dL', null, null, 70, 99, false, null, null, null, 'alta'),
  ('persona-roberto', '2016-03', 'exame', 'colesterol_total', '2016-03-09', 'COLESTEROL TOTAL', '190', 'MG/DL', 'VR: DESEJAVEL: < 200
    LIMITROFE: 200 A 239
    ALTO.....: >= 240', 1, 190, 'mg/dL', null, null, null, 200, false, null, null, null, 'alta'),
  ('persona-roberto', '2016-03', 'exame', 'hdl', '2016-03-09', 'COLEST. HDL', '48', 'MG/DL', 'VR: > 40 MG/DL', 1, 48, 'mg/dL', null, null, 40, null, false, null, null, null, 'alta'),
  ('persona-roberto', '2016-03', 'exame', 'ldl', '2016-03-09', 'COLEST. LDL', '112', 'MG/DL', 'VR: OTIMO............: < 100
    DESEJAVEL........: 100 A 129
    LIMITROFE........: 130 A 159
    ALTO.............: 160 A 189
    MUITO ALTO.......: >= 190', 1, 112, 'mg/dL', null, null, null, 129, false, null, null, null, 'alta'),
  ('persona-roberto', '2016-03', 'exame', 'triglicerides', '2016-03-09', 'TRIGLICERIDES', '125', 'MG/DL', 'VR: DESEJAVEL.: < 150
    LIMITROFE.: 150 A 199
    ALTO......: 200 A 499
    MUITO ALTO: >= 500', 1, 125, 'mg/dL', null, null, null, 150, false, null, null, null, 'alta'),
  ('persona-roberto', '2016-03', 'exame', 'creatinina', '2016-03-09', 'CREATININA', '0.95', 'MG/DL', 'VR: 0.70 A 1.30 MG/DL', 1, 0.95, 'mg/dL', null, null, 0.7, 1.3, false, null, null, null, 'alta'),
  ('persona-roberto', '2016-03', 'exame', 'acido_urico', '2016-03-09', 'ACIDO URICO', '6.1', 'MG/DL', 'VR: 3.5 A 7.2 MG/DL', 1, 6.1, 'mg/dL', null, null, 3.5, 7.2, false, null, null, null, 'alta'),
  ('persona-roberto', '2016-03', 'exame', 'tgo', '2016-03-09', 'TRANSAMINASE OXALACETICA - TGO', '26', 'U/L', 'VR: 5 A 40 U/L', 2, 26, 'U/L', null, null, 5, 40, false, null, null, null, 'alta'),
  ('persona-roberto', '2016-03', 'exame', 'tgp', '2016-03-09', 'TRANSAMINASE PIRUVICA - TGP', '26', 'U/L', 'VR: 7 A 56 U/L', 2, 26, 'U/L', null, null, 7, 56, false, null, null, null, 'alta'),
  ('persona-roberto', '2016-03', 'exame', 'tsh', '2016-03-09', 'TSH - HORMONIO TIREOESTIMULANTE', '2.45', 'UUI/ML', 'VR: 0.40 A 4.00 UUI/ML', 2, 2.45, 'µUI/mL', null, null, 0.4, 4, false, null, null, null, 'alta'),
  ('persona-roberto', '2017-04', 'exame', 'hemacias', '2017-04-18', 'HEMACIAS', '4.99', 'MILHOES/MM3', 'VR: 4.50 A 5.90', 1, 4.99, 'milhões/mm³', null, null, 4.5, 5.9, false, null, null, null, 'alta'),
  ('persona-roberto', '2017-04', 'exame', 'hemoglobina', '2017-04-18', 'HEMOGLOBINA', '15.4', 'G/DL', 'VR: 13.5 A 17.5', 1, 15.4, 'g/dL', null, null, 13.5, 17.5, false, null, null, null, 'alta'),
  ('persona-roberto', '2017-04', 'exame', 'hematocrito', '2017-04-18', 'HEMATOCRITO', '44.6', '%', 'VR: 39.0 A 50.0', 1, 44.6, '%', null, null, 39, 50, false, null, null, null, 'alta'),
  ('persona-roberto', '2017-04', 'exame', 'leucocitos', '2017-04-18', 'LEUCOCITOS', '7110', '/MM3', 'VR: 4000 A 10000', 1, 7110, '/mm³', null, null, 4000, 10000, false, null, null, null, 'alta'),
  ('persona-roberto', '2017-04', 'exame', 'plaquetas', '2017-04-18', 'PLAQUETAS', '241000', '/MM3', 'VR: 150000 A 400000', 1, 241000, '/mm³', null, null, 150000, 400000, false, null, null, null, 'alta'),
  ('persona-roberto', '2017-04', 'exame', 'glicose', '2017-04-18', 'GLICEMIA', '90', 'MG/DL', 'VR: 70 A 99 MG/DL', 1, 90, 'mg/dL', null, null, 70, 99, false, null, null, null, 'alta'),
  ('persona-roberto', '2017-04', 'exame', 'colesterol_total', '2017-04-18', 'COLESTEROL TOTAL', '197', 'MG/DL', 'VR: DESEJAVEL: < 200
    LIMITROFE: 200 A 239
    ALTO.....: >= 240', 1, 197, 'mg/dL', null, null, null, 200, false, null, null, null, 'alta'),
  ('persona-roberto', '2017-04', 'exame', 'hdl', '2017-04-18', 'COLEST. HDL', '47', 'MG/DL', 'VR: > 40 MG/DL', 1, 47, 'mg/dL', null, null, 40, null, false, null, null, null, 'alta'),
  ('persona-roberto', '2017-04', 'exame', 'ldl', '2017-04-18', 'COLEST. LDL', '118', 'MG/DL', 'VR: OTIMO............: < 100
    DESEJAVEL........: 100 A 129
    LIMITROFE........: 130 A 159
    ALTO.............: 160 A 189
    MUITO ALTO.......: >= 190', 1, 118, 'mg/dL', null, null, null, 129, false, null, null, null, 'alta'),
  ('persona-roberto', '2017-04', 'exame', 'triglicerides', '2017-04-18', 'TRIGLICERIDES', '134', 'MG/DL', 'VR: DESEJAVEL.: < 150
    LIMITROFE.: 150 A 199
    ALTO......: 200 A 499
    MUITO ALTO: >= 500', 1, 134, 'mg/dL', null, null, null, 150, false, null, null, null, 'alta'),
  ('persona-roberto', '2017-04', 'exame', 'creatinina', '2017-04-18', 'CREATININA', '1.00', 'MG/DL', 'VR: 0.70 A 1.30 MG/DL', 1, 1, 'mg/dL', null, null, 0.7, 1.3, false, null, null, null, 'alta'),
  ('persona-roberto', '2017-04', 'exame', 'acido_urico', '2017-04-18', 'ACIDO URICO', '6.3', 'MG/DL', 'VR: 3.5 A 7.2 MG/DL', 1, 6.3, 'mg/dL', null, null, 3.5, 7.2, false, null, null, null, 'alta'),
  ('persona-roberto', '2017-04', 'exame', 'tgo', '2017-04-18', 'TRANSAMINASE OXALACETICA - TGO', '27', 'U/L', 'VR: 5 A 40 U/L', 2, 27, 'U/L', null, null, 5, 40, false, null, null, null, 'alta'),
  ('persona-roberto', '2017-04', 'exame', 'tgp', '2017-04-18', 'TRANSAMINASE PIRUVICA - TGP', '31', 'U/L', 'VR: 7 A 56 U/L', 2, 31, 'U/L', null, null, 7, 56, false, null, null, null, 'alta'),
  ('persona-roberto', '2017-04', 'exame', 'tsh', '2017-04-18', 'TSH - HORMONIO TIREOESTIMULANTE', '2.44', 'UUI/ML', 'VR: 0.40 A 4.00 UUI/ML', 2, 2.44, 'µUI/mL', null, null, 0.4, 4, false, null, null, null, 'alta'),
  ('persona-roberto', '2018-03', 'exame', 'hemacias', '2018-03-22', 'Hemácias', '5,06', 'milhões/mm³', '4,30 a 5,70 milhões/mm³', 1, 5.06, 'milhões/mm³', null, null, 4.3, 5.7, false, null, null, null, 'alta'),
  ('persona-roberto', '2018-03', 'exame', 'hemoglobina', '2018-03-22', 'Hemoglobina', '15,1', 'g/dL', '13,5 a 17,5 g/dL', 1, 15.1, 'g/dL', null, null, 13.5, 17.5, false, null, null, null, 'alta'),
  ('persona-roberto', '2018-03', 'exame', 'hematocrito', '2018-03-22', 'Hematócrito', '45,3', '%', '39,0 a 50,0 %', 1, 45.3, '%', null, null, 39, 50, false, null, null, null, 'alta'),
  ('persona-roberto', '2018-03', 'exame', 'leucocitos', '2018-03-22', 'Leucócitos', '7.210', '/mm³', '3.500 a 10.500 /mm³', 1, 7210, '/mm³', null, null, 3500, 10500, false, null, null, null, 'alta'),
  ('persona-roberto', '2018-03', 'exame', 'plaquetas', '2018-03-22', 'Plaquetas', '256.000', '/mm³', '150.000 a 450.000 /mm³', 1, 256000, '/mm³', null, null, 150000, 450000, false, null, null, null, 'alta'),
  ('persona-roberto', '2018-03', 'exame', 'glicose', '2018-03-22', 'Glicemia de jejum', '93', 'mg/dL', '70 a 99 mg/dL', 1, 93, 'mg/dL', null, null, 70, 99, false, null, null, null, 'alta'),
  ('persona-roberto', '2018-03', 'exame', 'colesterol_total', '2018-03-22', 'Colesterol total', '202', 'mg/dL', 'Desejável: < 190 mg/dL', 1, 202, 'mg/dL', null, null, null, 190, true, null, null, null, 'alta'),
  ('persona-roberto', '2018-03', 'exame', 'hdl', '2018-03-22', 'Colesterol HDL', '47', 'mg/dL', 'Desejável: > 40 mg/dL', 1, 47, 'mg/dL', null, null, 40, null, false, null, null, null, 'alta'),
  ('persona-roberto', '2018-03', 'exame', 'ldl', '2018-03-22', 'Colesterol LDL (calculado - Friedewald)', '124', 'mg/dL', 'Risco baixo: < 130 mg/dL
Risco intermediário: < 100 mg/dL
Risco alto: < 70 mg/dL
Risco muito alto: < 50 mg/dL', 1, 124, 'mg/dL', null, null, null, 130, false, null, null, null, 'alta'),
  ('persona-roberto', '2018-03', 'exame', 'triglicerides', '2018-03-22', 'Triglicerídeos', '144', 'mg/dL', 'Desejável: < 150 mg/dL', 1, 144, 'mg/dL', null, null, null, 150, false, null, null, null, 'alta'),
  ('persona-roberto', '2018-03', 'exame', 'creatinina', '2018-03-22', 'Creatinina', '0,99', 'mg/dL', '0,70 a 1,20 mg/dL', 1, 0.99, 'mg/dL', null, null, 0.7, 1.2, false, null, null, null, 'alta'),
  ('persona-roberto', '2018-03', 'exame', 'acido_urico', '2018-03-22', 'Ácido úrico', '6,3', 'mg/dL', '3,4 a 7,0 mg/dL', 1, 6.3, 'mg/dL', null, null, 3.4, 7, false, null, null, null, 'alta'),
  ('persona-roberto', '2018-03', 'exame', 'tgo', '2018-03-22', 'TGO (AST)', '23', 'U/L', 'Até 40 U/L', 1, 23, 'U/L', null, null, null, 40, false, null, null, null, 'alta'),
  ('persona-roberto', '2018-03', 'exame', 'tgp', '2018-03-22', 'TGP (ALT)', '27', 'U/L', 'Até 41 U/L', 1, 27, 'U/L', null, null, null, 41, false, null, null, null, 'alta'),
  ('persona-roberto', '2018-03', 'exame', 'tsh', '2018-03-22', 'TSH', '1,98', 'µUI/mL', '0,27 a 4,20 µUI/mL', 1, 1.98, 'µUI/mL', null, null, 0.27, 4.2, false, null, null, null, 'alta'),
  ('persona-roberto', '2018-03', 'exame', 'psa', '2018-03-22', 'PSA total', '0,84', 'ng/mL', 'Até 4,00 ng/mL', 1, 0.84, 'ng/mL', null, null, null, 4, false, null, null, null, 'alta'),
  ('persona-roberto', '2019-03', 'exame', 'hemacias', '2019-03-14', 'Hemácias', '5,10', 'milhões/mm³', '4,30 a 5,70 milhões/mm³', 1, 5.1, 'milhões/mm³', null, null, 4.3, 5.7, false, null, null, null, 'alta'),
  ('persona-roberto', '2019-03', 'exame', 'hemoglobina', '2019-03-14', 'Hemoglobina', '14,8', 'g/dL', '13,5 a 17,5 g/dL', 1, 14.8, 'g/dL', null, null, 13.5, 17.5, false, null, null, null, 'alta'),
  ('persona-roberto', '2019-03', 'exame', 'hematocrito', '2019-03-14', 'Hematócrito', '44,9', '%', '39,0 a 50,0 %', 1, 44.9, '%', null, null, 39, 50, false, null, null, null, 'alta'),
  ('persona-roberto', '2019-03', 'exame', 'leucocitos', '2019-03-14', 'Leucócitos', '7.390', '/mm³', '3.500 a 10.500 /mm³', 1, 7390, '/mm³', null, null, 3500, 10500, false, null, null, null, 'alta'),
  ('persona-roberto', '2019-03', 'exame', 'plaquetas', '2019-03-14', 'Plaquetas', '233.000', '/mm³', '150.000 a 450.000 /mm³', 1, 233000, '/mm³', null, null, 150000, 450000, false, null, null, null, 'alta'),
  ('persona-roberto', '2019-03', 'exame', 'glicose', '2019-03-14', 'Glicemia de jejum', '96', 'mg/dL', '70 a 99 mg/dL', 1, 96, 'mg/dL', null, null, 70, 99, false, null, null, null, 'alta'),
  ('persona-roberto', '2019-03', 'exame', 'colesterol_total', '2019-03-14', 'Colesterol total', '204', 'mg/dL', 'Desejável: < 190 mg/dL', 1, 204, 'mg/dL', null, null, null, 190, true, null, null, null, 'alta'),
  ('persona-roberto', '2019-03', 'exame', 'hdl', '2019-03-14', 'Colesterol HDL', '45', 'mg/dL', 'Desejável: > 40 mg/dL', 1, 45, 'mg/dL', null, null, 40, null, false, null, null, null, 'alta'),
  ('persona-roberto', '2019-03', 'exame', 'ldl', '2019-03-14', 'Colesterol LDL (calculado - Friedewald)', '128', 'mg/dL', 'Risco baixo: < 130 mg/dL
Risco intermediário: < 100 mg/dL
Risco alto: < 70 mg/dL
Risco muito alto: < 50 mg/dL', 1, 128, 'mg/dL', null, null, null, 130, false, null, null, null, 'alta'),
  ('persona-roberto', '2019-03', 'exame', 'triglicerides', '2019-03-14', 'Triglicerídeos', '147', 'mg/dL', 'Desejável: < 150 mg/dL', 1, 147, 'mg/dL', null, null, null, 150, false, null, null, null, 'alta'),
  ('persona-roberto', '2019-03', 'exame', 'creatinina', '2019-03-14', 'Creatinina', '1,00', 'mg/dL', '0,70 a 1,20 mg/dL', 1, 1, 'mg/dL', null, null, 0.7, 1.2, false, null, null, null, 'alta'),
  ('persona-roberto', '2019-03', 'exame', 'acido_urico', '2019-03-14', 'Ácido úrico', '6,6', 'mg/dL', '3,4 a 7,0 mg/dL', 1, 6.6, 'mg/dL', null, null, 3.4, 7, false, null, null, null, 'alta'),
  ('persona-roberto', '2019-03', 'exame', 'tgo', '2019-03-14', 'TGO (AST)', '25', 'U/L', 'Até 40 U/L', 1, 25, 'U/L', null, null, null, 40, false, null, null, null, 'alta'),
  ('persona-roberto', '2019-03', 'exame', 'tgp', '2019-03-14', 'TGP (ALT)', '30', 'U/L', 'Até 41 U/L', 1, 30, 'U/L', null, null, null, 41, false, null, null, null, 'alta'),
  ('persona-roberto', '2019-03', 'exame', 'tsh', '2019-03-14', 'TSH', '2,50', 'µUI/mL', '0,27 a 4,20 µUI/mL', 1, 2.5, 'µUI/mL', null, null, 0.27, 4.2, false, null, null, null, 'alta'),
  ('persona-roberto', '2019-03', 'exame', 'psa', '2019-03-14', 'PSA total', '0,98', 'ng/mL', 'Até 4,00 ng/mL', 1, 0.98, 'ng/mL', null, null, null, 4, false, null, null, null, 'alta'),
  ('persona-roberto', '2020-09', 'exame', 'hemacias', '2020-09-03', 'Hemácias', '4,99', 'milhões/mm³', '4,30 a 5,70 milhões/mm³', 1, 4.99, 'milhões/mm³', null, null, 4.3, 5.7, false, null, null, null, 'alta'),
  ('persona-roberto', '2020-09', 'exame', 'hemoglobina', '2020-09-03', 'Hemoglobina', '15,0', 'g/dL', '13,5 a 17,5 g/dL', 1, 15, 'g/dL', null, null, 13.5, 17.5, false, null, null, null, 'alta'),
  ('persona-roberto', '2020-09', 'exame', 'hematocrito', '2020-09-03', 'Hematócrito', '44,6', '%', '39,0 a 50,0 %', 1, 44.6, '%', null, null, 39, 50, false, null, null, null, 'alta'),
  ('persona-roberto', '2020-09', 'exame', 'leucocitos', '2020-09-03', 'Leucócitos', '6.980', '/mm³', '3.500 a 10.500 /mm³', 1, 6980, '/mm³', null, null, 3500, 10500, false, null, null, null, 'alta'),
  ('persona-roberto', '2020-09', 'exame', 'plaquetas', '2020-09-03', 'Plaquetas', '225.000', '/mm³', '150.000 a 450.000 /mm³', 1, 225000, '/mm³', null, null, 150000, 450000, false, null, null, null, 'alta'),
  ('persona-roberto', '2020-09', 'exame', 'glicose', '2020-09-03', 'Glicemia de jejum', '100', 'mg/dL', '70 a 99 mg/dL', 1, 100, 'mg/dL', null, null, 70, 99, true, null, null, null, 'alta'),
  ('persona-roberto', '2020-09', 'exame', 'hba1c', '2020-09-03', 'Hemoglobina glicada (HbA1c)', '5,7', '%', 'Normal: < 5,7%
Pré-diabetes: 5,7 a 6,4%
Diabetes: 6,5% ou mais', 1, 5.7, '%', null, null, null, 5.7, true, null, null, null, 'alta'),
  ('persona-roberto', '2020-09', 'exame', 'colesterol_total', '2020-09-03', 'Colesterol total', '210', 'mg/dL', 'Desejável: < 190 mg/dL', 1, 210, 'mg/dL', null, null, null, 190, true, null, null, null, 'alta'),
  ('persona-roberto', '2020-09', 'exame', 'hdl', '2020-09-03', 'Colesterol HDL', '45', 'mg/dL', 'Desejável: > 40 mg/dL', 1, 45, 'mg/dL', null, null, 40, null, false, null, null, null, 'alta'),
  ('persona-roberto', '2020-09', 'exame', 'ldl', '2020-09-03', 'Colesterol LDL (calculado - Friedewald)', '134', 'mg/dL', 'Risco baixo: < 130 mg/dL
Risco intermediário: < 100 mg/dL
Risco alto: < 70 mg/dL
Risco muito alto: < 50 mg/dL', 1, 134, 'mg/dL', null, null, null, 130, true, null, null, null, 'alta'),
  ('persona-roberto', '2020-09', 'exame', 'triglicerides', '2020-09-03', 'Triglicerídeos', '159', 'mg/dL', 'Desejável: < 150 mg/dL', 1, 159, 'mg/dL', null, null, null, 150, true, null, null, null, 'alta'),
  ('persona-roberto', '2020-09', 'exame', 'creatinina', '2020-09-03', 'Creatinina', '1,07', 'mg/dL', '0,70 a 1,20 mg/dL', 1, 1.07, 'mg/dL', null, null, 0.7, 1.2, false, null, null, null, 'alta'),
  ('persona-roberto', '2020-09', 'exame', 'acido_urico', '2020-09-03', 'Ácido úrico', '6,7', 'mg/dL', '3,4 a 7,0 mg/dL', 1, 6.7, 'mg/dL', null, null, 3.4, 7, false, null, null, null, 'alta'),
  ('persona-roberto', '2020-09', 'exame', 'tgo', '2020-09-03', 'TGO (AST)', '24', 'U/L', 'Até 40 U/L', 1, 24, 'U/L', null, null, null, 40, false, null, null, null, 'alta'),
  ('persona-roberto', '2020-09', 'exame', 'tgp', '2020-09-03', 'TGP (ALT)', '33', 'U/L', 'Até 41 U/L', 1, 33, 'U/L', null, null, null, 41, false, null, null, null, 'alta'),
  ('persona-roberto', '2020-09', 'exame', 'tsh', '2020-09-03', 'TSH', '1,99', 'µUI/mL', '0,27 a 4,20 µUI/mL', 1, 1.99, 'µUI/mL', null, null, 0.27, 4.2, false, null, null, null, 'alta'),
  ('persona-roberto', '2020-09', 'exame', 'psa', '2020-09-03', 'PSA total', '1,00', 'ng/mL', 'Até 4,00 ng/mL', 1, 1, 'ng/mL', null, null, null, 4, false, null, null, null, 'alta'),
  ('persona-roberto', '2021-08', 'exame', 'hemacias', '2021-08-26', 'ERITRÓCITOS', '4,90', 'milhões/µL', 'Homens: 4,50 a 5,90 milhões/µL
Mulheres: 4,00 a 5,20 milhões/µL', 1, 4.9, 'milhões/mm³', null, null, 4.5, 5.9, false, null, null, null, 'alta'),
  ('persona-roberto', '2021-08', 'exame', 'hemoglobina', '2021-08-26', 'HEMOGLOBINA', '14,9', 'g/dL', 'Homens: 13,5 a 17,5 g/dL
Mulheres: 12,0 a 15,5 g/dL', 1, 14.9, 'g/dL', null, null, 13.5, 17.5, false, null, null, null, 'alta'),
  ('persona-roberto', '2021-08', 'exame', 'hematocrito', '2021-08-26', 'HEMATÓCRITO', '44,9', '%', 'Homens: 41 a 53 %
Mulheres: 36 a 46 %', 1, 44.9, '%', null, null, 41, 53, false, null, null, null, 'alta'),
  ('persona-roberto', '2021-08', 'exame', 'leucocitos', '2021-08-26', 'LEUCÓCITOS TOTAIS', '6.750', '/µL', '4.000 a 11.000 /µL', 1, 6750, '/mm³', null, null, 4000, 11000, false, null, null, null, 'alta'),
  ('persona-roberto', '2021-08', 'exame', 'plaquetas', '2021-08-26', 'CONTAGEM DE PLAQUETAS', '235', 'mil/µL', '150 a 450 mil/µL', 1, 235000, '/mm³', null, null, 150000, 450000, false, null, null, null, 'alta'),
  ('persona-roberto', '2021-08', 'exame', 'glicose', '2021-08-26', 'GLICOSE', '100', 'mg/dL', 'Normal: 70 a 99 mg/dL
Glicemia de jejum alterada: 100 a 125 mg/dL
Diabetes: igual ou superior a 126 mg/dL', 1, 100, 'mg/dL', null, null, 70, 99, true, null, null, null, 'alta'),
  ('persona-roberto', '2021-08', 'exame', 'hba1c', '2021-08-26', 'HEMOGLOBINA GLICADA - HbA1c', '5,8', '%', 'Normal: inferior a 5,7%
Pré-diabetes: 5,7% a 6,4%
Diabetes: igual ou superior a 6,5%', 1, 5.8, '%', null, null, null, 5.7, true, null, null, null, 'alta'),
  ('persona-roberto', '2021-08', 'exame', 'colesterol_total', '2021-08-26', 'COLESTEROL TOTAL', '220', 'mg/dL', 'Desejável: inferior a 190 mg/dL', 1, 220, 'mg/dL', null, null, null, 190, true, null, null, null, 'alta'),
  ('persona-roberto', '2021-08', 'exame', 'hdl', '2021-08-26', 'HDL-COLESTEROL', '44', 'mg/dL', 'Desejável: superior a 40 mg/dL', 2, 44, 'mg/dL', null, null, 40, null, false, null, null, null, 'alta'),
  ('persona-roberto', '2021-08', 'exame', 'ldl', '2021-08-26', 'LDL-COLESTEROL', '140', 'mg/dL', 'Meta conforme categoria de risco:
Baixo: inferior a 130 mg/dL
Intermediário: inferior a 100 mg/dL
Alto: inferior a 70 mg/dL
Muito alto: inferior a 50 mg/dL', 2, 140, 'mg/dL', null, null, null, 130, true, null, null, null, 'alta'),
  ('persona-roberto', '2021-08', 'exame', 'triglicerides', '2021-08-26', 'TRIGLICÉRIDES', '162', 'mg/dL', 'Desejável (com jejum): inferior a 150 mg/dL
Desejável (sem jejum): inferior a 175 mg/dL', 2, 162, 'mg/dL', null, null, null, 150, true, null, null, null, 'alta'),
  ('persona-roberto', '2021-08', 'exame', 'creatinina', '2021-08-26', 'CREATININA', '1,01', 'mg/dL', 'Homens: 0,70 a 1,30 mg/dL
Mulheres: 0,50 a 1,10 mg/dL', 2, 1.01, 'mg/dL', null, null, 0.7, 1.3, false, null, null, null, 'alta'),
  ('persona-roberto', '2021-08', 'exame', 'acido_urico', '2021-08-26', 'ÁCIDO ÚRICO', '6,8', 'mg/dL', 'Homens: 3,5 a 7,2 mg/dL
Mulheres: 2,6 a 6,0 mg/dL', 2, 6.8, 'mg/dL', null, null, 3.5, 7.2, false, null, null, null, 'alta'),
  ('persona-roberto', '2021-08', 'exame', 'tgo', '2021-08-26', 'ASPARTATO AMINOTRANSFERASE', '28', 'U/L', 'Homens: até 40 U/L
Mulheres: até 32 U/L', 2, 28, 'U/L', null, null, null, 40, false, null, null, null, 'alta'),
  ('persona-roberto', '2021-08', 'exame', 'tgp', '2021-08-26', 'ALANINA AMINOTRANSFERASE', '29', 'U/L', 'Homens: até 41 U/L
Mulheres: até 33 U/L', 2, 29, 'U/L', null, null, null, 41, false, null, null, null, 'alta'),
  ('persona-roberto', '2021-08', 'exame', 'tsh', '2021-08-26', 'HORMÔNIO TIREOESTIMULANTE (TSH)', '2,32', 'µUI/mL', 'Adultos: 0,40 a 4,30 µUI/mL', 2, 2.32, 'µUI/mL', null, null, 0.4, 4.3, false, null, null, null, 'alta'),
  ('persona-roberto', '2021-08', 'exame', 'psa', '2021-08-26', 'ANTÍGENO PROSTÁTICO ESPECÍFICO (PSA) TOTAL', '1,15', 'ng/mL', 'Até 4,0 ng/mL
(o valor de corte pode variar com a idade)', 3, 1.15, 'ng/mL', null, null, null, 4, false, null, null, null, 'alta'),
  ('persona-roberto', '2022-08', 'exame', 'hemacias', '2022-08-17', 'ERITRÓCITOS', '4,95', 'milhões/µL', 'Homens: 4,50 a 5,90 milhões/µL
Mulheres: 4,00 a 5,20 milhões/µL', 1, 4.95, 'milhões/mm³', null, null, 4.5, 5.9, false, null, null, null, 'alta'),
  ('persona-roberto', '2022-08', 'exame', 'hemoglobina', '2022-08-17', 'HEMOGLOBINA', '14,7', 'g/dL', 'Homens: 13,5 a 17,5 g/dL
Mulheres: 12,0 a 15,5 g/dL', 1, 14.7, 'g/dL', null, null, 13.5, 17.5, false, null, null, null, 'alta'),
  ('persona-roberto', '2022-08', 'exame', 'hematocrito', '2022-08-17', 'HEMATÓCRITO', '45,0', '%', 'Homens: 41 a 53 %
Mulheres: 36 a 46 %', 1, 45, '%', null, null, 41, 53, false, null, null, null, 'alta'),
  ('persona-roberto', '2022-08', 'exame', 'leucocitos', '2022-08-17', 'LEUCÓCITOS TOTAIS', '7.460', '/µL', '4.000 a 11.000 /µL', 1, 7460, '/mm³', null, null, 4000, 11000, false, null, null, null, 'alta'),
  ('persona-roberto', '2022-08', 'exame', 'plaquetas', '2022-08-17', 'CONTAGEM DE PLAQUETAS', '223', 'mil/µL', '150 a 450 mil/µL', 1, 223000, '/mm³', null, null, 150000, 450000, false, null, null, null, 'alta'),
  ('persona-roberto', '2022-08', 'exame', 'glicose', '2022-08-17', 'GLICOSE', '105', 'mg/dL', 'Normal: 70 a 99 mg/dL
Glicemia de jejum alterada: 100 a 125 mg/dL
Diabetes: igual ou superior a 126 mg/dL', 1, 105, 'mg/dL', null, null, 70, 99, true, null, null, null, 'alta'),
  ('persona-roberto', '2022-08', 'exame', 'hba1c', '2022-08-17', 'HEMOGLOBINA GLICADA - HbA1c', '5,9', '%', 'Normal: inferior a 5,7%
Pré-diabetes: 5,7% a 6,4%
Diabetes: igual ou superior a 6,5%', 1, 5.9, '%', null, null, null, 5.7, true, null, null, null, 'alta'),
  ('persona-roberto', '2022-08', 'exame', 'colesterol_total', '2022-08-17', 'COLESTEROL TOTAL', '223', 'mg/dL', 'Desejável: inferior a 190 mg/dL', 1, 223, 'mg/dL', null, null, null, 190, true, null, null, null, 'alta'),
  ('persona-roberto', '2022-08', 'exame', 'hdl', '2022-08-17', 'HDL-COLESTEROL', '44', 'mg/dL', 'Desejável: superior a 40 mg/dL', 2, 44, 'mg/dL', null, null, 40, null, false, null, null, null, 'alta'),
  ('persona-roberto', '2022-08', 'exame', 'ldl', '2022-08-17', 'LDL-COLESTEROL', '147', 'mg/dL', 'Meta conforme categoria de risco:
Baixo: inferior a 130 mg/dL
Intermediário: inferior a 100 mg/dL
Alto: inferior a 70 mg/dL
Muito alto: inferior a 50 mg/dL', 2, 147, 'mg/dL', null, null, null, 130, true, null, null, null, 'alta'),
  ('persona-roberto', '2022-08', 'exame', 'triglicerides', '2022-08-17', 'TRIGLICÉRIDES', '165', 'mg/dL', 'Desejável (com jejum): inferior a 150 mg/dL
Desejável (sem jejum): inferior a 175 mg/dL', 2, 165, 'mg/dL', null, null, null, 150, true, null, null, null, 'alta'),
  ('persona-roberto', '2022-08', 'exame', 'creatinina', '2022-08-17', 'CREATININA', '1,07', 'mg/dL', 'Homens: 0,70 a 1,30 mg/dL
Mulheres: 0,50 a 1,10 mg/dL', 2, 1.07, 'mg/dL', null, null, 0.7, 1.3, false, null, null, null, 'alta'),
  ('persona-roberto', '2022-08', 'exame', 'acido_urico', '2022-08-17', 'ÁCIDO ÚRICO', '7,1', 'mg/dL', 'Homens: 3,5 a 7,2 mg/dL
Mulheres: 2,6 a 6,0 mg/dL', 2, 7.1, 'mg/dL', null, null, 3.5, 7.2, false, null, null, null, 'alta'),
  ('persona-roberto', '2022-08', 'exame', 'tgo', '2022-08-17', 'ASPARTATO AMINOTRANSFERASE', '29', 'U/L', 'Homens: até 40 U/L
Mulheres: até 32 U/L', 2, 29, 'U/L', null, null, null, 40, false, null, null, null, 'alta'),
  ('persona-roberto', '2022-08', 'exame', 'tgp', '2022-08-17', 'ALANINA AMINOTRANSFERASE', '35', 'U/L', 'Homens: até 41 U/L
Mulheres: até 33 U/L', 2, 35, 'U/L', null, null, null, 41, false, null, null, null, 'alta'),
  ('persona-roberto', '2022-08', 'exame', 'tsh', '2022-08-17', 'HORMÔNIO TIREOESTIMULANTE (TSH)', '2,50', 'µUI/mL', 'Adultos: 0,40 a 4,30 µUI/mL', 2, 2.5, 'µUI/mL', null, null, 0.4, 4.3, false, null, null, null, 'alta'),
  ('persona-roberto', '2022-08', 'exame', 'psa', '2022-08-17', 'ANTÍGENO PROSTÁTICO ESPECÍFICO (PSA) TOTAL', '1,16', 'ng/mL', 'Até 4,0 ng/mL
(o valor de corte pode variar com a idade)', 3, 1.16, 'ng/mL', null, null, null, 4, false, null, null, null, 'alta'),
  ('persona-roberto', '2022-08', 'exame', 'vitamina_d', '2022-08-17', '25-HIDROXIVITAMINA D', '22,4', 'ng/mL', 'Deficiência: inferior a 20 ng/mL
Insuficiência: 20 a 29 ng/mL
Suficiência: 30 a 100 ng/mL
Risco de toxicidade: superior a 100 ng/mL', 3, 22.4, 'ng/mL', null, null, 30, 100, true, null, null, null, 'alta'),
  ('persona-roberto', '2023-09', 'exame', 'hemacias', '2023-09-05', 'ERITRÓCITOS', '4,93', 'milhões/µL', 'Homens: 4,50 a 5,90 milhões/µL
Mulheres: 4,00 a 5,20 milhões/µL', 1, 4.93, 'milhões/mm³', null, null, 4.5, 5.9, false, null, null, null, 'alta'),
  ('persona-roberto', '2023-09', 'exame', 'hemoglobina', '2023-09-05', 'HEMOGLOBINA', '14,8', 'g/dL', 'Homens: 13,5 a 17,5 g/dL
Mulheres: 12,0 a 15,5 g/dL', 1, 14.8, 'g/dL', null, null, 13.5, 17.5, false, null, null, null, 'alta'),
  ('persona-roberto', '2023-09', 'exame', 'hematocrito', '2023-09-05', 'HEMATÓCRITO', '44,8', '%', 'Homens: 41 a 53 %
Mulheres: 36 a 46 %', 1, 44.8, '%', null, null, 41, 53, false, null, null, null, 'alta'),
  ('persona-roberto', '2023-09', 'exame', 'leucocitos', '2023-09-05', 'LEUCÓCITOS TOTAIS', '6.960', '/µL', '4.000 a 11.000 /µL', 1, 6960, '/mm³', null, null, 4000, 11000, false, null, null, null, 'alta'),
  ('persona-roberto', '2023-09', 'exame', 'plaquetas', '2023-09-05', 'CONTAGEM DE PLAQUETAS', '226', 'mil/µL', '150 a 450 mil/µL', 1, 226000, '/mm³', null, null, 150000, 450000, false, null, null, null, 'alta'),
  ('persona-roberto', '2023-09', 'exame', 'glicose', '2023-09-05', 'GLICOSE', '106', 'mg/dL', 'Normal: 70 a 99 mg/dL
Glicemia de jejum alterada: 100 a 125 mg/dL
Diabetes: igual ou superior a 126 mg/dL', 1, 106, 'mg/dL', null, null, 70, 99, true, null, null, null, 'alta'),
  ('persona-roberto', '2023-09', 'exame', 'hba1c', '2023-09-05', 'HEMOGLOBINA GLICADA - HbA1c', '6,0', '%', 'Normal: inferior a 5,7%
Pré-diabetes: 5,7% a 6,4%
Diabetes: igual ou superior a 6,5%', 1, 6, '%', null, null, null, 5.7, true, null, null, null, 'alta'),
  ('persona-roberto', '2023-09', 'exame', 'colesterol_total', '2023-09-05', 'COLESTEROL TOTAL', '227', 'mg/dL', 'Desejável: inferior a 190 mg/dL', 1, 227, 'mg/dL', null, null, null, 190, true, null, null, null, 'alta'),
  ('persona-roberto', '2023-09', 'exame', 'hdl', '2023-09-05', 'HDL-COLESTEROL', '43', 'mg/dL', 'Desejável: superior a 40 mg/dL', 2, 43, 'mg/dL', null, null, 40, null, false, null, null, null, 'alta'),
  ('persona-roberto', '2023-09', 'exame', 'ldl', '2023-09-05', 'LDL-COLESTEROL', '152', 'mg/dL', 'Meta conforme categoria de risco:
Baixo: inferior a 130 mg/dL
Intermediário: inferior a 100 mg/dL
Alto: inferior a 70 mg/dL
Muito alto: inferior a 50 mg/dL', 2, 152, 'mg/dL', null, null, null, 130, true, null, null, null, 'alta'),
  ('persona-roberto', '2023-09', 'exame', 'triglicerides', '2023-09-05', 'TRIGLICÉRIDES', '168', 'mg/dL', 'Desejável (com jejum): inferior a 150 mg/dL
Desejável (sem jejum): inferior a 175 mg/dL', 2, 168, 'mg/dL', null, null, null, 150, true, null, null, null, 'alta'),
  ('persona-roberto', '2023-09', 'exame', 'creatinina', '2023-09-05', 'CREATININA', '1,02', 'mg/dL', 'Homens: 0,70 a 1,30 mg/dL
Mulheres: 0,50 a 1,10 mg/dL', 2, 1.02, 'mg/dL', null, null, 0.7, 1.3, false, null, null, null, 'alta'),
  ('persona-roberto', '2023-09', 'exame', 'acido_urico', '2023-09-05', 'ÁCIDO ÚRICO', '7,1', 'mg/dL', 'Homens: 3,5 a 7,2 mg/dL
Mulheres: 2,6 a 6,0 mg/dL', 2, 7.1, 'mg/dL', null, null, 3.5, 7.2, false, null, null, null, 'alta'),
  ('persona-roberto', '2023-09', 'exame', 'tgo', '2023-09-05', 'ASPARTATO AMINOTRANSFERASE', '27', 'U/L', 'Homens: até 40 U/L
Mulheres: até 32 U/L', 2, 27, 'U/L', null, null, null, 40, false, null, null, null, 'alta'),
  ('persona-roberto', '2023-09', 'exame', 'tgp', '2023-09-05', 'ALANINA AMINOTRANSFERASE', '32', 'U/L', 'Homens: até 41 U/L
Mulheres: até 33 U/L', 2, 32, 'U/L', null, null, null, 41, false, null, null, null, 'alta'),
  ('persona-roberto', '2023-09', 'exame', 'tsh', '2023-09-05', 'HORMÔNIO TIREOESTIMULANTE (TSH)', '2,27', 'µUI/mL', 'Adultos: 0,40 a 4,30 µUI/mL', 2, 2.27, 'µUI/mL', null, null, 0.4, 4.3, false, null, null, null, 'alta'),
  ('persona-roberto', '2023-09', 'exame', 'psa', '2023-09-05', 'ANTÍGENO PROSTÁTICO ESPECÍFICO (PSA) TOTAL', '1,28', 'ng/mL', 'Até 4,0 ng/mL
(o valor de corte pode variar com a idade)', 3, 1.28, 'ng/mL', null, null, null, 4, false, null, null, null, 'alta'),
  ('persona-roberto', '2024-03', 'exame', 'hemacias', '2024-03-20', 'Hemácias', '4,99', 'x10¹²/L', '(4,50 a 5,90)', 1, 4.99, 'milhões/mm³', null, null, 4.5, 5.9, false, null, null, null, 'alta'),
  ('persona-roberto', '2024-03', 'exame', 'hemoglobina', '2024-03-20', 'Hb', '14,9', 'g/dL', '(13,5 a 17,5)', 1, 14.9, 'g/dL', null, null, 13.5, 17.5, false, null, null, null, 'alta'),
  ('persona-roberto', '2024-03', 'exame', 'hematocrito', '2024-03-20', 'Ht', '43,8', '%', '(40 a 52)', 1, 43.8, '%', null, null, 40, 52, false, null, null, null, 'alta'),
  ('persona-roberto', '2024-03', 'exame', 'leucocitos', '2024-03-20', 'Leucócitos', '7,04', 'mil/mm³', '(4,00 a 10,00)', 1, 7040, '/mm³', null, null, 4000, 10000, false, null, null, null, 'alta'),
  ('persona-roberto', '2024-03', 'exame', 'plaquetas', '2024-03-20', 'Plaquetas', '243', 'mil/mm³', '(150 a 400)', 1, 243000, '/mm³', null, null, 150000, 400000, false, null, null, null, 'alta'),
  ('persona-roberto', '2024-03', 'exame', 'glicose', '2024-03-20', 'Glicose - jejum', '109', 'mg/dL', '(70 a 99)', 1, 109, 'mg/dL', null, null, 70, 99, true, null, null, null, 'alta'),
  ('persona-roberto', '2024-03', 'exame', 'hba1c', '2024-03-20', 'HbA1c', '6,0', '%', '(< 5,7)', 1, 6, '%', null, null, null, 5.7, true, null, null, null, 'alta'),
  ('persona-roberto', '2024-03', 'exame', 'colesterol_total', '2024-03-20', 'Colesterol Total', '231', 'mg/dL', '(< 190)', 1, 231, 'mg/dL', null, null, null, 190, true, null, null, null, 'alta'),
  ('persona-roberto', '2024-03', 'exame', 'hdl', '2024-03-20', 'HDL Colesterol', '43', 'mg/dL', '(> 40)', 1, 43, 'mg/dL', null, null, 40, null, false, null, null, null, 'alta'),
  ('persona-roberto', '2024-03', 'exame', 'ldl', '2024-03-20', 'LDL Colesterol', '153', 'mg/dL', '(baixo <130; interm. <100; alto <70; muito alto <50)', 1, 153, 'mg/dL', null, null, null, 130, true, null, null, null, 'alta'),
  ('persona-roberto', '2024-03', 'exame', 'triglicerides', '2024-03-20', 'Triglicérides', '177', 'mg/dL', '(< 150)', 1, 177, 'mg/dL', null, null, null, 150, true, null, null, null, 'alta'),
  ('persona-roberto', '2024-03', 'exame', 'creatinina', '2024-03-20', 'Creatinina sérica', '1,07', 'mg/dL', '(0,70 a 1,30)', 1, 1.07, 'mg/dL', null, null, 0.7, 1.3, false, null, null, null, 'alta'),
  ('persona-roberto', '2024-03', 'exame', 'acido_urico', '2024-03-20', 'Ácido Úrico', '7,2', 'mg/dL', '(3,5 a 7,2)', 1, 7.2, 'mg/dL', null, null, 3.5, 7.2, false, null, null, null, 'alta'),
  ('persona-roberto', '2024-03', 'exame', 'tgo', '2024-03-20', 'AST/TGO', '28', 'U/L', '(até 40)', 1, 28, 'U/L', null, null, null, 40, false, null, null, null, 'alta'),
  ('persona-roberto', '2024-03', 'exame', 'tgp', '2024-03-20', 'ALT/TGP', '29', 'U/L', '(até 41)', 1, 29, 'U/L', null, null, null, 41, false, null, null, null, 'alta'),
  ('persona-roberto', '2024-03', 'exame', 'tsh', '2024-03-20', 'TSH ultrassensível', '2,27', 'µUI/mL', '(0,45 a 4,50)', 1, 2.27, 'µUI/mL', null, null, 0.45, 4.5, false, null, null, null, 'alta'),
  ('persona-roberto', '2024-03', 'exame', 'psa', '2024-03-20', 'PSA Total', '1,31', 'ng/mL', '(< 4,0)', 1, 1.31, 'ng/mL', null, null, null, 4, false, null, null, null, 'alta'),
  ('persona-roberto', '2024-03', 'exame', 'vitamina_d', '2024-03-20', 'Vitamina D (25-OH)', '31,8', 'ng/mL', '(> 20)', 1, 31.8, 'ng/mL', null, null, 20, null, false, null, null, null, 'alta'),
  ('persona-roberto', '2025-03', 'exame', 'hemacias', '2025-03-11', 'Hemácias', '4,91', 'x10¹²/L', '(4,50 a 5,90)', 1, 4.91, 'milhões/mm³', null, null, 4.5, 5.9, false, null, null, null, 'alta'),
  ('persona-roberto', '2025-03', 'exame', 'hemoglobina', '2025-03-11', 'Hb', '14,6', 'g/dL', '(13,5 a 17,5)', 1, 14.6, 'g/dL', null, null, 13.5, 17.5, false, null, null, null, 'alta'),
  ('persona-roberto', '2025-03', 'exame', 'hematocrito', '2025-03-11', 'Ht', '43,3', '%', '(40 a 52)', 1, 43.3, '%', null, null, 40, 52, false, null, null, null, 'alta'),
  ('persona-roberto', '2025-03', 'exame', 'leucocitos', '2025-03-11', 'Leucócitos', '6,94', 'mil/mm³', '(4,00 a 10,00)', 1, 6940, '/mm³', null, null, 4000, 10000, false, null, null, null, 'alta'),
  ('persona-roberto', '2025-03', 'exame', 'plaquetas', '2025-03-11', 'Plaquetas', '225', 'mil/mm³', '(150 a 400)', 1, 225000, '/mm³', null, null, 150000, 400000, false, null, null, null, 'alta'),
  ('persona-roberto', '2025-03', 'exame', 'glicose', '2025-03-11', 'Glicose - jejum', '111', 'mg/dL', '(70 a 99)', 1, 111, 'mg/dL', null, null, 70, 99, true, null, null, null, 'alta'),
  ('persona-roberto', '2025-03', 'exame', 'hba1c', '2025-03-11', 'HbA1c', '6,2', '%', '(< 5,7)', 1, 6.2, '%', null, null, null, 5.7, true, null, null, null, 'alta'),
  ('persona-roberto', '2025-03', 'exame', 'colesterol_total', '2025-03-11', 'Colesterol Total', '236', 'mg/dL', '(< 190)', 1, 236, 'mg/dL', null, null, null, 190, true, null, null, null, 'alta'),
  ('persona-roberto', '2025-03', 'exame', 'hdl', '2025-03-11', 'HDL Colesterol', '41', 'mg/dL', '(> 40)', 1, 41, 'mg/dL', null, null, 40, null, false, null, null, null, 'alta'),
  ('persona-roberto', '2025-03', 'exame', 'ldl', '2025-03-11', 'LDL Colesterol', '158', 'mg/dL', '(baixo <130; interm. <100; alto <70; muito alto <50)', 1, 158, 'mg/dL', null, null, null, 130, true, null, null, null, 'alta'),
  ('persona-roberto', '2025-03', 'exame', 'triglicerides', '2025-03-11', 'Triglicérides', '182', 'mg/dL', '(< 150)', 1, 182, 'mg/dL', null, null, null, 150, true, null, null, null, 'alta'),
  ('persona-roberto', '2025-03', 'exame', 'creatinina', '2025-03-11', 'Creatinina sérica', '1,05', 'mg/dL', '(0,70 a 1,30)', 1, 1.05, 'mg/dL', null, null, 0.7, 1.3, false, null, null, null, 'alta'),
  ('persona-roberto', '2025-03', 'exame', 'acido_urico', '2025-03-11', 'Ácido Úrico', '7,3', 'mg/dL', '(3,5 a 7,2)', 1, 7.3, 'mg/dL', null, null, 3.5, 7.2, true, null, null, null, 'alta'),
  ('persona-roberto', '2025-03', 'exame', 'tgo', '2025-03-11', 'AST/TGO', '29', 'U/L', '(até 40)', 1, 29, 'U/L', null, null, null, 40, false, null, null, null, 'alta'),
  ('persona-roberto', '2025-03', 'exame', 'tgp', '2025-03-11', 'ALT/TGP', '33', 'U/L', '(até 41)', 1, 33, 'U/L', null, null, null, 41, false, null, null, null, 'alta'),
  ('persona-roberto', '2025-03', 'exame', 'tsh', '2025-03-11', 'TSH ultrassensível', '2,12', 'µUI/mL', '(0,45 a 4,50)', 1, 2.12, 'µUI/mL', null, null, 0.45, 4.5, false, null, null, null, 'alta'),
  ('persona-roberto', '2025-03', 'exame', 'psa', '2025-03-11', 'PSA Total', '1,34', 'ng/mL', '(< 4,0)', 1, 1.34, 'ng/mL', null, null, null, 4, false, null, null, null, 'alta'),
  ('persona-roberto', '2025-05', 'exame', 'glicose', '2025-05-27', 'Glicemia de jejum', '111', 'mg/dL', '70 a 99 mg/dL', 1, 111, 'mg/dL', null, null, 70, 99, true, null, null, null, 'alta'),
  ('persona-roberto', '2025-05', 'exame', 'colesterol_total', '2025-05-27', 'Colesterol total', '236', 'mg/dL', 'Desejável: < 190 mg/dL', 1, 236, 'mg/dL', null, null, null, 190, true, null, null, null, 'alta'),
  ('persona-roberto', '2025-05', 'exame', 'hdl', '2025-05-27', 'Colesterol HDL', '41', 'mg/dL', 'Desejável: > 40 mg/dL', 1, 41, 'mg/dL', null, null, 40, null, false, null, null, null, 'alta'),
  ('persona-roberto', '2025-05', 'exame', 'ldl', '2025-05-27', 'Colesterol LDL (calculado - Friedewald)', '161', 'mg/dL', 'Risco baixo: < 130 mg/dL
Risco intermediário: < 100 mg/dL
Risco alto: < 70 mg/dL
Risco muito alto: < 50 mg/dL', 1, 161, 'mg/dL', null, null, null, 130, true, null, null, null, 'alta'),
  ('persona-roberto', '2025-05', 'exame', 'triglicerides', '2025-05-27', 'Triglicerídeos', '187', 'mg/dL', 'Desejável: < 150 mg/dL', 1, 187, 'mg/dL', null, null, null, 150, true, null, null, null, 'alta'),
  ('persona-roberto', '2026-03', 'exame', 'hemacias', '2026-03-12', 'Hemácias', '4,94', 'x10¹²/L', '(4,50 a 5,90)', 1, 4.94, 'milhões/mm³', null, null, 4.5, 5.9, false, null, null, null, 'alta'),
  ('persona-roberto', '2026-03', 'exame', 'hemoglobina', '2026-03-12', 'Hb', '14,8', 'g/dL', '(13,5 a 17,5)', 1, 14.8, 'g/dL', null, null, 13.5, 17.5, false, null, null, null, 'alta'),
  ('persona-roberto', '2026-03', 'exame', 'hematocrito', '2026-03-12', 'Ht', '43,5', '%', '(40 a 52)', 1, 43.5, '%', null, null, 40, 52, false, null, null, null, 'alta'),
  ('persona-roberto', '2026-03', 'exame', 'leucocitos', '2026-03-12', 'Leucócitos', '7,17', 'mil/mm³', '(4,00 a 10,00)', 1, 7170, '/mm³', null, null, 4000, 10000, false, null, null, null, 'alta'),
  ('persona-roberto', '2026-03', 'exame', 'plaquetas', '2026-03-12', 'Plaquetas', '239', 'mil/mm³', '(150 a 400)', 1, 239000, '/mm³', null, null, 150000, 400000, false, null, null, null, 'alta'),
  ('persona-roberto', '2026-03', 'exame', 'glicose', '2026-03-12', 'Glicose - jejum', '112', 'mg/dL', '(70 a 99)', 1, 112, 'mg/dL', null, null, 70, 99, true, null, null, null, 'alta'),
  ('persona-roberto', '2026-03', 'exame', 'hba1c', '2026-03-12', 'HbA1c', '6,2', '%', '(< 5,7)', 1, 6.2, '%', null, null, null, 5.7, true, null, null, null, 'alta'),
  ('persona-roberto', '2026-03', 'exame', 'colesterol_total', '2026-03-12', 'Colesterol Total', '238', 'mg/dL', '(< 190)', 1, 238, 'mg/dL', null, null, null, 190, true, null, null, null, 'alta'),
  ('persona-roberto', '2026-03', 'exame', 'hdl', '2026-03-12', 'HDL Colesterol', '42', 'mg/dL', '(> 40)', 1, 42, 'mg/dL', null, null, 40, null, false, null, null, null, 'alta'),
  ('persona-roberto', '2026-03', 'exame', 'ldl', '2026-03-12', 'LDL Colesterol', '164', 'mg/dL', '(baixo <130; interm. <100; alto <70; muito alto <50)', 1, 164, 'mg/dL', null, null, null, 130, true, null, null, null, 'alta'),
  ('persona-roberto', '2026-03', 'exame', 'triglicerides', '2026-03-12', 'Triglicérides', '180', 'mg/dL', '(< 150)', 1, 180, 'mg/dL', null, null, null, 150, true, null, null, null, 'alta'),
  ('persona-roberto', '2026-03', 'exame', 'creatinina', '2026-03-12', 'Creatinina sérica', '1,05', 'mg/dL', '(0,70 a 1,30)', 1, 1.05, 'mg/dL', null, null, 0.7, 1.3, false, null, null, null, 'alta'),
  ('persona-roberto', '2026-03', 'exame', 'acido_urico', '2026-03-12', 'Ácido Úrico', '7,3', 'mg/dL', '(3,5 a 7,2)', 1, 7.3, 'mg/dL', null, null, 3.5, 7.2, true, null, null, null, 'alta'),
  ('persona-roberto', '2026-03', 'exame', 'tgo', '2026-03-12', 'AST/TGO', '27', 'U/L', '(até 40)', 1, 27, 'U/L', null, null, null, 40, false, null, null, null, 'alta'),
  ('persona-roberto', '2026-03', 'exame', 'tgp', '2026-03-12', 'ALT/TGP', '35', 'U/L', '(até 41)', 1, 35, 'U/L', null, null, null, 41, false, null, null, null, 'alta'),
  ('persona-roberto', '2026-03', 'exame', 'tsh', '2026-03-12', 'TSH ultrassensível', '2,20', 'µUI/mL', '(0,45 a 4,50)', 1, 2.2, 'µUI/mL', null, null, 0.45, 4.5, false, null, null, null, 'alta'),
  ('persona-roberto', '2026-03', 'exame', 'psa', '2026-03-12', 'PSA Total', '1,42', 'ng/mL', '(< 4,0)', 1, 1.42, 'ng/mL', null, null, null, 4, false, null, null, null, 'alta'),
  ('persona-roberto', 'vacinas-caderneta', 'vacina', 'dt', '2004-06-15', 'DUPLA ADULTO (dT) - DIFTERIA E TÉTANO', 'Ref.', null, null, 1, null, null, null, null, null, null, false, 'reforco', 'DT0412A', 'AMA Parque Exemplo', 'alta'),
  ('persona-roberto', 'vacinas-caderneta', 'vacina', 'hepatite_b', '2009-03-10', 'HEPATITE B', '1ª dose', null, null, 1, null, null, null, null, null, null, false, '1', 'HB0903', 'Drogaria Saúde Fictícia', 'alta'),
  ('persona-roberto', 'vacinas-caderneta', 'vacina', 'hepatite_b', '2009-04-14', 'HEPATITE B', '2ª dose', null, null, 1, null, null, null, null, null, null, false, '2', 'HB0904', 'AMA Parque Exemplo', 'alta'),
  ('persona-roberto', 'vacinas-caderneta', 'vacina', 'dt', '2014-08-20', 'DUPLA ADULTO (dT) - DIFTERIA E TÉTANO', 'Ref.', null, null, 1, null, null, null, null, null, null, false, 'reforco', 'DT1408C', 'AMA Parque Exemplo', 'alta'),
  ('persona-roberto', 'vacinas-caderneta', 'vacina', 'febre_amarela', '2018-02-05', 'FEBRE AMARELA', 'Dose única', null, null, 1, null, null, null, null, null, null, false, 'unica', 'FA1802X', 'UBS Vila Modelo', 'alta'),
  ('persona-roberto', 'vacinas-caderneta', 'vacina', 'influenza', '2019-04-22', 'GRIPE (INFLUENZA)', 'Dose anual', null, null, 1, null, null, null, null, null, null, false, 'anual', 'FLU19B', 'Drogaria Saúde Fictícia', 'alta'),
  ('persona-roberto', 'vacinas-caderneta', 'vacina', 'triplice_viral', '2019-08-20', 'TRÍPLICE VIRAL (SARAMPO, CAXUMBA, RUBÉOLA)', '1ª dose', null, null, 1, null, null, null, null, null, null, false, '1', 'SCR1908', 'Drogaria Saúde Fictícia', 'alta'),
  ('persona-roberto', 'vacinas-comprovante', 'vacina', 'febre_amarela', '2018-02-05', 'Febre Amarela (atenuada)', 'Dose Única', null, null, 1, null, null, null, null, null, null, false, 'unica', 'FA1802X', 'Drogaria Saúde Fictícia', 'alta'),
  ('persona-roberto', 'vacinas-comprovante', 'vacina', 'influenza', '2021-05-10', 'Influenza Trivalente', 'Dose', null, null, 1, null, null, null, null, null, null, false, 'anual', 'FLU21A', 'UBS Jardim Fictício', 'alta'),
  ('persona-roberto', 'vacinas-comprovante', 'vacina', 'covid19', '2021-07-15', 'COVID-19 (vetor viral)', '1ª Dose', null, null, 1, null, null, null, null, null, null, false, '1', 'CV2107K', 'Drogaria Saúde Fictícia', 'alta'),
  ('persona-roberto', 'vacinas-comprovante', 'vacina', 'covid19', '2021-10-07', 'COVID-19 (vetor viral)', '2ª Dose', null, null, 1, null, null, null, null, null, null, false, '2', 'CV2110M', 'Drogaria Saúde Fictícia', 'alta'),
  ('persona-roberto', 'vacinas-comprovante', 'vacina', 'covid19', '2022-01-20', 'COVID-19 (RNAm)', 'Reforço', null, null, 1, null, null, null, null, null, null, false, 'reforco', 'CV2201R', 'UBS Vila Modelo', 'alta'),
  ('persona-roberto', 'vacinas-comprovante', 'vacina', 'influenza', '2022-05-03', 'Influenza Trivalente', 'Dose', null, null, 1, null, null, null, null, null, null, false, 'anual', 'FLU22C', 'UBS Jardim Fictício', 'alta'),
  ('persona-roberto', 'vacinas-comprovante', 'vacina', 'covid19', '2023-04-10', 'COVID-19 Bivalente (RNAm)', 'Reforço Bivalente', null, null, 1, null, null, null, null, null, null, false, 'reforco', 'CVB2304', 'AMA Parque Exemplo', 'alta'),
  ('persona-roberto', 'vacinas-comprovante', 'vacina', 'influenza', '2023-04-28', 'Influenza Trivalente', 'Dose', null, null, 1, null, null, null, null, null, null, false, 'anual', 'FLU23D', 'UBS Vila Modelo', 'alta'),
  ('persona-roberto', 'vacinas-comprovante', 'vacina', 'influenza', '2024-04-15', 'Influenza Trivalente', 'Dose', null, null, 1, null, null, null, null, null, null, false, 'anual', 'FLU24A', 'UBS Vila Modelo', 'alta'),
  ('persona-roberto', 'vacinas-comprovante', 'vacina', 'influenza', '2025-05-12', 'Influenza Trivalente', 'Dose', null, null, 1, null, null, null, null, null, null, false, 'anual', 'FLU25F', 'Drogaria Saúde Fictícia', 'alta');
