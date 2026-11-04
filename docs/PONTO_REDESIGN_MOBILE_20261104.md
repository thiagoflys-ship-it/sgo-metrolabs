# Avisos de ponto: novo painel para computador e celular

Publicado em 04/11/2026 após revisão funcional, visual e de desenvolvimento. A tela passou de uma tabela longa para uma lista compacta de pessoas e um editor individual. No computador os painéis ficam lado a lado; no celular a seleção abre o editor com quatro controles em grade e Salvar fixo no rodapé.

Buscar pessoa ou área, escolher os avisos e salvar. Os atalhos Todos disponíveis, Entrada e saída e Nenhum preenchem o rascunho; só Salvar grava. Jornada, contato e folgas ficam em seções recolhidas. Rascunhos sobrevivem a busca, troca de pessoa, abas e atualização dentro do módulo; sair da conta limpa esse estado. A interface distingue habilitação de envio efetivo e informa que o retorno é um horário previsto.

As escolhas já salvas, jornadas, permissões, regras CLT, piloto e proteção contra repetição foram preservadas. Nenhuma lotação matriz/filial foi inventada nem aplicada automaticamente. RH360 continua pausado; lavadora e demais sistemas não foram alterados.

## Versão entregue

- Origem funcional: a3f8f7fb9447d5eaee7ff66ce2e3e2420fef3db6.
- Servidor funcional: 689ee689d504ed164b72c6d1c51036d517d1dd62.
- Imagem: sha256:0c35261ce54fa812ba0e3a4bf4042c2d2891ca33ef0ee3342c752c7e5a5286a8.
- Aplicação: 3f05676359f7e29b857806ead2048abbe6454c7f1690eb03fd401f09ddba174e.
- Imagem anterior para rollback: sha256:fa1e066352d2d6f70ba966f0e1290eae094e41e2572512555fc6bdb5eb8c7169.

Saúde pública e marcadores da nova interface confirmados. Produção mantém seis workers, o mesmo PostgreSQL, ambiente e montagens. Os outros 35 contêineres em execução mantiveram imagens e PIDs. Não houve restauração de banco em produção nem mudança automática das escolhas reais.

## Validação e limites

32 testes de ponto/perfis e 13 verificações de navegador sintético passaram. O navegador usou UI_Estilos.html, Ponto_render_ e a estrutura móvel do SGO+, em desktop, 320px e 390px. Designer e especialista aprovaram as imagens e o comportamento após corrigir contraste dos controles, sobreposição do cabeçalho, posição de Salvar, foco e casos sem intervalo.

A imagem passou no smoke sem rede externa. A comparação de 901 arquivos encontrou diferenças somente em JS_Ponto.html e _ORIGEM.json; backend, Core, COMMAND, modelos e dependências comparadas ficaram iguais em bytes. Por esse escopo de interface, as suítes gerais anteriores de 351/1682 testes não foram repetidas nem apresentadas como uma nova execução.

PostgreSQL nativo com dois workers passou na sequência anterior → candidata → anterior. Os hashes das escolhas por pessoa permaneceram iguais nas três fases; não houve envio de notificações nesse ensaio. A proteção de resposta tardia após logout recebeu revisão estática; o navegador comprova a limpeza dos rascunhos. Não se trata de uma auditoria completa de leitor de tela.

Falhas preliminares foram preservadas em ponto-redesign-failures.json. Uma falha local ao imprimir o resultado do build ocorreu depois de a imagem estar construída; a prova do servidor foi recuperada sem repetir o build.

## Backups e operação

Stage: /opt/metrolabs/qa/sgo-ponto-mobile-20261104. Novo snapshot SQL restaurado e comparado nas 30 tabelas. O backup de arquivos é composto pelo arquivo integral já restaurado e verificado no stage anterior sgo-ponto-avisos-20261104, mais filesystem-delta.tgz com três entradas novas. O delta foi extraído e comparado em bytes, UID/GID e modos; a composição dos manifestos coincide com o inventário observado. Não houve uma nova restauração integral do filesystem nesta entrega.

Manter o arquivo base anterior, o dump novo, delta, manifestos, app-anterior e imagens de rollback. O stage novo sozinho não substitui o arquivo base. O PG de QA está parado; o diretório nativo de ensaio foi mantido. Somente quatro contêineres próprios de QA já parados foram retirados, preservando os 36 em execução. Cerca de 30 GB livres ao encerrar.

Provas brutas e SHA256 em docs/evidencias_ponto_mobile_20261104/index.json. A publicação foi única e confirmada; não repetir publicação, ensaios ou limpeza já encerrados. Os controladores têm namespace e guardas próprios. Para reproduzir o navegador local: node tests/ponto_mobile_browser.cjs, usando o Playwright instalado no projeto sgo_servidor.


Correção posterior da contagem: publicada separação entre avisos não confirmados e esquecimentos declarados, imagem ee715e6.../rev10ce79e. Layout preservado. Ver PONTO_SEPARACAO_20261104.md; não repetir publicações anteriores.
