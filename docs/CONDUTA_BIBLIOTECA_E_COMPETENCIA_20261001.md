# Conduta: biblioteca, manuais e conferência de competência

## Entrega

O módulo ganhou a aba **Manuais e documentos**, com dois manuais por papel, três guias separados dos pilares e os três PDFs originais. Todos os materiais possuem leitura e download. Cada aba operacional possui **Como usar esta tela**.

Os cinco HTMLs ficam em `docs/conduta_biblioteca/`. Os guias cobrem 48 assuntos e mantêm a transcrição das 45 páginas de origem, com referências por página. Os manuais descrevem campos, botões, permissões, exemplos e perguntas respondidas para Farol do mês, Ocorrências, Eventos Positivos, Missões, Ausências, Fechamentos e Relatórios semanais e missões. Os três PDFs distribuídos pelo módulo são idênticos, byte a byte, aos anexos enviados. O manifesto contém SHA-256 e tamanho dos originais.

Os materiais são consultados por APIs que exigem sessão da equipe. Clientes são bloqueados. Os dados binários dos PDFs permanecem no código do servidor e não são enviados com o carregamento público do módulo.

## Setembro e defesa

A competência da ocorrência já era derivada da data do fato: um fato ocorrido em setembro continua em setembro quando homologado ou decidido em outubro. Não foi necessário falsear datas nem migrar ocorrências.

Fechamentos agora oferece seletor de competência, **Consultar prévia**, **Imprimir prévia** e **Fechar competência conferida** quando permitido. A prévia mostra cálculo, valores reais/simulados, pendências e datas dos prazos. É consultiva e não grava fechamento nem autoriza folha.

O servidor impede congelamento de mês ainda em curso e de mês com ocorrências registradas, homologadas, contestadas, em recurso ou firmes com recurso ainda aberto. O último dia do prazo também permanece aberto. Ocorrência firme sem prazo de recurso informado exige saneamento antes do fechamento. Fechamentos anteriores permanecem imutáveis; a prévia informa se já há resultado congelado e não o substitui.

Não houve homologação de casos, julgamento, alteração de datas de ocorrências, redução de prazo, mudança de configuração de bonificação ou pagamento. A opção inicial de modo sombra até 31/10/2026 foi preservada; os manuais orientam conferir a configuração efetivamente vigente por competência. A apuração histórica ainda usa cadastro atual de colaboradores, pois o sistema não mantém datas de desligamento; essa limitação aparece na prévia.

## Divergência dos pilares

O pilar Cultura Operacional condiciona o bônus à ausência de infração grave; o motor do módulo utiliza ICO, peso G=30 e gatilho separado GG. Uma G pode preservar verde dependendo do divisor. Os guias explicitam a diferença e solicitam esclarecimento formal à gestão, sem alterar regras financeiras por interpretação.

## Verificação

- Cinco testes de fechamento: defesa aberta, último dia de recurso, mês corrente, congelamento anterior, homologação real em outubro com fato/competência setembro e prazo integral.
- Teste da biblioteca: oito recursos, PDFs byte a byte, acesso restrito, UTF8, âncoras, DOM, botão contextual, escape de texto e estados da prévia.
- Quinze testes de regressão dos relatórios, com sete contextos históricos, acesso, datas, persistência e janelas.
- Regressão de missões: executantes, nomes, permissões e integridade.
- Páginas dos PDFs originais renderizadas e inspecionadas. A revisão visual em navegador do módulo não pôde ser realizada porque as superfícies Edge e IAB não estavam disponíveis; as novas telas foram verificadas por DOM.

## Publicação

Publicado na mesma implantação, versão **296**, com **196 arquivos** verificados. Apenas `SGO_Conduta_Biblioteca`, `SGO_Conduta_ConteudoModulo`, `SGO_Conduta_Ocorrencias` e `SGO_Conduta_Fechamento` foram atualizados/adicionados. Todos os demais arquivos remotos foram preservados, inclusive alterações locais preexistentes não relacionadas.

Comprovante e snapshots: `backups/CONDUTA_BIBLIOTECA_20261001/publicacao.json`, `remote-before.json` e `remote-after.json`. Publicador verifica concorrência antes de escrever e confere integralmente o conteúdo após publicação.
