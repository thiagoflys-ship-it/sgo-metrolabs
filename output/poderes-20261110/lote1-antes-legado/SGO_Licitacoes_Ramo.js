/****************************************************
 * SGO+ LICITAÇÕES — FILTRO DO RAMO (03/11/2026, decisão do dono: os 4 itens, nesta ordem)
 *
 * 1. Tela "Revisar o filtro do ramo" (licitacoes_ramo, só Diretoria e Administrador): as palavras que incluem e que excluem
 *    (com versão e histórico) e as candidatas atuais, cada uma com o objeto, o órgão/UF e QUAL termo a fez entrar (a razão da
 *    triagem, calculada pelo servidor em servicos/licitacoes/triagem.ts e guardada em TRIAGEM_ENTRADA_JSON). A Diretoria marca
 *    "não é do ramo", escolhe ou digita a expressão que exclui (o sistema sugere as expressões do objeto) e toca em "Aplicar":
 *    versão nova dos termos (motivo, quem, quando), triagem das candidatas refeita AGORA pelo servidor (SGO_LICITACOES.retriar)
 *    e a sincronia traz o resultado: as que saíram vão para Descartadas pela regra, com o motivo, e podem voltar (nada é apagado).
 *    Também acrescenta palavra que inclui. A regra continua num lugar só: o servidor (triagem.ts); aqui só a configuração.
 * 2. Aprender com descartes: descarte com o motivo padronizado "Fora do ramo" cria uma SUGESTÃO de palavra que exclui na tela
 *    do item 1 (aprovar ou recusar com um toque; nunca aplica sozinha).
 * 3. IA como segundo filtro: a candidata nova só aparece na lista principal do Radar depois que a análise automática concluir com
 *    nota igual ou acima do mínimo (padrão 40, configurável) e sem "fora do ramo"; abaixo disso vai para "Descartadas pela IA"
 *    (com a nota e o motivo, "Trazer de volta" com motivo); sem análise ainda, fica em "Aguardando a análise". Prazo curto (fim
 *    das propostas em menos de 48 h) nunca fica escondido: aparece na lista principal com o selo "sem análise". A fila e o teto
 *    da análise automática são os de sempre (SGO_Licitacoes_Analise.js): nenhuma chamada a mais à IA. A IA nunca descarta de vez:
 *    a oportunidade continua no Radar (SITUACAO = RADAR), só muda de aba, e volta com um toque.
 * 4. Tipo de serviço do catálogo (calibração, qualificação/validação, manutenção, NR-13/inspeção, engenharia clínica, outro)
 *    em cada oportunidade: pela triagem (servidor) e confirmado ou corrigido pela análise (itens com grau alto ou médio e o código
 *    do catálogo); filtro no Radar e no Painel.
 *
 * Gravação: LIC_CONFIG chaves RAMO ({ positivas, negativas }) e FILTRO_IA ({ ligado, notaMinima }), com versão e motivo;
 * LIC_HISTORICO (entidade CONFIG, ids RAMO e FILTRO_IA); sugestões em LIC_RAMO_SUGESTOES (uma linha por sugestão, nada apagado).
 ****************************************************/

var LIC_TIPOS_SERVICO = [['calibracao', 'Calibração'], ['qualificacao', 'Qualificação e validação'], ['manutencao', 'Manutenção'], ['nr13', 'NR-13 e inspeção'], ['engenharia_clinica', 'Engenharia clínica'], ['outro', 'Outro']];
var LIC_TIPO_NOME = {}; LIC_TIPOS_SERVICO.forEach(function (t) { LIC_TIPO_NOME[t[0]] = t[1]; });
/** Código do catálogo (LIC_SERVICOS da análise) → tipo de serviço. */
function Lic_tipoDoCodigo_(cod) {
  var c = Lic_up_(cod);
  if (!c) return '';
  if (/^CAL/.test(c)) return 'calibracao';
  if (/^(QUA|QT)/.test(c)) return 'qualificacao';
  if (/^NR13/.test(c)) return 'nr13';
  if (/^MP_/.test(c) || c === 'HORA_TECNICO') return 'manutencao';
  if (c === 'HORA_ENGENHEIRO') return 'engenharia_clinica';
  return '';
}
/** Motivos padronizados do descarte pela Diretoria (o texto continua livre; "Fora do ramo" ensina o filtro do ramo). */
var LIC_MOTIVOS_DESCARTE = [['FORA_DO_RAMO', 'Fora do ramo (não é serviço da Metrolabs)'], ['PRAZO', 'Prazo insuficiente'], ['EXIGENCIA', 'Exigência que não atendemos'], ['VALOR', 'Valor ou margem inviável'],
  ['LOGISTICA', 'Local ou logística inviável'], ['OUTRO', 'Outro motivo (descreva)']];
var LIC_FILTRO_IA_PADRAO = { ligado: true, notaMinima: 40 };
var LIC_PRAZO_CURTO_RADAR_MS = 48 * 3600e3;
var LIC_RAMO_MAX_PALAVRAS = 300;
var LIC_ABA_SUGESTOES = 'LIC_RAMO_SUGESTOES';

// ------------------------------------------------------------ texto
function Lic_ramoNorm_(t) { return Lic_s_(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); }
/** A mesma comparação do servidor (triagem.ts, escapar): sem acento e sem caixa, espaços flexíveis, em qualquer ponto do texto. */
function Lic_ramoCasa_(texto, expressao) { var e = Lic_ramoNorm_(expressao); return !!e && Lic_ramoNorm_(texto).indexOf(e) >= 0; }
/** Lista de palavras (texto com vírgula, ponto e vírgula ou linha, ou lista), sem repetir por acento e caixa, na grafia da primeira. */
function Lic_ramoLista_(v) {
  var vistas = {}, out = [];
  (Array.isArray(v) ? v : Lic_s_(v).split(/[;\n]+|,(?!\d)/)).forEach(function (x) {
    var t = Lic_s_(x).replace(/\s+/g, ' '), k = Lic_ramoNorm_(t);
    if (t && !vistas[k]) { vistas[k] = true; out.push(t); }
  });
  return out;
}
/** Radicais dos termos de interesse da taxonomia do servidor (triagem.ts, POSITIVAS): a sugestão de palavra que exclui nunca os contém. */
var LIC_RAMO_RADICAIS = ['calibra', 'aferi', 'metrolog', 'qualifica', 'validac', 'mapeamento termico', 'termodesinfect', 'ultrass', 'autoclave', 'esteriliz', 'seladora', 'nr 13', 'nr-13', 'nr13',
  'vaso de pressao', 'vasos de pressao', 'caldeira', 'valvula de seguranca', 'valvulas de seguranca', 'engenharia clinica', 'engenharia biomedica', 'registrador', 'data logger', 'datalogger',
  'osmose reversa', 'termo-higrometr', 'termohigrometr', 'esfigmomanometr', 'manutenc'];
var LIC_RAMO_CORTES = /[,;:()\/\[\]–—]| - |\s+e\s+|\s+ou\s+|\s+para\s+|\s+atrav[eé]s\s+d[aeo]s?\s+|\s+em\s+|\s+com\s+|\s+visando\s+|\s+objetivando\s+|\s+destinad[ao]s?\s+[aà]s?\s+|\s+conforme\s+|\s+junto\s+[aà]s?\s+|\s+mediante\s+|\s+incluindo\s+/i;
var LIC_RAMO_VAZIAS = ['a', 'o', 'as', 'os', 'de', 'da', 'do', 'das', 'dos', 'na', 'no', 'nas', 'nos', 'em', 'e', 'ou', 'para', 'pela', 'pelo', 'pelas', 'pelos', 'por', 'um', 'uma', 'ao', 'aos', 'à', 'às',
  'contratacao', 'contratação', 'empresa', 'empresas', 'especializada', 'especializadas', 'especializado', 'especializados', 'prestacao', 'prestação', 'servico', 'serviço', 'servicos', 'serviços',
  'eventual', 'eventuais', 'futura', 'futuras', 'registro', 'preco', 'preço', 'precos', 'preços', 'execucao', 'execução', 'realizacao', 'realização', 'fornecimento', 'aquisicao', 'aquisição',
  'tecnico', 'técnico', 'tecnicos', 'técnicos', 'tecnica', 'técnica', 'tecnicas', 'técnicas', 'pessoa', 'juridica', 'jurídica', 'objeto', 'presente', 'referente', 'visando', 'contratar'];
var LIC_RAMO_GENERICAS = ['unidade', 'unidades', 'municipio', 'município', 'secretaria', 'saude', 'saúde', 'hospital', 'hospitais', 'atender', 'atendimento', 'necessidades', 'necessidade', 'demanda', 'demandas',
  'termo', 'referencia', 'referência', 'edital', 'anexo', 'sistema', 'sistemas', 'fundo', 'municipal', 'estadual', 'estado', 'quantidades', 'quantidade', 'itens', 'item', 'lote', 'lotes', 'meses',
  'periodo', 'período', 'prazo', 'ano', 'anos', 'demais', 'diversos', 'diversas', 'setor', 'setores', 'rede', 'publica', 'pública', 'administracao', 'administração', 'prefeitura', 'fundacao', 'fundação',
  'equipamento', 'equipamentos', 'material', 'materiais'];
/**
 * Expressões do objeto que podem virar palavra que exclui (sugestão da tela e do descarte "Fora do ramo"): os pedaços do objeto
 * separados por vírgula, "e", "ou", "para", "através de", "em", "com"..., sem as palavras vazias do começo e do fim, até 4 palavras,
 * sem número e SEM nenhum termo de interesse (nem os da taxonomia, nem os configurados: excluir "calibração" mataria o ramo).
 */
function Lic_ramoExpressoes_(objeto, positivasCfg) {
  var radicais = LIC_RAMO_RADICAIS.concat((positivasCfg || []).map(Lic_ramoNorm_).filter(Boolean));
  var vistas = {}, out = [];
  Lic_s_(objeto).split(LIC_RAMO_CORTES).forEach(function (seg) {
    if (out.length >= 10 || !seg) return;
    var pal = Lic_s_(seg).replace(/["“”'‘’.]/g, ' ').split(/\s+/).filter(Boolean);
    while (pal.length && LIC_RAMO_VAZIAS.indexOf(pal[0].toLowerCase()) >= 0) pal.shift();
    while (pal.length && LIC_RAMO_VAZIAS.indexOf(pal[pal.length - 1].toLowerCase()) >= 0) pal.pop();
    if (!pal.length || pal.length > 4) { if (pal.length > 4) pal = pal.slice(0, 4); else return; }
    while (pal.length && LIC_RAMO_VAZIAS.indexOf(pal[pal.length - 1].toLowerCase()) >= 0) pal.pop();
    if (!pal.length || LIC_RAMO_GENERICAS.indexOf(pal[0].toLowerCase()) >= 0) return;
    var txt = pal.join(' ').toLowerCase(), n = Lic_ramoNorm_(txt);
    if (n.length < 4 || /\d/.test(n) || vistas[n]) return;
    if (radicais.some(function (r) { return n.indexOf(r) >= 0; })) return;
    vistas[n] = true; out.push(txt);
  });
  return out;
}

// ------------------------------------------------------------ configuração (versão e histórico)
function Lic_cfgChave_(chave) { return Lic_ler_(LIC_ABAS.CONFIG).filter(function (c) { return Lic_s_(c.CHAVE) === chave; })[0] || null; }
/** Palavras do ramo (LIC_CONFIG chave RAMO): valem para todos os portais, somadas às de cada portal. Sem linha: listas vazias. */
function Lic_ramoCfg_() {
  var l = Lic_cfgChave_('RAMO'), v = l ? Lic_json_(l.VALOR_JSON, {}) : {};
  return { positivas: Lic_ramoLista_(v.positivas || []), negativas: Lic_ramoLista_(v.negativas || []), versao: l ? Number(l.VERSAO) || 1 : 0, motivo: l ? Lic_s_(l.MOTIVO) : '',
    por: l ? Lic_s_(l.ATUALIZADO_POR_NOME) : '', em: l ? Lic_s_(l.ATUALIZADO_EM) : '' };
}
/** O que vai para o servidor (LIC_CFG_COLETOR.ramo, Lic_publicarCfgColetor_). */
function Lic_ramoParaColetor_() { var c = Lic_ramoCfg_(); return { versao: c.versao, positivas: c.positivas, negativas: c.negativas }; }
/** IA como segundo filtro (LIC_CONFIG chave FILTRO_IA): ligado e a nota mínima (1 a 100). Sem linha: ligado, nota 40. */
function Lic_filtroIACfg_() {
  var l = Lic_cfgChave_('FILTRO_IA'), v = l ? Lic_json_(l.VALOR_JSON, {}) : {}, n = Number(v.notaMinima);
  return { ligado: v.ligado === undefined ? LIC_FILTRO_IA_PADRAO.ligado : !!v.ligado, notaMinima: isFinite(n) && n >= 1 && n <= 100 ? n : LIC_FILTRO_IA_PADRAO.notaMinima, padrao: LIC_FILTRO_IA_PADRAO.notaMinima,
    prazoCurtoHoras: LIC_PRAZO_CURTO_RADAR_MS / 3600e3, versao: l ? Number(l.VERSAO) || 1 : 0, motivo: l ? Lic_s_(l.MOTIVO) : '', por: l ? Lic_s_(l.ATUALIZADO_POR_NOME) : '', em: l ? Lic_s_(l.ATUALIZADO_EM) : '' };
}
function Lic_cfgGravar_(chave, valor, versao, motivo, eu) {
  var linha = Lic_cfgChave_(chave), agora = Lic_agora_();
  var reg = { CHAVE: chave, VALOR_JSON: JSON.stringify(valor), VERSAO: versao, MOTIVO: motivo, ATUALIZADO_POR_ID: Lic_s_(eu && eu.id), ATUALIZADO_POR_NOME: Lic_s_(eu && eu.nome), ATUALIZADO_EM: agora };
  if (linha) SGO_DATA.update(LIC_ABAS.CONFIG, linha.ID, reg); else SGO_DATA.insert(LIC_ABAS.CONFIG, Object.assign({ CRIADO_EM: agora }, reg));
}
/** "Salvar" do segundo filtro pela IA (motivo obrigatório, versão nova, histórico). */
function Lic_filtroIASalvar_(eu, d) {
  var motivo = Lic_texto_(d.motivo, 500), nota = Number(String(Lic_s_(d.notaMinima)).replace(',', '.')), ligado = d.ligado === true || d.ligado === 'true' || d.ligado === 'SIM';
  if (motivo.length < 5) throw new Error('Escreva o motivo da mudança (pelo menos 5 letras). Nada foi alterado');
  if (!(nota >= 1 && nota <= 100) || Math.floor(nota) !== nota) throw new Error('A nota mínima precisa ser um número inteiro de 1 a 100. Nada foi alterado');
  return Lic_comTrava_(function () {
    var antes = Lic_filtroIACfg_();
    if (antes.versao && antes.ligado === ligado && antes.notaMinima === nota) return { filtroIA: antes, semMudanca: true, texto: 'Nada mudou. Nenhuma versão nova foi criada.' };
    var versao = antes.versao + 1, txt = function (c, n) { return (c ? 'ligado' : 'desligado') + ', nota mínima ' + n; };
    Lic_cfgGravar_('FILTRO_IA', { ligado: ligado, notaMinima: nota }, versao, motivo, eu);
    Lic_historico_('CONFIG', 'FILTRO_IA', '', 'FILTRO_IA_CONFIG', eu, { de: txt(antes.ligado, antes.notaMinima), para: txt(ligado, nota), texto: 'Motivo: ' + motivo, versao: versao, fonte: 'Tela Revisar o filtro do ramo' });
    return { filtroIA: Lic_filtroIACfg_(), versao: versao, texto: 'Segundo filtro pela IA salvo (versão ' + versao + ').' };
  });
}

// ------------------------------------------------------------ razão da triagem e tipo de serviço
/**
 * O termo que fez a oportunidade entrar. Vem do servidor (TRIAGEM_ENTRADA_JSON, regras 2026-11-03.1 em diante). Linha anterior a
 * isso: lida do motivo da triagem ("Termo de interesse: X (no objeto).") e do termo literal, marcada como "reconstruida" até o
 * servidor refazer a triagem (a tela pede SGO_LICITACOES.retriar das candidatas sem a razão).
 */
function Lic_ramoRazao_(l) {
  var e = Lic_json_(l.TRIAGEM_ENTRADA_JSON, null);
  if (e && e.rotulo) return { rotulo: Lic_s_(e.rotulo), termo: Lic_s_(e.termo), fonte: Lic_s_(e.fonte), trecho: Lic_s_(e.trecho), origem: Lic_s_(e.origem) || 'taxonomia', todas: Array.isArray(e.todas) ? e.todas.map(Lic_s_) : [], reconstruida: false };
  var m = /^Termo de interesse: (.+) \(no ([^)]+)\)\.?$/.exec(Lic_s_(l.TRIAGEM_MOTIVO));
  if (m) return { rotulo: m[1], termo: Lic_s_(l.TRIAGEM_TERMO), fonte: m[2], trecho: Lic_s_(l.TRIAGEM_TRECHO), origem: 'taxonomia', todas: [m[1]], reconstruida: true };
  return null;
}
/** Tipo de serviço final: o da análise (quando concluída e com item do catálogo) vence o da triagem; origem diz qual. */
function Lic_tipoDe_(l) {
  var tri = Lic_s_(l.TIPO_SERVICO_TRIAGEM), ia = Lic_s_(l.TIPO_SERVICO_IA);
  if (ia) return { codigo: ia, nome: LIC_TIPO_NOME[ia] || ia, origem: !tri ? 'ANALISE' : tri === ia ? 'CONFIRMADO' : 'CORRIGIDO', triagem: tri };
  if (tri) return { codigo: tri, nome: LIC_TIPO_NOME[tri] || tri, origem: 'TRIAGEM', triagem: tri };
  return { codigo: '', nome: 'Não classificado', origem: '', triagem: '' };
}
/** Tipo pela análise: o código do catálogo dos itens com grau ALTA (1) e MÉDIA (0,5), o de maior peso; sem item que conte: ''. */
function Lic_tipoDaAnalise_(itens) {
  var peso = {};
  (Array.isArray(itens) ? itens : []).forEach(function (it) {
    var p = it && it.grau === 'ALTA' ? 1 : it && it.grau === 'MEDIA' ? 0.5 : 0, t = p ? Lic_tipoDoCodigo_(it.servico) : '';
    if (t) peso[t] = (peso[t] || 0) + p;
  });
  var melhor = '', mp = 0;
  LIC_TIPOS_SERVICO.forEach(function (t) { if ((peso[t[0]] || 0) > mp) { mp = peso[t[0]]; melhor = t[0]; } });
  return melhor;
}
function Lic_iaBase_(l) { return Lic_s_(l.ID) + ':' + Lic_s_(l.ANALISE_VERSAO) + ':' + Lic_hash_(Lic_s_(l.TRAVAS_DECISOES_JSON)).slice(0, 12); }
/**
 * Veredito da última análise CONCLUÍDA guardado na oportunidade (IA_FORA_RAMO, TIPO_SERVICO_IA), refeito só quando a análise ou as
 * decisões de trava mudaram (IA_FILTRO_BASE). Fora do ramo = trava FORA_DO_CATALOGO ou PRODUTO_SEM_CATALOGO que a Diretoria não
 * marcou "não é trava". Uma leitura de LIC_ANALISES (só as colunas usadas) e só quando alguma mudou. Devolve quantas acertou.
 */
function Lic_ramoAcertarIA_(todas) {
  var mudar = (todas || []).filter(function (l) { return Number(l.ANALISE_VERSAO) > 0 && Lic_s_(l.IA_FILTRO_BASE) !== Lic_iaBase_(l); });
  if (!mudar.length) return 0;
  var leitura = typeof Lic_lerColunas_ === 'function' ? Lic_lerColunas_(LIC_ABAS.ANALISES, ['OPORTUNIDADE_ID', 'VERSAO', 'SITUACAO', 'SOMA', 'TRAVAS_JSON', 'ITENS_JSON']) : Lic_ler_(LIC_ABAS.ANALISES);
  var porOp = {};
  leitura.forEach(function (a) { if (Lic_s_(a.SITUACAO) !== 'CONCLUIDA') return; var k = Lic_s_(a.OPORTUNIDADE_ID) + ':' + Lic_s_(a.VERSAO); porOp[k] = a; });
  var n = 0;
  mudar.forEach(function (l) {
    var a = porOp[Lic_s_(l.ID) + ':' + Lic_s_(l.ANALISE_VERSAO)];
    if (!a) return;
    var travas = Lic_json_(a.TRAVAS_JSON, []), dec = Lic_json_(l.TRAVAS_DECISOES_JSON, {});
    var lista = typeof Lic_notaPelasTravas_ === 'function' ? Lic_notaPelasTravas_(Number(a.SOMA) || 0, travas, dec).travas : travas;
    var fora = (lista || []).filter(function (t) { return (t.codigo === 'FORA_DO_CATALOGO' || t.codigo === 'PRODUTO_SEM_CATALOGO') && t.estado !== 'NAO_E_TRAVA'; })[0];
    var m = { IA_FILTRO_BASE: Lic_iaBase_(l), IA_FORA_RAMO: fora ? Lic_texto_(fora.nome || fora.codigo, 300) : '', TIPO_SERVICO_IA: fora ? 'outro' : Lic_tipoDaAnalise_(Lic_json_(a.ITENS_JSON, [])) };
    SGO_DATA.update(LIC_ABAS.OPORTUNIDADES, l.ID, m);
    Object.assign(l, m); n++;
  });
  return n;
}

// ------------------------------------------------------------ IA como segundo filtro
/** Contexto de uma leitura (lista, Hoje, alertas): a regra do filtro e se a IA está disponível (sem a chave, o filtro não esconde nada). */
function Lic_ramoCtx_(todas) {
  var cfg = Lic_filtroIACfg_(), ia = typeof Lic_iaDisponivel_ === 'function' ? !!Lic_iaDisponivel_() : false;
  if (todas) { try { Lic_ramoAcertarIA_(todas); } catch (e) { console.error('Licitações, veredito da IA: ' + ((e && e.message) || e)); } }
  return { cfg: cfg, ativo: cfg.ligado && ia, iaDisponivel: ia, agoraMs: Date.now() };
}
/**
 * Onde uma oportunidade do Radar aparece. Só vale para RADAR com triagem CANDIDATA (travadas, em análise e descartadas não mudam).
 *   PRINCIPAL      lista principal (nota no mínimo ou acima e sem fora do ramo; reaberta ou trazida de volta pela Diretoria; prazo
 *                  curto sem análise, com o selo "sem análise"; filtro desligado ou IA indisponível)
 *   AGUARDANDO     a análise automática ainda não concluiu (com o porquê)
 *   DESCARTADA_IA  a análise concluiu com nota abaixo do mínimo ou fora do ramo (com a nota e o motivo); reversível
 */
function Lic_radarFiltroEstado_(l, ctx) {
  if (Lic_s_(l.SITUACAO) !== 'RADAR' || Lic_s_(l.TRIAGEM) !== 'CANDIDATA') return null;
  ctx = ctx || Lic_ramoCtx_();
  if (!ctx.ativo) return { estado: 'PRINCIPAL', selo: '', texto: '' };
  if (Lic_s_(l.DESCARTE_ORIGEM) === 'REABERTA') return { estado: 'PRINCIPAL', selo: '', texto: 'Reaberta pela Diretoria: o filtro da IA não a esconde.' };
  if (Lic_s_(l.IA_TRAZIDA_EM)) return { estado: 'PRINCIPAL', selo: 'Trazida de volta pela Diretoria', texto: 'Trazida de volta por ' + Lic_s_(l.IA_TRAZIDA_POR_NOME) + ': ' + Lic_s_(l.IA_TRAZIDA_MOTIVO) };
  var temNota = Number(l.ANALISE_VERSAO) > 0 && Lic_s_(l.NOTA) !== '' && isFinite(Number(l.NOTA));
  if (temNota) {
    var nota = Number(l.NOTA), min = ctx.cfg.notaMinima, fora = Lic_s_(l.IA_FORA_RAMO);
    if (fora) return { estado: 'DESCARTADA_IA', nota: nota, motivo: 'A análise apontou fora do ramo: ' + fora + ' (a confirmar pela Diretoria).' };
    if (nota < min) return { estado: 'DESCARTADA_IA', nota: nota, motivo: 'Nota ' + String(Math.round(nota * 10) / 10).replace('.', ',') + ' abaixo do mínimo ' + min + ' do segundo filtro.' };
    return { estado: 'PRINCIPAL', selo: '', texto: '' };
  }
  var enc = Date.parse(Lic_s_(l.ENCERRAMENTO_ISO));
  if (isFinite(enc) && enc > ctx.agoraMs && enc - ctx.agoraMs < LIC_PRAZO_CURTO_RADAR_MS) return { estado: 'PRINCIPAL', selo: 'Sem análise (prazo curto)', texto: 'O fim das propostas é em menos de 48 h: aparece sem esperar a análise da IA.' };
  var s = Lic_up_(l.ANALISE_SITUACAO), p = Lic_up_(l.ANALISE_PENDENTE_SITUACAO), por;
  if (s === 'RECUSADA') por = 'A IA não concluiu: a resposta foi recusada pelo verificador. Abra a ficha e toque em "Analisar agora", ou traga para a lista.';
  else if (p === 'FALHOU') por = 'A análise automática falhou 3 vezes. Abra a ficha e toque em "Analisar agora", ou traga para a lista.';
  else if (s === 'ERRO') por = 'A IA não respondeu na última tentativa; a fila tenta de novo sozinha.';
  else if (p === 'NA_FILA') por = 'Na fila da análise automática (ver a posição na ficha, aba Análise).';
  else por = 'A análise automática ainda não começou: entra na fila na próxima varredura (a cada 30 minutos).';
  return { estado: 'AGUARDANDO', texto: por };
}
/** Para os alertas e o resumo (SGO_Licitacoes_Alertas.js): '' = aparece no Radar; senão o porquê de não alertar ainda. */
function Lic_radarSemAlerta_(l, ctx) {
  var e = Lic_radarFiltroEstado_(l, ctx);
  if (!e || e.estado === 'PRINCIPAL') return '';
  return e.estado === 'AGUARDANDO' ? 'aguardando a análise da IA (segundo filtro do ramo)' : 'descartada pela IA no segundo filtro do ramo (' + e.motivo + ')';
}
/** Aba da lista para uma candidata do Radar ('analisar', 'aguardando' ou 'descartadas_ia'). */
function Lic_radarAba_(l, ctx) {
  var e = Lic_radarFiltroEstado_(l, ctx);
  return !e || e.estado === 'PRINCIPAL' ? 'analisar' : e.estado === 'AGUARDANDO' ? 'aguardando' : 'descartadas_ia';
}
/** "Trazer de volta" (Descartadas pela IA ou Aguardando a análise): motivo obrigatório, histórico; a análise não muda. */
function Lic_trazerDeVolta_(eu, d) {
  var motivo = Lic_texto_(d.motivo, 1000);
  if (motivo.length < 10) throw new Error('Escreva por que a oportunidade volta para a lista principal (pelo menos 10 letras). Nada foi alterado');
  return Lic_comTrava_(function () {
    var l = Lic_acharOp_(d.id), e = Lic_radarFiltroEstado_(l, Lic_ramoCtx_());
    if (!e || e.estado === 'PRINCIPAL') throw new Error('Não foi possível trazer de volta: a oportunidade já está na lista principal do Radar (ou não está mais no Radar). Atualize a lista; nada foi alterado');
    var agora = Lic_agora_();
    SGO_DATA.update(LIC_ABAS.OPORTUNIDADES, l.ID, { IA_TRAZIDA_EM: agora, IA_TRAZIDA_POR_ID: Lic_s_(eu.id), IA_TRAZIDA_POR_NOME: Lic_s_(eu.nome), IA_TRAZIDA_MOTIVO: motivo, ATUALIZADO_EM: agora });
    var h = Lic_historico_('OPORTUNIDADE', l.ID, l.CODIGO, 'TRAZIDA_DE_VOLTA', eu, { de: e.estado === 'AGUARDANDO' ? 'Aguardando a análise' : 'Descartada pela IA', para: 'Lista principal do Radar',
      texto: 'Trazida de volta pela Diretoria: ' + motivo + (e.motivo ? ' (a IA tinha dado: ' + e.motivo + ')' : e.texto ? ' (' + e.texto + ')' : ''), versao: l.VERSAO_FONTE, fonte: d.fonte || 'Tela Oportunidades' });
    return { id: Lic_s_(l.ID), codigo: Lic_s_(l.CODIGO), hash: h.HASH, texto: 'Trazida de volta para a lista principal: ' + Lic_s_(l.CODIGO) + '.' };
  });
}

// ------------------------------------------------------------ sugestões (aprender com descartes)
function Lic_ramoSugestoes_() { return Lic_ler_(LIC_ABA_SUGESTOES); }
/**
 * Descarte com o motivo "Fora do ramo": calcula a regra que fez entrar (a razão da triagem) e cria UMA sugestão de palavra que
 * exclui (a primeira expressão do objeto sem termo de interesse; as outras ficam como alternativas). Nunca aplica sozinha.
 */
function Lic_ramoSugerir_(eu, id, motivo) {
  var l = Lic_acharOp_(id), razao = Lic_ramoRazao_(l), cfg = Lic_ramoCfg_();
  var pend = Lic_ramoSugestoes_().filter(function (s) { return Lic_s_(s.OPORTUNIDADE_ID) === Lic_s_(l.ID) && Lic_up_(s.SITUACAO) === 'PENDENTE'; })[0];
  if (pend) return { id: Lic_s_(pend.ID), repetida: true };
  var expr = Lic_ramoExpressoes_(l.OBJETO, cfg.positivas).filter(function (x) { return !cfg.negativas.some(function (n) { return Lic_ramoNorm_(n) === Lic_ramoNorm_(x); }); });
  var agora = Lic_agora_();
  var reg = { OPORTUNIDADE_ID: Lic_s_(l.ID), CODIGO: Lic_s_(l.CODIGO), TIPO: 'NEGATIVA', EXPRESSAO: expr[0] || '', EXPRESSOES_JSON: JSON.stringify(expr), ENTRADA_ROTULO: razao ? razao.rotulo : '', ENTRADA_TERMO: razao ? razao.termo : '',
    OBJETO: Lic_texto_(l.OBJETO, 600), ORGAO_UF: Lic_texto_(Lic_s_(l.ORGAO_NOME) + (Lic_s_(l.UF) ? ' (' + Lic_s_(l.UF) + ')' : ''), 300), ORIGEM: 'DESCARTE_FORA_DO_RAMO', MOTIVO: Lic_texto_(motivo, 1000), SITUACAO: 'PENDENTE',
    CRIADO_POR_ID: Lic_s_(eu && eu.id), CRIADO_POR_NOME: Lic_s_(eu && eu.nome), CRIADO_EM: agora };
  var ins = SGO_DATA.insert(LIC_ABA_SUGESTOES, reg);
  Lic_historico_('OPORTUNIDADE', l.ID, l.CODIGO, 'SUGESTAO_FILTRO_RAMO', eu, { texto: 'Descartada como fora do ramo: o sistema sugeriu ' + (reg.EXPRESSAO ? 'a palavra que exclui "' + reg.EXPRESSAO + '"' : 'revisar as palavras (o objeto não tem expressão sem termo de interesse)') + (razao ? '; entrou por "' + razao.rotulo + '"' : '') + '. A sugestão espera a Diretoria na tela Revisar o filtro do ramo (nada é aplicado sozinho).', fonte: 'Filtro do ramo' });
  return { id: ins && ins.ID ? Lic_s_(ins.ID) : '', expressao: reg.EXPRESSAO, entrada: reg.ENTRADA_ROTULO };
}
/** Recusar uma sugestão (motivo opcional) ou aprovar (aplica a palavra com o fluxo de "Aplicar"). */
function Lic_ramoSugestaoDecidir_(eu, d) {
  var dec = Lic_up_(d.decisao), s = Lic_ramoSugestoes_().filter(function (x) { return Lic_s_(x.ID) === Lic_s_(d.id); })[0];
  if (!s) throw new Error('Não foi possível: a sugestão não foi encontrada (atualize a tela). Nada foi alterado');
  if (Lic_up_(s.SITUACAO) !== 'PENDENTE') throw new Error('Não foi possível: a sugestão já foi ' + (Lic_up_(s.SITUACAO) === 'APROVADA' ? 'aprovada' : 'recusada') + ' por ' + Lic_s_(s.DECIDIDO_POR_NOME) + '. Atualize a tela; nada foi alterado');
  if (dec === 'RECUSAR') {
    var agora = Lic_agora_();
    SGO_DATA.update(LIC_ABA_SUGESTOES, s.ID, { SITUACAO: 'RECUSADA', DECIDIDO_POR_ID: Lic_s_(eu.id), DECIDIDO_POR_NOME: Lic_s_(eu.nome), DECIDIDO_EM: agora, DECISAO_MOTIVO: Lic_texto_(d.motivo, 500) || 'Recusada na tela Revisar o filtro do ramo' });
    Lic_historico_('CONFIG', 'RAMO', '', 'SUGESTAO_RECUSADA', eu, { texto: 'Sugestão recusada: "' + Lic_s_(s.EXPRESSAO) + '" (descarte de ' + Lic_s_(s.CODIGO) + ').' + (Lic_s_(d.motivo) ? ' Motivo: ' + Lic_texto_(d.motivo, 500) : ''), fonte: 'Tela Revisar o filtro do ramo' });
    return { recusada: true, texto: 'Sugestão recusada. Nada mudou no filtro.' };
  }
  if (dec !== 'APROVAR') throw new Error('Escolha aprovar ou recusar a sugestão. Nada foi alterado');
  var expr = Lic_texto_(d.expressao || s.EXPRESSAO, 80);
  if (Lic_ramoNorm_(expr).length < 3) throw new Error('Escolha ou digite a expressão que exclui (pelo menos 3 letras) antes de aprovar. Nada foi alterado');
  return Lic_ramoAplicar_(eu, { negativasAdd: [expr], motivo: 'Sugestão aprovada (descarte de ' + Lic_s_(s.CODIGO) + ' como fora do ramo): ' + Lic_s_(s.MOTIVO), sugestoes: [Lic_s_(s.ID)], fonte: 'Sugestão do descarte' });
}

// ------------------------------------------------------------ aplicar (versão nova, triagem refeita agora, quantas saíram)
/** Candidatas e travadas no Radar e as descartadas só pela regra com prazo em aberto: as que a triagem refeita pode mudar. */
function Lic_ramoAlvos_(todas) {
  var agora = Date.now();
  return (todas || []).filter(function (l) {
    var s = Lic_s_(l.SITUACAO), enc = Date.parse(Lic_s_(l.ENCERRAMENTO_ISO));
    if (s === 'RADAR') return Lic_s_(l.TRIAGEM) === 'CANDIDATA' || Lic_s_(l.TRIAGEM) === 'TRAVADA';
    return s === 'DESCARTADA' && Lic_s_(l.DESCARTE_ORIGEM) === 'REGRA' && (!isFinite(enc) || enc > agora);
  });
}
/**
 * "Aplicar" da tela: d = { motivo, negativasAdd, negativasRemover, positivasAdd, positivasRemover, marcadas: [ids "não é do ramo"],
 * sugestoes: [ids aprovadas] }. Versão nova de LIC_CONFIG RAMO com o motivo, histórico (de → para), LIC_CFG_COLETOR publicado,
 * triagem refeita AGORA pelo servidor nas candidatas, travadas e descartadas pela regra em aberto, e a sincronia traz o resultado.
 */
function Lic_ramoAplicar_(eu, d) {
  var motivo = Lic_texto_(d.motivo, 500);
  if (motivo.length < 5) throw new Error('Escreva o motivo da mudança (pelo menos 5 letras): ele fica no histórico com o seu nome e a data. Nada foi alterado');
  var limpar = function (v) { return Lic_ramoLista_(v || []).map(function (x) { return Lic_texto_(x, 80); }).filter(function (x) { return Lic_ramoNorm_(x).length >= 3; }); };
  var negAdd = limpar(d.negativasAdd), negRem = limpar(d.negativasRemover), posAdd = limpar(d.positivasAdd), posRem = limpar(d.positivasRemover);
  if ((Lic_ramoLista_(d.negativasAdd || []).length + Lic_ramoLista_(d.positivasAdd || []).length) > negAdd.length + posAdd.length) throw new Error('Cada palavra ou expressão precisa ter pelo menos 3 letras (e no máximo 80). Nada foi alterado');
  if (!negAdd.length && !negRem.length && !posAdd.length && !posRem.length) throw new Error('Nada para aplicar: marque "não é do ramo" com a expressão que exclui, acrescente uma palavra ou tire uma. Nada foi alterado');
  var conflito = negAdd.filter(function (n) { return posAdd.some(function (p) { return Lic_ramoNorm_(p) === Lic_ramoNorm_(n); }); });
  if (conflito.length) throw new Error('A mesma expressão não pode incluir e excluir ao mesmo tempo ("' + conflito[0] + '"). Nada foi alterado');
  var r = Lic_comTrava_(function () {
    var antes = Lic_ramoCfg_(), tem = function (lista, x) { return lista.some(function (y) { return Lic_ramoNorm_(y) === Lic_ramoNorm_(x); }); };
    var neg = antes.negativas.filter(function (x) { return !tem(negRem, x); }), pos = antes.positivas.filter(function (x) { return !tem(posRem, x); });
    negAdd.forEach(function (x) { if (!tem(neg, x)) neg.push(x); }); posAdd.forEach(function (x) { if (!tem(pos, x)) pos.push(x); });
    if (neg.length + pos.length > LIC_RAMO_MAX_PALAVRAS) throw new Error('O filtro do ramo passaria de ' + LIC_RAMO_MAX_PALAVRAS + ' palavras. Tire as que não servem mais antes de acrescentar. Nada foi alterado');
    var igual = neg.length === antes.negativas.length && pos.length === antes.positivas.length && neg.every(function (x) { return tem(antes.negativas, x); }) && pos.every(function (x) { return tem(antes.positivas, x); });
    if (igual && antes.versao) return { semMudanca: true, cfg: antes };
    var versao = antes.versao + 1, txt = function (p, n) { return 'Incluem (além da taxonomia): ' + (p.length ? p.join(', ') : 'nenhuma') + '. Excluem (além da taxonomia): ' + (n.length ? n.join(', ') : 'nenhuma') + '.'; };
    Lic_cfgGravar_('RAMO', { positivas: pos, negativas: neg }, versao, motivo, eu);
    var mud = [].concat(negAdd.filter(function (x) { return !tem(antes.negativas, x); }).map(function (x) { return 'exclui "' + x + '"'; }), negRem.filter(function (x) { return tem(antes.negativas, x); }).map(function (x) { return 'deixa de excluir "' + x + '"'; }),
      posAdd.filter(function (x) { return !tem(antes.positivas, x); }).map(function (x) { return 'inclui "' + x + '"'; }), posRem.filter(function (x) { return tem(antes.positivas, x); }).map(function (x) { return 'deixa de incluir "' + x + '"'; }));
    Lic_historico_('CONFIG', 'RAMO', '', 'RAMO_VERSAO', eu, { de: Lic_texto_(txt(antes.positivas, antes.negativas), 500), para: Lic_texto_(txt(pos, neg), 500), texto: 'Versão ' + versao + ': ' + (mud.join('; ') || 'sem mudança de palavra') + '. Motivo: ' + motivo, versao: versao, fonte: d.fonte || 'Tela Revisar o filtro do ramo' });
    var agora = Lic_agora_();
    (d.sugestoes || []).forEach(function (sid) {
      var s = Lic_ramoSugestoes_().filter(function (x) { return Lic_s_(x.ID) === Lic_s_(sid) && Lic_up_(x.SITUACAO) === 'PENDENTE'; })[0];
      if (s) SGO_DATA.update(LIC_ABA_SUGESTOES, s.ID, { SITUACAO: 'APROVADA', DECIDIDO_POR_ID: Lic_s_(eu.id), DECIDIDO_POR_NOME: Lic_s_(eu.nome), DECIDIDO_EM: agora, VERSAO_APLICADA: versao, DECISAO_MOTIVO: motivo });
    });
    try { Lic_publicarCfgColetor_(); } catch (e) { throw new Error('Não foi possível entregar a configuração ao coletor (' + Lic_s_(e && e.message) + '). A versão ' + versao + ' ficou gravada; toque em "Aplicar" de novo para tentar outra vez'); }
    return { versao: versao, mudancas: mud, cfg: Lic_ramoCfg_() };
  });
  if (r.semMudanca) return { semMudanca: true, texto: 'Nada mudou: as palavras já estavam assim. Nenhuma versão nova foi criada.', cfg: r.cfg };
  return Object.assign(r, Lic_ramoReprocessar_(eu, d.marcadas || []));
}
/** Triagem refeita agora pelo servidor nas oportunidades que podem mudar e a sincronia; conta quem saiu e quem voltou. */
function Lic_ramoReprocessar_(eu, marcadas) {
  var todas = Lic_ativas_(), alvos = Lic_ramoAlvos_(todas), antes = {};
  alvos.forEach(function (l) { antes[Lic_s_(l.ID)] = { sit: Lic_s_(l.SITUACAO), tri: Lic_s_(l.TRIAGEM), codigo: Lic_s_(l.CODIGO) }; });
  var out = { reprocessadas: 0, sairam: [], voltaram: [], ficaram: [], aviso: '' };
  if (!Lic_temColetor_() || typeof SGO_LICITACOES.retriar !== 'function') { out.aviso = LIC_MSG_SEM_COLETOR + ': a versão nova vale quando o coletor rodar no servidor.'; return out; }
  try {
    var rr = SGO_LICITACOES.retriar({ chaves: alvos.map(function (l) { return Lic_s_(l.CHAVE_FONTE); }).filter(Boolean) }) || {};
    out.reprocessadas = Number(rr.refeitas) || 0;
    out.sincronia = Lic_sincronizar_(eu, { voltas: 10 });
  } catch (e) { out.aviso = 'A versão nova foi gravada, mas a triagem não pôde ser refeita agora (' + Lic_s_(e && e.message) + '). Ela é refeita na próxima rodada do coletor (até 2 horas).'; return out; }
  Lic_ativas_().forEach(function (l) {
    var a = antes[Lic_s_(l.ID)]; if (!a) return;
    var item = { id: Lic_s_(l.ID), codigo: Lic_s_(l.CODIGO), orgao: Lic_s_(l.ORGAO_NOME), uf: Lic_s_(l.UF), motivo: Lic_s_(l.TRIAGEM_MOTIVO) };
    if (a.sit === 'RADAR' && Lic_s_(l.SITUACAO) === 'DESCARTADA') out.sairam.push(item);
    else if (a.sit === 'DESCARTADA' && Lic_s_(l.SITUACAO) === 'RADAR') out.voltaram.push(item);
  });
  (marcadas || []).forEach(function (id) {
    var l = todas.filter(function (x) { return Lic_s_(x.ID) === Lic_s_(id); })[0], agora = Lic_ativas_().filter(function (x) { return Lic_s_(x.ID) === Lic_s_(id); })[0];
    if (!l || !agora || Lic_s_(agora.SITUACAO) !== 'RADAR') return;
    var porque = Lic_s_(agora.DESCARTE_ORIGEM) === 'REABERTA' ? 'foi reaberta pela Diretoria (a regra não descarta de novo)' : Lic_s_(agora.TRIAGEM) === 'DESCARTADA' ? 'tem pedido de parecer aberto (a Diretoria decide)' : 'a expressão escolhida não aparece no texto que a triagem lê (objeto, informação complementar e itens): escolha outra ou descarte com o motivo "Fora do ramo"';
    out.ficaram.push({ id: Lic_s_(agora.ID), codigo: Lic_s_(agora.CODIGO), porque: porque });
  });
  out.texto = out.reprocessadas + ' oportunidade(s) com a triagem refeita agora: ' + out.sairam.length + ' saíram do Radar (foram para Descartadas pela regra, com o motivo, e podem voltar)' + (out.voltaram.length ? ', ' + out.voltaram.length + ' voltaram' : '') + '. As demais em aberto são refeitas na próxima rodada do coletor.';
  return out;
}

// ------------------------------------------------------------ tela
/** Simulação da tela (nada é gravado): quais candidatas atuais sairiam com as palavras novas. Servidor quando há; senão, pelo objeto. */
function Lic_ramoSimular_(eu, d) {
  var neg = Lic_ramoLista_(d.negativas || []), pos = Lic_ramoLista_(d.positivas || []);
  var cand = Lic_ativas_().filter(function (l) { return Lic_s_(l.SITUACAO) === 'RADAR' && (Lic_s_(l.TRIAGEM) === 'CANDIDATA' || Lic_s_(l.TRIAGEM) === 'TRAVADA'); });
  var porChave = {}; cand.forEach(function (l) { porChave[Lic_s_(l.CHAVE_FONTE)] = l; });
  var sairiam = [], fonte = 'objeto';
  if (Lic_temColetor_() && typeof SGO_LICITACOES.simular === 'function') {
    var r = SGO_LICITACOES.simular({ chaves: Object.keys(porChave), negativas: neg, positivas: pos }) || {};
    fonte = 'servidor';
    (r.itens || []).forEach(function (x) { var l = porChave[Lic_s_(x.chave)]; if (l && x.resultado === 'DESCARTADA') sairiam.push({ id: Lic_s_(l.ID), codigo: Lic_s_(l.CODIGO), motivo: Lic_s_(x.motivo) }); });
  } else {
    cand.forEach(function (l) { var n = neg.filter(function (e) { return Lic_ramoCasa_(l.OBJETO, e); })[0]; if (n) sairiam.push({ id: Lic_s_(l.ID), codigo: Lic_s_(l.CODIGO), motivo: 'O objeto tem "' + n + '".' }); });
  }
  return { sairiam: sairiam, total: cand.length, fonte: fonte, texto: sairiam.length + ' de ' + cand.length + ' candidata(s) e travada(s) sairiam do Radar' + (fonte === 'objeto' ? ' (conta feita só pelo objeto: o servidor confere também a informação complementar e os itens)' : '') + '.' };
}
/** Quantas candidatas sem a razão guardada pelo servidor: pede a triagem refeita delas (a mesma conta) e sincroniza. */
function Lic_ramoReconstruir_(eu, todas) {
  var sem = (todas || []).filter(function (l) { return Lic_s_(l.SITUACAO) === 'RADAR' && (Lic_s_(l.TRIAGEM) === 'CANDIDATA' || Lic_s_(l.TRIAGEM) === 'TRAVADA') && !Lic_json_(l.TRIAGEM_ENTRADA_JSON, null); });
  if (!sem.length || !Lic_temColetor_() || typeof SGO_LICITACOES.retriar !== 'function') return { pedidas: 0 };
  var r = SGO_LICITACOES.retriar({ chaves: sem.map(function (l) { return Lic_s_(l.CHAVE_FONTE); }) }) || {};
  Lic_sincronizar_(eu, { voltas: 5 });
  return { pedidas: sem.length, refeitas: Number(r.refeitas) || 0 };
}
function Lic_ramoTela_(eu, d) {
  var todas = Lic_ativas_(), rec = { pedidas: 0 };
  try { rec = Lic_ramoReconstruir_(eu, todas); if (rec.pedidas) todas = Lic_ativas_(); } catch (e) { rec = { erro: 'A razão da triagem das candidatas antigas não pôde ser refeita agora (' + Lic_s_(e && e.message) + '); a tela mostra a razão lida do motivo.' }; }
  var ctx = Lic_ramoCtx_(todas), cfg = Lic_ramoCfg_(), grupos = {};
  var cand = todas.filter(function (l) { return Lic_s_(l.SITUACAO) === 'RADAR' && Lic_s_(l.TRIAGEM) === 'CANDIDATA'; }).map(function (l) {
    var razao = Lic_ramoRazao_(l), k = razao ? razao.rotulo : '(sem a razão)', e = Lic_radarFiltroEstado_(l, ctx), tipo = Lic_tipoDe_(l);
    grupos[k] = (grupos[k] || 0) + 1;
    return { id: Lic_s_(l.ID), codigo: Lic_s_(l.CODIGO), orgao: Lic_s_(l.ORGAO_NOME), uf: Lic_s_(l.UF), municipio: Lic_s_(l.MUNICIPIO), objeto: Lic_texto_(l.OBJETO, 1200), encerramentoIso: Lic_s_(l.ENCERRAMENTO_ISO),
      razao: razao, expressoes: Lic_ramoExpressoes_(l.OBJETO, cfg.positivas), tipo: tipo, nota: Lic_s_(l.NOTA) === '' ? null : Number(l.NOTA), radar: e ? e.estado : '', radarTexto: e ? (e.motivo || e.texto || '') : '', linkPncp: Lic_url_(l.LINK_PNCP) };
  }).sort(function (a, b) { var ka = a.razao ? a.razao.rotulo : '~', kb = b.razao ? b.razao.rotulo : '~'; return ka < kb ? -1 : ka > kb ? 1 : (a.codigo < b.codigo ? -1 : 1); });
  var hist = Lic_ler_(LIC_ABAS.HISTORICO).filter(function (h) { return Lic_s_(h.ENTIDADE) === 'CONFIG' && (Lic_s_(h.ENTIDADE_ID) === 'RAMO' || Lic_s_(h.ENTIDADE_ID) === 'FILTRO_IA'); })
    .sort(function (a, b) { return Lic_s_(b.DATA) < Lic_s_(a.DATA) ? -1 : 1; }).slice(0, 60)
    .map(function (h) { return { tipo: Lic_s_(h.TIPO), de: Lic_s_(h.DE), para: Lic_s_(h.PARA), texto: Lic_s_(h.TEXTO), versao: Lic_s_(h.VERSAO), quem: Lic_s_(h.USUARIO_NOME), quando: Lic_s_(h.DATA) }; });
  var sug = Lic_ramoSugestoes_().map(function (s) {
    return { id: Lic_s_(s.ID), codigo: Lic_s_(s.CODIGO), oportunidadeId: Lic_s_(s.OPORTUNIDADE_ID), expressao: Lic_s_(s.EXPRESSAO), expressoes: Lic_json_(s.EXPRESSOES_JSON, []), entrada: Lic_s_(s.ENTRADA_ROTULO), termo: Lic_s_(s.ENTRADA_TERMO),
      objeto: Lic_s_(s.OBJETO), orgaoUf: Lic_s_(s.ORGAO_UF), motivo: Lic_s_(s.MOTIVO), situacao: Lic_up_(s.SITUACAO), por: Lic_s_(s.CRIADO_POR_NOME), em: Lic_s_(s.CRIADO_EM), decididoPor: Lic_s_(s.DECIDIDO_POR_NOME), decididoEm: Lic_s_(s.DECIDIDO_EM), versao: Lic_s_(s.VERSAO_APLICADA) };
  }).sort(function (a, b) { return (a.situacao === 'PENDENTE') !== (b.situacao === 'PENDENTE') ? (a.situacao === 'PENDENTE' ? -1 : 1) : (b.em < a.em ? -1 : 1); }).slice(0, 80);
  var cont = { analisar: 0, aguardando: 0, descartadas_ia: 0 };
  todas.forEach(function (l) { var e = Lic_radarFiltroEstado_(l, ctx); if (e) cont[Lic_radarAba_(l, ctx)]++; });
  return { cfg: cfg, filtroIA: Object.assign(ctx.cfg, { ativo: ctx.ativo, iaDisponivel: ctx.iaDisponivel }), padroes: LIC_TERMOS_PADRAO, candidatas: cand, grupos: Object.keys(grupos).map(function (k) { return { rotulo: k, n: grupos[k] }; }).sort(function (a, b) { return b.n - a.n || (a.rotulo < b.rotulo ? -1 : 1); }),
    historico: hist, sugestoes: sug, pendentes: sug.filter(function (s) { return s.situacao === 'PENDENTE'; }).length, radar: cont, reconstrucao: rec, coletorNoServidor: Lic_temColetor_(), tipos: LIC_TIPOS_SERVICO, motivosDescarte: LIC_MOTIVOS_DESCARTE };
}
/** Ações da tela (Licitacoes_api 'ramo'): { op: tela | simular | aplicar | sugestao | filtroIA }. */
function Lic_ramoAcao_(eu, d) {
  var op = Lic_s_(d.op) || 'tela';
  if (op === 'tela') return Lic_ramoTela_(eu, d);
  if (op === 'simular') return Lic_ramoSimular_(eu, d);
  if (op === 'aplicar') return Lic_ramoAplicar_(eu, d);
  if (op === 'sugestao') return Lic_ramoSugestaoDecidir_(eu, d);
  if (op === 'filtroIA') return Lic_filtroIASalvar_(eu, d);
  throw new Error('Ação do filtro do ramo desconhecida (' + op + '). Atualize a página (F5) e tente de novo');
}
