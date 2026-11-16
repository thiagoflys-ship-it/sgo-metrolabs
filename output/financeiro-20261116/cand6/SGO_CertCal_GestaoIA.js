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
    : 'Interprete o desempenho da emissão de certificados de calibração no período: volume emitido, situação das validades dos padrões, cobertura de relatórios interpretativos e distribuição dos pontos por grandeza. Aponte riscos e ações gerenciais sem avaliar pessoas.';
  regras += '\nNão cite nomes de programas, sistemas ou ferramentas; escreva como documento gerencial da Metrolabs. Use singular e plural corretos ("1 certificado", "2 certificados").';
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
    // Mesmas conferências dos documentos técnicos: só números do contexto, vírgula decimal, sem veredito.
    var tudo = r.resumo + '\n' + r.prioridades;
    var cx = contexto || {};
    var permitidos = [SGO_DocA4_num_(Number(cx.coberturaIA) || 0, 2), '0,00', '100,00'];
    var fora = typeof RelTecIA_numerosForaDaLista_ === 'function' ? RelTecIA_numerosForaDaLista_(tudo, permitidos) : [];
    if (fora.length) throw new Error('a redação da IA citou valores que não constam dos indicadores (' + fora.slice(0, 3).join('; ') + ') e foi descartada');
    if (typeof RelTecIA_temVeredito_ === 'function' && RelTecIA_temVeredito_(tudo)) throw new Error('a redação da IA continha declaração de aprovação ou conformidade e foi descartada');
    r.aviso = '';
    return r;
  } catch (e) {
    var motivo = String((e && e.message) || e || 'falha desconhecida').replace(/^A interpretação por IA não está disponível: /, '').replace(/[.\s]+$/, '');
    var c = contexto || {};
    var n = function (v) { return SGO_DocA4_num_(Number(v) || 0, 0); };
    var pl = function (v, sing, plur) { return (Number(v) || 0) === 1 ? '1 ' + sing : n(v) + ' ' + plur; };
    var resumo, prioridades;
    if (tipo === 'RENOVACAO') {
      var k = c.contagens || {};
      var semData = (Number(k.SEM_VALIDADE) || 0) + (Number(k.VALIDADE_INVALIDA) || 0);
      // Não repete os números dos indicadores (seção 1): diz o que exige ação e o próximo vencimento.
      var problemas = [];
      if (Number(k.VENCIDO)) problemas.push(pl(k.VENCIDO, 'está vencido', 'estão vencidos'));
      if (Number(k.VENCENDO)) problemas.push(pl(k.VENCENDO, 'vence', 'vencem') + ' em até 30 dias');
      if (semData) problemas.push(pl(semData, 'não tem validade válida no cadastro', 'não têm validade válida no cadastro'));
      var prox = (c.proximos || [])[0];
      resumo = !(Number(c.total) || 0) ? 'Não há padrões de referência ativos no cadastro.'
        : (problemas.length ? 'Exigem ação imediata: ' + problemas.join('; ') + '.' : 'Todos os padrões ativos estão com o certificado vigente e nenhum vence nos próximos 30 dias.') +
          (prox ? ' O próximo vencimento é o do padrão ' + prox.tag + ', em ' + prox.validade + ' (' + pl(prox.dias, 'dia', 'dias') + ').' : '') +
          ((Number(c.comErros) || 0) ? ' ' + (Number(c.comErros) === 1 ? 'Um cadastro tem' : n(c.comErros) + ' cadastros têm') + ' dados a completar ou corrigir, indicados na Tabela 1.' : '');
      prioridades = 'Trate os padrões na ordem da Tabela 1: primeiro os vencidos (P1), depois os sem validade ou com data inválida (P2), os que vencem em até 30 dias (P3) e os cadastros incompletos (P4). Padrão vencido na data da calibração não pode ser usado em certificado.';
    } else {
      var tc = Number(c.totalCertificados) || 0;
      var media = tc ? SGO_DocA4_num_((Number(c.pontosCalibrados) || 0) / tc, 2) : '0,00';
      var lg = Object.keys(c.grandezas || {}).sort(function (a, b) { return (c.grandezas[b] || 0) - (c.grandezas[a] || 0); });
      resumo = tc
        ? 'No período de ' + String(c.periodo || '') + ', a média foi de ' + media + ' pontos calibrados por certificado' +
          (lg.length ? (lg.length === 1 ? ', todos em ' + lg[0] : '; a grandeza com mais pontos foi ' + lg[0] + ' (' + n(c.grandezas[lg[0]]) + ' de ' + n(c.pontosCalibrados) + ')') : '') + '. ' +
          ((Number(c.semRelatorioIA) || 0) ? pl(c.semRelatorioIA, 'certificado ainda não tem', 'certificados ainda não têm') + ' relatório interpretativo.' : 'Todos os certificados do período têm relatório interpretativo.')
        : 'Nenhum certificado de calibração foi emitido no período de ' + String(c.periodo || '') + '.';
      var p = c.padroes || {};
      var att = [];
      if (Number(p.vencidos)) att.push(pl(p.vencidos, 'padrão vencido', 'padrões vencidos') + ': renove antes de nova emissão na grandeza correspondente.');
      if (Number(p.vencendo)) att.push(pl(p.vencendo, 'padrão vence', 'padrões vencem') + ' em até 30 dias: inicie a renovação pelo plano de renovação dos padrões.');
      if (Number(p.semValidade)) att.push(pl(p.semValidade, 'padrão sem validade cadastrada', 'padrões sem validade cadastrada') + ': confira o certificado e cadastre a data.');
      if (Number(p.invalidos)) att.push(pl(p.invalidos, 'cadastro de padrão com pendência', 'cadastros de padrão com pendência') + ' (por exemplo, PDF do certificado não anexado): complete o cadastro.');
      if (Number(c.semRelatorioIA)) att.push('Avalie com os clientes a necessidade do relatório interpretativo nos certificados que ainda não o têm.');
      prioridades = att.length ? att.join(' ') : 'Nenhum ponto de atenção nos padrões ou na cobertura dos relatórios interpretativos.';
    }
    return { resumo: resumo, prioridades: prioridades, aviso: 'O relatório saiu com a análise padrão, sem a redação da IA: ' + motivo + '.' };
  }
}
