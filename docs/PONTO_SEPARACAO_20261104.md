# Aviso não confirmado separado de esquecimento declarado

Publicado em 04/11/2026, conforme pedido do usuário. O painel mensal agora conta como esquecimento somente o registro **Esqueci de bater**. Avisos não confirmados continuam visíveis, mas são informativos: não comprovam falta e não acionam resumo ao RH ou sugestão de conduta por si só.

A consulta de produção após publicar confirmou novembro com 44 avisos não confirmados, zero declarações e zero selos falsos de encaminhamento. Nenhuma marcação foi apagada ou convertida em dispensa. Calendário, jornadas, escolhas de avisos e permissões foram preservados.

## Escopo da correção

Resumos novos usam a chave RES_DECL e sugestões nativas usam PONTO_DECLARADO/PONTO_ESQUECIMENTO_DECLARADO. Um resumo antigo baseado em não confirmação não bloqueia uma futura declaração legítima. Declarações comprovadamente já comunicadas não são reenviadas, e uma sugestão mensal legítima não se repete.

Avisos e sugestões da regra anterior são identificados como histórico apenas na apresentação. O conteúdo armazenado e decisões de gestão permanecem intactos. E-mails antigos ainda pendentes são pulados pela rotina, sem reenvio. Mensagens já enviadas não são apagadas. O comportamento do assistente do COMMAND não foi alterado.

A tela, relatório A4, ajuda e manual explicam a separação. O limite configurado de declarações para encaminhar ao RH foi mantido. Nenhuma ocorrência ou punição é criada automaticamente.

## Versão e validação

- Origem: 26914c81a0ab3eab7022999d8ad5972f4ed61cdf.
- Servidor: 10ce79ebdcb49957c3f1d5bedd54774615c95dce.
- Imagem: sha256:ee715e61336f3994c665d17cb1de14c21824970fb03131ed6d949c36aa318690.
- Aplicação: 53689e4cf5a9b04a26bfddaf53623081154a0079b8ae5c92958afdfd9b219168.
- Imagem anterior: sha256:0c35261ce54fa812ba0e3a4bf4042c2d2891ca33ef0ee3342c752c7e5a5286a8.

1.686 testes de origem e 351 do servidor passaram. Os 22 testes de ponto incluem zero encaminhamento por não confirmação, três declarações reais pela API, deduplicação, fila antiga e apresentação do histórico sem alterar o armazenamento. Navegador: 13 verificações do editor preservadas e nova conferência do mês em 320/390px, mostrando quatro avisos sem confirmação, zero declarações e nenhum selo falso.

Smoke da imagem sem rede externa passou. Entre 901 arquivos comparados, somente sete alterações previstas de ponto/Conduta/ajuda/manual/metadados; Core, COMMAND, modelos e demais fontes permaneceram iguais em bytes.

A comparação nativa inicial falhou porque ordenava os registros por aba/n e não incluía planilha_id: havia 21 grupos empatados entre bases. A falha original permanece em native-rollback-result.json. Auditoria independente restaurou o mesmo backup em uma base de comparação e conferiu 298 linhas pela chave completa; nenhuma diferença. Hash canônico 51d66ba1a234ed5c261dfe409e4e32b9a64d663d75f66b0ec9d74c888ee8fec1.

A candidata não foi repetida. Executou-se somente a fase de rollback ainda não iniciada. Classificação nova, configurações e histórico preservados foram aceitos em native-acceptance-result.json, com a reconciliação referenciada e o resultado original intacto. A produção não foi usada para esse ensaio nem houve envio de notificações dele.

## Operação e backups

Stage /opt/metrolabs/qa/sgo-ponto-separar-20261104. Novo snapshot SQL restaurado e comparado nas 30 tabelas. Backup de arquivos composto pelo arquivo integral anterior já verificado mais delta de 15 entradas, sem remoções; o delta foi restaurado e conferido em bytes, dono e modos. Não houve nova restauração integral de filesystem. O arquivo base no stage sgo-ponto-avisos-20261104 continua necessário.

Publicação única confirmada. PostgreSQL, ambiente, montagens e os outros 35 contêineres em execução preservados; nenhum banco restaurado em produção. Quatro contêineres próprios de QA já parados foram retirados. PG de QA, base de comparação, diretórios, backups e imagens foram mantidos. Cerca de 28 GB livres ao encerrar.

Provas brutas e índice SHA256 em docs/evidencias_ponto_separacao_20261104. Não repetir publicação, ensaios nem limpeza encerrados. RH360 segue pausado; lavadora e demais sistemas intocados.
