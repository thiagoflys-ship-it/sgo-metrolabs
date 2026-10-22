/****************************************************
 * ASSISTÊNCIA TÉCNICA — ORDEM DE SERVIÇO (21/10/2026)
 *
 * Um processador único de eventos de campo serve o aplicativo do técnico (Ast_appSincronizar) e a tela do computador:
 * SAIU, CHEGUEI, RESPOSTA, FOTO, RELATO, PECA, ASSINATURA, CONCLUI. Cada evento confere a sessão, o técnico responsável e a
 * situação da O.S.; o chamado acompanha pelas transições permitidas (AST_TRANSICOES). Localização só em Cheguei e Concluí.
 * A O.S. só fecha com a documentação completa do tipo de serviço: chegada, relato, condição encontrada, teste, série ou
 * QR conferido, checklist obrigatório, fotos mínimas e assinatura do cliente (ou a exceção "responsável ausente" com o
 * nome de quem recebeu e a justificativa). Sem isso fica "Documentação pendente" e vira cobrança. Série diferente do
 * cadastro é aceita e avisada à gestão (o cadastro não muda sozinho). Peça em falta abre pedido em Compras.
 ****************************************************/

var AST_ASS_MIN = 800, AST_ASS_MAX = 200000;
var AST_RX_FOTO = /\.(jpe?g|png|webp)$/i;

function AstO_obter_(eu, id, acao) {
  var os = Ast_porId_(AST_ABAS.OS, id);
  if (!os) throw new Error('Não foi possível ' + acao + ': a O.S. não foi encontrada. Atualize a tela (ou o Meu dia no aplicativo) e tente de novo');
  if (eu.cliente) { if (Ast_s_(os.CLIENTE_ID) !== eu.clienteId) throw new Error('Não foi possível ' + acao + ': esta O.S. não é do seu cliente'); return os; }
  if (!eu.gestao && eu.tecnico && Ast_s_(os.TECNICO_ID) !== eu.id) throw new Error('Não foi possível ' + acao + ': a O.S. ' + os.NUMERO + ' é de ' + (Ast_s_(os.TECNICO_NOME) || 'outro técnico') + '. Fale com a gestão da área Técnica se ela deveria ser sua');
  return os;
}
/** Quem pode registrar campo: o técnico responsável; a gestão registra em nome dele (fica no histórico). */
function AstO_exigirCampo_(eu, os, acao) {
  if (eu.gestao || Ast_s_(os.TECNICO_ID) === eu.id) return;
  throw new Error('Não foi possível ' + acao + ': a O.S. ' + os.NUMERO + ' é de ' + (Ast_s_(os.TECNICO_NOME) || 'outro técnico') + '. Só o técnico responsável (ou a gestão da área Técnica) registra o atendimento');
}
function AstO_fotos_(osId) { return Ast_ler_(AST_ABAS.FOTOS).filter(function (f) { return Ast_s_(f.OS_ID) === Ast_s_(osId) && Ast_up_(f.ATIVA || 'SIM') !== 'NAO'; }); }
function AstO_pecas_(osId) { return Ast_ler_(AST_ABAS.PECAS).filter(function (p) { return Ast_s_(p.OS_ID) === Ast_s_(osId) && Ast_up_(p.ATIVA || 'SIM') !== 'NAO'; }); }
function AstO_perguntas_(os) { return Ast_normPerguntas_(Ast_json_(os.PERGUNTAS_JSON, [])); }
function AstO_respostas_(os) { return Ast_json_(os.RESPOSTAS_JSON, {}) || {}; }

/** O que falta para fechar (lista de frases; vazia = pode encerrar). */
function AstO_faltas_(os, fotos, regras) {
  regras = regras || Ast_regras_();
  fotos = fotos || AstO_fotos_(os.ID);
  var tipo = Ast_tipo_(os.TIPO_CODIGO) || { exige: { relato: true, assinatura: true, fotosMin: 0, qrOuSerie: false }, semVisita: false };
  var f = [];
  if (!tipo.semVisita && !Ast_s_(os.CHEGOU_EM)) f.push('registrar a chegada (Cheguei)');
  if (tipo.exige.relato) {
    if (Ast_s_(os.RELATO).length < 10 && Ast_s_(os.SERVICO_REALIZADO).length < 10) f.push('o relato do serviço realizado');
    if (!tipo.semVisita && Ast_s_(os.CONDICAO_ENCONTRADA).length < 3) f.push('a condição encontrada');
    if (tipo.grupo === 'TECNICO' && Ast_s_(os.TESTE_FUNCIONAL).length < 3) f.push('o teste funcional');
  }
  if (tipo.exige.qrOuSerie) {
    if (!Ast_s_(os.EQUIPAMENTO_ID)) f.push('o equipamento ligado ao cadastro (a gestão liga na ficha do chamado)');
    else if (!Ast_s_(os.SERIE_CONFIRMADA) && !Ast_s_(os.IDENTIFICADO_POR)) f.push('a conferência do equipamento (ler o QR ou digitar a série)');
  }
  var resp = AstO_respostas_(os), perg = AstO_perguntas_(os);
  var faltaPerg = perg.filter(function (p) {
    if (!p.obrigatoria || p.tipo === 'ASSINATURA') return false;
    if (p.tipo === 'FOTO') return fotos.filter(function (x) { return Ast_s_(x.PERGUNTA_ID) === p.id; }).length < (p.fotosMin || 1);
    var r = resp[p.id];
    return !r || (Array.isArray(r.v) ? !r.v.length : !Ast_s_(r.v));
  });
  var semFoto = faltaPerg.filter(function (p) { return p.tipo === 'FOTO'; }), outras = faltaPerg.filter(function (p) { return p.tipo !== 'FOTO'; });
  if (outras.length) f.push(outras.length === 1 ? 'responder "' + outras[0].texto + '"' : 'responder ' + outras.length + ' perguntas obrigatórias do checklist');
  semFoto.forEach(function (p) { f.push('a foto "' + p.texto + '"'); });
  var minFotos = Number(tipo.exige.fotosMin) || 0;
  if (fotos.length < minFotos) { var n = minFotos - fotos.length; if (!semFoto.length || n > semFoto.length) f.push(Ast_plural_(n, 'foto', 'fotos') + ' (mínimo ' + minFotos + ' para ' + (tipo.nome || 'este serviço') + ')'); }
  var precisaAss = tipo.exige.assinatura && regras.assinatura && regras.assinatura.obrigatoria !== false;
  if (precisaAss && !Ast_s_(os.ASSINATURA_ARQUIVO_ID)) {
    var semOk = AST_MOTIVOS_SEM_ASSINATURA[Ast_up_(os.SEM_ASSINATURA_MOTIVO)] && Ast_s_(os.SEM_ASSINATURA_RECEBIDO_POR).length >= 3 && Ast_s_(os.SEM_ASSINATURA_JUSTIFICATIVA).length >= 10;
    if (!semOk) f.push('a assinatura do cliente (ou "responsável ausente" com o nome de quem recebeu e a justificativa)');
  }
  if (Ast_sim_(os.AGUARDANDO_PECA)) f.push('a peça que falta (pedido de compra aberto); depois de trocar, conclua de novo');
  return f;
}

/** Leva o chamado até a situação alvo pelos passos permitidos (ex.: Agendado -> No local -> Em execução -> Documentação pendente). */
function AstO_chamadoPara_(eu, c, alvo, campos, tipoEv, texto) {
  if (!c) return c;
  var s = Ast_up_(c.SITUACAO);
  if (s === alvo) { if (campos && Object.keys(campos).length) { Ast_atualizar_(AST_ABAS.CHAMADOS, c.ID, Object.assign({ ATUALIZADO_EM: Ast_agora_() }, campos)); return Object.assign({}, c, campos); } return c; }
  var fila = [[s]], vistos = {}, caminho = null;
  vistos[s] = true;
  while (fila.length && !caminho) {
    var p = fila.shift(), u = p[p.length - 1];
    (AST_TRANSICOES[u] || []).forEach(function (n) {
      if (caminho || vistos[n] || n === 'CANCELADO' || n === 'PLANEJADO' && alvo !== 'PLANEJADO') return;
      vistos[n] = true;
      var q = p.concat([n]);
      if (n === alvo) caminho = q; else fila.push(q);
    });
  }
  if (!caminho) return c;
  for (var i = 1; i < caminho.length; i++) {
    var ultimo = i === caminho.length - 1;
    c = AstC_mudar_(eu, c, caminho[i], ultimo ? campos : {}, ultimo ? tipoEv : 'CAMPO', ultimo ? texto : 'Atendimento em campo');
  }
  return c;
}

/** Data do aparelho aceita (não pode estar no futuro nem ter mais de 7 dias); senão a do servidor. */
function AstO_horaCampo_(em) {
  var ms = Ast_ms_(em), agora = Date.now();
  if (ms === null || ms > agora + 5 * 60000 || ms < agora - 7 * 864e5) return Ast_agora_(agora);
  return Ast_agora_(ms);
}
function AstO_coord_(d) {
  var lat = Ast_num_(d && d.lat), lng = Ast_num_(d && d.lng), pr = Ast_num_(d && d.precisao);
  if (!(lat >= -90 && lat <= 90) || !(lng >= -180 && lng <= 180) || (lat === 0 && lng === 0)) return null;
  return { lat: Math.round(lat * 1e6) / 1e6, lng: Math.round(lng * 1e6) / 1e6, precisao: pr >= 0 ? Math.round(pr) : '' };
}
function AstO_distanciaUnidade_(os, co) {
  var un = Ast_mapa_(SGO_CFG.SHEETS.CAD_UNIDADES)[Ast_s_(os.UNIDADE_ID)];
  if (!un) return null;
  var lat = Ast_num_(un.LATITUDE !== undefined ? un.LATITUDE : un.LAT), lng = Ast_num_(un.LONGITUDE !== undefined ? un.LONGITUDE : un.LNG);
  if (!(lat >= -90 && lat <= 90) || !(lng >= -180 && lng <= 180) || (lat === 0 && lng === 0)) return null;
  return Ast_distM_(co.lat, co.lng, lat, lng);
}
function AstO_valorResposta_(p, v) {
  if (v === null || v === undefined) return { erro: 'resposta vazia' };
  if (p.tipo === 'SIM_NAO') { var x = Ast_up_(v); x = { S: 'SIM', N: 'NAO', 'NÃO': 'NAO', TRUE: 'SIM', FALSE: 'NAO', 'N/A': 'NA' }[x] || x; return ['SIM', 'NAO', 'NA'].indexOf(x) >= 0 ? { v: x } : { erro: 'use SIM, NAO ou NA' }; }
  if (p.tipo === 'NUMERO') { var n = Ast_num_(v); return isFinite(n) && !isNaN(n) ? { v: n } : { erro: 'a resposta precisa ser um número' }; }
  if (p.tipo === 'DATA') { var d = Ast_dia_(v); return d ? { v: d } : { erro: 'a data precisa estar como AAAA-MM-DD' }; }
  if (p.tipo === 'OPCAO') { var o = Ast_s_(v); return (p.opcoes || []).indexOf(o) >= 0 ? { v: o } : { erro: 'escolha uma das opções: ' + (p.opcoes || []).join(', ') }; }
  if (p.tipo === 'MULTIPLA') { var l = (Array.isArray(v) ? v : String(v).split('|')).map(Ast_s_).filter(Boolean); var ruim = l.filter(function (k) { return (p.opcoes || []).indexOf(k) < 0; }); return ruim.length ? { erro: 'opção que não existe: ' + ruim.join(', ') } : { v: l }; }
  if (p.tipo === 'FOTO' || p.tipo === 'ASSINATURA') return { erro: 'pergunta de ' + (p.tipo === 'FOTO' ? 'foto: envie com Ast_appEnviarFoto' : 'assinatura: use o evento ASSINATURA') };
  return { v: Ast_texto_(v, 3000) };
}
function AstO_normSerie_(s) { return Ast_semAcento_(s).replace(/[^A-Z0-9]/g, ''); }

/**
 * Aplica um evento de campo. ev: { tipo, osId, em, dados, idLocal }. Chamar dentro da trava (Ast_comTrava_).
 * Devolve { ok:true, nota } ou { ok:false, motivo, corrigir, definitivo }.
 */
function AstO_aplicarEvento_(eu, ev, ctx) {
  ctx = ctx || {};
  var tipo = Ast_up_(ev.tipo), d = ev.dados || {};
  var tipos = ['SAIU', 'CHEGUEI', 'RESPOSTA', 'FOTO', 'RELATO', 'PECA', 'ASSINATURA', 'CONCLUI'];
  if (tipos.indexOf(tipo) < 0) return { ok: false, definitivo: true, motivo: 'tipo de evento desconhecido (' + tipo + ')', corrigir: 'Atualize o aplicativo: os tipos aceitos são ' + tipos.join(', ') + '.' };
  var os = Ast_porId_(AST_ABAS.OS, ev.osId);
  if (!os) return { ok: false, definitivo: true, motivo: 'a O.S. não existe mais no servidor', corrigir: 'Atualize o Meu dia; se a O.S. sumiu, fale com a gestão da área Técnica.' };
  if (!eu.gestao && Ast_s_(os.TECNICO_ID) !== eu.id) return { ok: false, definitivo: true, motivo: 'a O.S. ' + os.NUMERO + ' é de ' + (Ast_s_(os.TECNICO_NOME) || 'outro técnico'), corrigir: 'Fale com a gestão da área Técnica se ela deveria ser sua.' };
  var s = Ast_up_(os.SITUACAO);
  if (s === 'ENCERRADA' || s === 'CANCELADA') return { ok: false, definitivo: true, motivo: 'a O.S. ' + os.NUMERO + ' já está ' + (s === 'ENCERRADA' ? 'encerrada' : 'cancelada'), corrigir: 'Nada a fazer no aplicativo. Correção depois do encerramento é feita pela gestão, na tela do computador.' };
  var tipoOs = Ast_tipo_(os.TIPO_CODIGO) || { semVisita: false, exige: {} };
  var agora = Ast_agora_(), hora = AstO_horaCampo_(ev.em), c = Ast_porId_(AST_ABAS.CHAMADOS, os.CHAMADO_ID);
  var extraEv = { numero: os.NUMERO, emAparelho: ev.em, idLocal: ev.idLocal };
  var gravar = function (campos) { campos.ATUALIZADO_EM = agora; campos.ULTIMA_SINC_EM = agora; Ast_atualizar_(AST_ABAS.OS, os.ID, campos); os = Object.assign({}, os, campos); };
  var noLocal = ['NO_LOCAL', 'EM_EXECUCAO', 'PAUSADA', 'DOC_PENDENTE'];
  var exigeLocal = function () { return tipoOs.semVisita || noLocal.indexOf(s) >= 0; };
  var iniciarExecucao = function () {
    if (s === 'NO_LOCAL' || (tipoOs.semVisita && (s === 'AGENDADA' || s === 'EM_DESLOCAMENTO'))) {
      gravar({ SITUACAO: 'EM_EXECUCAO', INICIO_EM: Ast_s_(os.INICIO_EM) || hora });
      s = 'EM_EXECUCAO';
      c = AstO_chamadoPara_(eu, c, 'EM_EXECUCAO', {}, 'INICIO_SERVICO', 'Serviço iniciado');
    }
  };
  switch (tipo) {
    case 'SAIU':
      if (s !== 'AGENDADA') return { ok: true, nota: 'saída já registrada ou atendimento em andamento' };
      gravar({ SITUACAO: 'EM_DESLOCAMENTO', SAIU_EM: hora });
      c = AstO_chamadoPara_(eu, c, 'EM_DESLOCAMENTO', {}, 'SAIU', 'Técnico saiu para o atendimento');
      Ast_evento_('OS', os.ID, 'SAIU', eu, 'Saiu para o atendimento', extraEv);
      return { ok: true };
    case 'CHEGUEI':
      if (['AGENDADA', 'EM_DESLOCAMENTO', 'PAUSADA'].indexOf(s) < 0) return { ok: true, nota: 'chegada já registrada' };
      var co = AstO_coord_(d), obs = '';
      var campos = { SITUACAO: 'NO_LOCAL', CHEGOU_EM: Ast_s_(os.CHEGOU_EM) || hora, CHEGOU_EM_APARELHO: Ast_iso_(ev.em) };
      if (co) {
        campos.CHEGOU_LAT = co.lat; campos.CHEGOU_LNG = co.lng; campos.CHEGOU_PRECISAO = co.precisao;
        var dist = AstO_distanciaUnidade_(os, co);
        if (dist !== null) {
          campos.CHEGOU_DIST_M = dist;
          var lim = Number(Ast_regras_().localizacao.distanciaAvisoMetros) || 1000;
          if (dist > lim) obs = 'Chegada registrada a ' + Ast_fmtNum_(dist / 1000, 1) + ' km do endereço da unidade.';
        }
      } else obs = 'Chegada sem localização (o aparelho não informou).';
      if (obs) campos.OBS_LOCALIZACAO = Ast_texto_([Ast_s_(os.OBS_LOCALIZACAO), obs].filter(Boolean).join(' '), 500);
      gravar(campos); s = 'NO_LOCAL';
      c = AstO_chamadoPara_(eu, c, 'NO_LOCAL', {}, 'CHEGUEI', 'Técnico chegou ao cliente' + (obs ? ' (' + obs + ')' : ''));
      Ast_evento_('OS', os.ID, 'CHEGUEI', eu, 'Chegou ao cliente' + (obs ? '. ' + obs : ''), extraEv);
      if (obs && /km do endere/.test(obs)) Ast_avisar_(Ast_gestoresTecnica_(), 'LOCALIZACAO', 'Chegada longe do endereço: ' + os.NUMERO, obs + ' Técnico ' + Ast_s_(os.TECNICO_NOME) + '. Não bloqueia; confira se o endereço da unidade está certo.', os.ID, { autorId: eu.id });
      return { ok: true, nota: obs };
    case 'RESPOSTA':
      if (!exigeLocal()) return { ok: false, definitivo: false, motivo: 'a chegada ainda não foi registrada', corrigir: 'Toque em "Cheguei" antes de responder o checklist e sincronize de novo.' };
      var p = AstO_perguntas_(os).filter(function (x) { return x.id === Ast_s_(d.perguntaId); })[0];
      if (!p) return { ok: false, definitivo: false, motivo: 'a pergunta ' + Ast_s_(d.perguntaId) + ' não existe no checklist desta O.S.', corrigir: 'Atualize o Meu dia (puxe para baixo) e responda de novo.' };
      var val = AstO_valorResposta_(p, d.valor);
      if (val.erro) return { ok: false, definitivo: false, motivo: '"' + p.texto + '": ' + val.erro, corrigir: 'Corrija a resposta e sincronize de novo.' };
      iniciarExecucao();
      var resp = AstO_respostas_(os), ant = resp[p.id];
      resp[p.id] = { v: val.v, em: hora, por: eu.nome };
      gravar({ RESPOSTAS_JSON: JSON.stringify(resp) });
      Ast_evento_('OS', os.ID, 'RESPOSTA', eu, p.texto + ': ' + (Array.isArray(val.v) ? val.v.join(', ') : String(val.v)), Object.assign({ de: ant ? String(Array.isArray(ant.v) ? ant.v.join(', ') : ant.v) : '' }, extraEv));
      return { ok: true };
    case 'FOTO':
      var foto = Ast_ler_(AST_ABAS.FOTOS).filter(function (x) { return Ast_s_(x.OS_ID) === Ast_s_(os.ID) && Ast_s_(x.ID_LOCAL) === Ast_s_(d.fotoIdLocal); })[0];
      if (!foto) return { ok: false, definitivo: false, motivo: 'a foto ' + Ast_s_(d.fotoIdLocal) + ' ainda não chegou ao servidor', corrigir: 'Envie a foto (Ast_appEnviarFoto) e sincronize de novo.' };
      var cf = {};
      if (d.perguntaId !== undefined) cf.PERGUNTA_ID = Ast_s_(d.perguntaId);
      if (d.legenda !== undefined) cf.LEGENDA = Ast_texto_(d.legenda, 200);
      if (d.remover === true) cf.ATIVA = 'NAO';
      Ast_atualizar_(AST_ABAS.FOTOS, foto.ID, cf);
      gravar({ QTD_FOTOS: AstO_fotos_(os.ID).length });
      Ast_evento_('OS', os.ID, d.remover === true ? 'FOTO_REMOVIDA' : 'FOTO', eu, (d.remover === true ? 'Foto retirada do relatório: ' : 'Foto ajustada: ') + Ast_s_(foto.NOME), extraEv);
      return { ok: true };
    case 'RELATO':
      if (!exigeLocal()) return { ok: false, definitivo: false, motivo: 'a chegada ainda não foi registrada', corrigir: 'Toque em "Cheguei" antes do relato e sincronize de novo.' };
      iniciarExecucao();
      var cr = {}, mapa = { relato: 'RELATO', condicaoEncontrada: 'CONDICAO_ENCONTRADA', causa: 'CAUSA', servicoRealizado: 'SERVICO_REALIZADO', testeFuncional: 'TESTE_FUNCIONAL', recomendacoes: 'RECOMENDACOES' };
      Object.keys(mapa).forEach(function (k) { if (d[k] !== undefined && d[k] !== null) cr[mapa[k]] = Ast_texto_(d[k], 4000); });
      if (d.identificadoPor !== undefined && ['QR', 'SERIE', 'TAG'].indexOf(Ast_up_(d.identificadoPor)) >= 0) cr.IDENTIFICADO_POR = Ast_up_(d.identificadoPor);
      var avisoSerie = '';
      if (d.serieConfirmada !== undefined && Ast_s_(d.serieConfirmada)) {
        cr.SERIE_CONFIRMADA = Ast_texto_(d.serieConfirmada, 80);
        if (!cr.IDENTIFICADO_POR && !Ast_s_(os.IDENTIFICADO_POR)) cr.IDENTIFICADO_POR = 'SERIE';
        var cad = Ast_s_(os.SERIE_CADASTRO);
        var div = !!cad && AstO_normSerie_(cad) !== AstO_normSerie_(cr.SERIE_CONFIRMADA);
        if (div && !Ast_sim_(os.SERIE_DIVERGENTE)) avisoSerie = 'Série no local ' + cr.SERIE_CONFIRMADA + ', no cadastro ' + cad + '.';
        cr.SERIE_DIVERGENTE = div ? 'SIM' : '';
      }
      if (!Object.keys(cr).length) return { ok: false, definitivo: false, motivo: 'o relato veio vazio', corrigir: 'Preencha pelo menos um campo do relato e sincronize de novo.' };
      gravar(cr);
      Ast_evento_('OS', os.ID, 'RELATO', eu, 'Relato atualizado' + (cr.RELATO ? ': ' + cr.RELATO.slice(0, 200) : ''), extraEv);
      if (avisoSerie) {
        Ast_evento_('OS', os.ID, 'SERIE_DIVERGENTE', eu, avisoSerie + ' O cadastro não foi alterado.', extraEv);
        Ast_avisar_(Ast_gestoresTecnica_(), 'SERIE_DIVERGENTE', 'Série divergente na ' + os.NUMERO, avisoSerie + ' Equipamento: ' + Ast_s_(os.EQUIPAMENTO_TEXTO) + ' (' + Ast_s_(os.CLIENTE_NOME) + '). Confira e corrija o cadastro em Cadastros > Equipamentos, se for o caso.', os.ID, { autorId: eu.id, evento: 'AT10' });
      }
      return { ok: true, nota: avisoSerie ? 'série diferente do cadastro: a gestão foi avisada' : '' };
    case 'PECA':
      if (Ast_s_(d.removerIdLocal)) {
        var pr = Ast_ler_(AST_ABAS.PECAS).filter(function (x) { return Ast_s_(x.OS_ID) === Ast_s_(os.ID) && Ast_s_(x.ID_LOCAL) === Ast_s_(d.removerIdLocal); })[0];
        if (!pr) return { ok: false, definitivo: true, motivo: 'a peça a desfazer (' + Ast_s_(d.removerIdLocal) + ') não foi encontrada', corrigir: 'Nada a fazer: ela não chegou ao servidor.' };
        Ast_atualizar_(AST_ABAS.PECAS, pr.ID, { ATIVA: 'NAO', REMOVIDA_EM: agora });
        gravar({ QTD_PECAS: AstO_pecas_(os.ID).filter(function (x) { return Ast_up_(x.SITUACAO) === 'APLICADA'; }).length });
        Ast_evento_('OS', os.ID, 'PECA_REMOVIDA', eu, 'Peça desfeita: ' + Ast_s_(pr.DESCRICAO), extraEv);
        return { ok: true };
      }
      if (!exigeLocal()) return { ok: false, definitivo: false, motivo: 'a chegada ainda não foi registrada', corrigir: 'Toque em "Cheguei" antes de lançar peças e sincronize de novo.' };
      var desc = Ast_texto_(d.descricao, 300), sitp = Ast_up_(d.situacao) === 'FALTA' ? 'FALTA' : 'APLICADA', q = Ast_num_(d.quantidade);
      if (desc.length < 3) return { ok: false, definitivo: false, motivo: 'a peça veio sem descrição', corrigir: 'Escreva o nome da peça (e o número, se tiver) e sincronize de novo.' };
      if (!(q > 0)) return { ok: false, definitivo: false, motivo: 'a quantidade da peça "' + desc + '" precisa ser maior que zero', corrigir: 'Corrija a quantidade e sincronize de novo.' };
      iniciarExecucao();
      var nova = Ast_inserir_(AST_ABAS.PECAS, { OS_ID: os.ID, ID_LOCAL: Ast_s_(ev.idLocal), DESCRICAO: desc, CODIGO: Ast_texto_(d.codigo, 80), QUANTIDADE: q, UNIDADE: Ast_texto_(d.unidade, 20) || 'un.',
        SITUACAO: sitp, URGENCIA: Ast_up_(d.urgencia), ATIVA: 'SIM', POR_ID: eu.id, POR_NOME: eu.nome });
      var cp = { QTD_PECAS: AstO_pecas_(os.ID).filter(function (x) { return Ast_up_(x.SITUACAO) === 'APLICADA'; }).length };
      if (sitp === 'FALTA') {
        cp.AGUARDANDO_PECA = 'SIM'; cp.SITUACAO = 'PAUSADA';
        gravar(cp); s = 'PAUSADA';
        if (c && (AST_TRANSICOES[Ast_up_(c.SITUACAO)] || []).indexOf('AGUARDANDO_PECA') >= 0) {
          c = AstC_mudar_(eu, c, 'AGUARDANDO_PECA', { PECA_DESCRICAO: desc, PROXIMA_ACAO: 'Aguardar a peça e agendar o retorno' }, 'AGUARDANDO_PECA', 'Falta de peça no atendimento ' + os.NUMERO + ': ' + desc);
        }
        var cc = c, pecaRow = nova, osNum = os.NUMERO;
        Ast_depois_(function () {
          var req = AstC_pedirPecaCompras_(eu, cc || { NUMERO: osNum, CLIENTE_ID: os.CLIENTE_ID, UNIDADE_ID: os.UNIDADE_ID, EQUIPAMENTO_ID: os.EQUIPAMENTO_ID, CLIENTE_NOME: os.CLIENTE_NOME, SINTOMA: '' },
            { descricao: desc, codigo: d.codigo, quantidade: q, urgencia: Ast_up_(d.urgencia) || 'ALTA', osNumero: osNum });
          if (req.numero) {
            Ast_atualizar_(AST_ABAS.PECAS, pecaRow.ID, { REQUISICAO_ID: req.id, REQUISICAO_NUMERO: req.numero });
            if (cc) Ast_atualizar_(AST_ABAS.CHAMADOS, cc.ID, { REQUISICAO_ID: req.id, REQUISICAO_NUMERO: req.numero, PROXIMA_ACAO: 'Aguardar a peça (pedido de compra ' + req.numero + ') e agendar o retorno' });
          }
          Ast_evento_('OS', os.ID, 'COMPRAS', eu, req.numero ? 'Pedido de compra ' + req.numero + ' aberto para ' + desc : 'Pedido de compra não aberto: ' + (req.aviso || ''), { numero: osNum });
        });
        Ast_avisar_(Ast_gestoresTecnica_(), 'PECA_FALTA', 'Falta de peça na ' + os.NUMERO, desc + ' (' + Ast_fmtNum_(q) + ') · ' + Ast_s_(os.CLIENTE_NOME) + '. O pedido de compra foi aberto; agende o retorno quando a peça chegar.', os.ID, { autorId: eu.id, evento: 'AT11' });
      } else gravar(cp);
      Ast_evento_('OS', os.ID, sitp === 'FALTA' ? 'PECA_FALTA' : 'PECA', eu, (sitp === 'FALTA' ? 'Falta de peça: ' : 'Peça aplicada: ') + Ast_fmtNum_(q) + ' × ' + desc + (Ast_s_(d.codigo) ? ' (' + Ast_s_(d.codigo) + ')' : ''), extraEv);
      return { ok: true, nota: sitp === 'FALTA' ? 'a O.S. ficou aguardando peça; o pedido de compra é aberto' : '' };
    case 'ASSINATURA':
      if (!exigeLocal()) return { ok: false, definitivo: false, motivo: 'a chegada ainda não foi registrada', corrigir: 'Toque em "Cheguei" antes da assinatura e sincronize de novo.' };
      if (d.semAssinatura === true || Ast_sim_(d.semAssinatura)) {
        var mot = Ast_up_(d.motivo), rec = Ast_texto_(d.recebidoPor, 120), just = Ast_texto_(d.justificativa, 1000);
        if (!AST_MOTIVOS_SEM_ASSINATURA[mot]) return { ok: false, definitivo: false, motivo: 'motivo de falta de assinatura não aceito', corrigir: 'Use o motivo RESPONSAVEL_AUSENTE.' };
        if (rec.length < 3) return { ok: false, definitivo: false, motivo: 'falta o nome de quem recebeu o serviço', corrigir: 'Escreva o nome de quem acompanhou e sincronize de novo.' };
        if (just.length < 10) return { ok: false, definitivo: false, motivo: 'a justificativa está curta', corrigir: 'Explique em pelo menos 10 letras por que o responsável não assinou.' };
        gravar({ SEM_ASSINATURA_MOTIVO: mot, SEM_ASSINATURA_RECEBIDO_POR: rec, SEM_ASSINATURA_JUSTIFICATIVA: just });
        Ast_evento_('OS', os.ID, 'SEM_ASSINATURA', eu, 'Sem assinatura (' + AST_MOTIVOS_SEM_ASSINATURA[mot] + '): recebido por ' + rec + '. ' + just, extraEv);
        return { ok: true };
      }
      var nome = Ast_texto_(d.nome, 120), img = String(d.imagem || '');
      if (nome.length < 3) return { ok: false, definitivo: false, motivo: 'falta o nome de quem assinou', corrigir: 'Escreva o nome de quem assinou e sincronize de novo.' };
      if (!/^data:image\/png;base64,[A-Za-z0-9+\/=]+$/.test(img) || img.length < AST_ASS_MIN) return { ok: false, definitivo: false, motivo: 'a assinatura veio vazia ou em formato errado', corrigir: 'Peça para o cliente assinar no quadro de novo (imagem PNG).' };
      if (img.length > AST_ASS_MAX) return { ok: false, definitivo: false, motivo: 'a imagem da assinatura está grande demais', corrigir: 'Limpe o quadro e peça para assinar de novo.' };
      var arq = null;
      try {
        var pasta = Ast_pastaPrivadaOS_(os.NUMERO);
        var blob = Utilities.newBlob(Utilities.base64Decode(img.replace(/^data:[^,]+,/, '')), 'image/png', 'Assinatura ' + os.NUMERO + ' - ' + nome.replace(/[\\\/:*?"<>|]/g, '') + '.png');
        arq = pasta.createFile(blob); Ast_privado_(arq);
      } catch (eA) { return { ok: false, definitivo: false, motivo: 'o servidor não conseguiu guardar a assinatura (' + String((eA && eA.message) || eA) + ')', corrigir: 'Tente sincronizar de novo em alguns minutos.' }; }
      gravar({ ASSINATURA_ARQUIVO_ID: arq.getId(), ASSINATURA_NOME: nome, ASSINATURA_DOCUMENTO: Ast_texto_(d.documento, 60), ASSINATURA_EM: hora });
      Ast_evento_('OS', os.ID, 'ASSINATURA', eu, 'Assinado por ' + nome + (Ast_s_(d.documento) ? ' (' + Ast_texto_(d.documento, 60) + ')' : ''), extraEv);
      return { ok: true };
    case 'CONCLUI':
      if (!tipoOs.semVisita && !Ast_s_(os.CHEGOU_EM)) return { ok: false, definitivo: false, motivo: 'a chegada não foi registrada', corrigir: 'Toque em "Cheguei" (envie o evento CHEGUEI antes do CONCLUI) e sincronize de novo.' };
      var co2 = AstO_coord_(d);
      var cc2 = { CONCLUIU_EM: hora, CONCLUIU_EM_APARELHO: Ast_iso_(ev.em) };
      if (co2) { cc2.CONCLUIU_LAT = co2.lat; cc2.CONCLUIU_LNG = co2.lng; cc2.CONCLUIU_PRECISAO = co2.precisao; }
      if (s === 'PAUSADA' && Ast_sim_(os.AGUARDANDO_PECA)) {
        // conclusão da visita sem a peça: registra a saída; a O.S. continua aguardando a peça
        gravar(cc2);
        Ast_evento_('OS', os.ID, 'SAIDA_SEM_PECA', eu, 'Visita encerrada aguardando peça' + (co2 ? '' : ' (sem localização)'), extraEv);
        return { ok: true, nota: 'visita registrada; a O.S. continua aguardando a peça' };
      }
      gravar(cc2);
      if (s !== 'DOC_PENDENTE') {
        gravar({ SITUACAO: 'DOC_PENDENTE', INICIO_EM: Ast_s_(os.INICIO_EM) || Ast_s_(os.CHEGOU_EM) || hora }); s = 'DOC_PENDENTE';
        c = AstO_chamadoPara_(eu, c, 'DOC_PENDENTE', { ATENDIDO_EM: hora, PROXIMA_ACAO: 'Completar a documentação da O.S. ' + os.NUMERO }, 'EXECUCAO_CONCLUIDA', 'Execução concluída (O.S. ' + os.NUMERO + ')');
      }
      Ast_evento_('OS', os.ID, 'CONCLUI', eu, 'Execução concluída' + (co2 ? '' : ' (sem localização)'), extraEv);
      ctx.tentarEncerrar = ctx.tentarEncerrar || {}; ctx.tentarEncerrar[os.ID] = true;
      return { ok: true };
  }
  return { ok: false, definitivo: true, motivo: 'evento não tratado', corrigir: '' };
}

/**
 * Encerra a O.S. se a documentação estiver completa (O.S. em "Documentação pendente"). Chamar dentro da trava.
 * Liga o documento técnico emitido (mesmo equipamento, depois da chegada) e agenda o relatório A4 para depois da trava.
 */
function AstO_tentarEncerrar_(eu, osId) {
  var os = Ast_porId_(AST_ABAS.OS, osId);
  if (!os || Ast_up_(os.SITUACAO) !== 'DOC_PENDENTE') return { encerrada: false, faltas: os ? AstO_faltas_(os) : [] };
  var faltas = AstO_faltas_(os);
  Ast_atualizar_(AST_ABAS.OS, os.ID, { FALTAS: faltas.join('; '), ATUALIZADO_EM: Ast_agora_() });
  if (faltas.length) return { encerrada: false, faltas: faltas };
  var agora = Ast_agora_(), campos = { SITUACAO: 'ENCERRADA', ENCERRADA_EM: agora, ENCERRADA_POR_NOME: eu.nome, FALTAS: '' };
  var doc = AstO_docTecnicoEmitido_(os);
  if (doc && !Ast_s_(os.DOC_TECNICO_REF)) { campos.DOC_TECNICO_TIPO = doc.tipo; campos.DOC_TECNICO_REF = doc.nome; campos.DOC_TECNICO_URL = doc.link; }
  Ast_atualizar_(AST_ABAS.OS, os.ID, campos);
  Ast_evento_('OS', os.ID, 'ENCERRADA', eu, 'O.S. encerrada com a documentação completa' + (Ast_sim_(os.SERIE_DIVERGENTE) ? ' · ATENÇÃO: série diferente do cadastro' : '') + (campos.DOC_TECNICO_REF ? ' · documento ligado: ' + campos.DOC_TECNICO_REF : ''), { numero: os.NUMERO });
  var c = Ast_porId_(AST_ABAS.CHAMADOS, os.CHAMADO_ID);
  if (c) c = AstO_chamadoPara_(eu, c, 'ENCERRADO', { PROXIMA_ACAO: '' }, 'ENCERRAMENTO', 'O.S. ' + os.NUMERO + ' encerrada' + (Ast_s_(os.ASSINATURA_NOME) ? ' com assinatura de ' + Ast_s_(os.ASSINATURA_NOME) : Ast_s_(os.SEM_ASSINATURA_RECEBIDO_POR) ? ' sem assinatura (recebido por ' + Ast_s_(os.SEM_ASSINATURA_RECEBIDO_POR) + ')' : ''));
  Ast_mudarAtividade_(os.ATIVIDADE_ID, 'Concluída', 'O.S. ' + os.NUMERO + ' encerrada com a documentação completa.');
  var euR = eu, idR = os.ID;
  Ast_depois_(function () { if (typeof AstR_emitirRelatorioOS_ === 'function') AstR_emitirRelatorioOS_(euR, idR, { aoEncerrar: true }); });
  return { encerrada: true, faltas: [] };
}

/** Documento técnico do mesmo equipamento emitido desde a chegada (Arquivo de documentos). */
function AstO_docTecnicoEmitido_(os) {
  var tipo = Ast_tipo_(os.TIPO_CODIGO);
  if (!tipo || !tipo.documentoTecnico || !Ast_s_(os.EQUIPAMENTO_ID) || !SGO_CFG.SHEETS.DOC_DOCUMENTOS) return null;
  var desde = Ast_dia_(os.CHEGOU_EM) || Ast_dia_(os.AGENDADO_PARA);
  var achado = null;
  Ast_ler_(SGO_CFG.SHEETS.DOC_DOCUMENTOS).forEach(function (d) {
    if (Ast_s_(d.EQUIPAMENTO_ID) !== Ast_s_(os.EQUIPAMENTO_ID) || Ast_up_(d.TIPO_DOCUMENTO) === 'ORDEM DE SERVIÇO') return;
    var em = Ast_dia_(d.DATA_EMISSAO || d.CRIADO_EM);
    if (!em || em < desde) return;
    if (!achado || em > achado.em) achado = { tipo: Ast_up_(d.TIPO_DOCUMENTO), nome: Ast_s_(d.NOME_ARQUIVO), link: Ast_s_(d.LINK_ARQUIVO), em: em };
  });
  return achado;
}

/**
 * 22/10/2026 (etapa 2): situação do documento e do envio ao cliente, para a ficha da O.S. (SGO+) e para o aplicativo.
 * { situacao: SEM_PDF | PDF_GERADO | ENVIADO, pdfGerado, pdfUrl, pdfId, versao, revisao, geradoEm, enviadoEm, enviadoPor, enviadoCanal, enviadoPara, podeEnviar, contatos, texto }
 */
function AstO_envio_(os, eu) {
  var s = Ast_up_(os.SITUACAO), temPdf = s === 'ENCERRADA' && !!Ast_s_(os.RELATORIO_PDF_ID), enviado = temPdf && !!Ast_s_(os.ENVIADO_CLIENTE_EM);
  var rev = Number(os.RELATORIO_REVISAO) || 0, rot = rev > 0 ? ' (Rev. ' + (rev < 10 ? '0' : '') + rev + ')' : '';
  var podeEnviar = temPdf && !!eu && !eu.cliente && (eu.gestao || Ast_s_(os.TECNICO_ID) === eu.id || (eu.interno && !eu.tecnico));
  return {
    situacao: enviado ? 'ENVIADO' : temPdf ? 'PDF_GERADO' : 'SEM_PDF', pdfGerado: temPdf, pdfUrl: temPdf ? Ast_s_(os.RELATORIO_PDF_URL) : '', pdfId: temPdf ? Ast_s_(os.RELATORIO_PDF_ID) : '',
    versao: Number(os.RELATORIO_VERSAO) || 0, revisao: rev, geradoEm: temPdf ? Ast_br_(os.RELATORIO_EM) : '',
    enviadoEm: enviado ? Ast_br_(os.ENVIADO_CLIENTE_EM) : '', enviadoPor: enviado ? Ast_s_(os.ENVIADO_CLIENTE_POR_NOME) : '', enviadoCanal: enviado ? (Ast_up_(os.ENVIADO_CLIENTE_CANAL) === 'WHATSAPP' ? 'WhatsApp' : 'e-mail') : '', enviadoPara: enviado ? Ast_s_(os.ENVIADO_CLIENTE_PARA) : '',
    podeEnviar: podeEnviar, contatos: temPdf && podeEnviar && typeof AstR_contatosEnvio_ === 'function' ? AstR_contatosEnvio_(os) : [],
    texto: enviado ? 'Enviado ao cliente em ' + Ast_br_(os.ENVIADO_CLIENTE_EM) + ' por ' + Ast_s_(os.ENVIADO_CLIENTE_POR_NOME) + ' (' + (Ast_up_(os.ENVIADO_CLIENTE_CANAL) === 'WHATSAPP' ? 'WhatsApp' : 'e-mail') + ') para ' + Ast_s_(os.ENVIADO_CLIENTE_PARA) + '.'
      : temPdf ? 'Relatório' + rot + ' gerado em ' + Ast_br_(os.RELATORIO_EM) + '. Ainda não enviado ao cliente.'
      : s === 'ENCERRADA' ? 'O relatório ainda está sendo gerado pela rotina. Atualize a tela em alguns minutos.' : 'O relatório A4 é gerado no encerramento da O.S.'
  };
}

/** O.S. para a tela (técnico, gestão; o cliente usa o relatório emitido). Sem valores. */
function AstO_publico_(os, eu) {
  var fotos = AstO_fotos_(os.ID), pecas = AstO_pecas_(os.ID), s = Ast_up_(os.SITUACAO), tipo = Ast_tipo_(os.TIPO_CODIGO);
  var resp = AstO_respostas_(os);
  var faltas = AST_OS_ABERTAS.indexOf(s) >= 0 ? AstO_faltas_(os, fotos) : [];
  var interno = !!(eu && eu.interno);
  return {
    id: Ast_s_(os.ID), numero: Ast_s_(os.NUMERO), chamadoId: Ast_s_(os.CHAMADO_ID), chamadoNumero: Ast_s_(os.CHAMADO_NUMERO), situacao: s, situacaoNome: AST_OS_SITUACOES[s] || s,
    tipo: tipo || { codigo: Ast_up_(os.TIPO_CODIGO), nome: Ast_s_(os.TIPO_NOME), exige: {} }, clienteId: Ast_s_(os.CLIENTE_ID), clienteNome: Ast_s_(os.CLIENTE_NOME), unidadeNome: Ast_s_(os.UNIDADE_NOME),
    equipamentoId: Ast_s_(os.EQUIPAMENTO_ID), equipamentoTexto: Ast_s_(os.EQUIPAMENTO_TEXTO), endereco: Ast_s_(os.ENDERECO), mapa: Ast_linkMapa_(os.ENDERECO),
    tecnicoId: Ast_s_(os.TECNICO_ID), tecnicoNome: Ast_s_(os.TECNICO_NOME), agendadoPara: Ast_br_(os.AGENDADO_PARA), agendadoIso: Ast_iso_(os.AGENDADO_PARA), duracaoMin: Number(os.DURACAO_MIN) || 0,
    orientacao: Ast_s_(os.ORIENTACAO), preparo: Ast_json_(os.PREPARO_JSON, {}),
    saiuEm: Ast_br_(os.SAIU_EM), chegouEm: Ast_br_(os.CHEGOU_EM), inicioEm: Ast_br_(os.INICIO_EM), concluiuEm: Ast_br_(os.CONCLUIU_EM), encerradaEm: Ast_br_(os.ENCERRADA_EM),
    obsLocalizacao: Ast_s_(os.OBS_LOCALIZACAO), chegouDistM: Ast_s_(os.CHEGOU_DIST_M),
    perguntas: AstO_perguntas_(os).map(function (p) { var r = resp[p.id]; return Object.assign({}, p, { resposta: r ? r.v : null, respondidaEm: r ? Ast_br_(r.em) : '', fotos: fotos.filter(function (f) { return Ast_s_(f.PERGUNTA_ID) === p.id; }).length }); }),
    relato: Ast_s_(os.RELATO), condicaoEncontrada: Ast_s_(os.CONDICAO_ENCONTRADA), causa: Ast_s_(os.CAUSA), servicoRealizado: Ast_s_(os.SERVICO_REALIZADO), testeFuncional: Ast_s_(os.TESTE_FUNCIONAL),
    recomendacoes: Ast_s_(os.RECOMENDACOES), serieConfirmada: Ast_s_(os.SERIE_CONFIRMADA), serieCadastro: Ast_s_(os.SERIE_CADASTRO), serieDivergente: Ast_sim_(os.SERIE_DIVERGENTE), identificadoPor: Ast_up_(os.IDENTIFICADO_POR),
    fotos: fotos.map(function (f) { return { id: f.ID, idLocal: Ast_s_(f.ID_LOCAL), nome: Ast_s_(f.NOME), perguntaId: Ast_s_(f.PERGUNTA_ID), legenda: Ast_s_(f.LEGENDA), url: interno ? Ast_s_(f.URL) : '', em: Ast_br_(f.TIRADA_EM || f.RECEBIDA_EM) }; }),
    pecas: pecas.map(function (p) { return { id: p.ID, idLocal: Ast_s_(p.ID_LOCAL), descricao: Ast_s_(p.DESCRICAO), codigo: Ast_s_(p.CODIGO), quantidade: Number(p.QUANTIDADE) || 0, unidade: Ast_s_(p.UNIDADE), situacao: Ast_up_(p.SITUACAO), requisicao: Ast_s_(p.REQUISICAO_NUMERO) }; }),
    aguardandoPeca: Ast_sim_(os.AGUARDANDO_PECA),
    assinatura: Ast_s_(os.ASSINATURA_ARQUIVO_ID) ? { nome: Ast_s_(os.ASSINATURA_NOME), documento: Ast_s_(os.ASSINATURA_DOCUMENTO), em: Ast_br_(os.ASSINATURA_EM) } : null,
    semAssinatura: Ast_s_(os.SEM_ASSINATURA_MOTIVO) ? { motivo: AST_MOTIVOS_SEM_ASSINATURA[Ast_up_(os.SEM_ASSINATURA_MOTIVO)] || os.SEM_ASSINATURA_MOTIVO, recebidoPor: Ast_s_(os.SEM_ASSINATURA_RECEBIDO_POR), justificativa: Ast_s_(os.SEM_ASSINATURA_JUSTIFICATIVA) } : null,
    faltas: faltas, podeEncerrar: s === 'DOC_PENDENTE' && !faltas.length,
    docTecnico: Ast_s_(os.DOC_TECNICO_REF) ? { tipo: Ast_s_(os.DOC_TECNICO_TIPO), nome: Ast_s_(os.DOC_TECNICO_REF), url: Ast_s_(os.DOC_TECNICO_URL) } : null,
    documentoTecnicoTipo: tipo ? tipo.documentoTecnico : '', documentoTecnicoNome: tipo && tipo.documentoTecnico ? AST_DOCS_TECNICOS[tipo.documentoTecnico] : '',
    relatorio: Ast_s_(os.RELATORIO_PDF_URL) ? { versao: Number(os.RELATORIO_VERSAO) || 0, revisao: Number(os.RELATORIO_REVISAO) || 0, url: Ast_s_(os.RELATORIO_PDF_URL), pdfId: Ast_s_(os.RELATORIO_PDF_ID), em: Ast_br_(os.RELATORIO_EM), enviadoEm: Ast_br_(os.ENVIADO_CLIENTE_EM) } : null,
    // 22/10/2026 (etapa 2): bloco "Documento e envio" da ficha: situação do PDF e do envio ao cliente, contatos sugeridos e o que a pessoa pode fazer
    envio: AstO_envio_(os, eu),
    reserva: Ast_s_(os.RESERVA_CODIGO), podeCampo: !!eu && (eu.gestao || Ast_s_(os.TECNICO_ID) === eu.id) && AST_OS_ABERTAS.indexOf(s) >= 0,
    abertaEmCampo: Ast_sim_(os.ABERTA_EM_CAMPO),
    eventos: Ast_ler_(AST_ABAS.EVENTOS).filter(function (e) { return Ast_up_(e.ENTIDADE) === 'OS' && Ast_s_(e.ENTIDADE_ID) === Ast_s_(os.ID); }).sort(function (a, b) { return String(a.EM).localeCompare(String(b.EM)); })
      .map(function (e) { return { tipo: Ast_s_(e.TIPO), texto: Ast_s_(e.TEXTO), por: Ast_s_(e.USUARIO_NOME), em: Ast_br_(e.EM), emAparelho: Ast_br_(e.EM_APARELHO) }; })
  };
}

/** Eventos vindos da tela do computador (mesmo processador do aplicativo). d: { osId, eventos:[{tipo, dados}] } */
function AstO_eventosTela_(eu, d) {
  d = d || {};
  var os = AstO_obter_(eu, d.osId, 'registrar o atendimento');
  AstO_exigirCampo_(eu, os, 'registrar o atendimento');
  var lista = Array.isArray(d.eventos) ? d.eventos : [];
  if (!lista.length) throw new Error('Não foi possível registrar: nada foi enviado. Preencha o que fez e toque em Salvar de novo');
  var ctx = {}, msgs = [], erros = [];
  Ast_comTrava_(function () {
    lista.forEach(function (ev) {
      var r = AstO_aplicarEvento_(eu, { tipo: ev.tipo, osId: os.ID, em: Ast_agora_(), dados: ev.dados || {}, idLocal: 'tela-' + Utilities.getUuid() }, ctx);
      if (!r.ok) erros.push(r.motivo + (r.corrigir ? '. ' + r.corrigir.replace(/Ast_appEnviarFoto|sincronize de novo|\(envie o evento CHEGUEI antes do CONCLUI\)/g, function (m) { return m === 'Ast_appEnviarFoto' ? 'o botão Foto' : m === 'sincronize de novo' ? 'salve de novo' : ''; }) : ''));
      else if (r.nota) msgs.push(r.nota);
    });
    var osAtual = Ast_porId_(AST_ABAS.OS, os.ID);
    if (osAtual && Ast_up_(osAtual.SITUACAO) === 'DOC_PENDENTE') AstO_tentarEncerrar_(eu, os.ID);
  });
  var final = Ast_porId_(AST_ABAS.OS, os.ID);
  if (erros.length && erros.length === lista.length) throw new Error('Não foi possível registrar: ' + erros.join(' '));
  return { os: AstO_publico_(final, eu), avisos: erros, message: (Ast_up_(final.SITUACAO) === 'ENCERRADA' ? 'O.S. ' + final.NUMERO + ' encerrada com a documentação completa. O relatório A4 foi gerado.' :
    'Registrado.' + (msgs.length ? ' ' + msgs.join(' ') : '') + (erros.length ? ' Não aceito: ' + erros.join(' ') : '')) };
}

/** Foto enviada (aplicativo ou tela). d: { osId, idLocal, nome, base64, perguntaId, legenda, em }. Idempotente por idLocal. */
function AstO_salvarFoto_(eu, d) {
  d = d || {};
  var os = AstO_obter_(eu, d.osId, 'enviar a foto');
  AstO_exigirCampo_(eu, os, 'enviar a foto');
  var s = Ast_up_(os.SITUACAO);
  if (s === 'ENCERRADA' || s === 'CANCELADA') throw new Error('Não foi possível enviar a foto: a O.S. ' + os.NUMERO + ' já está ' + (s === 'ENCERRADA' ? 'encerrada' : 'cancelada') + '. Correção depois do encerramento é feita pela gestão');
  var idLocal = Ast_s_(d.idLocal);
  if (!/^[A-Za-z0-9_.:-]{8,80}$/.test(idLocal)) throw new Error('Não foi possível enviar a foto: o identificador da foto (idLocal) precisa ter de 8 a 80 letras, números ou _.:-');
  var ja = Ast_ler_(AST_ABAS.FOTOS).filter(function (f) { return Ast_s_(f.OS_ID) === Ast_s_(os.ID) && Ast_s_(f.ID_LOCAL) === idLocal; })[0];
  if (ja) return { duplicado: true, foto: { id: ja.ID, nome: Ast_s_(ja.NOME), perguntaId: Ast_s_(ja.PERGUNTA_ID) }, os: os };
  var b64 = String(d.base64 || '').replace(/^data:[^,]+,/, '').replace(/\s/g, '');
  if (b64.length < 100) throw new Error('Não foi possível enviar a foto: o arquivo veio vazio. Tire a foto de novo');
  var bytes = Math.floor(b64.length * 3 / 4), max = Number(Ast_regras_().fotos.maxBytes) || 2000000;
  if (bytes > max) throw new Error('Não foi possível enviar a foto: ela tem ' + Ast_fmtNum_(bytes / 1048576, 1) + ' MB e o limite é ' + Ast_fmtNum_(max / 1048576, 1) + ' MB. O aplicativo reduz a foto antes de enviar; tire de novo ou reduza');
  var nome = Ast_s_(d.nome) || (idLocal + '.jpg');
  if (!AST_RX_FOTO.test(nome)) throw new Error('Não foi possível enviar a foto: use JPG, PNG ou WEBP (o arquivo é "' + nome + '")');
  var perg = Ast_s_(d.perguntaId);
  if (perg && !AstO_perguntas_(os).some(function (p) { return p.id === perg; })) perg = '';
  var mime = /\.png$/i.test(nome) ? 'image/png' : /\.webp$/i.test(nome) ? 'image/webp' : 'image/jpeg';
  var pasta = Ast_pastaPrivadaOS_(os.NUMERO);
  var nomeArq = SGO_DocSalvar_sanitizarNome_(os.NUMERO + ' - ' + idLocal + ' - ' + nome);
  var f = pasta.createFile(Utilities.newBlob(Utilities.base64Decode(b64), mime, nomeArq));
  Ast_privado_(f);
  var marca = Ast_marca_(b64);
  b64 = null;
  var reg = Ast_comTrava_(function () {
    var dup = Ast_ler_(AST_ABAS.FOTOS).filter(function (x) { return Ast_s_(x.OS_ID) === Ast_s_(os.ID) && Ast_s_(x.ID_LOCAL) === idLocal; })[0];
    if (dup) return { dup: dup };
    var r = Ast_inserir_(AST_ABAS.FOTOS, { OS_ID: os.ID, ID_LOCAL: idLocal, PERGUNTA_ID: perg, LEGENDA: Ast_texto_(d.legenda, 200), NOME: nome, ARQUIVO_ID: f.getId(), URL: f.getUrl(), TAMANHO: bytes,
      SHA256: marca, TIRADA_EM: AstO_horaCampo_(d.em), RECEBIDA_EM: Ast_agora_(), POR_ID: eu.id, POR_NOME: eu.nome, ATIVA: 'SIM' });
    var o2 = Ast_porId_(AST_ABAS.OS, os.ID);
    var campos = { QTD_FOTOS: AstO_fotos_(os.ID).length, ATUALIZADO_EM: Ast_agora_(), ULTIMA_SINC_EM: Ast_agora_() };
    if (Ast_up_(o2.SITUACAO) === 'NO_LOCAL') { campos.SITUACAO = 'EM_EXECUCAO'; campos.INICIO_EM = Ast_s_(o2.INICIO_EM) || Ast_agora_(); var c = Ast_porId_(AST_ABAS.CHAMADOS, o2.CHAMADO_ID); AstO_chamadoPara_(eu, c, 'EM_EXECUCAO', {}, 'INICIO_SERVICO', 'Serviço iniciado'); }
    Ast_atualizar_(AST_ABAS.OS, os.ID, campos);
    Ast_evento_('OS', os.ID, 'FOTO', eu, 'Foto recebida: ' + nome + (perg ? ' (pergunta ' + perg + ')' : ''), { numero: os.NUMERO, emAparelho: d.em, idLocal: idLocal });
    if (Ast_up_(o2.SITUACAO) === 'DOC_PENDENTE') AstO_tentarEncerrar_(eu, os.ID);
    return { r: r };
  });
  if (reg.dup) return { duplicado: true, foto: { id: reg.dup.ID, nome: Ast_s_(reg.dup.NOME), perguntaId: Ast_s_(reg.dup.PERGUNTA_ID) }, os: Ast_porId_(AST_ABAS.OS, os.ID) };
  return { duplicado: false, foto: { id: reg.r.ID, nome: nome, perguntaId: perg }, os: Ast_porId_(AST_ABAS.OS, os.ID) };
}

/** Encerrar pela tela (gestão ou técnico) quando a documentação está completa. */
function AstO_encerrar_(eu, d) {
  var os = AstO_obter_(eu, d && d.osId, 'encerrar a O.S.');
  AstO_exigirCampo_(eu, os, 'encerrar a O.S.');
  if (Ast_up_(os.SITUACAO) !== 'DOC_PENDENTE') throw new Error('Não foi possível encerrar: a O.S. ' + os.NUMERO + ' está "' + (AST_OS_SITUACOES[Ast_up_(os.SITUACAO)] || os.SITUACAO) + '". Primeiro registre a conclusão da execução (botão "Concluí")');
  var r = Ast_comTrava_(function () { return AstO_tentarEncerrar_(eu, os.ID); });
  if (!r.encerrada) throw new Error('Não foi possível encerrar a O.S. ' + os.NUMERO + ': falta ' + r.faltas.join('; ') + '. Complete e toque em Encerrar de novo; enquanto isso ela fica em "Documentação pendente" e aparece nas pendências');
  return { os: AstO_publico_(Ast_porId_(AST_ABAS.OS, os.ID), eu), message: 'O.S. ' + os.NUMERO + ' encerrada. O relatório A4 foi gerado e salvo na pasta do equipamento.' };
}

/** Liga o documento técnico emitido à O.S. (lista os do equipamento ou grava a escolha). d: { osId, docId } */
function AstO_ligarDocumento_(eu, d) {
  var os = AstO_obter_(eu, d && d.osId, 'ligar o documento');
  AstO_exigirCampo_(eu, os, 'ligar o documento');
  var docs = Ast_ler_(SGO_CFG.SHEETS.DOC_DOCUMENTOS).filter(function (x) { return Ast_s_(x.EQUIPAMENTO_ID) && Ast_s_(x.EQUIPAMENTO_ID) === Ast_s_(os.EQUIPAMENTO_ID) && Ast_up_(x.STATUS || 'ATIVO') !== 'INATIVO'; })
    .sort(function (a, b) { return String(b.DATA_EMISSAO || b.CRIADO_EM).localeCompare(String(a.DATA_EMISSAO || a.CRIADO_EM)); }).slice(0, 30);
  if (!Ast_s_(d.docId)) return { documentos: docs.map(function (x) { return { id: x.ID, tipo: Ast_s_(x.TIPO_DOCUMENTO), nome: Ast_s_(x.NOME_ARQUIVO), link: Ast_s_(x.LINK_ARQUIVO), em: Ast_brDia_(x.DATA_EMISSAO || x.CRIADO_EM) }; }) };
  var doc = docs.filter(function (x) { return Ast_s_(x.ID) === Ast_s_(d.docId); })[0];
  if (!doc) throw new Error('Não foi possível ligar: o documento não é deste equipamento ou não foi encontrado. Atualize a lista');
  Ast_atualizar_(AST_ABAS.OS, os.ID, { DOC_TECNICO_TIPO: Ast_s_(doc.TIPO_DOCUMENTO), DOC_TECNICO_REF: Ast_s_(doc.NOME_ARQUIVO), DOC_TECNICO_URL: Ast_s_(doc.LINK_ARQUIVO), ATUALIZADO_EM: Ast_agora_() });
  Ast_evento_('OS', os.ID, 'DOC_TECNICO', eu, 'Documento técnico ligado: ' + Ast_s_(doc.NOME_ARQUIVO), { numero: os.NUMERO });
  return { os: AstO_publico_(Ast_porId_(AST_ABAS.OS, os.ID), eu), message: 'Documento ligado à O.S. ' + os.NUMERO + '.' };
}

/** Minhas O.S. (técnico) ou todas (gestão). f: { situacao: ABERTAS|ENCERRADAS|TODAS, tecnicoId } */
function AstO_lista_(eu, f) {
  f = f || {};
  var g = Ast_up_(f.situacao) || 'ABERTAS';
  var l = Ast_ler_(AST_ABAS.OS).filter(function (o) {
    if (!eu.gestao && !(eu.interno && !eu.tecnico) && Ast_s_(o.TECNICO_ID) !== eu.id) return false;
    if (f.tecnicoId && Ast_s_(o.TECNICO_ID) !== Ast_s_(f.tecnicoId)) return false;
    var s = Ast_up_(o.SITUACAO);
    if (g === 'ABERTAS') return AST_OS_ABERTAS.indexOf(s) >= 0;
    if (g === 'ENCERRADAS') return s === 'ENCERRADA';
    if (g === 'PENDENTES') return s === 'DOC_PENDENTE';
    return true;
  }).sort(function (a, b) { return String(a.AGENDADO_PARA).localeCompare(String(b.AGENDADO_PARA)); });
  return { os: l.slice(0, 300).map(function (o) {
    var s = Ast_up_(o.SITUACAO);
    return { id: o.ID, numero: o.NUMERO, chamadoNumero: o.CHAMADO_NUMERO, chamadoId: o.CHAMADO_ID, situacao: s, situacaoNome: AST_OS_SITUACOES[s] || s, tipoNome: Ast_s_(o.TIPO_NOME), clienteNome: Ast_s_(o.CLIENTE_NOME),
      equipamentoTexto: Ast_s_(o.EQUIPAMENTO_TEXTO), tecnicoNome: Ast_s_(o.TECNICO_NOME), agendadoPara: Ast_br_(o.AGENDADO_PARA), endereco: Ast_s_(o.ENDERECO), faltas: Ast_s_(o.FALTAS),
      relatorioUrl: Ast_s_(o.RELATORIO_PDF_URL), serieDivergente: Ast_sim_(o.SERIE_DIVERGENTE), aguardandoPeca: Ast_sim_(o.AGUARDANDO_PECA), abertaEmCampo: Ast_sim_(o.ABERTA_EM_CAMPO) };
  }) };
}
