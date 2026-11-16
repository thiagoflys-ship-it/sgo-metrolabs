# Retomada após reinício — 08/10/2026

ATUALIZAÇÃO MAIS RECENTE: usuário autorizou produção e ajuste do logo compartilhado, além da revisão RelCal. Publicação CONCLUÍDA na versão300 no mesmo link, confirmada por deployments e HTTP200. Vinte arquivos de testes do pacote aprovados e197hashes remotos conferidos. Detalhes em `docs/PUBLICACAO_CALIBRACAO_V300.md`. As notas de "somente local/produção299" abaixo descrevem etapas anteriores e não o estado atual. Snapshots>45k são JSON privado Drive; quatro Configs compartilham logo idêntico; RelCal corrigido em Main/IA/Documento para nove instrumentos e APIs autenticadas. Permanecem pendências metrológicas humanas, nove vínculos inconsistentes, idempotência de certificado e auditoria crítica completa.

Usuário solicitou salvar a sessão para reiniciar o computador.

## Escopo confirmado

Somente o módulo Certificado de Calibração do SGO+, incluindo motor, certificado, relatório interpretativo e emissão desktop/mobile. A proposta de reestruturação global foi restringida explicitamente pelo usuário; NÃO implementar mudanças nos demais módulos.

Projeto: `apps-script-imports/portal_sgo_versao_cnpj_db`. O arquivo ativo do IDE em METROLABS_SGRH_360 é de outro projeto.

## Trabalho já salvo

- Retirada da validade automática de 12 meses para novos certificados.
- Próxima calibração padrão NÃO; SIM exige data, solicitante, cargo/setor e referência, com ator/hora registrados no servidor.
- Certificado e interpretativo usam o mesmo snapshot, apresentam K e identidade completa, números com duas casas decimais e nenhuma aprovação/reprovação automática.
- Memória de componentes de incerteza preserva precisão interna e explicita limitações do modelo.
- Testes desktop/mobile, motor, documentos e regressão real 202600250 passaram: nove arquivos `tests/certcal*.test.cjs`. Evidência: `tmp/certcal-evolucao-testes-20261008.txt`.
- Quatro exemplos sintéticos em `output/pdf/certcal-evolucao-20261008/`.
- Diagnóstico e entregáveis: `docs/HOMOLOGACAO_CERTCAL_EVOLUCAO_20261008.md`.
- Caso real: `tests/fixtures/certcal-202600250.json`, com cinco pontos RPM e quatro pontos de tempo. Snapshot original somente lido em CERT_CALIBRACAO!K251. Incerteza original do cronômetro 0,122 s, apresentada 0,12 s; não alterar o motor para coincidir com somas de parcelas arredondadas.

## Estado de publicação

Correções anteriores foram publicadas na versão 299, antes da nova evolução. A evolução descrita acima está LOCAL, não publicada nem homologada em /dev. Não alterar produção sem homologação e autorização expressa.

Script ID: `1WZ0tuqy1C2W7E-FDgT8hn9861UNoeU7S8RF6-yYj7IajUIOHrXDSaSU9`.

Deployment existente: `AKfycbyNxaj-W9aNVM1OLECWdCBf_m_zlztXf4WZvckkp3E2N7n-_iFVTDnZt8quO69ZT8laRA`.

Não executar `clasp push --force`. Há alterações locais de outros trabalhos em JS_Admin, JS_Core, Conduta e GestãoRelatórios; preservar e montar pacote seletivo a partir de baseline remoto antes de qualquer upload. Backups prévios em `backups/CERTCAL_EVOLUCAO_BASE_PROD299_20261008` e outros diretórios CERTCAL.

## Pendências para continuar

1. Adaptar as diretrizes do último anexo SOMENTE a CertCal. Anexo: `C:/Users/venda/.codex/attachments/1fc5e8fd-acf3-4369-8c9f-7cb806b6bf7f/Texto colado.txt`. O usuário restringiu explicitamente sua abrangência global.
2. Atualizar os literais de próxima calibração para os textos mais recentes desse anexo; os exemplos existentes usam os textos do pedido anterior.
3. Implementar progressivamente validação/versionamento/auditoria documental focados no módulo, preservando numeração, históricos, integração e templates específicos. Identidade/logo/signatários devem ficar congelados na emissão; imagem de assinatura não comprova revisão autenticada.
4. Verificar idempotência e falhas parciais de PDF, registro e auditoria; SGO_DATA.log genérico suprime erros. Não declarar emissão concluída sem artefato/registro confiáveis.
5. Reexecutar testes relevantes, regenerar PDFs sintéticos e validar no /dev com pacote isolado. Testes locais não equivalem a validação operacional Google.
6. Validar com responsável técnico a origem das referências (padrão versus setpoint), completude do orçamento, distribuições, correlações, sensibilidade e probabilidade 95,45%. Não inventar aprovação técnica nem alterar históricos.

Diagnóstico global já escrito em `docs/ARQUITETURA_DOCUMENTAL_SGO_DIAGNOSTICO_20261008.md`, mas serve apenas como referência: não é autorização para alterar outros módulos. Inventário estático: `docs/INVENTARIO_GERADORES_SGO_20261008.json`.

## Comunicação

Atualização após retomada em 08/10/2026: os dois literais do último anexo foram aplicados em SGO_CertCal_Config.js. Os nove arquivos de testes CertCal passaram novamente; evidência em tmp/certcal-retomada-testes-20261008.txt. Inventário restrito, proposta estrutural e riscos estão em docs/ARQUITETURA_CERTCAL_RETOMADA_20261008.md. Validação/versionamento/auditoria transacional, PDFs novos e homologação Google permanecem pendentes; nenhuma publicação realizada.

Não havia execução em andamento após a confirmação de escopo; isso foi esclarecido ao usuário. Este arquivo registra o estado real para retomada. Nenhum commit ou deployment foi feito nesta operação de salvamento.

## Atualização — 08/10/2026 (retomada)

- Pendência 2 CONCLUÍDA: os dois textos do certificado (CERTCAL_CFG.PROXIMA_CALIBRACAO_SEM_DATA / _COM_DATA) já eram idênticos ao anexo. Faltavam a pergunta e as opções do formulário, agora atualizadas no desktop (`SGO_CertCal_ConteudoModulo.js`) e no mobile (`JS_Core.html`, só a linha do select): "O cliente solicitou a inclusão da data de próxima calibração?" / "Não — emissão sem data (seleção padrão)." / "Sim — incluir data informada pelo cliente."
- Backup antes da edição: `backups/CERTCAL_TEXTOS_PROXIMA_20261008`.
- Sintaxe ok; os nove `tests/certcal*.test.cjs` passaram. Continua LOCAL, sem publicação.
- Próxima: pendência 4 (idempotência e falhas parciais de PDF/registro/auditoria).

## Atualização — proteção da emissão e snapshot institucional

- Novas emissões capturam `ctx.documento`: versão de schema/template/textos, emissor autenticado, hora do servidor, empresa, logo, signatários configurados e textos técnicos. Certificado e interpretativo usam a configuração congelada, mesmo se Config mudar. Isso não inventa revisão autenticada ou assinatura digital. Históricos continuam compatíveis, sem gravação retroativa de metadados.
- PDF do certificado fica privado até persistência. Falha de persistência tenta confirmar escrita já concluída; se não confirmada, descarta o arquivo privado, com erro explícito se limpeza falhar. Falha de compartilhamento preserva registro/arquivo para recuperação.
- Interpretativo com link existente é reutilizado, sem novas chamadas IA/PDF. Conferência sob lock antes da gravação evita sobrescrever a primeira emissão em concorrência. Número do snapshot divergente do registro bloqueia geração nova.
- Suite completa: onze arquivos `tests/certcal*.test.cjs` passaram. Novos testes: `certcal-snapshot-documental.test.cjs` e `certcal-emissao-parcial.test.cjs`. Evidência: `tmp/certcal-retomada-protecao-testes-20261008.txt`.
- Os quatro PDFs sintéticos foram atualizados com os textos atuais e snapshot institucional. Renderização e extração sem blocos fora da página; próximo prazo aparece somente nos cenários SIM.
- PENDENTES: idempotência da emissão de certificado via requestId e estados persistentes, auditoria crítica com confirmação de escrita, revisão formal completa, preparação do pacote isolado e validação Google /dev. Drive/Sheets ainda não têm transação atômica; um encerramento abrupto entre operações exige reconciliação. Nenhum upload/deployment ou alteração de históricos realizado.

## Auditoria cruzada solicitada com agente

Relatório: `docs/AUDITORIA_CRUZADA_CERTCAL_20261008.md`. Base real lida: 400 equipamentos ativos, 45 clientes, 51 unidades, 105 padrões (89 ativos). Nove equipamentos nas linhas 25–33 CAD_EQUIPAMENTOS têm cliente/unidade divergentes; nenhuma alteração cadastral realizada. Teste com grafo anonimizado passa 391 contextos e bloqueia os nove. Correções: isolamento de documentos/equipamentos por cliente, executor obrigatório válido, catálogo exclusivo CertCal de executores para equipe, TAG/tipo históricos do snapshot, bloqueio de número divergente na reabertura, contagem gerencial dos resultados e reconhecimento de Tempo/Massa/Manômetro. Mobile agora gera interpretativo do certificado emitido. Quinze arquivos de testes aprovados, evidência `tmp/certcal-auditoria-cruzada-testes-20261008.txt`. Validação Google /dev, compatibilidade metrológica de padrão/faixa/unidade, idempotência, auditoria crítica e reconciliação das integrações permanecem pendentes. Tudo local; produção inalterada nesta auditoria.
