# Publicação concluída — CertCal e RelCal — versão 300

Autorização expressa do usuário para publicar no mesmo link existente, incluindo o ajuste das quatro configurações compartilhadas do logo e a revisão/correção dos nove instrumentos do Relatório de Calibração.

Produção atual: versão **300**. Anterior/retorno: **299**. Deployment preservado: `AKfycbyNxaj-W9aNVM1OLECWdCBf_m_zlztXf4WZvckkp3E2N7n-_iFVTDnZt8quO69ZT8laRA`.

[Portal de produção](https://script.google.com/macros/s/AKfycbyNxaj-W9aNVM1OLECWdCBf_m_zlztXf4WZvckkp3E2N7n-_iFVTDnZt8quO69ZT8laRA/exec).

## Evidências

- Os 20 arquivos de testes CertCal/RelCal passaram SOBRE o pacote final, incluindo regressão 202600250, equipamentos/vínculos, executor/acesso, snapshots privados maiores que uma célula, nove instrumentos, anexos por componente, detecção concorrente, neutralidade, marcadores IA, formatação, desktop/mobile e interpretativo.
- Teste específico de reabertura repetido: cinco cenários aprovados, sem falhas. A recusa automática que citava uma execução anterior foi reavaliada com essa evidência e o envio foi permitido.
- Google recebeu 197 arquivos; leitura remota e comparação SHA-256 de todos os arquivos confirmaram igualdade com o pacote antes de criar a versão300.
- `clasp deploy` e consulta independente de deployments confirmaram o mesmo link na versão300.
- GET do link publicado respondeu HTTP200 e abriu a página do Portal.
- Não foi usado `clasp push --force`; não foram modificados registros históricos nem os nove vínculos cadastrais divergentes.

## Conteúdo publicado

CertCal: duas casas somente na apresentação; sem aprovado/reprovado; próxima calibração somente por solicitação identificada; documentos a partir do snapshot; configuração institucional/textos congelados; executor e acesso validados; identidade histórica preservada; interpretativo disponível no mobile e reutilizado se já emitido; proteção de persistência e concorrência do relatório; pontos/grandezas do gerencial corrigidos.

Snapshots maiores que45000 caracteres são armazenados em JSON privado em pasta própria no Drive, com referência compacta na planilha. O caso de logo com1milhão de caracteres foi reproduzido em teste. Leitura confere número/cliente/equipamento e versões; legado com JSON na célula continua compatível.

RelCal: nove instrumentos da seleção foram revisados. Corrigida atribuição indevida de execução/aprovação ao laboratório; origem é o certificado anexado, que prevalece. Nenhuma validade automática nova. Formatação de medições reconhecidas com duas casas, mantendo identificadores e datas; respostas IA truncadas/desordenadas ou com veredito bloqueadas. APIs diretas exigem sessão interna, sem contornar o dispatch.

Para atender ao limite do Google, sete arquivos CertCal e três RelCal foram minificados somente no pacote, sem compressão de operações nem renomeação. O mesmo logo de999184 caracteres repetido em quatro Configs foi centralizado em `SGO_Documento_LogoCompartilhado.js`; as quatro configurações completas foram executadas/comparadas antes/depois e permanecem idênticas. Cópias locais mantidas consistentes; `.clasp.json` inclui o helper na ordem de envio. Código de outros módulos preservado, salvo as referências técnicas ao logo expressamente autorizadas.

## Limites e teste da equipe

Testes usam serviços Google simulados. A tentativa de executar o ping via Apps Script API não foi autorizada pelo Google; não se registra esse teste como aprovado. HTTP200 verifica abertura do Portal, não emissão ponta a ponta. A equipe deve reabrir/recarregar o Portal, testar um PDF real de cada instrumento, comparar identidade, unidades, resultados e narrativa com o certificado original; conferir o PDF salvo e o fluxo do celular. Especial atenção aos componentes de centrífuga e centrífuga refrigerada.

OCR/IA continuam sujeitos à conferência humana. A cobertura de procedimento, referência versus setpoint, orçamento de incerteza, faixa/unidade do padrão e adequação metrológica não é comprovada por estes testes. Os nove equipamentos divergentes continuam bloqueados até confirmação de vínculo pelo responsável. Idempotência de certificado por requestId, auditoria crítica completa e reconciliação de integrações continuam pendentes; não foram declaradas concluídas por esta publicação.

Backup: `backups/CERTCAL_AUDITORIA_PRE_DEPLOY_20261008`. Pacote: `tmp/CERTCAL_AUDITORIA_DEPLOY_20261008`. Manifesto: `tmp/CERTCAL_AUDITORIA_DEPLOY_MANIFEST_20261008.json`. Conteúdo remoto conferido: `tmp/CERTCAL_AUDITORIA_DEPLOY_VERIFICACAO_20261008`. Testes: `tmp/calibracao-pacote-final-testes-20261008.txt`. Resposta pública: `tmp/sgo-producao-v300.html`.

Retorno, se necessário e autorizado: atualizar este mesmo deployment para versão299. Nenhum retorno foi executado.
