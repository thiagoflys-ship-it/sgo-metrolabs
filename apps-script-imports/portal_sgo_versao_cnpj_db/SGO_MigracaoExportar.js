/****************************************************
 * EXPORTAÇÃO PARA O SGO+ SERVIDOR (migração, 2026-10)
 *
 * Gera no Drive a pasta "SGO_MIGRACAO_PACOTE" com tudo que o servidor novo
 * precisa para receber o SGO+ sem perder nada:
 *   - propriedades.json  configurações (senhas e chaves MASCARADAS — são
 *                        recriadas à mão no servidor)
 *   - banco_<chave>.json cada planilha usada como banco, aba por aba, com os
 *                        tipos preservados (data vira {"$d": ISO})
 *   - arquivos.json      mapa do Drive: pastas do sistema e todo arquivo citado
 *                        nas planilhas, com ID, nome, tipo, tamanho e caminho
 *
 * COMO USAR: no editor do Apps Script, escolha MIGRACAO_exportarPacote e clique
 * em Executar. Repita até o registro de execução mostrar "CONCLUÍDO" (cada
 * execução trabalha até ~5 min e continua de onde parou).
 * Só funciona rodando pelo editor, como dono do projeto: chamado pela internet
 * (google.script.run / web app) é recusado.
 ****************************************************/

var MIGRACAO_PASTA_NOME = 'SGO_MIGRACAO_PACOTE';
var MIGRACAO_ESTADO_PROP = 'MIGRACAO_EXPORT_ESTADO';
var MIGRACAO_SEGREDO = /SESSION|SENHA|PASSWORD|SECRET|SEGREDO|API_KEY|API_TOKEN|TOKEN|CHAVE_PRIVADA/i;
var MIGRACAO_LIMITE_MS = 5 * 60 * 1000;

/** Recusa qualquer chamada que não venha do dono do projeto rodando no editor. */
function MIGRACAO_exigirEditor_() {
  var ativo = '', efetivo = '';
  try { ativo = String(Session.getActiveUser().getEmail() || ''); } catch (e) { ativo = ''; }
  try { efetivo = String(Session.getEffectiveUser().getEmail() || ''); } catch (e) { efetivo = ''; }
  if (!ativo || !efetivo || ativo.toLowerCase() !== efetivo.toLowerCase()) {
    throw new Error('A exportação só pode ser executada pelo dono do projeto, no editor do Apps Script.');
  }
}

function MIGRACAO_pasta_() {
  var it = DriveApp.getRootFolder().getFoldersByName(MIGRACAO_PASTA_NOME);
  return it.hasNext() ? it.next() : DriveApp.getRootFolder().createFolder(MIGRACAO_PASTA_NOME);
}

function MIGRACAO_gravarJson_(pasta, nome, obj) {
  var conteudo = JSON.stringify(obj);
  var existentes = pasta.getFilesByName(nome);
  while (existentes.hasNext()) existentes.next().setTrashed(true);
  pasta.createFile(Utilities.newBlob(conteudo, 'application/json', nome));
}

function MIGRACAO_lerJson_(pasta, nome) {
  var it = pasta.getFilesByName(nome);
  return it.hasNext() ? JSON.parse(it.next().getBlob().getDataAsString('UTF-8')) : null;
}

function MIGRACAO_celula_(v) {
  if (v instanceof Date) return isNaN(v.getTime()) ? '' : { $d: v.toISOString() };
  return v;
}

/** Ponto de entrada: rodar no editor, repetir até CONCLUÍDO. */
function MIGRACAO_exportarPacote() {
  MIGRACAO_exigirEditor_();
  var inicio = Date.now();
  var props = PropertiesService.getScriptProperties();
  var pasta = MIGRACAO_pasta_();
  var estado = JSON.parse(props.getProperty(MIGRACAO_ESTADO_PROP) || '{"fase":"propriedades"}');
  var tempo = function () { return Date.now() - inicio < MIGRACAO_LIMITE_MS; };

  if (estado.fase === 'propriedades') {
    var todas = props.getProperties(), saida = {}, segredos = [];
    Object.keys(todas).sort().forEach(function (k) {
      if (/^SGO_SESSION_/.test(k) || k === MIGRACAO_ESTADO_PROP) return;
      if (MIGRACAO_SEGREDO.test(k)) { segredos.push(k); saida[k] = '(segredo: configurar no servidor)'; }
      else saida[k] = todas[k];
    });
    MIGRACAO_gravarJson_(pasta, 'propriedades.json', { exportado_em: new Date().toISOString(), fuso: Session.getScriptTimeZone(), propriedades: saida, segredos: segredos });
    var bancos = Object.keys(saida).filter(function (k) { return k === 'DB_ID' || /_DB_ID$/.test(k); })
      .map(function (k) { return { chave: k, id: saida[k] }; }).filter(function (b) { return b.id; });
    estado = { fase: 'bancos', bancos: bancos, i: 0, idsDrive: [] };
    props.setProperty(MIGRACAO_ESTADO_PROP, JSON.stringify(estado));
  }

  if (estado.fase === 'bancos') {
    var achados = {};
    (estado.idsDrive || []).forEach(function (id) { achados[id] = 1; });
    while (estado.i < estado.bancos.length && tempo()) {
      var b = estado.bancos[estado.i], registro = { chave: b.chave, id: b.id, abas: [] };
      try {
        var ss = SpreadsheetApp.openById(b.id);
        registro.nome = ss.getName();
        registro.fuso = ss.getSpreadsheetTimeZone();
        ss.getSheets().forEach(function (sh) {
          var nl = sh.getLastRow(), nc = sh.getLastColumn();
          var valores = nl && nc ? sh.getRange(1, 1, nl, nc).getValues() : [];
          valores.forEach(function (linha) {
            linha.forEach(function (v) {
              if (typeof v !== 'string' || v.indexOf('google.com') < 0) return;
              var re = /(?:\/d\/|[?&]id=|\/folders\/)([A-Za-z0-9_-]{25,})/g, m;
              while ((m = re.exec(v))) achados[m[1]] = 1;
            });
          });
          registro.abas.push({ nome: sh.getName(), sheetId: sh.getSheetId(), linhas: valores.map(function (l) { return l.map(MIGRACAO_celula_); }) });
        });
      } catch (e) {
        registro.erro = String(e && e.message || e);
      }
      MIGRACAO_gravarJson_(pasta, 'banco_' + b.chave + '.json', registro);
      estado.i++;
    }
    estado.idsDrive = Object.keys(achados);
    if (estado.i >= estado.bancos.length) {
      var pastas = Object.keys(PropertiesService.getScriptProperties().getProperties())
        .filter(function (k) { return /FOLDER|PASTA/i.test(k); })
        .map(function (k) { return props.getProperty(k); }).filter(Boolean);
      estado = { fase: 'pastas', fila: pastas, vistas: {}, idsDrive: estado.idsDrive, bancos: estado.bancos };
      MIGRACAO_gravarJson_(pasta, 'arquivos.json', { pastas: [], arquivos: [], semAcesso: [] });
    }
    props.setProperty(MIGRACAO_ESTADO_PROP, JSON.stringify({ fase: estado.fase, bancos: estado.bancos, i: estado.i, idsDrive: estado.idsDrive, fila: estado.fila, vistas: estado.vistas }));
  }

  if (estado.fase === 'pastas' || estado.fase === 'referencias') {
    var mapa = MIGRACAO_lerJson_(pasta, 'arquivos.json') || { pastas: [], arquivos: [], semAcesso: [] };
    var conhecidos = {};
    mapa.arquivos.forEach(function (a) { conhecidos[a.id] = 1; });
    mapa.pastas.forEach(function (p) { conhecidos[p.id] = 1; });
    var caminhoDe = MIGRACAO_caminho_();

    while (estado.fase === 'pastas' && estado.fila.length && tempo()) {
      var idPasta = estado.fila.shift();
      if (conhecidos[idPasta]) continue;
      try {
        var f = DriveApp.getFolderById(idPasta);
        mapa.pastas.push({ id: idPasta, nome: f.getName(), caminho: caminhoDe(f) });
        conhecidos[idPasta] = 1;
        var sub = f.getFolders();
        while (sub.hasNext()) estado.fila.push(sub.next().getId());
        var arqs = f.getFiles();
        while (arqs.hasNext()) {
          var a = arqs.next();
          if (conhecidos[a.getId()]) continue;
          mapa.arquivos.push(MIGRACAO_meta_(a, caminhoDe));
          conhecidos[a.getId()] = 1;
        }
      } catch (e) {
        mapa.semAcesso.push({ id: idPasta, tipo: 'pasta', erro: String(e && e.message || e) });
      }
    }
    if (estado.fase === 'pastas' && !estado.fila.length) estado.fase = 'referencias';

    if (estado.fase === 'referencias') {
      var pendentes = (estado.idsDrive || []).filter(function (id) { return !conhecidos[id]; });
      while (pendentes.length && tempo()) {
        var id = pendentes.shift();
        try { mapa.arquivos.push(MIGRACAO_meta_(DriveApp.getFileById(id), caminhoDe)); }
        catch (e1) {
          try { var pf = DriveApp.getFolderById(id); mapa.pastas.push({ id: id, nome: pf.getName(), caminho: caminhoDe(pf) }); }
          catch (e2) { mapa.semAcesso.push({ id: id, tipo: 'citado nas planilhas', erro: String(e1 && e1.message || e1) }); }
        }
        conhecidos[id] = 1;
      }
      estado.idsDrive = pendentes;
      if (!pendentes.length) estado.fase = 'concluido';
    }
    MIGRACAO_gravarJson_(pasta, 'arquivos.json', mapa);
    props.setProperty(MIGRACAO_ESTADO_PROP, JSON.stringify({ fase: estado.fase, bancos: estado.bancos, fila: estado.fila || [], idsDrive: estado.idsDrive || [] }));
    if (estado.fase === 'concluido') {
      MIGRACAO_gravarJson_(pasta, 'resumo.json', {
        concluido_em: new Date().toISOString(), bancos: estado.bancos.length,
        pastas: mapa.pastas.length, arquivos: mapa.arquivos.length, semAcesso: mapa.semAcesso.length
      });
      props.deleteProperty(MIGRACAO_ESTADO_PROP);
      Logger.log('CONCLUÍDO: %s bancos, %s pastas, %s arquivos, %s sem acesso. Pasta: %s',
        estado.bancos.length, mapa.pastas.length, mapa.arquivos.length, mapa.semAcesso.length, pasta.getUrl());
      return 'CONCLUÍDO';
    }
  }
  var msg = 'Em andamento (fase: ' + estado.fase + '). Execute de novo para continuar.';
  Logger.log(msg);
  return msg;
}

/** Recomeça do zero (apaga o estado salvo; o pacote é regravado). */
function MIGRACAO_recomecarExportacao() {
  MIGRACAO_exigirEditor_();
  PropertiesService.getScriptProperties().deleteProperty(MIGRACAO_ESTADO_PROP);
  Logger.log('Estado apagado. Execute MIGRACAO_exportarPacote para exportar de novo.');
}

function MIGRACAO_meta_(a, caminhoDe) {
  var pais = a.getParents(), pai = pais.hasNext() ? pais.next() : null;
  return {
    id: a.getId(), nome: a.getName(), tipo: a.getMimeType(), tamanho: a.getSize(),
    criado: a.getDateCreated().toISOString(), atualizado: a.getLastUpdated().toISOString(),
    pasta_id: pai ? pai.getId() : '', caminho: pai ? caminhoDe(pai) : '',
    dono: (function () { try { return a.getOwner() ? a.getOwner().getEmail() : ''; } catch (e) { return ''; } })(),
    compartilhamento: (function () { try { return String(a.getSharingAccess()); } catch (e) { return ''; } })()
  };
}

/** Caminho "Meu Drive/A/B" de uma pasta (com cache), para achar o arquivo no Drive do computador. */
function MIGRACAO_caminho_() {
  var cache = {}, raiz = DriveApp.getRootFolder().getId();
  return function caminho(f) {
    var id = f.getId();
    if (cache[id] !== undefined) return cache[id];
    if (id === raiz) return (cache[id] = 'Meu Drive');
    var pais = f.getParents();
    cache[id] = pais.hasNext() ? caminho(pais.next()) + '/' + f.getName() : '(fora do Meu Drive)/' + f.getName();
    return cache[id];
  };
}
