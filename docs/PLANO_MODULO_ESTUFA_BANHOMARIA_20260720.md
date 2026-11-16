# Plano — Módulo Estufa + Banho-maria (Anexos E/F/I, ABNT NBR 16328:2024)

Documento de continuidade. Objetivo: registrar o plano de arquitetura completo antes de escrever qualquer código, seguindo a ordem que o usuário pediu explicitamente ("PRECISAMOS PLANEJAR E TOMAR A MELHOR DECISÃO" juntos). Este é um documento de **estudo**, escrito em 2026-07-20 — nenhum arquivo de código foi criado.

**Status do bloqueio**: o usuário definiu como pré-condição resolver 2 problemas no Cadeia de Frio (bug do certificado + lógica de rampa) antes de começar este módulo — ambos corrigidos e em produção (@72, 2026-07-20). Em 2026-07-21 o usuário autorizou liberar a Fase 1 mesmo com o Cadeia de Frio ainda em teste pela equipe ("o pessoal ira testar... vamos partir para esse novo projeto, e em paralelo o pessoal vai testando lá") — as duas frentes correm em paralelo a partir de agora.

**Status da Fase 1 (Anexo F — Estufa de Incubação), 2026-07-21**: CÓDIGO CRIADO E PUBLICADO, AINDA SEM TESTE FUNCIONAL.
- Projeto novo criado: `gerador_estufa_banhomaria_relatorio` (local, em `apps-script-imports/`), scriptId `1TVHhYRlv_AEAff0XuVniWx4bEiPQbNw1gAn6y1fhgfa2dy27QkN9Bi-E`.
- Editor: https://script.google.com/d/1TVHhYRlv_AEAff0XuVniWx4bEiPQbNw1gAn6y1fhgfa2dy27QkN9Bi-E/edit
- URL de teste (/dev): https://script.google.com/macros/s/AKfycbyL-9wb0Jq0cObLPgMvU6a-fv3yS3Q_a1qTYwpfearG/dev
- Feito: cópia integral do `gerador_cadeia_frio_relatorio`, rename mecânico de todo prefixo de identificador (`cf`→`eb`, `CFCFG`→`EBCFG`, e os prefixos locais `CFIA_`→`EBIA_`, `CFSIM_`→`EBSIM_`, `CFGRAF_`→`EBGRAF_`, `CF_RESULTADOS_NUM_COLUNAS`→`EB_RESULTADOS_NUM_COLUNAS`, função `ebGerarPlanilhaCadeiaFrio`→`ebGerarPlanilhaEstufaBanhomaria`), `EBCFG.PERFIS` substituído pelos 9 perfis de cadeia de frio por 1 perfil único `ESTUFA_INCUBACAO` (anexo F, minSensores 12, temLetalidade false, estudosDisponiveis igual ao Cadeia de Frio), citação normativa trocada de RDC 430/2020+PNI (cadeia de frio/vacina) para RDC 658/2022+RDC 665/2022 (fabricantes, conforme seção 1 deste plano), textos narrativos do laudo/certificado ajustados de "produto armazenado/transportado" para "processo de incubação". `node --check` limpo em todos os `.js`. Push feito (`clasp push --force`, 13 arquivos).
- **Teste funcional feito (2026-07-21)**: harness Node (`vm` + mocks mínimos de Utilities/PropertiesService/CacheService/Session) rodando `ebExecutarAnaliseCompleta_` de verdade — o mesmo pipeline de produção (`apiConverter`/`apiGerarRascunhoCertificado` chamam essa função), só sem a etapa de escrever a Planilha/Sheets. 3 cenários:
  1. Distribuição em vazio, 24h, 12 sensores, resultado desejado APROVADO → gerou 1441 linhas, `statusAprovacao: APROVADO`, stats coerentes (min 33.96 / max 36.27 / média 35.23, dentro da faixa 33-37).
  2. Mesmo cenário forçando REPROVADO → detectou corretamente ruptura (sensor S4, 38.74°C, fora da tolerância), motivo de reprovação com texto correto.
  3. Senha do Simulador Admin errada → bloqueou como esperado.
  Confirma que o motor herdado (Engine.js) + o novo perfil `ESTUFA_INCUBACAO` funcionam corretos de ponta a ponta na lógica de análise. **Não testado**: a escrita real da Planilha/Sheets (Planilha.js/Graficos.js) e o Certificado em HTML — herdados sem alteração de lógica do Cadeia de Frio (só os textos narrativos foram editados manualmente, ver acima), então o risco aí é mais baixo, mas ainda vale abrir a URL /dev e gerar um laudo real pelo menos uma vez antes de considerar a Fase 1 encerrada.
- **Faixa de temperatura do perfil `ESTUFA_INCUBACAO` (tMin 33.0 / tMax 37.0) é um PALPITE**, não um valor normativo — a norma não fixa faixa para Anexo F (ao contrário da vacina 2-8°C). Está marcado `faixaConfiguravel: true` (mesmo padrão de Câmara Fria/Freezer), então o técnico ajusta por protocolo — mas o usuário deveria confirmar/substituir esse default antes de considerar isso pronto para um cliente real.
- Pendente: decidir com o usuário como testar (rodar Simulador Admin pela URL /dev, ou outro caminho), e só depois seguir para Fase 2 (Anexo I).

**Status da Fase 2 (Anexo I — Banho-maria), 2026-07-21**: CÓDIGO CRIADO E PUSHED, testado no mesmo harness Node.
- Usuário autorizou seguir direto pro Anexo I sem checagem visual da Planilha/Certificado da Fase 1 primeiro (aceitou o risco, considerando a validação lógica suficiente por ora).
- Achado importante antes de duplicar o perfil: as citações normativas (`ebListarNormasAplicaveis_` e `ebMontarTextoTecnico_` em `Planilha.js`) tinham "Anexo F" e "estufa de incubação" **hardcoded no texto**, não dinâmicos — se eu tivesse só duplicado o perfil sem corrigir isso, todo laudo de banho-maria sairia citando "Anexo F" e "estufa de incubação" errado. Corrigido: agora ambas as funções leem `perfilCfg.anexo` (campo que já tinha sido adicionado na Fase 1) e escolhem a descrição certa por anexo (mapa `{F: ..., I: ..., E: ...}` já preparado para quando o Anexo E existir). Textos narrativos genéricos demais presos a "processo de incubação" também generalizados para "processo térmico avaliado".
- Novo perfil `BANHO_MARIA`: anexo I, minSensores 6, `estudosDisponiveis: ['DISTRIBUICAO_VAZIO', 'DISTRIBUICAO_CARGA']` — **sem** abertura de porta/queda de energia, porque a seção 2 deste plano (pesquisa da norma) não lista esses ensaios para o Anexo I (cuba aberta, sem porta). Faixa de temperatura (36-40°C) é **outro palpite**, mesma ressalva do perfil de Estufa — a norma não fixa valor pra este anexo também.
- Frontend (`Index.html`, função `aoTrocarPerfil`) já era 100% orientado a dados (lê `estudosDisponiveis` do perfil dinamicamente pra mostrar/esconder seções) — nenhuma mudança de UI foi necessária para o novo perfil funcionar.
- Harness Node ampliado com mais 2 testes: perfil Banho-maria gera 481 linhas (4h a 30s, conforme intervalo de registro exigido pela norma pra este anexo — diferente do Anexo F que é 60s), `APROVADO`, e a citação passou a sair corretamente como "Anexo I"/"banho-maria" sem regredir o texto do Anexo F. `node --check` limpo, push feito (13 arquivos).
- **NÃO feito ainda**: mesma pendência da Fase 1 — nenhuma checagem visual da Planilha/Gráficos/Certificado reais (só a lógica).
- Falta perguntar ao usuário: confirmar/ajustar a faixa 36-40°C do Banho-maria (mesmo tipo de pendência do Estufa, ainda sem resposta).

---

## 0. Escopo confirmado (2026-07-16)

Fonte: **ABNT NBR 16328:2024** (3ª edição), lida por completo. Três anexos, respondido "E, F, I" pelo usuário:

| Anexo | Equipamento | Natureza | Letalidade/indicador |
|---|---|---|---|
| E (normativo) | Estufa de esterilização e despirogenização | Calor seco, alta temperatura | **Sim** — indicador biológico OU endotoxina, cálculo de letalidade FH |
| F (informativo) | Estufa de incubação | Faixa mais baixa, tipo BOD | Não — só estabilidade/uniformidade |
| I (informativo) | Banho-maria | Faixa mais baixa, cuba líquida | Não |

Nome do módulo: ainda em aberto (proposta de trabalho neste documento: **"Estufa+Banho-maria"**, prefixo de código `eb`; confirmar com o usuário antes de criar o projeto).

## 1. Público-alvo (pesquisa concluída 2026-07-16)

RDC 15/2012 **proíbe** estufa para esterilização em ambiente hospitalar/CME (Art. 92). RDC 665/2022 (Produtos Médicos/IVD) e RDC 658/2022 (Medicamentos) exigem validação de processo (IQ/OQ/PQ) e cobrem explicitamente Autoclave/Estufa/Incubadora/Banho-maria — **fabricantes** farmacêuticos e de dispositivos médicos. Conclusão: este módulo serve indústria, não hospital — confirmado pelo usuário.

## 2. O que cada anexo exige, e o que isso significa em código

**Anexo E — Estufa de esterilização/despirogenização** (o único com letalidade):
- Mín. 12 sensores, registro a cada 30s
- Estudo de distribuição em vazio — repete 3×
- Estudo de penetração com carga — indicador biológico OU endotoxina em ≥1 ciclo de cada tipo de carga, **cálculo de letalidade FH**, repete 3×
- Estruturalmente análogo ao F0 da Autoclave (`AnaliseCiclo.js`), mas calor seco: fórmula de letalidade é a mesma família (`10^((T - tBase)/z)` integrado no tempo), **porém tBase e z de despirogenização/esterilização a calor seco são diferentes dos valores de autoclave a vapor** (autoclave usa tBase=121,1°C, z=10 para 121°C, ou tBase=134, z variável por ciclo). Para calor seco, a literatura usual (não confirmada com o usuário ainda) trabalha com z≈20°C e temperaturas de referência bem mais altas (170-250°C dependendo se é esterilização ou despirogenização de endotoxina, D-value diferente pra cada). **Decisão pendente do usuário**: confirmar os parâmetros térmicos de referência antes de codar essa parte — é a peça mais arriscada do módulo inteiro, não dá para adivinhar.
- Indicador biológico/endotoxina: é resultado de laboratório terceirizado (cultura/leitura), não algo que o datalogger mede. **Decisão pendente**: tratar como campo de entrada manual no formulário (aprovado/reprovado + laudo anexo), análogo a como o motor não recalcula esporo biológico na Autoclave hoje — precisa confirmar se a Autoclave já tem esse padrão pra copiar, ou se é conceito novo.

**Anexo F — Estufa de incubação** (estruturalmente = Anexo G do Cadeia de Frio):
- Mín. 12 sensores, distribuição em vazio/com carga por 24h (registro a cada 60s), abertura de porta, queda de energia — **exatamente a mesma sequência de estudos do Cadeia de Frio**, só muda a faixa (mais quente que refrigeração, mas mesma lógica de "permanecer dentro de tMin/tMax")
- Sem letalidade, sem indicador biológico
- **Reaproveitamento**: `cfAnalisarDistribuicao` + `cfAnalisarEventoRuptura` do `Engine.js` do Cadeia de Frio praticamente sem alteração de lógica — só troca de prefixo/nome

**Anexo I — Banho-maria** (mais simples dos três):
- Mín. 6 sensores na cuba, registro a cada 30s, tempo predeterminado (não é 24h fixo)
- Distribuição em vazio + com carga (se pertinente, triplicata)
- Sem letalidade
- **Reaproveitamento**: mesmo `cfAnalisarDistribuicao`, só com sensores mínimos=6 e duração configurável em vez de 24h fixas

---

## 3. Arquitetura — motor híbrido, decisão de fundo

Confirmado com o usuário em 2026-07-16: **projeto GAS separado**, cópia integral do `gerador_cadeia_frio_relatorio` (não do `gerador_autoclave_relatorio`), porque F e I são ~90% do escopo e são estruturalmente iguais ao Cadeia de Frio. O Anexo E é o "enxerto": pega emprestada a lógica de letalidade da Autoclave, mas dentro do esqueleto do Cadeia de Frio.

Isso implica `Engine.js` do módulo novo ter **duas famílias de análise coexistindo**:

```
ebAnalisarDistribuicao(...)       // F e I — cópia direta de cfAnalisarDistribuicao, sem alteração de lógica
ebAnalisarEventoRuptura(...)      // F (porta/energia) — cópia direta de cfAnalisarEventoRuptura
ebAnalisarDistribuicaoVazioE_(...) // E, distribuição em vazio (repete 3x) — variante de ebAnalisarDistribuicao
                                    // com suporte a N repetições agregadas num único veredito
ebAnalisarPenetracaoELetalidade_(...) // E, penetração com carga + cálculo FH — peça nova,
                                        // inspirada no bloco de F0 do AnaliseCiclo.js da Autoclave
                                        // (linhas 383-436: acumulação de 10^((T-tBase)/z)*dtMin por sensor),
                                        // mas com tBase/z de calor seco (PENDENTE confirmar valores)
```

Diferença importante em relação ao F0 da Autoclave: lá a "exposição" é autodetectada por limiar de temperatura (`avaliarLinhaParaExposicao_`, PASSO 2 do `AnaliseCiclo.js`). Aqui, como o Anexo E pede **3 repetições** do mesmo ensaio, faz mais sentido technician-marked (override manual de janela, já existe pronto em `cfLocalizarIndicePorTempo_`) do que autodetecção — evita reimplementar a máquina de estados de histerese/consecutivas só pra um caso que já tem um mecanismo mais simples disponível.

### Tabela de reaproveitamento

| Peça | Origem | Ação |
|---|---|---|
| `Parser.js` | Cadeia de Frio | Copia sem alteração — é agnóstico de equipamento |
| `Config.js` → perfis | Cadeia de Frio (`CFCFG.PERFIS`) | Novo `EBCFG.PERFIS` com 3 anexos, sensores mínimos por anexo (12/12/6), flag `temLetalidade` por perfil |
| `Engine.js` — distribuição/evento (F, I) | Cadeia de Frio (`cfAnalisarDistribuicao`, `cfAnalisarEventoRuptura`) | Copia com rename de prefixo, sem alteração de lógica |
| `Engine.js` — letalidade (E) | Autoclave (`AnaliseCiclo.js`, bloco F0) | Adapta: mesma fórmula, novos parâmetros térmicos (pendente confirmação), integra com override manual de janela em vez de autodetecção |
| Rampa de estabilização | Cadeia de Frio (rodada 23) | Copia direto — Estufa E/F também têm fase de aquecimento/pull-down inicial, é o mesmo conceito |
| `Planilha.js`/`Graficos.js` — TODOS os 15 fixes de layout das 25 rodadas do Cadeia de Frio (ver seção 4) | Cadeia de Frio | Herdados automaticamente por serem cópia do arquivo já corrigido |
| Indicador biológico/endotoxina | Novo | Campo manual no formulário — pendente decisão de UX com o usuário |
| Simulador (Relatório Interno) | Cadeia de Frio + Autoclave | Distribuição/evento copia do Cadeia de Frio; letalidade precisa de curva sintética nova (análoga ao gerador de F0 simulado da Autoclave) |

---

## 4. Fixes de layout já herdados (não serão redescobertos)

Lista das correções reais feitas nas 25 rodadas do Cadeia de Frio, todas dentro de `Planilha.js`/`Graficos.js`/`Engine.js` que serão copiados como ponto de partida — não é trabalho novo, é apenas a base já corrigida:

1. Gráfico ancorado na coluna 1 (não 2)
2. `LARGURA_PAGINA_PX` consistente entre todas as abas (1500px)
3. Barra de título vs. tabela com mesmo número de colunas mescladas
4. Rótulos longos mesclando 2 colunas (`cfEscreverRotulo_`)
5. Marcador de evento com wrap + largura dinâmica (não vaza da tabela)
6. Alturas de linha calibradas na Capa (não quebra pra 2ª página)
7. Orçamento de altura de linha nas abas de Gráfico (sem página em branco)
8. Filtro de sensores ativos propagado pra tabela de Dados Brutos, gráfico e stats de evento (3 pontos corrigidos na 12ª rodada)
9. Tabela "Comportamento dos sensores" nas páginas de evento sem ruptura (preenche o espaço vago)
10. Largura de coluna "Limite Mínimo/Máximo" (90px + wrap, não corta "Máximo (8.")
11. Legenda manual escrita como texto rico (não a legenda nativa sem rótulo do Sheets)
12. Paleta de cores de sensor na ordem categórica validada (azul→verde→magenta..., nunca duas frias adjacentes)
13. Tabela "Comportamento dos sensores" e "Conformidade por posição" usando a mesma fatia de dados (não Mín/Máx divergente)
14. Widths dinâmicos calculados por `header.length` em vez de hardcode
15. Console Operacional / log em tempo real no frontend (paridade com Autoclave)

## 5. Estrutura de abas do relatório proposta

Varia por anexo (perfil define quais abas existem):

- Capa — cliente/CNPJ, equipamento, anexo aplicável, normas citadas (mesmo padrão dinâmico do `cfListarNormasAplicaveis_`)
- Instrumentos e calibração
- **[E]** Distribuição em vazio (×3 repetições) — 1 aba consolidada com as 3 rodadas lado a lado ou 3 abas sequenciais (decidir com o usuário)
- **[E]** Penetração com carga + Letalidade (×3) — inclui campo de resultado do indicador biológico/endotoxina
- **[F, I]** Distribuição em vazio / com carga — igual ao Cadeia de Frio
- **[F]** Abertura de porta / Queda de energia — igual ao Cadeia de Frio
- Dados Brutos
- Conclusão Técnica + Parecer Técnico Final (assinatura, mesmo padrão)

## 6. Sequenciamento proposto (para reduzir risco)

Não construir os 3 anexos de uma vez. Ordem sugerida, do mais parecido com o já validado para o mais arriscado:

1. **Anexo F (incubação)** primeiro — é praticamente um recolor do Cadeia de Frio, risco quase zero, serve pra validar que o "clasp create + copiar projeto" correu bem e a base herdada realmente não regrediu nenhum dos 15 fixes.
2. **Anexo I (banho-maria)** — pequena variação de F (menos sensores, sem 24h fixo).
3. **Anexo E (esterilização/despirogenização)** por último — é onde mora a letalidade, o único componente genuinamente novo. Não começar essa parte sem antes confirmar com o usuário os parâmetros térmicos (tBase/z) e o formato do campo de indicador biológico/endotoxina.

## 7. Perguntas em aberto para o usuário (bloqueiam só a fase 3, não 1/2)

1. ~~Nome definitivo do módulo/projeto~~ — **RESOLVIDO 2026-07-21**: "Estufa+Banho-maria", prefixo `eb`.

2. ~~Parâmetros térmicos de referência (tBase, z)~~ — **RESOLVIDO 2026-07-21**, via pesquisa na internet (ver detalhe abaixo) + confirmação do usuário. Descoberta importante: **esterilização e despirogenização usam parâmetros DIFERENTES entre si** — não é um único FH, são dois cálculos distintos:

   | | Esterilização (mata esporo) | Despirogenização (destrói endotoxina) |
   |---|---|---|
   | Valor calculado | FH | FD (nome diferente) |
   | tBase | **170°C** | **250°C** |
   | z | **20°C** | **46,4°C** |
   | Processo típico de referência | 170°C por 32 min | 250°C por 30 min (redução 3-log de endotoxina) |
   | Indicador biológico | *Bacillus atrophaeus* (ATCC 9372), D160°C ≥ 2,5 min, z ≥ 20°C (EN ISO 11138-4) | Não há BI — mede-se redução de endotoxina (ensaio LAL) |

   Fontes: ISO 20857 (esterilização/despirogenização por calor seco), EN ISO 11138-4 (indicador biológico calor seco), USP/Ph.Eur. (parâmetros de despirogenização), PharmaJia (fórmula FH). **Ressalva**: não consegui acessar o texto literal do Anexo E da NBR 16328:2024 (norma paga) — isso é o padrão internacional consolidado que a indústria usa, o usuário confirmou usar esses valores mesmo sem conferência linha-a-linha do texto da norma brasileira.

3. ~~Indicador biológico/endotoxina: formato do campo~~ — **RESOLVIDO 2026-07-21**: campo manual com resultado binário (aprovado/reprovado), tipo (BI ou endotoxina), lote, validade, laboratório terceirizado responsável, e upload opcional do laudo em PDF.

4. ~~Estrutura das 3 repetições~~ — **RESOLVIDO 2026-07-21**: 1 aba consolidada com as 3 repetições lado a lado, veredito único consolidado no final (mesmo espírito do `ebConsolidarStatus_` que já existe para múltiplos estudos no mesmo laudo).

**As 4 perguntas que bloqueavam a Fase 3 (Anexo E) estão todas respondidas em 2026-07-21** — falta só a implementação.

## 8. Status da Fase 3 (Anexo E), 2026-07-21 — implementado e testado no motor, UI ainda pendente

**Config.js**: novos `ESTUDOS.DISTRIBUICAO_VAZIO_E`/`PENETRACAO_CARGA_E`; novo bloco `EBCFG.LETALIDADE` com `ESTERILIZACAO` (tBase 170, z 20, FH, fhMinimoSugerido 30) e `DESPIROGENIZACAO` (tBase 250, z 46.4, FD, fdMinimoNormativo 30 — este é benchmark universal, não palpite); novo perfil `ESTUFA_ESTERILIZACAO_DESPIROGENIZACAO` (anexo E, minSensores 12, temLetalidade true).

**Engine.js**: `ebAnalisarDistribuicaoVazioE_` (3 repetições da distribuição em vazio comum, sem letalidade, consolidadas — reprova o conjunto se qualquer repetição reprovar) e `ebAnalisarPenetracaoELetalidade_` (3 repetições com acumulação de FH/FD por sensor ao longo de toda a janela marcada — sem autodetecção de fase de exposição, é a janela inteira que o técnico marca, ver seção 3). O resultado do indicador biológico/endotoxina (campo manual) **sempre reprova a repetição se vier reprovado**, mesmo com FH/FD calculado suficiente — é o critério definitivo, o térmico é evidência de apoio.

**Main.js**: `ebMontarConfigEstudos_` estendido com `ebMontarConfigRepeticoesE_` (valida exatamente 3 repetições, converte janelas, carrega indicador por repetição); `ebExecutarAnaliseCompleta_` roteia os dois tipos novos, recortando `dadosCompletos` por repetição individualmente (não usa a fatia-envelope genérica).

**Planilha.js**: `ebMontarResultadosAnexoE_` (tabela simples com as 3 repetições lado a lado, vereditos e motivos) + `ebListarNormasAplicaveis_`/`ebMontarTextoTecnico_` ganharam parágrafos narrativos específicos para os dois estudos do Anexo E. **Este layout NÃO passou pelas 25 rodadas de refinamento visual que Distribuição/Evento/Autonomia tiveram no Cadeia de Frio** — é funcional, não polido.

**Teste (harness Node, 8 casos, `test_eb_anexo_e.js`)**: distribuição em vazio aprovando/reprovando corretamente por excursão; FH calculado em cenário de esterilização (175°C/35min ≈ 62 min, aprova) e cenário reprovado (168°C, ≈27,6 min, abaixo do mínimo de 30); FD calculado em despirogenização (255°C/32min ≈ 41 min, aprova); indicador biológico reprovado derruba o conjunto mesmo com térmica ok; `ebMontarConfigEstudos_` validando payload correto e barrando contagem errada de repetições. Todos os 8 casos passaram.

**Atualização 2026-07-21 (mesmo dia, rodada seguinte) — formulário do Anexo E implementado**:
- `Index.html` ganhou as duas seções (Distribuição em Vazio e Penetração com Carga, 3 repetições cada, campos de indicador biológico/endotoxina com upload de laudo em PDF por repetição, seletor de tipo de letalidade), com `aoTrocarPerfil`/`aoTrocarEstudosHabilitados` estendidos pra mostrar/esconder certo e `montarPayloadBase()` enviando `estudos.distribuicaoE`/`estudos.penetracaoE` no formato que o `Main.js` espera.
- **Descoberta que elimina um gap que eu tinha apontado antes**: `Simulador.js` já tinha um branch genérico (`else`, tratando qualquer `tipoEstudo` não reconhecido como distribuição comum) que cobre `DISTRIBUICAO_VAZIO_E`/`PENETRACAO_CARGA_E` sem precisar de nenhuma extensão — testado com o payload exato que o `Index.html` monta (Teste E9 do harness), rodando o pipeline completo (`Main.js` → `Simulador.js` → `Engine.js`) e aprovando corretamente. Não foi necessário mexer no Simulador.
- Checagem cruzada de todos os IDs novos do HTML contra o JS (sem duplicata/typo) + `node --check` no `<script>` extraído do `Index.html` — sintaxe OK.

**Rodada de auditoria pós-teste real (2026-07-21, mesmo dia)** — usuário mandou o laudo/certificado gerados de verdade e pediu pente-fino. Achados e correções:
- Gráfico achatado (Graficos.js sem `viewWindow` no eixo Y — Sheets incluía o zero na escala, espremendo a faixa real 33-37°C) → corrigido, eixo agora calculado a partir da faixa + folga de 15%.
- Checkbox "Equipamento conjugado (ex.: refrigerador + freezer)" ainda com exemplo de cadeia de frio → **removido inteiramente** (não checkbox relabeled — removido), porque nenhum dos 3 anexos deste módulo tem mínimo condicionado a volume/conjugado (confirmado na seção 2 do plano: F/E = 12 fixo, I = 6 fixo). Campo de Volume interno mantido só como dado informativo do laudo.
- **Achado grave**: o mínimo de sensores por anexo (12/12/6) nunca foi de fato validado — era só um valor de sugestão/exibição; o backend aceitava qualquer nSensores de 1 a 60 sem checar contra o mínimo do perfil. Corrigido: `ebObterSensoresMinimosPerfil_`/`ebValidarMinimoSensores_` (Main.js) agora bloqueiam a geração do laudo se nSensores < minSensores do perfil. Testado (4 casos: barra com menos, passa com exatamente o mínimo, nos dois anexos com mínimos diferentes).
- Prompt de IA do Certificado (`CertificadoIA.js`) tinha toda a lógica de "causas prováveis de desvio" baseada em refrigeração (evaporador, condensador, vedação de porta, compressor) — reescrito para aquecimento/processo térmico (resistência, controlador/set point, isolamento, ventilação interna).
- "equipamento de conservação" (Certificado.html), "armazenamento de produtos termolábeis" (Planilha.js), "fonte de refrigeração ativa" (Engine.js) e mais 2 comentários com "refrigerador/evaporador/prateleira" como exemplo — todos corrigidos para linguagem de processo térmico genérica.
- Checagem de mojibake (padrões clássicos de UTF-8 lido como Latin-1) em todo o projeto: nenhum encontrado.
- Confirmado: Parser.js não tem nenhuma validação de faixa de temperatura hardcoded — funciona igual para qualquer anexo (incluindo os 160-260°C do Anexo E). Import por arquivo único, colar dados, arquivo-por-sensor e Simulador multi-arquivo são todos agnósticos de perfil/temperatura.
- Rótulo "Distribuição de Temperatura (24h)" era fixo mesmo pro Banho-maria (Anexo I), que não exige 24h — agora o texto de ajuda troca dinamicamente por perfil (I = "duração definida pelo protocolo", F/E = "24h contínuas").
- Todos os harnesses Node re-rodados após as correções — nada regrediu.

## 9. Norma real recebida — documento de referência criado (2026-07-21)

O usuário enviou o **texto literal completo** da ABNT NBR 16328:2024 (62 páginas). Criado `docs/REFERENCIA_NBR16328_2024_ANEXOS_EFI.md` — consultar esse documento antes de qualquer decisão futura sobre regras de negócio do módulo, em vez de reconstruir de memória.

**Confirmações importantes da leitura completa:**
- Anexo E é **normativo** (mandatório); Anexo F e I são **informativo** (recomendação) — distinção que não existia no resumo original.
- **A pergunta do usuário sobre estufa de 40-50L está respondida definitivamente**: a norma exige 12 sensores no Anexo F **independente do volume declarado** — não há exceção de volume neste anexo específico (a regra de volume da seção 15 é a regra geral, substituída pelo texto específico do anexo). A decisão de remover a lógica de volume/conjugado do sistema estava certa.
- Confirmado: banho-maria com triplicata **opcional** ("se pertinente"), diferente do Anexo E onde é **mandatória** ("repetir três vezes") — a diferença de implementação (E sempre exige 3 repetições, F/I não) está certa.
- "Não é permitido desconsiderar qualquer sensor do relatório final" (seção 15) — já cumprido pelo motor, sem ação.

**Gaps novos identificados e corrigidos nesta rodada:**
- Anexo B.3.f exige registro impresso do ciclo do próprio equipamento para despirogenização — adicionado campo de upload por repetição na Penetração com Carga (Anexo E), com alerta (não bloqueio) no laudo se faltar.
- Anexo I.2.f exige constar se o ensaio usou tampa — adicionado campo na tela e na capa do laudo, condicional ao perfil Banho-maria.
- Anexo I.2.e (quantidade de líquido suficiente) — adicionado campo de observação livre na capa.

Todos os harnesses (incluindo um teste novo pro alerta de registro de ciclo) rodados e passando. Push feito.

## 10. Correção estrutural de UI + Modo Personalizado (2026-07-21, mesmo dia)

**Bug real encontrado pelo usuário**: ao selecionar Anexo E (esterilização/despirogenização) ou Banho-maria, a seção "Distribuição de Temperatura" comum (com hint de 24h, campo de rampa de estabilização, texto de ajuda mencionando "ensaio de 24h") continuava aparecendo, mesmo não fazendo sentido pra esses perfis. Causa raiz: `aoTrocarPerfil()` escondia só 2 de ~6 elementos que compunham aquele bloco (esqueci de esconder o hint de duração, a linha de rampa, o status da rampa e o texto de ajuda da rampa).

**Correção estrutural** (não um remendo pontual): todo o HTML da seção 3 foi reorganizado em **um único contêiner por bloco de estudo** (`blocoDistribuicaoComum`, `blocoAberturaPorta`, `blocoQuedaEnergia`, `blocoAutonomia`, `blocoDistribuicaoE`, `blocoPenetracaoE`), e `aoTrocarPerfil()` agora esconde/mostra **o bloco inteiro de uma vez** (`classList.toggle('hidden', ...)` no contêiner pai), não elemento por elemento. Isso elimina a classe inteira de bug ("esqueci de esconder um pedaço") em vez de só corrigir o caso relatado. Texto de ajuda da rampa também generalizado (removida menção fixa a "ensaio de 24h").

**Modo Personalizado (novo)**: usuário pediu explicitamente um jeito de, com senha de admin/gerente, liberar a contagem de sensores (1 a 60) sem respeitar o mínimo do anexo, para casos excepcionais — mas **sem nunca liberar faixa, tolerância ou critério de aprovação** (só a contagem de sensores). Implementado:
- Senha própria (`EBCFG.MODO_PERSONALIZADO`, Script Properties `MODO_PERSONALIZADO_SENHA`), separada da senha do Simulador Admin — essa afeta laudos reais, não só relatório interno.
- Botão na tela ("Ativar Modo Personalizado") + campo de senha inline; validado via nova API `apiValidarSenhaModoPersonalizado`.
- **Backend revalida a senha toda vez que o laudo é gerado com o modo marcado ativo** (`ebValidarSenhaModoPersonalizado_` dentro de `ebValidarMinimoSensores_`) — nunca confia numa flag do cliente sozinha.
- Trocar de perfil desativa o modo automaticamente (evita "vazar" uma liberação de senha pro próximo equipamento testado na mesma sessão).
- **Laudo mostra um aviso vermelho destacado na capa** quando o modo foi usado abaixo do mínimo real do anexo — nunca fica invisível que aquele ensaio saiu fora do padrão.

Testado: senha errada continua bloqueando; senha certa libera abaixo do mínimo; nenhuma regressão nos testes já existentes. Push feito.

**Ainda em aberto**:
- Os estudos do Anexo E não têm o controle "forçar aprovado/reprovado" no Relatório Interno que os outros estudos têm (não wireei `resultadoDesejado` pra eles) — o Simulador gera dado aleatório pra esses dois estudos; funciona pra smoke-test, mas não dá pra forçar deliberadamente um cenário de reprovação pela tela ainda.
- Nenhuma checagem visual real da Planilha gerada para Anexo E (mesma pendência dos outros dois anexos, mas aqui o layout também é mais rudimentar).
- Nenhum teste manual na tela de verdade (só harness Node) — vale abrir a URL e testar na prática.

## 11. Isenção do Relatório Interno na trava de sensor mínimo + renomeação de senha (2026-07-21)

**Bug encontrado**: `ebValidarMinimoSensores_` era chamada incondicionalmente dentro de `ebExecutarAnaliseCompleta_`, inclusive quando `modoEntrada === 'SIMULADO_ADMIN'` (Relatório Interno). Isso bloqueava até o próprio Relatório Interno se o teste usasse menos sensores que o mínimo do anexo — contradizendo o propósito do modo (teste interno, não laudo oficial). Corrigido com um retorno antecipado em `ebValidarMinimoSensores_` quando `modoEntrada` normalizado é `SIMULADO_ADMIN`.

**Importante — isso NÃO tocou a senha de entrada do Relatório Interno.** São duas travas independentes:
- `ebValidarSenhaSimuladorAdmin_` (Simulador.js) — senha `METROLABS@2026` (ou `SIMULADOR_ADMIN_SENHA` via Script Properties) para **entrar** no Relatório Interno. Continua exigida sempre, sem alteração.
- `ebValidarMinimoSensores_` (Main.js) — trava de contagem mínima de sensores em **laudos reais**. Só essa recebeu a isenção para quem já está dentro do Relatório Interno.

**Renomeação de senha**: `MODO_PERSONALIZADO.senhaFallback` trocado de `METROLABS@2026-ENGENHARIA` para `ENGENHARIA` (Config.js), a pedido do usuário. Testes (`test_eb_validacao_isolada.js`, `test_eb_minsensores.js`) atualizados com a nova senha. `node --check` e harness isolado (6/6 cenários) rodados antes do push. `clasp push --force` feito.

## 12. Manual do Operador dentro do sistema (2026-07-21)

Criado `docs/MANUAL_MODULO_ESTUFA_BANHOMARIA.md` — manual completo, campo por campo (o que é / para que serve / o que fazer / o que acontece), escrito para um operador leigo conseguir usar o módulo sozinho, sem depender de explicação pessoal. Cobre os 3 perfis, os 6 blocos de estudo, sensores, importação, status de aprovação, Relatório Interno, Modo Personalizado e um glossário de termos técnicos (FH/FD, indicador biológico, rampa de estabilização etc.).

Em seguida, transformado em página dentro do próprio WebApp: novo arquivo `Manual.html` (mesmo conteúdo, formatado com a paleta visual do sistema), `doGet(e)` em Main.js agora aceita `?page=manual` e serve essa página em vez do Index, e um botão **"Manual do Operador"** foi adicionado na barra de ações do topo da tela (abre em nova aba). `node --check` em Main.js ok. Push feito.

**Achado incidental (não corrigido, só documentado):** o bloco "Autonomia (Caixa Térmica)" — motor completo em Engine.js/Simulador.js/Planilha.js/Graficos.js/CertificadoRelatorio.js — não está listado em `estudosDisponiveis` de nenhum dos 3 perfis deste módulo, então nunca aparece na tela. É resíduo da cópia do Cadeia de Frio (autonomia de caixa térmica é conceito de transporte refrigerado, não se aplica a estufa/banho-maria). Inofensivo (invisível ao operador), mas é código morto — cabe uma limpeza futura se o usuário autorizar.

## 13. Manual: removida toda menção ao Relatório Interno (2026-07-21, mesmo dia)

Usuário determinou que o Relatório Interno é recurso exclusivamente administrativo e **não pode aparecer no manual do operador** — nenhuma referência, nem indireta. Removido de `docs/MANUAL_MODULO_ESTUFA_BANHOMARIA.md` e `Manual.html`:
- A seção inteira "Relatório Interno — o que é e quando usar".
- A linha "Relatório interno (dados reconstituídos)" da tabela de opções de "Modo de entrada" (agora lista só as 3 opções operacionais).
- A comparação "Diferente do Relatório Interno..." na abertura da seção de Modo Personalizado (reescrita como texto autônomo).
- A entrada "Relatório Interno" do Glossário.
- A menção dupla na tabela de Erros Comuns ("Senha do Relatório Interno ou do Modo Personalizado" → só "Senha do Modo Personalizado").

Seções renumeradas em cascata nos dois arquivos (11→16 no .md; 12→17 no .html, que tem +1 de offset por causa da seção "Como usar este manual" sem número). Conferido cruzamento de todos os anchors/links internos do HTML (índice, referências "ver seção X") um por um para não sobrar link quebrado ou número badalado. `clasp push --force` feito.

O botão "RELATÓRIO INTERNO" na tela principal (Index.html) **continua existindo e funcionando normalmente** — só o manual não fala sobre ele. Quem precisa saber que existe já sabe (é quem tem a senha).

## 14. Navegação do botão do Manual corrigida para a mesma aba (2026-07-21)

Usuário testou e reportou que o botão "Manual do Operador" abria em nova aba, mas o esperado era navegar na mesma aba (usando o botão "← Voltar ao sistema" já existente dentro do `Manual.html` para retornar). Corrigido: `target="_blank"` → `target="_top"` no link do botão em `Index.html` (o `Manual.html` já usava `target="_top"` nos dois botões de voltar, então a experiência agora é simétrica: sai e volta sempre na mesma aba). `clasp push --force` feito.

## 15. Fechamento da sessão (2026-07-21)

Usuário aprovou o resultado ("ficou ótimo o manual") e decidiu que **o mesmo padrão de Manual do Operador será replicado em todos os outros módulos** `gerador_*` (Cadeia de Frio, Autoclave, Lavadora) — decisão registrada em `project_inventory` e `project_estufa_modulo_plano` (memória). Sessão encerrada aqui: usuário vai testar o módulo manualmente na tela real e retomamos amanhã com o resultado desse teste.

## 16. Achado: uploads da Penetração com Carga (Anexo E) não aparecem em nenhum relatório (2026-07-21)

Usuário perguntou, olhando a tela, para onde vão os uploads "Laudo do laboratório (PDF)" e "Registro impresso do ciclo do equipamento" (Anexo E, por repetição) — se apareciam no Relatório 1 (planilha/PDF) ou no Relatório 2 (Certificado). Investigação no código (Main.js, Engine.js, Planilha.js, CertificadoRelatorio.js) confirmou:

- Os dois arquivos sobem para a pasta fixa do Drive "Estufa+Banho-maria - Uploads" (`ebObterPastaPersistente_`) e o `fileId` fica guardado num campo escondido — igual ao padrão dos outros uploads do sistema.
- **Registro impresso do ciclo**: só é *checado* (presente/ausente) para gerar um alerta de texto no Relatório 1 quando falta em despirogenização (Anexo B.3.f) — mas o arquivo em si nunca é linkado/anexado no documento.
- **Laudo do laboratório**: depois do upload, `laudoFileId` não é referenciado em nenhum outro lugar do código — não gera alerta, não aparece em nada.
- Os campos Lote/Validade/Laboratório responsável também são capturados no payload mas nunca escritos na planilha — só o tipo de resultado (BI/Endotoxina) e Aprovado/Reprovado aparecem na coluna "Laboratório" da tabela de repetições.
- **Nenhum dos dois arquivos aparece, de fato, em nenhum dos dois relatórios finais** — ficam só "soltos" na pasta do Drive, sem link clicável em lugar nenhum.

Sugeri adicionar link clicável + os campos de rastreabilidade na tabela do Relatório 1. **Usuário recusou por ora**: "não sei, não achei interessante isso, e nem útil vamos ter que pensar em algo melhor, vou pensar e voltamos a falar sobre isso". **Não implementado — fica como pendência em aberto, aguardando o usuário voltar com uma ideia melhor de formato.** Não mexer nisso sem ele retomar o assunto.

## 8. Como retomar (atualizado 2026-07-21)

1. Ler este documento (rodadas 9 a 15, mais recentes) + `project_estufa_modulo_plano` na memória para o estado completo — o módulo está funcionalmente **completo** (F/I/E implementados, testados, publicados), isto não é mais um "começar do zero".
2. Perguntar ao usuário o resultado do teste manual feito por ele antes de assumir que está tudo certo.
3. Se confirmado que está bom, avaliar com o usuário por qual módulo começar a replicar o Manual do Operador (`gerador_cadeia_frio_relatorio` é o candidato natural, por ser o mais maduro/estável) — conferir antes se aquele módulo tem algum recurso administrativo por senha (equivalente ao Relatório Interno daqui) que precise ficar de fora do manual.
