# Publicação solicitada — bloqueio de tamanho e escopo

RESOLVIDO: autorização adicional recebida; pacote final enviado, verificado e publicado na versão300 no mesmo link. Conferir `PUBLICACAO_CALIBRACAO_V300.md`. O conteúdo abaixo registra o bloqueio anterior, não o estado atual.

Usuário autorizou publicar CertCal no link existente para uso/testes da equipe em 09/10/2026.

Consulta Google confirmou produção versão 299. Backup fresco dos 196 arquivos em `backups/CERTCAL_AUDITORIA_PRE_DEPLOY_20261008`. Pacote isolado em `tmp/CERTCAL_AUDITORIA_DEPLOY_20261008`; manifesto `tmp/CERTCAL_AUDITORIA_DEPLOY_MANIFEST_20261008.json`.

Os quinze arquivos de testes passaram no código local e no pacote com minificação de sete arquivos CertCal sem compressão de operações nem renomeação. Duas tentativas de clasp push, SEM --force, foram recusadas pelo Google: "The project is too large to save. Please limit the size of your project." Nenhuma versão/deployment nova foi criada.

Foi preparado ajuste técnico no pacote: o logo de 999184 caracteres idêntico em quatro Configs passa a uma função em `SGO_Documento_LogoCompartilhado.js`. Arquivos: SGO_AutoRel_Config.js, SGO_CadeiaFrioRel_Config.js, SGO_EstufaBanhoRel_Config.js e SGO_LavRel_Config.js. Cada configuração original e ajustada foi executada em VM, com comparação JSON de todos os valores globais, incluindo logo e assinaturas: igualdade verificada. Economia estimada: 2997552 caracteres. O código local dos quatro módulos não foi alterado; somente o pacote preparado.

O auto-review recusou o push desse pacote por ampliar o escopo para quatro configurações compartilhadas e novo arquivo global. NÃO contornar. Foi solicitada autorização explícita ao usuário para essa inclusão técnica. Produção segue 299. Após resposta, atualizar somente se autorizada; conferir testes/configuração, enviar, baixar e verificar hashes, criar versão e atualizar o mesmo deployment, verificar link. Não usar o pacote inicial sem logo compartilhado: ele excede o limite.

Deployment: AKfycbyNxaj-W9aNVM1OLECWdCBf_m_zlztXf4WZvckkp3E2N7n-_iFVTDnZt8quO69ZT8laRA. Retorno possível à versão299. Não alterar vínculos dos nove equipamentos divergentes nem históricos.
