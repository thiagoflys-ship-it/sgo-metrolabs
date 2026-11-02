# SGO+ Licitações — Diagnóstico e arquitetura (Especialista 01 + 06)

Data: 01/11/2026
Papel: Arquiteto de Software / Tech Lead (01) e Backend e Banco de Dados (06)
Escopo desta fase: diagnóstico e arquitetura. Nada foi alterado em código, nada foi publicado, nada foi gravado em produção.

Bases consultadas (código, não memória):
- Legado: `apps-script-imports/portal_sgo_versao_cnpj_db/` (SGO_*.js, JS_*.html, Index.html).
- Servidor: `C:\Users\venda\projetos\sgo_servidor\src` (servidor.ts, db.ts, legado/, servicos/, compat/) e `scripts/`.
- Manuais e decisões em `docs/` (AVISOS_GESTAO_CELULAR_20261101.md, MANUAL_MODULO_COMERCIAL.md, COMERCIAL_C1_PRECIFICACAO_20261101.md e outros).

Observação de método: o texto da missão (seções 8 e a lista dos estados 1 a 10 dos alertas) não está no repositório. Os itens da seção 8 foram tomados da lista recebida no pedido. A numeração de estados proposta na seção 3.6 precisa ser conferida com o texto original da missão.

---

## Sumário executivo

1. O SGO+ já tem quase toda a infraestrutura transversal de que o módulo precisa: agendador sem navegador, travas, fila de e-mail com tentativas, WhatsApp oficial com piloto e modelos, matriz de avisos, Caixa de decisões com escada, central de pendências, IA com verificador, armazenamento de arquivos com SHA-256, cadastro de clientes com CNPJ único e consulta de CNPJ.
2. O Comercial já prevê licitação em vários pontos: origem "Licitação" nas oportunidades, coluna `ORIGEM_REF`, preço "sem acréscimo de urgência" para licitação ou contrato (`ComPr_fatorFaixa_`), origem `LICITACAO` no banco de preços (`COM_PRECOS`) e cerca de 150 preços do PNCP já carregados como referência (`SGO_Comercial_BancoC1.js`).
3. O que falta é estrutural e precisa ser declarado como dependência, não improvisado dentro de Licitações: não há módulo de Contratos (quantitativo, saldo, vigência, aditivo, empenho), não há Financeiro de receitas (faturamento, contas a receber), não há RH com formação, registro profissional e treinamentos, não há estoque, e não há cadastro de documentos de habilitação da própria empresa (certidões, atestados de capacidade técnica).
4. Recomendação central: os coletores (PNCP e Compras.gov) rodam como serviço do servidor Node, com tabelas próprias no PostgreSQL. Regras de negócio, telas, análise, decisão e alertas ficam no legado, no padrão dos demais módulos. Os dois lados conversam por uma operação nova da ponte (`lic.*`), no mesmo molde de `rotas.*` da Frota.
5. Primeira versão funcional estimada em 18 a 24 dias úteis, em 7 etapas (0 a 6) (seção 5.3).

---

## 1. Diagnóstico por área (seção 8 da missão)

Legenda: **Existe** = verificado no código. **Reaproveitar** = como o módulo usa. **Não existe** = dependência a declarar.

### 1.1 Comercial

**Existe**
- Abas `COM_*` em `SGO_Comercial_Config.js` (`COM_ABAS`, `COM_COLUNAS`): `COM_OPORTUNIDADES`, `COM_PROPOSTAS`, `COM_PRODUTOS` (catálogo), `COM_HISTORICO`, `COM_CONTATOS_REGISTRO`, `COM_IA_SUGESTOES`, `COM_DIA`, `COM_AVISOS`, `COM_REAJUSTES`, `COM_PRECOS` (banco de preços), `COM_PLANOS_ESPECIALISTA`.
- Oportunidade: `ComOpo_salvar_`, `ComOpo_ganhar_`, `ComOpo_perder_`, `ComOpo_completarPerda_` (`SGO_Comercial_Oportunidades.js`). Colunas úteis já presentes: `ORIGEM`, `ORIGEM_REF`, `CLIENTE_ID`, `UNIDADE_ID`, `VALOR_ESTIMADO`, `PREVISAO_FECHAMENTO`, `CONCORRENTE_VENCEDOR`, `VALOR_VENCEDOR`.
- Lista de origens na metodologia (`SGO_Comercial_Config.js`, linha 182) já inclui "Licitação" e "Plataforma de cotação".
- Funis `ENGENHARIA` (ENG_1 a ENG_5) e `PRODUTOS` (PRO_1 a PRO_5). Nenhum funil próprio de licitação.
- Proposta: `ComP_nova_`, `ComP_salvar_`, `ComP_calcular_`, versão congelada do documento (`CONGELADO_JSON`), termos versionados (`Com_termosVigentes_`), alçada de preço (`ComP_alcadaPreco_`, `ComP_decidirPreco_`).
- Precificação (`SGO_Comercial_Precificacao.js`): sobra mínima, impostos por unidade, viagem (`ComPr_calcularViagem_`), faixas de prazo e a regra `licitacaoSemAcrescimo` (`ComPr_fatorFaixa_`, `ComPr_precoNaFaixa_(normal, pol, codigo, licitacao, tipo)`), com o rótulo "Preço único de licitação ou contrato, sem acréscimo de urgência".
- Catálogo oficial com regra de pontos (`SGO_Comercial_CatalogoOficial.js`: `ComCatN_calcular`, `ComCat_escopoTexto_`, `ComCat_temRegra_`).
- Banco de preços (`SGO_Comercial_BancoPrecos.js`): origem `LICITACAO` exige link (validação na linha 513), faixa de mercado por item, ranking de "vencedores das licitações". Carga C1 com preços do PNCP em `SGO_Comercial_BancoC1.js` (chave `PNCP:<url>#<item>`).
- Pedido aprovado vira atividades por setor (`ComP_passarSetores_`, setores `TECNICA`, `COMPRAS`, `FINANCEIRO`) e abre requisição de compra (`Compras_doPedidoComercial_`).
- Especialista e gestora com IA e verificador (`SGO_Comercial_Especialista.js`, `SGO_Comercial_Gestora.js`).

**Reaproveitar**
- A oportunidade de licitação, depois da decisão de participar, vira `COM_OPORTUNIDADES` com `ORIGEM = 'Licitação'` e `ORIGEM_REF = LIC:<id>`. A proposta é a proposta do Comercial com `prazo.licitacao = true`. Não se cria tabela de proposta paralela.
- O preço de referência da licitação (valor estimado por item e, depois, o homologado) entra em `COM_PRECOS` com origem `LICITACAO`, pela mesma função de registro do banco de preços. O resultado da disputa alimenta `CONCORRENTE_VENCEDOR` e `VALOR_VENCEDOR`.
- A aderência de item de edital ao catálogo usa `COM_PRODUTOS` (códigos C1/oficiais) e `ComCat_escopoTexto_`.

**Não existe**
- Funil ou etapas próprias de licitação (edital publicado, impugnação, esclarecimento, sessão, habilitação, recurso, homologação, adjudicação). Recomendo um funil novo `LICITACAO` na metodologia, configurável, sem mexer nos funis existentes.
- Proposta por item/lote com valor unitário por item exigido pelo edital e declarações anexas: o `ITENS_JSON` da proposta comporta itens, mas não há campo de lote nem de "item do edital". Precisa de extensão com merge (colunas novas, nunca sobrescrever).

### 1.2 CRM e Clientes

**Existe**
- `CAD_CLIENTES` (ID, RAZAO_SOCIAL, NOME_FANTASIA, CNPJ, ...), `CAD_UNIDADES`, `CAD_CONTATOS`, vínculos (`SGO_Vinculos.js`, `CNPJ_UNIDADE`).
- CNPJ único: `existeCnpjDuplicado_` em `SGO_Clientes.js` (linhas 88 e 165) recusa cliente repetido.
- Consulta de CNPJ com quatro fontes públicas em sequência: `SGO_CNPJ_consultarDados_` (`SGO_CnpjConsulta.js`).
- Cadastro com histórico e "ciente" (`CadQ_salvarCliente_`, `SGO_CadastroQualidade.js`) e correções de cadastro (junção de repetidos, `JUNTADO_COM_ID`).
- Importação do CRM antigo (`SGO_Comercial_ImportarCrm.js`).

**Reaproveitar**
- Órgão comprador = cliente, pelo CNPJ. A unidade compradora (UASG, código da unidade no PNCP) = unidade do cliente. Na triagem, o órgão fica só como texto em `LIC_OPORTUNIDADES`; o cliente só é criado ou ligado quando a pessoa decide acompanhar ou participar, pelo fluxo existente (consulta de CNPJ + `clientesCriar`), com a regra do "ciente".
- Hospitais públicos que já são clientes aparecem ligados na hora (o CNPJ do órgão bate com `CAD_CLIENTES.CNPJ`). Atenção: em autarquias e fundos municipais, o CNPJ do órgão comprador pode ser o do fundo, não o do hospital. A ligação deve aceitar "CNPJ do órgão" diferente do "CNPJ da unidade atendida".

**Não existe**
- Tipo de cliente "órgão público" (esfera, poder, UASG). Proposta: colunas novas em `CAD_CLIENTES` com merge (`ESFERA`, `PODER`, `CODIGO_UASG`), ou guardar só em `LIC_ORGAOS` (ver 3.3) para não mexer no cadastro geral nesta fase.

### 1.3 Contratos

**Existe**
- Apenas prazos de atendimento por cliente dentro das regras da Assistência (`AST_REGRAS_PADRAO.contratos`, `SGO_Assistencia_Config.js`, validação nas linhas 593-600): SLA por prioridade e prazo de chegada. Origem de chamado "Preventiva do contrato" (`CONTRATO` na linha 160).
- Contrato com a representada (vigência) no módulo Representação (`REP_REPRESENTADAS`).
- Termos e condições da proposta, versionados (o texto que o dono chamou de "termos do contrato").

**Não existe**
- Módulo de Contratos com número, vigência, valor global, quantitativo por item, saldo, ordem de fornecimento ou de serviço, aditivo, apostilamento, reajuste, empenho, garantia contratual, gestor e fiscal do contrato.
- Esta é a principal dependência do pós-licitação. Recomendo declarar "Contratos" como módulo próprio (fase posterior), alimentado pelo resultado da licitação e também por contratos privados. Licitações não deve criar uma tabela de contrato escondida. Até lá, o resultado "ganho" gera a oportunidade ganha, a proposta aprovada e as atividades por setor, que é o que o sistema já sabe fazer.

### 1.4 Assistência e Engenharia clínica

**Existe**
- Abas `ATEC_*` (`AST_ABAS`): chamados, O.S. (`ATEC_OS`), orçamentos, peças, relatórios, acervo de equipamentos, links de aceite.
- `ATEC_OS` é uma O.S. por chamado e por equipamento (colunas `CHAMADO_ID`, `EQUIPAMENTO_ID`, `TECNICO_ID`, `AGENDADO_PARA`, respostas do questionário, localização). Integração com tarefas do Auvo (`SGO_Auvo_*`).
- Agenda única: a O.S. cria atividade (`ATV_ATIVIDADES.OS_ID`).

**Reaproveitar**
- Quando houver contrato de manutenção ganho em licitação, os chamados e preventivas continuam nascendo na Assistência, com SLA pelas regras de contrato que já existem.
- Histórico de atendimento por cliente serve de evidência de experiência (atestado) e de capacidade.

**Não existe**
- O.S. estruturada que receba uma lista de itens de um contrato (por exemplo, 40 autoclaves de um lote) e baixe saldo. Depende do módulo Contratos.

### 1.5 Metrologia

**Existe**
- Padrões de referência `CAD_PADROES` (`SGO_Padroes.js`), alertas de vencimento (`SGO_AlertasPadroes.js`), certificados de calibração (`SGO_CertCal_*`), relatórios de calibração (`SGO_RelCal_*`), orçamento de escopo de padrões (`SGO_Padroes_Orcamento.js`).

**Reaproveitar**
- Leitura (somente) para a análise de aderência: o edital pede calibração de grandezas e faixas; o sistema confere se há padrão ativo e calibrado para aquela grandeza. É um "fato do sistema" com fonte (ID do padrão e validade do certificado).

**Não existe**
- Matriz de capacidade de medição (grandeza, faixa, incerteza, acreditação) como cadastro consultável. Hoje a informação está espalhada nos padrões e nos certificados. Para a IA de aderência, uma tabela de capacidade declarada pela Metrologia evitaria inferências. Declarar como dependência, não criar dentro de Licitações.

### 1.6 Qualificação

**Existe**
- Módulos de qualificação térmica e de processo: autoclave (`SGO_AutoRel_*`), lavadora (`SGO_LavRel_*`), cadeia fria (`SGO_CadeiaFrioRel_*`), estufa e banho-maria (`SGO_EstufaBanhoRel_*`), baixa temperatura (`SGO_BaixaTemp_*`), QI/QO (`SGO_DeclaracaoExecQIQO_*`), vínculo com equipamento (`SGO_QualifEquipamento.js`), verificador da IA (`SGO_QualifIA_Verificador.js`).
- Códigos de serviço C1 (`QT_AUTOCLAVE_GRANDE`, `QT_LAVADORA_TD`, `QT_FREEZER`, `QT_ESTUFA` e outros), usados também no banco de preços.

**Reaproveitar**
- Os códigos C1 são a ponte natural entre item de edital e serviço da Metrolabs. A classificação de um item ("qualificação térmica de autoclave de 300 litros") deve terminar num código C1 ou do catálogo oficial, com o grau de confiança.

**Não existe**
- Nada a declarar além da matriz de capacidade citada em 1.5.

### 1.7 NR-13

**Existe**
- `SGO_NR13_*` (laudos `NR13_LAUDOS`, documento, leitura de PDF pela IA em `SGO_NR13_IA.js`), pendências de vencimento na central.

**Reaproveitar**
- Serviço do catálogo oficial com parâmetros NR-13 (o escopo já sai na proposta pelo `ComCat_escopoTexto_`).

**Não existe**
- Cadastro do profissional habilitado (registro no conselho) por pessoa, que o edital costuma exigir. Depende de RH (1.10).

### 1.8 Estoque e Compras

**Existe**
- Compras completo (`SGO_Compras_*`, `CMP_ABAS`): requisições, itens, cotações, aprovações por faixa, pedidos, cartões, faturas, extrato, conciliação, compra informada depois de feita. Fornecedores `CMP_FORNECEDORES` com documento (CNPJ/CPF).
- Cotação de fornecedor alimenta o banco de preços (`COTACAO_FORNECEDOR`, visível só para a gestão).

**Reaproveitar**
- Licitação de fornecimento de produto: o custo vem das cotações de fornecedor (somente leitura, como o banco de preços já faz). A requisição de compra nasce do pedido aprovado (`Compras_doPedidoComercial_`).

**Não existe**
- Estoque (saldo, entrada, saída, reserva). A palavra aparece só como finalidade de compra "Uso interno (ferramenta, estoque, administrativo)" (`CMP_VINCULOS`). Licitação de produto com entrega parcelada depende de estoque ou, no mínimo, de reserva por contrato. Declarar.

### 1.9 Financeiro

**Existe**
- Conferência financeira das compras (`SGO_Compras_Financeiro.js`: pagamento, comprovante, "Conferida/Divergente").
- O perfil Financeiro vê os "Pedidos aprovados" do Comercial (`Com_nivelDe_`, nível `FINANCEIRO`) e recebe a atividade de faturamento (`ComP_passarSetores_`).
- Não há arquivos `SGO_FIN*` no legado que roda no servidor.

**Não existe**
- Faturamento, nota fiscal de serviço, contas a receber, controle de empenho e de liquidação, retenções na fonte (ISS, INSS, IR, CSLL/PIS/COFINS em órgão público), garantia contratual e caução. Tudo isso é dependência declarada. Para a primeira versão, a análise só sinaliza "exige garantia de X%" e "retenções previstas" como fatos do edital, sem cálculo financeiro.

### 1.10 RH

**Existe**
- `CAD_USUARIOS`: perfil, área (`SGO_Areas.js`), vínculo de trabalho (`VINCULO_TRABALHO`: CLT, PJ, DIRETORIA), e-mail, celular; CNH e validade usados pela Frota.
- Perfil `RH` com bloqueios (`SGO_bloquearRH_`), ponto (`SGO_Ponto_*`).
- A palavra "COMPETENCIA" nas abas do Conduta significa mês de referência, não competência técnica.

**Não existe**
- Formação, registro profissional (conselho e número), certificações, treinamentos com validade, ART/RRT, currículo. Editais de engenharia clínica e de qualificação pedem responsável técnico com registro e atestados em nome dele. Dependência declarada. A primeira versão registra a exigência como pendência ("comprovar responsável técnico com registro no conselho"), sem cadastro paralelo de pessoas.

### 1.11 Logística e Veículos

**Existe**
- Frota (`SGO_Frota_*`): `CAD_VEICULOS`, reservas (`FROTA_RESERVAS`), abastecimento, manutenção, rastreador, rotas em tabela própria (`servicos/rotas.ts`).
- Custo de deslocamento na proposta (`ComPr_calcularViagem_`), com equipe, destino e dias.
- Geocodificação e rota (`maps.geocode`, `maps.rota` na ponte, `compat/maps.ts`).

**Reaproveitar**
- Distância da base ao órgão (geocodificação do endereço do órgão) para a triagem e para o custo de viagem. Execução em outros estados entra como fato no custo.

**Não existe**
- Nada novo para a primeira versão.

### 1.12 Documentos e Qualidade

**Existe**
- `DOC_DOCUMENTOS` (`SGO_Documentos.js`): documentos de cliente/unidade/equipamento com vencimento.
- PGT e POP (`SGO_PgtPop_*`), documentos A4 (`SGO_DocA4.js`), salvar em pasta persistente (`SGO_DocSalvar_pastaPersistente_`), Enviar documento (`SGO_EnviarDoc.js`, modelo Meta `sgo_documento_cliente`), revisão de documentos (`SGO_DocRevisao.js`), Qualidade (`SGO_Qualidade_*`).
- Documentos da representada (`REP_DOCUMENTOS`).

**Não existe**
- Pasta de habilitação da própria Metrolabs: certidões (federal, estadual, municipal, FGTS, trabalhista, falência), balanço e índices, contrato social e alterações, atestados de capacidade técnica, acreditações, alvarás, registro no conselho da empresa, cada um com validade e emissor. Nenhuma busca no código encontrou "certidão negativa", "atestado de capacidade" ou "contrato social". Esta é a dependência mais próxima do módulo e a que mais gera alerta. Recomendo que seja um cadastro de "Documentos da empresa" no grupo Documentos (não dentro de Licitações), consumido por Licitações para o checklist de habilitação.

### 1.13 Notificações

**Existe** (detalhe na seção 2.6)
- Matriz de avisos (`SGO_Avisos_Matriz.js`, `NTF_REGRAS`, `MTZ_PADRAO`), notificador (`SGO_notificar_` em `SGO_Notificar.js`, aba de envios), avisos da gestão (`SGO_Avisos_Gestao.js`, aba `NTF_GESTAO`), escada (`SGO_Gestao_Escada.js`, `SGO_Sedna.js`), Caixa de decisões (`SGO_Gestao_Decisoes.js`, `GES_DECISOES`), central de pendências (`SGO_Alertas_Central.js`, `PEND_FONTES`), expediente e feriados (`SGO_Expediente.js`), piloto do WhatsApp no servidor (`servicos/whatsappPiloto.ts`).

**Reaproveitar**
- Tudo. Licitações registra eventos novos na matriz (no molde de `AVG_MTZ_EVENTOS`), acrescenta uma fonte à central de pendências (no molde de `Comercial_fontePendencias_`) e tipos novos na Caixa de decisões para "decidir participar" e "aprovar preço final".

**Não existe**
- Retorno de entrega e leitura da Meta ligado ao SGO+ (ver 2.6).
- Modelo Meta específico de prazo de licitação.

---

## 2. Infraestrutura reaproveitável

### 2.1 Agendador (roda sem navegador)

- `servicos/agendador.ts`: os gatilhos de tempo do legado (`ScriptApp.newTrigger`) viram linhas na tabela `gatilhos`; um laço a cada 20 s executa os vencidos no pool de workers. Roda sem navegador, sem usuário logado. Suporta a cada N minutos, diário com hora, semanal, mensal e "uma vez" (`at`, `after`). Fuso America/Sao_Paulo.
- A próxima execução é marcada antes de rodar (não dispara duas vezes).
- Limitação importante: dentro de uma rodada os gatilhos vencidos rodam **em sequência** (`for ... await executar`). Uma rotina de 4 minutos atrasa todas as outras (Caixa de decisões a cada 15 min, Assistência, Ponto a cada 5 min, rastreador a cada 2 min). Coleta de portal, com paginação e download de anexos, **não deve** ser um gatilho do legado.
- Sentinela (`servicos/sentinela.ts`) confere o agendador a cada 5 min e reinicia o laço parado. Um serviço novo de coleta deve se registrar nela.
- Precedentes de laço no próprio Node: `servicos/rotinaRapida.ts` (rotinas de segundos) e `servicos/tuyaMensagens.ts` (serviço do servidor que entrega o resultado ao legado por `executarSgo`). É o molde recomendado para os coletores.

### 2.2 Filas

- E-mail: `MailApp.sendEmail` grava em `emails_saida`; o carteiro (`servicos/carteiro.ts`) envia por SMTP com até 5 tentativas (1, 5, 15, 60 min). Persistente.
- Webhook do WhatsApp: `FilaWebhook` (`servicos/webhook.ts`), em memória, uma execução por vez, máximo 2.000 itens; perde o que não foi processado num reinício. Existe só nos sistemas que não são o SGO+.
- Avisos da gestão: a própria aba `NTF_GESTAO` funciona como fila (NA_FILA, ENVIANDO, ENVIADO, FALHOU, RESOLVIDO), com retomada de ENVIANDO parado há mais de 10 min.
- Não existe fila genérica de trabalhos persistente no servidor. Para os coletores, proponho tabela própria `lic_tarefas` (seção 3.3), com estado, tentativas e próxima tentativa.

### 2.3 Travas

- `LockService` é emulado pela classe `Travas` (`servicos/atendente.ts`, operação `trava.pegar/liberar`), em memória do processo, liberada quando o worker termina ou estoura o tempo. Serve para um único processo, que é o caso hoje.
- Padrões no legado: `Com_comTrava_`, `Ges_comTrava_`, `Cmp_...`. Licitações usa o mesmo padrão para gravações de decisão e de alerta.

### 2.4 Auditoria, histórico e versionamento

- Histórico por entidade: `Com_historico_(entidade, id, tipo, eu, extra)` grava em `COM_HISTORICO` (ENTIDADE, ENTIDADE_ID, TIPO, DE, PARA, TEXTO, USUARIO, DATA). Molde direto para `LIC_HISTORICO`.
- Log geral: `SGO_DATA.log` em `SYS_LOGS` (usado, por exemplo, por Chaves e senhas: quem, quando, qual chave, nunca o valor).
- Atividades: `Atividades_registrarHist_`.
- Versionamento de configuração: `COM_CONFIG` e `ATEC_CONFIG` com `VERSAO`, `MOTIVO`, `ATUALIZADO_POR`; documento congelado (`CONGELADO_JSON`) na proposta; termos vigentes por versão.
- Regra da casa: nada é apagado; situação muda; exclusão lógica (`EXCLUIDO_EM`); campo existente nunca é sobrescrito sem merge.

### 2.5 Permissões por perfil e alçada; Caixa de decisões

- Perfis: ADMIN, DIRETORIA, GESTOR, COMERCIAL, FINANCEIRO, RH, METROLOGIA, TECNICO, CLIENTE (`SGO_Auth.js`, `SGO_PERFIS_ROTINA`). Área por pessoa (`CAD_USUARIOS.AREA`). Dono do sistema (`SGO_DONOS`, `Com_ehDono_`).
- Molde de nível por módulo: `Com_nivelDe_` / `Com_eu_` / `Com_exigir_(eu, nivel, acao)` (GESTAO, VENDEDOR, FINANCEIRO, NENHUM), com mensagem que diz o quê, por quê e o que fazer. Licitações replica com `Lic_nivelDe_` (ver 4.2).
- Alçada: preço (`ComP_alcadaPreco_`), compras por faixa (`CMP_APROVACOES`).
- Caixa de decisões (`SGO_Gestao_Decisoes.js`): lê da central de pendências, roteia por área e responsáveis (`Ges_rotear_`), conta prazo em dias úteis, escala à Diretoria, registra providência. Tipos de aprovação conhecidos em `AVG_APROVACOES`. Licitações acrescenta tipos (`licitacao_participar`, `licitacao_preco_final`, `licitacao_impugnar`, `licitacao_recurso`).
- Menu: grupos em `Index.html` (`data-grupo="comercial"`, `menu-secao-comercial`), visibilidade aplicada por `aplicarRegrasDeAcesso_` (`JS_Core.html`) e por função própria do módulo (`Comercial_mostrarMenu_`).

### 2.6 Notificações: estados, escada, agrupamento, expediente, Meta

Ciclo que já existe (aba `NTF_GESTAO`, `SGO_Avisos_Gestao.js`):
- `criado` → `NA_FILA` → `ENVIANDO` → `ENVIADO` (com `EMAIL_SITUACAO` e `WA_SITUACAO` separados) → `ENTREGUE` / `LIDO` (retorno da Meta) → `ABERTO_EM` (abriu o link `?aviso=<código>`) → `RESOLVIDO` (o item saiu da pendência). Também `FALHOU`, `AGUARDANDO_MODELO`, `SEM_NUMERO`.
- Idempotência pela `CHAVE` (evento|item|marco|pessoa).
- Agrupamento: pendência espera até 30 min (`AVG_AGRUPAR_MIN`); atraso e irreversível saem na hora.
- Expediente: gestor só no expediente; Diretoria a qualquer hora. `SGO_Expediente.js` com feriados nacionais fixos (inclui 02/11), Carnaval, Sexta-feira Santa, Corpus Christi e lista configurável. Não há feriados estaduais e municipais automáticos.
- Escada: `SGO_Gestao_Escada.js` (`Ges_rodada_` a cada 15 min) e SEDNA (`SGO_Sedna.js`) para atividades atrasadas.
- Teto de WhatsApp: 3 por dia para quem não é gestão; sem teto para a gestão.

**Retorno da Meta (confirmado: não está ligado).** `SGO_avisosGestaoRetornoMeta_(wamid, status, quandoIso, motivo)` existe e está pronta, mas nenhum código a chama. O próprio comentário diz: "O webhook do WhatsApp oficial (statuses: sent, delivered, read, failed) ainda não é registrado no SGO+". No servidor, a rota `/webhook/whatsapp` existe só para os sistemas que não são o SGO+ (`servidor.ts`, comentário da linha 301: "o SGO+ não tem webhook de entrada"). O COMMAND recebe `statuses` e os guarda nos recibos dele (`cmdWaReceberPayload_`, `legado_command/Integracoes.js` linha 322), sem repassar ao SGO+. Conclusão: os estados `ENTREGUE` e `LIDO` nunca são preenchidos hoje. Para Licitações, onde "a pessoa viu o aviso da sessão" importa, ligar esse retorno é pré-requisito (seção 5.2).

### 2.7 Modelos Meta

Definidos em `NTF_MODELOS_META` (`SGO_Notificar.js`), cadastrados pelo botão de Chaves e senhas ou por `scripts/cadastrar_modelos_meta.ts` (`Chaves_modelosCadastrar_`, `Chaves_modelosSituacao_`). Existentes: `sgo_aviso_geral`, `sgo_atividade_atribuida`, `sgo_atividade_atrasada`, `sgo_atividades_resumo_dia`, `sgo_gestao_resumo_dia`, `sgo_gestao_acao`, `sgo_justificativa_recebida`, `sgo_bate_papo_mensagem`, `sgo_missao_nova`, `sgo_chamado_aberto`, `sgo_chamado_concluido`, `sgo_ponto_entrada`, `sgo_ponto_almoco`, `sgo_ponto_retorno`, `sgo_ponto_saida`, `sgo_documento_cliente`, e o de autenticação `sgo_codigo_acesso`.

- Para a gestão (decidir participar, aprovar preço): `sgo_gestao_acao` já serve, sem modelo novo.
- Para quem opera a licitação e não é gestão (prazo de esclarecimento, sessão amanhã, documento vencendo): `sgo_aviso_geral` funciona, mas é genérico e a Meta tende a reclassificar modelos genéricos. Recomendo modelo novo `sgo_licitacao_prazo` (categoria Utilidade): nome, órgão, evento, data e hora com fuso, link do item. Sem valor e sem objeto completo (sigilo de estratégia).
- Lembrete: o piloto (`whatsappPiloto.ts`) bloqueia qualquer número fora da lista; a gestão tem lista própria (`WA_PILOTO.telefonesGestao`). Quem opera licitação precisa estar na lista do piloto ou o aviso vai só por e-mail.

### 2.8 E-mail e notificação interna

- E-mail: `MailApp` emulado → `emails_saida` → carteiro SMTP (sistema@metrolabs.com.br). Anexos aceitos.
- Caixa IMAP do sistema e e-mail integrado por colaborador (`servicos/emailImap.ts`, `emailPessoal.ts`, senhas no cofre). Útil numa fase posterior para ler e-mails de portais (avisos de sessão, convocações).
- Interna: avisos por módulo (`COM_AVISOS`, `ATV_AVISOS`), central de pendências (`SGO_Pendencias_listar`, cache de 60 s, `SGO_Pendencias_invalidar_`), Início.

### 2.9 IA

- Provedor único em uso: Gemini, por `SGO_DocA4_chamarGemini_` (`SGO_DocA4.js`). Chave `GEMINI_API_KEY` em propriedades do script; modelo `IA_MODEL` (padrão gemini-2.5-flash) com reservas `IA_MODEL_FALLBACKS` (2.5-pro, 2.5-flash-lite), três tentativas, raciocínio dinâmico, temperatura 0,2. 401/403 = chave recusada; 429 = limite atingido (mensagem ao operador). `IA_PROVIDER` existe só nos certificados.
- Leitura de PDF pela IA já é feita (envio como `inline_data`) em `SGO_NR13_IA.js`, `SGO_CertCal_IA.js`, `SGO_RelCal_IA.js`, `SGO_PgtPop_IA.js`, `SGO_Padroes_Documentos.js` e outros.
- Cota: não há contador de uso de IA no sistema. Só o tratamento do 429. Para Licitações (volume diário de editais), é necessário um orçamento de chamadas por dia, com registro por chamada.
- Verificadores: `SGO_QIAV_verificar_` (`SGO_QualifIA_Verificador.js`: todo número citado precisa existir nos fatos; norma só da lista permitida; veredito não pode contradizer o motor; sem fabricante; sem se referir a si como IA) e `ComG_verificar_` / `ComEsp_verificar_` (Comercial: proibidos, frases vazias, emoji). Padrão "regras primeiro, IA refina, verificador decide; recusado = vale o texto das regras".
- Registro do que a IA sugeriu e do que foi usado: `ComG_registrar_` em `COM_IA_SUGESTOES`.
- Lacuna: o servidor não tem extração de texto de PDF (dependências do `package.json`: pglite, fastify, exceljs, fflate, imapflow, nodemailer, pg, playwright, xlsx). Sem texto extraído, o verificador não consegue conferir se o trecho citado pela IA existe no edital. Ver 3.7 e 5.1.

### 2.10 Armazenamento de arquivos (editais e anexos)

- `servicos/arquivos.ts`: conteúdo em disco (`<dados>/arquivos/<2 letras>/<id>`), metadados na tabela `arquivos` (nome, tipo, pasta, tamanho, `sha256`, lixeira). Pastas na tabela `pastas`. O legado enxerga como Drive (`compat/drive.ts`).
- Leitura de ZIP com ZIP64 (`compat/zip.ts`, `lerZip`), útil para pacotes de edital.
- Limite do corpo das chamadas do navegador: 72 MB (`bodyLimit` em `servidor.ts`). Upload manual de edital cabe.
- Proposta de pastas: `Licitações/<ano>/<numeroControle>/` (edital, anexos, esclarecimentos, atas, proposta enviada, recibos). O SHA-256 vira a chave de deduplicação de anexo e a prova de versão (retificação gera arquivo novo, nunca substitui).

### 2.11 Requisições HTTP externas

**A partir do legado (UrlFetchApp emulado)**
- `compat/basicos.ts` monta o pedido; o worker chama a ponte síncrona; a thread principal faz o `fetch` (`buscar` em `servicos/atendente.ts`).
- Tempo máximo por requisição: 60 s (`AbortController`). Tempo máximo da execução inteira: `LIMITE_SEGUNDOS`, padrão 300 s; estourou, o worker é encerrado e substituído.
- `fetchAll` roda em paralelo (`Promise.all`), sem limite de concorrência.
- Todo envio passa pelo piloto do WhatsApp antes de sair. Em modo ensaio (`SGO_ENSAIO=1`) só GET/HEAD saem.
- Não há limite de taxa por domínio, nem cache HTTP, nem registro das chamadas externas.

**A partir de processos do servidor**
- Node 22 com `fetch` nativo, acesso direto ao PostgreSQL, sem o limite de 300 s, sem ocupar worker do legado.

**Conclusão para os conectores PNCP e Compras.gov**: rodar como serviço do servidor. Motivos: paginação longa, downloads grandes, necessidade de controle de taxa e de retentativa com espera, gravação em volume (milhares de itens por dia), e o agendador sequencial do legado. O legado só recebe o que já foi coletado, deduplicado e normalizado.

### 2.12 Banco de dados

- Produção em PostgreSQL (`DATABASE_URL`, pool de 20 conexões); desenvolvimento e scripts em PGlite.
- O legado grava em `linhas (planilha_id, aba, n, v jsonb)`, uma linha de planilha por registro, lida por `SGO_DATA.getAll` (aba inteira) e atualizada por varredura (`SGO_DATA.update`). Funciona bem para centenas a poucos milhares de linhas por aba; não serve para o volume bruto do PNCP.
- Precedente de tabela própria exposta ao legado: `rastreador_posicoes` (`servicos/rotas.ts`, `ESQUEMA_ROTAS`), acessada pelo global `SGO_ROTAS` (`compat/rotas.ts`) via operações `rotas.*` da ponte. Outros: `whatsapp_piloto`, cota do WhatsApp.
- Regra de leitura já registrada: mesma aba pode existir em várias planilhas; ler por `planilha_id`.

---

## 3. Arquitetura proposta

### 3.1 Divisão de responsabilidades

```
Portais públicos (PNCP, Compras.gov dados abertos)
        |
        v
[Servidor Node]  src/servicos/licitacoes/
   coletorPncp.ts, coletorComprasGov.ts   -> consulta, paginação, taxa, retentativa
   fila (lic_tarefas)                     -> coletar, detalhar, baixar anexo, reconferir
   normalizar.ts                          -> formato único, chave de deduplicação
   anexos.ts                              -> download, SHA-256, servicoArquivos, extração de texto
   tabelas lic_* (PostgreSQL)             -> bruto, normalizado, itens, anexos, log de conexão
        |
        |  ponte: lic.listar / lic.obter / lic.itens / lic.anexos / lic.marcar / lic.conexoes
        |  aviso ao legado: executarSgo('Lic_aposColeta_', [resumo])
        v
[Legado SGO+]  SGO_Licitacoes_*.js + JS_Licitacoes.html
   triagem por regras (perfis de interesse)
   análise (regras + IA + verificador): fatos x inferências x pendências
   agenda de eventos com fuso e histórico de retificação
   decisão (Caixa de decisões, alçada)
   alertas (matriz de avisos, NTF, e-mail, WhatsApp)
   passagem ao Comercial (cliente pelo CNPJ, oportunidade, proposta)
   telas, manual, ajuda
```

- Coletor no Node e regra no legado, como Tuya (`tuyaMensagens.ts`) e rastreador (`rotas.ts`) já fazem.
- O serviço Node não decide nada de negócio: não descarta oportunidade, não avisa ninguém, não cria cliente.
- O legado não faz chamada a portal em rotina. A única chamada externa do legado é a IA (como hoje) e, se a pessoa pedir, "reconsultar agora" vira uma tarefa na fila do Node.

### 3.2 Onde mora cada parte

| Parte | Onde | Motivo |
|---|---|---|
| Coletores PNCP e Compras.gov | Node (`servicos/licitacoes/`) | volume, tempo, taxa, fora do agendador sequencial |
| Fila de coleta e de anexos | PostgreSQL `lic_tarefas` | persistente, sobrevive a reinício |
| Bruto e normalizado | PostgreSQL `lic_bruto`, `lic_contratacoes`, `lic_itens_fonte` | volume; consulta por índice |
| Anexos | `servicoArquivos` + `lic_anexos` | SHA-256, pasta por licitação |
| Extração de texto de PDF | Node | não existe no legado; precisa de biblioteca |
| Triagem, análise, decisão, alertas, telas | legado, abas `LIC_*` numa planilha própria do módulo | padrão do SGO+, permissões, manual, Caixa, matriz |
| IA de aderência | legado (`SGO_DocA4_chamarGemini_`) com verificador novo | mesma chave, mesmo registro, mesmo padrão |
| Agenda e alertas | legado, gatilho de 15 min no molde de `Gestao_garantirRotina_` | rotina curta |
| Disputa e lances | legado, só registro e assistência | robô fora desta fase |

### 3.3 Modelo de dados

Convenções: datas em texto ISO com fuso explícito quando vierem de fonte externa; nada apagado; colunas acrescentadas com merge; toda linha com `CRIADO_EM`, `ATUALIZADO_EM` e autoria.

**Tabelas do servidor (PostgreSQL, esquema criado no molde de `ESQUEMA_ROTAS`)**

`lic_conexoes_log` — cada chamada a portal
- id, portal, endpoint, parametros jsonb, inicio, fim, http_status, itens_recebidos, bytes, erro, tarefa_id.

`lic_tarefas` — fila
- id, tipo (COLETAR_JANELA, DETALHAR, ITENS, ANEXOS, BAIXAR_ANEXO, RECONFERIR, RESULTADO), portal, chave, parametros jsonb, situacao (NA_FILA, RODANDO, OK, FALHOU, DESISTIU), tentativas, proxima_em, ultimo_erro, criado_em, atualizado_em.
- Índice único (tipo, portal, chave) enquanto não concluída, para não enfileirar duas vezes.

`lic_bruto` — resposta original, para auditoria e reprocessamento
- portal, chave_fonte, recebido_em, hash_conteudo, payload jsonb. PK (portal, chave_fonte, hash_conteudo). Mudou o hash = versão nova (retificação ou atualização), a anterior fica.

`lic_contratacoes` — normalizado, uma por contratação
- chave (PK, ver 3.4), portal_origem, numero_controle_pncp, id_compras_gov, orgao_cnpj, orgao_nome, esfera, poder, uf, municipio, codigo_ibge, unidade_codigo, unidade_nome, modalidade_codigo, modalidade_nome, modo_disputa, criterio_julgamento, srp (registro de preços), objeto, informacao_complementar, valor_estimado, valor_sigiloso, situacao_fonte, data_publicacao, abertura_propostas, encerramento_propostas, fuso_informado, link_sistema_origem, link_pncp, amparo_legal, versao_hash, primeira_coleta_em, ultima_coleta_em, ultima_alteracao_fonte_em.
- Índices: (data_publicacao), (encerramento_propostas), (orgao_cnpj), (uf), GIN em `to_tsvector('portuguese', objeto)` para a triagem por termos.

`lic_itens_fonte` — itens da contratação
- chave_contratacao, numero_item, lote, descricao, quantidade, unidade, valor_unitario_estimado, valor_total, criterio, beneficio_me_epp, situacao_item, resultado_jsonb (fornecedor, valor homologado), versao_hash. PK (chave_contratacao, numero_item).

`lic_anexos`
- chave_contratacao, sequencial_fonte, titulo, tipo_documento, url_fonte, arquivo_id (servicoArquivos), sha256, tamanho, paginas, texto_extraido_id, publicado_fonte_em, baixado_em, situacao (A_BAIXAR, BAIXADO, FALHOU, GRANDE_DEMAIS). PK (chave_contratacao, sha256); retificação = nova linha.

**Abas do legado (planilha própria do módulo, ex.: `METROLABS_LICITACOES_DB`, no molde do Cronograma de execução)**

`LIC_CONFIG` — ID, CHAVE, VALOR_JSON, VERSAO, MOTIVO, ATUALIZADO_POR_ID, ATUALIZADO_POR_NOME, ATUALIZADO_EM, CRIADO_EM (mesmo molde de `COM_CONFIG`). Guarda perfis de interesse, termos, UFs, modalidades, limites, orçamento diário de IA, antecedências de alerta.

`LIC_PORTAIS` — ID, CODIGO (PNCP, COMPRAS_GOV, BLL, BNC, LICITACOES_E, PORTAL_ESTADUAL_xx...), NOME, TIPO_ACESSO (API_PUBLICA, LOGIN, CERTIFICADO, MANUAL), URL_BASE, CREDENCIAL_REF (nome da chave em Chaves e senhas ou no cofre, nunca o valor), CADASTRO_FORNECEDOR_SITUACAO, CADASTRO_VALIDO_ATE, RESPONSAVEL_ID, ATIVO, OBS, ATUALIZADO_EM, CRIADO_EM.

`LIC_PERFIS` — ID, NOME, TERMOS_INCLUIR, TERMOS_EXCLUIR, CODIGOS_C1, UFS, MODALIDADES, VALOR_MIN, VALOR_MAX, ESFERAS, RESPONSAVEL_ID, ATIVO, VERSAO, MOTIVO, ATUALIZADO_EM, CRIADO_EM.

`LIC_OPORTUNIDADES` — a licitação como o SGO+ a trata
- ID, CODIGO (LIC-2026-0001, por `Com_proximoNumero_` adaptado), CHAVE_FONTE, PORTAL_CODIGO, NUMERO_CONTROLE_PNCP, NUMERO_EDITAL, PROCESSO, ORGAO_CNPJ, ORGAO_NOME, UNIDADE_COMPRADORA, UF, MUNICIPIO, MODALIDADE, MODO_DISPUTA, CRITERIO, SRP, OBJETO, VALOR_ESTIMADO, LINK_FONTE, PERFIL_IDS, PONTUACAO_TRIAGEM, MOTIVO_TRIAGEM, SITUACAO (NOVA, EM_TRIAGEM, DESCARTADA, EM_ANALISE, AGUARDANDO_DECISAO, PARTICIPAR, NAO_PARTICIPAR, PROPOSTA_ENVIADA, EM_DISPUTA, HABILITACAO, RECURSO, GANHA, PERDIDA, FRACASSADA, DESERTA, REVOGADA, ANULADA, SUSPENSA), SITUACAO_DESDE, RESPONSAVEL_ID, RESPONSAVEL_NOME, CLIENTE_ID, UNIDADE_ID, COMERCIAL_OPORTUNIDADE_ID, COMERCIAL_PROPOSTA_ID, VERSAO_FONTE_HASH, RETIFICADA_EM, DESCARTE_MOTIVO, EXCLUIDO_EM, CRIADO_POR_ID, CRIADO_POR_NOME, ATUALIZADO_EM, CRIADO_EM.
- Só entra aqui o que passou da triagem ou foi trazido à mão. O resto fica nas tabelas do servidor.

`LIC_ITENS` — ID, LIC_ID, NUMERO_ITEM, LOTE, DESCRICAO, QUANTIDADE, UNIDADE, VALOR_ESTIMADO_UNIT, PRODUTO_ID (catálogo), CODIGO_C1, ADERENCIA (ALTA, MEDIA, BAIXA, NAO_ATENDE), ADERENCIA_ORIGEM (REGRA, IA, PESSOA), ADERENCIA_MOTIVO, PARTICIPAR_ITEM (SIM, NAO, A_DECIDIR), PRECO_PROPOSTO_UNIT, PRECO_MINIMO_UNIT (só gestão), RESULTADO_VALOR, RESULTADO_FORNECEDOR, ATUALIZADO_EM, CRIADO_EM.

`LIC_DOCUMENTOS` — ID, LIC_ID, TIPO (EDITAL, TERMO_REFERENCIA, ANEXO, ESCLARECIMENTO, IMPUGNACAO, ATA, RESULTADO, PROPOSTA_ENVIADA, RECIBO, DECLARACAO, OUTRO), TITULO, ARQUIVO_ID, SHA256, VERSAO, SUBSTITUI_ID, ORIGEM (FONTE, UPLOAD), ENVIADO_POR_NOME, PUBLICADO_EM, CRIADO_EM.

`LIC_EVENTOS` — agenda
- ID, LIC_ID, TIPO (PUBLICACAO, PRAZO_ESCLARECIMENTO, PRAZO_IMPUGNACAO, LIMITE_PROPOSTA, SESSAO_PUBLICA, PRAZO_DOCUMENTOS_HABILITACAO, PRAZO_RECURSO, PRAZO_CONTRARRAZOES, HOMOLOGACAO, ASSINATURA, VISITA_TECNICA, AMOSTRA, OUTRO), QUANDO_LOCAL (texto como está na fonte), FUSO (America/Sao_Paulo, America/Manaus, ...), QUANDO_UTC, DIA_TODO, FONTE (API_PNCP, API_COMPRAS_GOV, EDITAL_PAG_n, IA_PENDENTE_CONFIRMACAO, PESSOA), FONTE_REF (endpoint ou arquivo + página), CONFIANCA, SITUACAO (PREVISTO, CONFIRMADO, RETIFICADO, CANCELADO, REALIZADO), ULTIMA_CONFIRMACAO_EM, ULTIMA_CONFIRMACAO_POR, SUBSTITUI_ID (retificação aponta para o anterior), MOTIVO_RETIFICACAO, ATIVIDADE_ID, CRIADO_EM, ATUALIZADO_EM.
- Retificação nunca altera a linha: cria outra com `SUBSTITUI_ID` e marca a anterior como RETIFICADO. O histórico de datas fica visível.

`LIC_ANALISES`
- ID, LIC_ID, VERSAO, ESCOPO (TRIAGEM, ADERENCIA, HABILITACAO, RISCO, PRECO), ITEM (texto curto do ponto analisado), CLASSE (FATO, INFERENCIA, PENDENCIA), TEXTO, FONTE_TIPO (EDITAL, ANEXO, API, SISTEMA, PESSOA), FONTE_REF (arquivo + página + trecho literal; ou ID do registro do SGO+), VERIFICADO (SIM, NAO), VERIFICACAO_MOTIVO, ORIGEM (REGRA, IA, PESSOA), MODELO_IA, CONFIRMADO_POR_NOME, CONFIRMADO_EM, CRIADO_EM.
- Uma linha por afirmação. A tela agrupa em "o que o edital diz", "o que concluímos" e "o que falta confirmar".

`LIC_DECISOES` — ID, LIC_ID, TIPO (PARTICIPAR, NAO_PARTICIPAR, IMPUGNAR, PEDIR_ESCLARECIMENTO, PRECO_FINAL, DESISTIR, RECORRER), DECISAO, MOTIVO, ITENS_JSON, ALCADA, PEDIDA_POR_ID, PEDIDA_EM, DECIDIDA_POR_ID, DECIDIDA_POR_NOME, DECIDIDA_EM, GES_ITEM_ID (ligação com a Caixa), CRIADO_EM.

`LIC_ALERTAS` — no molde de `NTF_GESTAO`
- ID, AVISO_ID, CHAVE (evento|lic|evento_id|antecedência|pessoa), LIC_ID, EVENTO_ID, ANTECEDENCIA (D-5, D-2, D-1, H-2, H-0...), USUARIO_ID, USUARIO_NOME, TIPO, TITULO, TEXTO, LIBERAR_EM, SITUACAO (seção 3.6), EMAIL_SITUACAO, EMAIL_MOTIVO, WA_SITUACAO, WA_MOTIVO, WA_ID, ENVIADO_EM, ENTREGUE_EM, LIDO_EM, ABERTO_EM, RESOLVIDO_EM, RESOLUCAO, CANCELADO_MOTIVO, TENTATIVAS, ENVIANDO_EM, CRIADO_EM.

`LIC_DISPUTAS` — ID, LIC_ID, ITEM_ID, SESSAO_EM, FASE (ABERTA, FECHADA, ALEATORIO, NEGOCIACAO), NOSSA_POSICAO, MELHOR_LANCE, PRECO_MINIMO_REF (só gestão), RESULTADO, OBS, CRIADO_EM.
`LIC_LANCES` — ID, DISPUTA_ID, QUANDO, AUTOR (NOS, CONCORRENTE), CONCORRENTE_NOME, VALOR, ORIGEM (DIGITADO, IMPORTADO_ATA), SUGERIDO_PELO_SISTEMA (SIM/NAO), CONFIRMADO_POR_NOME, CRIADO_EM. Registro, não envio.

`LIC_HISTORICO` — mesmo molde de `COM_HISTORICO`.

`LIC_ORGAOS` (opcional nesta fase) — ORGAO_CNPJ, NOME, ESFERA, PODER, UF, CODIGO_UASG, CLIENTE_ID, HISTORICO_JSON (participações, resultados, prazos médios de pagamento informados pela equipe).

`LIC_CONEXOES_LOG` não precisa existir como aba: a tela de saúde lê `lic_conexoes_log` pela ponte (`lic.conexoes`).

### 3.4 Chaves de deduplicação

- PNCP: `numeroControlePNCP` (formato `<cnpj do órgão>-1-<sequencial>/<ano>`). Chave interna: `PNCP:<numeroControlePNCP>`. Item: `PNCP:<numeroControlePNCP>#<numeroItem>`, o mesmo formato já usado no banco de preços (`PNCP:<url>#<item>` em `SGO_Comercial_BancoC1.js`; vale alinhar os dois).
- Compras.gov: identificador da compra no sistema (UASG + modalidade + número + ano). Chave: `CGOV:<uasg>-<modalidade>-<numero>/<ano>`.
- Cruzamento entre portais: a mesma compra federal aparece no Compras.gov e no PNCP. A ligação é feita pelo campo do PNCP que aponta o sistema de origem e, na falta dele, por (CNPJ do órgão, número da compra, ano, modalidade). Quando ligar, `LIC_OPORTUNIDADES.CHAVE_FONTE` guarda a chave do PNCP e a outra vai para um campo de chaves alternativas. Uma licitação nunca vira duas oportunidades.
- Anexo: SHA-256 do conteúdo.
- Versão da fonte: hash do payload normalizado. Mudou = retificação ou atualização; o legado é avisado e reconfere eventos e itens.
- Alerta: `CHAVE` única, como em `NTF_GESTAO`.
- Upload manual de edital de portal sem API: chave `MANUAL:<cnpj>-<numero>/<ano>-<portal>`, conferida antes de gravar.

Observação: os nomes de campos e caminhos das APIs públicas (PNCP consulta e Compras.gov dados abertos) devem ser conferidos pelo especialista de integrações contra a documentação oficial vigente antes de codar. Esta análise não fez chamadas aos portais.

### 3.5 Integração com Comercial, CRM e execução

Fluxo de uma licitação que a Metrolabs decide disputar:

1. Triagem (regra): perfil de interesse casa termos, códigos C1, UF, valor. Nasce `LIC_OPORTUNIDADES` com SITUACAO = NOVA e o responsável do perfil.
2. Análise: regras + IA preenchem `LIC_ANALISES` e `LIC_ITENS.ADERENCIA`; eventos em `LIC_EVENTOS`.
3. Pedido de decisão: o responsável pede "participar"; entra na Caixa de decisões (tipo `licitacao_participar`, área COMERCIAL, prazo pelo limite da proposta menos a antecedência configurada).
4. Decisão "participar":
   - Cliente: procura `CAD_CLIENTES` pelo CNPJ do órgão. Existe = liga. Não existe = abre o cadastro com os dados da consulta de CNPJ já preenchidos, para a pessoa confirmar com o "ciente" (regra de cadastro completo de 29/10/2026). Nunca cria cliente sozinho.
   - Oportunidade: `ComOpo_salvar_` com `ORIGEM = 'Licitação'`, `ORIGEM_REF = 'LIC:<ID>'`, `FUNIL = 'LICITACAO'` (funil novo), `VALOR_ESTIMADO` = soma dos itens escolhidos, `PREVISAO_FECHAMENTO` = data prevista de homologação. Grava `COMERCIAL_OPORTUNIDADE_ID` de volta.
   - Proposta: `ComP_nova_` com os itens escolhidos ligados ao catálogo, `prazo.licitacao = true` (sem acréscimo de urgência, regra que já existe). Preço final abaixo da alçada vai para a Caixa (`licitacao_preco_final`), reaproveitando `ComP_decidirPreco_`.
5. Resultado:
   - Ganha: `ComOpo_ganhar_`; proposta aprovada; `ComP_passarSetores_` gera as atividades da Área técnica (Cronograma de execução), Compras e Financeiro. Valores homologados vão ao banco de preços.
   - Perdida: `ComOpo_perder_` com motivo e `CONCORRENTE_VENCEDOR` / `VALOR_VENCEDOR` vindos do resultado do PNCP; preços dos vencedores ao banco de preços.
   - Contrato: fica pendente do módulo Contratos (1.3). Até lá, a assinatura e a vigência viram eventos em `LIC_EVENTOS` e atividades.

APIs internas (funções do legado, sem tela):
- `Lic_ligarCliente_(eu, licId)` → `{ clienteId, criado: false, pendente: 'confirmar cadastro' }`.
- `Lic_paraComercial_(eu, licId, itens)` → `{ oportunidadeId, propostaId }`, dentro de `Com_comTrava_`.
- `Lic_resultado_(eu, licId, resultado)` → chama `ComOpo_ganhar_` ou `ComOpo_perder_`.
- `Lic_fontePendencias_(add, ctx)` → registrada em `PEND_FONTES` (`SGO_Alertas_Central.js`).
- `Lic_registrarEventosMatriz_()` → eventos novos na matriz (molde `AvG_registrarEventos_`).
- `Lic_aposColeta_(resumo)` → chamada pelo Node depois de cada coleta (molde `AutPred_sentinela`).
- Do lado do Comercial, um retorno leve: quando a oportunidade com `ORIGEM_REF` LIC muda de situação, `Lic_aoMudarOportunidade_` atualiza a licitação (sem duplicar a regra).

### 3.6 Ciclo dos alertas (proposta para os estados 1 a 10)

A numeração precisa ser conferida com a missão. Proposta alinhada ao ciclo que já existe em `NTF_GESTAO`:

| N | Estado | Quem muda | Observação |
|---|---|---|---|
| 1 | PREVISTO | rotina de 15 min | alerta calculado a partir do evento e da antecedência; ainda não liberado |
| 2 | NA_FILA | rotina | chegou `LIBERAR_EM` (respeita expediente; Diretoria a qualquer hora) |
| 3 | ENVIANDO | rotina, sob trava | volta a ser enviado se parado há mais de 10 min |
| 4 | ENVIADO | rotina | e-mail e WhatsApp com situação própria |
| 5 | ENTREGUE | retorno da Meta | depende de ligar o webhook (2.6) |
| 6 | LIDO | retorno da Meta | idem |
| 7 | ABERTO | link `?aviso=` | a pessoa abriu o item no SGO+ |
| 8 | RESOLVIDO | sistema | a ação esperada foi registrada (proposta enviada, esclarecimento feito, decisão tomada) |
| 9 | ESCALADO | escada | sem ação até o limite: sobe ao gestor e depois à Diretoria (molde `Ges_rodada_`) |
| 10 | CANCELADO | sistema | evento retificado, cancelado, licitação descartada ou suspensa; motivo gravado |

Mais `FALHOU` (com motivo) como estado lateral do envio. Retificação de data cancela os alertas pendentes do evento antigo (estado 10) e gera os do evento novo, sem perder o histórico.

Regra de expediente específica: prazo de licitação não espera o expediente. O alerta é calculado para sair dentro do expediente anterior ao prazo (por exemplo, sessão segunda 09:00 gera o aviso de D-1 na sexta, no expediente, e o de H-2 às 07:00 só para quem a gestão marcar como "acompanha sessão"). Isso precisa de decisão do dono, por causa da regra de WhatsApp sutil (risco trabalhista).

### 3.7 IA de aderência

- Entrada: objeto, itens, trechos do edital e do termo de referência (texto extraído por página), catálogo oficial e códigos C1 (sem custo e sem margem), capacidade declarada (padrões ativos, serviços que a Metrolabs presta), UFs de atendimento.
- Saída JSON: por item, código sugerido, aderência, motivo; por exigência, classe (fato, inferência, pendência) e fonte (arquivo, página, trecho literal).
- Verificador novo (`Lic_verificarAnalise_`), somando o que já existe:
  1. Todo FATO precisa de trecho literal encontrado no texto extraído daquela página (comparação normalizada). Não encontrado = rebaixa para PENDENCIA com o motivo "trecho não localizado no edital".
  2. Todo número citado precisa existir no trecho ou nos dados do sistema (`SGO_QIAV_verificar_`).
  3. Data citada vira evento só como `IA_PENDENTE_CONFIRMACAO`, nunca como CONFIRMADO.
  4. Sem fabricante, marca ou modelo no texto gerado pelo SGO+ (regra da casa), mesmo que o edital cite.
  5. Sem referência a si como IA; sem emoji; sem frase vazia (`ComEsp_verificar_`).
- Sem a extração de texto (lacuna 2.9), o item 1 não funciona. Alternativa sem biblioteca nova: pedir à IA a transcrição por página e verificar contra ela; é mais caro e menos confiável. Recomendo a biblioteca de extração no Node (decisão técnica a aprovar).
- Registro: cada chamada em `COM_IA_SUGESTOES` ou numa aba `LIC_IA_REGISTRO` (modelo, tokens estimados, aceito/recusado), com contador diário para respeitar o orçamento de IA.

### 3.8 Menu e telas

- Grupo novo "Licitações" em `Index.html`, no molde de `menu-secao-comercial` (oculto por padrão, aberto por `Licitacoes_mostrarMenu_`), com: Hoje em Licitações, Oportunidades (lista e ficha), Agenda, Documentos de habilitação (quando o cadastro existir), Portais e conexões, Perfis de interesse, Painel.
- Telas em `JS_Licitacoes.html`; servidor em `SGO_Licitacoes_Config.js`, `_Triagem.js`, `_Analise.js`, `_Agenda.js`, `_Alertas.js`, `_Comercial.js`, `_Painel.js`; ajuda em `SGO_Ajuda_Licitacoes.js`; manual `docs/MANUAL_MODULO_LICITACOES.md` no mesmo commit de cada tela (regra da casa).
- Lista de origens e funil novos entram pela metodologia do Comercial (configurável), não por código fixo.

---

## 4. Segurança

### 4.1 Credenciais

- Fase 1 não precisa de credencial: PNCP consulta e Compras.gov dados abertos são públicos.
- Chaves de API, quando houver, ficam em Chaves e senhas (`SGO_Chaves.js`, grupo novo "Licitações"), referenciadas por nome em `LIC_PORTAIS.CREDENCIAL_REF`. O valor nunca volta à tela nem ao log.
- Atenção: Chaves e senhas grava em `propriedades` em texto (só a tela esconde). Senha de login em portal de fornecedor deve ir para o cofre AES-256-GCM (`servicos/cofre.ts`), que hoje só atende as senhas de e-mail. Usar o cofre para portais exige uma operação nova na ponte, restrita ao SGO+, com o contexto (AAD) amarrado ao portal.
- Certificado digital (A1/A3) de acesso a portais: fora desta fase. Não guardar no servidor sem decisão expressa do dono e parecer de segurança.

### 4.2 Permissões por função

Proposta de `Lic_nivelDe_` (molde `Com_nivelDe_`):
- GESTAO (Diretoria, Administrador, gestor da área Comercial, responsáveis configurados): tudo, inclusive preço mínimo, decisão de participar e preço final.
- ANALISTA (perfil Comercial ou área Comercial, ou função "Licitações" configurada): triagem, análise, documentos, agenda, proposta; vê valor estimado e preços de mercado; não vê custo nem margem (mesma regra do banco de preços).
- TECNICO / METROLOGIA: consulta e parecer técnico na análise (aderência), sem valores.
- FINANCEIRO: consulta dos resultados ganhos e das exigências financeiras (garantia, retenções).
- RH: sem acesso (como no Comercial). CLIENTE: sem acesso.
- O servidor confere sempre; o menu só esconde.

### 4.3 Auditoria

- `LIC_HISTORICO` para toda mudança de situação, decisão, retificação, confirmação de data, mudança de aderência.
- `lic_conexoes_log` para toda chamada a portal.
- `lic_bruto` guarda o que o portal disse, com hash, para provar o que estava publicado na data.
- Documento enviado (proposta, declaração) fica com SHA-256 e não pode ser substituído, só versionado.

### 4.4 O que a IA pode e não pode fazer

Pode: classificar item, sugerir código do catálogo, resumir exigências, apontar riscos, propor perguntas de esclarecimento, sugerir datas a confirmar, redigir rascunho de pedido de esclarecimento para a pessoa revisar.

Não pode: decidir participar ou descartar (descartar por regra é permitido e fica registrado; descarte por IA não); confirmar data; enviar qualquer coisa a portal ou órgão; dar lance; definir preço; criar cliente; afirmar fato sem trecho verificado; receber custo, margem, senha ou dado pessoal da equipe.

### 4.5 Disputa e lances

Nesta fase, só assistência: o sistema mostra o preço mínimo aprovado (só para a gestão e para quem opera a sessão com permissão), registra os lances digitados, calcula a distância para o melhor lance e avisa quando o próximo lance passaria do mínimo. Nenhum envio automático. Robô de lances exige decisão do dono, análise jurídica das regras do portal e credencial no cofre; fica para fase própria.

---

## 5. Riscos, dependências e primeira versão

### 5.1 Riscos técnicos

| Risco | Efeito | Mitigação |
|---|---|---|
| Volume do PNCP no modelo `linhas` | telas lentas, rotinas estourando 300 s | bruto e normalizado em tabelas próprias; legado só vê o triado |
| Agendador sequencial | coleta longa atrasa Caixa, Ponto, rastreador | coletor no Node, fora do agendador |
| Mudança ou instabilidade das APIs públicas | coleta para em silêncio | `lic_conexoes_log`, sentinela com item "licitacoes", aviso ao responsável (evento da matriz) |
| Limite de taxa dos portais | bloqueio de IP do servidor | espera entre páginas, retentativa com espera crescente, janela de coleta noturna para histórico |
| Fuso e horário (órgãos fora de Brasília, horário de verão local) | alerta na hora errada | `FUSO` por evento, `QUANDO_UTC` calculado, fonte guardada, confirmação humana |
| Feriados estaduais e municipais | prazo em dia útil calculado errado | prazo vem da fonte; quando calculado, marcar como inferência; lista de feriados do expediente |
| Edital escaneado (imagem) | sem texto, sem verificação | marcar "sem texto"; leitura pela IA só como pendência; OCR fica para depois |
| Retificação não percebida | proposta fora das regras novas | hash da fonte; reconferência diária das licitações em andamento; alerta de retificação |
| Alucinação da IA | decisão errada | verificador com trecho literal; IA nunca confirma data nem decide |
| Retorno da Meta desligado | "entregue/lido" nunca aparecem | ligar o webhook de status no SGO+ (5.2) |
| Custo da IA sem contador | conta alta ou 429 no meio do dia | orçamento diário, fila, prioridade para licitações com prazo próximo |
| Cliente duplicado por CNPJ de fundo/secretaria | cadastro confuso | ligação por CNPJ do órgão + unidade atendida, sempre confirmada pela pessoa |
| Regra de WhatsApp sutil | risco trabalhista | prazos fora do expediente só para quem a gestão marcar; padrão é e-mail e sistema |

### 5.2 Dependências a declarar (não criar dentro de Licitações)

1. Documentos da empresa (certidões, atestados, balanço, contrato social, acreditações) com validade: grupo Documentos.
2. RH técnico: formação, registro no conselho, certificações, treinamentos, atestados por pessoa.
3. Contratos: quantitativos, saldo, vigência, aditivos, empenhos, garantia, gestor e fiscal.
4. Financeiro de receitas: faturamento, contas a receber, retenções, empenho e liquidação.
5. Estoque (para licitações de produto com entrega parcelada).
6. Matriz de capacidade de medição (Metrologia).
7. Retorno da Meta no SGO+: rota de webhook de status (com verificação da assinatura pela `META_APP_SECRET`, que já existe em Chaves e senhas) chamando `SGO_avisosGestaoRetornoMeta_` e o equivalente de Licitações. Esforço estimado: 1 a 2 dias, independente do módulo.
8. Extração de texto de PDF no servidor (biblioteca a aprovar).
9. Decisões do dono: quem opera licitações, quem decide, antecedências, horário dos alertas fora do expediente, UFs e valores de interesse, CNPJ (matriz ou filial) que participa.

### 5.3 Primeira versão funcional (PNCP + Compras.gov consulta, IA de aderência, agenda, alertas)

Escopo: encontrar, triar, analisar, agendar, alertar e passar ao Comercial. Sem documentos de habilitação, sem contratos, sem robô.

| Etapa | Entrega | Esforço (dias úteis) |
|---|---|---|
| 0 | Decisões do dono (5.2 item 9), conferência dos endpoints oficiais, aprovação da biblioteca de PDF | 1 |
| 1 | Fundação no servidor: esquema `lic_*`, fila `lic_tarefas`, coletor PNCP (publicações por janela, propostas abertas, itens, arquivos), deduplicação por `numeroControlePNCP`, `lic_conexoes_log`, item na sentinela, ponte `lic.*`, testes | 4 a 5 |
| 2 | Coletor Compras.gov (consulta), ligação com o PNCP, testes | 2 a 3 |
| 3 | Legado: abas `LIC_*`, permissões `Lic_nivelDe_`, perfis de interesse, triagem por regras, lista e ficha, menu, manual e ajuda | 3 a 4 |
| 4 | Anexos e análise: download com SHA-256, extração de texto, IA de aderência com verificador de trecho, `LIC_ANALISES`, contador de IA | 3 a 4 |
| 5 | Agenda e alertas: `LIC_EVENTOS` com fuso e retificação, `LIC_ALERTAS` no ciclo de 10 estados, eventos na matriz, fonte na central de pendências, tipos na Caixa de decisões, modelo `sgo_licitacao_prazo` | 3 a 4 |
| 6 | Passagem ao Comercial (cliente pelo CNPJ, funil LICITACAO, oportunidade, proposta com `licitacao = true`, resultado e banco de preços), painel simples, revisão geral, testes verdes, publicação | 2 a 3 |
| | **Total** | **18 a 24** |

Fora da conta: o webhook de status da Meta (1 a 2 dias, recomendado antes da etapa 5) e o cadastro de documentos da empresa (fase 2, estimado à parte quando o escopo for aprovado).

Ordem recomendada depois da primeira versão: (fase 2) documentos da empresa e checklist de habilitação; (fase 3) disputa assistida e importação de atas e resultados; (fase 4) Contratos como módulo próprio; (fase 5) outros portais com login, por prioridade de volume.

Critério de pronto da primeira versão: uma licitação real do PNCP com objeto de qualificação térmica entra sozinha na lista, mostra os itens com aderência e fonte, tem a data da sessão na agenda com fuso e origem, gera os alertas previstos na data certa, passa pela Caixa de decisões e vira oportunidade e proposta no Comercial ligadas ao cliente pelo CNPJ, sem nenhum cadastro duplicado.
