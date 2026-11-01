// Programa de melhoria do SGO+, Etapa 6 (01/11/2026): Administração e telas de configuração (Usuários, Configurações,
// Chaves e senhas, Segurança do acesso, Matriz de avisos, Piloto do WhatsApp, Integração Auvo, Automação predial).
// Confere: o voltar entre as partes da Automação predial; a Matriz agrupada por módulo (fechada no celular); os textos do
// Piloto do WhatsApp sem nome interno de chave e com data pt-BR; alvos de toque de 44 px no celular; listas vazias que dizem
// o que fazer; "Desconectar aparelhos" no lugar de "Zerar segundo fator" sem mudar a ação nem a permissão; ajudas e manuais.
// Só lógica; sem dados reais, sem senha, código, chave ou token.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const docs = path.join(__dirname, '../docs');
const bruto = (f) => fs.readFileSync(path.join(pasta, f), 'utf8');
const ler = (f) => bruto(f).replace(/\r\n/g, '\n');
const lerDoc = (f) => fs.readFileSync(path.join(docs, f), 'utf8').replace(/\r\n/g, '\n');

function funcao(fonte, nome) {
  const i = fonte.indexOf('function ' + nome + '(');
  assert.ok(i >= 0, 'função ' + nome + ' não encontrada');
  let j = fonte.indexOf('{', i), n = 0, aspas = null;
  for (let k = j; k < fonte.length; k++) {
    const c = fonte[k];
    if (aspas) { if (c === '\\') { k++; continue; } if (c === aspas) aspas = null; continue; }
    if (c === '"' || c === "'" || c === '`') { aspas = c; continue; }
    if (c === '/' && fonte[k + 1] === '/') { k = fonte.indexOf('\n', k); continue; }
    if (c === '{') n++;
    else if (c === '}') { n--; if (n === 0) return fonte.slice(i, k + 1); }
  }
  throw new Error('fim de ' + nome);
}

test('Automação predial: trocar de parte é um passo do voltar, e voltar redesenha a parte anterior', () => {
  const fonte = ler('JS_AutomacaoPredial.html');
  const passos = [];
  let desenhos = 0;
  const ctx = vm.createContext({
    AUTP: { aba: 'dispositivos', aberto: 'x' },
    AutPred_desenhar_() { desenhos++; },
    window: { SGO_MODULO_ATUAL: 'automacao_predial', SGO_NAV: { empilhar: (rotulo, fn, op) => { passos.push({ rotulo, fn, op }); return 'id' + passos.length; } } },
    document: { getElementById: (id) => (id === 'autCorpo' ? {} : null) }
  });
  ctx.SGO_NAV = ctx.window.SGO_NAV;
  const ini = fonte.indexOf('var AUTP_NOMES_ABA');
  assert.ok(ini > 0);
  vm.runInContext(fonte.slice(ini, fonte.indexOf('\n', ini)) + '\n' + funcao(fonte, 'AutPred_aba_'), ctx);
  ctx.AutPred_aba_('permissoes');
  assert.equal(ctx.AUTP.aba, 'permissoes');
  assert.equal(ctx.AUTP.aberto, '');
  assert.equal(passos.length, 1);
  assert.equal(passos[0].rotulo, 'Automação predial: Permissões');
  ctx.AutPred_aba_('permissoes'); // mesma parte: sem passo novo
  assert.equal(passos.length, 1);
  ctx.AutPred_aba_('auditoria');
  assert.equal(passos.length, 2);
  passos[1].fn(); // voltar
  assert.equal(ctx.AUTP.aba, 'permissoes', 'voltar leva à parte anterior');
  passos[0].fn();
  assert.equal(ctx.AUTP.aba, 'dispositivos');
  const antes = desenhos;
  ctx.window.SGO_MODULO_ATUAL = 'dashboard';
  passos[0].fn();
  assert.equal(desenhos, antes, 'fora da tela, o voltar não redesenha nada');
  // as partes são abas de verdade (a casca lembra a aba ativa pelo aria-selected)
  assert.match(fonte, /<div class="aut-abas" role="tablist"/);
  assert.match(fonte, /role="tab" aria-selected="' \+ \(AUTP\.aba === a\[0\] \? "true" : "false"\)/);
});

test('Automação predial: faixa de simulação em lista, dizendo quem resolve e o que fazer depois', () => {
  const fonte = ler('JS_AutomacaoPredial.html');
  assert.match(fonte, /<strong>Nenhum comando real sai agora<\/strong> \(tudo trabalha em simulação\)\. O que falta:<ul/);
  assert.match(fonte, /Quem resolve é o responsável pelo sistema, em Chaves e senhas &gt; Automação predial \(Tuya\)\. Depois, toque em Atualizar\./);
  assert.doesNotMatch(fonte, /\(cfg\.faltas \|\| \[\]\)\.join\("; "\)\) \+ "\. O responsável/);
});

function regrasMatriz(celular, abertos) {
  const fonte = ler('JS_AvisosMatriz.html');
  const alvo = { innerHTML: '', ouvidos: [], querySelectorAll() { return []; } };
  const ctx = vm.createContext({
    MTZ: { modulo: '', abertos: abertos || {}, dados: {
      modulos: { atv: 'Minhas atividades', frota: 'Frota' }, rotulosEmail: { RESUMO: 'No resumo' }, rotulosWhats: { NAO: 'Sem WhatsApp' },
      regras: [
        { cod: 'S01', modulo: 'atv', moduloNome: 'Minhas atividades', evento: 'Atividade nova', publico: 'dono', limite: '-', origem: 'x', email: 'RESUMO', whatsapp: 'NAO', decisao: 'AVISA' },
        { cod: 'S02', modulo: 'atv', moduloNome: 'Minhas atividades', evento: 'Atividade atrasada', publico: 'dono', limite: '-', origem: 'x', email: 'RESUMO', whatsapp: 'NAO', decisao: 'AVISA', alterada: true },
        { cod: 'F01', modulo: 'frota', moduloNome: 'Frota', evento: 'Multa', publico: 'gestor', limite: '-', origem: 'x', email: 'RESUMO', whatsapp: 'NAO', decisao: 'AVISA' }
      ] } },
    Mtz_esc_: (v) => String(v === null || v === undefined ? '' : v),
    CadUI_movel_: () => celular,
    document: { getElementById: (id) => (id === 'mtzRegras' ? alvo : null) }
  });
  vm.runInContext(funcao(fonte, 'AvisosMatriz_desenharRegras_'), ctx);
  ctx.AvisosMatriz_desenharRegras_();
  return { ctx, alvo };
}

test('Matriz de avisos: "Todos" agrupa por módulo; fechado no celular, aberto no computador; lembra o que a pessoa abriu', () => {
  let { alvo } = regrasMatriz(true);
  const grupos = alvo.innerHTML.match(/<details class="mtz-grupo"[^>]*>/g);
  assert.equal(grupos.length, 2);
  assert.ok(grupos.every((g) => !/ open/.test(g)), 'no celular, fechados');
  assert.match(alvo.innerHTML, /<summary>Minhas atividades <span class="mtz-sit neutro">2 avisos<\/span> <span class="mtz-sit alerta">1 alterado<\/span><\/summary>/);
  assert.match(alvo.innerHTML, /<summary>Frota <span class="mtz-sit neutro">1 aviso<\/span><\/summary>/);
  assert.equal((alvo.innerHTML.match(/class="mtz-regra"/g) || []).length, 3, 'todas as regras continuam na página (os campos existem para salvar)');
  ({ alvo } = regrasMatriz(false));
  assert.ok(alvo.innerHTML.match(/<details class="mtz-grupo"[^>]*>/g).every((g) => / open/.test(g)), 'no computador, abertos');
  ({ alvo } = regrasMatriz(true, { frota: true }));
  assert.match(alvo.innerHTML, /<details class="mtz-grupo" data-mod="frota" open>/);
  assert.match(alvo.innerHTML, /<details class="mtz-grupo" data-mod="atv">/);
  // um módulo escolhido: lista simples; nenhum evento: diz o que fazer
  const r = regrasMatriz(true);
  r.ctx.MTZ.modulo = 'frota'; r.ctx.AvisosMatriz_desenharRegras_();
  assert.doesNotMatch(r.alvo.innerHTML, /mtz-grupo/);
  assert.match(r.alvo.innerHTML, /data-cod="F01"/);
  r.ctx.MTZ.modulo = 'nada'; r.ctx.AvisosMatriz_desenharRegras_();
  assert.match(r.alvo.innerHTML, /Nenhum evento neste módulo\. Escolha outro módulo ou "Todos" no campo Módulo\./);
  const fonte = ler('JS_AvisosMatriz.html');
  assert.match(fonte, /\.mtz-grupo > summary \{[^}]*min-height: 44px/);
  assert.match(fonte, /class="cadx-btn mtz-btn-quebra" onclick="abrir\(\\'gestao_decisoes\\'\)/);
});

test('Piloto do WhatsApp: motivo sem nome interno de chave, data pt-BR, sem "(vazio)" na tela', () => {
  const fonte = ler('JS_WhatsappPiloto.html');
  const ctx = vm.createContext({});
  const ini = fonte.indexOf('var WAP_NOMES_CHAVES');
  vm.runInContext(fonte.slice(ini, fonte.indexOf('\n', ini)) + '\n' + funcao(fonte, 'WaPiloto_textoMotivo_') + '\n' + funcao(fonte, 'WaPiloto_dataBr_'), ctx);
  const m = ctx.WaPiloto_textoMotivo_('WhatsApp oficial (Meta) não configurado: falta gravar META_WA_TOKEN e META_WA_PHONE_ID em Chaves e senhas do SGO+.');
  assert.doesNotMatch(m, /META_WA_/);
  assert.match(m, /falta gravar o token permanente e a identificação do número de telefone em Chaves e senhas > WhatsApp oficial \(Meta\); quem grava é o responsável pelo sistema\./);
  assert.equal(ctx.WaPiloto_textoMotivo_(''), '');
  assert.equal(ctx.WaPiloto_dataBr_('2026-11-01T12:15:44.000Z'), '01/11/2026 12:15');
  assert.equal(ctx.WaPiloto_dataBr_('2026-11-01 08:05'), '01/11/2026 08:05');
  assert.equal(ctx.WaPiloto_dataBr_('2026-11-01'), '01/11/2026');
  assert.equal(ctx.WaPiloto_dataBr_(''), '');
  assert.doesNotMatch(fonte, /replace\("T", " "\)\.slice\(0, 16\)/);
  assert.match(fonte, /d\.provedorEscolhido === "\(vazio\)" \|\| !d\.provedorEscolhido \? 'Nenhum provedor está escolhido em Chaves e senhas\.'/);
  assert.match(fonte, /"Envio antigo \(Z-API\) desligado" : "Envio antigo \(Z-API\) liberado"/);
  assert.match(fonte, /\. Para ver outro dia' \+ \(pessoa \?/);
  // alvos de toque no celular
  assert.match(fonte, /@media \(max-width: 700px\) \{ \.wap-pessoa > input \{[^}]*\} \.wap-pessoa label\[for\] \{ display: inline-flex; align-items: center; min-height: 44px; \}/);
  assert.match(fonte, /\.wap-grupos label, \.wap-areas label \{ min-height: 44px; \}/);
  // o envio não muda: a gravação e o teste chamam as mesmas ações do servidor
  assert.match(fonte, /WaPiloto_chamar_\("gravar", \{ ligado: ligado, usuarios: usuarios, areas: areas, grupos: grupos \}/);
  assert.match(fonte, /WaPiloto_chamar_\("testar", \{ usuarioId: id \}/);
});

test('Segurança do acesso: "Desconectar aparelhos" com a mesma ação e a mesma trava do Administrador', () => {
  const tela = ler('JS_SegurancaAcesso.html');
  assert.doesNotMatch(tela, />Zerar segundo fator</);
  assert.match(tela, /SegAcessoTela_acaoPessoa_\(\\'zerarSegundoFator\\', \\'' \+ esc\(p\.id\) \+ '\\'\)"[^>]*>Desconectar aparelhos<\/button>/);
  assert.match(tela, /botao: zerar \? "Desconectar aparelhos" : "Exigir nova senha"/);
  assert.match(tela, /<summary>Modelo da mensagem do código no WhatsApp \(Meta\)<\/summary>/);
  assert.doesNotMatch(tela, /\(sgo_codigo_acesso\)<\/summary>/);
  assert.match(tela, /Nenhum evento no período escolhido\. Para ver mais, aumente o período/);
  const srv = ler('SGO_SegurancaAcesso.js');
  const caso = srv.slice(srv.indexOf("case 'zerarSegundoFator': {"), srv.indexOf("case 'modeloSituacao':"));
  assert.match(caso, /exigirAdmin\(\);/, 'a permissão continua: só o Administrador');
  assert.match(caso, /SegAcesso_zerarSegundoFator_\(alvo, motivoU, por, true\);/);
  assert.match(srv, /SEGUNDO_FATOR_ZERADO: 'Aparelhos desconectados \(24 h sem código\)',/);
});

test('Configurações e Chaves e senhas: alvos de 44 px, minutos no lugar de segundos, chaves só do responsável explicadas', () => {
  const adm = ler('JS_Admin.html');
  assert.match(adm, /<label class="cadx-chave" style="min-height:44px"><input type="checkbox" id="cfgSom"/);
  assert.match(adm, /<label class="cadx-chave" style="min-height:44px"><input type="checkbox" id="ap_critico_chave">/);
  assert.doesNotMatch(adm, /min-height:36px/);
  assert.match(adm, /dica: "Mínimo de meio minuto\. Hoje: " \+ CadUI_num_\(minutos\) \+ \(minutos === 1 \? " minuto\." : " minutos\."\)/);
  const chv = ler('JS_Chaves.html');
  assert.match(chv, /As chaves das integrações ficam com o responsável pelo sistema\./);
  assert.doesNotMatch(chv, /Configurações restritas conforme as permissões do seu usuário/);
  // a lista das chaves continua vindo do servidor só para o responsável (nada muda na permissão)
  const srv = ler('SGO_Chaves.js');
  assert.match(srv, /var r = dono \? Chaves_lista_\(\) : \{ grupos: \[\], itens: \[\], testes: \{\} \};/);
});

test('Integração Auvo: o texto ao lado da chave liga e desliga, com 44 px no celular; o módulo continua carregando', () => {
  const f = ler('SGO_Auvo_ConteudoModulo.js');
  assert.match(f, /<label class="toggle-texto" for="tplAuvo_toggleSincAuto">Sincronizar automaticamente a cada 30 minutos<\/label>/);
  assert.match(f, /<label class="toggle-texto" for="tplAuvo_pendToggleDiario">Atualizar automaticamente todo dia às 5h<\/label>/);
  assert.match(f, /@media \(max-width: 700px\) \{ #tplAuvoContainer \.toggle-linha \{ min-height: 44px; \}/);
  const conteudo = new Function(bruto('SGO_Auvo_ConteudoModulo.js') + ';return AUVO_CONTEUDO_MODULO;')();
  assert.ok(conteudo.length > 50000);
  const sc = conteudo.split('<script>').slice(1).map((x) => x.split('</script>')[0]).join('\n');
  assert.doesNotThrow(() => new vm.Script(sc), 'o JavaScript do módulo continua válido');
  assert.match(ler('SGO_Auvo_Main.js'), /return AUVO_CONTEUDO_MODULO;/);
});

test('fim de linha preservado nas telas e ajudas mexidas nesta etapa (sem arquivo misturado)', () => {
  ['JS_Admin.html', 'JS_Chaves.html', 'JS_SegurancaAcesso.html', 'JS_AvisosMatriz.html', 'JS_WhatsappPiloto.html', 'JS_AutomacaoPredial.html',
    'SGO_Auvo_ConteudoModulo.js', 'SGO_Ajuda_Administracao.js', 'SGO_Ajuda_AutomacaoPredial.js', 'SGO_Ajuda_Auvo.js', 'SGO_SegurancaAcesso.js', 'SGO_AssistenteManuais.js'].forEach((f) => {
    const s = bruto(f);
    const linhas = s.split('\n').length - 1, crlf = (s.match(/\r\n/g) || []).length;
    assert.ok(crlf === 0 || crlf === linhas, f + ': ' + crlf + ' de ' + linhas + ' linhas em CRLF (misturado)');
  });
});

test('ajudas e manuais da Etapa 6', () => {
  const adm = ler('SGO_Ajuda_Administracao.js');
  assert.match(adm, /Onde foi parar o \\"Zerar segundo fator\\"\?/);
  assert.match(adm, /toque em \\"Desconectar aparelhos\\"/);
  assert.match(adm, /Com Módulo em \\"Todos\\", as regras aparecem em grupos fechados/);
  assert.match(adm, /O bloco Situação diz que falta gravar o token permanente/);
  assert.match(adm, /As chaves das integrações ficam com o responsável pelo sistema/);
  assert.doesNotMatch(adm, /\\"Z-API desligada\\"/);
  assert.match(ler('SGO_Ajuda_AutomacaoPredial.js'), /trocar de parte \(Dispositivos, Permissões, Auditoria, Saúde da infraestrutura\) é um passo do voltar/);
  assert.match(ler('SGO_Ajuda_Auvo.js'), /Toque também no texto ao lado da chave/);
  assert.match(lerDoc('MANUAL_NAVEGACAO_VOLTAR.md'), /## Etapa 6 \(01\/11\/2026\): Administração e telas de configuração/);
  assert.match(lerDoc('MANUAL_MATRIZ_DE_AVISOS.md'), /as regras vêm agrupadas por módulo/);
  assert.match(lerDoc('MANUAL_MODULO_AUTOMACAO_PREDIAL.md'), /trocar de parte \(Dispositivos, Permissões, Auditoria, Saúde da infraestrutura\) é um passo do voltar/);
  const seg = lerDoc('MANUAL_SEGURANCA_ACESSO_GESTAO.md');
  assert.match(seg, /\*\*Desconectar aparelhos\*\*/);
  assert.match(seg, /e toque em Desconectar aparelhos\./);
  // a base do assistente carrega os manuais novos
  const base = ler('SGO_AssistenteManuais.js');
  assert.match(base, /as regras vêm agrupadas por módulo/);
  assert.match(base, /Desconectar aparelhos/);
});

test('arquivos que não podem mudar nesta etapa', () => {
  ['AssistenteWidget.html', 'ComunicacaoWidget.html'].forEach((f) => assert.doesNotMatch(ler(f), /Etapa 6/));
  // nenhuma tela desta etapa grava senha, código ou token em log do navegador
  ['JS_Admin.html', 'JS_Chaves.html', 'JS_SegurancaAcesso.html', 'JS_WhatsappPiloto.html', 'JS_AutomacaoPredial.html'].forEach((f) => {
    assert.doesNotMatch(ler(f), /console\.(log|info)\([^)]*(senha|token|codigo|segredo)/i, f);
  });
});
