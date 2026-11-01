# Programa de melhoria do SGO+ — Etapa 0: diagnóstico

Data: 01/11/2026. Levantamento sem correção de código. Base: o pedido do dono de 31/10/2026 ("tudo que tiver na versão mobile seja melhorado"; "muita coisa entra e não tem botão de volta"; "relatório no mobile não volta"; "no Comercial a metodologia está muito confusa").

Como foi feito: o SGO+ rodou no ensaio local (servidor `sgo_servidor`, pasta `legado/` igual à produção, banco novo só com dados de teste, modo ensaio, sem envios para fora). Um robô de navegador entrou com três perfis (Diretoria, Técnico e Cliente), abriu **cada item do menu** em 360 px, 390 px (celular) e 1366 px (computador), entrou no primeiro sub-nível de cada tela (detalhe, ficha, formulário, relatório), mediu rolagem lateral, elementos fora da tela, botões pequenos, botões flutuantes por cima de botões, mensagens de erro e erros de JavaScript, e testou o Voltar da barra do topo e o voltar do navegador (o mesmo do botão do Android e do gesto). Depois, fluxos dirigidos para relatórios, documentos A4, janelas, Ajuda e Comercial. Produção (179.197.73.61) não foi tocada.

Capturas: `C:\Users\venda\AppData\Local\Temp\claude\c--Users-venda-projetos-google-script-dev\789c3f85-51de-441e-a702-193b796e079a\scratchpad\programa_melhoria\etapa0\` (nome `{modulo}_{largura}_{perfil}_{NN}_{descricao}.png`; os resultados medidos de cada tela ficam em `resultado_{perfil}.jsonl` e `resumo.txt` na mesma pasta).

---

## 1. Resumo para o dono

**O que está acontecendo com o "voltar".** O SGO+ é uma página só: quando você toca num módulo, a tela troca por dentro, mas o navegador não fica sabendo. Por isso:

1. **O botão voltar do Android (ou o gesto) sai do sistema.** Em todos os perfis e larguras, voltar pelo celular levou a uma página em branco. Ao abrir de novo, o SGO+ começa no Início: o que você estava vendo se perde.
2. **O Voltar da barra do topo nunca leva à tela anterior**: em metade dos casos testados leva ao Início do sistema, e no resto reabre o módulo do começo, sem o filtro e sem a ficha que estavam abertos. Quem está na ficha de um relatório, de uma oportunidade ou de um equipamento e toca em Voltar cai no Início e precisa achar o caminho de novo.
3. **Janelas (detalhe da atividade, ficha do relatório do ciclo, proposta, oportunidade) cobrem a barra do topo inteira.** Só fecham pelo "×" ou "Fechar" de cada uma; o voltar do celular, em vez de fechar a janela, sai do sistema.
4. **Relatórios e documentos A4 abrem numa aba nova, sem nenhum botão de voltar.** O relatório mensal do Comercial, o manual da Ajuda, os relatórios de Compras e da Assistência, os certificados e os modelos de autoclave e lavadora abrem em aba em branco (sem endereço e sem histórico). No celular, quem não sabe trocar de aba fica preso: é exatamente o "relatório no mobile não volta". São 77 pontos do código que abrem aba nova.
5. **Atualizar a página ou reabrir o app volta para o Início.**

**A boa notícia:** isso tem **uma causa só** e dá para resolver **num lugar só** (a casca do sistema), sem mexer tela por tela: o SGO+ passa a avisar o navegador a cada tela, sub-nível e janela, e o voltar do celular, o Voltar da barra e o Voltar de cada tela passam a fazer a mesma coisa (voltar um passo). Os relatórios A4 passam a abrir dentro do próprio SGO+, num visualizador com Voltar, Imprimir e Baixar PDF. Essa é a **Etapa 1**.

**O que mais apareceu nas telas.** As telas, em geral, cabem no celular (a barra do topo e os botões redondos refeitos em 31/10 funcionam): nenhuma tela teve rolagem lateral, nenhuma travou carregando e não houve erro de JavaScript. Os problemas que mais pesam são: janelas que ficam presas por cima de outras telas (a "Nova assinatura" do E-mail continua na frente de qualquer módulo aberto depois); janelas de celular muito longas e cheias de botões (a proposta tem 58 campos e 9 botões numa janela só); a primeira tela de quase todo módulo gasta com título, explicação e botões empilhados, com o conteúdo só abaixo da dobra; formulários técnicos de 5 a 9 mil pixels de altura com chaves de 22 px; tabelas largas dentro dos documentos A4 que cortam no celular, linhas de abas cortadas na lateral, e palavras técnicas ("Kanban", "Gantt", "SLA", "ponderado", "higiene") em telas que o cliente e o técnico usam. A tabela da seção 2 lista tudo, tela por tela.

**Comercial.** A página de Metodologia é uma única tela de 16 blocos, com 56 caixas de texto e 43 campos (10 mil pixels de altura no celular), que mistura quatro assuntos diferentes: o jeito de vender (funil, cadência, objeções), a política de preço e desconto, o modelo do documento da proposta (textos e cláusulas) e a passagem do pedido aos setores. As etapas do funil são editadas como texto com barras ("nome | % | dias | critério | itens"), e existem **duas "margens mínimas"** em lugares diferentes. Além disso, **a conta do preço ainda não tem os números da Metrolabs**: alimentação, diárias, hospedagem, impostos, margem mínima e margem alvo estão vazios, e o custo de cada serviço do catálogo é um número digitado à mão, sem mostrar de onde vem (hora técnica, horas por serviço, padrões, deslocamento). A proposta abre dizendo "margem: sem valor para calcular". A seção 4 explica e lista as perguntas que só o senhor pode responder.

**Plano.** Etapa 1: navegação e casca (voltar único, visualizador de documentos, janelas). Etapas 2 a 6: módulos por ordem de uso e de dor. Trilha própria do Comercial (C1 a C4), que começa por levantar os custos com o senhor. Detalhes na seção 5.

---

## 2. Inventário e achados por módulo e tela

### 2.1 O que foi testado

- **303 telas medidas** (item do menu × largura × perfil) e **169 sub-níveis** abertos e capturados. Perfis: Diretoria (74 itens no menu; mesma visão do Administrador e da gestão), Técnico (41 itens) e Cliente (6 itens: Início, Meus chamados, Unidades, Equipamentos, Relatórios de ciclo, Documentos). Larguras: 390 px e 1366 px para todos os perfis; 360 px para Técnico e Cliente completos e parte da Diretoria.
- **Fluxos dirigidos** (390 px, Diretoria): ficha e documento do Relatório do ciclo, detalhe da atividade, proposta e oportunidade do Comercial, relatório mensal A4 do Comercial, Ajuda e manual do módulo, recarregar a página.
- **Nenhum erro de JavaScript** apareceu no console em nenhuma das telas, **nenhuma tela travou** em "Carregando" e **nenhuma tela tem rolagem lateral da página** nas três larguras. O fim das telas não fica mais embaixo dos botões redondos (conferido rolando cada tela até o fim em 360 px). Essas eram as partes refeitas em 31/10 e estão boas.
- Ficaram de fora: telas que dependem de integração externa (Auvo real, WhatsApp oficial, e-mail real, portões), o aplicativo de campo do técnico (`/campo`) e o perfil Representada.

Inventário das telas do menu (perfil G = Diretoria e gestão, T = Técnico, C = Cliente). "Sub-nível testado" é o primeiro botão de entrada que o robô encontrou; "Voltar da barra" é para onde o Voltar do topo do celular levou depois do sub-nível.

| Tela (menu) | Chave | Perfis | Sub-nível testado | Altura em 390 px | Voltar da barra, a partir do sub-nível |
|---|---|---|---|---|---|
| Início | `dashboard` | G, T, C | Ver todas as pendências (4); Ver todas as pendências (1) | 3.358 px | Início do sistema |
| Minhas atividades | `minhas_atividades` | G, T | Detalhes; Nova atividade | 2.231 px | início do módulo |
| Atividades da equipe | `atividades_equipe` | G, T | Nova atividade | 2.053 px | início do módulo |
| Avisos | `avisos` | G, T | Novo aviso | 845 px | início do módulo |
| Meus avisos | `meus_avisos` | G, T | Ver a prévia | 1.451 px | Início do sistema |
| Assistente do ponto | `ponto` | G | — | 1.257 px | — |
| E-mail | `email` | G, T | Nova assinatura | 1.426 px | início do módulo |
| Autoclaves | `autoclave` | G, T | Abrir a tela completa; Relatório oficial | 845 px | Início do sistema |
| Lavadoras | `lavadora` | G, T | Abrir a tela completa; Relatório oficial | 845 px | Início do sistema |
| Cadeia de frio | `cadeia_frio` | G, T | Abrir a tela completa; Pré-visualizar dados | 845 px | Início do sistema |
| Estufa, banho-maria e secadora | `estufa_banhomaria` | G, T | Abrir a tela completa; Pré-visualizar dados | 845 px | Início do sistema; início do módulo |
| Esterilização a baixa temperatura | `baixa_temperatura` | G, T | Novo ensaio | 845 px | Início do sistema |
| Relatório QI/QO/QD | `declaracao_qiqo` | G, T | — | 9.430 px | — |
| Laudo NR-13 | `nr13` | G, T | — | 1.511 px | — |
| Certificado de calibração | `certificado_calibracao` | G, T | + Novo cliente | 845 px | clientes |
| Relatório de calibração | `relatorio_calibracao` | G, T | — | 5.470 px | — |
| Padrões de referência | `padroes` | G, T | Relatórios gerenciais | 1.446 px | Início do sistema; início do módulo |
| Declaração de execução | `declaracao_exec` | G, T | — | 5.691 px | — |
| PGT e POP | `pgt_pop` | G, T | — | 2.916 px | — |
| Registros operacionais | `reg_op` | G, T | — | 1.755 px | — |
| Planejamento CME | `planejamento_cme` | G, T | Abrir a tela completa | 845 px | Início do sistema |
| Cronograma de execução | `cronograma_execucao` | G, T | — | 1.805 px | — |
| Integração Auvo | `auvo` | G | Tentar de novo as falhas | 3.413 px | Início do sistema |
| Frota | `frota` | G, T | — | 845 px | — |
| Hoje no Comercial | `comercial` | G | Abrir a política | 1.680 px | Início do sistema |
| Oportunidades | `comercial_oportunidades` | G | Ver em lista | 1.723 px | Início do sistema |
| Quadro do funil | `comercial_kanban` | G | Ver o Gantt | 1.923 px | Início do sistema |
| Gantt comercial | `comercial_gantt` | G | Ver o quadro | 1.511 px | Início do sistema |
| Propostas | `comercial_propostas` | G | — | 904 px | — |
| Pedidos aprovados | `comercial_pedidos` | G | — | 845 px | — |
| Produtos e serviços | `comercial_catalogo` | G | Novo item | 2.182 px | início do módulo |
| Painel comercial | `comercial_painel` | G | Relatório mensal A4 (abre aba nova) | 3.878 px | Início do sistema |
| Metodologia comercial | `comercial_metodologia` | G | — | 10.739 px | — |
| Pedir peça ou material | `compras_pedir` | G, T | — | 1.820 px | — |
| Informar compra já feita | `compras_informar` | G, T | — | 2.707 px | — |
| Meus pedidos de compra | `compras_meus` | G, T | — | 845 px | — |
| Fila de compras | `compras` | G | Novo pedido | 1.074 px | Início do sistema |
| Fornecedores | `compras_fornecedores` | G | Novo fornecedor | 845 px | início do módulo |
| Conferência do Financeiro | `compras_financeiro` | G | — | 845 px | — |
| Conciliação das faturas | `compras_conciliacao` | G | Relatório A4 da fatura | 845 px | Início do sistema |
| A pagar | `compras_apagar` | G | — | 845 px | — |
| Cartões da empresa | `compras_cartoes` | G | Novo cartão | 845 px | início do módulo |
| Painel de compras | `compras_painel` | G | Relatórios | 1.294 px | Início do sistema |
| Regras de compras | `compras_regras` | G | — | 3.734 px | — |
| Chamados | `assistencia` | G, T | Abrir chamado | 997 px | Início do sistema |
| Abrir chamado | `assistencia_abrir` | G, T | Ver os chamados | 1.485 px | Início do sistema |
| Ordens de serviço | `assistencia_os` | G, T | — | 845 px | — |
| Agenda dos técnicos | `assistencia_agenda` | G, T | — | 846 px | — |
| Solicitações dos clientes | `assistencia_solicitacoes` | G | — | 845 px | — |
| Reclamações | `assistencia_casos` | G | — | 845 px | — |
| Indicadores da assistência | `assistencia_indicadores` | G | Relatório mensal A4 | 1.635 px | Início do sistema |
| Regras da assistência | `assistencia_regras` | G, T | Novo tipo | 13.953 px | início do módulo |
| Transição do Auvo | `assistencia_transicao` | G | Relatório aprovado pela Qualidade | 1.691 px | início do módulo |
| Representação | `representacao` | G, T | Relatório do período (abre aba nova) | 1.501 px | Início do sistema; início do módulo |
| Segurança e automação predial | `automacao_predial` | G | — | 1.222 px | — |
| Caixa de decisões | `gestao_decisoes` | G | Abrir a tela de resolver | 2.135 px | Início do sistema |
| Desempenho da gestão | `gestao_desempenho` | G | Relatórios | 1.911 px | Início do sistema |
| Painel de qualidade | `qualidade` | G | — | 1.416 px | — |
| Programa de conduta | `conduta` | G, T | cartão Registrar missão; Relatórios e extratos | 1.152 px | início do módulo |
| Clientes | `clientes` | G, T | Novo cliente | 1.614 px | início do módulo |
| Unidades | `unidades` | G, T, C | Nova unidade; Ver detalhes | 1.572 px | início do módulo |
| Equipamentos | `equipamentos` | G, T, C | Novo equipamento | 3.715 px | início do módulo |
| Relatórios de ciclo | `lavadora_ciclos` | G, T, C | Ver todas as lavadoras | 1.829 px | Início do sistema; início do módulo |
| Vínculos | `vinculos` | G, T | cartão 0Clientes sem unidade | 1.443 px | Início do sistema; início do módulo |
| Correções de cadastro | `cadastro_correcoes` | G, T | — | 2.122 px | — |
| Arquivo de documentos | `documentos` | G, T, C | Novo documento | 1.116 px | início do módulo |
| Inventário de equipamentos | `inventario` | G, T | — | 1.271 px | — |
| Usuários | `usuarios` | G | Novo usuário | 3.110 px | início do módulo |
| Configurações | `admin` | G, T | — | 1.551 px | — |
| Chaves e senhas | `chaves` | G | — | 1.110 px | — |
| Segurança do acesso | `seguranca_acesso` | G | — | 6.585 px | — |
| Piloto do WhatsApp | `whatsapp_piloto` | G | — | 1.847 px | — |
| Matriz de avisos | `avisos_matriz` | G | Ver a trilha inteira | 36.294 px | Início do sistema |
| Perguntas ao assistente | `assistente` | G | — | 1.039 px | — |
| Meus chamados | `assistencia_portal` | C | — | 844 px | — |

Sub-níveis que cada módulo tem e que o voltar central precisa cobrir (levantados no código):

| Módulo | Sub-níveis (janela, ficha, formulário, documento) |
|---|---|
| Minhas atividades / Atividades da equipe | detalhe da atividade (janela), nova atividade (janela), pedido de nova data (janela), trava de atraso (janela bloqueante, de propósito), modos Lista / Agenda / Kanban / Gantt |
| Avisos | novo aviso (janela), ciência (janela na entrada do sistema) |
| E-mail | conversa, responder, nova assinatura (janela `em-overlay`) |
| Qualificação (Autoclave, Lavadora, Cadeia de frio, Estufa, Baixa temperatura) | resumo → "Abrir a tela completa" → formulário longo em etapas → pré-visualização → relatório oficial A4 (aba nova) → manual do operador (aba nova) |
| Calibração e documentos (Certificado, Relatório de calibração, Declarações, NR-13, PGT/POP, Registros, Padrões) | formulário único longo, "+ Novo cliente" (vai para Cadastros), documento A4 (aba nova), relatórios gerenciais dos padrões |
| Planejamento CME / Cronograma | resumo → tela completa → receitas, grupos, datas; documento A4 |
| Frota | retirada, devolução, vistoria, abastecimento, manutenção (barra fixa no rodapé), relatório (aba nova) |
| Comercial | ficha da oportunidade (gaveta), registrar contato, mudar etapa, ganhar, perder (janelas), proposta (janela de 58 campos), documento da proposta (aba nova), relatório mensal (aba nova), produto (janela), reajuste (janela) |
| Compras | pedido, cotação, aprovação, recebimento, conferência, conciliação, relatórios A4 (aba nova) |
| Assistência técnica | chamado, O.S. (checklist, fotos, assinatura), agenda, solicitação, caso, regras, relatório da O.S. e relatório mensal (aba nova) |
| Relatório do ciclo da lavadora | painel → lista por lavadora → ficha do relatório (janela) → relatório A4 (aba nova) → assinar (janela) → nova versão |
| Representação | chamados da representada, relatório do período (aba nova) |
| Cadastros (Clientes, Unidades, Equipamentos, Vínculos, Correções) | lista → ficha → formulário; prontuário do equipamento; no celular, telas próprias (`MOBILE_NAV`) |
| Gestão (Caixa de decisões, Desempenho) | regras e responsáveis, relatórios A4 (aba nova) |
| Ajuda e "Tire sua dúvida" | painel de ajuda (janela), manual completo do módulo (aba nova), assistente (janela) |

### 2.2 Achados

Gravidade: **grave** = impede ou trava o uso, ou faz perder o que estava fazendo; **médio** = atrapalha, confunde ou exige muito esforço; **leve** = acabamento. As capturas estão na pasta da Etapa 0 (caminho no início do documento).

| # | Módulo / tela | Larg. / perfil | Gravidade | Descrição | Captura | Causa provável |
|---|---|---|---|---|---|---|
| 1 | Todas as telas | 360, 390, 1366 / todos | **grave** | Botão voltar do Android, gesto ou botão do navegador **sai do SGO+** (página em branco). Ao avançar de novo, o sistema reabre no Início. | `navegacao_390_gestao_99_depois-do-voltar-do-navegador.png`, `navegacao_390_gestao_55_reaberto-apos-sair-perde-a-tela.png` | Nenhuma tela grava passo no histórico do navegador (`abrir()` sem `pushState`; nenhum `popstate`). |
| 2 | Relatórios e documentos A4 (Comercial, Compras, Assistência, Representação, Gestão, Frota, qualificações, certificados, manuais) | 390 / Diretoria | **grave** | Abrem em **aba nova em branco, sem nenhum botão Voltar** (só "Imprimir ou salvar em PDF"); a aba não tem histórico, o voltar não faz nada. É o "relatório no mobile não volta". | `comercial-painel_390_gestao_60_relatorio-mensal-nova-aba.png`, `ajuda_390_gestao_63_manual-nova-aba.png`, `representacao_390_gestao_54c_nova-aba.png` | 77 chamadas a `window.open("", "_blank")` + `document.write`; a barra comum do A4 (`SGO_DocA4.js`, linha 534) não tem Voltar. |
| 3 | Relatório do ciclo > abrir relatório | 390 / Diretoria | **grave** | "Abrir o relatório" abre o A4 em aba nova (`/arquivos/...`), sem volta. Na ficha (janela), o Voltar da barra fica coberto. | `lavadora-ciclos_390_gestao_52_relatorio-aberto.png`, `lavadora-ciclos_390_gestao_53_relatorio-em-nova-aba.png` | `window.open(u, "_blank", "noopener")` em `JS_LavCiclo.html`; janela `atv-overlay` cobre a barra. |
| 4 | Janelas de todos os módulos (atividade, proposta, oportunidade, ficha do relatório, cadastros, fornecedor, cartão, assinatura do e-mail, regras) | 360, 390 / todos | **grave** | No celular a janela **cobre a barra do topo**: o Voltar fica inacessível ("Voltar COBERTO" medido); só sai pelo "×"/"Fechar" de cada janela, que muda de lugar e de nome. O voltar do Android, com janela aberta, sai do sistema. | `minhas-atividades_390_gestao_56_janela-detalhe.png`, `lavadora-ciclos_390_gestao_52_relatorio-aberto.png` | Janelas criadas no `body` com `position: fixed` e índice acima da barra; fora de qualquer pilha de navegação. |
| 5 | Voltar da barra do topo, a partir de sub-níveis | 360, 390 / todos | **grave** | Em 56 de 106 sub-níveis testados no celular o Voltar leva ao **Início do sistema** (e não à tela anterior); em 43, reabre o módulo do começo, perdendo filtro, aba e posição. Ex.: Comercial (todas as seções), Compras, Assistência, Relatório do ciclo (cliente), Padrões, Caixa de decisões, Meus avisos, Vínculos. | `resumo.txt` (coluna "voltarTopo") | `voltarMobile_()` só conhece "formulário de cadastro do celular → lista"; o resto vai para `mobile_home`. |
| 6 | Recarregar a página / reabrir o app | 390 / Diretoria | médio | Recarregar estando em Oportunidades volta para o Início. | `navegacao_390_gestao_64_depois-de-recarregar.png` | A tela atual não fica no endereço (`#/modulo`). |
| 7 | E-mail > Nova assinatura | 360, 390, 1366 / Diretoria, Técnico | **grave** | A janela "Nova assinatura" **continua aberta por cima de qualquer outro módulo** aberto pelo menu ou pela busca; a pessoa troca de tela e a janela segue na frente. | `email_390_gestao_07d_subnivel.png` (e, na primeira rodada, a mesma janela por cima da Declaração QI/QO: `contaminado/declaracao-qiqo_360_gestao_13a_tela.png`) | `abrir()` não fecha janelas abertas; `em-overlay` com `z-index` 9000. O mesmo acontece com as janelas `atv-overlay`: depois do Voltar da barra, continuaram abertas as de Detalhes e Nova atividade, Novo aviso, Novo item do catálogo, Novo fornecedor, Novo cartão, Novo tipo (Regras da assistência) e Transição do Auvo. |
| 8 | Certificado de calibração > "+ Novo cliente" | 390 / Diretoria, Técnico | médio | Depois de abrir "+ Novo cliente" de dentro do certificado, o Voltar leva à lista de **Clientes**, e não de volta ao certificado que estava sendo preenchido. | `certificado-calibracao_390_gestao_15d_subnivel.png` | Retorno ao assistente do certificado depende de `MOBILE_CERTCAL_RETORNO`, que `voltarMobile_()` zera. |
| 9 | Comercial > Metodologia | 390, 1366 / Diretoria | **grave** (para o Comercial) | Página única de 16 blocos, 56 caixas de texto e 43 campos (10.739 px no celular); regras escritas como texto com barras; duas "margens mínimas"; textos cortados nas caixas; "padrão trazido do Comercial do COMMAND" (sistema descontinuado). Detalhes na seção 4. | `comercial-metodologia_1366_gestao_33a_tela.png`, `comercial-metodologia_1366_gestao_72_pagina-inteira.png` | Configuração inteira editada numa tela só (`Comercial_desenharMetodologia_`). |
| 10 | Comercial > Proposta | 390, 1366 / Diretoria | **grave** (para o Comercial) | Janela com 58 campos e 9 botões; abre com "Margem: sem valor para calcular" e a lista do que falta na política de preço; o botão redondo "?" cobre o canto do campo de texto. | `comercial-propostas_390_gestao_71_proposta-meio.png`, `comercial-propostas_1366_gestao_70_proposta-aberta.png` | Proposta sem passos; política de precificação vazia. |
| 11 | Comercial (todas as seções) | 360, 390 / Diretoria | médio | Barra de 9 abas que corre para o lado e aparece cortada ("Pedi…", "Pr…", "…os"); o cabeçalho (título, explicação, Atualizar, "Ver o Gantt", Nova oportunidade, Atividades do módulo e 6 filtros) ocupa a primeira tela inteira antes do primeiro cartão. | `comercial-kanban_390_gestao_27a_tela.png`, `comercial-propostas_390_gestao_57_lista.png` | Barra de seções sem indicação de "tem mais"; filtros sempre abertos. |
| 12 | Comercial > Hoje | 390 / Diretoria | leve | Texto técnico para a equipe: "Sem a chave da IA, a gestora trabalha só pelas regras"; "Panorama da gestão", "ponderado", "higiene". | `comercial_390_gestao_02a_tela.png` (pasta `teste/`) e `comercial_390_gestao_25a_tela.png` | Textos escritos do ponto de vista do sistema. |
| 13 | Padrão de cabeçalho em quase todos os módulos | 360, 390 / todos | médio | No celular a primeira tela é gasta com título, explicação longa, botões empilhados de largura total (Atualizar, Atividades do módulo, Regras…) e quadros "Como funciona"; o conteúdo começa abaixo da dobra. Ex.: Caixa de decisões, Matriz de avisos, Piloto do WhatsApp, Minhas O.S., Quadro do funil. | `gestao-decisoes_390_gestao_56a_tela.png`, `assistencia-os_390_tecnico_28a_tela.png`, `avisos-matriz_390_gestao_73a_tela.png` | `module-header` empilha tudo no celular; o botão "Atividades do módulo" é injetado pela casca em todo módulo. |
| 14 | Minhas atividades (lista) | 360, 390 / Diretoria, Técnico | médio | Cada atividade tem três botões de largura total (Iniciar, Detalhes, Concluir): uma atividade ocupa quase a tela inteira; com 4 abertas, a lista é longa. Os botões redondos ficam sobre "Concluir"/"Iniciar" enquanto se rola. | `minhas-atividades_390_gestao_02a_tela.png` | Cartão de lista com ações em coluna no celular. |
| 15 | Relatório QI/QO/QD, Relatório de calibração, Declaração de execução | 360, 390 / Diretoria, Técnico | médio | Formulário único muito longo (9.430 px, 5.470 px e 5.691 px em 390 px), sem índice das seções; chaves liga/desliga de **22 × 22 px** (15, 2 e 7 por tela; o mínimo é 44 × 44). | `declaracao-qiqo_390_gestao_13a_tela.png`, `declaracao-qiqo_390_gestao_13b_pagina-inteira.png` | Formulário do computador apenas empilhado no celular; estilo de chave sem tamanho de toque. |
| 16 | Cadeia de frio e Estufa > tela completa | 360, 390 / Diretoria, Técnico | médio | 16 a 17 controles abaixo de 40 px na tela completa (chaves e marcadores). | `cadeia-frio_390_gestao_10d_subnivel.png` | `SGO_CadeiaFrioRel_ConteudoModulo.js`, `SGO_EstufaBanhoRel_ConteudoModulo.js` sem regra de toque. |
| 17 | Matriz de avisos | 390 / Diretoria | médio | Página de **36.294 px** de altura no celular; tabelas de 800 px em caixa rolável. | `avisos-matriz_390_gestao_73b_pagina-inteira.png` | Uma linha por aviso × canal, sem agrupar nem recolher. |
| 18 | Regras da assistência | 390 / Diretoria, Técnico | médio | Página de 13.953 px no celular. | `assistencia-regras_390_gestao_52b_pagina-inteira.png` | Todas as regras abertas de uma vez. |
| 19 | Piloto do WhatsApp | 390 / Diretoria | médio | Jargão de configuração na tela ("falta gravar META_WA_TOKEN e META_WA_PHONE_ID", "Z-API", "(vazio)"); data no formato `2026-11-01 00:28` (fora do padrão pt-BR); 8 marcadores de 22 × 22 px. | `whatsapp-piloto_390_gestao_72a_tela.png` | Mensagem técnica exibida direto; data sem formatação. |
| 20 | Segurança do acesso | 390 / Diretoria | leve | Tabela de pessoas com 800 px em caixa rolável (rolagem lateral só dentro da caixa); página de 6.585 px. | `seguranca-acesso_390_gestao_71b_pagina-inteira.png` | Tabela do computador sem versão em cartões. |
| 21 | Equipamentos (cliente) | 360, 390 / Cliente | médio | O cliente vê o filtro "Todos os clientes" e números de "Vínculo pendente" e "Cadastro incompleto", que são da rotina interna. | `equipamentos_360_cliente_04a_tela.png` | Mesma tela da equipe, sem esconder filtros e indicadores internos para o perfil Cliente. |
| 22 | Meus chamados (cliente) | 360 / Cliente | leve | Abas "Kanban" e "Gantt" para o cliente; o botão "Lista e relatório" aparece cortado em 360 px. | `assistencia-portal_360_cliente_02a_tela.png` | Vocabulário interno; três botões lado a lado sem quebra. |
| 23 | Meus avisos > Ver a prévia | 390 / Diretoria, Técnico | médio | Depois de abrir a prévia, o Voltar da barra vai para o Início. | `meus-avisos_390_gestao_05d_subnivel.png` | Ver achado 5. |
| 24 | Representação > Relatório do período | 360, 390, 1366 / Diretoria, Técnico | **grave** | Relatório abre em aba nova sem volta (ver achado 2); no celular, a escolha do período ("Últimos 30 dias / 90…") fica sob o botão redondo. | `representacao_390_gestao_54c_nova-aba.png`, `representacao_390_gestao_54d_subnivel.png` | `window.open` + `document.write`. |
| 25 | Relatório mensal do Comercial (A4 no celular) | 390 / Diretoria | médio | A folha A4 vem com 980 px de largura: a tabela "Funil em aberto" sai cortada à direita ("Va…"). | `comercial-painel_390_gestao_60_relatorio-mensal-nova-aba.png` | A4 sem regra de tabela larga no celular (o Relatório do ciclo já resolve com "Ver em tamanho real"). |
| 26 | Trava de atividade atrasada | 360, 390 / Técnico | leve (comportamento de propósito) | A janela "bloqueante" das atividades atrasadas aparece por cima de qualquer tela, como foi pedido. Na Etapa 1, o voltar **não pode** fechá-la. | `resultado_tecnico.jsonl` (campo `janelaAoSair`) | Regra "atraso bloqueia até justificar". |
| 27 | Botões redondos ("?" e bate-papo) | 360, 390, 1366 / todos | leve | Enquanto se rola, ficam por cima de botões e campos que estão no rodapé da tela naquele momento (Concluir, Buscar, campos de cliente). No fim da tela, não cobrem mais nada. No computador, "Tire sua dúvida" cobre parte de campos de texto largos. | `minhas-atividades_390_gestao_02a_tela.png`, `comercial-metodologia_1366_gestao_33a_tela.png` | Botão fixo sobre o conteúdo; esperado, mas pede espaço lateral ou recolher ao rolar. |
| 28 | Cadeia de frio e Estufa > Pré-visualizar dados (computador) | 1366 / Diretoria, Técnico | leve | Sem arquivo, a mensagem é "Não foi possível pré-visualizar os dados: Informe o link ou…": diz o que fazer, mas o botão poderia ficar desligado até haver arquivo. | `cadeia-frio_1366_gestao_10d_subnivel.png` | Validação só depois do clique. |
| 29 | Ajuda > Manual completo do módulo | 390 / Diretoria | **grave** | O manual abre em aba em branco, sem volta (ver achado 2). | `ajuda_390_gestao_63_manual-nova-aba.png` | `window.open` + `document.write` em `JS_Core.html` (linhas 5308 e 8763). |
| 30 | Assistência > Abrir chamado e lista | 360, 390 / Diretoria, Técnico | leve | Filtros "Encerrados", "Fila livre" e o campo "Tipo, marca, setor" ficam sob os botões redondos ao rolar. | `assistencia_390_gestao_45a_tela.png` | Igual ao achado 27. |

---

## 3. Navegação e "voltar": como funciona hoje e por que falha

### 3.1 Como funciona hoje

| Peça | Onde | Como se comporta |
|---|---|---|
| Troca de tela | `abrir(mod)` em `JS_Core.html` (roteador central, cerca de 75 chamadas espalhadas) | Redesenha `#conteudo` por dentro. **Não grava nada no histórico do navegador**: o código inteiro não usa `history.pushState` nem `popstate` (só dois `replaceState` para limpar parâmetros em `JS_EnviarDoc.html` e `JS_SegurancaAcesso.html`). O endereço da página nunca muda. |
| Voltar da barra do topo (celular) | `voltarMobile_()` em `JS_Core.html` | Só conhece dois casos: se a tela é um formulário dos cadastros do celular (`MOBILE_NAV.tela === "form"`), volta para a lista do módulo; em **qualquer outro caso, abre o Início**. Não sabe que existe ficha, aba, janela ou relatório aberto. |
| Sub-níveis dentro do módulo | cada módulo, do seu jeito | Alguns trocam o conteúdo por dentro e põem um botão próprio ("Voltar ao painel" no Relatório do ciclo, "Voltar" em Compras, Assistência, Representação); a maioria não põe nada. O Voltar da barra ignora esses sub-níveis. |
| Janelas (fichas, detalhes, formulários) | pelo menos 10 famílias: `atv-overlay` (Atividades, Comercial, Compras, Relatório do ciclo, Ponto, Assistência), `modal-overlay`, `sgo-overlay`, `em-overlay` (E-mail), `vinc-overlay` (Vínculos), `conduta-modal-overlay`, `auvo-os-overlay`, `tplInv-*-overlay` (Inventário), `busca-overlay`, `avs-overlay` | Criadas com `document.body.appendChild`, ocupam a tela inteira no celular e **cobrem a barra do topo** (o robô achou o Voltar coberto pelo título da janela). Fecham só pelo "×"/"Fechar" de cada uma. `abrir()` não fecha janelas abertas. |
| Relatórios, documentos A4, manuais | 77 chamadas a `window.open` em 17 telas `JS_*.html` e 18 módulos `SGO_*_ConteudoModulo.js` | A maioria abre `window.open("", "_blank")` e escreve o HTML com `document.write`: a aba nova não tem endereço (`about:blank`), não tem histórico (`history.length` 0 ou 1) e a única barra é "Imprimir ou salvar em PDF" (`SGO_DocA4.js`, linha 534). Alguns abrem o endereço do arquivo (`/arquivos/...`, Relatório do ciclo), também em aba nova sem volta. |
| Recarregar / reabrir | `JS_Core.html` | A sessão continua (fica no `localStorage`), mas a tela volta para o Início: não existe endereço por tela. |

### 3.2 Por que o voltar falha (causa raiz)

1. **O navegador não sabe que o usuário andou.** Como nenhuma tela grava passo no histórico, o botão voltar do Android e o gesto voltam para o que havia antes do SGO+ (página em branco ou o site anterior). Medido em todos os perfis e larguras: `about:blank`.
2. **Não existe uma "pilha" de onde o usuário está.** Cada módulo guarda o próprio estado (lista, ficha, aba) em variáveis soltas; a casca não sabe o que fechar ao voltar. Por isso o Voltar da barra só consegue ir para o Início.
3. **Janelas e documentos vivem fora da tela principal.** As janelas ficam por cima de tudo, inclusive da barra; os documentos ficam em outra aba. Nenhum dos dois entra na conta do voltar.

### 3.3 Solução proposta: um voltar único, central

Um componente novo na casca, **`SGO_Nav`** (em `JS_Core.html`, com estilo em `UI_Estilos.html`), com quatro partes. Nenhuma tela precisa ser redesenhada; a maioria nem precisa ser tocada.

1. **Cada tela vira um passo no histórico.** `abrir(mod)` passa a chamar `history.pushState({ sgo: 1, mod }, "", "#/" + mod)`. Um único `window.onpopstate` chama `abrir(mod)` sem gravar de novo. Resultado: voltar do Android, gesto, Voltar da barra e Voltar do navegador fazem a mesma coisa; recarregar a página reabre a tela em que o usuário estava (lendo `#/mod`); o link de uma tela passa a poder ser copiado.
2. **Janelas entram na pilha sozinhas.** Um `MutationObserver` no `body` reconhece qualquer janela de tela cheia que aparecer (as classes da tabela acima e qualquer `position: fixed` com mais de metade da tela) e grava um passo `{ janela }`. Voltar fecha a janela de cima: clica no botão de fechar dela (`.atv-fechar`, `[data-cm-fechar]`, botão com texto "Fechar"/"×") para que a regra de cada módulo rode (descartar rascunho, perguntar antes de perder o que foi digitado), e só remove na marra se ela não tiver botão. Fechar pelo "×" também tira o passo da pilha (sem voltar duas vezes). No celular, a barra do topo continua visível acima da janela, ou a janela ganha o mesmo botão Voltar no lugar do "Fechar".
3. **Sub-nível de módulo: um gancho de uma linha.** Para as telas que trocam o conteúdo por dentro (ficha do Relatório do ciclo, oportunidade aberta na tela, detalhe de chamado, lista por lavadora), a casca oferece `SGO_Nav.entrar("titulo", fnVoltar)`. O módulo chama ao abrir o detalhe; voltar chama `fnVoltar`. Os botões "Voltar ao painel" que já existem passam a usar o mesmo caminho. Sem o gancho, voltar reabre o módulo na tela inicial dele (e não mais o Início do sistema), o que já é melhor que hoje.
4. **Documentos abrem dentro do SGO+.** Um visualizador central (`SGO_abrirDocumento_`) em tela cheia, com barra fixa "Voltar", nome do documento, "Imprimir ou salvar em PDF" e "Baixar PDF", mostrando o HTML num `iframe` com `srcdoc` (o mesmo HTML de hoje, sem mudar nenhum gerador de documento) e entrando na pilha como uma janela. Para não reescrever as 77 chamadas uma a uma, a casca troca `window.open` por uma versão que, quando o endereço é vazio (`window.open("", "_blank")`), devolve uma "janela" falsa com `document.open/write/close` e `close()` que alimentam o visualizador. Endereços externos (WhatsApp, pasta do Drive, PDF salvo) continuam abrindo fora. No computador, o visualizador pode continuar oferecendo "Abrir em nova aba". A barra de `SGO_DocA4.js` ganha também "Voltar ao SGO+" para quando o documento for aberto pelo link direto (e-mail, pasta).

**Cuidados.** O auto-refresh das telas não pode gravar passo no histórico (só ação do usuário grava) e nunca redesenha formulário aberto. Antes de fechar uma janela com texto digitado, a regra continua sendo a do módulo; se o módulo não tiver, a casca pergunta "Sair sem salvar?" (o operador nunca fica no limbo). Os widgets `AssistenteWidget.html` e `ComunicacaoWidget.html` **não mudam** (seguem idênticos aos do COMMAND); as regras ficam na casca. Ajuda e manual (`SGO_Ajuda_Principal.js` e o manual da casca) atualizados no mesmo commit.

**Impacto estimado.**

| Item | Arquivos | Tamanho |
|---|---|---|
| Pilha de navegação, `popstate`, `#/mod`, Voltar da barra | `JS_Core.html`, `Index.html` | P |
| Janelas na pilha (observador + fechar pelo botão da janela) | `JS_Core.html`, `UI_Estilos.html` | M |
| Visualizador de documentos e troca do `window.open` vazio | `JS_Core.html`, `UI_Estilos.html`, `SGO_DocA4.js` (barra) | M |
| Ganchos `SGO_Nav.entrar` nos sub-níveis mais usados (Relatório do ciclo, Comercial, Assistência, Compras, Atividades, Cadastros do celular, Frota) | um `JS_*.html` por módulo, poucas linhas cada | M |
| Testes automáticos do voltar (robô desta etapa vira teste) e ajuda/manual | `sgo_servidor/test`, `SGO_Ajuda_*.js`, `docs/` | P |

Risco médio: mexe no roteador de todas as telas. Mitigação: chave para desligar (`SGO_NAV_LIGADO`), robô de varredura desta etapa rodando antes e depois, e publicação só com testes verdes.

---

## 4. Comercial

### 4.1 O que o Comercial faz hoje, em linguagem simples

- **Oportunidade** é cada venda possível: cliente, unidade, contato, valor estimado, chance, previsão de fechamento e **próxima ação com data** (que vira atividade em Minhas atividades). Ela anda por um **funil** de cinco etapas (Engenharia, para serviços e contratos; Produtos, para peças e equipamentos). Para avançar, o sistema confere a lista da etapa, o decisor, um contato registrado, a proposta enviada e o aceite.
- **Proposta** nasce da oportunidade: itens do catálogo (preço e custo), custos da viagem e do frete (checklist obrigatório), condições comerciais, desconto e margem. Desconto acima do limite ou margem abaixo da mínima vai para a Caixa de decisões. O documento A4 sai com os textos e as cláusulas da Metodologia.
- **Pedido aprovado** passa aos setores (Técnica, Compras, Financeiro) com prazo e lista de tarefas.
- **Produtos e serviços** é o catálogo com preço de venda e custo; reajuste por percentual com histórico.
- **Gestora comercial** (IA ou, sem a chave, só regras) monta a lista do dia, revisa a proposta e aponta o que falta.
- **Metodologia** é onde a gestão escreve todas essas regras.

São **nove seções** no menu (Hoje, Oportunidades, Quadro, Gantt, Propostas, Pedidos, Produtos, Painel, Metodologia). No celular viram uma barra de abas que corre para o lado e aparece cortada ("Pedi…", "Pr…").

### 4.2 Por que confunde

1. **A Metodologia é uma página só para quatro assuntos diferentes.** São 16 blocos, 56 caixas de texto, 43 campos e um único botão "Salvar nova versão" no fim (10.734 px de altura no celular, 6.757 px no computador; captura `comercial-metodologia_1366_gestao_72_pagina-inteira.png`). Estão misturados: (a) o jeito de vender (tese, regras de ouro, funis, critérios, qualificação, cadência, estratégias, objeções, mensagens); (b) a política de preço e de desconto; (c) o modelo do documento da proposta (três modelos, condições, responsabilidades, cláusulas); (d) a operação (pós-venda, quem é gestão comercial, aprendizado da gestora). Quem entra para mudar o desconto máximo precisa rolar por funil e mensagens.
2. **Regras escritas como texto com barras.** As etapas do funil são linhas no formato "nome | probabilidade % | máximo de dias | critério | itens separados por ;"; a cadência é "dia | canal | título", com códigos em maiúsculas (LIGACAO, WHATSAPP); as estratégias são "código | título | texto". Uma barra a mais ou a menos muda o significado sem aviso claro.
3. **Duas "margens mínimas" em lugares diferentes.** "Política de desconto > Margem mínima quando o item tem custo (%)" (`politica.margemMinPct`, padrão 0, que quer dizer "não confere") e "Política de precificação > Margem mínima depois de impostos (%)" (`precificacao.margemMinPct`, vazia). Não fica claro qual vale; a proposta mostra "mínima não definida".
4. **A conta do preço não tem os números da empresa.** A própria proposta abre com "Margem: sem valor para calcular" e "A política de precificação ainda não tem: alimentação por pessoa por dia, diária do técnico, diária do engenheiro, hospedagem por pessoa por noite, impostos sobre o faturamento (%), margem mínima (%), margem alvo (%)" (captura `comercial-propostas_390_gestao_71_proposta-meio.png`).
5. **O custo do serviço é um número solto.** No catálogo, cada item tem um custo digitado (`COM_PRODUTOS.CUSTO`), sem mostrar do que é feito (horas de técnico, hora de engenheiro, padrões e instrumentos usados, consumíveis, relatório). Se o custo estiver errado ou vazio, a margem fica "parcial (otimista)" e a proposta passa.
6. **A proposta é uma janela longa demais.** São 58 campos e 9 botões (Acrescentar item, Do catálogo, Calcular, Salvar rascunho, Revisão da gestora, Concluir, Cancelar, Excluir e Fechar) na mesma janela, com quadros vermelhos de checklist no meio. Não há passos ("1. Itens, 2. Viagem, 3. Condições, 4. Revisar e enviar").
7. **Quatro telas para o mesmo funil.** Hoje, Oportunidades, Quadro e Gantt mostram as mesmas oportunidades de jeitos diferentes; "Kanban", "Gantt", "ponderado", "higiene" e "leitura do funil" são palavras de especialista.
8. **Textos de tela longos e técnicos.** Exemplos: "Proposta numerada (PROP-ano-número) com revisão, folha A4 salva na pasta do cliente e envio pelo 'Enviar documento'"; "Sem a chave da IA, a gestora trabalha só pelas regras".

### 4.3 O que um especialista em precificação e um pesquisador de mercado precisariam

**Preço pelo custo (o que a Metrolabs gasta).** O preço de um serviço em campo deveria sair de uma ficha de custo, e não de um número digitado:

| Componente | Como entra na conta | Onde o SGO+ guarda hoje | Situação |
|---|---|---|---|
| Hora técnica do técnico e do engenheiro (salário, encargos, benefícios, horas produtivas no mês) | custo por hora × horas do serviço | não existe (Usuários não tem custo por hora) | falta o dado |
| Horas por serviço (preparação, execução, relatório, revisão), por tipo de serviço e de equipamento | ficha de cada item do catálogo | não existe (o catálogo só tem preço e custo totais) | falta o dado e o campo |
| Padrões e instrumentos (calibração anual dividida pelos serviços do ano, depreciação, manutenção) | rateio por serviço | Padrões tem cadastro, vencimento e orçamento de calibração (`SGO_Padroes*.js`); Compras tem os valores pagos | dado espalhado, sem rateio |
| Deslocamento: km, pedágio, alimentação, diária, hospedagem, horas na estrada | checklist da proposta | `metodologia.precificacao` (R$ 2,50 por km preenchido; o resto vazio); distâncias na tabela da Conduta | **vazio** |
| Benefício do Programa de conduta (R$ 300 por colaborador por viagem acima de 200 km) | custo da viagem | parâmetros da Conduta (`VALOR_INCENTIVO_MISSAO`, `MISSAO_KM_MINIMO`) | ok |
| Custo real do veículo por km (combustível, manutenção, seguro) | confere os R$ 2,50 | Frota (abastecimento e manutenção) | existe, mas não é comparado |
| Consumíveis e peças do serviço | item ou ficha de custo | Compras e catálogo | parcial |
| Custo fixo da empresa (aluguel, administrativo, sistemas, veículos parados) | percentual sobre o custo direto | não existe | falta o dado |
| Impostos sobre o faturamento (regime tributário, ISS por município, PIS e COFINS, IRPJ e CSLL) | percentual sobre o preço | `precificacao.impostosPct` | **vazio** |
| Comissão de venda, custo do prazo de pagamento (boleto 28 dias), inadimplência | percentual sobre o preço | não existe | falta o dado |
| Margem mínima e margem alvo | trava e meta | `precificacao.margemMinPct`, `margemAlvoPct` e `politica.margemMinPct` | **vazio e duplicado** |

**Preço de mercado (quanto o cliente paga).** O pesquisador de mercado precisaria de: preços praticados por serviço e por região (qualificação térmica de autoclave, calibração por grandeza, preventiva por tipo de equipamento); contratos anuais e licitações ganhas e perdidas, com o valor vencedor; preço dos concorrentes por serviço; histórico de propostas ganhas e perdidas com o motivo. Parte disso já está no SGO+ (propostas, motivo de perda e o CRM importado, `SGO_Comercial_ImportarCrm.js`). Faltam um campo "valor do vencedor ou do concorrente" na perda e um relatório "preço proposto × ganho ou perdido, por serviço".

### 4.4 Proposta de melhoria do Comercial (depende da aprovação do dono)

- **Metodologia em quatro páginas**: "Como vendemos" (funil, qualificação, cadência, estratégias, objeções, mensagens), "Preço e desconto" (custos da empresa, viagem, impostos, margens, desconto, reajuste; **uma margem mínima só**), "Documento da proposta" (modelos, condições, cláusulas) e "Depois da venda" (setores, gestão comercial). Cada página com o próprio "Salvar" e o motivo.
- **Etapas do funil, cadência e estratégias como tabelas editáveis** (uma linha por etapa, campos separados, botão "+ etapa"), em vez de texto com barras.
- **Ficha de custo por serviço no catálogo**: horas por função, padrões usados e consumíveis; o sistema calcula o custo e sugere o preço pela margem alvo, mostrando a conta.
- **Proposta em passos** (Itens, Viagem, Condições, Revisar e enviar), com o quadro "Preço, custo, impostos e margem" sempre visível e em linguagem simples ("Sobra para a empresa: R$ X, Y%").
- **Entrada do Comercial com uma pergunta**: "O que você quer fazer agora?" (Ver o que fazer hoje, Abrir uma oportunidade, Fazer uma proposta, Ver pedidos). Quadro e Gantt viram modos de ver dentro de Oportunidades ("em colunas", "em linha do tempo").

---

## 5. Plano em etapas

Regras que valem para todas as etapas: operador nunca no limbo (toda trava diz o quê, por quê e o que fazer); auto-refresh nunca redesenha formulário aberto; não redesenhar tela sem pedido do dono (as etapas de módulo corrigem defeito e clareza; mudança de desenho vai antes para aprovação, com captura do antes e do depois); ajuda da tela (`SGO_Ajuda_*.js`) e manual (`docs/MANUAL_*.md`) atualizados no mesmo commit; nunca citar fabricante; números, datas e moeda no formato pt-BR; `AssistenteWidget.html` e `ComunicacaoWidget.html` idênticos aos do COMMAND (as regras de posição e de voltar ficam na casca); publicar só com testes verdes, conferindo o código de saída. O robô de varredura desta etapa (`ferramentas/varrer.mjs` e `fluxos.mjs`) vira teste de regressão e roda antes e depois de cada etapa.

| Etapa | Escopo | Arquivos principais | Especialistas | Risco | Tamanho |
|---|---|---|---|---|---|
| **1. Navegação e casca** | Voltar único (`SGO_Nav`): cada tela no histórico (`pushState`/`popstate`, endereço `#/modulo`), Voltar da barra = um passo atrás, recarregar reabre a mesma tela; janelas entram na pilha e fecham com o voltar do Android; `abrir()` fecha janela esquecida aberta; barra do topo nunca coberta; visualizador de documentos A4 dentro do SGO+ (Voltar, Imprimir, Baixar PDF) no lugar das abas em branco, com troca central do `window.open` vazio; "Voltar ao SGO+" na barra do `SGO_DocA4.js`; posição dos botões redondos sem cobrir o último botão da tela (espaço no fim de listas e janelas); teste automático do voltar | `JS_Core.html`, `Index.html`, `UI_Estilos.html`, `SGO_DocA4.js`, `SGO_Ajuda_Principal.js`, manual da casca, testes do `sgo_servidor` | mobile, desenvolvedor, revisor, designer (só para o visualizador) | médio (mexe no roteador de todas as telas); chave para desligar e robô antes/depois | G |
| **2. Ganchos de sub-nível nos módulos mais usados** | `SGO_Nav.entrar` nas fichas e detalhes que trocam o conteúdo por dentro: Minhas atividades, Relatório do ciclo, Comercial (ficha da oportunidade e da proposta), Assistência (chamado, O.S.), Compras (pedido), Frota, cadastros do celular (Clientes, Unidades, Equipamentos); os "Voltar ao painel" existentes passam a usar a pilha | `JS_Atividades.html`, `JS_LavCiclo.html`, `JS_Comercial.html`, `JS_Assistencia.html`, `JS_Compras.html`, `SGO_Frota_ConteudoModulo.js`, `JS_Core.html` (cadastros do celular) e as ajudas de cada um | desenvolvedor, mobile, revisor | baixo | M |
| **3. Campo e celular: Atividades, Frota, Assistência (O.S.), Relatório do ciclo, Ponto, Avisos** | Corrigir sobreposições e botões cobertos, janelas longas no celular (dividir em seções recolhíveis sem mudar o conteúdo), textos técnicos para o técnico e para o cliente ("Kanban", "Gantt", "SLA"), estados vazios que digam o que fazer | os `JS_*.html` e `SGO_*_ConteudoModulo.js` desses módulos, ajudas e manuais | designer, mobile, desenvolvedor, revisor | baixo a médio | M |
| **4. Documentos técnicos no celular** (Autoclave, Lavadora, Cadeia de frio, Estufa, Baixa temperatura, Declarações, Certificado e Relatório de calibração, Padrões, PGT/POP, Registros, Planejamento CME, Cronograma, NR-13) | Formulários muito longos (a Declaração QI/QO passa de 9.000 px no celular): índice das seções e "ir para a próxima seção", chaves liga/desliga de 22 × 22 px aumentadas, campo que o botão redondo cobre; pré-visualização A4 no visualizador da Etapa 1; tabelas largas do A4 em caixa rolável no celular | `SGO_*_ConteudoModulo.js` de cada módulo, `JS_*Relatorio.html`, `SGO_DocA4.js` (regra de tabela no celular), ajudas e manuais | mobile, desenvolvedor, revisor, especialista técnico do assunto (norma) | médio (documentos com valor legal: o A4 impresso não pode mudar) | G |
| **5. Compras, E-mail, Cadastros e Gestão** | Janela "Nova assinatura" do E-mail que fica presa; listas e filtros no celular; Caixa de decisões e Desempenho; cliente vendo filtro "Todos os clientes" em Equipamentos | `JS_Compras.html`, `JS_Email.html`, `JS_Cadastros.html`, `JS_Equipamentos.html`, `JS_Gestao.html`, ajudas e manuais | designer, desenvolvedor, revisor | baixo | M |
| **6. Administração e telas de configuração** | Usuários, Chaves e senhas, Segurança do acesso, Matriz de avisos, Piloto do WhatsApp, Integração Auvo, Automação predial: só defeitos e textos (uso raro, perfil de gestão) | `JS_Admin.html`, `JS_Chaves.html`, `JS_SegurancaAcesso.html`, `JS_AvisosMatriz.html`, `JS_WhatsappPiloto.html`, `JS_AutomacaoPredial.html` | desenvolvedor, revisor | baixo | P |

**Trilha do Comercial (paralela às etapas 3 a 6, depois da Etapa 1).**

| Etapa | Escopo | Arquivos | Especialistas | Risco | Tamanho |
|---|---|---|---|---|---|
| **C1. Levantamento dos custos com o dono** | Sessão de perguntas da seção 6; planilha de custo por serviço (os 10 serviços mais vendidos, pelo CRM importado e pelas propostas); conferir os R$ 2,50 por km com o custo real da Frota | nenhum código; documento em `docs/` | precificação, pesquisa de mercado | baixo | P |
| **C2. Metodologia em quatro páginas** | "Como vendemos", "Preço e desconto", "Documento da proposta", "Depois da venda"; tabelas editáveis no lugar do texto com barras; uma margem mínima só (migração da versão atual sem perder histórico) | `JS_Comercial.html`, `SGO_Comercial_Config.js`, `SGO_Comercial_Precificacao.js`, `SGO_Ajuda_Comercial.js`, `docs/MANUAL_MODULO_COMERCIAL.md` | designer, desenvolvedor, precificação, revisor | médio (a metodologia é lida pela gestora e pelas travas) | M |
| **C3. Ficha de custo e proposta em passos** | Ficha de custo por serviço no catálogo (horas por função, padrões, consumíveis; preço sugerido pela margem alvo); proposta em quatro passos com o quadro de margem em linguagem simples | `SGO_Comercial_Propostas.js`, `SGO_Comercial_Precificacao.js`, `JS_Comercial.html`, ajuda e manual | precificação, designer, desenvolvedor, revisor | médio | G |
| **C4. Entrada simples e mercado** | Entrada "O que você quer fazer agora?"; Quadro e Gantt como modos de ver dentro de Oportunidades; valor do concorrente ou do vencedor na perda; relatório "preço proposto × ganho ou perdido por serviço" | `JS_Comercial.html`, `SGO_Comercial_Oportunidades.js`, `SGO_Comercial_Painel.js`, `SGO_Comercial_Quadro.js`, ajuda e manual | designer, pesquisa de mercado, desenvolvedor, revisor | baixo | M |

Ordem sugerida: 1 → 2 → C1 (pode correr junto com a 2, é só conversa) → 3 → C2 → 4 → C3 → 5 → C4 → 6.

---

## 6. Perguntas que só o dono pode responder

**Custos da Metrolabs (para o Comercial calcular preço e margem).**

1. Quanto custa, por mês, um técnico e um engenheiro para a empresa (salário, encargos, benefícios)? Quantas horas por mês cada um trabalha em serviço faturável (descontando escritório, estrada e espera)?
2. Para os serviços mais vendidos (por exemplo, qualificação térmica de autoclave, de lavadora, de câmara fria; calibração de termômetro; preventiva), quantas horas de técnico e de engenheiro vão em cada um, contando preparação, execução, relatório e revisão?
3. Quanto a empresa gasta por ano com a calibração dos padrões e instrumentos, e com manutenção e reposição deles? Podemos ratear pelo número de serviços do ano?
4. Os R$ 2,50 por km continuam valendo? O sistema pode comparar com o custo real da Frota (abastecimento e manutenção por km)?
5. Valores padrão por pessoa: alimentação por dia, diária do técnico, diária do engenheiro, hospedagem por noite. A hora parada na estrada deve ser cobrada? Por quanto?
6. Regime tributário e alíquota total sobre o faturamento (ISS, PIS, COFINS, IRPJ, CSLL). O ISS muda por município do cliente?
7. Custo fixo da empresa a ratear (aluguel, administrativo, sistemas, contador, veículos parados): valor mensal ou percentual sobre o custo direto?
8. Há comissão de venda? Quanto? O prazo do boleto (28 dias) e a inadimplência devem entrar no preço?
9. Qual a margem mínima (abaixo dela só a Diretoria aprova) e a margem alvo? É a mesma para serviço, contrato e produto?
10. Desconto máximo sem aprovação continua 15%? Muda por vendedor?
11. Contrato anual tem preço diferente do serviço avulso? Qual a regra?

**Mercado.**

12. Quem são os três concorrentes principais por serviço e região? Há preços deles (propostas perdidas, licitações) que possamos registrar?
13. A Metrolabs participa de licitações públicas? Quer que o sistema guarde o valor vencedor de cada uma?

**Navegação e telas.**

14. No computador, relatórios e documentos A4 devem abrir dentro do SGO+ (como no celular, com Voltar) ou continuar abrindo em aba nova?
15. O SGO+ é aberto no celular pelo navegador ou por um atalho na tela inicial? (Vale para decidir se transformamos o SGO+ em aplicativo instalável, com ícone e tela cheia.)
16. Podemos trocar "Kanban" por "Quadro" e "Gantt" por "Linha do tempo" em todo o sistema, inclusive nas telas do cliente?
17. Na Metodologia do Comercial, aprovar a divisão em quatro páginas e a margem mínima única antes do desenho (Etapa C2).
