# Auditoria cruzada dos três módulos — 09/10/2026

ATUALIZAÇÃO 12/10/2026: correções publicadas na versão **301** no mesmo link. Nova leitura de 197 arquivos sem divergências, deployment confirmado e HTTP 200. Nenhuma versão histórica excluída nesta sessão. Registro definitivo: [PUBLICACAO_TRES_MODULOS_V301_20261012.md](PUBLICACAO_TRES_MODULOS_V301_20261012.md). As notas de bloqueio abaixo descrevem a situação anterior.

Escopo ampliado expressamente pelo usuário: Relatório de Qualificação (QI/QO/QD), Relatório de Calibração e Certificado de Calibração. Três agentes revisaram os módulos; o agente principal integrou, conferiu o pacote e preparou publicação seletiva. A produção anterior é a versão 300, no link existente.

## Mapa e resultado

| Módulo | Origem dos dados | Fluxo conferido | Correções desta rodada |
| --- | --- | --- | --- |
| Certificado de Calibração | Cadastro, padrões e medições | Menu → tela desktop/mobile → API → motor → snapshot → certificado/interpretativo → histórico | Falhas auxiliares de auditoria/Inventário/Auvo passam a retornar avisos, preservando o sucesso de emissão já salva; avisos nas duas interfaces; descrição correta do interpretativo determinístico |
| Relatório de Calibração | Certificados anexados por componente | Nove instrumentos → anexos/detecção → interpretação → HTML → PDF/Drive | Instrumento do salvamento congelado no payload original; duas casas estendidas à prosa de medições reconhecidas; vereditos bloqueados também em fotos; três referências sanitárias desatualizadas corrigidas com fontes oficiais |
| Relatório de Qualificação | Checklists, fotos e certificados QD | Quinze perfis → rascunho → conferência → montagem → PDF/Drive | Sessão interna nas APIs QIQO e persistência; hash/contexto da leitura vinculado ao anexo; duplicados/desconhecidos e leitura ausente/falha rejeitados; sem vereditos automáticos em narrativa/fotos/observações; duas casas em medições reconhecidas; removida equivalência indevida entre calibração de componentes e desempenho completo |

`SGO_DATA.log` agora informa sucesso/falha por booleano, mantendo o comportamento de não lançar exceção. Isso permite mostrar pendências reais após emissão. A alteração compartilhada foi verificada com a implementação real em ambiente simulado; nenhum chamador anterior depende do retorno vazio.

Detalhes dos agentes: [CertCal](CERTCAL_REAUDITORIA_20261009.md), [RelCal](MAPA_RELCAL_REAUDITORIA_20261009.md), [QI/QO/QD](MAPA_QIQO_REAUDITORIA_20261009.md).

## Validação do pacote

- 24 arquivos de testes passaram sobre o pacote final preparado para o Google, incluindo os códigos minificados.
- Integração dos três menus, loaders, getters e todas as ações usadas pelos frontends: seis QIQO, seis RelCal e 33 CertCal. Ações inexistentes/sessões inválidas rejeitadas.
- QIQO percorre os 15 perfis reais com contexto, leitura e montagem; testes incluem anexos trocados, desconhecidos/duplicados, leitura ausente e ramos opcionais.
- RelCal cobre os nove instrumentos, componentes das centrífugas, respostas de detecção atrasadas e troca de instrumento durante geração.
- CertCal preserva regressão 202600250, precisão interna, documentos/snapshots, privacidade, permissões, persistência parcial e 400 cadastros anonimizados da auditoria anterior: 391 coerentes e nove divergentes bloqueados.
- Testes Google/IA usam simulações. Não foram emitidos documentos oficiais sintéticos nem modificados cadastros reais.

Evidência: `tmp/tres-modulos-testes-stage-20261009.txt`. Manifesto: `tmp/TRES_MODULOS_MANIFEST_20261009.json`. Backup remoto: `backups/TRES_MODULOS_PRE_DEPLOY_20261009`. Pacote: `tmp/TRES_MODULOS_DEPLOY_20261009`.

## Publicação

Pacote preparado com 197 arquivos, dos quais somente 11 diferem do backup remoto. Preservadas as alterações remotas dos demais módulos e as alterações locais não relacionadas. O trecho mobile de CertCal foi integrado seletivamente em JS_Core; não foi enviado todo o JS_Core local.

Envio de código concluído: `clasp push` recebeu 197 arquivos. Nova leitura em `tmp/TRES_MODULOS_VERIFICACAO_20261009` confirmou todos os hashes, sem divergência (evidência `tmp/tres-modulos-verificacao-20261009.json`).

A criação da versão foi bloqueada pelo Google: “Cannot create more versions: Script has reached the limit of 200 versions.” O deployment de produção continua na versão 300; as novas correções estão no código HEAD, ainda não no link versionado de produção. Nenhuma versão histórica foi excluída.

Solicitada autorização ao usuário para excluir somente a versão 122, descrita “diag temporario 4 - nao usar”, não associada a nenhum dos quatro deployments listados. Preservar versões 1, 199, 299 e 300, bem como os deployments existentes. Antes de qualquer exclusão, salvar backup do conteúdo da versão 122 em `backups/SGO_V122_DIAGNOSTICO_20261009`. A autorização para exclusão histórica permanece pendente; não tratar ausência de resposta como autorização.

## Limites que permanecem

OCR e redação IA exigem comparação com documentos originais. Os normalizadores formatam medições reconhecíveis; não alteram indiscriminadamente todos os números, pois isso corromperia IDs, datas e normas. Medições ambíguas ou sem unidade requerem conferência. O CertCal mantém resultados estruturados e precisão interna.

Uma calibração de componentes não comprova por si só qualificação completa de desempenho. A aceitação para uso permanece com a qualidade do cliente, conforme solicitado. Procedimentos, orçamento de incerteza e adequação física dos padrões necessitam validação metrológica responsável.

Os nove vínculos cadastrais divergentes não foram alterados. Idempotência por requestId, reconciliação automática e revisão formal completa continuam pendentes. A emissão ponta a ponta com serviços Google, permissões e PDFs reais deve ser homologada pela equipe; abertura do Portal e testes simulados não comprovam esse percurso.
