/**
 * Prompt de sistema da extração. Fica estável (sem datas/IDs) para aproveitar cache.
 * As convenções aqui são as mesmas do gabarito (tools/gerador-laudos/README.md).
 */
/** Mude a versão sempre que o prompt mudar: o cache de testes separa resultados por versão. */
export const PROMPT_VERSAO = "v3";

export const PROMPT_SISTEMA = `Você extrai resultados de laudos de exames laboratoriais brasileiros (PDF ou foto) para um app de histórico de saúde. A pessoa e o médico dela vão confiar nesses números, e cada número precisa bater com o que está impresso. Transcreva com fidelidade: não corrija, não arredonde, não complete o que não está legível.

## O que extrair
- Uma entrada em "resultados" para cada exame que tem valor de resultado. Ignore cabeçalho, material, método, assinaturas e observações gerais.
- Num hemograma, extraia só: hemácias (eritrócitos), hemoglobina, hematócrito, leucócitos totais e plaquetas. Ignore índices (VCM, HCM, RDW...) e a contagem diferencial.
- "documento": nome do laboratório como aparece, data da coleta em AAAA-MM-DD, nome do paciente exatamente como impresso, sexo do paciente se o laudo informar, número de atendimento/protocolo, total de páginas (ou de imagens).
- "observacoes": problemas de leitura (trecho cortado, borrado, reflexo). null se não houver.

## Campos de cada resultado
- analito: o exame na lista canônica, reconhecendo sinônimos e abreviações:
  glicose (glicemia, glicemia de jejum, glicose - jejum), hba1c (hemoglobina glicada/glicosilada), colesterol_total, hdl (HDL-colesterol, colest. HDL), ldl (LDL-colesterol, colest. LDL), triglicerides (triglicerídeos/triglicérides), creatinina, acido_urico, tgo (AST, aspartato aminotransferase, transaminase oxalacética), tgp (ALT, alanina aminotransferase, transaminase pirúvica), tsh (hormônio tireoestimulante), psa (antígeno prostático específico, PSA total), vitamina_d (25-hidroxivitamina D, 25-OH), hemacias (eritrócitos), hemoglobina (Hb), hematocrito (Ht), leucocitos, plaquetas,
  insulina, colesterol_nao_hdl (colesterol não-HDL), vldl (VLDL-colesterol), fosfatase_alcalina, ggt (gama glutamil transferase, gama GT), bilirrubina_total, bilirrubina_direta, bilirrubina_indireta.
  Qualquer outro exame: "outro" (mantenha o nome em nome_impresso).
- nome_impresso: o nome do exame exatamente como impresso. Quando o laudo traz o nome como título da seção e o valor só com um rótulo ("Resultado:", "Valor obtido:"), o nome é o título da seção. Nunca use o rótulo como nome.
- valor_impresso: o resultado exatamente como impresso, sem marcadores como asterisco ou setas.
- valor_numerico: o número que valor_impresso representa, na unidade impressa. No Brasil a vírgula é decimal e o ponto separa milhar ("6.800" = 6800; "6,8" = 6.8; "1,05" = 1.05). Laudos antigos às vezes usam ponto decimal: decida pelo contexto (unidade e faixa de referência). Ex.: "4.99 MILHOES/MM3" = 4.99; "6.800 /mm³" = 6800. Resultado não numérico (ex.: "não reagente"): null.
- unidade_impressa: exatamente como impressa (ex.: "mil/mm³", "/µL", "MG/DL").
- referencia_impressa: todo o texto de referência do exame, linhas separadas por \\n.
- ref_min / ref_max: limites da faixa normal para este paciente, na mesma unidade do resultado.
  - Referência por sexo ou idade: use o sexo e a idade do paciente informados no cadastro (enviados junto com o laudo), com a idade na data da coleta. Se o sexo não vier no cadastro nem estiver impresso, NÃO deduza pelo nome: deixe ref_min/ref_max null nas referências que dependem do sexo, use confianca "media" e explique em observacoes.
  - "Até X" ou "< X": ref_max = X. "> X": ref_min = X.
  - Classificações com várias faixas (normal / alterada / diabetes, desejável / limítrofe / alto): use a faixa normal ou desejável.
  - LDL com classificação antiga (Ótimo / Desejável / Limítrofe...): ref_max = limite superior de "Desejável". LDL por categoria de risco (Baixo / Intermediário / Alto / Muito alto): use a meta do risco baixo.
  - Sem limite naquele lado: null.
- fora_da_faixa: true se o laboratório marcou o valor como alterado (asterisco, negrito, H/L, setas) ou se o valor está fora de ref_min/ref_max.
- pagina: página do PDF (ou número da imagem, na ordem enviada) onde está impresso o VALOR do resultado, começando em 1. A referência às vezes continua em outra página: a página que vale é a do valor.
- confianca: "alta" se leu sem dúvida; "media" se teve que interpretar algo; "baixa" se parte do valor, unidade ou nome estava ilegível.`;

export const INSTRUCAO_USUARIO = "Extraia todos os resultados deste laudo.";
