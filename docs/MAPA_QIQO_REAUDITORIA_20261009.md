# Reauditoria do Relatório de Qualificação QI/QO/QD

## Caminho do módulo

`SGO_DeclaracaoExecQIQO_ConteudoModulo.js` mantém formulário, seleção de perfil, anexos, revisão e cache de leitura QD. Chama `DeclExec_apiDispatch` com a sessão do portal. O dispatcher encaminha o identificador de sessão ao backend.

`SGO_DeclaracaoExec_Config.js` fornece os 15 perfis, checklists QI/QO, instrumentos calibráveis e referências. `SGO_DeclaracaoExec_Main.js` resolve o contexto contra essa configuração e lê cada certificado QD em seu slot. `SGO_DeclaracaoExec_IA.js` produz a leitura e os textos. `SGO_DeclaracaoExec_DocumentoQIQO.js` monta o relatório final; salvar e listar PDFs são ações compartilhadas no backend DeclExec.

## Correções comprovadas

- Geração QIQO, montagem, salvamento e listagem exigem sessão interna também em chamadas diretas. O dispatcher preserva a compatibilidade das chamadas existentes.
- Certificados e leituras com códigos desconhecidos ou duplicados são rejeitados, evitando seleção silenciosa do último anexo.
- SHA256 do arquivo e contexto equipamento/TAG acompanham a leitura. Arquivo ou contexto alterado exigem novo rascunho. Essa checagem detecta inconsistências do fluxo; não representa assinatura ou autenticação criptográfica da leitura enviada pelo navegador.
- Falha ou ausência de leitura bloqueia QD. A montagem também bloqueia arquivo sem leitura correspondente, leitura vazia e certificado substituído após o rascunho.
- Textos, leitura QD, observações e legendas não aceitam termos explícitos de aprovado/reprovado/apto/inapto. O rodapé atribui a decisão de adequação e liberação à qualidade do cliente.
- Prompt deixa de pedir reprodução de vereditos de terceiros e não trata calibração de componentes como comprovação isolada do desempenho completo do equipamento.
- Medições em prosa, leituras, observações e legendas, acompanhadas de unidades reconhecidas, são apresentadas com duas casas decimais, preservando sinal. Datas, TAGs, normas e identificadores permanecem literais. Não são definidos intervalos automáticos de próxima calibração.

## Validação local

`node tests/qiqo-auditoria.test.cjs`: **9 testes passaram**. Incluem percurso rascunho → contexto real → resolução de instrumentos → montagem de relatório para **todos os 15 perfis reais**. Chamadas de IA foram substituídas por respostas controladas; não foram emitidos PDFs oficiais nem gravados dados no Google.

O teste também cobre configuração sintética sem QO/QD para verificar os ramos opcionais, acesso direto, arquivo substituído, anexos desconhecidos/duplicados, falha de leitura e vereditos em legendas/observações.

## Limites ainda existentes

OCR e prosa gerada por IA exigem revisão humana comparando os certificados originais. A regra de apresentação não transforma texto em resultado metrológico estruturado: medições sem unidades reconhecidas dependem do prompt e formatos ambíguos com ponto exigem conferência. O arquivo original conserva sua precisão; este módulo não executa um motor de cálculo metrológico próprio.

O fluxo não possui snapshot canônico assinado da leitura no servidor. O PDF final é salvo somente quando o operador executa a ação de salvar; a leitura e os anexos do rascunho permanecem no navegador durante esse fluxo. A assinatura visual padrão do documento não equivale a revisão humana autenticada.

Esta reauditoria é evidência local. Publicação e teste autenticado em produção devem ser registrados no relatório geral dos três módulos; este documento não os presume concluídos.
