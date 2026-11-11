var CERTCALIA_MODELO_PADRAO="gemini-2.5-flash";var CERTCALIA_FALLBACKS_PADRAO=["gemini-2.0-flash-lite"];var CERTCALIA_ENDPOINT_GEMINI="https://generativelanguage.googleapis.com/v1beta/models/";var CERTCALIA_MAX_TENTATIVAS=3;var CERTCALIA_DELAYS_MS=[800,1600];function CertCalIA_obterConfig_(){var props=PropertiesService.getScriptProperties();var model=(props.getProperty("IA_MODEL")||"").trim();var fbProp=(props.getProperty("IA_MODEL_FALLBACKS")||"").trim();return{model:model||CERTCALIA_MODELO_PADRAO,fallbacksRaw:fbProp,geminiKey:props.getProperty("GEMINI_API_KEY")||""}}function CertCalIA_obterListaModelos_(cfg){var lista=[cfg.model];var fb=cfg.fallbacksRaw?cfg.fallbacksRaw.split(",").map(function(m){return m.trim()}).filter(Boolean):[].concat(CERTCALIA_FALLBACKS_PADRAO);fb.forEach(function(m){if(lista.indexOf(m)===-1)lista.push(m)});return lista}function CertCalIA_extrairDetalheQuota_(corpo){var detalhes=corpo&&corpo.error&&corpo.error.details;if(!Array.isArray(detalhes))return{retryDelay:null,descricao:null};var retryInfo=detalhes.filter(function(d){return d["@type"]&&d["@type"].indexOf("RetryInfo")!==-1})[0];var quotaFailure=detalhes.filter(function(d){return d["@type"]&&d["@type"].indexOf("QuotaFailure")!==-1})[0];var descricao=null;if(quotaFailure&&Array.isArray(quotaFailure.violations)&&quotaFailure.violations[0]){descricao=quotaFailure.violations[0].description||quotaFailure.violations[0].subject||null}return{retryDelay:retryInfo?retryInfo.retryDelay:null,descricao:descricao}}function CertCalIA_interpretarErro_(codigo,corpo){var msgApi=corpo&&corpo.error&&(corpo.error.message||corpo.error.status)||"HTTP "+codigo;if(codigo===401||codigo===403)return"Chave GEMINI_API_KEY inválida ou sem autorização (HTTP "+codigo+").";if(codigo===429){var detalhe=CertCalIA_extrairDetalheQuota_(corpo);var sugestao=detalhe.retryDelay?"Aguarde aproximadamente "+detalhe.retryDelay+" e tente novamente.":"Aguarde alguns minutos e tente novamente.";return"Limite de uso da IA atingido (HTTP 429)"+(detalhe.descricao?" — "+detalhe.descricao:"")+". "+sugestao}if(codigo===404)return"Modelo não encontrado (HTTP 404): "+msgApi;if(codigo>=500)return"Serviço de IA temporariamente indisponível (HTTP "+codigo+"): "+msgApi;return"Erro na API de IA (HTTP "+codigo+"): "+msgApi}function CertCalIA_retentavel_(codigo){return codigo===500||codigo===503}
/**
 * Texto padrão do relatório interpretativo (sem IA). Não repete a tabela do certificado:
 * explica os termos uma vez, resume cada grandeza pelas faixas (com a figura) e deixa
 * para a conclusão o valor que o cliente compara com a tolerância (|tendência| + U95).
 */
function CertCalIA_textoPadraoInterpretativo_(ctx) {
  if (!ctx || !ctx.blocos || !ctx.blocos.length) throw new Error("Nenhum resultado calculado para gerar o relatório interpretativo.");
  var prob = (typeof CERTCAL_CFG !== "undefined" && CERTCAL_CFG.PROBABILIDADE_ABRANGENCIA_TEXTO) || "95,45%";
  var resumos = [], decisivos = [];
  ctx.blocos.forEach(function (b, i) {
    var rs = b.resultados || [];
    if (!rs.length) throw new Error("Grandeza sem resultados para interpretar.");
    var un = b.unidade || "", cb = CertCalDoc_casasBloco_(b);
    var v = function (x) { return CertCalDoc_num_(x, cb) + "\u00a0" + un; };
    var faixa = function (lista, casas) {
      var mn = Math.min.apply(null, lista), mx = Math.max.apply(null, lista);
      var f = function (x) { return CertCalDoc_num_(x, casas); };
      return f(mn) === f(mx) ? f(mn) : "de " + f(mn) + " a " + f(mx);
    };
    var noms = rs.map(function (r) { return Number(r.nominal); });
    var tends = rs.map(function (r) { return Number(r.tendencia); });
    var us = rs.map(function (r) { return Number(r.incertezaU95); });
    var ks = rs.map(function (r) { return Number(r.k); });
    var pior = rs.reduce(function (a, r) { return Number(r.erroMaximo) > Number(a.erroMaximo) ? r : a; }, rs[0]);
    var fig = "Figura " + (i + 1);
    if (rs.length === 1) {
      resumos.push(b.titulo + " (" + un + "): um ponto calibrado, " + v(rs[0].nominal) + ". Tendência " + v(rs[0].tendencia) + " e U95 " + v(rs[0].incertezaU95) + " (k " + CertCalDoc_num_(rs[0].k, 2) + "; " + fig + ").");
    } else {
      var entre = function (lista, casas) {
        var f = faixa(lista, casas);
        return (/^de /.test(f) ? "ficou " + f.replace(/^de /, "entre ").replace(" a ", " e ") : "foi " + f) + "\u00a0" + un;
      };
      resumos.push(b.titulo + " (" + un + "): " + rs.length + " pontos calibrados, " + faixa(noms, cb) + "\u00a0" + un + ". A tendência " + entre(tends, cb) +
        " e a U95 " + entre(us, cb) + ", com k " + faixa(ks, 2) + " (" + fig + ").");
    }
    decisivos.push(b.titulo + ", " + v(pior.erroMaximo) + (rs.length > 1 ? " no ponto de " + v(pior.nominal) : ""));
  });
  return {
    introducao: "Este relatório explica, em linguagem acessível, os resultados do Certificado de Calibração nº " + (ctx.numeroCertificado || "não informado") + " do equipamento identificado na seção 1. Para cada grandeza calibrada, mostra o significado da tendência, da incerteza expandida (U95), do fator de abrangência (k) e dos graus de liberdade efetivos (Veff) e indica o valor a comparar com a tolerância da aplicação. Os resultados referem-se aos pontos e às condições do ensaio.",
    resultadosExplicados: "A tendência é a média das indicações do instrumento menos o valor de referência do ponto, com o sinal preservado: positiva quando o instrumento indicou acima da referência. A incerteza expandida (U95) delimita, em torno do resultado, o intervalo em que se espera encontrar, com probabilidade de abrangência de " + prob + ", os valores que podem ser atribuídos à grandeza medida; ela combina a repetibilidade das leituras, a incerteza dos padrões e a resolução do instrumento. O fator k converte a incerteza-padrão combinada em U95 e cresce quando há poucos graus de liberdade efetivos (Veff), isto é, poucas leituras ou leituras mais dispersas. A soma |tendência| + U95 indica o maior afastamento provável da indicação em relação à referência; não é, por si só, um limite de aceitação.\n\n" + resumos.join("\n\n"),
    conclusaoTecnica: "O valor que resume cada grandeza para a decisão de uso é o maior |tendência| + U95: " + decisivos.join("; ") + ". Os maiores valores de tendência e de incerteza podem ocorrer em pontos distintos. Estes resultados não constituem declaração de conformidade: a avaliação dos requisitos e a decisão de aptidão para uso cabem ao setor de qualidade do cliente.",
    conclusaoLeigo: "O certificado mostra, para cada ponto, quanto a indicação do instrumento se afastou da referência (tendência) e qual é a margem de dúvida dessa medida (U95). Para saber se o instrumento atende ao seu uso, compare o valor |tendência| + U95 de cada ponto com a tolerância que a sua aplicação aceita, definida pelo setor de qualidade."
  };
}

function CertCalIA_analisarFoto_(base64,mimeType,contextoEquipamento){var cfg=CertCalIA_obterConfig_();if(!cfg.geminiKey||!base64)return"";var prompt="Você é um perito técnico em metrologia analisando uma foto tirada durante um ensaio de calibração de "+"equipamento usado em saúde. Equipamento: "+(contextoEquipamento||"-")+". Descreva OBJETIVAMENTE o que é visível na imagem, em tom de laudo técnico, em 1 parágrafo curto (2 a 4 "+"frases), português brasileiro, sem markdown. NUNCA declare aprovação, reprovação, conformidade ou não "+"conformidade — apenas descreva o que a imagem mostra. Não transcreva números, valores de medição ou identificadores; os resultados oficiais estão no certificado.";var modelos=CertCalIA_obterListaModelos_(cfg);var ultimoErr="a IA não conseguiu analisar esta imagem no momento";for(var mi=0;mi<modelos.length;mi++){var modelo=modelos[mi];for(var tent=0;tent<CERTCALIA_MAX_TENTATIVAS;tent++){if(tent>0)Utilities.sleep(CERTCALIA_DELAYS_MS[tent-1]||1600);try{var url=CERTCALIA_ENDPOINT_GEMINI+modelo+":generateContent?key="+cfg.geminiKey;var resp=UrlFetchApp.fetch(url,{method:"post",muteHttpExceptions:true,contentType:"application/json",payload:JSON.stringify({contents:[{parts:[{text:prompt},{inlineData:{mimeType:mimeType||"image/jpeg",data:base64}}]}],generationConfig:{maxOutputTokens:4096,temperature:.3}})});var codigo=resp.getResponseCode();var corpo={};try{corpo=JSON.parse(resp.getContentText())}catch(e2){}if(codigo===200){var cand=corpo.candidates&&corpo.candidates[0];var respParts=cand&&cand.content&&cand.content.parts;var texto=respParts&&respParts.map(function(p){return p.text||""}).join("");if(texto){var legenda=String(texto).trim();if(/\d|aprovad|reprovad|conform|apt[oa]\s+para\s+uso/i.test(legenda))return"";return legenda}ultimoErr="a IA retornou resposta vazia ao analisar a imagem";break}if(codigo===404){ultimoErr="modelo "+modelo+" não encontrado para análise de imagem";break}ultimoErr=CertCalIA_interpretarErro_(codigo,corpo);if(!CertCalIA_retentavel_(codigo))break}catch(e3){ultimoErr=e3.message||String(e3)}}}return"(não foi possível gerar automaticamente a análise desta imagem — "+ultimoErr+")"}

/**
 * Relatório interpretativo do certificado: redação por IA sobre os dados reais do
 * certificado (Gemini, raciocínio ligado, temperatura baixa). A resposta só é aceita se
 * citar apenas valores do certificado e não declarar aprovação/conformidade; caso
 * contrário (ou sem chave), sai o texto padrão e um aviso em _aviso. Nunca lança por IA.
 */
function CertCalIA_gerarRelatorioInterpretativo_(ctx) {
  var padrao = CertCalIA_textoPadraoInterpretativo_(ctx);
  var permitidos = [ctx.numeroCertificado, ctx.dataCalibracao, ctx.dataEmissao, CERTCAL_CFG.PROBABILIDADE_ABRANGENCIA_TEXTO, '95,45'];
  var linhas = [];
  (ctx.blocos || []).forEach(function (b) {
    var cb = CertCalDoc_casasBloco_(b);
    var un = b.unidade || '';
    var res = Number(b.resolucao);
    linhas.push('Grandeza: ' + b.titulo + ' (unidade ' + un + ')' + (res > 0 ? '; resolução do instrumento ' + CertCalDoc_num_(res, Math.max(0, -Math.floor(Math.log10(res) + 1e-9))) + ' ' + un + (b.resolucaoInferida ? ' (deduzida das leituras)' : '') : ''));
    if (res > 0) permitidos.push(CertCalDoc_num_(res, Math.max(0, -Math.floor(Math.log10(res) + 1e-9))));
    (b.fontesIncerteza || []).forEach(function (f) {
      var a = CertCalDoc_num_(f.incertezaU95, Math.max(2, cb)), k = CertCalDoc_num_(f.fatorK, 2);
      permitidos.push(a, k);
      linhas.push('  Padrão ' + f.codigo + ': U95 = ' + a + ' ' + un + ', k = ' + k);
    });
    (b.resultados || []).forEach(function (r) {
      var v = {
        vr: CertCalDoc_num_(r.nominal, cb), media: CertCalDoc_num_(r.media, cb), tend: CertCalDoc_num_(r.tendencia, cb),
        u: CertCalDoc_num_(r.incertezaU95, cb), k: CertCalDoc_num_(r.k, 2), veff: CertCalDoc_veff_(r.veff), em: CertCalDoc_num_(r.erroMaximo, cb),
        leit: (r.leituras || []).map(function (x) { return CertCalDoc_num_(x, cb); })
      };
      permitidos.push(v.vr, v.media, v.tend, v.u, v.k, v.veff, v.em, CertCalDoc_num_(Math.abs(r.tendencia), cb));
      permitidos = permitidos.concat(v.leit);
      linhas.push('  Ponto VR ' + v.vr + ' ' + un + ': leituras ' + v.leit.join('; ') + '; média ' + v.media + '; tendência ' + v.tend + '; U95 ' + v.u + '; k ' + v.k + '; Veff ' + v.veff + '; |tendência| + U95 = ' + v.em);
    });
    permitidos.push(CertCalDoc_num_(Math.abs(b.piorTendencia), cb), CertCalDoc_num_(b.piorIncertezaU95, cb), CertCalDoc_num_(b.piorErroMaximo, cb));
  });
  var prompt = [
    'Você é engenheiro de metrologia e redige, em português do Brasil, o relatório interpretativo de um certificado de calibração já emitido.',
    'Escreva para o setor de qualidade de um hospital: linguagem técnica, sóbria e clara, sem marketing, sem emojis, sem markdown, sem listas, sem inglês.',
    'REGRAS OBRIGATÓRIAS:',
    '1. Cite somente os valores numéricos fornecidos abaixo, exatamente como estão escritos (vírgula decimal). Não calcule, não arredonde e não invente valores, percentuais ou tolerâncias.',
    '2. Não declare aprovação, reprovação, conformidade, aptidão para uso nem "dentro/fora da tolerância": a decisão de uso é do cliente, que deve comparar os resultados com os seus requisitos (erro máximo admissível).',
    '3. Não cite marcas, fabricantes nem nomes de pessoas.',
    '4. Explique o significado de tendência, incerteza expandida U95, fator k e Veff com os números do certificado, destacando o ponto de maior |tendência| + U95 de cada grandeza.',
    '5. A incerteza considera a repetibilidade das leituras, a incerteza dos padrões e a resolução do instrumento.',
    '6. Não repita o que o documento já traz: a identificação do cliente e do equipamento está na seção 1, a tabela completa de resultados está no certificado e cada grandeza terá um gráfico de tendência ± U95. Não liste os pontos um a um; resuma as faixas de tendência e de U95 de cada grandeza e destaque o ponto de maior |tendência| + U95. Não escreva que o relatório não substitui o certificado (isso já consta na abertura).',
    '7. A frase de que os resultados não constituem declaração de conformidade aparece uma vez só, no fim de "conclusaoTecnica"; não a repita nas outras chaves.',
    'Responda apenas com um objeto JSON com as chaves: "introducao" (1 parágrafo), "resultadosExplicados" (1 a 3 parágrafos separados por linha em branco), "conclusaoTecnica" (1 parágrafo), "conclusaoLeigo" (1 parágrafo curto, para quem não é da área).',
    '',
    'DADOS DO CERTIFICADO',
    'Certificado nº ' + ctx.numeroCertificado + '; data da calibração ' + ctx.dataCalibracao + '; emissão ' + ctx.dataEmissao + '.',
    'Equipamento: ' + ((ctx.equipamento || {}).descricao || '') + ', TAG ' + ((ctx.equipamento || {}).tag || '') + '.',
    'Probabilidade de abrangência: ' + CERTCAL_CFG.PROBABILIDADE_ABRANGENCIA_TEXTO + '.',
    linhas.join('\n')
  ].join('\n');
  var r = RelTecIA_gerarJson_(prompt, { temperatura: 0.2, maxTokens: 8192, campos: ['introducao', 'resultadosExplicados', 'conclusaoTecnica', 'conclusaoLeigo'] });
  if (!r.ok) {
    padrao._aviso = 'O relatório interpretativo saiu com o texto padrão, sem a redação da IA: ' + r.aviso + '.';
    return padrao;
  }
  var textos = { introducao: String(r.dados.introducao).trim(), resultadosExplicados: String(r.dados.resultadosExplicados).trim(), conclusaoTecnica: String(r.dados.conclusaoTecnica).trim(), conclusaoLeigo: String(r.dados.conclusaoLeigo).trim() };
  var tudo = [textos.introducao, textos.resultadosExplicados, textos.conclusaoTecnica, textos.conclusaoLeigo].join('\n');
  var fora = RelTecIA_numerosForaDaLista_(tudo, permitidos);
  var fabricante = RelTecIA_temFabricante_(tudo, [(ctx.equipamento || {}).fabricante]);
  if (fora.length || RelTecIA_temVeredito_(tudo) || fabricante) {
    padrao._aviso = 'O relatório interpretativo saiu com o texto padrão: a redação da IA ' + (fora.length ? 'citou valores que não constam do certificado (' + fora.slice(0, 3).join('; ') + ')' : fabricante ? 'citou o fabricante do equipamento' : 'continha declaração de aprovação ou conformidade') + ' e foi descartada.';
    return padrao;
  }
  return textos;
}
