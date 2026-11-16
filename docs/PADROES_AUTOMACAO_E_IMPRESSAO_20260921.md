# Padrões — preparação automática e documentos em nova página

Solicitação aprovada em 21/09/2026: ler os PDFs dos padrões cadastrados, gravar dados automaticamente, preservar dados manuais, identificar pendências reais e abrir inventário/orçamento HTML A4 em nova página, como os relatórios do módulo.

## Uso pela equipe

1. Atualize o portal com Ctrl+F5 e entre em Certificado de Calibração → Controle dos padrões.
2. Como gestor, clique em **Atualizar dados pelos certificados**. O lote abrange todos os padrões cadastrados, inclusive inativos. Não é necessário abrir cada padrão.
3. Acompanhe a barra e abra **Ver resultados e pendências por padrão**. A fila fica salva; **Consultar andamento / retomar** recupera sua visualização. **Atualizar dados pelos certificados** retoma um lote ativo ou inicia nova atualização se o anterior terminou.
4. Cada PDF é processado em grupo de até oito registros/canais. Dados técnicos, origem, modelo da IA e horário ficam gravados. Certificados iguais já processados são reaproveitados pelo hash do conteúdo. Grupos maiores são divididos para limitar o volume da resposta.
5. Revise as pendências indicadas no cadastro. Preencha a localização atual e adicione foto se necessário. A IA não deduz localização a partir do endereço do laboratório.
6. Selecione os instrumentos e preencha destinatário/orientações opcionais. Clique em gerar inventário ou orçamento. A página de aguarde abre imediatamente; depois recebe a cópia emitida e salva, com botão **Imprimir / salvar PDF**.
7. Se o navegador bloquear a janela, permita pop-ups e clique em **Abrir documento para impressão**. A cópia já salva pode ser reaberta sem regenerar.
8. O histórico preserva rascunhos e emissões. Rascunhos permitem revisar o texto antes de emitir; documentos emitidos são cópias preservadas.

## Regras e preservação

- **Extraído por IA** não equivale a **Conferido pela equipe**. A IA não preenche uma declaração de conferência humana.
- A cotação aceita extração automática associada ao PDF atual e tecnicamente completa. Ambiguidades, informações essenciais ausentes e divergências bloqueiam, com mensagem resumida.
- Localização e vencimento ausentes ficam visíveis no documento, mas não impedem pedir uma cotação. Não há vencimento inventado nem alteração automática para três anos.
- Dados manuais são preservados. Campos anteriormente automáticos só podem ser atualizados automaticamente se ainda contiverem o mesmo valor salvo pela automação. Ausência de informação essencial no novo PDF não transforma valor automático antigo em evidência atual.
- PDFs são conferidos por hash antes e depois da leitura e novamente na geração/emissão. Edição concorrente do cadastro impede sobrescrita.
- Valores automáticos e campos do cadastro são gravados pela operação atômica existente, com strings para preservar zeros. U95, K, Veff e o motor metrológico não são alterados.
- A cópia anterior do cadastro/controle é preservada no arquivo privado da fila antes de gravar. Erros não removem registros nem PDFs.

## Implementação e retomada técnica

Arquivo novo: `SGO_Padroes_Automacao.js`. Alterados: `SGO_Padroes_Documentos.js`, `JS_Padroes_Documentos.html`, `SGO_Padroes_DocumentoHTML.js`, `SGO_CertCal_Main.js`.

Fila JSON privada no Drive, apontada por `PADROES_AUTOMACAO_JOB`. Lease de oito minutos, lock curto para assumir/salvar trabalho, checkpoint da extração antes de gravar os cadastros. Máximo de três retomadas de execução interrompida por grupo. Erros por grupo viram pendências; outros grupos continuam.

Trigger privado `PadAuto_tick_` a cada minuto enquanto houver trabalho, removido ao concluir. O navegador do gestor também pode processar etapas, com lease evitando simultaneidade. Se a instalação do trigger falhar, a tela orienta manter o portal aberto. [Referência oficial sobre triggers instaláveis](https://developers.google.com/apps-script/guides/triggers/installable).

A abertura inicial do módulo continua somente leitura. Não executa a automação sem acionamento autenticado de gestor. Cliente externo não acessa; iniciar/processar exigem `isAdminSession`. Não foi criado endpoint público para iniciar processamento sem autenticação.

## Validações

91 testes locais: 15 de automação, 19 de backend documental, 16 de interface, 9 de carregamento inicial, 10 de cabeçalho e 22 regressões do motor. Regressão inclui leitura dos 90 snapshots / 289 pontos existentes. Serviços Google, Drive e IA simulados nos testes; isso não comprova processamento dos PDFs reais.

Backup original em `backups/PADROES_AUTO_20260921/original`; remoto anterior, pacote e verificação em `backups/PADROES_AUTO_{REMOTE,STAGE,VERIFICADO}_20260921`.

**Pendente operacional:** iniciar o primeiro lote em sessão de gestor e verificar resultados reais. Tentativa de execução remota `clasp run CertCal_apiPing` foi recusada por permissão do Google. A autenticação disponível permite publicar código, mas não iniciar nem validar o lote por execução remota. Nenhum padrão real foi preenchido pelos testes locais.

**Publicado na versão 279**, substituindo 278 no deployment `AKfycbyNxaj-W9aNVM1OLECWdCBf_m_zlztXf4WZvckkp3E2N7n-_iFVTDnZt8quO69ZT8laRA`. Os 191 arquivos enviados foram conferidos por nova leitura remota; somente os cinco arquivos previstos mudaram. Manifesto e hashes em `backups/PADROES_AUTO_20260921/verificacao.json`.
