/****************************************************
 * MÓDULO REPRESENTAÇÃO — IMAGENS E VÍDEOS DO PEDIDO E DO CHAMADO (11/11/2026)
 *
 * Pedido do dono (11/11/2026): "Campo para inserir imagens e vídeos" — no pedido e no chamado, a representada e a
 * Metrolabs anexam imagens e vídeos, numa galeria com miniatura da imagem e player do vídeo.
 *
 * Desenho:
 *  - Tudo fica em REP_ANEXOS (a mesma tabela dos anexos do pedido), com legenda, cópia reduzida da imagem (miniatura da
 *    galeria e foto do relatório A4) e a retirada (REMOVIDO_EM, por quem e o motivo; o registro e o arquivo ficam guardados).
 *  - Galeria do chamado = o que foi anexado no chamado e no pedido que o originou (inclusive as fotos e o vídeo da abertura).
 *  - Escopo: a representada só vê e só anexa nos pedidos e chamados dela (Rep_escopo_), e só o que está marcado para ela
 *    (PUBLICO = REPRESENTADA). A Metrolabs vê tudo das representadas e pode anexar "só para a Metrolabs" (PUBLICO = INTERNO).
 *  - Imagem: reduzida no aparelho (lado maior 1600 px, até 2 MB) e enviada em base64 pelo Representacao_api, com a cópia
 *    reduzida (lado maior 1024 px, até 450 KB). Até 10 por envio e 60 por pedido ou chamado.
 *  - Vídeo: NÃO passa pelo /api/run. No worker, o base64 vira lista de números (cerca de 40 vezes o tamanho do arquivo):
 *    25 MB chegavam perto do limite de 1 GB do worker. O navegador manda o arquivo cru para POST /api/representacao/midia
 *    (servidor próprio, src/servicos/midiaRepresentacao.ts), que confere aqui (Representacao_midiaPreparar_), grava o arquivo
 *    no disco sem passar pelo worker e registra aqui (Representacao_midiaRegistrar_). Até 100 MB; MP4, MOV, WEBM e 3GP.
 *  - Papéis: a representada anexa com o papel que conversa (administrador, atendente e financeiro); "Leitura" só vê.
 *    Retira quem enviou (ou o administrador da representada, nas da empresa dele); na Metrolabs, quem enviou e quem administra
 *    a representação (também as da representada, para o caso de foto com paciente ou documento pessoal).
 * Nenhuma função devolve Date cru.
 ****************************************************/

var REPMI_TERMINAIS_SOL = ['DESCARTADA', 'CANCELADA'];
var REPMI_TERMINAIS_CH = ['ENCERRADO', 'CANCELADO'];
var REPMI_AVISO_PRIVACIDADE = 'Imagens e vídeos não podem mostrar pacientes, prontuários ou documentos pessoais.';

function RepMi_ehMidia_(mime) { return /^(image|video)\//i.test(Rep_s_(mime)); }
function RepMi_ladoNome_(lado) { return Rep_up_(lado) === 'METROLABS' ? 'Metrolabs' : 'Representada'; }

/**
 * Pedido ou chamado em que a pessoa mexe, já conferido pelo escopo. Devolve { tipo, id, numero, repId, registro, refs }.
 * refs: as referências da galeria (o chamado e o pedido que o originou; o pedido aceito e o chamado que ele virou).
 * paraEnviar: pedido já aceito manda para o chamado que ele virou; pedido ou chamado fechado recusa (representada).
 */
function RepMi_ref_(eu, refTipo, refId, paraEnviar) {
  var tipo = Rep_up_(refTipo), reg, repId, sol = null, ch = null;
  if (tipo !== 'SOLICITACAO' && tipo !== 'CHAMADO') throw Rep_erro_('NAO_ENCONTRADO', REP_MSG_NAO_ENCONTRADO);
  if (eu.externo) {
    var esc = Rep_escopo_(eu);
    reg = tipo === 'SOLICITACAO' ? esc.solicitacao(refId) : esc.chamado(refId);
    repId = eu.repId;
  } else {
    reg = Ast_porId_(tipo === 'SOLICITACAO' ? AST_ABAS.SOLICITACOES : AST_ABAS.CHAMADOS, refId);
    if (!reg || !Rep_s_(reg.REPRESENTADA_ID)) throw Rep_erro_('NAO_ENCONTRADO', 'Não foi possível abrir as imagens e vídeos: o registro não é de uma representada. Atualize a tela.');
    if (tipo === 'CHAMADO' && typeof AstC_podeVer_ === 'function' && !AstC_podeVer_(eu, reg)) throw Rep_erro_('NAO_ENCONTRADO', 'Não foi possível abrir: o chamado ' + Rep_s_(reg.NUMERO) + ' não está entre os que você acompanha.');
    repId = Rep_s_(reg.REPRESENTADA_ID);
  }
  if (tipo === 'SOLICITACAO') {
    sol = reg;
    var chId = Rep_s_(reg.CHAMADO_ID);
    if (chId) { var c0 = Ast_porId_(AST_ABAS.CHAMADOS, chId); if (c0 && Rep_s_(c0.REPRESENTADA_ID) === repId) ch = c0; }
  } else {
    ch = reg;
    if (Rep_s_(reg.SOLICITACAO_ID)) { var s0 = Ast_porId_(AST_ABAS.SOLICITACOES, reg.SOLICITACAO_ID); if (s0 && Rep_s_(s0.REPRESENTADA_ID) === repId) sol = s0; }
  }
  var refs = [];
  if (ch) refs.push({ tipo: 'CHAMADO', id: Rep_s_(ch.ID) });
  if (sol) refs.push({ tipo: 'SOLICITACAO', id: Rep_s_(sol.ID) });
  // o que é enviado num pedido já aceito vai para o chamado (é lá que o atendimento segue)
  var alvo = tipo === 'SOLICITACAO' && ch && Rep_up_(sol.SITUACAO) === 'CONVERTIDA' ? ch : reg, alvoTipo = alvo === ch ? 'CHAMADO' : 'SOLICITACAO';
  if (paraEnviar && eu.externo) {
    var sit = Rep_up_(alvo.SITUACAO);
    if (alvoTipo === 'SOLICITACAO' && REPMI_TERMINAIS_SOL.indexOf(sit) >= 0) throw Rep_erro_('ESTADO', 'Não foi possível enviar: o pedido ' + Rep_s_(alvo.NUMERO) + ' foi ' + (sit === 'CANCELADA' ? 'cancelado' : 'recusado') + '. Se o problema continua, abra um pedido novo em "Novo pedido".');
    if (alvoTipo === 'CHAMADO' && REPMI_TERMINAIS_CH.indexOf(sit) >= 0) throw Rep_erro_('ESTADO', 'Não foi possível enviar: o chamado ' + Rep_s_(alvo.NUMERO) + ' está ' + (sit === 'CANCELADO' ? 'cancelado' : 'encerrado') + '. Se o problema voltou, abra um pedido novo em "Novo pedido"; para completar este, escreva na conversa com a Metrolabs.');
  }
  return { tipo: alvoTipo, id: Rep_s_(alvo.ID), numero: Rep_s_(alvo.NUMERO), repId: repId, registro: alvo, refs: refs, sol: sol, ch: ch };
}

/** Anexos de imagem e vídeo da galeria (sem os retirados e os desligados). Representada: só os marcados para ela. */
function RepMi_daGaleria_(eu, r, todos) {
  return Rep_ler_(REP_ABAS.ANEXOS).filter(function (a) {
    if (Rep_s_(a.REPRESENTADA_ID) !== r.repId || Rep_s_(a.REMOVIDO_EM) || Rep_s_(a.DESLIGADO_EM)) return false;
    if (eu.externo && Rep_up_(a.PUBLICO) !== 'REPRESENTADA') return false;
    if (!todos && !RepMi_ehMidia_(a.MIME)) return false;
    return r.refs.some(function (x) { return Rep_up_(a.REF_TIPO) === x.tipo && Rep_s_(a.REF_ID) === x.id; });
  });
}
function RepMi_podeRetirar_(eu, a) {
  if (eu.externo) return Rep_up_(a.POR_LADO) === 'REPRESENTADA' && (Rep_s_(a.POR_ID) === Rep_s_(eu.id) || eu.papel === 'ADMIN');
  return Rep_s_(a.POR_ID) === Rep_s_(eu.id) || RepI_podeAdministrar_(eu);
}
function RepMi_item_(eu, a, r) {
  var x = Rep_anexoPublico_(a);
  x.interna = Rep_up_(a.PUBLICO) !== 'REPRESENTADA';
  x.ladoNome = RepMi_ladoNome_(a.POR_LADO);
  if (eu.externo && x.lado === 'METROLABS') x.por = x.por + ' (Metrolabs)';
  var refNum = Rep_up_(a.REF_TIPO) === 'CHAMADO' ? (r.ch ? Rep_s_(r.ch.NUMERO) : '') : (r.sol ? Rep_s_(r.sol.NUMERO) : '');
  x.origem = (Rep_up_(a.REF_TIPO) === 'CHAMADO' ? 'Chamado ' : 'Pedido ') + refNum;
  x.podeRetirar = RepMi_podeRetirar_(eu, a);
  x.emIso = Rep_s_(a.EM);
  return x;
}
function RepMi_podeEnviar_(eu) { return eu.externo ? !!(eu.perm && eu.perm.conversar) : true; }

/** Galeria de um pedido ou chamado. d: { refTipo, refId }. */
function RepMi_listar_(eu, d) {
  var r = RepMi_ref_(eu, d && d.refTipo, d && d.refId, false);
  var todos = RepMi_daGaleria_(eu, r, true).sort(function (a, b) { return Rep_s_(a.EM).localeCompare(Rep_s_(b.EM)); });
  var itens = todos.filter(function (a) { return RepMi_ehMidia_(a.MIME); }).map(function (a) { return RepMi_item_(eu, a, r); });
  var outros = todos.filter(function (a) { return !RepMi_ehMidia_(a.MIME); }).map(function (a) { return RepMi_item_(eu, a, r); });
  var fechado = false;
  try { RepMi_ref_(eu, d.refTipo, d.refId, true); } catch (e) { fechado = Rep_s_(e.codigoRep) === 'ESTADO' ? Rep_s_(e.message) : ''; }
  return { galeria: { ref: { tipo: r.tipo, id: r.id, numero: r.numero }, itens: itens, outros: outros, podeEnviar: RepMi_podeEnviar_(eu) && !fechado, fechado: fechado || '',
    externo: !!eu.externo, limites: { imagemMb: Math.round(REP_LIMITES.fotoBytes / 1048576), videoMb: Math.round(REP_LIMITES.videoBytes / 1048576), imagensPorEnvio: REP_LIMITES.imagensPorEnvio,
      porRegistro: REP_LIMITES.midiasPorRegistro, imagemTipos: 'JPG, PNG ou WEBP', videoTipos: 'MP4, MOV, WEBM ou 3GP' }, aviso: REPMI_AVISO_PRIVACIDADE } };
}

function RepMi_conferirLimite_(eu, r, novos) {
  var ja = RepMi_daGaleria_(Object.assign({}, eu, { externo: false }), r, false).length;
  if (ja + novos > REP_LIMITES.midiasPorRegistro) throw Rep_erro_('LIMITE', 'Não foi possível enviar: o ' + (r.tipo === 'CHAMADO' ? 'chamado ' : 'pedido ') + r.numero + ' já tem ' + ja + ' imagens e vídeos (o limite é ' + REP_LIMITES.midiasPorRegistro + '). Retire os repetidos ou fora de foco e envie de novo.');
}
/** Linha do tempo e avisos do envio (um aviso por envio, não por arquivo). */
function RepMi_registrar_(eu, r, texto, interna) {
  var quem = eu.externo ? Rep_comoAst_(eu) : eu;
  Ast_evento_(r.tipo, r.id, 'MIDIA', quem, texto, interna ? { numero: r.numero } : { numero: r.numero, publico: 'REPRESENTADA' });
  if (eu.externo) {
    var dest = Rep_responsaveis_().ids;
    if (r.tipo === 'CHAMADO' && Rep_s_(r.registro.TECNICO_ID)) dest = dest.concat([Rep_s_(r.registro.TECNICO_ID)]);
    Ast_avisar_(dest, 'REP_MENSAGEM', 'Imagens e vídeos da ' + eu.repNome + ': ' + r.numero, eu.nome + ': ' + texto + '\nVeja em Representação (ficha do ' + (r.tipo === 'CHAMADO' ? 'chamado' : 'pedido') + ', Imagens e vídeos).', r.id, { evento: 'RP05' });
  } else if (!interna) {
    Rep_avisarRepresentada_(r.repId, Rep_s_(r.registro.POR_ID), 'Imagens e vídeos da Metrolabs: ' + r.numero, eu.nome + ': ' + texto, r.id, 'RP06');
  }
}
function RepMi_publico_(eu, d) { return !eu.externo && d && (d.interna === true || d.interna === 'true' || d.interna === 'SIM') ? 'INTERNO' : 'REPRESENTADA'; }
function RepMi_nome_(nome, padrao) { return Rep_txt_(Rep_s_(nome).replace(/[\\\/:*?"<>|\u0000-\u001f]+/g, '_'), 120) || padrao; }

/** Imagens. d: { refTipo, refId, interna, imagens: [{ nome, tipo, base64, legenda, reduzida: { base64 } }] }. */
function RepMi_enviarImagens_(eu, d) {
  d = d || {};
  if (eu.externo) Rep_exigirPerm_(eu, 'conversar', 'enviar imagens');
  var r = RepMi_ref_(eu, d.refTipo, d.refId, true);
  var lista = Array.isArray(d.imagens) ? d.imagens : [];
  if (!lista.length) { var e0 = Rep_erro_('INCOMPLETO', 'Não foi possível enviar: escolha pelo menos uma imagem.'); e0.faltam = [{ campo: 'galImagens', texto: 'Escolha as imagens.' }]; throw e0; }
  if (lista.length > REP_LIMITES.imagensPorEnvio) throw Rep_erro_('LIMITE', 'Não foi possível enviar: são ' + lista.length + ' imagens; o limite é de ' + REP_LIMITES.imagensPorEnvio + ' por envio. Envie em partes. Nada foi gravado.');
  var arqs = lista.map(function (f, i) {
    var a = Rep_conferirArquivo_(Object.assign({}, f, { nome: RepMi_nome_(f && f.nome, 'imagem-' + (i + 1) + '.jpg') }), 'IMAGEM', 'a imagem ' + (i + 1));
    if (!a) throw Rep_erro_('ARQUIVO', 'Não foi possível enviar a imagem ' + (i + 1) + ': o arquivo chegou vazio. Escolha de novo. Nada foi gravado.');
    var red = f && f.reduzida && Rep_s_(f.reduzida.base64) ? { nome: a.nome.replace(/\.\w+$/, '') + '-reduzida.jpg', mime: 'image/jpeg', base64: Rep_s_(f.reduzida.base64), bytes: Math.floor(Rep_s_(f.reduzida.base64).length * 3 / 4) } : null;
    if (red && red.bytes > REP_LIMITES.reduzidaBytes) red = null; // sem a cópia reduzida a galeria mostra a original
    return { a: a, red: red, legenda: Rep_txt_(f && f.legenda, 200) };
  });
  RepMi_conferirLimite_(eu, r, arqs.length);
  var publico = RepMi_publico_(eu, d), pasta = null;
  arqs.forEach(function (x) {
    var extra = { LEGENDA: x.legenda };
    if (x.red) {
      try {
        pasta = pasta || Rep_pastaAnexos_(r.repId);
        var fr = pasta.createFile(Utilities.newBlob(Utilities.base64Decode(x.red.base64), x.red.mime, x.red.nome));
        Ast_privado_(fr);
        extra.REDUZIDA_ARQUIVO_ID = fr.getId();
      } catch (eRed) { /* a cópia reduzida é conveniência: sem ela, vale a original */ }
    }
    Rep_salvarAnexo_(eu, r.repId, r.tipo, r.id, 'IMAGEM', x.a, publico, extra);
  });
  var n = arqs.length, texto = n + (n === 1 ? ' imagem anexada' : ' imagens anexadas') + (publico === 'INTERNO' ? ' (só para a Metrolabs)' : '') + '.';
  RepMi_registrar_(eu, r, texto, publico === 'INTERNO');
  if (eu.externo) Rep_acesso_('MIDIA', eu, d.ctx, r.numero + ': ' + texto);
  return Object.assign(RepMi_listar_(eu, { refTipo: r.tipo, refId: r.id }), { message: texto.replace(/\.$/, '') + ' no ' + (r.tipo === 'CHAMADO' ? 'chamado ' : 'pedido ') + r.numero + '.' });
}

/** Retira uma imagem ou vídeo da galeria (o registro e o arquivo ficam guardados, com quem retirou e o motivo). d: { id, motivo }. */
function RepMi_retirar_(eu, d) {
  d = d || {};
  var a = eu.externo ? Rep_escopo_(eu).anexo(d.id) : Rep_porId_(REP_ABAS.ANEXOS, d.id);
  if (!a || Rep_s_(a.REMOVIDO_EM) || !RepMi_ehMidia_(a.MIME)) throw Rep_erro_('NAO_ENCONTRADO', 'Não foi possível retirar: a imagem ou o vídeo não está mais na galeria. Atualize a tela.');
  var r = RepMi_ref_(eu, a.REF_TIPO, a.REF_ID, false);
  if (!RepMi_podeRetirar_(eu, a)) throw Rep_erro_('PAPEL', 'Não foi possível retirar: só quem enviou ' + (eu.externo ? '(ou o administrador da sua empresa no sistema)' : '(ou quem administra a representação)') + ' retira. Peça pela conversa.');
  var motivo = Rep_txt_(d.motivo, 300);
  if (motivo.length < 10) { var e = Rep_erro_('INCOMPLETO', 'Não foi possível retirar: escreva o motivo (pelo menos 10 letras). Ele fica no histórico.'); e.faltam = [{ campo: 'galMotivo', texto: 'Obrigatório.' }]; throw e; }
  Rep_atualizar_(REP_ABAS.ANEXOS, a.ID, { REMOVIDO_EM: Rep_agora_(), REMOVIDO_POR_NOME: eu.externo ? Rep_quem_(eu) : eu.nome, REMOVIDO_MOTIVO: motivo });
  var oque = (/^video\//i.test(Rep_s_(a.MIME)) ? 'Vídeo ' : 'Imagem ') + Rep_s_(a.NOME);
  Ast_evento_(Rep_up_(a.REF_TIPO), a.REF_ID, 'MIDIA_RETIRADA', eu.externo ? Rep_comoAst_(eu) : eu, oque + ' retirado(a) da galeria. Motivo: ' + motivo,
    Rep_up_(a.PUBLICO) === 'REPRESENTADA' ? { numero: Rep_up_(a.REF_TIPO) === 'CHAMADO' ? Rep_s_((r.ch || {}).NUMERO) : Rep_s_((r.sol || {}).NUMERO), publico: 'REPRESENTADA' } : { numero: r.numero });
  if (eu.externo) Rep_acesso_('MIDIA_RETIRADA', eu, d.ctx, oque + ': ' + motivo);
  return Object.assign(RepMi_listar_(eu, { refTipo: r.tipo, refId: r.id }), { message: oque + ' retirado(a) da galeria. O registro fica guardado no histórico.' });
}

// ------------------------------------------------------------
// VÍDEO PELA ROTA PRÓPRIA DO SERVIDOR (src/servicos/midiaRepresentacao.ts). Nome com "_": o navegador não chama; só o servidor.
// ------------------------------------------------------------
var REPMI_STATUS = { SESSAO: 401, SEM_REPRESENTADA: 403, REP_INATIVA: 403, PAPEL: 403, PERFIL: 403, NAO_ENCONTRADO: 404, ESTADO: 409, LIMITE: 409, ARQUIVO: 415, GRANDE: 413, INCOMPLETO: 400 };
function RepMi_comSessao_(sessionId, fn) {
  var antes = SGO_REP_MODULO;
  SGO_REP_MODULO = true;
  try {
    Ast_memoLimpar_(); Rep_memoLimpar_();
    var eu = Rep_eu_(sessionId);
    if (!eu.externo) Ast_exigir_(eu, 'INTERNO', 'enviar o vídeo');
    try { Rep_garantirAbas_(); } catch (e0) {}
    return JSON.parse(JSON.stringify(Object.assign({ ok: true }, fn(eu) || {})));
  } catch (e) {
    var m = String((e && e.message) || e).replace(/[.\s]+$/, ''), cod = Rep_s_(e && e.codigoRep);
    if (!cod && /Sess[aã]o/i.test(m)) cod = 'SESSAO';
    return { ok: false, codigo: cod, status: REPMI_STATUS[cod] || 400, message: (/^Não |^Sessão|^Muitas|^Acesso/.test(m) ? m : 'Não foi possível concluir: ' + m) + '.' };
  } finally { SGO_REP_MODULO = antes; }
}
function RepMi_conferirVideo_(eu, d) {
  if (eu.externo) Rep_exigirPerm_(eu, 'conversar', 'enviar o vídeo');
  var mime = Rep_s_(d && d.mime).toLowerCase(), bytes = Number(d && d.bytes) || 0;
  if (REP_MIME.VIDEO.indexOf(mime) < 0) throw Rep_erro_('ARQUIVO', 'Não foi possível enviar o vídeo: formato não aceito (' + (mime || 'desconhecido') + '). Use MP4, MOV, WEBM ou 3GP, como o celular grava.');
  if (bytes <= 0) throw Rep_erro_('INCOMPLETO', 'Não foi possível enviar o vídeo: o arquivo chegou vazio. Escolha de novo.');
  if (bytes > REP_LIMITES.videoBytes) throw Rep_erro_('GRANDE', 'Não foi possível enviar o vídeo: ele tem ' + Math.ceil(bytes / 1048576) + ' MB e o limite é de ' + Math.round(REP_LIMITES.videoBytes / 1048576) + ' MB. Grave um vídeo mais curto (30 segundos a 1 minuto mostrando o defeito costuma bastar) ou com qualidade menor (720p) e envie de novo.');
  var r = RepMi_ref_(eu, d.refTipo, d.refId, true);
  RepMi_conferirLimite_(eu, r, 1);
  return r;
}
/** Antes de gravar: confere sessão, papel, escopo, formato e tamanho. Devolve a pasta onde o servidor grava. */
function Representacao_midiaPreparar_(sessionId, d) {
  d = d || {};
  return RepMi_comSessao_(sessionId, function (eu) {
    var r = RepMi_conferirVideo_(eu, d);
    return { pastaId: Rep_pastaAnexos_(r.repId).getId(), nome: RepMi_nome_(d.nome, 'video.mp4'), refTipo: r.tipo, refId: r.id, numero: r.numero };
  });
}
/** Depois de gravar: confere de novo e registra o vídeo na galeria. d: { refTipo, refId, nome, mime, bytes, sha256, arquivoId, legenda, interna }. */
function Representacao_midiaRegistrar_(sessionId, d) {
  return RepMi_comSessao_(sessionId, function (eu) {
    d = d || {};
    var r = RepMi_conferirVideo_(eu, d);
    var f = DriveApp.getFileById(Rep_s_(d.arquivoId));
    Ast_privado_(f);
    var publico = RepMi_publico_(eu, d);
    var a = Rep_inserir_(REP_ABAS.ANEXOS, { REPRESENTADA_ID: r.repId, REF_TIPO: r.tipo, REF_ID: r.id, TIPO: 'VIDEO', NOME: RepMi_nome_(d.nome, 'video.mp4'), MIME: Rep_s_(d.mime).toLowerCase(),
      TAMANHO: Number(d.bytes) || 0, SHA256: Rep_s_(d.sha256).toLowerCase().replace(/[^0-9a-f]/g, '').slice(0, 64), ARQUIVO_ID: f.getId(), PUBLICO: publico, POR_LADO: eu.externo ? 'REPRESENTADA' : 'METROLABS',
      POR_ID: eu.id, POR_NOME: eu.externo ? Rep_quem_(eu) : eu.nome, EM: Rep_agora_(), LEGENDA: Rep_txt_(d.legenda, 200) });
    var texto = 'Vídeo anexado (' + Math.max(1, Math.round((Number(d.bytes) || 0) / 1048576)) + ' MB)' + (publico === 'INTERNO' ? ' (só para a Metrolabs)' : '') + '.';
    RepMi_registrar_(eu, r, texto, publico === 'INTERNO');
    if (eu.externo) Rep_acesso_('MIDIA', eu, d.ctx, r.numero + ': ' + texto);
    return { item: RepMi_item_(eu, a, r), message: 'Vídeo anexado no ' + (r.tipo === 'CHAMADO' ? 'chamado ' : 'pedido ') + r.numero + '.' };
  });
}
