/****************************************************
 * SGO_Qualidade_Auvo.js
 * PAINEL DE QUALIDADE — coletor da área Auvo (O.S. de campo)
 *
 * Só leitura, lê AUVO_TAREFAS direto (mesmo padrão de
 * montarAuvoResumoDashboard_, SGO_Main.js, sem chamar API do Auvo de novo).
 * PRIORIDADE (tarefa.priority, cru do Auvo) não é usada aqui — não há
 * decodificação confirmada do valor numérico/enum em nenhum outro lugar do
 * projeto, não vale arriscar interpretar errado.
 ****************************************************/

/**
 * O que falta no registro de uma O.S. concluída (relato, foto, check-in, check-out,
 * questionário). opcoes.semVinculo=true também aponta "vínculo Portal ausente" (o painel
 * mostra); a central de pendências (SGO_Alertas_Central.js) passa false porque O.S. sem
 * vínculo é pendência própria do Auvo — assim a mesma falta não conta duas vezes.
 */
function QualidadeAuvo_motivosTarefa_(t, opcoes) {
  var motivos = [];
  var questionarioVazio = true;
  try { var arr = JSON.parse(t.QUESTIONARIO_JSON || '[]'); questionarioVazio = !Array.isArray(arr) || arr.length === 0; } catch (e) { questionarioVazio = true; }
  if (!SGO_UTILS.safe(t.RELATO_SERVICO)) motivos.push('relato ausente');
  if (!(Number(t.QTD_FOTOS) > 0)) motivos.push('foto ausente');
  if (!SGO_UTILS.safe(t.CHECKIN_EM)) motivos.push('check-in ausente');
  if (!SGO_UTILS.safe(t.CHECKOUT_EM)) motivos.push('check-out ausente');
  if (questionarioVazio) motivos.push('questionário vazio');
  if (opcoes && opcoes.semVinculo && (!t.CLIENTE_ID_SGO || !t.TECNICO_ID_SGO)) motivos.push('vínculo Portal ausente');
  return motivos;
}

// `desde` (Date, opcional) — quando informado, só entram tarefas com
// DATA_TAREFA >= desde. Painel (sem período) chama sem argumento e vê tudo;
// o relatório A4 (Qualidade_Relatorio.js) passa a data de corte do período.
function QualidadeAuvo_coletar_(desde) {
  try {
    var aba = SGO_CFG.SHEETS.AUVO_TAREFAS;
    try { SGO_DATA.getSheet(aba); } catch (e) { return null; }
    var parseDataTarefa_ = function(v) {
      if (!v) return null;
      var m=String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})/);
      var d = (v instanceof Date) ? v : (m?new Date(Number(m[3]),Number(m[2])-1,Number(m[1])):new Date(String(v)));
      return (d && !isNaN(d.getTime())) ? d : null;
    };
    var tarefas = SGO_DATA.getAll(aba);
    if (desde) tarefas = tarefas.filter(function(t) { var dt = parseDataTarefa_(t.DATA_TAREFA); return dt && dt >= desde; });
    if (!tarefas.length) return { total: 0 };

    var indiceUsuarios = {};
    SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_USUARIOS).forEach(function(u) { indiceUsuarios[u.ID] = u; });
    var indiceClientes = {};
    SGO_DATA.getAll(SGO_CFG.SHEETS.CAD_CLIENTES).forEach(function(c) { indiceClientes[c.ID] = c; });

    var nomeTecnico_ = function(t) {
      var u = indiceUsuarios[t.TECNICO_ID_SGO];
      if (u) return SGO_UTILS.safe(u.NOME);
      if (SGO_UTILS.safe(t.TECNICO_NOME_AUVO)) return SGO_UTILS.safe(t.TECNICO_NOME_AUVO);
      return t.TECNICO_AUVO_ID ? ('Técnico Auvo #' + t.TECNICO_AUVO_ID) : 'Técnico não identificado';
    };
    var nomeCliente_ = function(t) {
      var c = indiceClientes[t.CLIENTE_ID_SGO];
      if (c) return SGO_UTILS.safe(c.NOME_FANTASIA) || SGO_UTILS.safe(c.RAZAO_SOCIAL);
      if (SGO_UTILS.safe(t.CLIENTE_NOME_AUVO)) return SGO_UTILS.safe(t.CLIENTE_NOME_AUVO);
      return t.CLIENTE_AUVO_ID ? ('Cliente Auvo #' + t.CLIENTE_AUVO_ID) : 'Cliente não identificado';
    };
    var parseData_ = function(v) {
      if (!v) return null;
      var m=String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
      var d = (v instanceof Date) ? v : (m?new Date(Number(m[3]),Number(m[2])-1,Number(m[1]),Number(m[4]||0),Number(m[5]||0)):new Date(String(v)));
      return (d && !isNaN(d.getTime())) ? d : null;
    };
    var questionarioVazio_ = function(json) {
      try { var arr = JSON.parse(json || '[]'); return !Array.isArray(arr) || arr.length === 0; } catch (e) { return true; }
    };

    var contagemOcorrencias = (typeof Qualidade_contarOcorrenciasAbertasPorPessoa_ === 'function') ? Qualidade_contarOcorrenciasAbertasPorPessoa_() : {};

    var semRelato = 0, semFoto = 0, semCheckin = 0, finalizadasSemCheckout = 0, finalizadas = 0;
    var semVinculo = 0, questionariosVazios = 0;
    var porTipo = {}, porCliente = {}, porTecnico = {};
    var duracoesPorTecnico = {}; // minutos
    var pendenciasDetalhadas=[];

    tarefas.forEach(function(t) {
      var finalizada = SGO_UTILS.safeUpper(t.FINALIZADA) === 'SIM';
      if (finalizada) finalizadas++;
      if (finalizada && !SGO_UTILS.safe(t.RELATO_SERVICO)) semRelato++;
      if (finalizada && !(Number(t.QTD_FOTOS) > 0)) semFoto++;
      if (finalizada && !SGO_UTILS.safe(t.CHECKIN_EM)) semCheckin++;
      if (finalizada && !SGO_UTILS.safe(t.CHECKOUT_EM)) finalizadasSemCheckout++;
      if (!t.CLIENTE_ID_SGO || !t.TECNICO_ID_SGO) semVinculo++;
      if (finalizada && questionarioVazio_(t.QUESTIONARIO_JSON)) questionariosVazios++;

      var tipo = SGO_UTILS.safe(t.TIPO_TAREFA) || 'Não informado';
      porTipo[tipo] = (porTipo[tipo] || 0) + 1;
      var cliente = nomeCliente_(t);
      porCliente[cliente] = (porCliente[cliente] || 0) + 1;

      var chaveTecnico = t.TECNICO_ID_SGO || (t.TECNICO_AUVO_ID ? ('auvo:' + t.TECNICO_AUVO_ID) : 'sem_tecnico');
      if (!porTecnico[chaveTecnico]) porTecnico[chaveTecnico] = { id: t.TECNICO_ID_SGO || '', nome: nomeTecnico_(t), qtd: 0, avaliadas:0, semRelato: 0, semFoto: 0 };
      porTecnico[chaveTecnico].qtd++;
      if(finalizada){porTecnico[chaveTecnico].avaliadas++;if (!SGO_UTILS.safe(t.RELATO_SERVICO)) porTecnico[chaveTecnico].semRelato++;if (!(Number(t.QTD_FOTOS) > 0)) porTecnico[chaveTecnico].semFoto++;}
      if(finalizada){var motivos=QualidadeAuvo_motivosTarefa_(t,{semVinculo:true});if(motivos.length&&pendenciasDetalhadas.length<30)pendenciasDetalhadas.push({os:String(t.AUVO_TASK_ID||''),tecnico:nomeTecnico_(t),cliente:nomeCliente_(t),data:String(t.DATA_TAREFA||''),motivos:motivos,link:String(t.TASK_URL||'')});}

      var checkin = parseData_(t.CHECKIN_EM), checkout = parseData_(t.CHECKOUT_EM);
      if (checkin && checkout && checkout > checkin) {
        var minutos = (checkout.getTime() - checkin.getTime()) / 60000;
        if (minutos > 0 && minutos < 12 * 60) { // descarta outlier absurdo (>12h — provável esquecimento de checkout de outro dia)
          if (!duracoesPorTecnico[chaveTecnico]) duracoesPorTecnico[chaveTecnico] = [];
          duracoesPorTecnico[chaveTecnico].push(minutos);
        }
      }
    });

    var tecnicosArr = Object.keys(porTecnico).map(function(k) { return porTecnico[k]; });

    var rankingVolume = tecnicosArr.slice().sort(function(a, b) { return b.qtd - a.qtd; }).slice(0, 5)
      .map(function(r) { return { id: r.id, nome: r.nome, qtd: r.qtd }; });

    var comScore = tecnicosArr.filter(function(r) { return r.avaliadas >= 3; })
      .map(function(r) {
        var pctSemRelato = Math.round((r.semRelato / r.avaliadas) * 100);
        var pctSemFoto = Math.round((r.semFoto / r.avaliadas) * 100);
        return { id: r.id, nome: r.nome, qtd: r.avaliadas, pctSemRelato: pctSemRelato, pctSemFoto: pctSemFoto, score: pctSemRelato + pctSemFoto };
      });
    var rankingPiorQualidade = comScore.filter(function(r) { return r.score > 0; })
      .sort(function(a, b) { return b.score - a.score; }).slice(0, 5);
    // Destaques (pra reconhecer/parabenizar): 3+ atendimentos, 100% com
    // relato E com foto, ordenado por quem fez mais volume assim.
    var rankingDestaques = comScore.filter(function(r) { return r.score === 0; })
      .sort(function(a, b) { return b.qtd - a.qtd; }).slice(0, 5);

    var rankingTempoMedio = Object.keys(duracoesPorTecnico).map(function(k) {
      var lista = duracoesPorTecnico[k];
      var soma = lista.reduce(function(a, b) { return a + b; }, 0);
      return { id: porTecnico[k].id, nome: porTecnico[k].nome, qtd: lista.length, mediaMin: Math.round(soma / lista.length) };
    }).filter(function(r) { return r.qtd >= 2; }).sort(function(a, b) { return a.mediaMin - b.mediaMin; });
    // extremos: os 3 mais rápidos e os 3 mais demorados (outlier pra qualquer lado é achado)
    var tempoRapidos = rankingTempoMedio.slice(0, 3);
    var tempoLentos = rankingTempoMedio.slice(-3).reverse().filter(function(r) { return tempoRapidos.indexOf(r) === -1; });

    var tiposMaisComuns = Object.keys(porTipo).map(function(k) { return { tipo: k, qtd: porTipo[k] }; })
      .sort(function(a, b) { return b.qtd - a.qtd; }).slice(0, 3);
    var clientesMaisAtendidos = Object.keys(porCliente).map(function(k) { return { nome: k, qtd: porCliente[k] }; })
      .sort(function(a, b) { return b.qtd - a.qtd; }).slice(0, 5);

    // ocorrências abertas dos técnicos do ranking de pior qualidade — dá pra
    // ver na hora se já tem cobrança em andamento com aquela pessoa ou não.
    rankingPiorQualidade.forEach(function(r) { r.ocorrenciasAbertas = contagemOcorrencias[r.id || r.nome] || 0; });
    rankingDestaques.forEach(function(r) { r.ocorrenciasAbertas = contagemOcorrencias[r.id || r.nome] || 0; });

    return {
      total: tarefas.length,
      finalizadas: finalizadas,
      pctSemRelato: finalizadas?Math.round((semRelato / finalizadas) * 100):0,
      pctSemFoto: finalizadas?Math.round((semFoto / finalizadas) * 100):0,
      pctSemCheckin: finalizadas?Math.round((semCheckin / finalizadas) * 100):0,
      pctQuestionarioVazio: finalizadas?Math.round((questionariosVazios / finalizadas) * 100):0,
      semRelato:semRelato,semFoto:semFoto,questionariosVazios:questionariosVazios,
      finalizadasSemCheckout: finalizadasSemCheckout,
      semVinculo: semVinculo,
      rankingVolume: rankingVolume,
      rankingPiorQualidade: rankingPiorQualidade,
      rankingDestaques: rankingDestaques,
      tempoRapidos: tempoRapidos,
      tempoLentos: tempoLentos,
      tiposMaisComuns: tiposMaisComuns,
      clientesMaisAtendidos: clientesMaisAtendidos
      ,pendenciasDetalhadas:pendenciasDetalhadas
    };
  } catch (e) {
    return {total:0,indisponivel:true,erro:String(e&&e.message||e)};
  }
}
