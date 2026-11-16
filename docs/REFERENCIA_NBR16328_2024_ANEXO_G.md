# Referência normativa — ABNT NBR 16328:2024 (Anexo G — Cadeia de Frio)

**Documento de consulta permanente.** Fonte: texto literal da norma (3ª edição, 29.02.2024, ISBN 978-85-07-10043-0, 62 páginas), reenviada pelo usuário em 2026-07-22. Este documento existe para nunca mais precisarmos reconstruir de memória o que a norma diz sobre o módulo Cadeia de Frio (`gerador_cadeia_frio_relatorio` + porte nativo no Portal SGO+ CNPJ/DB) — mesmo papel que `REFERENCIA_NBR16328_2024_ANEXOS_EFI.md` cumpre para o módulo Estufa+Banho-maria.

**Como usar**: antes de implementar/alterar qualquer regra de negócio do módulo Cadeia de Frio, ler a seção do anexo correspondente aqui. Se a resposta não estiver aqui, é porque a norma não especifica — não inventar, perguntar ao usuário.

**Seções gerais (1 a 17, Anexos A e B)** aplicam a todos os equipamentos, inclusive Cadeia de Frio — já documentadas com mais detalhe em `REFERENCIA_NBR16328_2024_ANEXOS_EFI.md` seção 1. Citações relevantes repetidas aqui quando o Anexo G tem uma nuance própria.

---

## 1. Anexo G — Refrigeradores, freezers, câmaras frias e ultrafreezers (INFORMATIVO)

### G.3 Instalação dos sensores

> "Convém que os sensores de temperatura sejam instalados dentro do equipamento, por meio de uma entrada apropriada para os termopares."

Procedimento (G.3.2): instalar o flange de passagem; passar os sensores de temperatura pelo flange, garantindo que alcancem todos os pontos de medição, e fechar o flange.

### G.4 Estudo de distribuição de temperatura (em vazio)

> "As medições realizadas com o equipamento sem carga (em vazio) podem ocorrer somente na instalação do equipamento. Nas requalificações futuras, as medições podem ser realizadas com carga, com os sensores distribuídos no seu interior. Convém que o estudo de penetração seja realizado somente para aqueles processos que forem requeridos."

*(Mesmo resíduo de cópia do texto já visto no Anexo F: "Convém desligar o equipamento para instalação dos sensores de monitoramento, para evitar sobrecarga do compressor" — aqui faz sentido de verdade, ao contrário da estufa de incubação, já que refrigerador/freezer TEM compressor.)*

- a) distribuir geometricamente **no mínimo 12 sensores** de temperatura dentro da câmara interna, sendo **um obrigatoriamente adjacente ao sensor de controle** de temperatura do equipamento (Figura G.1);
- b) verificar que os sensores não tocam a superfície interna;
- c) distância mínima de 3cm das laterais internas;
- d) quando aplicável, livre circulação de ar entre cargas, entradas/saídas de ar da câmara livres;
- e) quando aplicável, não usar a base inferior salvo recomendação do fabricante;
- f) documentar fotograficamente/graficamente a posição dos sensores;
- g) **registrar a cada 60 s**, a temperatura de cada sensor, **durante 24 h consecutivas**, a partir da estabilização do equipamento;
- h) anexar: temp máx/mín/média; indicação máx-mín/média-mín/máx-média; tempo total do ciclo; gráfico de temperatura por tempo.

**Figura G.1** mostra 5 níveis (Nível 1 a 5) de distribuição — só documentação física, não afeta o software.

### G.5 Estudo de distribuição de temperatura (ciclo com carga)

> "Convém que o estudo de distribuição de temperatura (ciclo com carga) seja realizado somente para aqueles processos que forem requeridos."

Mesma estrutura de G.4, mas **11 sensores dentro da carga + 1 adjacente ao controle** (mínimo 12 no total). Mesma cadência de 60s / 24h consecutivas.

**Achado crítico — G.4/G.5 NÃO condicionam o mínimo de sensores a volume, nem mencionam "equipamento conjugado"**: exatamente como F.4/F.5 (Estufa de Incubação) e I.4/I.5 (Banho-maria), o texto do próprio Anexo G diz "distribuir geometricamente no mínimo 12 sensores" **sem nenhuma ressalva de volume**. Isso é o mesmo padrão que, na leitura da norma pro módulo Estufa, levou à conclusão de que a regra geral condicionada a volume da Seção 15 (≥60L → 12 sensores; <60L → 3 sensores; conjugado → 12) é **substituída** pela instrução específica e mais restritiva de cada anexo, quando o anexo não repete a condição de volume.

**Nenhuma menção a repetir o procedimento 3 vezes** em G.4/G.5 (diferente do Anexo E, que exige explicitamente triplicata) — confirma que o Cadeia de Frio está certo em não ter mecanismo de triplicata obrigatória.

### G.6 Estudo de abertura de porta

- a) após a distribuição, manter a mesma montagem de sensores;
- b) **registrar a cada 10 s** (não 60s) durante todo o estudo;
- c) iniciar o estudo só quando todos os sensores estiverem dentro da faixa de trabalho;
- d) abrir a porta, mantê-la aberta por tempo determinado;
- e) registrar quando um sensor ultrapassar os limites de operação, caso algum tenha saído da faixa;
- f) fechar a porta após o tempo estabelecido;
- g) obter e registrar: **tempo total que todos os sensores levaram para retornar às condições de trabalho permitidas**, caso algum tenha saído da faixa.

> NOTA: "Convém que seja monitorada a temperatura por um tempo determinado (no mínimo 5 min) para demonstrar a estabilidade do equipamento."

### G.7 Estudo de queda de energia

- a) manter a mesma montagem de sensores do estudo anterior;
- b) manter a porta fechada;
- c) verificar se a temperatura do equipamento está estabilizada;
- d) **registrar a cada 10 s** durante todo o estudo;
- e) simular falha no fornecimento de energia elétrica;
- f) monitorar o tempo até que um sensor extrapole os limites de operação permitidos;
- g) obter e registrar: **tempo total que o equipamento mantém as condições de trabalho permitidas sem energia elétrica**.

> NOTA: mesma observação de monitorar por no mínimo 5 min para demonstrar estabilidade.

**Achado importante — a norma NÃO define critério numérico de aprovação/reprovação para G.6/G.7** (nem para F.6/F.7, mesma estrutura). Ela só pede para **registrar** os tempos (até romper / até recuperar / até esgotar sem energia). O "critério de aceitação" de cada estudo é uma exigência **documental** (Anexo B.2.j: *"procedimento adotado de todos os estudos realizados e os critérios de aceitação de cada um"*), não um valor que a norma prescreve — quem define o critério é o laboratório/cliente, caso a caso. **Isso confirma que o mecanismo atual do sistema (técnico informa um "tempo-alvo" e o sistema compara: aguentou = APROVADO, rompeu antes = REPROVADO) é uma implementação legítima desse requisito documental — não é uma invenção fora da norma, é a forma de operacionalizar um critério que a norma exige que exista, mas não fornece.** Sem tempo-alvo informado, o ensaio fica só como caracterização (`INFORMATIVO`) — também compatível, já que a norma trata isso fundamentalmente como um estudo de medição/registro, não de veredito automático.

**Diferença textual (não funcional) entre G.6/G.7 e F.6/F.7**: G é mais enxuto na lista de "obter e registrar" (só 1 item: tempo de retorno/tempo sustentado), enquanto F lista 2 itens (tempo até romper E tempo até recuperar) explicitamente. O sistema já registra ambos os tempos nos dois módulos — atende ao mais completo dos dois, não é um problema.

**Diferença notada, não aplicável**: Anexo H (câmaras climáticas — fora do nosso escopo) tem uma cláusula extra ("caso o equipamento não saia do critério... deixar um tempo mínimo de 30 min e finalizar o estudo") que G **não tem**. Não é uma lacuna do Cadeia de Frio — é um detalhe que existe só em H.

---

## 2. Confirmações do que já está certo no Cadeia de Frio

- Abertura de porta e queda de energia fazem parte do Anexo G, sem letalidade/indicador biológico ✅
- Lógica de APROVADO/REPROVADO por tempo-alvo comparado ao tempo até romper a faixa — implementação legítima do "critério de aceitação" documental exigido (B.2.j), a norma não define o valor ✅
- Sem mecanismo de triplicata obrigatória para G.4/G.5/G.6/G.7 — a norma não pede (diferente do Anexo E) ✅
- Caixa Térmica sem ensaio de distribuição 24h/porta/energia, só Autonomia (medir quanto tempo sustenta a faixa até romper, sem tempo-alvo fixo) — **a Caixa Térmica nem está no escopo dos Anexos C-N da norma** (não é refrigerador/freezer/câmara fria/ultrafreezer no sentido do G.1, é equipamento de transporte passivo) — está corretamente fora do G.4-G.7 e modelada à parte, como já era ✅

## 3. Achado real — divergência a decidir

**Mínimo de sensores condicionado a volume/equipamento conjugado** (`cfCalcularSensoresMinimos_`, campos "Volume interno declarado (L)" e "Equipamento conjugado" no formulário) — o texto literal de G.4.a/G.5.a diz **"no mínimo 12 sensores"**, sem nenhuma condição de volume, no mesmo padrão de F e I (onde essa lógica JÁ foi removida). A regra de volume só existe na Seção 15 (regra geral), que os anexos específicos substituem quando trazem instrução própria sem condicionar a volume — e G traz.

**Isso te dá 3 caminhos possíveis, preciso que você decida:**
1. **Remover a condição de volume também no Cadeia de Frio** (igual já foi feito no Estufa) — todo perfil G passa a exigir 12 sensores fixos, mesmo refrigerador pequeno.
2. **Manter como está** — considerando que a Seção 15 cita literalmente *"equipamentos conjugados (por exemplo, refrigerador com freezer)"* como exemplo, pode ser intencional que a nuance de volume/conjugado continue valendo especificamente para este tipo de equipamento, mesmo que G não repita a condição no seu próprio texto.
3. **Meio-termo**: manter o campo "Volume interno"/"Equipamento conjugado" só para o caso conjugado (que faz sentido físico pra geladeira+freezer combinados, situação que não existe em estufa/banho-maria), mas remover a redução para 3 sensores em equipamento pequeno não-conjugado — já que reduzir abaixo de 12 é o ponto que contradiz o texto literal de G.4.a/G.5.a.

Não vou mexer em nada até você validar qual caminho seguir.

## 4. Ações resultantes desta leitura

| # | Achado | Ação | Prioridade |
|---|---|---|---|
| 1 | G.4/G.5 exigem mínimo fixo de 12 sensores, sem condicionar a volume — mesmo padrão de F/I, onde já removemos a lógica de volume | **Aguardando decisão do usuário** (ver seção 3 acima) — não implementado ainda | Alta (após decisão) |
| 2 | Abertura de porta/queda de energia: norma não define critério numérico, só pede registro — sistema atual usa tempo-alvo informado pelo técnico como critério de aceitação documental | Nenhuma — já implementado corretamente, só documentado aqui para nunca mais termos dúvida sobre isso | — resolvido, só documentar |
| 3 | Caixa Térmica: fora do escopo G.1 da norma (não é refrigerador/freezer/câmara fria/ultrafreezer), corretamente modelada só com Autonomia | Nenhuma | — resolvido |
| 4 | Anexo B.3.f (registro impresso do ciclo) só é obrigatório para esterilizadoras/despirogenização/lavadora — para refrigerador/freezer/câmara fria/ultrafreezer só é necessário **se o equipamento tiver impressora** (não obrigatório em si) | Baixa prioridade — não é bloqueante, ao contrário do que era pro Anexo E | Baixa |
| 5 | Anexo B.2.j/B.2.m: relatório final precisa declarar o critério de aceitação de cada estudo e ter campo de comentários/desvios/ações corretivas | Conferir se o Parecer Técnico/Conclusão Técnica do Cadeia de Frio já declara isso explicitamente por estudo (bem provável que sim, dado o nível de detalhe já implementado) — não verificado a fundo nesta leitura | A confirmar |

---

## 5. Perguntas que esta leitura não respondeu (em aberto)

Nenhuma — ao contrário da leitura de E/F/I (que tinha a dúvida de tBase/z para letalidade), o Anexo G não tem cálculo de letalidade nem parâmetro técnico pendente. A única pendência real é a decisão de negócio da seção 3 acima (volume/conjugado), que é uma escolha do usuário, não uma lacuna de informação da norma.
