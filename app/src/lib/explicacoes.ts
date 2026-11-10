/**
 * "Entender este exame": texto fixo, em linguagem simples, por analito.
 * Educativo e genérico (nunca diagnóstico nem prescrição); "o que ajuda" são hábitos de bom senso,
 * e quem decide o que fazer com um resultado é o médico.
 */
export type Explicacao = { oQueE: string; porQueImporta: string; oQueAjuda: string };

export const EXPLICACOES: Record<string, Explicacao> = {
  glicose: {
    oQueE: "A quantidade de açúcar no sangue depois de algumas horas sem comer.",
    porQueImporta:
      "Valores acima da faixa por muito tempo podem indicar pré-diabetes ou diabetes, que costumam não dar sintomas no começo.",
    oQueAjuda: "Menos açúcar e farinha branca, mais fibras, atividade física regular e sono em dia.",
  },
  hba1c: {
    oQueE: "Mostra a média do açúcar no sangue dos últimos 2 a 3 meses, não só do dia do exame.",
    porQueImporta: "É um dos exames usados para acompanhar o risco de diabetes ao longo do tempo.",
    oQueAjuda: "Os mesmos hábitos da glicose: alimentação com menos açúcar, movimento e controle do peso.",
  },
  colesterol_total: {
    oQueE: "A soma das gorduras do tipo colesterol que circulam no sangue (o “bom” e o “ruim”).",
    porQueImporta: "Sozinho diz pouco; ajuda a ver o quadro junto com o LDL e o HDL.",
    oQueAjuda: "Menos frituras e gordura saturada, mais fibras, peixes e azeite, e atividade física.",
  },
  hdl: {
    oQueE: "O colesterol “bom”, que ajuda a tirar o excesso de gordura dos vasos.",
    porQueImporta: "Valores baixos estão ligados a mais risco para o coração.",
    oQueAjuda: "Exercício aeróbico regular, não fumar e gorduras boas (azeite, castanhas, peixes).",
  },
  ldl: {
    oQueE: "O colesterol “ruim”, que pode se depositar na parede das artérias.",
    porQueImporta: "É o principal número que o médico olha para avaliar o risco de infarto e AVC ao longo dos anos.",
    oQueAjuda: "Menos gordura saturada e ultraprocessados, mais fibras e movimento. Às vezes o médico indica remédio.",
  },
  triglicerides: {
    oQueE: "Um tipo de gordura no sangue que sobe com açúcar, álcool e excesso de calorias.",
    porQueImporta: "Valores altos se somam ao colesterol no risco para o coração e podem afetar o pâncreas.",
    oQueAjuda: "Menos açúcar, doces e bebida alcoólica, e atividade física.",
  },
  creatinina: {
    oQueE: "Uma substância que os músculos produzem e os rins eliminam.",
    porQueImporta: "Mostra como os rins estão filtrando o sangue.",
    oQueAjuda: "Beber água, controlar pressão e açúcar, e evitar anti-inflamatórios por conta própria.",
  },
  acido_urico: {
    oQueE: "Resto da digestão de algumas proteínas, eliminado pelos rins.",
    porQueImporta: "Em excesso pode formar cristais nas articulações (gota) e pedras nos rins.",
    oQueAjuda: "Beber água, moderar carne vermelha, frutos do mar, cerveja e bebidas açucaradas.",
  },
  tgo: {
    oQueE: "Uma enzima presente no fígado (e também nos músculos).",
    porQueImporta: "Quando sobe, pode indicar que o fígado está sendo sobrecarregado.",
    oQueAjuda: "Moderar o álcool, manter o peso e evitar remédios sem orientação.",
  },
  tgp: {
    oQueE: "Uma enzima que fica principalmente no fígado.",
    porQueImporta: "É o sinal mais específico de agressão ao fígado, como gordura no fígado.",
    oQueAjuda: "Moderar o álcool e o açúcar, manter o peso e fazer atividade física.",
  },
  tsh: {
    oQueE: "O hormônio que o cérebro usa para comandar a tireoide.",
    porQueImporta: "Fora da faixa pode indicar tireoide lenta ou acelerada, que mexem com energia, peso e humor.",
    oQueAjuda: "Não há hábito que corrija sozinho: se mudar, o médico avalia com outros exames.",
  },
  hemacias: {
    oQueE: "As células vermelhas do sangue, que levam oxigênio pelo corpo.",
    porQueImporta: "Ajuda a identificar anemia ou excesso de células vermelhas.",
    oQueAjuda: "Alimentação variada, com ferro (feijão, carnes, folhas escuras) e vitaminas do complexo B.",
  },
  hemoglobina: {
    oQueE: "A proteína dentro das hemácias que carrega o oxigênio.",
    porQueImporta: "É o número principal para saber se há anemia.",
    oQueAjuda: "Alimentação com ferro e vitamina C junto, que ajuda a absorver o ferro.",
  },
  hematocrito: {
    oQueE: "A porcentagem do sangue ocupada pelas células vermelhas.",
    porQueImporta: "Anda junto com a hemoglobina; também muda com desidratação.",
    oQueAjuda: "Beber água e manter a alimentação variada.",
  },
  leucocitos: {
    oQueE: "As células de defesa do corpo.",
    porQueImporta: "Sobem em infecções e inflamações; muito baixas deixam o corpo mais vulnerável.",
    oQueAjuda: "Sono, alimentação e vacinas em dia. Uma alteração isolada costuma ser repetida antes de qualquer conclusão.",
  },
  plaquetas: {
    oQueE: "Fragmentos de células que ajudam o sangue a coagular.",
    porQueImporta: "Valores baixos aumentam o risco de sangramento; altos, de coágulos.",
    oQueAjuda: "Moderar o álcool e não usar anti-inflamatórios ou anticoagulantes sem orientação.",
  },
  psa: {
    oQueE: "Uma proteína produzida pela próstata.",
    porQueImporta: "É usado no acompanhamento da próstata a partir dos 50 anos; sobe também com aumento benigno ou inflamação.",
    oQueAjuda: "Acompanhar a evolução ao longo dos anos com o médico; um valor isolado diz pouco.",
  },
  vitamina_d: {
    oQueE: "Uma vitamina produzida pela pele com o sol e que vem de alguns alimentos.",
    porQueImporta: "Ajuda a manter ossos e músculos fortes.",
    oQueAjuda: "Alguns minutos de sol por dia, peixes e ovos. Suplemento só com orientação médica.",
  },
};
