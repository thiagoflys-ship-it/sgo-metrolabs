# Timeout na abertura do Certificado de Calibração — 21/09/2026

## Relato e diagnóstico

Após publicar a versão 276, o usuário recebeu, somente ao entrar no módulo, uma exceção de tempo limite do serviço Planilhas ao acessar o banco do portal.

A inspeção encontrou quatro chamadas concorrentes de cadastro na abertura: técnicos, padrões ativos, todos os padrões e novo controle documental. As duas leituras antigas de padrões executavam bootstrap e repetiam a leitura da mesma tabela; a nova também tentava provisionar duas abas ao abrir a tela. Esse caminho acrescentava chamadas `SpreadsheetApp.openById`, verificações de schema e lock à abertura. Isso é uma causa de carga identificada no código; não foi obtido log remoto que atribua o timeout a uma linha específica.

## Correção

- Abertura com uma única chamada `apiListarControlePadroes`, retornando padrões, complemento documental e técnicos.
- Metadados das abas e leitura em lote pela API Sheets v4 já habilitada; sem `SpreadsheetApp`, lock, criação de aba ou formatação durante a abertura.
- Abas complementares ainda inexistentes são tratadas como cadastro complementar vazio. A tabela principal ausente gera mensagem de configuração, não uma falsa lista vazia.
- Provisionamento continua somente nos fluxos que precisam gravar/operar os novos documentos.
- Releituras após editar/inativar/cadastrar usam o mesmo carregamento unificado.
- Permissões de técnico preservadas: apenas seu próprio cadastro ativo; perfil CLIENTE continua bloqueado antes da leitura.
- Leitura não formatada preserva números e zeros em campos textuais. Vencimentos legados em serial são normalizados somente em memória.
- Fingerprint da edição considera os campos relevantes e a revisão documental; independe do formato de data de criação retornado por cada API.
- Mensagem amigável em caso de timeout, encerramento do carregamento e botão “Atualizar lista”, sem retries automáticos concorrentes.

## Testes

9 testes dedicados de carregamento, 18 de backend documental, 13 de interface e 22 regressões de calibração. Testes dedicados falham se a abertura tentar usar `SGO_DATA`/`SpreadsheetApp` ou adquirir lock. Teste DOM verifica exatamente uma chamada inicial e preenchimento do seletor de técnicos e das duas listas de padrões.

Os testes locais usam serviços simulados. Confirmar a abertura no navegador do usuário depois da atualização; uma indisponibilidade externa do Google não pode ser eliminada por essa alteração.

## Arquivos e cópias

Alterados: `SGO_Padroes_Documentos.js`, `JS_Padroes_Documentos.html` e o carregamento inicial embutido em `SGO_CertCal_ConteudoModulo.js`.

- Antes: `backups/PADROES_TIMEOUT_20260921/original`.
- Remoto anterior: `backups/PADROES_TIMEOUT_REMOTE_20260921`.
- Pacote: `backups/PADROES_TIMEOUT_STAGE_20260921`.
- Teste específico: `_tools/test_timeout_padroes_20260921.js`.

**Publicado na versão 277**, no mesmo deployment do portal: `AKfycbyNxaj-W9aNVM1OLECWdCBf_m_zlztXf4WZvckkp3E2N7n-_iFVTDnZt8quO69ZT8laRA`.

Cópia pós-envio em `backups/PADROES_TIMEOUT_VERIFICADO_20260921`: os 190 arquivos conferem com o pacote e somente os três arquivos previstos diferem da versão anterior. Resultado e hashes em `backups/PADROES_TIMEOUT_20260921/verificacao.json`. Nenhum cadastro real foi alterado durante estes testes.

Retomada: atualizar a página com Ctrl+F5 e confirmar a abertura autenticada no navegador do usuário. O teste local não substitui essa confirmação. Reversão para 276 reintroduz o caminho de carregamento anterior; não é recomendada como solução do timeout.

Referências técnicas: [leitura em lote da API Sheets](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/batchGet) e [seleção de metadados por máscara de campos](https://developers.google.com/workspace/sheets/api/guides/field-masks), conferidas na documentação oficial.
