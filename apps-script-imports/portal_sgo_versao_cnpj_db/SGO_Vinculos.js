/** Gestão de vínculos. Leituras não alteram o banco; confirmação usa um batch atômico. */
const SGO_VINCULOS = (() => {
  const TABLES = {CLIENTE:'CAD_CLIENTES', UNIDADE:'CAD_UNIDADES', EQUIPAMENTO:'CAD_EQUIPAMENTOS'};
  const AUDIT = 'SYS_VINCULOS_AUDITORIA';
  const AUDIT_HEADERS = ['ID','OPERACAO_ID','USUARIO','MOTIVO','ACAO','ENTIDADE_ID','TABELA','REGISTRO_ID','CAMPO','ANTES','DEPOIS','CRIADO_EM'];
  const text = v => String(v == null ? '' : v).trim();
  const active = r => r && text(r.STATUS).toUpperCase() === 'ATIVO';
  const digits = v => SGO_UTILS.cnpjArmazenado(v);
  function staff(sessionId, manager) {
    const s = exigirSessao(sessionId);
    if (text(s.perfil).toUpperCase() === 'CLIENTE' || (manager && !isAdminSession(sessionId))) throw new Error('Acesso negado. Esta ação exige ' + (manager ? 'gestor.' : 'acesso interno.'));
    return s;
  }
  function read() {
    const db = SGO_DATA.getDB(), tables = {}, schema = {};
    db.getSheets().forEach(sheet => {
      const name = sheet.getName(), width = sheet.getLastColumn(), height = sheet.getLastRow();
      if (!width || /^(BK_|SYS_LOGS)/.test(name) || name === AUDIT) return;
      const headers = sheet.getRange(1,1,1,width).getValues()[0].map(text);
      const core = Object.values(TABLES).includes(name) || name === 'AUVO_SYNC';
      const fields = headers.filter(h => /^(ID|CLIENTE_ID|UNIDADE_ID|EQUIPAMENTO_ID|CLIENTE_ID_SGO|EQUIPAMENTOS_ID_SGO|STATUS|FINALIZADA|STATUS_PENDENCIA)$/.test(h));
      if (!core && !fields.some(h => h !== 'ID' && h !== 'STATUS')) return;
      schema[name] = {sheetId:sheet.getSheetId(),headers:headers};
      tables[name] = [];
      if (height < 2) return;
      if (core) {
        sheet.getRange(2,1,height-1,width).getValues().forEach((v,i) => {
          const r = {_row:i+2}; headers.forEach((h,j) => { if (h) r[h] = v[j] instanceof Date ? v[j].toISOString() : v[j]; });
          if (text(r.ID)) tables[name].push(r);
        });
      } else {
        const rows = Array.from({length:height-1},(_,i) => ({_row:i+2}));
        fields.forEach(h => sheet.getRange(2,headers.indexOf(h)+1,height-1,1).getValues().forEach((v,i) => {rows[i][h]=v[0];}));
        tables[name] = rows.filter(r => fields.some(h => h !== 'ID' && text(r[h])));
      }
    });
    return {tables:tables,schema:schema};
  }
  function base(snapshot, name) { return snapshot.tables[name] || []; }
  function get(snapshot,name,id) { return base(snapshot,name).find(r => text(r.ID) === text(id)); }
  function label(r,type) {
    if (!r) return 'Não encontrado';
    return [r.NOME_UNIDADE || r.RAZAO_SOCIAL || r.TIPO || r.NOME_FANTASIA, r.CNPJ_UNIDADE || r.CNPJ || r.TAG, r.ENDERECO || r.SERIE].filter(Boolean).join(' — ');
  }
  function diagnostic(snapshot,type,r) {
    if (!active(r)) return {code:'INATIVO',message:'Cadastro inativo; disponível no histórico.'};
    if (type === 'CLIENTE' && !base(snapshot,'CAD_UNIDADES').some(u => text(u.CLIENTE_ID) === text(r.ID) && active(u))) return {code:'SEM_UNIDADE',message:'Cliente sem unidade ativa. Crie ou vincule uma unidade para novos atendimentos.'};
    if (type === 'UNIDADE' && !active(get(snapshot,'CAD_CLIENTES',r.CLIENTE_ID))) return {code:'VINCULO_PENDENTE',message:'Unidade sem cliente ativo. Gestor deve vincular antes de novos atendimentos.'};
    if (type === 'EQUIPAMENTO') {
      const u=get(snapshot,'CAD_UNIDADES',r.UNIDADE_ID),c=get(snapshot,'CAD_CLIENTES',r.CLIENTE_ID);
      if (!active(u)||!active(c)||text(u.CLIENTE_ID)!==text(r.CLIENTE_ID)) return {code:'INCONSISTENTE',message:'Cliente e unidade do equipamento não correspondem ou estão inativos. Corrija o vínculo.'};
    }
    const field=type==='CLIENTE'?'CNPJ':type==='UNIDADE'?'CNPJ_UNIDADE':'TAG';
    const v=text(r[field]);
    if (v && base(snapshot,TABLES[type]).some(o => active(o) && text(o.ID)!==text(r.ID) && (type==='EQUIPAMENTO' ? text(o.CLIENTE_ID)===text(r.CLIENTE_ID) && text(o.TAG).toUpperCase()===v.toUpperCase() && !/^(N\/P|N\/A|S\/N|SEM TAG|-)$/.test(v.toUpperCase()) : digits(o[field])===digits(v)))) return {code:'DUPLICIDADE',message:'Identificação repetida. Confira endereço, cliente e histórico antes de consolidar.'};
    return {code:'REGULAR',message:'Cadastro e vínculo regulares.'};
  }
  function overview(sessionId) {
    staff(sessionId,false); const snapshot=read();
    const result={success:true,gestor:isAdminSession(sessionId)};
    Object.keys(TABLES).forEach(type => {result[type]=base(snapshot,TABLES[type]).map(r=>({ID:text(r.ID),CLIENTE_ID:text(r.CLIENTE_ID),UNIDADE_ID:text(r.UNIDADE_ID),STATUS:text(r.STATUS),label:label(r,type),diagnostic:diagnostic(snapshot,type,r)}));});
    return result;
  }
  function details(sessionId,type,id) {
    staff(sessionId,false);if(!TABLES[type])throw new Error('Tipo inválido.');
    const snapshot=read(),row=get(snapshot,TABLES[type],id);if(!row)throw new Error('Cadastro não encontrado.');
    const ids=new Set([text(id)]);
    if(type==='CLIENTE')base(snapshot,'CAD_UNIDADES').filter(u=>text(u.CLIENTE_ID)===text(id)).forEach(u=>ids.add(text(u.ID)));
    if(type!=='EQUIPAMENTO')base(snapshot,'CAD_EQUIPAMENTOS').filter(e=>ids.has(text(e.UNIDADE_ID))||text(e.CLIENTE_ID)===text(id)).forEach(e=>ids.add(text(e.ID)));
    const references=[];
    Object.keys(snapshot.tables).filter(n=>!Object.values(TABLES).includes(n)).forEach(n=>{
      const count=base(snapshot,n).filter(r=>Object.keys(r).some(k=>/^(CLIENTE_ID|UNIDADE_ID|EQUIPAMENTO_ID|CLIENTE_ID_SGO|EQUIPAMENTOS_ID_SGO|ENTIDADE_ID)$/.test(k)&&text(r[k]).split(',').some(v=>ids.has(v.trim())))).length;
      if(count)references.push({table:n,count:count});
    });
    const audit=SGO_DATA.getDB().getSheetByName(AUDIT);let history=[];
    if(isAdminSession(sessionId)&&audit&&audit.getLastRow()>1)history=audit.getRange(2,1,audit.getLastRow()-1,AUDIT_HEADERS.length).getValues().filter(r=>ids.has(text(r[5]))||ids.has(text(r[7]))).slice(-100).reverse().map(r=>({date:text(r[11]),user:text(r[2]),reason:text(r[3]),action:text(r[4]),table:text(r[6]),field:text(r[8]),before:text(r[9]),after:text(r[10])}));
    return {success:true,references:references,history:history};
  }
  function search(sessionId,term) {
    staff(sessionId,false);
    const q=text(term).toUpperCase(), d=q.replace(/\D/g,'');
    if(q.length<3) return {success:true,clientes:[],unidades:[]};
    const clients=SGO_DATA.getAll('CAD_CLIENTES'),units=SGO_DATA.getAll('CAD_UNIDADES');
    const match=r => [r.RAZAO_SOCIAL,r.NOME_FANTASIA,r.NOME_UNIDADE,r.ENDERECO].some(v=>text(v).toUpperCase().includes(q)) || (d.length>=3 && digits(r.CNPJ || r.CNPJ_UNIDADE).includes(d));
    const cs=clients.filter(match),us=units.filter(match);
    const ids=new Set(cs.map(r=>text(r.ID)));
    return {success:true,clientes:cs.slice(0,30).map(c=>({ID:text(c.ID),label:label(c),STATUS:c.STATUS,unidades:units.filter(u=>text(u.CLIENTE_ID)===text(c.ID)).map(u=>({ID:text(u.ID),label:label(u),STATUS:u.STATUS}))})),unidades:units.filter(u=>us.includes(u)||ids.has(text(u.CLIENTE_ID))).slice(0,60).map(u=>({ID:text(u.ID),label:label(u),STATUS:u.STATUS,CLIENTE_ID:text(u.CLIENTE_ID),cliente:label(clients.find(c=>text(c.ID)===text(u.CLIENTE_ID)))}))};
  }
  function build(snapshot,input) {
    const spec={tipo:text(input.tipo),acao:text(input.acao),origem:text(input.origem),destino:text(input.destino),motivo:text(input.motivo)};
    if(!TABLES[spec.tipo] || !['TRANSFERIR','DESVINCULAR','CONSOLIDAR','INATIVAR','REATIVAR','EXCLUIR'].includes(spec.acao)) throw new Error('Operação inválida.');
    if(spec.motivo.length<8 || spec.motivo.length>1000) throw new Error('Informe o motivo (8 a 1000 caracteres).');
    const table=TABLES[spec.tipo],source=get(snapshot,table,spec.origem);
    if(!source) throw new Error('Cadastro de origem não encontrado.');
    if(['TRANSFERIR','CONSOLIDAR'].includes(spec.acao) && (!spec.destino || spec.destino===spec.origem)) throw new Error('Escolha um destino diferente.');
    if(spec.acao==='TRANSFERIR' && spec.tipo==='CLIENTE') throw new Error('Para reunir clientes use Consolidar.');
    if(spec.acao==='DESVINCULAR' && spec.tipo==='CLIENTE') throw new Error('Cliente não possui vínculo superior.');
    const changes=[],blocks=[],warnings=[],historical={};
    function change(name,row,field,value) {
      if(!snapshot.schema[name] || !snapshot.schema[name].headers.includes(field)) throw new Error('Coluna não encontrada: '+name+'.'+field);
      const before=row[field] == null ? '' : row[field];
      if(text(before)===text(value)) return;
      const old=changes.find(c=>c.table===name&&c.id===text(row.ID)&&c.field===field);
      if(old){old.after=value;return;}
      changes.push({table:name,id:text(row.ID),row:row._row,field:field,before:before,after:value});
    }
    function moveUnit(u,clientId) {
      change('CAD_UNIDADES',u,'CLIENTE_ID',clientId);
      base(snapshot,'CAD_EQUIPAMENTOS').filter(e=>text(e.UNIDADE_ID)===text(u.ID)).forEach(e=>change('CAD_EQUIPAMENTOS',e,'CLIENTE_ID',clientId));
      const maps=base(snapshot,'AUVO_SYNC');
      maps.filter(m=>text(m.ENTIDADE_TIPO)==='UNIDADE'&&text(m.ENTIDADE_ID)===text(u.ID)).forEach(m=>{
        const customer=text(m.AUVO_ID);
        const cm=maps.filter(x=>text(x.ENTIDADE_TIPO)==='CLIENTE'&&text(x.AUVO_ID)===customer);
        if(cm.length!==1) blocks.push('Mapeamento Auvo de cliente ausente/ambíguo para '+customer+'.');
        cm.forEach(x=>change('AUVO_SYNC',x,'ENTIDADE_ID',clientId));
        // O mapeamento da unidade permanece, inclusive no estado pendente.
      });
    }
    let target=null;
    if(spec.acao==='TRANSFERIR') {
      const destTable=spec.tipo==='UNIDADE'?'CAD_CLIENTES':'CAD_UNIDADES';target=get(snapshot,destTable,spec.destino);
      if(!active(target)) throw new Error('Destino precisa estar ativo.');
      if(spec.tipo==='UNIDADE') moveUnit(source,target.ID);
      else {const client=get(snapshot,'CAD_CLIENTES',target.CLIENTE_ID);if(!active(client))throw new Error('Unidade destino sem cliente ativo.');change(table,source,'UNIDADE_ID',target.ID);change(table,source,'CLIENTE_ID',target.CLIENTE_ID);}
    }
    if(spec.acao==='DESVINCULAR') {
      if(spec.tipo==='UNIDADE') moveUnit(source,'');
      else {change(table,source,'UNIDADE_ID','');change(table,source,'CLIENTE_ID','');}
      warnings.push('O cadastro ficará com vínculo pendente. Novos atendimentos e emissões serão bloqueados até a vinculação.');
    }
    if(spec.acao==='CONSOLIDAR') {
      target=get(snapshot,table,spec.destino);if(!active(target))throw new Error('Cadastro preservado precisa estar ativo.');
      if(spec.tipo==='CLIENTE') {
        if(!digits(source.CNPJ)||digits(source.CNPJ)!==digits(target.CNPJ))throw new Error('Consolidação de clientes exige o mesmo CNPJ. Filiais diferentes devem ser transferidas, não consolidadas.');
        base(snapshot,'CAD_UNIDADES').filter(u=>text(u.CLIENTE_ID)===spec.origem).forEach(u=>moveUnit(u,target.ID));
        base(snapshot,'CAD_EQUIPAMENTOS').filter(e=>text(e.CLIENTE_ID)===spec.origem).forEach(e=>change('CAD_EQUIPAMENTOS',e,'CLIENTE_ID',target.ID));
      } else if(spec.tipo==='UNIDADE') {
        if(!digits(source.CNPJ_UNIDADE)||digits(source.CNPJ_UNIDADE)!==digits(target.CNPJ_UNIDADE))throw new Error('Consolidação de unidades exige o mesmo CNPJ e conferência manual do local.');
        if(!active(get(snapshot,'CAD_CLIENTES',target.CLIENTE_ID)))throw new Error('Destino sem cliente ativo.');
        moveUnit(source,target.CLIENTE_ID);
        base(snapshot,'CAD_EQUIPAMENTOS').filter(e=>text(e.UNIDADE_ID)===spec.origem).forEach(e=>{change('CAD_EQUIPAMENTOS',e,'UNIDADE_ID',target.ID);change('CAD_EQUIPAMENTOS',e,'CLIENTE_ID',target.CLIENTE_ID);});
      } else {
        if(text(source.CLIENTE_ID)!==text(target.CLIENTE_ID)||text(source.TAG).toUpperCase()!==text(target.TAG).toUpperCase()||!text(source.TAG)||/^(N\/P|N\/A|S\/N|SEM TAG|-)$/.test(text(source.TAG).toUpperCase()))throw new Error('Confira cliente e TAG real: os equipamentos precisam representar o mesmo cadastro.');
        if(text(source.SERIE)&&text(target.SERIE)&&text(source.SERIE)!==text(target.SERIE))throw new Error('Números de série diferentes impedem consolidação.');
      }
      base(snapshot,'AUVO_SYNC').filter(m=>text(m.ENTIDADE_TIPO)===spec.tipo&&text(m.ENTIDADE_ID)===spec.origem).forEach(m=>change('AUVO_SYNC',m,'ENTIDADE_ID',target.ID));
      change(table,source,'STATUS','INATIVO');
      warnings.push('O cadastro de origem será mantido inativo para preservar documentos, histórico e QR antigos. Os vínculos operacionais serão reunidos no destino.');
    }
    if(spec.acao==='INATIVAR'||spec.acao==='REATIVAR') change(table,source,'STATUS',spec.acao==='INATIVAR'?'INATIVO':'ATIVO');
    // Detecta efeitos em registros persistidos fora do cadastro. Históricos ficam no proprietário original.
    const affected=new Set([spec.origem,...changes.map(c=>c.id)]);
    const knownHistorical=['DOC_DOCUMENTOS','CERT_CALIBRACAO','NR13_LAUDOS','AUVO_TAREFAS'];
    Object.keys(snapshot.tables).filter(n=>!Object.values(TABLES).includes(n)&&n!=='AUVO_SYNC').forEach(name=>{
      const matches=base(snapshot,name).filter(r=>Object.keys(r).some(k=>/^(CLIENTE_ID|UNIDADE_ID|EQUIPAMENTO_ID|CLIENTE_ID_SGO|EQUIPAMENTOS_ID_SGO)$/.test(k)&&text(r[k]).split(',').some(id=>affected.has(id.trim()))));
      if(!matches.length)return;
      if(knownHistorical.includes(name)) {
        historical[name]=matches.length;
        if(name==='NR13_LAUDOS'&&matches.some(r=>text(r.STATUS)==='RASCUNHO'||text(r.STATUS)==='PENDENTE'||text(r.STATUS_PENDENCIA)==='ABERTA'))blocks.push('Há laudos em andamento. Conclua ou cancele antes de mudar o vínculo.');
        if(name==='AUVO_TAREFAS'&&matches.some(r=>text(r.FINALIZADA)!=='SIM'))blocks.push('Há tarefas Auvo relacionadas. Confira/conclua as tarefas antes da mudança.');
      } else blocks.push('Há referências em '+name+' ('+matches.length+'). Resolva-as antes de alterar o vínculo.');
    });
    // Analisa estado projetado para evitar introduzir inconsistência ou colisão nova.
    const projected={};Object.keys(TABLES).forEach(type=>{const n=TABLES[type];projected[n]=base(snapshot,n).map(r=>Object.assign({},r));});
    changes.filter(c=>projected[c.table]).forEach(c=>{projected[c.table].find(r=>text(r.ID)===c.id)[c.field]=c.after;});
    if(spec.acao==='REATIVAR') {
      const state=diagnostic({tables:projected},spec.tipo,projected[table].find(r=>text(r.ID)===spec.origem));
      if(state.code!=='REGULAR'&&state.code!=='SEM_UNIDADE')blocks.push('Antes de reativar: '+state.message);
      if(spec.tipo==='CLIENTE'&&projected.CAD_CLIENTES.some(c=>active(c)&&text(c.ID)!==spec.origem&&digits(source.CNPJ)&&digits(c.CNPJ)===digits(source.CNPJ)))blocks.push('Já existe cliente ativo com este CNPJ. Confira os cadastros antes de reativar.');
    }
    const movedUnits=new Set(changes.filter(c=>c.table==='CAD_UNIDADES'&&c.field==='CLIENTE_ID').map(c=>c.id));
    projected.CAD_UNIDADES.filter(u=>active(u)&&movedUnits.has(text(u.ID))&&text(u.CLIENTE_ID)).forEach(u=>{
      const name=text(u.NOME_UNIDADE).toUpperCase();
      if(name&&projected.CAD_UNIDADES.some(o=>active(o)&&text(o.ID)!==text(u.ID)&&text(o.CLIENTE_ID)===text(u.CLIENTE_ID)&&text(o.NOME_UNIDADE).toUpperCase()===name))blocks.push('Já existe unidade com este nome no cliente destino: '+text(u.NOME_UNIDADE)+'. Diferencie os locais antes de transferir.');
    });
    const touched=new Set(changes.filter(c=>c.table==='CAD_EQUIPAMENTOS').map(c=>c.id));
    projected.CAD_EQUIPAMENTOS.filter(e=>active(e)&&touched.has(text(e.ID))&&text(e.CLIENTE_ID)).forEach(e=>{
      const u=projected.CAD_UNIDADES.find(u=>text(u.ID)===text(e.UNIDADE_ID));
      if(!u||text(u.CLIENTE_ID)!==text(e.CLIENTE_ID))blocks.push('Equipamento '+text(e.TAG)+' possui unidade incompatível.');
      if(text(e.TAG)&&!/^(N\/P|N\/A|S\/N|SEM TAG|-)$/.test(text(e.TAG).toUpperCase())&&projected.CAD_EQUIPAMENTOS.some(o=>active(o)&&text(o.ID)!==text(e.ID)&&text(o.CLIENTE_ID)===text(e.CLIENTE_ID)&&text(o.TAG).toUpperCase()===text(e.TAG).toUpperCase()))blocks.push('TAG repetida no destino: '+text(e.TAG)+'. Resolva a duplicidade antes de transferir.');
    });
    if(spec.acao==='EXCLUIR') {
      const refs=[];Object.keys(snapshot.tables).forEach(n=>base(snapshot,n).forEach(r=>{
        if(n===table&&text(r.ID)===spec.origem)return;
        if(Object.keys(r).some(k=>/^(CLIENTE_ID|UNIDADE_ID|EQUIPAMENTO_ID|CLIENTE_ID_SGO|EQUIPAMENTOS_ID_SGO|ENTIDADE_ID)$/.test(k)&&text(r[k]).split(',').includes(spec.origem)))refs.push(n);
      }));
      if(refs.length) blocks.push('Exclusão impedida por vínculos em '+[...new Set(refs)].join(', ')+'. Inative ou consolide.');
      changes.push({table:table,id:spec.origem,row:source._row,field:'__DELETE__',before:source,after:''});
    }
    if(!changes.length)blocks.push('Nenhuma mudança necessária.');
    if(changes.length>1000)blocks.push('Operação grande demais para uma confirmação. Divida em transferências menores.');
    return {spec:spec,source:label(source),target:target?label(target):'',changes:changes,blocks:[...new Set(blocks)],warnings:warnings,historical:historical};
  }
  function hash(value) { return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify(value))); }
  function preview(sessionId,input) {
    const user=staff(sessionId,true),snapshot=read(),plan=build(snapshot,input),token=Utilities.getUuid();
    if(!plan.blocks.length) CacheService.getScriptCache().put('vinc:'+token,JSON.stringify({session:sessionId,user:user.usuario,spec:plan.spec,hash:hash(snapshot)}),600);
    function display(c,value){const name={CLIENTE_ID:'CAD_CLIENTES',UNIDADE_ID:'CAD_UNIDADES'}[c.field];return name&&value?label(get(snapshot,name,value))+' ('+value+')':value;}
    return {success:true,token:plan.blocks.length?'':token,source:plan.source,target:plan.target,blocks:plan.blocks,warnings:plan.warnings,historical:plan.historical,changes:plan.changes.map(c=>({table:c.table,id:c.id,field:c.field,before:c.field==='__DELETE__'?label(c.before):display(c,c.before),after:display(c,c.after)}))};
  }
  function cellValue(v) { return typeof v==='number'?{numberValue:v}:typeof v==='boolean'?{boolValue:v}:{stringValue:v==null?'':String(v)}; }
  function batch(requests) {
    const response=UrlFetchApp.fetch('https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(SGO_CFG.DB_ID)+':batchUpdate',{method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},payload:JSON.stringify({requests:requests}),muteHttpExceptions:true});
    if(response.getResponseCode()<200||response.getResponseCode()>=300)throw new Error('Gravação não confirmada pela API do banco (HTTP '+response.getResponseCode()+'). Consulte a auditoria antes de repetir.');
  }
  function confirm(sessionId,token) {
    const user=staff(sessionId,true),cached=CacheService.getScriptCache().get('vinc:'+text(token));
    if(!cached)throw new Error('Prévia expirada. Faça uma nova conferência.');
    const permit=JSON.parse(cached);if(permit.session!==sessionId||permit.user!==user.usuario)throw new Error('Prévia pertence a outra sessão.');
    const lock=LockService.getScriptLock();lock.waitLock(30000);
    try {
      const db=SGO_DATA.getDB(),audit=db.getSheetByName(AUDIT);
      if(audit&&audit.getLastRow()>1&&audit.getRange(2,2,audit.getLastRow()-1,1).getValues().some(r=>text(r[0])===token))return {success:true,message:'Operação já aplicada. Atualize o painel.'};
      const snapshot=read();if(hash(snapshot)!==permit.hash)throw new Error('Os cadastros ou vínculos mudaram desde a prévia. Atualize e confira novamente.');
      const plan=build(snapshot,permit.spec);if(plan.blocks.length)throw new Error(plan.blocks.join(' '));
      const requests=[];let auditId;
      if(audit){auditId=audit.getSheetId();const h=audit.getRange(1,1,1,AUDIT_HEADERS.length).getValues()[0];if(JSON.stringify(h)!==JSON.stringify(AUDIT_HEADERS))throw new Error('Estrutura de auditoria incompatível.');}
      else {auditId=Math.floor(Math.random()*1000000000)+100;requests.push({addSheet:{properties:{sheetId:auditId,title:AUDIT,gridProperties:{rowCount:Math.max(1000,plan.changes.length+10),columnCount:AUDIT_HEADERS.length,frozenRowCount:1}}}});requests.push({appendCells:{sheetId:auditId,rows:[{values:AUDIT_HEADERS.map(h=>({userEnteredValue:{stringValue:h}}))}],fields:'userEnteredValue'}});}
      plan.changes.filter(c=>c.field!=='__DELETE__').forEach(c=>requests.push({updateCells:{start:{sheetId:snapshot.schema[c.table].sheetId,rowIndex:c.row-1,columnIndex:snapshot.schema[c.table].headers.indexOf(c.field)},rows:[{values:[{userEnteredValue:cellValue(c.after)}]}],fields:'userEnteredValue'}}));
      plan.changes.filter(c=>c.field==='__DELETE__').sort((a,b)=>b.row-a.row).forEach(c=>requests.push({deleteDimension:{range:{sheetId:snapshot.schema[c.table].sheetId,dimension:'ROWS',startIndex:c.row-1,endIndex:c.row}}}));
      const now=new Date().toISOString();
      requests.push({appendCells:{sheetId:auditId,rows:plan.changes.map(c=>({values:[Utilities.getUuid(),token,text(user.usuario),plan.spec.motivo,plan.spec.acao,plan.spec.origem,c.table,c.id,c.field,typeof c.before==='object'?JSON.stringify(c.before):text(c.before),text(c.after),now].map(v=>({userEnteredValue:{stringValue:v}}))})),fields:'userEnteredValue'}});
      batch(requests);SGO_DATA._headersCache={};SGO_DATA._headerMapCache={};
      return {success:true,message:'Alteração aplicada com auditoria. Recarregue as telas abertas antes de continuar.',operationId:token};
    } finally {lock.releaseLock();}
  }
  function relation(sessionId,clienteId,unidadeId,equipamentoId) {
    const sessao=exigirSessao(sessionId),c=SGO_DATA.getById('CAD_CLIENTES',clienteId),u=SGO_DATA.getById('CAD_UNIDADES',unidadeId);
    if(text(sessao.perfil).toUpperCase()==='CLIENTE'&&text(sessao.clienteId)!==text(clienteId))throw new Error('Acesso negado a este cliente.');
    if(!active(c)||!active(u)||text(u.CLIENTE_ID)!==text(c.ID))throw new Error('Cliente/unidade sem vínculo ativo correspondente. Atualize a seleção ou peça ao gestor para corrigir no painel de vínculos.');
    const e= equipamentoId ? SGO_DATA.getById('CAD_EQUIPAMENTOS',equipamentoId) : null;
    if(equipamentoId&&(!active(e)||text(e.CLIENTE_ID)!==text(c.ID)||text(e.UNIDADE_ID)!==text(u.ID)))throw new Error('O equipamento mudou de vínculo ou está inativo. Selecione novamente.');
    return {cliente:c,unidade:u,equipamento:e};
  }
  function units(sessionId,clienteId) {
    const s=exigirSessao(sessionId);
    if(text(s.perfil).toUpperCase()==='CLIENTE'&&text(s.clienteId)!==text(clienteId))throw new Error('Acesso negado.');
    const c=SGO_DATA.getById('CAD_CLIENTES',clienteId);if(!active(c))return {success:true,items:[]};
    return {success:true,items:SGO_DATA.getAll('CAD_UNIDADES').filter(u=>active(u)&&text(u.CLIENTE_ID)===text(clienteId)).map(u=>({ID:text(u.ID),CLIENTE_ID:text(u.CLIENTE_ID),NOME_UNIDADE:label(u),CNPJ:digits(u.CNPJ_UNIDADE),ENDERECO:text(u.ENDERECO)}))};
  }
  function principal(sessionId,clienteId,extra) {
    extra=extra||{};
    staff(sessionId,false);
    const lock=LockService.getScriptLock(),owner=!lock.hasLock();if(owner)lock.waitLock(30000);
    try {
      const c=SGO_DATA.getById('CAD_CLIENTES',clienteId);if(!active(c))throw new Error('Cliente não encontrado ou inativo.');
      const cnpj=digits(c.CNPJ);if(!cnpj||!SGO_UTILS.isCnpj(cnpj))throw new Error('Confira o CNPJ do cliente antes de criar a unidade principal.');
      const existing=SGO_DATA.getAll('CAD_UNIDADES').filter(u=>digits(u.CNPJ_UNIDADE)===cnpj);
      if(existing.length) {
        if(existing.length===1&&text(existing[0].CLIENTE_ID)===text(c.ID)&&active(existing[0]))return {success:true,item:existing[0],message:'Unidade principal já cadastrada: '+label(existing[0])};
        throw new Error('Este CNPJ já aparece em unidade cadastrada. Consulte os vínculos antes de criar: '+existing.map(u=>label(u)+' / cliente: '+label(SGO_DATA.getById('CAD_CLIENTES',u.CLIENTE_ID))).join('; '));
      }
      const result=SGO_UNIDADES.criar(sessionId,{CLIENTE_ID:c.ID,NOME_UNIDADE:c.NOME_FANTASIA||c.RAZAO_SOCIAL||'Unidade principal',CNPJ_UNIDADE:cnpj,ENDERECO:c.ENDERECO,CIDADE:extra.CIDADE||'',UF:extra.UF||'',RESPONSAVEL:c.CONTATO,TELEFONE:c.TELEFONE});
      if(!result.success)throw new Error(result.message);
      const created=SGO_DATA.getAll('CAD_UNIDADES').find(u=>text(u.CLIENTE_ID)===text(c.ID)&&digits(u.CNPJ_UNIDADE)===cnpj);
      return {success:true,item:created,message:'Unidade principal criada e vinculada ao cliente.'};
    } finally {if(owner){try{SpreadsheetApp.flush();}finally{lock.releaseLock();}}}
  }
  function createClient(sessionId,payload) {
    staff(sessionId,false);payload=payload||{};
    const withUnit=payload.CRIAR_UNIDADE_PRINCIPAL!==false;
    const lock=LockService.getScriptLock(),owner=!lock.hasLock();if(owner)lock.waitLock(30000);
    try {
      if(withUnit) {
        const cnpj=SGO_UTILS.normalizeCnpj(payload.CNPJ);
        if(!SGO_UTILS.isCnpj(cnpj))return {success:false,message:'Informe um CNPJ válido para cadastrar cliente com unidade principal.'};
        const matches=SGO_DATA.getAll('CAD_UNIDADES').filter(u=>digits(u.CNPJ_UNIDADE)===cnpj);
        if(matches.length)return {success:false,message:'Este estabelecimento já está cadastrado como unidade: '+matches.map(u=>label(u)+' / cliente: '+label(SGO_DATA.getById('CAD_CLIENTES',u.CLIENTE_ID))).join('; ')+'. Abra o painel de vínculos para reutilizar ou transferir. Para criar somente um agrupador, desmarque a unidade principal.'};
      }
      const result=SGO_CLIENTES.criar(sessionId,payload);if(!result.success||!withUnit)return result;
      try {const unit=principal(sessionId,result.item.ID,payload);result.unidade=unit.item;result.message='Cliente e unidade principal cadastrados.';return result;}
      catch(error){
        const children=SGO_DATA.getAll('CAD_UNIDADES').filter(u=>text(u.CLIENTE_ID)===text(result.item.ID));
        if(!children.length)SGO_DATA.remove('CAD_CLIENTES',result.item.ID);
        throw error;
      }
    } finally {if(owner){try{SpreadsheetApp.flush();}finally{lock.releaseLock();}}}
  }
  return {overview:overview,details:details,search:search,preview:preview,confirm:confirm,relation:relation,units:units,principal:principal,createClient:createClient,_build:build,_diagnostic:diagnostic};
})();
function vinculosConsultar(sessionId,termo) { return SGO_VINCULOS.search(sessionId,termo); }
function vinculosPainel(sessionId) { return SGO_VINCULOS.overview(sessionId); }
function vinculosPrevia(sessionId,payload) { return SGO_VINCULOS.preview(sessionId,payload); }
function vinculosConfirmar(sessionId,token) { return SGO_VINCULOS.confirm(sessionId,token); }
function vinculosCriarPrincipal(sessionId,clienteId) { return SGO_VINCULOS.principal(sessionId,clienteId); }
function vinculosDetalhes(sessionId,tipo,id) { return SGO_VINCULOS.details(sessionId,tipo,id); }
