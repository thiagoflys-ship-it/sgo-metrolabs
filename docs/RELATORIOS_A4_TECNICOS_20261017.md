# Relatórios técnicos em A4 — calibração, NR-13, declarações e documentos técnicos (17/10/2026)

Pedido do dono: todos os relatórios em HTML A4 para impressão, com IA onde fizer sentido, perfeitos, e as pendências finalizadas.

**Escopo:**
- Certificado de calibração (CertCal) e relatório interpretativo;
- relatórios gerenciais de padrões, inventário e orçamento;
- Relatório de calibração (RelCal);
- Laudo NR-13;
- Declaração de execução;
- Relatório QI/QO/QD;
- PGT e POP;
- Planejamento CME;
- Cronograma de execução;
- Registros operacionais.

**Situação:** nada foi publicado. Não houve clasp nem deploy.

## Como foi testado

- **Servidor:** cópia de `sgo_servidor/dados/dev/pglite` em `%TEMP%\sgo_reltec`, rodando com `SGO_ENSAIO=1 SGO_AGENDADOR=0` na porta 8123, sem nenhuma chave de IA. No fim, o servidor foi parado.
- **Documentos:** todos foram gerados de verdade por chamadas ao servidor:
  - certificado com 2 grandezas, uma com a resolução informada e outra deduzida;
  - relatório interpretativo;
  - plano de renovação e desempenho;
  - inventário e orçamento de padrões;
  - RelCal com certificado anexado;
  - laudo NR-13 emitido;
  - Declaração e QI/QO/QD sem IA;
  - POP com roteiro sem IA, e o PGT recusado com a explicação;
  - Planejamento CME (vapor e ultrassônica com valor antigo gravado);
  - Cronograma sem IA;
  - registro operacional.
- **Impressão:** cada HTML foi impresso pelo Playwright (`page.pdf`, A4) e as páginas foram lidas uma a uma.
- **Telas (Playwright):**
  - Cronograma: "Avançar" sem cliente, equipamentos do cadastro, acréscimo à mão;
  - PGT: "Avançar" sem campos;
  - Planejamento CME: "Próximo" sem cliente, opções sem marca, "Voltar" mantém o cálculo e recalcular sem mudança não chama o servidor;
  - NR-13: o cadastro fecha ao escolher o equipamento, e o tipo de vaso vai para a etapa 3;
  - CertCal: campo de resolução.

  Nenhum erro de JavaScript.
- **Perfis:** usuários COMERCIAL e FINANCEIRO criados só na cópia.
- **IA:** o caminho com IA foi testado com respostas simuladas do Gemini, sem rede. Uma resposta correta é aceita. São descartadas, com aviso, as que trazem número inventado, ponto decimal, veredito, nome de fabricante ou resposta cortada.

Scripts e PDFs: `...\scratchpad\rt` (`todos.mjs`, `cc.mjs`, `ui.mjs`, `t_ia.js`, `out\*.pdf`).

## 1. Padrão visual comum (arquivo novo `SGO_RelTecA4.js`)

`RelTecA4_css_({titulo, numero, revisao, empresa})` é aplicado em todos os documentos do escopo.

**Cabeçalho e rodapé corridos em todas as páginas impressas:**
- título do documento à esquerda;
- "Nº … · Revisão …" à direita;
- empresa (razão social e CNPJ) no rodapé;
- "Página X de Y".

A 1ª página não repete o cabeçalho, porque já traz a logo e o título. O CSS fica depois de `SGO_DocA4_css_()`, que segue dando justificação, viúvas e órfãs, `thead` repetido e quebras de página.

**Número e revisão:**

| Documento | Número | Revisão |
|---|---|---|
| Certificado e interpretativo | número do certificado | "Revisão 00" |
| Laudo NR-13 | número do laudo | "Revisão 00" |
| RelCal, Declaração, QI/QO/QD | número informado | "Revisão 00" |
| PGT/POP | código | revisão do histórico (1.0, 2.0…) |
| Planejamento CME | novo número `PLC-aaaammdd-hhmm` | 00 |
| Cronograma | novo número `CRN-aaaammdd-hhmm` | 00 |
| Registros | `REG-xxxxxxxx`, tirado do ID | 00 |
| Inventário e orçamento de padrões | ID do documento | 00 |

**Nome da empresa:** "Metrolab's" foi trocado por "Metrolabs" nos documentos, nos textos fixos e nos prompts da IA. A IA da Declaração escrevia com apóstrofo porque o prompt usava.

**Relatórios gerenciais (renovação e desempenho):**
- os gráficos eram canvas de Chart.js e saíam em branco no PDF, que é gerado sem JavaScript; agora são SVG estáticos;
- o título "Interpretação por IA" virou "Análise";
- passam a ser gravados (HTML + PDF) em "Relatorios gerenciais dos padroes".

## 2. IA nos documentos (arquivo novo `SGO_RelTecIA.js`)

`RelTecIA_gerarJson_` chama o Gemini com:
- raciocínio (thinking) no padrão, sem desligar;
- temperatura 0,2;
- 8.192 tokens;
- resposta em JSON.

Ela nunca lança erro. Sem chave, com limite atingido, com resposta cortada (MAX_TOKENS) ou com JSON inválido, devolve um aviso em português.

O texto da IA passa por três conferências:
- `RelTecIA_numerosForaDaLista_`: só aceita números com casas decimais que existam nos dados do documento, e recusa ponto decimal;
- `RelTecIA_temVeredito_`: recusa afirmação de aprovação ou conformidade;
- `RelTecIA_temFabricante_`: recusa citação do fabricante.

**Por documento:**

| Documento | Com a IA | Sem a chave |
|---|---|---|
| Relatório interpretativo do certificado | redigido pela IA a partir dos valores do certificado, com as conferências acima | texto padrão (já com as casas decimais do certificado), aviso na tela |
| Relatórios gerenciais | texto da IA | análise padrão escrita a partir dos indicadores; o motivo vai para a tela, não para o documento. Tokens de 4.096 para 8.192, resposta cortada tratada como falha |
| RelCal | IA lê o certificado anexado | texto padrão com o instrumento, as normas, como ler o certificado anexado e a conclusão sem veredito, aviso na tela. Legenda interna de foto ("(não foi possível…)") não vai mais ao documento |
| Declaração e QI/QO/QD | IA redige | texto padrão completo para revisão: identificação, período e local, normas, itens verificados, calibrações, conclusão sem juízo de conformidade; aviso acima dos campos. Na QD, o certificado anexado é citado como referência, no lugar da leitura automática |
| Cronograma | IA redige | texto padrão escrito a partir dos grupos e datas calculados, aviso no resumo final |
| POP com roteiro | IA redige | texto padrão (Objetivo, Responsabilidades, Desenvolvimento = roteiro, Registros), aviso |
| PGT e POP sem roteiro | IA redige | não geram: a mensagem diz que nada foi gravado, que a revisão continua a mesma e o que fazer. É exceção consciente: o PGT tem cerca de 30 seções normativas por cliente, e emitir um esqueleto como revisão oficial seria pior que não emitir |
| NR-13 e Planejamento CME | — | já funcionavam sem IA, conferido |

**Ajustes de geração:**
- temperatura de 0,3–0,4 para 0,2–0,25 em Declaração, Cronograma, PGT/POP e Planejamento CME;
- tokens: Cronograma de 4.096 para 8.192, POP de 8.192 para 16.384;
- resposta cortada vira falha no Cronograma, PGT/POP e RelCal.

## 3. Conteúdo técnico

### Certificado de calibração (CertCal)

**(d) Resolução no orçamento de incerteza.**
- A resolução do instrumento sob calibração entrou como componente tipo B, retangular, u = r/√12 (equivale a (r/2)/√3), com graus de liberdade ∞. Antes não existia.
- Há um campo novo por bloco: "Resolução do instrumento (na unidade do bloco)".
- Em branco, a resolução é deduzida do menor incremento das leituras, e o certificado informa isso com um asterisco.
- Motor `certcal-gum-2026-10-17`.

Conferido à mão (121,2/121,3/121,1; padrão U95 0,15, k 2; r = 0,1):

| Grandeza | Antes | Agora |
|---|---|---|
| uA | 0,0577 | 0,0577 |
| u(padrão) | 0,075 | 0,075 |
| u(res) | — | 0,0289 |
| uc | 0,0946 | 0,0990 |
| Veff | 14,45 | 17,26 |
| k | 2,19 | 2,16 |
| U95 | 0,21 | 0,21 |

Com leituras iguais e resolução 0,1: U95 = 0,16 com k = 2,00 (antes 0,15).

**Mudança registrada:** os certificados emitidos daqui em diante incluem a resolução. Os já emitidos guardam o próprio snapshot e não mudam. O celular (assistente no `JS_Core`) ainda não tem o campo e usa a resolução deduzida das leituras (ver pendências).

**Orçamento de incerteza no documento** (substitui "Fontes de incerteza"):
- uma tabela por grandeza com fonte, tipo, distribuição, valor de origem, divisor, incerteza-padrão e graus de liberdade (repetibilidade, cada padrão, resolução);
- uma tabela por ponto com u repetibilidade, u padrão(ões), u resolução, uc, Veff, k e U95;
- nota com o modelo (GUM/JCGM 100:2008, EA-4/02, Welch-Satterthwaite, t de Student, 95,45 %).

**Casas decimais por grandeza:** iguais em toda a tabela. No mínimo 2, mais as da resolução e as necessárias para a U95 ter 2 algarismos significativos (máximo 6). Antes, U95 de 0,0039 saía 0,00.
- Separador de milhar pt-BR: 1.250,50.
- A observação do certificado foi atualizada.

**Outros ajustes:**
- **Rastreabilidade:** a tabela de padrões ganhou a coluna "Validade" do certificado do padrão.
- **Condições ambientais:** "Temperatura ambiente 23,5 °C; umidade relativa do ar 55 %." (antes "(23,50) °C").
- **Texto da observação de incerteza:** agora descreve o orçamento real, com a resolução incluída.

### Laudo NR-13

**(c) Citação legal.** Conferida no texto consolidado do MTE em gov.br ("NR-13 atualizada") e no DOU.
- A redação vigente é a da Portaria MTP nº 1.846, de 1º/07/2022, retificada em 20/10/2022.
- A Portaria MTP nº 4.219, de 20/12/2022, existe, mas só alterou o item 13.4.1.11 (CIPA e assédio, caldeiras).
- A citação antiga atribuía a redação à 4.219, "com retificação de 20/10/2022", o que é incoerente.
- Nova citação: "NR-13 … (Ministério do Trabalho e Emprego), com redação dada pela Portaria MTP nº 1.846, de 1º de julho de 2022 (retificada em 20/10/2022), e alterada pela Portaria MTP nº 4.219, de 20 de dezembro de 2022."

**Itens conferidos no texto oficial:**
- 13.5.1.1.3: grupo pelo P.V, com P em MPa e V em m³;
- Tabela 1 (categorias) e Tabela 2 (prazos sem SPIE: I 1/3, II 2/4, III 3/6, IV 4/8, V 5/10 anos) batem com o código;
- 13.3.2: o termo vigente é "Profissional Legalmente Habilitado (PLH)", e o laudo, os prompts e a tela foram atualizados de "PH".

**Memória de cálculo:**
- passa a dizer que P adotado = PMTA (critério conservador);
- mostra as casas completas (0,254973 × 0,45 = 0,114738), antes 0,2550 × 0,45, que não fechava;
- "ano(s)" virou singular ou plural.

**Visual:**
- tabelas de válvulas e manômetros com bordas (estavam sem estilo);
- rótulos da categorização sem caixa alta forçada (saía "MPA·M³");
- rótulo "Pressão" do gráfico do teste hidrostático não é mais cortado.

### Outros documentos

**Relatórios gerenciais:** gráficos SVG legíveis no PDF, análise padrão sem citar a falta de chave no documento.

**Declaração e QI/QO/QD:**
- títulos e listas de etapas com "e" ("Instalação, Operação e Desempenho");
- sem "Metrolab's".

**Cronograma:**
- tipo vindo do cadastro em caixa normal ("Autoclave");
- número do documento.

**Registros:** número curto do registro no bloco de controle.

## 4. Decisões do dono aplicadas

| Decisão | O que foi feito |
|---|---|
| (a) Comercial e Financeiro só consultam | Recusados no servidor, com mensagem que diz o que fazer, ao: emitir certificado; gerar relatório interpretativo ainda não emitido; cadastrar, alterar, inativar ou reativar padrão, ou anexar PDF a ele; emitir documento de padrões; preencher ou emitir laudo NR-13 (rascunho, foto, textos); gerar ou salvar RelCal; gerar QI/QO/QD. Consultas liberadas: busca de certificados e laudos e lista de padrões. Testado com os dois perfis. A Declaração de execução ficou liberada, porque não é certificado nem laudo. |
| (b) Sem fabricante | No Planejamento CME, as três opções "Lavadora Ultrassônica (marca)" viraram uma só, "Lavadora Ultrassônica", na lista, no manual, na configuração e no setup. O cálculo é o mesmo: 9 pontos. Valores antigos já gravados com marca são normalizados ao gerar o documento e o texto da IA (testado: "marca no doc? false"). A coluna "Marca" do Cronograma (dado do equipamento) foi mantida. |
| (c) Citação da NR-13 | Ver seção 3. |
| (d) Resolução no orçamento | Ver seção 3. |

## 5. Pendências de fluxo (todas feitas)

- **Declaração e QI/QO salvam sozinhos ao gerar.** O botão "Salvar na pasta do cliente" deu lugar a "Salvando na pasta do cliente…" e ao link do arquivo. Se falhar, aparece "Tentar salvar de novo". Na Declaração e no QI/QO, o rascunho sem IA mostra o aviso acima dos campos.
- **RelCal também salva sozinho**, com proteção contra salvar duas vezes.
- **"Avançar" confere os campos**, com a mensagem ao lado do botão e o foco no campo:
  - PGT, etapa 1: razão social, responsável técnico, "Elaborado por";
  - Cronograma: razão social, ao menos 1 equipamento e data de início;
  - Planejamento CME: razão social, tipo de processo, volume maior que zero e ao menos um serviço contratado. O `alert()` foi trocado por aviso na própria etapa.
- **"Voltar" do Planejamento CME não apaga o cálculo.** Calcular de novo com os mesmos dados só volta ao resultado, sem chamar o servidor nem a IA. Se algum dado mudar, recalcula.
- **Equipamentos do Cronograma vêm do cadastro.** Ao avançar da etapa 1, o sistema busca o cliente pelo CNPJ e lista as unidades. O botão "Trazer equipamentos do cadastro" agrupa por tipo, marca e modelo, com a quantidade, e dá para escolher uma unidade ou todas. "Acrescentar à mão" continua. Se o cliente não está no cadastro, a mensagem explica o caminho. API nova: `apiEquipamentosDoCadastro`.
- **NR-13: o cadastro fecha depois de escolher o equipamento.** O cadastro novo fica atrás de "+ Cadastrar equipamento novo" e os campos são limpos. O "Tipo de vaso" saiu do cadastro e foi para a etapa 3 (Dados técnicos do vaso). A unidade do laudo passa a ser a do equipamento escolhido.
- **Pedido da frente do celular:** `CertCal apiListarTecnicos` devolve lista vazia quando a aba `CAD_TECNICOS` não existe, sem criar aba numa consulta (testado: `{"ok":true,"items":[]}`).

## 6. Pendências para outros donos ou para decidir

1. **Núcleo (`JS_Core`, celular).** O assistente do certificado não tem o campo de resolução e usa a deduzida das leituras, com asterisco no certificado. Acrescentar o campo `resolucao` no bloco do `mobileCertCalEditarBloco_`.
2. **Servidor (camada de compatibilidade).** Na primeira geração de inventário de padrões num banco novo, a aba `PADROES_DOCUMENTOS_EMITIDOS` é criada pela API avançada do Sheets e a leitura seguinte, pelo SpreadsheetApp, não a vê ("Aba não encontrada"). A segunda tentativa funciona. Avaliar a invalidação do cache de abas depois do `Sheets.Spreadsheets.batchUpdate`.
3. **Dono.** O PGT e o POP sem roteiro continuam dependendo da IA (ver seção 2).
4. **Dono/responsável técnico.** A NR-13 calcula a categoria com P = PMTA (conservador), e isso agora está escrito no laudo. Decidir se mantém ou se passa a pedir a pressão máxima de operação.
5. **Responsável técnico.** Validar com a chave real os textos da IA do relatório interpretativo, lendo o documento inteiro (regra do projeto: validar o prompt com o PDF real). O teste aqui foi com respostas simuladas.
6. **Mensagem de chave ausente.** O aviso repete "Peça ao administrador…" dentro do parêntese porque reaproveita a mensagem única do núcleo. É cosmético.

## Arquivos

**Novos:** `SGO_RelTecA4.js`, `SGO_RelTecIA.js`.

**Alterados:**
- `SGO_CertCal_Calculo/Config/ConteudoModulo/Documento/GestaoIA/GestaoRelatorios/IA/Main.js`;
- `SGO_RelCal_ConteudoModulo/Documento/IA/Main.js`;
- `SGO_NR13_Config/ConteudoModulo/Documento/IA/Main.js`;
- `SGO_DeclaracaoExec_Main/Documento/DocumentoQIQO/IA/ConteudoModulo.js`, `SGO_DeclaracaoExecQIQO_ConteudoModulo.js`;
- `SGO_PgtPop_ConteudoModulo/Documento/IA/Main.js`;
- `SGO_PlanCME_Calculo/Config/ConteudoModulo/Documento/IA/Main/Setup.js`;
- `SGO_CronExec_ConteudoModulo/Documento/IA/Main.js`;
- `SGO_RegOp_Documento/Main.js`;
- `SGO_Padroes_DocumentoHTML/Orcamento.js`.

Os `*_ConteudoModulo.js` foram editados por trechos (nunca reescritos), e cada um foi conferido carregando a string e compilando o `<script>` interno.
