# Retomada e proposta documental — CertCal — 08/10/2026

Escopo recuperado de RETOMADA_CERTCAL_20261008.md: somente certificado de calibração e seu relatório interpretativo no portal_sgo_versao_cnpj_db. O anexo global foi expressamente restringido pelo usuário.

## Inventário do fluxo existente

- SGO_CertCal_Main.js: contexto, numeração, emissão, persistência e reabertura. CertCal_apiGerarCertificado cria PDF, grava CERT_CALIBRACAO e registra no catálogo SGO_DOCUMENTOS. CertCal_apiGerarRelatorioInterpretativo lê DADOS_JSON, gera conteúdo interpretativo e salva outro PDF.
- SGO_CertCal_Calculo.js: motor de resultados. O relatório deve consumir os resultados salvos, sem recalcular independentemente.
- SGO_CertCal_Documento.js: templates distintos de certificado e interpretativo, com próxima calibração compartilhada.
- SGO_CertCal_Config.js: textos técnicos. SGO_CertCal_IA.js: interpretação e legendas.
- SGO_CertCal_ConteudoModulo.html e JS_Core.html: emissão desktop e mobile. SGO_DOCUMENTOS e Auvo são integrações existentes, sem autorização para reestruturar os respectivos módulos.

## Proposta antes de mudanças estruturais

1. Acrescentar infraestrutura exclusiva CertCal, mantendo os endpoints e o schema histórico. Validar dados canônicos no servidor antes de reservar número ou criar artefatos.
2. Congelar no snapshot novo a identidade institucional, logo, signatários, versão dos textos e template, resultados e ator autenticado. Certificado e interpretativo usam esse snapshot. Imagem de assinatura não constitui revisão autenticada; não inventar revisor ou aprovação.
3. Usar identificador de solicitação estável gerado no cliente e validado no servidor; reservar uma emissão sob trava, vinculando solicitação, ator e conteúdo. Repetições iguais retomam o mesmo registro; conteúdo diferente com o mesmo identificador é rejeitado.
4. Registrar etapas persistentes: reserva, PDF criado, snapshot salvo, catálogo registrado e conclusão. A falha deve permanecer rastreável e permitir retomada sem gerar novo número/PDF desnecessariamente. Travas não devem envolver conversão PDF nem chamada IA prolongadas.
5. Registrar eventos de emissão em armazenamento dedicado com escrita verificada, sem depender de SGO_DATA.log. A resposta deve distinguir conclusão de pendência e nunca afirmar conclusão quando falta registro obrigatório. Auvo conserva seu caráter auxiliar.
6. Preservar documentos antigos. Uma revisão futura cria nova versão vinculada à anterior; não reescrever resultados, arquivos ou identidade histórica. Snapshots legados não recebem retroativamente uma identidade atual apresentada como histórica.
7. Versionar textos por emissão; reabrir deve reproduzir o texto congelado, em vez de trocar a redação de documentos emitidos quando Config mudar.

## Riscos confirmados e compatibilidade

- O certificado cria PDF antes da linha em Sheets; falha intermediária pode deixar artefato órfão. Uma exceção isolada não resolve a retomada.
- Falha no cadastro SGO_DOCUMENTOS é capturada e a API retorna ok:true. Alterar apenas para throw pode incentivar reenvio com nova numeração; é necessário coordenar idempotência e estados.
- SGO_DATA.log suprime erros, logo não comprova persistência da auditoria obrigatória.
- Interpretativo pode ser gerado novamente, com IA e arquivo novos; a política de reuso/revisão precisa ser explícita.
- A identidade/assinaturas dependem da configuração de CadeiaFrio; congelar por emissão requer compatibilidade com snapshots que não contêm essas informações.
- Alterações locais de outros trabalhos estão presentes. Upload exige pacote seletivo sobre baseline remoto, sem clasp push --force.
- Testes locais não homologam Drive, Sheets, permissões nem paginação da conversão Google. Produção continua condicionada à homologação e autorização expressa.

## Executado nesta retomada

Aplicados os dois textos de próxima calibração do último anexo em SGO_CertCal_Config.js. Os nove arquivos tests/certcal*.test.cjs passaram executados diretamente com Node; evidência em tmp/certcal-retomada-testes-20261008.txt. O runner node --test encontrou spawn EPERM no ambiente; executar cada arquivo diretamente permitiu concluir as verificações sem subprocessos do runner.

Não houve mudança estrutural, upload, deployment, alteração de base Google ou regeneração/homologação dos PDFs nesta etapa. As etapas de infraestrutura acima permanecem propostas para implementação progressiva.
