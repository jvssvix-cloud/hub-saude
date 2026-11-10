# Benchmark de UX: Function Health → Hub de Saúde (Rivio)

10/11/2026. Fonte: só material público (página da Function na App Store com 8 capturas de tela, site público, reviews da
App Store) + a pesquisa `Function Health — Engenharia reversa para o Rivio`. **Nada de engenharia reversa do app** (proibida
nos Termos de Uso deles, seções 7(a), 8(e) e 8(f)).

**Regra para usar este documento:** copiamos a **estrutura** (quais telas existem, o que cada uma mostra, a ordem do fluxo,
padrões de interação). **Não** copiamos o visual deles (layout pixel a pixel, ícones, ilustrações, textos, cores terracota,
tipografia serifada). As telas do Rivio usam a nossa identidade: off-white, bege, sálvia e a faixa Rivio.

## A estrutura do app deles

Barra inferior com 5 abas: **Home · Data · Chat · Protocol · More**. Fundo creme, cartões brancos, uma cor de status
(verde = na faixa, laranja = fora, cinza = outros).

| # | Tela deles | O que mostra (estrutura) | Nosso equivalente hoje | O que fazemos melhor / falta |
|---|---|---|---|---|
| 1 | **Home** | Total de marcadores; gráfico de 3 barras **na faixa / fora / outros** com "ver todos"; cartão grande de **idade biológica** | Início: "12 na faixa · 6 fora" + "Como você está" (4 temas) + minicurvas + nota do médico | Já temos a contagem. **Falta:** o 3º estado "outros" (sem faixa / qualitativo). Idade biológica: **não** (Roberto não tem os exames do cálculo; número inventado quebra a rastreabilidade) |
| 2 | **Data** (por sistema) | Lista de sistemas (pâncreas, rins, fígado, saúde masculina, metabólico, nutrientes, estresse…) com ícone e uma **barrinha verde/laranja com a contagem** de cada; entrada para exames de imagem | Evolução (áreas + minicurvas) e Outros exames na Início | **Falta:** a lista por sistema com a barrinha de contagem é mais rápida de ler que a nossa. Adaptar a Evolução para esse formato (sistema → contagem → toque abre os exames) |
| 3 | **Chat** (Private AI Chat) | Conversa sobre os próprios resultados; a resposta compara rodadas e lista mudanças por marcador | Não temos | **Fazer melhor:** cada afirmação cita o laudo de origem (data, laboratório, página), clicável. A deles não mostra a fonte |
| 4 | **Clinician Notes** | Nota datada após cada rodada: **Resumo → Seus pontos fortes → pontos de atenção**, em texto corrido | Nota do médico (recomendações) na Início | **Fazer melhor:** é o **médico do próprio paciente** que revisa (não um clínico contratado). Adotar a estrutura **Pontos fortes / Atenção / Recomendações** na nota |
| 5 | **Protocols** | Pedido em linguagem natural ("crie um plano de nutrição com base nos meus últimos resultados") → plano com metas diárias (calorias, macros) e lista de alimentos/hábitos | Não temos (só as recomendações do médico) | **Adaptar:** plano gerado por regras/IA a partir dos exames + relógio, **revisado pelo médico** antes de valer. Críticas a eles: recomendações genéricas |
| 6 | **Documents** | Cada PDF enviado vira um cartão: "**14 marcadores · 4 fora**"; lista de resultados com faixa colorida lateral, status e valor + referência | Exames: lista de laudos com link para o PDF | **Falta:** a tela de um laudo (resumo + lista dos resultados dele com status). **Fazer melhor:** mostramos o valor *como impresso* e a página do laudo |
| 7 | **Biomarcador** | Nome, status + valor, uma frase "o que é", gráfico com **faixas** (acima / na faixa) e pontos por data, **"Por que importa?"** | Página do exame: valor, tendência, gráfico com faixa do laudo, "Entender este exame", cada resultado com laudo | Já temos tudo isso. **Fazer melhor:** a faixa é **a de cada laudo** (muda com o laboratório e o ano), não uma faixa "ótima" própria |
| 8 | **More** | Conta, agendamento, loja (exames avulsos, MRI), recibos | — | Agendamento e loja ficam fora (no Brasil o exame vem pelo plano). **Usar:** Compartilhar, Vacinas, Relógio, Documentos, Conectar IA (MCP) |

## O que os usuários reclamam (oportunidades, reviews da App Store)

- **Sem data por resultado:** "a data da coleta só aparece no pedido médico, na seção de recibos". → No Rivio **todo número tem data, laboratório e link para a página do laudo**.
- **Não dá para saber de qual painel veio cada resultado.** → Cada resultado aponta para o documento de origem.
- **Suporte só por robô; ninguém para explicar.** → O médico do paciente vê o mesmo histórico e devolve a nota.
- **Agendamento rígido, segunda rodada que não é completa.** → Fora do nosso escopo (usamos exames que a pessoa já tem).
- Elogiado: o chat com contexto e o **upload de exames antigos** (o centro do desafio Rivio).

## Proposta de navegação do paciente (com a nossa identidade)

Barra inferior: **Início · Exames · Conversar · Plano · Mais**

| Aba | Conteúdo | Situação |
|---|---|---|
| Início | contagem na faixa/fora/outros, "Como você está", nota do médico, índices ao longo do tempo, alertas do relógio | feito (falta "outros") |
| Exames | por sistema com barrinha de contagem → exame (gráfico, entender, laudos); aba interna **Documentos** (cada laudo enviado + "Enviar exame") | parcial (refazer a lista por sistema; tela do laudo; upload é do João) |
| Conversar | chat com os próprios dados, citando o laudo | a fazer |
| Plano | recomendações do médico + plano por regras/IA, com selo "revisado por" | parcial (nota feita) |
| Mais | Relógio, Vacinação, Linha do tempo, Compartilhar (médicos e log), Conectar IA (MCP), Conta | parcial |

## Ordem sugerida

1. **Navegação nova + Exames por sistema + tela do laudo** (Documentos), com o 3º estado "outros".
2. **Nota do médico estruturada** (Pontos fortes / Atenção / Recomendações) e aba **Plano**.
3. **Linha do tempo + Vacinação** (na aba Mais).
4. **Login e onboarding** (paciente e médico, lista de pacientes do médico) — mexe no banco; combinar com o João.
5. **Conversar** (chat citando o laudo) e **Conectar IA** (servidor MCP com o mesmo consentimento).
