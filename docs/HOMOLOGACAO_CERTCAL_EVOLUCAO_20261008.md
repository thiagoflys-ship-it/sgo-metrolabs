# Evolução do certificado de calibração — homologação

Atualização da retomada em 08/10/2026: textos mais recentes do solicitante aplicados; novos certificados congelam identidade, logo, signatários configurados e textos no snapshot. PDF só é compartilhado após persistência e interpretativo existente é reutilizado. Onze arquivos de testes passaram, incluindo snapshot institucional estável e sete cenários de falha parcial. Os exemplos PDF foram regenerados. A infraestrutura ainda não oferece emissão de certificado idempotente por requestId nem auditoria crítica transacional; validação /dev e revisão metrológica continuam pendentes. Detalhes e estado real em `RETOMADA_CERTCAL_20261008.md`.

Implementação em desenvolvimento local em 08/10/2026. Esta evolução não foi publicada; a implantação de produção 299 permanece independente. Não foram alterados registros ou PDFs históricos. Os quatro exemplos usam dados sintéticos, identificados como sem validade para uso.

## Diagnóstico e evidências

O fluxo anterior calculava automaticamente 12 meses de validade. A referência numérica não registra se representa indicação do padrão ou ajuste programado. O relatório omitia parte da identificação e o fator K. A expressão «Erro Máximo» confundia o resultado calculado com limite de aceitação. A comparação de parcelas arredondadas podia aparentar divergência.

Foi consultado, somente para leitura, o certificado 202600250, centrífuga INBRAS ALB50CS, TAG CORA-0108, e seu snapshot original na planilha PORTAL SGO+ VERSÃO CNPJ_DB, aba CERT_CALIBRACAO, célula K251. A incerteza original do cronômetro é 0,122 s, embora sua apresentação seja 0,12 s. Reproduzidos os cinco pontos de rotação e os quatro de tempo com as entradas originais, sem corrigir artificialmente resultados para coincidir com somas arredondadas.

Exemplos de precisão: no ponto de 60 s, U=0,143773787812491 e |tendência|+U=0,177107121145822, apresentados como 0,14 e 0,18. No ponto de 420 s, U=0,297257823509543 e soma=0,463924490176229, apresentados como 0,30 e 0,46. Somar 0,17+0,30 produziria 0,47, mas seria uma operação sobre números já arredondados, não o resultado calculado.

## Arquivos e funções

Diretório de código: `apps-script-imports/portal_sgo_versao_cnpj_db`.

| Arquivo | Alteração |
|---|---|
| SGO_CertCal_Main.js | Validação da próxima calibração, contexto persistido, identidade/hora obtidas no servidor, evento CERTCAL_PROXIMA_CALIBRACAO; retirada do prazo automático |
| SGO_CertCal_Calculo.js | Memória das componentes A/B, graus de liberdade, sensibilidade, origem, probabilidade e versão; precisão interna preservada |
| SGO_CertCal_Config.js | Textos obrigatórios, definições neutras e limites do modelo de incerteza |
| SGO_CertCal_Documento.js | Certificado e relatório com identidade completa, K e mesma próxima calibração; terminologia, aviso de complementaridade e paginação das assinaturas |
| SGO_CertCal_IA.js | Interpretação determinística do mesmo snapshot, tendência com sinal e resultados derivados coerentes |
| SGO_CertCal_ConteudoModulo.js | Formulário desktop, alternância e montagem do payload da solicitação |
| JS_Core.html | Helpers mobileCertCalProximaCampos_, mobileCertCalProximaAlternar_, mobileCertCalLerProxima_, avanço e payload mobile; retirado resíduo de veredito |

Funções documentais compartilhadas: CertCalDoc_proximaCalibracaoHtml_, CertCalDoc_montarCertificadoHtml_, CertCalDoc_montarRelatorioInterpretativoHtml_. Não há nova rota para modificar certificados emitidos.

## Cálculo e interpretação

Tendência = média das indicações registradas − referência informada. O sinal foi preservado. A maior tendência em módulo mantém seu sinal; não é somada à maior U de outro ponto para inventar um resultado. «Módulo da tendência acrescido da incerteza expandida» é calculado por ponto e não representa EMA ou aprovação.

Modelo implementado: uA=s/√n, graus de liberdade n−1; componentes B=U95/K dos padrões cadastrados; uc=√Σu², com coeficientes de sensibilidade em módulo iguais a 1 e independência assumida. Veff calculado por Welch–Satterthwaite; K obtido pela distribuição t de Student com probabilidade bicaudal 0,9545; U=K·uc. Veff=0 dos padrões é a convenção existente de graus de liberdade infinitos. A distribuição original de cada padrão não está cadastrada: a memória declara essa ausência, sem atribuir uma distribuição fictícia. Esta evolução adiciona rastreabilidade, sem substituir o método por fórmula não validada.

Todos os resultados numéricos são apresentados em português com duas casas decimais. Identificadores, datas e números de documentos preservam seu formato próprio. O relatório usa o mesmo contexto do certificado, incluindo CNPJ, fabricante, modelo, série, TAG, datas, local, leituras, média, tendência, K, Veff, U e soma derivada. Não emite aprovado/reprovado. A avaliação de adequação ao uso fica com o responsável do cliente.

## Próxima calibração

Padrão NÃO: nenhum prazo ou data futura é calculado; exibe integralmente o texto solicitado sobre responsabilidade pela periodicidade. SIM: exige data válida posterior à calibração, solicitante, cargo/setor e referência da solicitação; observação opcional. A data aparece nos dois documentos como informação do contratante, com a frase solicitada e o texto obrigatório integral.

Campos inconsistentes, escolha inválida, data impossível ou dados residuais na opção NÃO impedem a emissão. O servidor ignora identidade e horário enviados pelo navegador e registra os valores autenticados no snapshot e no log. DATA_VALIDADE e DATA_VENCIMENTO não recebem a próxima calibração. Documentos históricos continuam apresentando somente a origem histórica disponível, sem inventar solicitação do cliente.

## Testes e exemplos

Todos os nove arquivos `tests/certcal*.test.cjs` passaram: instrumentos, motor, interface, documentos, regressão 202600250, próxima calibração no backend, desktop, mobile e evolução documental. Os cenários A/B/C cobrem ausência de data, solicitação completa e rejeição de dados incompletos/inconsistentes. O cenário D compara os nove pontos e valores não arredondados do snapshot original. O cenário E verifica os valores compartilhados nos dois templates e os PDFs renderizados.

PDFs em `output/pdf/certcal-evolucao-20261008`: sem-data-certificado.pdf, sem-data-interpretativo.pdf, com-data-cliente-certificado.pdf e com-data-cliente-interpretativo.pdf. Renderizados e inspecionados com PyMuPDF; nenhum bloco textual fora da página. A versão com solicitação é mais longa porque apresenta os dados de rastreabilidade. Evidências de extração e renderização: `tmp/pdfs/certcal-evolucao-20261008/render/inspecao.json` e imagens no mesmo diretório.

Não foi executada emissão oficial sintética nem gravação na base de produção. A emissão via Google Apps Script e o fluxo operacional com usuários reais ainda precisam ser validados em ambiente de homologação; os testes realizados executam as funções locais com simulações de serviços.

## Pendências metrológicas e parecer

O responsável técnico precisa confirmar: origem de cada referência (padrão versus setpoint), sinal e definição do mensurando no procedimento; completude do orçamento de incerteza, incluindo resolução, correções, correlações e outras influências; distribuições e graus de liberdade dos padrões; adequação dos coeficientes de sensibilidade e da probabilidade 95,45% ao método aplicável. A interface e a fórmula não fornecem essas evidências por si mesmas. Referências gerais: JCGM 100:2008 e EA-4/02 M:2022; não foi declarada conformidade automática com esses documentos.

Parecer: apta para homologação funcional e revisão metrológica, com testes locais aprovados e exemplos disponíveis. A publicação fica aguardando homologação e autorização explícita. Não se declara que todos os métodos estão metrologicamente validados apenas porque os testes de software passaram.
