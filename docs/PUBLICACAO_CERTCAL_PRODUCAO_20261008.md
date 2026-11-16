# Publicação das correções de calibração — 08/10/2026

Publicação autorizada explicitamente pelo usuário: “faça as correções e publique em produção agora no link que já existe para o pessoal usar”.

Projeto: `1WZ0tuqy1C2W7E-FDgT8hn9861UNoeU7S8RF6-yYj7IajUIOHrXDSaSU9`.

Deployment existente: `AKfycbyNxaj-W9aNVM1OLECWdCBf_m_zlztXf4WZvckkp3E2N7n-_iFVTDnZt8quO69ZT8laRA`.

[Link de produção preservado](https://script.google.com/macros/s/AKfycbyNxaj-W9aNVM1OLECWdCBf_m_zlztXf4WZvckkp3E2N7n-_iFVTDnZt8quO69ZT8laRA/exec).

Versão anterior: **298**. Versão publicada: **299**. Consulta após a publicação confirmou o mesmo deployment em 299; o link respondeu HTTP 200.

## Pacote publicado

Backup atualizado de 196 arquivos salvo em `backups/CERTCAL_PRE_PRODUCAO_20261008`.

O pacote foi construído a partir do backup remoto, incluindo somente os 13 arquivos `SGO_CertCal_*` e `SGO_RelCal_*` revisados e um ajuste localizado do fluxo mobile de calibração em `JS_Core.html`. Os outros arquivos remotos foram preservados; alterações locais preexistentes de Admin e Conduta não foram incluídas.

Stage: `tmp/CERTCAL_PRODUCAO_STAGE_20261008`. Manifesto SHA-256: `tmp/CERTCAL_PRODUCAO_MANIFEST_20261008.json`. Uma cópia do conteúdo remoto após o push foi baixada em `tmp/CERTCAL_PRODUCAO_VERIFICACAO_20261008`; os 196 arquivos corresponderam ao manifesto antes da criação da versão e do deploy.

Scripts reproduzíveis: `_tools/preparar_certcal_producao_20261008.cjs` e `_tools/verificar_certcal_producao_20261008.cjs`.

## Verificações

- Motor e cenários dos nove instrumentos: 19 testes passaram.
- Regressões de documentos e interface passaram.
- Vínculos de certificados por componente e descarte de detecção assíncrona antiga passaram.
- Sintaxe dos arquivos do pacote e scripts embutidos de CertCal/RelCal validada.
- Deploy confirmado por `clasp deployments` em versão 299.
- GET do link público após deploy: HTTP 200.

As correções incluem apresentação com duas casas e vírgula, retirada do veredito, cálculo/validação/validade revisados, interpretativo nativo derivado do snapshot, reconhecimento dos nove instrumentos no RelCal e aviso de escopo parcial.

## Limites preservados

Não houve emissão de certificados reais nem conferência visual de PDFs gerados pelo Apps Script nesta sessão: a execução via API foi recusada e não há navegador conectado. A publicação foi realizada pela autorização explícita do usuário, com testes locais e conferência do código enviado. A leitura de certificados externos por IA ainda requer conferência técnica. Os PDFs históricos não foram substituídos e a necessidade de revisão dos 15 certificados históricos descrita nas auditorias permanece.

Para retorno à versão anterior, usar o mesmo deployment e versão 298. Essa ação não foi executada.
