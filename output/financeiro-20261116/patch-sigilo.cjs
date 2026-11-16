// Sigilo do Financeiro (16/11/2026, pedido do dono): só a Diretoria e a Wanessa. Uso: node patch-sigilo.cjs <pasta do legado>
//  - Acessos: caixa com "restrito" só vale para quem passa na trava (origem 'sigilo'); exceção/modelo/cópia não liberam.
//  - Omie_exigirAcesso_: confere a lista de sigilo antes de tudo e registra consultas e recusas (FIN_OMIE_ACESSOS).
//  - Ganhos: recebimentos do Omie só para quem está na lista.
//  - Tela: aba "Sigilo e acessos"; dados apagados da tela ao sair e após 10 minutos sem uso; planilha baixada fica registrada.
const fs = require('fs');
const path = require('path');
const pasta = process.argv[2];
function ed(f, a, b) {
  f = path.join(pasta, f);
  let t = fs.readFileSync(f, 'utf8'); const nl = t.includes('\r\n') ? '\r\n' : '\n';
  a = a.replace(/\r?\n/g, nl); b = b.replace(/\r?\n/g, nl);
  if (t.split(a).length !== 2) throw new Error('trecho não encontrado uma vez em ' + f + ': ' + a.slice(0, 90));
  fs.writeFileSync(f, t.replace(a, () => b));
}

// ---------------- Acessos (motor) ----------------
ed('SGO_Poderes.js', `var PODERES_ROTULO_ORIGEM = { dono: 'Responsável pelo sistema', excecao: 'Alterado para esta pessoa', padrao: 'Padrão do perfil', fixo: 'Conta de fora da equipe' };`,
  `var PODERES_ROTULO_ORIGEM = { dono: 'Responsável pelo sistema', excecao: 'Alterado para esta pessoa', padrao: 'Padrão do perfil', fixo: 'Conta de fora da equipe', sigilo: 'Fora da lista de sigilo' };
/** 16/11/2026: caixa sigilosa (ex.: Financeiro) só vale para quem passa na trava do módulo; erro na trava = NÃO. */
function Poderes_restritoOk_(poder, eu) {
  if (!poder || typeof poder.restrito !== 'function') return true;
  try { return !!poder.restrito(eu); } catch (e) { return false; }
}`);
ed('SGO_Poderes.js', `ligado: ligados.indexOf(l[0]) >= 0, padrao: regras[l[0]] || (extra && extra.padrao) };`,
  `ligado: ligados.indexOf(l[0]) >= 0, padrao: regras[l[0]] || (extra && extra.padrao) };
    if (extra && typeof extra.restrito === 'function') { p.restrito = extra.restrito; p.restritoMsg = extra.restritoMsg || ''; } // 16/11/2026: sigilo`);
ed('SGO_Poderes.js', `  if (Poderes_ehFora_(eu.perfil)) r = { valor: false, origem: 'fixo', padrao: false, excecao: null };
  else {`, `  if (Poderes_ehFora_(eu.perfil)) r = { valor: false, origem: 'fixo', padrao: false, excecao: null };
  else if (!Poderes_restritoOk_(poder, eu)) r = { valor: false, origem: 'sigilo', padrao: false, excecao: (Poderes_excecoes_()[eu.id] || {})[poder.codigo] || null };
  else {`);
ed('SGO_Poderes.js', `    vistos[p.codigo] = true;
    return { poder: p, valor: v };
  });`, `    vistos[p.codigo] = true;
    // 16/11/2026: caixa sigilosa não se libera por aqui para quem está fora da lista (cópia e modelo só pulam a caixa)
    if (v === 'SIM' && !Poderes_restritoOk_(p, alvo)) {
      if (acao === 'COPIAR' || acao === 'MODELO') return null;
      throw new Error('Não foi possível gravar: «' + p.nome + '» é sigilosa. ' + (p.restritoMsg || 'Só as contas da lista de sigilo do módulo podem tê-la.') + ' Nada foi alterado.');
    }
    return { poder: p, valor: v };
  }).filter(Boolean);
  if (!lista.length) return { alteradas: 0, iguais: 0 };`);

// ---------------- Omie: registro das caixas e trava ----------------
ed('SGO_Omie.js', `  SGO_PODERES_MODULOS.push({ item: it, padrao: function (eu, c) { return OMIE_PERFIS.indexOf(String((c && c.p) || (eu && eu.perfil) || '').toUpperCase()) >= 0; }, ligado: true });`,
  `  SGO_PODERES_MODULOS.push({ item: it, padrao: function (eu, c) { return OMIE_PERFIS.indexOf(String((c && c.p) || (eu && eu.perfil) || '').toUpperCase()) >= 0; }, ligado: true,
    // 16/11/2026: sigilo do Financeiro — fora da lista (SGO_Omie_Sigilo.js), nenhuma caixa do Financeiro vale
    restrito: function (eu) { return typeof Omie_contaNoSigilo_ === 'function' && Omie_contaNoSigilo_(eu && eu.id); },
    restritoMsg: 'O Financeiro é sigiloso: só as contas da lista de sigilo (Diretoria e Financeiro autorizado) podem ter estas caixas. A lista é mantida pelo responsável pelo sistema no Painel financeiro > Sigilo e acessos.' });`);
ed('SGO_Omie.js', `  if (!v || !v.valid || !v.data) Omie_erroPublico_('Sessão expirada. Entre novamente.');
  codigo = codigo || 'FIN_OMIE_CONSULTAR';
  if (typeof SGO_pode_ === 'function' && typeof Poderes_poder_ === 'function') {
    if (!SGO_pode_(sessionId, codigo)) Omie_erroPublico_(Poderes_msgSemPoder_(Poderes_poder_(codigo), acao));
  } else if (OMIE_PERFIS.indexOf(String(v.data.perfil || '').toUpperCase()) < 0) {
    Omie_erroPublico_('Acesso restrito ao Financeiro, à Diretoria e ao Administrador.');
  }
  return v.data;`, `  if (!v || !v.valid || !v.data) Omie_erroPublico_('Sessão expirada. Entre novamente.');
  // 16/11/2026: sigilo do Financeiro, antes de tudo (SGO_Omie_Sigilo.js). Sem a trava carregada, ninguém passa.
  if (typeof Omie_contaNoSigilo_ !== 'function' || !Omie_contaNoSigilo_(v.data.userId)) {
    if (typeof Omie_registrarAcesso_ === 'function') Omie_registrarAcesso_(v.data, 'NEGADO');
    Omie_erroPublico_(typeof OMIE_SIGILO_MSG === 'string' ? OMIE_SIGILO_MSG : 'O Financeiro é sigiloso. Nada foi consultado.');
  }
  codigo = codigo || 'FIN_OMIE_CONSULTAR';
  if (typeof SGO_pode_ === 'function' && typeof Poderes_poder_ === 'function') {
    if (!SGO_pode_(sessionId, codigo)) { Omie_registrarAcesso_(v.data, 'NEGADO', '', 'Sem a caixa ' + codigo); Omie_erroPublico_(Poderes_msgSemPoder_(Poderes_poder_(codigo), acao)); }
  } else if (OMIE_PERFIS.indexOf(String(v.data.perfil || '').toUpperCase()) < 0) {
    Omie_erroPublico_('Acesso restrito ao Financeiro, à Diretoria e ao Administrador.');
  }
  Omie_registrarAcesso_(v.data, 'PERMITIDO');
  return v.data;`);
ed('SGO_Omie.js', `    if (!v || !v.valid || !v.data) return { ok: true, ver: false, poderes: {} };
    var poderes = {};`, `    if (!v || !v.valid || !v.data) return { ok: true, ver: false, poderes: {} };
    // 16/11/2026: fora da lista de sigilo, o menu nem aparece (e nada do Omie é dito: nem se está configurado)
    if (typeof Omie_contaNoSigilo_ !== 'function' || !Omie_contaNoSigilo_(v.data.userId)) return { ok: true, ver: false, poderes: {} };
    var poderes = {};`);
// textos das caixas: o padrão agora é a lista de sigilo
let o = fs.readFileSync(path.join(pasta, 'SGO_Omie.js'), 'utf8');
const n0 = (o.match(/Padrão: Financeiro, Diretoria e Administrador\./g) || []).length;
if (n0 !== 6) throw new Error('textos "Padrão:" das caixas do Omie: esperado 6, achado ' + n0);
o = o.replace(/Padrão: Financeiro, Diretoria e Administrador\./g, 'Sigiloso: só as contas da lista de sigilo do Financeiro (Diretoria e Financeiro autorizado).');
fs.writeFileSync(path.join(pasta, 'SGO_Omie.js'), o);

// ---------------- Ganhos: recebimentos do Omie ----------------
ed('SGO_Omie_Ganhos.js', `  if (typeof SGO_pode_ === 'function' && typeof Poderes_poder_ === 'function' && !SGO_pode_(GV_sessaoDe_(eu), 'FIN_OMIE_CONSULTAR')) throw new Error(Poderes_msgSemPoder_(Poderes_poder_('FIN_OMIE_CONSULTAR'), 'ver os recebimentos do Omie'));`,
  `  // 16/11/2026: sigilo do Financeiro antes da caixa (a trava registra a recusa)
  if (typeof Omie_exigirSigilo_ !== 'function') throw new Error('O Financeiro é sigiloso. Nada foi consultado.');
  Omie_exigirSigilo_({ userId: eu && (eu.userId || eu.id), usuario: eu && (eu.usuario || eu.login), nome: eu && eu.nome }, 'GV_omieRecebimentos_');
  if (typeof SGO_pode_ === 'function' && typeof Poderes_poder_ === 'function' && !SGO_pode_(GV_sessaoDe_(eu), 'FIN_OMIE_CONSULTAR')) throw new Error(Poderes_msgSemPoder_(Poderes_poder_('FIN_OMIE_CONSULTAR'), 'ver os recebimentos do Omie'));
  if (typeof Omie_registrarAcesso_ === 'function') Omie_registrarAcesso_({ userId: eu && (eu.userId || eu.id), usuario: eu && (eu.usuario || eu.login), nome: eu && eu.nome }, 'PERMITIDO', 'GV_omieRecebimentos_');`);
ed('SGO_Ganhos_Vendedores.js', `(typeof SGO_pode_ !== 'function' || !!SGO_pode_(GV_sessaoDe_(eu), 'FIN_OMIE_CONSULTAR')) };`,
  `(typeof SGO_pode_ !== 'function' || !!SGO_pode_(GV_sessaoDe_(eu), 'FIN_OMIE_CONSULTAR')) && typeof Omie_contaNoSigilo_ === 'function' && Omie_contaNoSigilo_(eu && (eu.userId || eu.id)) };`);

// ---------------- Acessos (tela): selo do sigilo e caixa travada ----------------
ed('JS_Acessos.html', `    var selo = i.origem === "dono" ? '<span class="acs-selo dono">Responsável pelo sistema</span>' :`,
  `    if (i.origem === "sigilo") podeAlterar = false; // 16/11/2026: caixa sigilosa fora da lista: não se libera por aqui
    var selo = i.origem === "sigilo" ? '<span class="acs-selo excecao">Sigiloso: fora da lista do módulo</span>' : i.origem === "dono" ? '<span class="acs-selo dono">Responsável pelo sistema</span>' :`);

// ---------------- Painel financeiro (tela) ----------------
ed('JS_Omie_Gestao.html', `['provisoes','Provisões'], ['comissoes','Comissões'] ];`, `['provisoes','Provisões'], ['comissoes','Comissões'], ['sigilo','Sigilo e acessos'] ];`);
ed('JS_Omie_Gestao.html', `    if (aba === 'provisoes') { OmieGest_provisoes_(); return; }`, `    if (aba === 'provisoes') { OmieGest_provisoes_(); return; }
    if (aba === 'sigilo' && typeof OmieSig_render_ === 'function') { OmieSig_render_(); return; } // 16/11/2026`);
ed('JS_Omie_Gestao.html', `    OmieTela_abrir_('resumo');
  }`, `    OmieTela_abrir_('resumo');
    OmieSig_vigiar_();
  }`);
ed('JS_Omie_Gestao.html', `    a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 2000);`,
  `    a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    try { google.script.run.withFailureHandler(function () {}).Omie_apiCsv(SGO_getSessionId(), { nome: nome }); } catch (e) {} // 16/11/2026: fica no registro de acessos`);
ed('JS_Omie.html', `  function OmieTela_menu_() {
    // Invalida callbacks do usuário anterior no login/logout.
    OMIE_TELA.pedido++;`, `  function OmieTela_menu_() {
    // Invalida callbacks do usuário anterior no login/logout.
    OMIE_TELA.pedido++;
    if (typeof OmieSig_limpar_ === 'function') OmieSig_limpar_(); // 16/11/2026: nenhum dado financeiro fica na página ao sair ou trocar de conta`);
ed('JS_Omie_Gestao.html', `  var OMIE_GEST_PEDIDOS = {};`, `  var OMIE_GEST_PEDIDOS = {};
  // 16/11/2026: sigilo na tela. Ao sair, trocar de conta ou após 10 minutos sem uso no Painel financeiro, os dados somem da
  // página (as listas guardadas para a planilha também). Volta com "Mostrar de novo" (nova consulta, registrada).
  var OMIE_SIG = { ultimo: 0, timer: null, ocioMs: 10 * 60 * 1000 };
  function OmieSig_limpar_(motivo) {
    try { OMIE_CSV = {}; } catch (e) {}
    var t = document.getElementById('omieTela');
    if (!t) return;
    OMIE_TELA.pedido++;
    if (!motivo) { t.parentNode && (t.outerHTML = ''); return; }
    t.innerHTML = '<div class="module-header"><div class="module-header-left"><h2 class="content-title">Painel financeiro</h2></div></div><div class="cadx-vazio bc-vazio" role="status"><strong>Dados ocultados por sigilo.</strong><p>' + CadUI_esc_(motivo) + '</p><p><button type="button" class="cadx-btn" onclick="OmieTela_render_()">Mostrar de novo</button></p></div>';
  }
  function OmieSig_mexeu_() { OMIE_SIG.ultimo = Date.now(); }
  function OmieSig_vigiar_() {
    OMIE_SIG.ultimo = Date.now();
    if (!OMIE_SIG.ligado) {
      OMIE_SIG.ligado = true;
      ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'].forEach(function (ev) { document.addEventListener(ev, OmieSig_mexeu_, { passive: true, capture: true }); });
    }
    if (OMIE_SIG.timer) clearInterval(OMIE_SIG.timer);
    OMIE_SIG.timer = setInterval(function () {
      var t = document.getElementById('omieTela');
      if (!t) { clearInterval(OMIE_SIG.timer); OMIE_SIG.timer = null; return; }
      if (!document.getElementById('omieCorpo')) return; // já ocultado
      if (Date.now() - OMIE_SIG.ultimo >= OMIE_SIG.ocioMs) OmieSig_limpar_('O Painel financeiro ficou 10 minutos sem uso e os dados foram retirados da tela.');
    }, 30000);
  }
  function OmieSig_render_() {
    var alvo = document.getElementById('omieCorpo'); if (!alvo) return;
    alvo.innerHTML = '<section><h3>Sigilo e acessos</h3><p class="content-subtitle">Quem pode ver o Financeiro e quem consultou.</p><p id="omieGestStatus" aria-live="polite"></p><div id="omieSigCorpo">' + CadUI_esqueleto_(3) + '</div></section>';
    OmieGest_chamar_('Omie_apiSigilo', null, OmieSig_pintar_);
  }
  function OmieSig_pintar_(r) {
    var c = document.getElementById('omieSigCorpo'); if (!c) return;
    var esc = CadUI_esc_, h = '<div class="vg-faixa is-alerta" role="note"><b>O Financeiro é sigiloso.</b> Só as contas abaixo o acessam, qualquer que seja o perfil ou as caixas em Administração > Acessos. Toda consulta e toda recusa ficam registradas (sem valores). Na tela, os dados somem ao sair e após 10 minutos sem uso.</div>';
    h += '<h4>Contas autorizadas' + (r.padrao ? ' (lista padrão)' : '') + '</h4>' + OmieGest_tabela_(['Nome', 'Usuário', 'Perfil', 'Situação'], r.autorizados.map(function (a) { return [a.nome, a.usuario, a.perfil, a.situacao]; }));
    if (r.dono && r.contas) {
      h += '<details class="omie-sig-editar"><summary>Alterar a lista (só o responsável pelo sistema)</summary><p>Marque quem pode ver o Financeiro. Você continua na lista. Contas de clientes e de representadas nunca entram.</p><div class="omie-sig-contas">' +
        r.contas.map(function (u) { var id = 'omieSig_' + esc(u.id); return '<label for="' + id + '"><input type="checkbox" id="' + id + '" data-omie-sig="' + esc(u.id) + '"' + (u.marcado ? ' checked' : '') + '> ' + esc(u.nome) + ' <span class="cadx-sub">(' + esc(u.usuario) + ' · ' + esc(u.perfil) + (u.area ? ' · ' + esc(u.area) : '') + ')</span></label>'; }).join('') +
        '</div><label for="omieSigMotivo">Motivo<input class="cadx-input" id="omieSigMotivo" maxlength="200" placeholder="Ex.: nova pessoa no Financeiro"></label><p><button type="button" class="cadx-btn" onclick="OmieSig_salvar_()">Gravar a lista</button></p></details>';
    }
    if (r.diretoria && r.registro) {
      h += '<h4>Registro de acessos (últimos 300)</h4><p>' + (r.negados30 ? '<b>' + r.negados30 + ' tentativa(s) recusada(s) nos últimos 30 dias.</b> ' : 'Nenhuma tentativa recusada nos últimos 30 dias. ') + 'A mesma consulta da mesma pessoa aparece uma vez a cada 10 minutos.</p>' +
        (r.registro.length ? OmieGest_tabela_(['Quando', 'Quem', 'O quê', 'Resultado', 'Detalhe'], r.registro.map(function (x) { return [x.em, x.nome + (x.usuario ? ' (' + x.usuario + ')' : ''), x.consulta, x.resultado === 'NEGADO' ? 'RECUSADO' : x.resultado === 'PERMITIDO' ? 'Consultou' : x.resultado === 'CSV' ? 'Baixou planilha' : x.resultado === 'LISTA_ALTERADA' ? 'Lista alterada' : x.resultado, x.detalhe]; })) : '<div class="cadx-vazio bc-vazio">Nenhum acesso registrado ainda.</div>');
    }
    c.innerHTML = h;
  }
  function OmieSig_salvar_() {
    var ids = Array.prototype.map.call(document.querySelectorAll('[data-omie-sig]:checked'), function (x) { return x.getAttribute('data-omie-sig'); });
    var motivo = (document.getElementById('omieSigMotivo') || {}).value || '';
    OmieGest_chamar_('Omie_apiSigiloSalvar', { ids: ids, motivo: motivo }, function (r) { if (r.tela && r.tela.ok) OmieSig_pintar_(r.tela); });
  }`);
ed('JS_Omie_Gestao.html', `  @media(max-width:700px) { #omieTela input, #omieTela select { font-size:16px; } #omieTela .omie-abas .cadx-btn { flex:1 1 140px; } }`,
  `  @media(max-width:700px) { #omieTela input, #omieTela select { font-size:16px; } #omieTela .omie-abas .cadx-btn { flex:1 1 140px; } }
  #omieTela .omie-sig-contas { display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:8px; margin:12px 0; }
  #omieTela .omie-sig-contas label { min-height:44px; }
  #omieTela .omie-sig-editar { margin:16px 0; }`);
// mensagens antigas da tela
let j = fs.readFileSync(path.join(pasta, 'JS_Omie_Gestao.html'), 'utf8');
j = j.split('Acesso restrito ao Financeiro, à Diretoria e ao Administrador.').join('O Financeiro é sigiloso: só a Diretoria e o Financeiro autorizado o acessam.');
fs.writeFileSync(path.join(pasta, 'JS_Omie_Gestao.html'), j);
j = fs.readFileSync(path.join(pasta, 'JS_Omie.html'), 'utf8');
j = j.split('Acesso restrito ao Financeiro, à Diretoria e ao Administrador.').join('O Financeiro é sigiloso: só a Diretoria e o Financeiro autorizado o acessam.');
fs.writeFileSync(path.join(pasta, 'JS_Omie.html'), j);
console.log('ok');
// (aplicado à mão em seguida e repetido aqui) intervalo chama OmieSig_conferir_, testável
