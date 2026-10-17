/****************************************************
 * IA dos relatórios gerenciais do CertCal.
 * Recebe somente indicadores já calculados pelo backend.
 ****************************************************/
function CertCalGestIA_gerar_(tipo, contexto) {
  var props = PropertiesService.getScriptProperties();
  var key = props.getProperty('GEMINI_API_KEY') || '';
  if (!key) throw new Error('A interpretação por IA não está disponível: a chave GEMINI_API_KEY não está cadastrada. Peça ao administrador para cadastrá-la em Chaves e senhas e tente de novo.');
  var modelo = (props.getProperty('IA_MODEL') || 'gemini-2.5-flash').trim();
  var regras = [
    'Você é um especialista em gestão metrológica e qualidade.',
    'Use somente os dados do CONTEXTO. Não invente números, datas, acreditações, grandezas ou faixas.',
    'Não declare que um laboratório é acreditado sem evidência. Oriente consultar o escopo oficial da RBC/Cgcre para a grandeza e faixa contratadas.',
    'Escreva em português brasileiro, de forma didática, operacional e respeitosa.',
    'O laboratório apresenta dados da calibração; a decisão de aceitação e adequação ao uso pertence ao setor de qualidade do cliente. Não emita aprovação, reprovação ou declaração de conformidade.',
    'Apresente valores de medição e percentuais com exatamente duas casas decimais e vírgula decimal; não altere dados nem derive valores ausentes.',
    'Responda sem markdown, nesta estrutura exata:',
    '###RESUMO###',
    'texto executivo em 2 ou 3 parágrafos',
    '###PRIORIDADES###',
    'texto com prioridades e próximos passos',
    '###FIM###'
  ].join('\n');
  var tarefa = tipo === 'RENOVACAO'
    ? 'Interprete o plano de renovação e auditoria dos padrões. Destaque vencidos, vencendo, sem validade e cadastros incompletos. Reforce três orçamentos comparáveis, validade solicitada de 3 anos, laboratório com escopo RBC compatível e conferência imediata do certificado recebido.'
    : 'Interprete o desempenho do módulo: volume emitido, situação das validades, cobertura de relatórios interpretativos, distribuição por grandeza. Aponte evolução, riscos e ações gerenciais sem avaliar pessoas.';
  var prompt = regras + '\n\nTAREFA: ' + tarefa + '\n\nCONTEXTO:\n' + JSON.stringify(contexto);
  var resp = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + modelo + ':generateContent?key=' + key, {
    method:'post', muteHttpExceptions:true, contentType:'application/json',
    payload:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{maxOutputTokens:4096,temperature:0.2}})
  });
  if (resp.getResponseCode() !== 200) throw new Error('Falha ao gerar interpretação por IA (HTTP ' + resp.getResponseCode() + ').');
  var body=JSON.parse(resp.getContentText()||'{}');
  var texto=body.candidates&&body.candidates[0]&&body.candidates[0].content&&body.candidates[0].content.parts;
  texto=texto&&texto.map(function(p){return p.text||'';}).join('');
  var resumo=/###RESUMO###([\s\S]*?)###PRIORIDADES###/.exec(texto||'');
  var prioridades=/###PRIORIDADES###([\s\S]*?)###FIM###/.exec(texto||'');
  if(!resumo||!prioridades) throw new Error('A IA não retornou as seções esperadas. Tente novamente.');
  return {resumo:resumo[1].trim(),prioridades:prioridades[1].trim()};
}

/**
 * Mesma chamada, mas o relatório gerencial não fica bloqueado quando a IA falha:
 * os dados (tabelas, indicadores e gráficos) vêm do cadastro e continuam valendo;
 * a seção de interpretação diz por que ficou sem texto e o que fazer.
 */
function CertCalGestIA_gerarOuAviso_(tipo, contexto) {
  try {
    return CertCalGestIA_gerar_(tipo, contexto);
  } catch (e) {
    var motivo = String((e && e.message) || e || 'falha desconhecida');
    return {
      resumo: 'Esta emissão saiu sem o texto da IA. Motivo: ' + motivo + ' Os indicadores, tabelas e gráficos abaixo foram calculados diretamente do cadastro e não dependem da IA.',
      prioridades: tipo === 'RENOVACAO'
        ? 'Siga a ordem de prioridade do mapa de padrões abaixo (P1 a P5). Para incluir a interpretação, gere o relatório de novo depois de resolver o motivo indicado.'
        : 'Use os índices e gráficos abaixo. Para incluir a interpretação, gere o relatório de novo depois de resolver o motivo indicado.'
    };
  }
}
