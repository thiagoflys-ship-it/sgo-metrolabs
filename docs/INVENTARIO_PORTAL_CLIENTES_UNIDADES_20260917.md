# Inventário e ponto de retomada — Portal SGO+ / Clientes e Unidades

> Atualização de 21/09/2026: o portal passou à **versão 276**, com acréscimos de controle documental dos padrões no Certificado de Calibração. Os recursos de clientes/unidades deste inventário foram preservados. Consulte [entrega, testes e retomada dos padrões](PADROES_INVENTARIO_ORCAMENTO_20260921.md). As referências à versão 275 abaixo registram o encerramento histórico de 17/09.

## Situação no encerramento

- **Produção confirmada na versão 275**, por consulta de deployments ao encerrar esta sessão.
- Usuário informou que autorizará a equipe a usar amanhã. Essa intenção não significa que a equipe já validou o fluxo.
- Funcionalidades publicadas e testes automatizados aprovados. Validação operacional autenticada pela equipe ainda pendente.
- Nenhuma transferência/exclusão de cadastro real foi feita nesta implementação de vínculos/interface. O saneamento anterior de CNPJ tem registro separado.

## Projeto e endereços

- Projeto Apps Script: `1WZ0tuqy1C2W7E-FDgT8hn9861UNoeU7S8RF6-yYj7IajUIOHrXDSaSU9`.
- Banco: `1Ny2wiUrzqa8i3IirgEaW11ZZe_IFH9cs1kpXkxu3VzM`.
- Fonte local: `apps-script-imports/portal_sgo_versao_cnpj_db`.
- [Portal em produção](https://script.google.com/macros/s/AKfycbyNxaj-W9aNVM1OLECWdCBf_m_zlztXf4WZvckkp3E2N7n-_iFVTDnZt8quO69ZT8laRA/exec).
- [DEV](https://script.google.com/macros/s/AKfycbyWt7ZTH1YcOTeX6vL3UIX6BFuqbCLvaAD4KUG7BE-x/dev), restrito a editores Google. Usa o mesmo banco; não é uma base isolada de testes.
- O `.clasp.json` da raiz do workspace é de outro projeto. Usar a configuração do portal ou da cópia preparada correspondente.

## Histórico das entregas

| Versão | Conteúdo |
| --- | --- |
| 273 | Correção de CNPJ com zero inicial, bloqueios de duplicidade e integrações. |
| 274 | Consulta de vínculos, unidade principal automática, painel do gestor, transferência/desvinculação/consolidação, auditoria e validações compartilhadas. |
| **275 — atual** | Busca lateral com cartões, manual dentro das telas, adaptação mobile e avisos de carregamento. |

## Inventário funcional

- Clientes: criar com unidade principal automática ou somente agrupador; consultar e editar dados.
- Unidades: criar sob um cliente, localizar estabelecimento já cadastrado e mostrar seu responsável.
- Consulta: nome/CNPJ, resultados agrupados, situação, acesso ao cadastro e aos vínculos; respostas antigas descartadas e formulário preservado durante a busca.
- Gestor/Admin/Diretoria: transferir, vincular novamente, desvincular, consolidar duplicados, inativar, reativar e excluir cadastros livres de dependências.
- Alterações do painel: motivo, prévia de impacto, verificação de concorrência, proteção contra confirmação repetida e auditoria `SYS_VINCULOS_AUDITORIA`.
- IDs e QR tokens preservados. Documentos históricos mantêm o proprietário original; consultas de usuários CLIENTE filtram o histórico pelo proprietário.
- Clientes, Unidades, Equipamentos, Documentos, Inventário, Certificado de Calibração, NR-13 e Auvo integrados conforme as regras documentadas.
- Botão **Como usar** em Clientes, Unidades e painel do gestor; seis tópicos operacionais.

## Arquivos e referências para retomar

| Referência | Conteúdo |
| --- | --- |
| [Correção de CNPJ](CORRECAO_CNPJ_CADASTROS_20260916.md) | Histórico do problema HSCOR, saneamento e pendências anteriores. |
| [Estudo de vínculos](ESTUDO_CLIENTES_UNIDADES_VINCULOS_20260917.md) | Diagnóstico do caso Pinto de Azevedo e proposta aprovada. |
| [Implementação](IMPLEMENTACAO_VINCULOS_CLIENTES_UNIDADES_20260917.md) | Backend, integrações, auditoria, testes, limitações e cópias. |
| [Interface e publicação 275](UX_CLIENTES_UNIDADES_20260917.md) | Busca lateral, manual, carregamento e validação visual local. |
| [Manual operacional](MANUAL_CLIENTES_UNIDADES_VINCULOS.md) | Procedimentos para a equipe. |

Arquivos centrais: `SGO_Vinculos.js`, `JS_Vinculos.html`, `SGO_Data.js`, `JS_Cadastros.html` e `JS_Core.html`. Integrações também alteradas em `Index.html`, `JS_Admin.html`, `JS_Equipamentos.html`, `SGO_Clientes.js`, `SGO_Unidades.js`, `SGO_Equipamentos.js`, `SGO_Documentos.js`, `SGO_Inventario_Main.js`, `SGO_CertCal_Main.js`, `SGO_NR13_Main.js`, `SGO_Auvo_Incremental.js`, `SGO_Auvo_Reverso.js` e `appsscript.json` (serviço Sheets v4; mesmos escopos OAuth).

## Testes e limites

- Vínculos: 39 testes de backend e 6 de handlers no pacote de vínculos.
- Interface final: 13 testes DOM com scripts reais e respostas Google simuladas.
- Regressões: CNPJ/sintaxe, calibração (22 testes e 90 snapshots locais), frota (18 verificações) e relatório Auvo.
- Layout desktop renderizado e inspecionado em navegador local com perfil isolado.
- Publicação 275 confirmada por deployment; HTTP 200 com presença do manual e da busca lateral.
- Não houve confirmação de escrita real com sessão de gestor. DEV exigiu login Google; execução por `clasp run` não foi permitida. Não confundir esses limites com testes operacionais aprovados.

Scripts: `_tools/test_vinculos_20260917.js`, `_tools/test_ui_vinculos_20260917.js`, `_tools/test_regressao_vinculos_20260917.js`, `_tools/test_ux_cadastros_20260917.js`, `_tools/test_certcal_20260913.js` e `_tools/test_frota_20260913.js`. Os primeiros testes apontam para o stage de vínculos; o teste UX aponta para a fonte local e usa jsdom isolado em `backups/UX_TEST_DEPS`. Conferir os caminhos ao testar mudanças futuras.

## Cópias e recuperação

- **Cópia de encerramento:** `backups/ENCERRAMENTO_PORTAL_V275_20260917`, com o pacote publicado, documentação, scripts de teste e inventário SHA-256 dos arquivos. Dependências de teste e snapshots históricos continuam nas localizações referenciadas pelos testes.

- `backups/VINCULOS_REMOTE_20260917`: base anterior ao painel.
- `backups/VINCULOS_STAGE_20260917`: pacote de vínculos, anterior à nova interface.
- `backups/UX_CADASTROS_REMOTE_20260917`: base remota anterior à versão 275.
- `backups/UX_CADASTROS_ANTES_20260917`: três arquivos locais antes da interface nova.
- **`backups/UX_CADASTROS_STAGE_20260917`: pacote completo usado na publicação 275.**
- Scripts de transformação `_tools/aplicar_ux_*`, `_tools/integrar_*` e refinamentos são registros da implementação, não rotinas idempotentes; não executar novamente sem revisar.
- Há fontes/testes/backups ignorados pelo Git. Este encerramento salva em disco e registra o deployment; não foi criado commit nem feito push Git.
- Para reversão somente da interface, o mesmo deployment pode voltar à versão 274. Reverter código não desfaz dados que usuários tenham alterado.

## Próxima retomada

1. Ler este inventário e confirmar a versão remota antes de editar/publicar.
2. Recolher o retorno da equipe sobre busca, edição, manual, criação da unidade principal e painel de gestão.
3. Confirmar com perfil gestor a prévia/auditoria e a gravação autorizada, preservando os registros reais e seus históricos.
4. Decidir o proprietário correto da unidade **44.649.812/0370-58**, Pinto de Azevedo. Esta entrega não tomou essa decisão. IDs e alternativas estão no estudo e na implementação.
5. Prosseguir no saneamento de unidades ambíguas, vínculos e TAGs repetidas conforme o relatório de CNPJ, sem exclusões automáticas por semelhança de nome.

O projeto futuro de gestão operacional, agenda, compras e recebimento/manutenção/devolução de equipamentos continua **somente planejado**, conforme [pendências](PENDENCIAS_PROJETO.md). O inventário FIN Flash V2 é de outro trabalho e permanece separado.
