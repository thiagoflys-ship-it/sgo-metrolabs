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
    payload:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{maxOutputTokens:8192,temperature:0.2}})
  });
  if (resp.getResponseCode() !== 200) throw new Error('Falha ao gerar interpretação por IA (HTTP ' + resp.getResponseCode() + ').');
  var body=JSON.parse(resp.getContentText()||'{}');
  if(body.candidates&&body.candidates[0]&&body.candidates[0].finishReason==='MAX_TOKENS') throw new Error('A resposta da IA veio incompleta.');
  var texto=body.candidates&&body.candidates[0]&&body.candidates[0].content&&body.candidates[0].content.parts;
  texto=texto&&texto.map(function(p){return p.text||'';}).join('');
  var resumo=/###RESUMO###([\s\S]*?)###PRIORIDADES###/.exec(texto||'');
  var prioridades=/###PRIORIDADES###([\s\S]*?)###FIM###/.exec(texto||'');
  if(!resumo||!prioridades) throw new Error('A IA não retornou as seções esperadas. Tente novamente.');
  return {resumo:resumo[1].trim(),prioridades:prioridades[1].trim()};
}

/**
 * Mesma chamada, mas o relatório gerencial nunca fica bloqueado quando a IA falha:
 * sai uma análise padrão escrita a partir dos próprios indicadores (sem números
 * inventados) e o motivo vai em `aviso`, para a tela — não para o documento.
 */
function CertCalGestIA_gerarOuAviso_(tipo, contexto) {
  try {
    var r = CertCalGestIA_gerar_(tipo, contexto);
    r.aviso = '';
    return r;
  } catch (e) {
    var motivo = String((e && e.message) || e || 'falha desconhecida').replace(/^A interpretação por IA não está disponível: /, '').replace(/[.\s]+$/, '');
    var c = contexto || {};
    var n = function (v) { return SGO_DocA4_num_(Number(v) || 0, 0); };
    var resumo, prioridades;
    if (tipo === 'RENOVACAO') {
      var k = c.contagens || {};
      resumo = 'O cadastro reúne ' + n(c.total) + ' padrões de referência ativos: ' + n(k.OK) + ' vigentes, ' + n(k.VENCENDO) +
        ' com vencimento em até 30 dias, ' + n(k.VENCIDO) + ' vencidos, ' + n(k.SEM_VALIDADE) + ' sem validade informada e ' +
        n(k.VALIDADE_INVALIDA) + ' com data de validade inválida. ' + n(c.comErros) + ' cadastros têm dados a completar ou corrigir.';
      prioridades = 'Trate os padrões na ordem do mapa abaixo: primeiro os vencidos (P1), depois os sem validade ou com data inválida (P2), os que vencem em até 30 dias (P3) e os cadastros incompletos (P4). Padrão vencido na data da calibração não pode ser usado em certificado.';
    } else {
      resumo = 'No período (' + String(c.periodo || '') + '), foram emitidos ' + n(c.totalCertificados) + ' certificados de calibração para ' +
        n(c.clientesAtendidos) + ' clientes e ' + n(c.equipamentosAtendidos) + ' equipamentos, com ' + n(c.pontosCalibrados) +
        ' pontos calibrados. ' + n(c.comRelatorioIA) + ' certificados têm relatório interpretativo.';
      var p = c.padroes || {};
      prioridades = 'Situação atual dos padrões: ' + n(p.validos) + ' vigentes de ' + n(p.total) + ', ' + n(p.vencidos) + ' vencidos e ' + n(p.vencendo) +
        ' com vencimento em até 30 dias. Revise os vencidos e os sem validade antes de novas emissões.';
    }
    return { resumo: resumo, prioridades: prioridades, aviso: 'O relatório saiu com a análise padrão, sem a redação da IA: ' + motivo + '.' };
  }
}
