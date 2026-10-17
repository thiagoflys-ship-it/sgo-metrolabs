/* Seleção real de canais e estudos térmicos da secadora de traqueias. */
function EstufaBanhoRel_ebEhSecadora_(tipo) { return /^SECADORA_(VAZIO|CARGA)_[123]$/.test(String(tipo||'')); }
function EstufaBanhoRel_ebEhDistribuicao_(tipo) { return tipo==='DISTRIBUICAO_VAZIO'||tipo==='DISTRIBUICAO_CARGA'||EstufaBanhoRel_ebEhSecadora_(tipo); }
function EstufaBanhoRel_ebValidarSelecao_(payload,n) {
  if(!Number.isInteger(Number(payload.nSensores))||Number(payload.nSensores)<1||Number(payload.nSensores)>60)throw new Error('Informe de 1 a 60 canais disponíveis.');
  var a=payload.sensoresAtivos;
  if(!Array.isArray(a)||a.length!==n||a.some(function(v){return typeof v!=='boolean';})||!a.some(Boolean))throw new Error('Selecione ao menos um sensor e confira a lista de canais.');
}
function EstufaBanhoRel_ebValidarDadosSelecionados_(dados,ativos,titulo) {
  if(dados.length<3)throw new Error(titulo+': são necessárias pelo menos três leituras no período informado.');
  var anterior=null;
  dados.forEach(function(r){var ms=EstufaBanhoRel_ebConverterTempoParaMs_(r.tempoDate||r.tempoStr);
    if(!isFinite(ms)||anterior!==null&&ms<=anterior)throw new Error(titulo+': datas e horas inválidas, repetidas ou fora de ordem. Confira o arquivo.');anterior=ms;
  });
  ativos.forEach(function(on,i){if(!on)return;
    var ruins=dados.filter(function(r){var v=r.temperaturas&&r.temperaturas[i];return EstufaBanhoRel_ebParseNumero_(v)===null;});
    if(ruins.length)throw new Error(titulo+': S'+(i+1)+' possui '+ruins.length+' leitura(s) ausente(s) ou inválida(s). Confira o arquivo ou a seleção.');
  });
}
function EstufaBanhoRel_ebConfigSecadora_(payload) {
  var s=payload.estudos&&payload.estudos.secadora||{},out=[];
  ['vazio','carga'].forEach(function(cond){
    if(!Array.isArray(s[cond])||s[cond].length!==3)throw new Error('Secadora: informe três estudos em vazio e três com carga.');
    s[cond].forEach(function(r,i){
      if(!r||typeof r!=='object')throw new Error('Secadora: informe o período de '+cond+' '+(i+1)+'.');
      var ini=EstufaBanhoRel_ebConverterTempoParaMs_(r.inicio),fim=EstufaBanhoRel_ebConverterTempoParaMs_(r.fim);
      if(!isFinite(ini)||!isFinite(fim)||fim<=ini)throw new Error('Secadora: confira início e fim de '+cond+' '+(i+1)+'.');
      out.push({tipoEstudo:'SECADORA_'+cond.toUpperCase()+'_'+(i+1),janelaInicioMs:ini,janelaFimMs:fim,janelaInicio:r.inicio,janelaFim:r.fim,resultadoDesejado:r.resultadoDesejado});
    });
  });
  var ordenados=out.slice().sort(function(a,b){return a.janelaInicioMs-b.janelaInicioMs;});
  for(var i=1;i<ordenados.length;i++)if(ordenados[i].janelaInicioMs<ordenados[i-1].janelaFimMs)throw new Error('Secadora: os seis estudos devem ter períodos independentes, sem sobreposição.');
  return out;
}
function EstufaBanhoRel_ebResumoSensores_(ativos) {
  var ids=[];(ativos||[]).forEach(function(v,i){if(v)ids.push('S'+(i+1));});return ids.length+' — '+ids.join(', ');
}
function EstufaBanhoRel_ebParecerResultado_(status) {
  return {APROVADO:'ATENDEU AOS CRITÉRIOS DO ENSAIO',APROVADO_COM_ALERTA:'ATENDEU AOS CRITÉRIOS DO ENSAIO (COM OBSERVAÇÃO)',REPROVADO:'NÃO ATENDEU AOS CRITÉRIOS DO ENSAIO',INFORMATIVO:'RESULTADO INFORMATIVO',CARACTERIZACAO:'CARACTERIZAÇÃO TÉRMICA'}[String(status||'').toUpperCase()]||'RESULTADO INFORMATIVO';
}
function EstufaBanhoRel_ebAssinaturaContexto_(ctx) {
  // Vincula textos revisados aos fatos usados na geração; alterações pedem nova interpretação.
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify(ctx)));
}
