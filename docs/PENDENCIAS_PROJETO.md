# Pendências e iniciativas futuras

Este índice registra trabalhos futuros. A presença de um item aqui não autoriza sua implementação.

## SG-RH 360 — iniciado em 04/10/2026

Usuário solicitou iniciar o projeto a partir de `C:\Users\venda\Downloads\Projeto RH`. Criado projeto Apps Script DEV independente **METROLABS_SGRH_360_DEV** e base local em `apps-script-imports/METROLABS_SGRH_360`. Fundamentos de identidade Google, autorização, cadastro de colaboradores, casos/tarefas, documentos administrativos HTML/PDF e auditoria; 13 arquivos enviados e conferidos no remoto. 39 verificações de backend e 8 de interface aprovadas com serviços Google simulados.

**Retomada:** executar `inicializarRhDev_` no editor, autorizar Google e homologar `/dev`, incluindo identidade, privacidade dos arquivos e PDF real. Controle do navegador indisponível nesta sessão; banco/pastas ainda não inicializados. Produção não publicada. Colaboradores completos/anexos, catálogo de templates, workflow configurável, compartimentos sensíveis, IA, assinatura e integrações permanecem para próximas etapas. Material normativo recebido não foi colocado em vigor.

Documentação: [README e instalação](../apps-script-imports/METROLABS_SGRH_360/README.md), [arquitetura](../apps-script-imports/METROLABS_SGRH_360/docs/ARQUITETURA.md), [dossiê de enquadramento](../apps-script-imports/METROLABS_SGRH_360/docs/DOSSIE_ENQUADRAMENTO.md) e [homologação](../apps-script-imports/METROLABS_SGRH_360/docs/HOMOLOGACAO.md).

**Continuação em 04/10/2026 — versão 0.1.1:** corrigida a exposição de dados cadastrais nos payloads de auditoria do perfil técnico; acrescentado bloqueio de execução em outro projeto. Setup registra links no log do editor e ganhou testes de reexecução e retomada após falha parcial. **64 verificações locais aprovadas** (43 backend, 13 setup, 8 UI); 13 arquivos conferidos após envio. Inicialização Google e homologação `/dev` continuam aguardando confirmação do usuário; navegador indisponível. Evidência local: `apps-script-imports/METROLABS_SGRH_360/output/release-0.1.1.json`.

**Adaptação autorizada em 04/10/2026 — versão 0.2.0:** usuário pediu máxima semelhança com o SGO+ no visual e no modo de login, com execução autônoma. Entregues a cascata final Dark Compact do Portal, logo local, composição do login, menu/cabeçalho e controles compactos. Login RH próprio por usuário/senha, bcrypt, sessão, logout real, troca obrigatória de senha inicial, limites de tentativas e revogação. Primeiro acesso protegido pelo proprietário Google permite inicializar banco e credenciais pela tela, sem senha padrão. Schema 2 acrescenta RH_CREDENTIALS sem modificar as dez tabelas anteriores. **159 verificações locais aprovadas**, 17 arquivos enviados e conferidos; deployment HEAD confirmado como MYSELF / USER_DEPLOYING. Prévia visual, histórico e homologação em [registro da rodada](../apps-script-imports/METROLABS_SGRH_360/docs/LOGIN_E_VISUAL_SGO_20261004.md). Execução real Google ainda não homologada; nenhuma publicação de produção. SGO+ e Portal não foram alterados por esta implementação.

## Estufa/Banho e secadora — publicação v280 em 21/09/2026

Implementados sensores selecionáveis e perfil Secadora de traqueias; publicado em DEV e produção. Testes locais aprovados e código remoto conferido. **Retomada pendente:** emissão autenticada de caso conhecido nos dois relatórios, revisão da resposta real da IA e paginação final no Google. DEV exigiu login Google nesta sessão. Consulte [inventário, manual, evidências e rollback](ESTUFA_SECADORA_SENSORES_20260921.md).

## Maleta FieldLogger e integração com autoclave SGO+ — 19/09/2026

**Status: ideia registrada, em discussão; aguardar validação antes de desenvolver.** Dois FieldLoggers com sensores de temperatura, umidade e pressão absoluta. Primeiro comprovar a comunicação/aquisição; depois dashboard ao vivo, armazenamento/extração, identificação de cliente/equipamento/receita/estudo e envio de cada ciclo ao módulo de autoclave do SGO+. Relatório futuro com gráficos, fotos, tabelas, índices, F0 e interpretação por IA, com revisão técnica.

**Atualização de 21/09/2026:** usuário confirmou Ethernet nos dois loggers e notebook sem porta Ethernet; solicitou guardar a proposta para o futuro. Registradas as opções switch + adaptador USB–Ethernet + três cabos, ou roteador com duas portas LAN e notebook por Wi-Fi. Não assumir ponte USB → Ethernet entre os loggers. Modelos, firmware, composição dos canais e forma de operação em campo ainda precisam ser confirmados. Retomar pela identificação dos equipamentos e teste de comunicação dos dois instrumentos. Não criar projeto remoto nem alterar o portal nesta fase. [Conceito, conexões propostas e ponto de retomada](ESTUDO_MALETA_FIELDLOGGER_20260919.md).

## Central de Gestão Operacional — registrada em 16/09/2026

**Status: planejada, aguardando disponibilidade e autorização do usuário para iniciar.**

Criar futuramente um projeto separado no Google Apps Script para centralizar chamados, atividades, agenda compartilhada, recorrências, alertas, cronogramas por equipamento após aprovação do cliente, orçamentos, compras, vendas, custos, entregas/rastreio, faturamento e recebimentos. Incluir dashboard e relatório mensal consolidado em HTML A4, com indicadores, gráficos, tabelas e interpretação por IA.

Objetivo: toda demanda registrada e acompanhável, com responsável, histórico e próximo passo, permitindo que outro colaborador assuma sem depender da memória de uma pessoa. Chamados sem data ficam pendentes de agendamento; datas conhecidas serão cadastradas na carga inicial.

**Não iniciar agora, não criar projeto remoto e não alterar o SGO+ para esta iniciativa.** Depois de construir e validar, decidir se será sistema independente ou módulo do SGO+.

Estudo completo: [escopo, fluxos, dados, etapas, critérios de aceite e decisões para retomada](ESTUDO_GESTAO_OPERACIONAL_AGENDA_COMPRAS_20260916.md).

Próxima ação, quando o usuário retomar: validar o estudo e definir uma operação piloto. Nenhuma data de início foi combinada.

### Acréscimo de 17/09/2026 — recebimento, manutenção e devolução de equipamentos

**Também pendente, sem iniciar agora.** Incluir protocolos de entrada e saída com fotos, avarias, peças/acessórios e quantidades; registro das manutenções e peças retiradas/substituídas; controle de guarda e transferências entre funcionários, motoristas e cliente; comparação recebido × devolvido; relatórios HTML A4 com imagens e relatos organizados por IA, revisados por responsável; ciência assinada do cliente na entrada e na devolução, vinculada à versão apresentada, com possibilidade de ressalva.

Motivo registrado pelo usuário: reclamações sobre danos e peças faltantes, sem evidências formais do que foi mostrado ou entregue. O objetivo é documentar os fatos e responsabilidades, evitando depender de declarações verbais. Prever recusa/ausência de assinatura como pendência e revisão jurídica dos termos e da modalidade de assinatura antes da implantação; não prometer garantia jurídica automática.

Detalhamento: [seção 20 do estudo — módulo de equipamentos](ESTUDO_GESTAO_OPERACIONAL_AGENDA_COMPRAS_20260916.md#20-módulo-de-recebimento-manutenção-e-devolução-de-equipamentos). Na retomada, avaliar sua antecipação no piloto devido aos problemas relatados.

## Saneamento e testes dos cadastros do portal

**Correção posterior em 21/09/2026 — produção 277:** resolvida a carga concorrente identificada na abertura do Certificado de Calibração; confirmar a reabertura autenticada após Ctrl+F5. [Registro do timeout e correção](CORRECAO_TIMEOUT_PADROES_20260921.md).

**Atualização de 21/09/2026 — produção 276:** acrescentados localização livre, foto, leitura de certificados por IA, inventário e solicitação de orçamento HTML A4 dos padrões, com histórico de cópias. Conferir a primeira leitura/gravação/emissão real e preencher as localizações/fotos dos padrões. [Implementação, uso, testes, backups e retomada](PADROES_INVENTARIO_ORCAMENTO_20260921.md). Os recursos anteriores de clientes/unidades permanecem preservados.

**Ponto de retomada atualizado:** [Inventário do Portal — Clientes e Unidades, produção 275](INVENTARIO_PORTAL_CLIENTES_UNIDADES_20260917.md). Manual e nova interface publicados. Usuário informou que liberará o uso pela equipe amanhã; aguardar retorno operacional e decisão do vínculo Pinto de Azevedo.

As pendências da correção de CNPJ — validação pela equipe, unidades ambíguas, vínculos de equipamentos e TAGs repetidas — permanecem descritas no [relatório de correção de 16/09/2026](CORRECAO_CNPJ_CADASTROS_20260916.md). São trabalho do portal atual, separado da iniciativa futura acima.
# Atualização do portal — 21/09/2026 — versão 278

Publicado reparo automático de abas documentais vazias ao gerar inventário de padrões. Detalhes e retomada: [Correção do cabeçalho](CORRECAO_CABECALHO_PADROES_20260921.md). Pendente confirmar a geração autenticada após Ctrl+F5; 37 testes locais aprovados.

## Padrões: preparação automática e impressão em nova página — produção 279

Implementação e manual em [Automação dos padrões](PADROES_AUTOMACAO_E_IMPRESSAO_20260921.md). Pendente iniciar o primeiro lote pelo botão **Atualizar dados pelos certificados**, em sessão de gestor, e conferir os resultados reais. A execução remota foi recusada pelo Google; testes locais não preencheram o acervo. Progresso e dados extraídos ficam salvos; origem por IA separada da conferência humana.
