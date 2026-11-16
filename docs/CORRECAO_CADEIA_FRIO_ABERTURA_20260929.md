# Abertura de Cadeia de Frio — 29/09/2026

A versão 292 continha o conteúdo do formulário, mas não a função pública `CadeiaFrioRel_obterConteudoModulo` chamada pelo carregador. A ferramenta de atualização de datas havia regravado a variável de conteúdo sem preservar essa função. O erro síncrono no cliente não era capturado, deixando a mensagem de carregamento.

Restaurado o ponto de entrada, preservando integralmente o conteúdo do formulário e as correções de datas. Corrigida também a ferramenta de atualização para preservar a função em futuras execuções.

O carregador agora trata falhas síncronas e assíncronas, oferece nova tentativa após erro ou 45 segundos sem resposta, evita requisições duplicadas e ignora respostas de tentativas expiradas. Mensagens de erro são inseridas como texto.

Validação local: teste integrado do ponto de entrada, carregador, formulário e configuração com transporte Google simulado; abertura, reabertura, perfis, sensores, importação por sensor, clique duplo, falhas, timeout e resposta antiga. Os 23 testes de datas também passaram. O teste local não equivale a uma sessão autenticada real no portal.

Publicação e cópias antes/depois registradas em `backups/CADEIA_FRIO_ABERTURA_20260929/`. O publicador preserva os demais arquivos e o identificador da implantação existente.
