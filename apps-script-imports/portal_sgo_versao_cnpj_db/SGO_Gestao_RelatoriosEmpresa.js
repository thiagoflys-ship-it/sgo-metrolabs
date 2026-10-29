/****************************************************
 * RELATÓRIOS AUTOMÁTICOS DA EMPRESA (29/10/2026, pacote validado pelo dono)
 *
 * Quem recebe: a lista "Quem recebe os relatórios da empresa" (propriedade
 * GES_RELATORIOS_EMPRESA_CFG, por id de usuário), editável só pela Diretoria e
 * pelo Administrador em Desempenho da gestão > Relatórios. Sem lista gravada vale
 * o padrão: Diretoria (perfil Diretoria e o dono do sistema) e quem é gestor da
 * área Qualidade (perfil Gestor ou Administrador com área Qualidade no cadastro,
 * ou responsável pela área Qualidade em Regras e responsáveis). Nenhum id fixo.
 *
 * Regra de acesso de cada relatório (vale também para quem está na lista):
 *  - com nome de envolvido do Programa de conduta (relatório da equipe e
 *    prestação de contas das missões): só quem vê a identidade do envolvido
 *    (Diretoria e Gestor de Qualidade, Conduta_veIdentidadeUsuario_);
 *  - Desempenho da gestão e Semanal da gestão (avaliação de gestores): só a
 *    Diretoria, como na tela;
 *  - os demais: toda a lista.
 * O e-mail diz o que não foi e por quê.
 *
 * PACOTE SEMANAL (primeiro dia útil da semana, a partir das 08:00), semana anterior
 * (segunda a domingo): Semanal da gestão, Programa de conduta (semanal da equipe e
 * prestação de contas das missões do mês), Frota da semana (rastreamento e copiloto),
 * Comercial da semana (quando o Comercial está em uso) e SEDNA da semana (cobranças
 * das atividades atrasadas por nível e por pessoa, e quantas foram resolvidas).
 *
 * PACOTE MENSAL (primeiro dia útil do mês), mês anterior: "Saúde da empresa"
 * (primeira página, regra no próprio documento), os mensais da gestão (Desempenho
 * da gestão, Frota, Programa de conduta da equipe, Atividades e, quando em uso,
 * Comercial, Compras e Assistência) e o fechamento mensal do Programa de conduta.
 *
 * Gerado sozinho dentro da rodada de 15 minutos da gestão (SGO_Gestao_Escada.js),
 * um relatório por rodada, guardado em "Gestão - Relatórios" e registrado em
 * GES_ENVIOS (TIPO EMPRESA_ITEM; os mensais e o semanal da gestão continuam com
 * TIPO MENSAL e SEMANAL, então nunca saem duas vezes). O e-mail (TIPO
 * EMPRESA_PACOTE, um por pessoa e pacote) sai quando tudo ficou pronto ou na
 * hora-limite (GES_HORA_LIMITE_RELATORIOS) com o que ficou pronto e o motivo do
 * resto. Semanal e mensal no mesmo dia vão num e-mail só. Expediente e feriados
 * como o resto (SGO_Expediente.js). Com o pacote ligado, o e-mail diário da
 * Diretoria não leva mais os links (diz que vão à parte).
 *
 * Botão "Gerar e enviar agora (teste)" (Diretoria e Administrador): gera o que falta
 * e manda o pacote só para quem clicou (TIPO EMPRESA_TESTE; não conta como envio do
 * pacote de verdade).
 * Nenhuma função devolve Date cru.
 ****************************************************/

var RELEMP_CFG_PROP = 'GES_RELATORIOS_EMPRESA_CFG';
var RELEMP_ORIGEM = 'GESTAO_RELATORIOS_EMPRESA';
var RELEMP_TEMPO_TESTE_MS = 270000;   // o botão de teste para de gerar depois de 4min30 (limite de 6 min da execução)
var RELEMP_PUBLICO_TEXTO = {
  DIRETORIA: 'avaliação de gestores: só a Diretoria',
  NOMES: 'traz nomes do Programa de conduta: só a Diretoria e o Gestor de Qualidade'
};

// ------------------------------------------------------------
// CONFIGURAÇÃO E DESTINATÁRIOS
// ------------------------------------------------------------
/** { ligado, destinatarios: [ids] | null (padrão), atualizadoPor, atualizadoEm }. Nunca lança. */
function RelEmp_cfg_() {
  var c = { ligado: true, destinatarios: null, atualizadoPor: '', atualizadoEm: '' }, g = null;
  try { g = JSON.parse(PropertiesService.getScriptProperties().getProperty(RELEMP_CFG_PROP) || 'null'); } catch (e) { g = null; }
  if (!g || typeof g !== 'object') return c;
  if (g.ligado === false) c.ligado = false;
  if (Array.isArray(g.destinatarios)) c.destinatarios = g.destinatarios.map(Ges_s_).filter(function (id, i, l) { return id && l.indexOf(id) === i; });
  c.atualizadoPor = Ges_s_(g.atualizadoPor); c.atualizadoEm = Ges_s_(g.atualizadoEm);
  return c;
}

/** A pessoa pode ver o nome de envolvido do Programa de conduta? (Diretoria, dono e Gestor de Qualidade) */
function RelEmp_veNomes_(u) {
  if (!u || !u.ativo) return false;
  if (typeof Conduta_veIdentidadeUsuario_ === 'function') {
    try { return !!Conduta_veIdentidadeUsuario_({ ID: u.id, STATUS: 'ATIVO', PERFIL: u.perfil, USUARIO: u.login, AREA: u.area }); } catch (e) { /* segue */ }
  }
  return !!(u.dono || u.perfil === 'DIRETORIA' || ((u.perfil === 'GESTOR' || u.perfil === 'ADMIN') && Ges_up_(u.area) === 'QUALIDADE'));
}

function RelEmp_pode_(u, publico) {
  if (publico === 'DIRETORIA') return !!(u && u.diretoria);
  if (publico === 'NOMES') return RelEmp_veNomes_(u);
  return true;
}

/** Padrão: Diretoria (perfil Diretoria e o dono) e quem é gestor da área Qualidade. Sem ninguém, a Diretoria de reserva. */
function RelEmp_destinatariosPadrao_(us, gcfg) {
  var qual = ((gcfg && gcfg.gestoresPorArea) || {}).QUALIDADE || [];
  var ids = Object.keys(us).filter(function (id) {
    var u = us[id];
    if (!u.ativo) return false;
    return u.perfil === 'DIRETORIA' || u.dono || ((u.perfil === 'GESTOR' || u.perfil === 'ADMIN') && u.area === 'QUALIDADE') || qual.indexOf(id) >= 0;
  });
  if (!ids.length) ids = Ges_diretoria_(us, []);
  return RelEmp_ordenar_(ids, us);
}

function RelEmp_ordenar_(ids, us) { return ids.slice().sort(function (a, b) { return String(us[a].nome).localeCompare(String(us[b].nome), 'pt-BR'); }); }

/** Ids de quem recebe agora (lista gravada, só ativos; vazia ou sem ninguém ativo = padrão). */
function RelEmp_destinatarios_(us, gcfg, cfg) {
  cfg = cfg || RelEmp_cfg_();
  var l = (cfg.destinatarios || []).filter(function (id) { return us[id] && us[id].ativo; });
  return l.length ? RelEmp_ordenar_(l, us) : RelEmp_destinatariosPadrao_(us, gcfg);
}

// ------------------------------------------------------------
// PACOTES DO DIA
// ------------------------------------------------------------
function RelEmp_semanaDe_(dia) { var seg = Ges_segundaDaSemana_(dia), ini = Ges_somarDias_(seg, -7); return { segunda: seg, ini: ini, fim: Ges_somarDias_(ini, 6) }; }

function RelEmp_frotaEmUso_() {
  try { return !!(SGO_CFG.SHEETS.CAD_VEICULOS && Ges_ler_(SGO_CFG.SHEETS.CAD_VEICULOS).length); } catch (e) { return false; }
}
function RelEmp_comercialEmUso_() {
  try { return typeof COM_ABAS !== 'undefined' && typeof Comercial_emUso_ === 'function' && Comercial_emUso_(); } catch (e) { return false; }
}

/** Pacote da semana anterior à do dia. */
function RelEmp_pacoteSemanal_(dia) {
  var s = RelEmp_semanaDe_(dia), compMis = s.ini.slice(0, 7);
  var itens = [{ chave: 'GESTAO_SEMANAL', nome: 'Semanal da gestão', publico: 'DIRETORIA', rotina: 'SEMANAL' }];
  if (typeof CondutaRG_gerarSemanal_ === 'function') {
    itens.push({ chave: 'CONDUTA_SEMANAL', nome: 'Programa de conduta: semanal da equipe', publico: 'GESTAO' });
    itens.push({ chave: 'CONDUTA_MISSOES', nome: 'Programa de conduta: prestação de contas das missões de ' + Ges_nomeComp_(compMis) + ' (até ' + Ges_brDia_(s.fim < Ges_fimComp_(compMis) ? s.fim : Ges_fimComp_(compMis)) + ')', publico: 'NOMES', comp: compMis });
  }
  if (RelEmp_frotaEmUso_()) itens.push({ chave: 'FROTA_SEMANA', nome: 'Frota da semana (rastreamento e copiloto)', publico: 'GESTAO' });
  if (RelEmp_comercialEmUso_()) itens.push({ chave: 'COMERCIAL_SEMANA', nome: 'Comercial da semana', publico: 'GESTAO' });
  itens.push({ chave: 'SEDNA_SEMANA', nome: 'SEDNA da semana (cobranças das atividades atrasadas)', publico: 'GESTAO' });
  return { tipo: 'SEMANAL', ref: 'SEMANA|' + s.ini, dia: dia, segunda: s.segunda, ini: s.ini, fim: s.fim,
    titulo: 'Semana de ' + Ges_brDia_(s.ini) + ' a ' + Ges_brDia_(s.fim), itens: itens };
}

/** Pacote do mês anterior ao dia. A Saúde da empresa vem primeiro. */
function RelEmp_pacoteMensal_(dia) {
  var comp = Ges_competenciaAnterior_(dia);
  var itens = [{ chave: 'SAUDE', nome: 'Saúde da empresa (índice por área, melhorias e pendências)', publico: 'GESTAO' }];
  var publico = { GESTAO: 'DIRETORIA', CONDUTA: 'NOMES' };
  var nomes = { GESTAO: 'Desempenho da gestão (avaliação dos gestores)', CONDUTA: 'Programa de conduta: relatório da equipe' };
  Ges_relatoriosMensaisLista_().forEach(function (r) { itens.push({ chave: 'MENSAL_' + r[0], nome: nomes[r[0]] || r[1], publico: publico[r[0]] || 'GESTAO', rotina: 'MENSAL', mensal: r[0] }); });
  if (typeof CONDUTA_SHEETS !== 'undefined' && CONDUTA_SHEETS.RELATORIO) itens.push({ chave: 'CONDUTA_FECHAMENTO', nome: 'Programa de conduta: fechamento do mês', publico: 'GESTAO' });
  return { tipo: 'MENSAL', ref: 'MES|' + comp, dia: dia, comp: comp, titulo: Ges_nomeComp_(comp).replace(/^./, function (x) { return x.toUpperCase(); }), itens: itens };
}

/** Pacotes que vencem no dia (semanal no primeiro dia útil da semana; mensal no primeiro dia útil do mês). */
function RelEmp_pacotesDoDia_(dia, cfgExp) {
  var l = [];
  if (Ges_ehDiaDoSemanal_(dia, cfgExp)) l.push(RelEmp_pacoteSemanal_(dia));
  if (Ges_ehDiaDoMensal_(dia, cfgExp)) l.push(RelEmp_pacoteMensal_(dia));
  return l;
}

/**
 * Para o e-mail diário da Diretoria (Ges_relatoriosDoDia_): com o pacote ligado, devolve a linha que diz que os
 * relatórios vão à parte ({ dia: false } fora do dia do pacote). Desligado: null (o e-mail diário leva os links, como antes).
 */
function RelEmp_notaDoDia_(dia, cfgExp) {
  if (!RelEmp_cfg_().ligado) return null;
  var p = RelEmp_pacotesDoDia_(dia, cfgExp);
  if (!p.length) return { dia: false };
  return { dia: true, nota: true, nome: 'Relatórios ' + p.map(function (x) { return x.tipo === 'SEMANAL' ? 'da semana' : 'do mês'; }).join(' e '),
    aviso: 'seguem em e-mail próprio ("Relatórios da empresa") para quem está na lista de Desempenho da gestão > Relatórios.' };
}

// ------------------------------------------------------------
// SITUAÇÃO E GERAÇÃO DE CADA ITEM
// ------------------------------------------------------------
/** Situação já registrada do item: { situacao: 'OK'|'ERRO'|'SEM_DADO', link, motivo } ou null (ainda não gerado). */
function RelEmp_estado_(item, p, envios) {
  var e = null;
  if (item.rotina === 'SEMANAL') e = envios.filter(function (x) { var d = Ges_dia_(x.DIA); return Ges_up_(x.TIPO) === 'SEMANAL' && !!d && Ges_segundaDaSemana_(d) === p.segunda; }).pop();
  else if (item.rotina === 'MENSAL') e = envios.filter(function (x) { return Ges_up_(x.TIPO) === 'MENSAL' && Ges_s_(x.REFERENCIA) === p.comp + '|' + item.mensal; }).pop();
  else e = envios.filter(function (x) { return Ges_up_(x.TIPO) === 'EMPRESA_ITEM' && Ges_s_(x.REFERENCIA) === p.ref + '|' + item.chave; }).pop();
  if (!e) return null;
  var s = Ges_up_(e.SITUACAO);
  return { situacao: s === 'OK' || s === 'SEM_DADO' ? s : 'ERRO', link: Ges_s_(e.LINK), motivo: Ges_s_(e.MOTIVO) };
}

/** A rotina própria (semanal ou mensais da gestão) gera este item? Então o pacote só espera por ele. */
function RelEmp_rotinaGera_(item, gcfg) {
  if (item.rotina === 'SEMANAL') return !!gcfg.escada.semanal;
  if (item.rotina === 'MENSAL') return !!(gcfg.escada.mensal && gcfg.automacoes.relatoriosMensais);
  return false;
}

/** Gera o item e registra. Devolve o estado registrado. */
function RelEmp_gerar_(item, p) {
  if (item.rotina === 'SEMANAL') { var s = Ges_gerarSemanal_(p.dia); return { situacao: s.salvo ? 'OK' : 'ERRO', link: s.link || '', motivo: s.aviso || '' }; }
  if (item.rotina === 'MENSAL') { var m = Ges_gerarMensal_(p.comp, item.mensal, p.dia); return { situacao: m.salvo ? 'OK' : 'ERRO', link: m.link || '', motivo: m.aviso || '' }; }
  var g;
  try {
    if (item.chave === 'CONDUTA_SEMANAL') { try { Conduta_setup_(); } catch (eS) {} var c = CondutaRG_gerarSemanal_(p.fim); g = { salvo: !!c.link, link: c.link, aviso: c.aviso || '' }; }
    else if (item.chave === 'CONDUTA_MISSOES') g = RelEmp_gerarMissoes_(item.comp);
    else if (item.chave === 'FROTA_SEMANA') g = RelEmp_salvarDoc_('Pacote semanal', 'Frota ' + p.ini, RelEmp_htmlFrotaSemana_(p));
    else if (item.chave === 'COMERCIAL_SEMANA') g = RelEmp_salvarDoc_('Pacote semanal', 'Comercial ' + p.ini, RelEmp_htmlComercialSemana_(p));
    else if (item.chave === 'SEDNA_SEMANA') g = RelEmp_salvarDoc_('Pacote semanal', 'SEDNA ' + p.ini, RelEmp_htmlSednaSemana_(p));
    else if (item.chave === 'SAUDE') g = RelEmp_salvarDoc_('Saúde da empresa', p.comp, RelEmp_htmlSaude_(p.comp));
    else if (item.chave === 'CONDUTA_FECHAMENTO') g = RelEmp_fechamentoConduta_(p.comp);
    else g = { salvo: false, aviso: 'relatório desconhecido' };
  } catch (e) { g = { salvo: false, aviso: String((e && e.message) || e).slice(0, 300) }; }
  var sit = g.semDado ? 'SEM_DADO' : g.salvo ? 'OK' : 'ERRO';
  Ges_registrarEnvio_({ tipo: 'EMPRESA_ITEM', uid: '', nome: item.nome, dia: p.dia, ref: p.ref + '|' + item.chave, situacao: sit, motivo: g.aviso || '', link: g.link || '' });
  return { situacao: sit, link: g.link || '', motivo: g.aviso || '' };
}

function RelEmp_salvarDoc_(sub, identificador, html) {
  var g = RelA4_salvar_(Ges_pastaRelatorios_(sub), identificador, html, { compartilhar: false });
  return { salvo: g.salvo, link: g.pdfUrl, aviso: g.aviso, html: g.html };
}

/** Prestação de contas das missões do mês (sem sessão), no mesmo padrão do botão do Programa de conduta. */
function RelEmp_gerarMissoes_(comp) {
  try { Conduta_setup_(); } catch (e) {}
  var c = CondutaRG_contextoMissoes_(comp), t = CondutaRG_ia_('MISSOES', c);
  c.textos = t;
  var g = RelA4_salvar_(CondutaRel_pastaRelatorios_('Missões'), comp, CondutaRG_htmlMissoes_(c, t));
  CondutaRG_salvar_('MISSOES', comp, c, g.html);
  return { salvo: g.salvo, link: g.pdfUrl, aviso: g.aviso };
}

/** Fechamento mensal do Programa de conduta: a cópia gravada no fechamento (sem recalcular nem mudar a revisão). */
function RelEmp_fechamentoConduta_(comp) {
  var reg = typeof CondutaRel_registroMensal_ === 'function' ? CondutaRel_registroMensal_(comp) : null;
  if (!reg || !Ges_s_(reg.HTML)) return { semDado: true, aviso: 'o mês ainda não foi fechado no Programa de conduta. Depois do fechamento (Programa de conduta > Fechamentos), o relatório fica guardado lá.' };
  var pasta = Ges_pastaRelatorios_('Programa de conduta')();
  var r = SGO_DocSalvar_salvarHtmlEPdf_(pasta, 'Fechamento do Programa de conduta ' + comp, String(reg.HTML), {});
  return { salvo: true, link: r.pdfUrl || '', aviso: '' };
}

// ------------------------------------------------------------
// RODADA (dentro de Ges_rodada_, só no expediente)
// ------------------------------------------------------------
function RelEmp_rodada_(ex) {
  var cfg = RelEmp_cfg_();
  if (!cfg.ligado) return { fora: 'relatórios da empresa desligados em Desempenho da gestão > Relatórios' };
  var gcfg = Ges_cfg_(), cfgExp = typeof SGO_expediente_ === 'function' ? SGO_expediente_() : null;
  if (ex.hora < gcfg.escada.horaSemanal) return { fora: 'antes de ' + gcfg.escada.horaSemanal };
  var pacotes = RelEmp_pacotesDoDia_(ex.dia, cfgExp);
  if (!pacotes.length) return { fora: 'não é dia de pacote' };
  var envios = Ges_envios_(), gerado = '';
  // um relatório por rodada (a geração de PDF é demorada); os da rotina própria só são esperados
  pacotes.some(function (p) {
    return p.itens.some(function (it) {
      if (RelEmp_estado_(it, p, envios) || RelEmp_rotinaGera_(it, gcfg)) return false;
      RelEmp_gerar_(it, p); gerado = it.chave; return true;
    });
  });
  if (gerado) envios = Ges_envios_();
  var faltam = RelEmp_faltam_(pacotes, envios);
  if (faltam && ex.hora < GES_HORA_LIMITE_RELATORIOS) return { gerado: gerado, faltam: faltam };
  var us = Ges_usuarios_();
  var r = RelEmp_enviar_(pacotes, envios, RelEmp_destinatarios_(us, gcfg, cfg), us, { dia: ex.dia });
  r.gerado = gerado; r.faltam = faltam;
  return r;
}

function RelEmp_faltam_(pacotes, envios) {
  var n = 0;
  pacotes.forEach(function (p) { p.itens.forEach(function (it) { if (!RelEmp_estado_(it, p, envios)) n++; }); });
  return n;
}

// ------------------------------------------------------------
// E-MAIL
// ------------------------------------------------------------
/** Linha de um item no e-mail. */
function RelEmp_linhaItem_(it, e, opcoes) {
  if (!e) {
    return '- ' + it.nome + ': ' + (opcoes.teste
      ? 'não deu tempo de gerar nesta execução. O que fazer: toque de novo em "Gerar e enviar agora (teste)"; o que já ficou pronto é reaproveitado.'
      : 'não ficou pronto até ' + GES_HORA_LIMITE_RELATORIOS + '. Motivo: a geração é feita um relatório por vez, a cada 15 minutos, e não terminou a tempo. O que fazer: quando ficar pronto, ele aparece em Desempenho da gestão > Relatórios.');
  }
  if (e.situacao === 'SEM_DADO') return '- ' + it.nome + ': sem dado. ' + RelEmp_frase_(e.motivo);
  if (e.situacao === 'OK') return '- ' + it.nome + ': ' + (e.link ? e.link : 'gerado, mas o PDF não foi gravado na pasta. ' + RelEmp_frase_(e.motivo || 'Gere de novo pelo próprio módulo.'));
  return '- ' + it.nome + ': não foi gerado. Motivo: ' + RelEmp_frase_(e.motivo || 'falha não informada') + ' O que fazer: gere pelo próprio módulo ou toque em "Gerar e enviar agora (teste)" em Desempenho da gestão > Relatórios; se repetir, avise o administrador.';
}
function RelEmp_frase_(t) { t = Ges_s_(t).replace(/\s+/g, ' '); if (!t) return ''; t = t.charAt(0).toUpperCase() + t.slice(1); return /[.!?]$/.test(t) ? t : t + '.'; }

/** Texto do e-mail de uma pessoa: { titulo, texto, enviados: [chaves], restritos: [nomes] }. */
function RelEmp_textoEmail_(u, pacotes, envios, opcoes) {
  opcoes = opcoes || {};
  var linhas = [], enviados = [], restritos = [];
  var nome = typeof Notificar_primeiroNome_ === 'function' ? Notificar_primeiroNome_(u.nome) : u.nome;
  linhas.push((opcoes.teste ? 'Olá, ' : 'Bom dia, ') + nome + '.', '');
  linhas.push((opcoes.teste ? 'Envio de teste pedido por você em Desempenho da gestão > Relatórios. Saiu só para você; o pacote de verdade continua saindo no dia certo para toda a lista.' :
    'Seguem os relatórios da empresa gerados pelo SGO+.') + ' Cada link abre o PDF guardado na pasta "Gestão - Relatórios" (ou na pasta do próprio módulo).', '');
  pacotes.forEach(function (p) {
    linhas.push(p.tipo === 'SEMANAL' ? 'SEMANA DE ' + Ges_brDia_(p.ini) + ' A ' + Ges_brDia_(p.fim) : 'MÊS DE ' + Ges_nomeComp_(p.comp).toUpperCase());
    p.itens.forEach(function (it) {
      if (!RelEmp_pode_(u, it.publico)) { restritos.push(it.nome.replace(/\s*\(.*\)$/, '') + ' (' + RELEMP_PUBLICO_TEXTO[it.publico] + ')'); return; }
      var e = RelEmp_estado_(it, p, envios);
      linhas.push(RelEmp_linhaItem_(it, e, opcoes));
      if (e && e.situacao === 'OK' && e.link) enviados.push(it.chave);
    });
    linhas.push('');
  });
  if (restritos.length) linhas.push('Não seguem neste e-mail, pela regra de acesso: ' + restritos.join('; ') + '.', '');
  linhas.push('Você recebe este e-mail porque está na lista "Quem recebe os relatórios da empresa" (Desempenho da gestão > Relatórios), mantida pela Diretoria e pelo Administrador.');
  var titulo = (opcoes.teste ? '[Teste] ' : '') + 'Relatórios da empresa: ' + pacotes.map(function (p) { return p.tipo === 'SEMANAL' ? 'semana de ' + Ges_brDia_(p.ini) + ' a ' + Ges_brDia_(p.fim) : Ges_nomeComp_(p.comp); }).join(' e ');
  return { titulo: titulo, texto: linhas.join('\n'), enviados: enviados, restritos: restritos };
}

/**
 * Um e-mail por pessoa com todos os pacotes do dia que ela ainda não recebeu. Registra um EMPRESA_PACOTE por pessoa e
 * pacote (ERRO volta a tentar na rodada seguinte). opcoes: { dia, teste }.
 */
function RelEmp_enviar_(pacotes, envios, ids, us, opcoes) {
  opcoes = opcoes || {};
  var dia = opcoes.dia || Ges_hoje_(), tipo = opcoes.teste ? 'EMPRESA_TESTE' : 'EMPRESA_PACOTE', r = { pessoas: 0, enviados: 0, erros: 0, resultados: [] };
  ids.forEach(function (uid) {
    var u = us[uid];
    if (!u || !u.ativo) return;
    var meus = opcoes.teste ? pacotes : pacotes.filter(function (p) { return !Ges_jaEnviado_(envios, 'EMPRESA_PACOTE', uid, null, p.ref); });
    if (!meus.length) return;
    r.pessoas++;
    var msg = RelEmp_textoEmail_(u, meus, envios, opcoes), rr = { ok: 0, erro: 0, pulado: 0 };
    try {
      rr = SGO_notificar_({ usuarios: [uid], canais: ['email'], origem: RELEMP_ORIGEM, refId: 'RELEMP-' + dia + '-' + uid + (opcoes.teste ? '-TESTE-' + RelEmp_marca_() : ''),
        titulo: msg.titulo, texto: msg.texto, link: Ges_linkTela_('gestao_desempenho') }) || rr;
    } catch (e) { rr = { ok: 0, erro: 1, pulado: 0, motivo: String((e && e.message) || e) }; }
    var sit = rr.ok ? 'OK' : rr.pulado ? 'PULADO' : 'ERRO';
    meus.forEach(function (p) {
      Ges_registrarEnvio_({ tipo: tipo, uid: uid, nome: u.nome, dia: dia, ref: p.ref, qtd: msg.enviados.length, itens: msg.enviados.join(','), situacao: sit,
        motivo: rr.ok ? 'entregue ao serviço de e-mail' + (msg.restritos.length ? '; não foram pela regra de acesso: ' + msg.restritos.join('; ') : '') : Ges_s_(rr.motivo) || 'o serviço de e-mail não aceitou' });
    });
    if (rr.ok) r.enviados++; else if (!rr.pulado) r.erros++;
    r.resultados.push({ uid: uid, nome: u.nome, situacao: sit, motivo: Ges_s_(rr.motivo), titulo: msg.titulo, texto: msg.texto });
  });
  return r;
}

/** Marca única de um envio de teste (dois testes seguidos não são barrados como repetidos pelo notificador). */
function RelEmp_marca_() { try { return Utilities.getUuid().slice(0, 8); } catch (e) { return String(Date.now()); } }

// ------------------------------------------------------------
// DOCUMENTOS DA SEMANA
// ------------------------------------------------------------
function RelEmp_naSemana_(v, p) { var d = Ges_dia_(v); return !!d && d >= p.ini && d <= p.fim; }
function RelEmp_num_(v) {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  var s = Ges_s_(v).replace(/[R$\s]/g, '');
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  var n = Number(s);
  return isFinite(n) ? n : 0;
}
function RelEmp_moeda_(v) { return typeof RelA4_moeda_ === 'function' ? RelA4_moeda_(v) : 'R$ ' + Ges_numBr_(v, 2); }
function RelEmp_rotuloTipo_(t) { t = Ges_s_(t).replace(/_/g, ' ').toLowerCase(); return t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Outro'; }

function RelEmp_documento_(titulo, sigla, p, corpo, ficha) {
  return RelA4_documento_({ titulo: titulo, tituloCurto: titulo, sigla: sigla, identificacao: Ges_brDia_(p.ini) + ' a ' + Ges_brDia_(p.fim),
    emitidoPor: 'Rotina automática (relatórios da empresa)', corpo: corpo, tituloArquivo: titulo, ficha: ficha || [] });
}

/** Frota da semana: retiradas, alertas do rastreador e o copiloto (sugestões e decisões). */
function RelEmp_htmlFrotaSemana_(p) {
  try { if (typeof Frota_bootstrap_ === 'function') Frota_bootstrap_(); } catch (e) {}
  var veics = Ges_ler_(SGO_CFG.SHEETS.CAD_VEICULOS), placa = {};
  veics.forEach(function (v) { placa[Ges_s_(v.ID)] = Ges_s_(v.PLACA) || 'sem placa'; });
  var movs = SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO ? Ges_ler_(SGO_CFG.SHEETS.REG_FROTA_MOVIMENTACAO).filter(function (m) { return RelEmp_naSemana_(m.DATA_SAIDA, p); }) : [];
  var porVeic = {}, kmTot = 0;
  movs.forEach(function (m) {
    var k = placa[Ges_s_(m.VEICULO_ID)] || 'veículo não identificado', km = RelEmp_num_(m.KM_CHEGADA) - RelEmp_num_(m.KM_SAIDA);
    var x = porVeic[k] = porVeic[k] || { retiradas: 0, km: 0, abertas: 0 };
    x.retiradas++;
    if (km > 0 && km < 5000) { x.km += km; kmTot += km; }
    if (Ges_up_(m.STATUS) !== 'FINALIZADO') x.abertas++;
  });
  var alertas = typeof RASTR_ABA_ALERTAS !== 'undefined' ? Ges_ler_(RASTR_ABA_ALERTAS).filter(function (a) { return RelEmp_naSemana_(a.PRIMEIRO_EM, p); }) : null;
  var porTipo = {};
  (alertas || []).forEach(function (a) { var t = RelEmp_rotuloTipo_(a.TIPO), x = porTipo[t] = porTipo[t] || { qtd: 0, abertos: 0 }; x.qtd++; if (Ges_up_(a.SITUACAO) === 'ABERTO') x.abertos++; });
  var sug = null, avisoSug = '';
  try { if (typeof FrotaR_sugestoes_ === 'function') sug = FrotaR_sugestoes_(7) || []; } catch (e) { sug = null; avisoSug = String((e && e.message) || e).slice(0, 200); }
  var dec = typeof FROTAR_ABA_COPILOTO !== 'undefined' ? Ges_ler_(FROTAR_ABA_COPILOTO).filter(function (d) { return RelEmp_naSemana_(d.DECIDIDO_EM, p); }) : null;
  var porDec = {};
  (dec || []).forEach(function (d) { var t = RelEmp_rotuloTipo_(d.SITUACAO); porDec[t] = (porDec[t] || 0) + 1; });
  var grav = { ALTA: 0, MEDIA: 0, BAIXA: 0 };
  (sug || []).forEach(function (s) { grav[s.gravidade] = (grav[s.gravidade] || 0) + 1; });
  var c = [];
  c.push(RelA4_secao_('Resumo', RelA4_kpis_([[String(movs.length), 'Retiradas na semana'], [Ges_numBr_(Math.round(kmTot)) + ' km', 'Rodados (km informado)'],
    [alertas === null ? 'sem dado' : String(alertas.length), 'Alertas do rastreador', alertas && alertas.length ? 'aviso' : 'ok'],
    [sug === null ? 'sem dado' : String(grav.ALTA), 'Sugestões do copiloto de gravidade alta', sug && grav.ALTA ? 'critico' : 'ok'], [dec === null ? 'sem dado' : String(dec.length), 'Decisões do copiloto na semana']]) +
    RelA4_paragrafos_('Na semana de ' + Ges_brDia_(p.ini) + ' a ' + Ges_brDia_(p.fim) + ' foram registradas ' + Ges_plural_(movs.length, 'retirada', 'retiradas') + ' de veículo, com ' + Ges_numBr_(Math.round(kmTot)) + ' km informados na devolução. ' +
      (alertas === null ? 'O rastreador não está ligado ao SGO+ (sem dado de alertas). ' : 'O rastreador gerou ' + Ges_plural_(alertas.length, 'alerta', 'alertas') + ' no período. ') +
      (sug === null ? 'As sugestões do copiloto não puderam ser calculadas' + (avisoSug ? ' (' + avisoSug + ')' : '') + '.' : 'O copiloto aponta ' + Ges_plural_(sug.length, 'sugestão', 'sugestões') + ' nos últimos 7 dias, ' + grav.ALTA + ' de gravidade alta.'))));
  c.push(RelA4_secao_('Uso dos veículos', RelA4_tabela_([{ t: 'Veículo' }, { t: 'Retiradas', num: true }, { t: 'Km informados', num: true }, { t: 'Ainda abertas', num: true }],
    Object.keys(porVeic).sort().map(function (k) { var x = porVeic[k]; return [k, String(x.retiradas), Ges_numBr_(Math.round(x.km)), x.abertas ? RelA4_marca_(String(x.abertas), 'aviso') : '0']; }),
    { legenda: 'Retiradas com saída na semana, por veículo', vazio: 'Nenhuma retirada na semana.', compacta: true })));
  c.push(RelA4_secao_('Alertas do rastreador', alertas === null ? '<p class="nota">Sem dado: o rastreador não está ligado ao SGO+.</p>' :
    RelA4_tabela_([{ t: 'Tipo de alerta' }, { t: 'Na semana', num: true }, { t: 'Ainda abertos', num: true }], Object.keys(porTipo).sort().map(function (k) { return [k, String(porTipo[k].qtd), String(porTipo[k].abertos)]; }),
      { legenda: 'Alertas com início na semana', vazio: 'Nenhum alerta do rastreador na semana.', compacta: true })));
  var lista = (sug || []).filter(function (s) { return s.gravidade === 'ALTA' || s.gravidade === 'MEDIA'; }).slice(0, 15);
  c.push(RelA4_secao_('Copiloto da frota', (sug === null ? '<p class="nota">Sem dado: as sugestões do copiloto não puderam ser calculadas.</p>' :
    RelA4_tabela_([{ t: 'Gravidade', cen: true }, { t: 'Sugestão' }], lista.map(function (s) { return [RelA4_marca_(s.gravidade === 'ALTA' ? 'Alta' : 'Média', s.gravidade === 'ALTA' ? 'critico' : 'aviso'), Ges_s_(s.titulo)]; }),
      { legenda: 'Sugestões de gravidade alta e média dos últimos 7 dias (até 15)', vazio: 'Nenhuma sugestão de gravidade alta ou média.', compacta: true })) +
    (dec === null ? '' : RelA4_tabela_([{ t: 'Decisão' }, { t: 'Quantidade', num: true }], Object.keys(porDec).sort().map(function (k) { return [k, String(porDec[k])]; }), { legenda: 'Decisões da gestão sobre o copiloto na semana', vazio: 'Nenhuma decisão do copiloto registrada na semana.', compacta: true }))));
  c.push(RelA4_secao_('Como ler', '<p class="nota">Retiradas pela data de saída; km pela diferença entre o km de chegada e o de saída informados (valores negativos ou acima de 5.000 km numa retirada não entram). Alertas pela data em que começaram. As sugestões do copiloto são calculadas na emissão, sobre os últimos 7 dias, e só viram ação com a decisão da gestão em Frota > Rastreamento.</p>' +
    (typeof FROTAR_NOTA_LGPD !== 'undefined' ? '<p class="nota">' + RelA4_esc_(FROTAR_NOTA_LGPD) + '</p>' : '')));
  return RelEmp_documento_('Frota da semana', 'GES-FRS', p, c.join('\n'), [['Uso', 'Gestão']]);
}

/** Comercial da semana: propostas enviadas, aprovadas e recusadas, oportunidades ganhas e perdidas, por vendedor. */
function RelEmp_htmlComercialSemana_(p) {
  var props = Ges_ler_(COM_ABAS.PROPOSTAS), ops = Ges_ler_(COM_ABAS.OPORTUNIDADES);
  var t = { env: [0, 0], apr: [0, 0], rec: [0, 0], gan: [0, 0], per: [0, 0], novas: 0 }, vend = {}, motivos = {};
  var v = function (id, nome) { var k = Ges_s_(id) || Ges_s_(nome) || '—'; return vend[k] = vend[k] || { nome: Ges_s_(nome) || 'sem responsável', env: 0, valEnv: 0, apr: 0, valApr: 0, rec: 0, gan: 0, per: 0 }; };
  props.forEach(function (x) {
    var val = RelEmp_num_(x.TOTAL), s = Ges_up_(x.SITUACAO);
    if (RelEmp_naSemana_(x.ENVIADA_EM, p)) { t.env[0]++; t.env[1] += val; var a = v(x.RESPONSAVEL_ID, x.RESPONSAVEL_NOME); a.env++; a.valEnv += val; }
    if (s === 'APROVADA' && RelEmp_naSemana_(x.RESPOSTA_EM, p)) { t.apr[0]++; t.apr[1] += val; var b = v(x.RESPONSAVEL_ID, x.RESPONSAVEL_NOME); b.apr++; b.valApr += val; }
    if (s === 'RECUSADA' && RelEmp_naSemana_(x.RESPOSTA_EM, p)) { t.rec[0]++; t.rec[1] += val; v(x.RESPONSAVEL_ID, x.RESPONSAVEL_NOME).rec++; }
  });
  ops.forEach(function (o) {
    var val = RelEmp_num_(o.VALOR_ESTIMADO), s = Ges_up_(o.SITUACAO);
    if (RelEmp_naSemana_(o.CRIADO_EM, p)) t.novas++;
    if (s === 'GANHA' && RelEmp_naSemana_(o.GANHA_EM, p)) { t.gan[0]++; t.gan[1] += val; v(o.RESPONSAVEL_ID, o.RESPONSAVEL_NOME).gan++; }
    if (s === 'PERDIDA' && RelEmp_naSemana_(o.PERDIDA_EM, p)) { t.per[0]++; t.per[1] += val; v(o.RESPONSAVEL_ID, o.RESPONSAVEL_NOME).per++; var m = Ges_s_(o.MOTIVO_PERDA) || 'Sem motivo'; motivos[m] = (motivos[m] || 0) + 1; }
  });
  var resp = t.apr[0] + t.rec[0], taxa = resp ? Ges_pct_(t.apr[0], resp) : null;
  var c = [];
  c.push(RelA4_secao_('Resumo', RelA4_kpis_([[String(t.env[0]), 'Propostas enviadas'], [RelEmp_moeda_(t.env[1]), 'Valor enviado'], [String(t.apr[0]), 'Propostas aprovadas', 'ok'], [RelEmp_moeda_(t.apr[1]), 'Valor aprovado', 'ok'],
    [String(t.rec[0]), 'Propostas recusadas', t.rec[0] ? 'aviso' : ''], [String(t.gan[0]) + ' / ' + String(t.per[0]), 'Oportunidades ganhas / perdidas']]) +
    RelA4_paragrafos_('Na semana de ' + Ges_brDia_(p.ini) + ' a ' + Ges_brDia_(p.fim) + ' saíram ' + Ges_plural_(t.env[0], 'proposta', 'propostas') + ' (' + RelEmp_moeda_(t.env[1]) + '). ' +
      (resp ? 'Das ' + resp + ' respondidas pelo cliente, ' + t.apr[0] + ' foram aprovadas (' + Ges_numBr_(taxa, 1) + '%), somando ' + RelEmp_moeda_(t.apr[1]) + '. ' : 'Nenhum cliente respondeu proposta na semana. ') +
      'Foram abertas ' + Ges_plural_(t.novas, 'oportunidade nova', 'oportunidades novas') + ', ' + Ges_plural_(t.gan[0], 'ganha', 'ganhas') + ' e ' + Ges_plural_(t.per[0], 'perdida', 'perdidas') + '.')));
  var linhas = Object.keys(vend).map(function (k) { return vend[k]; }).sort(function (a, b) { return b.valApr - a.valApr || b.env - a.env; });
  c.push(RelA4_secao_('Por vendedor', RelA4_tabela_([{ t: 'Vendedor' }, { t: 'Enviadas', num: true }, { t: 'Valor enviado', num: true }, { t: 'Aprovadas', num: true }, { t: 'Valor aprovado', num: true }, { t: 'Recusadas', num: true }, { t: 'Ganhas', num: true }, { t: 'Perdidas', num: true }],
    linhas.map(function (x) { return [x.nome, String(x.env), RelEmp_moeda_(x.valEnv), String(x.apr), RelEmp_moeda_(x.valApr), String(x.rec), String(x.gan), String(x.per)]; }),
    { legenda: 'Movimento comercial da semana por responsável', vazio: 'Nenhum movimento comercial na semana.', compacta: true,
      total: linhas.length > 1 ? ['Total', String(t.env[0]), RelEmp_moeda_(t.env[1]), String(t.apr[0]), RelEmp_moeda_(t.apr[1]), String(t.rec[0]), String(t.gan[0]), String(t.per[0])] : null })));
  var lm = Object.keys(motivos).sort(function (a, b) { return motivos[b] - motivos[a]; });
  c.push(RelA4_secao_('Motivos de perda', RelA4_tabela_([{ t: 'Motivo' }, { t: 'Oportunidades', num: true }], lm.map(function (m) { return [m, String(motivos[m])]; }), { vazio: 'Nenhuma oportunidade perdida na semana.', compacta: true })));
  c.push(RelA4_secao_('Como ler', '<p class="nota">Propostas pela data de envio (enviadas) e pela data da resposta do cliente (aprovadas e recusadas); cada revisão enviada conta como um envio. Oportunidades pela data em que foram abertas, ganhas ou perdidas, com o valor estimado. O relatório mensal do Comercial traz funil, metas e conversão.</p>'));
  return RelEmp_documento_('Comercial da semana', 'GES-COS', p, c.join('\n'), [['Uso', 'Gestão']]);
}

/** SEDNA da semana: cobranças das atividades atrasadas por nível e por pessoa, e quantas foram resolvidas. */
function RelEmp_htmlSednaSemana_(p) {
  var esc = Ges_envios_().filter(function (e) { return Ges_up_(e.TIPO) === 'SEDNA_ESCALA' && RelEmp_naSemana_(e.DIA, p); });
  var atvs = {};
  try { (typeof Atividades_todas_ === 'function' ? Atividades_todas_() : []).forEach(function (a) { atvs[Ges_s_(a.ID)] = a; }); } catch (e) {}
  var nivel = { 1: 0, 2: 0, 3: 0 }, pessoas = {}, ids = {}, semDestino = 0;
  esc.forEach(function (e) {
    var partes = Ges_s_(e.REFERENCIA).split('|'), id = partes[0], n = Number(partes[partes.length - 1]) || 0;
    if (nivel[n] !== undefined) nivel[n]++;
    if (Ges_up_(e.SITUACAO) === 'SEM_DESTINO') semDestino++;
    var k = Ges_s_(e.USUARIO_ID) || Ges_s_(e.USUARIO_NOME), x = pessoas[k] = pessoas[k] || { nome: Ges_s_(e.USUARIO_NOME) || 'pessoa não identificada', n1: 0, n2: 0, n3: 0, ids: {} };
    if (n >= 1 && n <= 3) x['n' + n]++;
    x.ids[id] = true; ids[id] = true;
  });
  var fimTxt = p.fim + 'T23:59';
  var situacao = function (id) {
    var a = atvs[id];
    if (!a) return 'sem registro';
    if (Ges_s_(a.SITUACAO) === 'Cancelada') return 'cancelada';
    if (Ges_s_(a.SITUACAO) === 'Concluída') return Ges_iso_(a.CONCLUIDA_EM) && Ges_iso_(a.CONCLUIDA_EM) <= fimTxt ? 'na semana' : 'depois';
    return 'aberta';
  };
  var tot = { na: 0, depois: 0, abertas: 0, outras: 0 };
  Object.keys(ids).forEach(function (id) { var s = situacao(id); if (s === 'na semana') tot.na++; else if (s === 'depois') tot.depois++; else if (s === 'aberta') tot.abertas++; else tot.outras++; });
  var linhas = Object.keys(pessoas).map(function (k) {
    var x = pessoas[k], l = Object.keys(x.ids), r = l.filter(function (id) { var s = situacao(id); return s === 'na semana' || s === 'depois'; }).length;
    return { nome: x.nome, n1: x.n1, n2: x.n2, n3: x.n3, atv: l.length, resolvidas: r, abertas: l.filter(function (id) { return situacao(id) === 'aberta'; }).length };
  }).sort(function (a, b) { return (b.n3 - a.n3) || (b.n2 - a.n2) || (b.atv - a.atv) || a.nome.localeCompare(b.nome, 'pt-BR'); });
  var natv = Object.keys(ids).length;
  var c = [];
  c.push(RelA4_secao_('Resumo', RelA4_kpis_([[String(esc.length), 'Cobranças na semana'], [String(nivel[1]), 'Nível 1 (responsável)'], [String(nivel[2]), 'Nível 2 (gestor da área)', nivel[2] ? 'aviso' : ''], [String(nivel[3]), 'Nível 3 (Diretoria)', nivel[3] ? 'critico' : 'ok'],
    [String(tot.na + tot.depois) + ' de ' + natv, 'Atividades cobradas já resolvidas', tot.abertas ? 'aviso' : 'ok']]) +
    RelA4_paragrafos_(esc.length ? 'Na semana de ' + Ges_brDia_(p.ini) + ' a ' + Ges_brDia_(p.fim) + ' a rotina cobrou ' + Ges_plural_(natv, 'atividade atrasada', 'atividades atrasadas') + ' (' + Ges_plural_(esc.length, 'cobrança', 'cobranças') + '): ' +
      nivel[1] + ' ao responsável, ' + nivel[2] + ' ao gestor da área e ' + nivel[3] + ' à Diretoria. Até a emissão, ' + Ges_plural_(tot.na, 'foi concluída', 'foram concluídas') + ' ainda na semana, ' + tot.depois + ' depois dela e ' + Ges_plural_(tot.abertas, 'continua aberta', 'continuam abertas') + '.' +
      (semDestino ? ' Em ' + semDestino + ' cobrança(s) não havia ninguém ativo para receber: confira os responsáveis em Caixa de decisões > Regras e responsáveis.' : '')
      : 'Nenhuma atividade atrasada chegou ao prazo de cobrança na semana de ' + Ges_brDia_(p.ini) + ' a ' + Ges_brDia_(p.fim) + '.')));
  c.push(RelA4_secao_('Por pessoa', RelA4_tabela_([{ t: 'Responsável pela atividade' }, { t: 'Nível 1', num: true }, { t: 'Nível 2', num: true }, { t: 'Nível 3', num: true }, { t: 'Atividades cobradas', num: true }, { t: 'Resolvidas', num: true }, { t: 'Ainda abertas', num: true }],
    linhas.map(function (l) { return [l.nome, String(l.n1), String(l.n2), l.n3 ? RelA4_marca_(String(l.n3), 'critico') : '0', String(l.atv), String(l.resolvidas), l.abertas ? RelA4_marca_(String(l.abertas), 'aviso') : '0']; }),
    { legenda: 'Cobranças da semana por responsável da atividade', vazio: 'Nenhuma cobrança na semana.', compacta: true })));
  c.push(RelA4_secao_('Como ler', '<p class="nota">A SEDNA cobra a atividade atrasada pela prioridade: nível 1 ao responsável, nível 2 ao gestor da área e nível 3 à Diretoria, nos prazos de Caixa de decisões > Regras e responsáveis (registro em GES_ENVIOS, tipo SEDNA_ESCALA, e no histórico da atividade). Cada nível vale uma vez por atividade e previsão. Resolvida: concluída, pela data de conclusão; na semana, até ' + Ges_brDia_(p.fim) + '. Atividade cancelada ou apagada não entra nas resolvidas.</p>'));
  return RelEmp_documento_('SEDNA da semana', 'GES-SDN', p, c.join('\n'), [['Uso', 'Gestão']]);
}

// ------------------------------------------------------------
// SAÚDE DA EMPRESA (mensal)
// ------------------------------------------------------------
/**
 * Números de um mês (comp 'aaaa-mm'). Mês em curso conta até hoje.
 * Índice da área = média simples dos componentes com dado:
 *   decisões da Caixa da área tomadas no prazo (%) e atividades das pessoas da área com prazo no mês concluídas no prazo (%).
 * Programa de conduta: o índice de conduta do mês (ICO, 0 a 100; o fechado quando existe).
 * Índice geral = média simples das linhas com dado. Sem nenhum componente: "sem dado" (nunca zero).
 */
function RelEmp_saudeDados_(comp, us, nomesAreas) {
  var ini = comp + '-01', fimMes = Ges_fimComp_(comp), hoje = Ges_hoje_(), fim = fimMes < hoje ? fimMes : hoje;
  var agora = typeof Atividades_agora_ === 'function' ? Atividades_agora_() : Ges_agora_();
  var limiteAtv = fimMes < hoje ? fimMes + 'T23:59' : agora;
  var areas = {};
  var area = function (cod) { cod = Ges_up_(cod) || 'SEM_AREA'; return areas[cod] = areas[cod] || { codigo: cod, nome: cod === 'SEM_AREA' ? 'Sem área definida' : (nomesAreas[cod] || cod), dec: { base: 0, ok: 0 }, atv: { base: 0, ok: 0 } }; };
  Object.keys(nomesAreas).forEach(function (cod) { area(cod); });
  // Caixa de decisões
  var regs = Ges_ler_(GES_ABA_DECISOES).filter(function (r) { return Ges_up_(r.ACOMPANHAMENTO) !== 'SIM'; });
  var pend = { caixa: { entraram: 0, resolvidas: 0, vencidas: 0, abertas: 0 } };
  regs.forEach(function (r) {
    var a = area(r.AREA), dd = Ges_dataDecisao_(r).slice(0, 10), pz = Ges_dia_(r.PRAZO_DECISAO), sit = Ges_up_(r.SITUACAO);
    var entrou = Ges_dia_(r.ENTROU_EM), res = Ges_dia_(r.RESOLVIDO_EM);
    if (sit !== 'PERDIDA' && dd && dd >= ini && dd <= fim) { a.dec.base++; if (!pz || dd <= pz) a.dec.ok++; }
    else if (pz && pz >= ini && pz <= fim && pz < hoje && (!dd || dd > fim)) { a.dec.base++; pend.caixa.vencidas++; }
    if (entrou && entrou >= ini && entrou <= fim) pend.caixa.entraram++;
    if (sit === 'RESOLVIDA' && res && res >= ini && res <= fim) pend.caixa.resolvidas++;
    if (entrou && entrou <= fim && !(res && res <= fim) && (sit === 'ABERTA' || (res && res > fim))) pend.caixa.abertas++;
  });
  // Atividades
  var atvs = [];
  try { atvs = typeof Atividades_todas_ === 'function' ? Atividades_todas_() : []; } catch (e) { atvs = []; }
  pend.atividades = typeof Atividades_todas_ === 'function' ? { entraram: 0, resolvidas: 0, vencidas: 0, abertas: 0 } : null;
  atvs.forEach(function (x) {
    if (typeof Atividades_daOS_ === 'function' && Atividades_daOS_(x)) return;
    var sit = Ges_s_(x.SITUACAO), criada = Ges_dia_(x.CRIADO_EM), concl = Ges_iso_(x.CONCLUIDA_EM), prazo = Ges_s_(x.PRAZO);
    if (criada && criada >= ini && criada <= fim) pend.atividades.entraram++;
    if (sit === 'Concluída' && concl && concl.slice(0, 10) >= ini && concl.slice(0, 10) <= fim) pend.atividades.resolvidas++;
    if (sit !== 'Cancelada' && criada && criada <= fim && !(sit === 'Concluída' && concl && concl.slice(0, 10) <= fim)) pend.atividades.abertas++;
    if (sit === 'Cancelada' || !prazo || !x.RESPONSAVEL_ID) return;
    var p10 = prazo.slice(0, 10);
    if (p10 < ini || p10 > fim || prazo > limiteAtv) return;
    var u = us[Ges_s_(x.RESPONSAVEL_ID)], a = area(u ? u.area : '');
    a.atv.base++;
    var noPrazo = sit === 'Concluída' && (!concl || concl <= prazo);
    if (noPrazo) a.atv.ok++; else pend.atividades.vencidas++;
  });
  // Planos de ação (Programa de conduta e Qualidade) e casos da Frota
  var planos = function (linhas, cancelado) {
    var r = { entraram: 0, resolvidas: 0, vencidas: 0, abertas: 0 };
    linhas.forEach(function (x) {
      if (cancelado(x)) return;
      var criado = Ges_dia_(x.CRIADO_EM), concl = Ges_dia_(x.CONCLUIDO_EM), q = Ges_dia_(x.QUANDO);
      if (criado && criado >= ini && criado <= fim) r.entraram++;
      if (concl && concl >= ini && concl <= fim) r.resolvidas++;
      var aberto = criado && criado <= fim && !(concl && concl <= fim);
      if (aberto) r.abertas++;
      if (aberto && q && q <= fim && q < hoje) r.vencidas++;
    });
    return r;
  };
  pend.planos = typeof CNDQ_SHEETS !== 'undefined' ? planos(Ges_ler_(CNDQ_SHEETS.PLANO), function (x) { return Ges_up_(x.FASE) === 'CANCELADO'; }) : null;
  pend.casos = typeof FROTA_ABA_CASO !== 'undefined' ? planos(Ges_ler_(FROTA_ABA_CASO), function (x) { return Ges_up_(x.ETAPA) === 'CANCELADA' || !!Ges_s_(x.CANCELADO_EM); }) : null;
  // Programa de conduta
  var conduta = RelEmp_condutaIco_(comp);
  var pct = function (c) { return c.base ? Math.round(c.ok / c.base * 1000) / 10 : null; };
  var linhas = Object.keys(areas).map(function (k) {
    var a = areas[k], d = pct(a.dec), t = pct(a.atv), vs = [d, t].filter(function (v) { return v !== null; });
    return { codigo: a.codigo, nome: a.nome, decisoes: d, decBase: a.dec.base, decOk: a.dec.ok, atividades: t, atvBase: a.atv.base, atvOk: a.atv.ok,
      indice: vs.length ? Math.round(vs.reduce(function (s, v) { return s + v; }, 0) / vs.length * 10) / 10 : null };
  }).filter(function (l) { return l.codigo !== 'SEM_AREA' || l.decBase || l.atvBase; });
  var ordem = {}; Object.keys(nomesAreas).forEach(function (k, i) { ordem[k] = i; });
  linhas.sort(function (a, b) { return (ordem[a.codigo] === undefined ? 999 : ordem[a.codigo]) - (ordem[b.codigo] === undefined ? 999 : ordem[b.codigo]) || a.nome.localeCompare(b.nome, 'pt-BR'); });
  var comDado = linhas.map(function (l) { return l.indice; }).concat([conduta.ico]).filter(function (v) { return v !== null && v !== undefined; });
  var tot = function (k) { return linhas.reduce(function (s, l) { return s + l[k]; }, 0); };
  return { comp: comp, parcial: fimMes >= hoje, linhas: linhas, conduta: conduta, pendencias: pend,
    decisoes: pct({ base: tot('decBase'), ok: tot('decOk') }), atividades: pct({ base: tot('atvBase'), ok: tot('atvOk') }),
    geral: comDado.length ? Math.round(comDado.reduce(function (s, v) { return s + v; }, 0) / comDado.length * 10) / 10 : null };
}

/** ICO do mês: o do fechamento congelado quando existe, senão a apuração do mês (parcial). { ico, origem, n } ou ico null. */
function RelEmp_condutaIco_(comp) {
  if (typeof CONDUTA_SHEETS === 'undefined') return { ico: null, origem: 'Programa de conduta indisponível' };
  try {
    if (CONDUTA_SHEETS.FECHAMENTO) {
      var f = Ges_ler_(CONDUTA_SHEETS.FECHAMENTO).filter(function (x) { return Ges_s_(x.COMPETENCIA).slice(0, 7) === comp; })[0];
      if (f && isFinite(Number(f.ICO)) && Ges_s_(f.ICO) !== '') return { ico: Math.round(Number(f.ICO) * 10) / 10, origem: 'fechamento do mês', n: Number(f.N) || 0 };
    }
    if (typeof Conduta_apurarCompetencia_ !== 'function') return { ico: null, origem: 'mês sem fechamento' };
    var ap = Conduta_apurarCompetencia_(comp);
    if (!ap || !ap.n || !isFinite(Number(ap.ico))) return { ico: null, origem: 'sem colaborador apurado no mês' };
    return { ico: Math.round(Number(ap.ico) * 10) / 10, origem: 'apuração do mês (ainda sem fechamento)', n: ap.n };
  } catch (e) { return { ico: null, origem: 'não foi possível apurar: ' + String((e && e.message) || e).slice(0, 120) }; }
}

function RelEmp_txtIndice_(v) { return v === null || v === undefined ? 'sem dado' : Ges_numBr_(v, 1); }
function RelEmp_txtVariacao_(a, b) {
  if (a === null || a === undefined || b === null || b === undefined) return 'sem dado';
  var d = Math.round((a - b) * 10) / 10;
  return d === 0 ? 'estável' : (d > 0 ? '+' : '−') + Ges_numBr_(Math.abs(d), 1) + ' ponto' + (Math.abs(d) === 1 ? '' : 's');
}
function RelEmp_faixa_(v, farol) { return v === null || v === undefined ? 'neutra' : v >= farol.verde ? 'ok' : v >= farol.amarelo ? 'aviso' : 'critico'; }

function RelEmp_htmlSaude_(comp) {
  var us = Ges_usuarios_(), nomesAreas = {};
  try { (typeof Areas_todas_ === 'function' ? Areas_todas_() : []).forEach(function (a) { if (a.ATIVO) nomesAreas[a.CODIGO] = a.NOME; }); } catch (e) {}
  var farol = Ges_cfg_().farol, ant = Ges_competenciaAnterior_(comp + '-15');
  var d = RelEmp_saudeDados_(comp, us, nomesAreas), a = RelEmp_saudeDados_(ant, us, nomesAreas);
  var antMap = {}; a.linhas.forEach(function (l) { antMap[l.codigo] = l; });
  var nomeMes = Ges_nomeComp_(comp), nomeAnt = Ges_nomeComp_(ant);
  var criticas = d.linhas.filter(function (l) { return l.indice !== null && l.indice < farol.amarelo; });
  var semDado = d.linhas.filter(function (l) { return l.indice === null; }).length;
  var pc = d.pendencias.caixa;
  var texto = 'Em ' + nomeMes + (d.parcial ? ' (mês em curso, até hoje)' : '') + (d.geral === null
    ? ', não há dado para o índice geral: nenhuma área teve decisão ou atividade com prazo no mês e o Programa de conduta não tem índice apurado. '
    : ', o índice geral da empresa ficou em ' + Ges_numBr_(d.geral, 1) + ' de 100' + (a.geral === null ? ' (' + nomeAnt + ' sem dado para comparar). ' : '; em ' + nomeAnt + ' foi ' + Ges_numBr_(a.geral, 1) + ' (' + RelEmp_txtVariacao_(d.geral, a.geral) + '). ')) +
    (criticas.length ? Ges_plural_(criticas.length, 'área ficou', 'áreas ficaram') + ' abaixo de ' + farol.amarelo + ': ' + criticas.map(function (l) { return l.nome + ' (' + Ges_numBr_(l.indice, 1) + ')'; }).join(', ') + '. ' : (d.geral === null ? '' : 'Nenhuma área com dado ficou abaixo de ' + farol.amarelo + '. ')) +
    (semDado ? Ges_plural_(semDado, 'área não teve', 'áreas não tiveram') + ' decisão nem atividade com prazo no mês (sem dado). ' : '') +
    'Na Caixa de decisões entraram ' + pc.entraram + ' itens, ' + pc.resolvidas + ' foram resolvidos e ' + Ges_plural_(pc.vencidas, 'prazo de decisão venceu', 'prazos de decisão venceram') + ' sem decisão.';
  var c = [];
  c.push(RelA4_secao_('Resumo', RelA4_kpis_([
    [RelEmp_txtIndice_(d.geral), 'Índice geral (0 a 100)', RelEmp_faixa_(d.geral, farol)], [RelEmp_txtVariacao_(d.geral, a.geral), 'Em relação a ' + nomeAnt],
    [d.decisoes === null ? 'sem dado' : Ges_numBr_(d.decisoes, 1) + '%', 'Decisões no prazo', RelEmp_faixa_(d.decisoes, farol)],
    [d.atividades === null ? 'sem dado' : Ges_numBr_(d.atividades, 1) + '%', 'Atividades no prazo', RelEmp_faixa_(d.atividades, farol)],
    [RelEmp_txtIndice_(d.conduta.ico), 'Índice de conduta', RelEmp_faixa_(d.conduta.ico, farol)]]) + RelA4_paragrafos_(texto)));
  var linhas = d.linhas.map(function (l) {
    var x = antMap[l.codigo] || { indice: null };
    return [l.nome, l.decisoes === null ? 'sem dado' : Ges_numBr_(l.decisoes, 1) + '% (' + l.decOk + ' de ' + l.decBase + ')', l.atividades === null ? 'sem dado' : Ges_numBr_(l.atividades, 1) + '% (' + l.atvOk + ' de ' + l.atvBase + ')',
      l.indice === null ? 'sem dado' : RelA4_marca_(Ges_numBr_(l.indice, 1), RelEmp_faixa_(l.indice, farol)), RelEmp_txtIndice_(x.indice), RelEmp_txtVariacao_(l.indice, x.indice)];
  });
  linhas.push(['Programa de conduta (empresa toda)', '—', '—', d.conduta.ico === null ? 'sem dado' : RelA4_marca_(Ges_numBr_(d.conduta.ico, 1), RelEmp_faixa_(d.conduta.ico, farol)), RelEmp_txtIndice_(a.conduta.ico), RelEmp_txtVariacao_(d.conduta.ico, a.conduta.ico)]);
  var barras = d.linhas.filter(function (l) { return l.indice !== null; }).map(function (l) { return { rotulo: l.nome, valor: l.indice, rotuloValor: Ges_numBr_(l.indice, 1), cor: l.indice >= farol.verde ? RELA4_CORES.verde : l.indice >= farol.amarelo ? RELA4_CORES.ambar : RELA4_CORES.vermelho }; });
  c.push(RelA4_secao_('Índice por área', RelA4_tabela_([{ t: 'Área' }, { t: 'Decisões no prazo', num: true }, { t: 'Atividades no prazo', num: true }, { t: 'Índice', num: true }, { t: nomeAnt.replace(/^./, function (x) { return x.toUpperCase(); }), num: true }, { t: 'Variação', num: true }],
    linhas, { legenda: 'Índice de 0 a 100 por área em ' + nomeMes + ', comparado com ' + nomeAnt, compacta: true }) +
    (barras.length >= 2 ? RelA4_barras_(barras, { titulo: 'Índice do mês por área (verde a partir de ' + farol.verde + ', âmbar a partir de ' + farol.amarelo + ')' }) : '') +
    '<p class="nota">Programa de conduta: ' + RelA4_esc_(d.conduta.ico === null ? 'sem dado (' + d.conduta.origem + ')' : 'índice de conduta pela ' + d.conduta.origem) + '.</p>'));
  var pend = d.pendencias, linhaP = function (nome, x) { return x ? [nome, String(x.entraram), String(x.resolvidas), x.vencidas ? RelA4_marca_(String(x.vencidas), 'critico') : '0', String(x.abertas)] : [nome, 'sem dado', 'sem dado', 'sem dado', 'sem dado']; };
  c.push(RelA4_secao_('Melhorias e pendências', RelA4_tabela_([{ t: 'Frente' }, { t: 'Abertas no mês', num: true }, { t: 'Resolvidas no mês', num: true }, { t: 'Atrasadas', num: true }, { t: 'Em aberto no fim do mês', num: true }],
    [linhaP('Planos de ação (Programa de conduta e Qualidade)', pend.planos), linhaP('Casos da Frota (planos de ação)', pend.casos), linhaP('Caixa de decisões', pend.caixa), linhaP('Atividades da equipe', pend.atividades)],
    { legenda: 'Abertas, resolvidas e atrasadas em ' + nomeMes, compacta: true }) +
    '<p class="nota">Atrasadas: planos e casos em aberto com o prazo ("quando") vencido no mês; decisões cujo prazo venceu no mês sem decisão; atividades com prazo no mês não concluídas até o prazo. Só contagens: o detalhe de cada item fica no próprio módulo (os do Programa de conduta são restritos).</p>'));
  c.push(RelA4_secao_('Como o índice é calculado',
    '<p>O índice vai de 0 a 100 e mede o cumprimento de prazo, só com registros do SGO+.</p>' +
    RelA4_tabela_([{ t: 'Componente' }, { t: 'Como é contado' }], [
      ['Decisões no prazo', 'Itens da Caixa de decisões da área (área da pessoa envolvida ou do módulo) decididos no mês até o prazo de decisão, sobre os decididos no mês mais os prazos que venceram no mês sem decisão. Vencimentos de clientes (acompanhamento) não entram.'],
      ['Atividades no prazo', 'Atividades das pessoas da área com prazo no mês concluídas até o prazo, sobre todas as atividades da área com prazo no mês. Canceladas e atendimentos de O.S. não entram.'],
      ['Índice da área', 'Média simples dos dois componentes acima que tiveram dado no mês. Sem nenhum dos dois, a área fica "sem dado" (não vale zero).'],
      ['Programa de conduta', 'Índice de conduta do mês (ICO), o do fechamento quando o mês já foi fechado; senão, a apuração até a emissão.'],
      ['Índice geral', 'Média simples dos índices das áreas com dado e do Programa de conduta.'],
      ['Faixas', 'Verde a partir de ' + farol.verde + ', âmbar a partir de ' + farol.amarelo + ', vermelho abaixo (as mesmas faixas da avaliação do gestor).'],
      ['Comparação', 'O mês anterior é calculado com a mesma regra. Variação em pontos; "sem dado" quando um dos meses não tem dado.']
    ], { compacta: true })));
  return RelA4_documento_({ titulo: 'Saúde da empresa', tituloCurto: 'Saúde da empresa', sigla: 'GES-SAU', rotuloIdentificacao: 'Competência', identificacao: nomeMes + (d.parcial ? ' (parcial)' : ''),
    emitidoPor: 'Rotina automática (relatórios da empresa)', corpo: c.join('\n'), tituloArquivo: 'Saude da empresa', ficha: [['Uso', 'Diretoria e gestão (sem nomes de pessoas)']] });
}

// ------------------------------------------------------------
// API (Desempenho da gestão > Relatórios)
// ------------------------------------------------------------
function RelEmp_sessao_(sessionId, acao) {
  var s = exigirSessao(sessionId);
  if (!(Ges_ehDiretoriaSessao_(s) || Ges_podeConfigurar_(s))) throw new Error('Não foi possível ' + acao + ': os relatórios da empresa são da Diretoria e do Administrador');
  return s;
}

function RelEmp_proximoDia_(teste, cfgExp) {
  var d = Ges_hoje_();
  for (var i = 0; i < 45; i++) { if (teste(d, cfgExp)) return d; d = Ges_somarDias_(d, 1); }
  return '';
}

/**
 * Lê (e, com payload.salvar, grava) quem recebe os relatórios da empresa e se o envio está ligado.
 * payload.salvar: { ligado: bool, destinatarios: [ids] } — vazio volta ao padrão. Só Diretoria e Administrador gravam.
 */
function Gestao_apiRelatoriosEmpresa(sessionId, payload) {
  return Ges_resposta_('abrir os relatórios da empresa', function () {
    var s = RelEmp_sessao_(sessionId, 'abrir os relatórios da empresa'), p = payload || {};
    var us = Ges_usuarios_(), gcfg = Ges_cfg_(), msg = '';
    var candidato = function (id) { var u = us[id]; return u && u.ativo && (u.gestao || u.rotina); };
    if (p.salvar) {
      if (!Ges_podeConfigurar_(s)) throw new Error('quem recebe os relatórios da empresa é definido pela Diretoria ou pelo Administrador. Peça a uma dessas pessoas');
      var ids = (p.salvar.destinatarios || []).map(Ges_s_).filter(function (id, i, l) { return id && l.indexOf(id) === i; });
      var fora = ids.filter(function (id) { return !candidato(id); });
      if (fora.length) throw new Error('só pessoas ativas da gestão (Administrador, Diretoria, Gestor, RH e Financeiro) podem receber os relatórios. Atualize a tela e marque de novo');
      if (p.salvar.ligado !== false && !ids.length && !p.salvar.padrao) throw new Error('marque pelo menos uma pessoa, toque em "Voltar ao padrão" ou desligue o envio');
      var nova = { ligado: p.salvar.ligado !== false, destinatarios: p.salvar.padrao ? null : ids, atualizadoPor: Ges_s_(s.nome || s.usuario), atualizadoEm: Ges_agora_() };
      PropertiesService.getScriptProperties().setProperty(RELEMP_CFG_PROP, JSON.stringify(nova));
      try { SGO_DATA.log('GESTAO_RELATORIOS_EMPRESA', s.usuario, JSON.stringify({ ligado: nova.ligado, destinatarios: nova.destinatarios }).slice(0, 1000), 'GESTAO'); } catch (eL) {}
      msg = nova.ligado ? 'Lista salva. O próximo pacote sai para as pessoas marcadas.' : 'Envio desligado. Os relatórios voltam a sair no e-mail diário da Diretoria, como antes.';
    }
    var cfg = RelEmp_cfg_(), dest = RelEmp_destinatarios_(us, gcfg, cfg), cfgExp = typeof SGO_expediente_ === 'function' ? SGO_expediente_() : null;
    var pessoa = function (id) { var u = us[id]; return { id: id, nome: u.nome, perfil: u.perfil, area: u.areaNome, diretoria: !!u.diretoria, veNomes: RelEmp_veNomes_(u), marcado: dest.indexOf(id) >= 0 }; };
    var envios = Ges_envios_().filter(function (e) { var t = Ges_up_(e.TIPO); return t === 'EMPRESA_ITEM' || t === 'EMPRESA_PACOTE' || t === 'EMPRESA_TESTE'; });
    return {
      podeConfigurar: Ges_podeConfigurar_(s), ligado: cfg.ligado, padrao: !cfg.destinatarios, atualizadoPor: cfg.atualizadoPor, atualizadoEm: Ges_br_(cfg.atualizadoEm),
      destinatarios: dest.map(pessoa), candidatos: Object.keys(us).filter(candidato).map(pessoa).sort(function (a, b) { return a.nome.localeCompare(b.nome, 'pt-BR'); }),
      proximoSemanal: Ges_brDia_(RelEmp_proximoDia_(Ges_ehDiaDoSemanal_, cfgExp)), proximoMensal: Ges_brDia_(RelEmp_proximoDia_(Ges_ehDiaDoMensal_, cfgExp)),
      horaLimite: GES_HORA_LIMITE_RELATORIOS, hora: gcfg.escada.horaSemanal,
      historico: envios.slice(-60).reverse().map(function (e) {
        var t = Ges_up_(e.TIPO);
        return { tipo: t === 'EMPRESA_ITEM' ? 'Relatório' : t === 'EMPRESA_TESTE' ? 'E-mail de teste' : 'E-mail do pacote', nome: t === 'EMPRESA_ITEM' ? Ges_s_(e.USUARIO_NOME) : 'Para ' + Ges_s_(e.USUARIO_NOME),
          referencia: RelEmp_rotuloRef_(Ges_s_(e.REFERENCIA)), dia: Ges_brDia_(e.DIA), situacao: Ges_up_(e.SITUACAO), motivo: Ges_s_(e.MOTIVO), link: Ges_s_(e.LINK) };
      }),
      message: msg
    };
  });
}

function RelEmp_rotuloRef_(ref) {
  var m = /^SEMANA\|(\d{4}-\d{2}-\d{2})/.exec(ref);
  if (m) return 'Semana de ' + Ges_brDia_(m[1]) + ' a ' + Ges_brDia_(Ges_somarDias_(m[1], 6));
  m = /^MES\|(\d{4}-\d{2})/.exec(ref);
  return m ? Ges_nomeComp_(m[1]).replace(/^./, function (x) { return x.toUpperCase(); }) : ref;
}

/**
 * "Gerar e enviar agora (teste)": gera o que falta do pacote (semanal: semana anterior; mensal: mês anterior) e manda
 * só para quem clicou, com a mesma regra de acesso. payload: { tipo: 'semanal' | 'mensal' }.
 */
function Gestao_apiRelatoriosEmpresaTeste(sessionId, payload) {
  return Ges_resposta_('gerar o pacote de teste', function () {
    var s = exigirSessao(sessionId);
    if (!Ges_podeConfigurar_(s)) throw new Error('o envio de teste dos relatórios da empresa é da Diretoria e do Administrador');
    var tipo = Ges_s_((payload || {}).tipo) === 'mensal' ? 'mensal' : 'semanal', dia = Ges_hoje_(), inicio = Date.now();
    var p = tipo === 'mensal' ? RelEmp_pacoteMensal_(dia) : RelEmp_pacoteSemanal_(dia);
    var envios = Ges_envios_(), gerados = 0, cortou = false;
    p.itens.forEach(function (it) {
      if (cortou || RelEmp_estado_(it, p, envios)) return;
      if (Date.now() - inicio > RELEMP_TEMPO_TESTE_MS) { cortou = true; return; }
      RelEmp_gerar_(it, p); gerados++;
      envios = Ges_envios_();
    });
    var us = Ges_usuarios_(), uid = Ges_s_(s.userId);
    if (!us[uid] || !us[uid].ativo) throw new Error('a sua conta não está ativa no cadastro de usuários');
    var r = RelEmp_enviar_([p], envios, [uid], us, { dia: dia, teste: true }), res = r.resultados[0] || {};
    var faltam = RelEmp_faltam_([p], envios);
    if (res.situacao !== 'OK') throw new Error('o pacote foi montado, mas o e-mail não saiu: ' + (res.motivo || 'o serviço de e-mail não aceitou') + '. Confira o seu e-mail em Usuários e papéis e tente de novo');
    return { message: 'Pacote ' + (tipo === 'mensal' ? 'mensal (' + Ges_nomeComp_(p.comp) + ')' : 'semanal (' + p.titulo.toLowerCase() + ')') + ' enviado só para você, no seu e-mail.' +
      (gerados ? ' ' + Ges_plural_(gerados, 'relatório gerado', 'relatórios gerados') + ' agora; o resto já estava pronto.' : ' Todos os relatórios já estavam prontos.') +
      (faltam ? ' ' + Ges_plural_(faltam, 'relatório ficou', 'relatórios ficaram') + ' de fora por tempo: toque de novo para completar.' : ''), titulo: res.titulo, faltam: faltam };
  });
}
