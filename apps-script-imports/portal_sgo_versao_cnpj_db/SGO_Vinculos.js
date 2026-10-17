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
      // 17/10/2026: DOC_DOCUMENTOS lido inteiro — os documentos acompanham a unidade/equipamento
      // que muda de cliente (decisão do dono) e a prévia mostra nome e tipo de cada um.
      const core = Object.values(TABLES).includes(name) || name === 'AUVO_SYNC' || name === 'DOC_DOCUMENTOS';
      const fields = headers.filter(h => /^(ID|CLIENTE_ID|UNIDADE_ID|EQUIPAMENTO_ID|CLIENTE_ID_SGO|EQUIPAMENTOS_ID_SGO|STATUS|FINALIZADA|STATUS_PENDENCIA|AUVO_TASK_ID)$/.test(h));
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
    const snapshot=read(),row=get(snapshot,TABLES[type],id);if(!row)throw new Error('Cadastro não encontrado: pode ter sido alterado por outra pessoa. Clique em Atualizar e selecione de novo.');
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
    if(!TABLES[spec.tipo] || !['TRANSFERIR','DESVINCULAR','CONSOLIDAR','INATIVAR','REATIVAR','EXCLUIR'].includes(spec.acao)) throw new Error('Escolha o tipo (Cliente, Unidade ou Equipamento) e a ação antes de clicar em Conferir impacto.');
    if(spec.motivo.length<8 || spec.motivo.length>1000) throw new Error('Escreva o motivo da mudança (de 8 a 1.000 caracteres). Ele fica registrado na auditoria.');
    const table=TABLES[spec.tipo],source=get(snapshot,table,spec.origem);
    if(!source) throw new Error('O cadastro de origem não foi encontrado: pode ter sido alterado por outra pessoa. Clique em Atualizar, escolha a origem de novo e confira.');
    if(['TRANSFERIR','CONSOLIDAR'].includes(spec.acao) && (!spec.destino || spec.destino===spec.origem)) throw new Error('Escolha o destino: ele precisa ser diferente da origem.');
    if(spec.acao==='TRANSFERIR' && spec.tipo==='CLIENTE') throw new Error('Cliente não se transfere. Para juntar dois clientes com o mesmo CNPJ, use Consolidar; para mudar uma unidade de cliente, escolha Tipo Unidade → Transferir.');
    if(spec.acao==='DESVINCULAR' && spec.tipo==='CLIENTE') throw new Error('Cliente não tem vínculo para desfazer. Para tirar um cliente de uso, use Inativar.');
    const changes=[],blocks=[],warnings=[],historical={};
    function change(name,row,field,value) {
      if(!snapshot.schema[name] || !snapshot.schema[name].headers.includes(field)) throw new Error('Coluna não encontrada: '+name+'.'+field);
      const before=row[field] == null ? '' : row[field];
      if(text(before)===text(value)) return;
      const old=changes.find(c=>c.table===name&&c.id===text(row.ID)&&c.field===field);
      if(old){old.after=value;return;}
      changes.push({table:name,id:text(row.ID),row:row._row,field:field,before:before,after:value});
    }
    // 17/10/2026 (decisão do dono): quando a unidade ou o equipamento muda de cliente, os documentos
    // ligados (Arquivo de documentos) acompanham: CLIENTE_ID/UNIDADE_ID atualizados, com cada mudança
    // na auditoria (quem, quando, de onde, para onde). Nada é apagado; o arquivo fica onde está.
    const docsMovidos={};
    function moverDocs(filtro,clienteId,unidadeId) {
      if(!clienteId)return;
      base(snapshot,'DOC_DOCUMENTOS').filter(filtro).forEach(d=>{
        change('DOC_DOCUMENTOS',d,'CLIENTE_ID',clienteId);
        if(unidadeId)change('DOC_DOCUMENTOS',d,'UNIDADE_ID',unidadeId);
        docsMovidos[text(d.ID)]=d;
      });
    }
    function moveUnit(u,clientId) {
      change('CAD_UNIDADES',u,'CLIENTE_ID',clientId);
      base(snapshot,'CAD_EQUIPAMENTOS').filter(e=>text(e.UNIDADE_ID)===text(u.ID)).forEach(e=>change('CAD_EQUIPAMENTOS',e,'CLIENTE_ID',clientId));
      const equipsDaUnidade=new Set(base(snapshot,'CAD_EQUIPAMENTOS').filter(e=>text(e.UNIDADE_ID)===text(u.ID)).map(e=>text(e.ID)));
      moverDocs(d=>text(d.UNIDADE_ID)===text(u.ID)||(text(d.EQUIPAMENTO_ID)&&equipsDaUnidade.has(text(d.EQUIPAMENTO_ID))),clientId,text(u.ID));
      const maps=base(snapshot,'AUVO_SYNC');
      maps.filter(m=>text(m.ENTIDADE_TIPO)==='UNIDADE'&&text(m.ENTIDADE_ID)===text(u.ID)).forEach(m=>{
        const customer=text(m.AUVO_ID);
        const cm=maps.filter(x=>text(x.ENTIDADE_TIPO)==='CLIENTE'&&text(x.AUVO_ID)===customer);
        if(cm.length!==1) blocks.push('O vínculo deste cadastro com o Auvo (cliente Auvo nº '+customer+') está incompleto ou repetido no SGO+. Abra Integração Auvo, sincronize os clientes e volte aqui para conferir de novo. Se continuar, avise o administrador informando o nº '+customer+'.');
        cm.forEach(x=>change('AUVO_SYNC',x,'ENTIDADE_ID',clientId));
        // O mapeamento da unidade permanece, inclusive no estado pendente.
      });
    }
    let target=null;
    if(spec.acao==='TRANSFERIR') {
      const destTable=spec.tipo==='UNIDADE'?'CAD_CLIENTES':'CAD_UNIDADES';target=get(snapshot,destTable,spec.destino);
      if(!active(target)) throw new Error('O destino escolhido está inativo. Escolha um destino ativo, ou reative-o antes (ação Reativar), e refaça.');
      if(spec.tipo==='UNIDADE') moveUnit(source,target.ID);
      else {const client=get(snapshot,'CAD_CLIENTES',target.CLIENTE_ID);if(!active(client))throw new Error('A unidade de destino não está ligada a um cliente ativo. Primeiro leve essa unidade para um cliente ativo (Tipo Unidade → Transferir) e depois refaça esta operação.');change(table,source,'UNIDADE_ID',target.ID);change(table,source,'CLIENTE_ID',target.CLIENTE_ID);moverDocs(d=>text(d.EQUIPAMENTO_ID)===text(source.ID),text(target.CLIENTE_ID),text(target.ID));}
    }
    if(spec.acao==='DESVINCULAR') {
      if(spec.tipo==='UNIDADE') moveUnit(source,'');
      else {change(table,source,'UNIDADE_ID','');change(table,source,'CLIENTE_ID','');}
      warnings.push('O cadastro ficará com vínculo pendente. Novos atendimentos e emissões serão bloqueados até a vinculação.');
    }
    if(spec.acao==='CONSOLIDAR') {
      target=get(snapshot,table,spec.destino);if(!active(target))throw new Error('O cadastro de destino está inativo. Escolha um destino ativo, ou reative-o antes (ação Reativar), e refaça.');
      if(spec.tipo==='CLIENTE') {
        if(!digits(source.CNPJ)||digits(source.CNPJ)!==digits(target.CNPJ))throw new Error('Só dá para consolidar clientes com o mesmo CNPJ. Filiais (CNPJ diferente) são clientes separados: para levar uma unidade de um cliente para outro, use Tipo Unidade → Transferir.');
        base(snapshot,'CAD_UNIDADES').filter(u=>text(u.CLIENTE_ID)===spec.origem).forEach(u=>moveUnit(u,target.ID));
        base(snapshot,'CAD_EQUIPAMENTOS').filter(e=>text(e.CLIENTE_ID)===spec.origem).forEach(e=>change('CAD_EQUIPAMENTOS',e,'CLIENTE_ID',target.ID));
        moverDocs(d=>text(d.CLIENTE_ID)===spec.origem,text(target.ID),null);
      } else if(spec.tipo==='UNIDADE') {
        if(!digits(source.CNPJ_UNIDADE)||digits(source.CNPJ_UNIDADE)!==digits(target.CNPJ_UNIDADE))throw new Error('Só dá para consolidar unidades com o mesmo CNPJ (o mesmo local). Se for outro local, use Transferir. Se for o mesmo local e o CNPJ estiver errado, corrija o CNPJ (botão Abrir / editar cadastro) e refaça.');
        if(!active(get(snapshot,'CAD_CLIENTES',target.CLIENTE_ID)))throw new Error('A unidade de destino não está ligada a um cliente ativo. Primeiro leve essa unidade para um cliente ativo (Tipo Unidade → Transferir) e depois refaça esta operação.');
        moveUnit(source,target.CLIENTE_ID);
        base(snapshot,'CAD_EQUIPAMENTOS').filter(e=>text(e.UNIDADE_ID)===spec.origem).forEach(e=>{change('CAD_EQUIPAMENTOS',e,'UNIDADE_ID',target.ID);change('CAD_EQUIPAMENTOS',e,'CLIENTE_ID',target.CLIENTE_ID);});
        moverDocs(d=>text(d.UNIDADE_ID)===spec.origem,text(target.CLIENTE_ID),text(target.ID));
      } else {
        if(text(source.CLIENTE_ID)!==text(target.CLIENTE_ID)||text(source.TAG).toUpperCase()!==text(target.TAG).toUpperCase()||!text(source.TAG)||/^(N\/P|N\/A|S\/N|SEM TAG|-)$/.test(text(source.TAG).toUpperCase()))throw new Error('Só dá para consolidar equipamentos do mesmo cliente e com a mesma TAG real (TAGs como S/N ou N/A não servem). Confira a TAG dos dois (botão Abrir / editar cadastro) e refaça.');
        if(text(source.SERIE)&&text(target.SERIE)&&text(source.SERIE)!==text(target.SERIE))throw new Error('Os dois equipamentos têm números de série diferentes, então não são o mesmo equipamento. Se um número estiver errado, corrija (botão Abrir / editar cadastro) e refaça; se forem equipamentos diferentes, não consolide.');
      }
      base(snapshot,'AUVO_SYNC').filter(m=>text(m.ENTIDADE_TIPO)===spec.tipo&&text(m.ENTIDADE_ID)===spec.origem).forEach(m=>change('AUVO_SYNC',m,'ENTIDADE_ID',target.ID));
      change(table,source,'STATUS','INATIVO');
      warnings.push('O cadastro de origem será mantido inativo para preservar documentos, histórico e QR antigos. Os vínculos operacionais serão reunidos no destino.');
    }
    if(spec.acao==='INATIVAR'||spec.acao==='REATIVAR') change(table,source,'STATUS',spec.acao==='INATIVAR'?'INATIVO':'ATIVO');
    // Detecta efeitos em registros persistidos fora do cadastro. Documentos do Arquivo acompanham o cadastro
    // (acima); certificados, laudos e atendimentos ficam no proprietário original.
    const affected=new Set([spec.origem,...changes.map(c=>c.id)]);
    const knownHistorical=['DOC_DOCUMENTOS','CERT_CALIBRACAO','NR13_LAUDOS','AUVO_TAREFAS'];
    Object.keys(snapshot.tables).filter(n=>!Object.values(TABLES).includes(n)&&n!=='AUVO_SYNC').forEach(name=>{
      const matches=base(snapshot,name).filter(r=>Object.keys(r).some(k=>/^(CLIENTE_ID|UNIDADE_ID|EQUIPAMENTO_ID|CLIENTE_ID_SGO|EQUIPAMENTOS_ID_SGO)$/.test(k)&&text(r[k]).split(',').some(id=>affected.has(id.trim()))));
      if(!matches.length)return;
      if(knownHistorical.includes(name)) {
        const ficam=name==='DOC_DOCUMENTOS'?matches.filter(r=>!docsMovidos[text(r.ID)]).length:matches.length;
        if(ficam)historical[name]=ficam;
        if(name==='NR13_LAUDOS'&&matches.some(r=>text(r.STATUS)==='RASCUNHO'||text(r.STATUS)==='PENDENTE'||text(r.STATUS_PENDENCIA)==='ABERTA'))blocks.push('Há laudo NR-13 em andamento ligado a este cadastro. Abra o módulo NR-13, conclua ou cancele o laudo e volte aqui para clicar em Conferir impacto de novo.');
        // 2026-10-15: a maioria das tarefas nunca é finalizada no Auvo (160 de 224), então a trava antiga
        // tornava o painel inutilizável. Só trava quando o CLIENTE do equipamento/unidade muda (aí a tarefa
        // aberta ficaria apontando o cliente antigo); juntar/mover dentro do mesmo cliente vira aviso.
        if(name==='AUVO_TAREFAS'){
          const abertas=matches.filter(r=>text(r.FINALIZADA)!=='SIM');
          const clienteMuda=changes.some(c=>c.field==='CLIENTE_ID'&&(c.table==='CAD_EQUIPAMENTOS'||c.table==='CAD_UNIDADES'));
          const lista=abertas.map(r=>text(r.AUVO_TASK_ID)).filter(Boolean).slice(0,15).join(', ');
          if(abertas.length&&clienteMuda)blocks.push('Há '+abertas.length+' tarefa(s) do Auvo em aberto ligadas a este cadastro'+(lista?' (nº '+lista+')':'')+'. Como o cliente vai mudar, finalize ou exclua essas tarefas no Auvo, sincronize e confira de novo.');
          else if(abertas.length)warnings.push(abertas.length+' tarefa(s) do Auvo em aberto'+(lista?' (nº '+lista+')':'')+' continuam válidas: o cliente e os equipamentos não mudam de cadastro.');
        }
      } else blocks.push('Há '+matches.length+' registro(s) na tabela '+name+' ligados a este cadastro, e o painel não sabe ajustá-los sozinho. Nada foi alterado. Avise o administrador do sistema informando a tabela '+name+' e este cadastro; depois da revisão, refaça a operação.');
    });
    // Analisa estado projetado para evitar introduzir inconsistência ou colisão nova.
    const projected={};Object.keys(TABLES).forEach(type=>{const n=TABLES[type];projected[n]=base(snapshot,n).map(r=>Object.assign({},r));});
    changes.filter(c=>projected[c.table]).forEach(c=>{projected[c.table].find(r=>text(r.ID)===c.id)[c.field]=c.after;});
    if(spec.acao==='REATIVAR') {
      const state=diagnostic({tables:projected},spec.tipo,projected[table].find(r=>text(r.ID)===spec.origem));
      if(state.code!=='REGULAR'&&state.code!=='SEM_UNIDADE')blocks.push('Ainda não dá para reativar: '+state.message+' Corrija esse ponto no cadastro (botão Abrir / editar cadastro), volte aqui e clique em Conferir impacto de novo.');
      if(spec.tipo==='CLIENTE'&&projected.CAD_CLIENTES.some(c=>active(c)&&text(c.ID)!==spec.origem&&digits(source.CNPJ)&&digits(c.CNPJ)===digits(source.CNPJ)))blocks.push('Já existe outro cliente ativo com este CNPJ. Em vez de reativar, use Consolidar para juntar os dois cadastros no cliente que está ativo.');
    }
    const movedUnits=new Set(changes.filter(c=>c.table==='CAD_UNIDADES'&&c.field==='CLIENTE_ID').map(c=>c.id));
    projected.CAD_UNIDADES.filter(u=>active(u)&&movedUnits.has(text(u.ID))&&text(u.CLIENTE_ID)).forEach(u=>{
      const name=text(u.NOME_UNIDADE).toUpperCase();
      if(name&&projected.CAD_UNIDADES.some(o=>active(o)&&text(o.ID)!==text(u.ID)&&text(o.CLIENTE_ID)===text(u.CLIENTE_ID)&&text(o.NOME_UNIDADE).toUpperCase()===name))blocks.push('O cliente destino já tem uma unidade chamada "'+text(u.NOME_UNIDADE)+'". Se for o mesmo local, use Consolidar; se forem locais diferentes, edite o nome de uma delas (botão Abrir / editar cadastro, ex.: acrescente a cidade) e refaça a operação.');
    });
    const touched=new Set(changes.filter(c=>c.table==='CAD_EQUIPAMENTOS').map(c=>c.id));
    projected.CAD_EQUIPAMENTOS.filter(e=>active(e)&&touched.has(text(e.ID))&&text(e.CLIENTE_ID)).forEach(e=>{
      const u=projected.CAD_UNIDADES.find(u=>text(u.ID)===text(e.UNIDADE_ID));
      if(!u||text(u.CLIENTE_ID)!==text(e.CLIENTE_ID))blocks.push('O equipamento '+text(e.TAG)+' ficaria numa unidade de outro cliente. Primeiro leve a unidade para o cliente certo (Tipo Unidade → Transferir) e depois refaça esta operação.');
      if(text(e.TAG)&&!/^(N\/P|N\/A|S\/N|SEM TAG|-)$/.test(text(e.TAG).toUpperCase())&&projected.CAD_EQUIPAMENTOS.some(o=>active(o)&&text(o.ID)!==text(e.ID)&&text(o.CLIENTE_ID)===text(e.CLIENTE_ID)&&text(o.TAG).toUpperCase()===text(e.TAG).toUpperCase()))blocks.push('O cliente destino já tem um equipamento com a TAG '+text(e.TAG)+'. Se for o mesmo equipamento, use Equipamento → Consolidar; se forem diferentes, edite a TAG de um deles (botão Abrir / editar cadastro) e refaça.');
    });
    if(spec.acao==='EXCLUIR') {
      const refs=[];Object.keys(snapshot.tables).forEach(n=>base(snapshot,n).forEach(r=>{
        if(n===table&&text(r.ID)===spec.origem)return;
        if(Object.keys(r).some(k=>/^(CLIENTE_ID|UNIDADE_ID|EQUIPAMENTO_ID|CLIENTE_ID_SGO|EQUIPAMENTOS_ID_SGO|ENTIDADE_ID)$/.test(k)&&text(r[k]).split(',').includes(spec.origem)))refs.push(n);
      }));
      if(refs.length) blocks.push('Não dá para excluir: ainda há registros ligados a este cadastro em '+[...new Set(refs)].join(', ')+'. Para tirar de uso sem perder o histórico, use a ação Inativar; se for o mesmo cadastro de outro registro, use Consolidar.');
      changes.push({table:table,id:spec.origem,row:source._row,field:'__DELETE__',before:source,after:''});
    }
    if(!changes.length)blocks.push('Nada a fazer: o cadastro já está assim. Confira se escolheu a origem e o destino certos.');
    if(changes.length>1000)blocks.push('Esta operação mexeria em mais de 1.000 registros de uma vez. Divida: transfira as unidades uma por uma e depois os equipamentos que sobrarem.');
    const documentos=Object.keys(docsMovidos).map(id=>{const d=docsMovidos[id],cc=changes.find(c=>c.table==='DOC_DOCUMENTOS'&&c.id===id&&c.field==='CLIENTE_ID'),cu=changes.find(c=>c.table==='DOC_DOCUMENTOS'&&c.id===id&&c.field==='UNIDADE_ID');
      return {id:id,nome:text(d.NOME_ARQUIVO)||'Documento sem nome',tipo:text(d.TIPO_DOCUMENTO),clienteAntes:text(d.CLIENTE_ID),clienteDepois:cc?text(cc.after):text(d.CLIENTE_ID),unidadeAntes:text(d.UNIDADE_ID),unidadeDepois:cu?text(cu.after):text(d.UNIDADE_ID)};})
      .filter(d=>d.clienteAntes!==d.clienteDepois||d.unidadeAntes!==d.unidadeDepois);
    if(documentos.length)warnings.push(documentos.length+(documentos.length===1?' documento do Arquivo de documentos acompanha':' documentos do Arquivo de documentos acompanham')+' esta mudança: cliente e unidade são atualizados e cada troca fica na auditoria. O arquivo continua na mesma pasta e o link não muda.');
    return {spec:spec,source:label(source),target:target?label(target):'',changes:changes,blocks:[...new Set(blocks)],warnings:warnings,historical:historical,documentos:documentos};
  }
  function hash(value) { return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,JSON.stringify(value))); }
  function preview(sessionId,input) {
    const user=staff(sessionId,true),snapshot=read(),plan=build(snapshot,input),token=Utilities.getUuid();
    if(!plan.blocks.length) CacheService.getScriptCache().put('vinc:'+token,JSON.stringify({session:sessionId,user:user.usuario,spec:plan.spec,hash:hash(snapshot)}),600);
    function display(c,value){const name={CLIENTE_ID:'CAD_CLIENTES',UNIDADE_ID:'CAD_UNIDADES'}[c.field];return name&&value?label(get(snapshot,name,value))+' ('+value+')':value;}
    const nomeDe=(tabela,id)=>id?label(get(snapshot,tabela,id)):'(sem vínculo)';
    const documentos=(plan.documentos||[]).map(d=>({id:d.id,nome:d.nome,tipo:d.tipo,de:nomeDe('CAD_CLIENTES',d.clienteAntes)+' / '+nomeDe('CAD_UNIDADES',d.unidadeAntes),para:nomeDe('CAD_CLIENTES',d.clienteDepois)+' / '+nomeDe('CAD_UNIDADES',d.unidadeDepois)}));
    return {success:true,token:plan.blocks.length?'':token,source:plan.source,target:plan.target,blocks:plan.blocks,warnings:plan.warnings,historical:plan.historical,documentos:documentos,changes:plan.changes.map(c=>({table:c.table,id:c.id,field:c.field,before:c.field==='__DELETE__'?label(c.before):display(c,c.before),after:display(c,c.after)}))};
  }
  function cellValue(v) { return typeof v==='number'?{numberValue:v}:typeof v==='boolean'?{boolValue:v}:{stringValue:v==null?'':String(v)}; }
  function batch(requests) {
    const response=UrlFetchApp.fetch('https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(SGO_CFG.DB_ID)+':batchUpdate',{method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},payload:JSON.stringify({requests:requests}),muteHttpExceptions:true});
    if(response.getResponseCode()<200||response.getResponseCode()>=300)throw new Error('Gravação não confirmada pela API do banco (HTTP '+response.getResponseCode()+'). Consulte a auditoria antes de repetir.');
  }
  function confirm(sessionId,token) {
    const user=staff(sessionId,true),cached=CacheService.getScriptCache().get('vinc:'+text(token));
    if(!cached)throw new Error('A prévia vale 10 minutos e expirou. Nada foi gravado. Clique em Conferir impacto de novo e confirme.');
    const permit=JSON.parse(cached);if(permit.session!==sessionId||permit.user!==user.usuario)throw new Error('Esta prévia foi feita em outro login ou em outra aba. Nada foi gravado. Clique em Conferir impacto de novo nesta tela e confirme.');
    const lock=LockService.getScriptLock();lock.waitLock(30000);
    try {
      const db=SGO_DATA.getDB(),audit=db.getSheetByName(AUDIT);
      if(audit&&audit.getLastRow()>1&&audit.getRange(2,2,audit.getLastRow()-1,1).getValues().some(r=>text(r[0])===token))return {success:true,message:'Operação já aplicada. Atualize o painel.'};
      const snapshot=read();if(hash(snapshot)!==permit.hash)throw new Error('Alguém alterou cadastros ou vínculos depois da sua prévia (ou a sincronização do Auvo rodou). Por segurança, nada foi gravado. Clique em Conferir impacto de novo e confirme a nova prévia.');
      const plan=build(snapshot,permit.spec);if(plan.blocks.length)throw new Error(plan.blocks.join(' '));
      const requests=[];let auditId;
      if(audit){auditId=audit.getSheetId();const h=audit.getRange(1,1,1,AUDIT_HEADERS.length).getValues()[0];if(JSON.stringify(h)!==JSON.stringify(AUDIT_HEADERS))throw new Error('A tabela de auditoria do painel está com a estrutura diferente da esperada, então nada foi gravado. Avise o administrador do sistema (tabela SYS_VINCULOS_AUDITORIA).');}
      else {auditId=Math.floor(Math.random()*1000000000)+100;requests.push({addSheet:{properties:{sheetId:auditId,title:AUDIT,gridProperties:{rowCount:Math.max(1000,plan.changes.length+10),columnCount:AUDIT_HEADERS.length,frozenRowCount:1}}}});requests.push({appendCells:{sheetId:auditId,rows:[{values:AUDIT_HEADERS.map(h=>({userEnteredValue:{stringValue:h}}))}],fields:'userEnteredValue'}});}
      plan.changes.filter(c=>c.field!=='__DELETE__').forEach(c=>requests.push({updateCells:{start:{sheetId:snapshot.schema[c.table].sheetId,rowIndex:c.row-1,columnIndex:snapshot.schema[c.table].headers.indexOf(c.field)},rows:[{values:[{userEnteredValue:cellValue(c.after)}]}],fields:'userEnteredValue'}}));
      plan.changes.filter(c=>c.field==='__DELETE__').sort((a,b)=>b.row-a.row).forEach(c=>requests.push({deleteDimension:{range:{sheetId:snapshot.schema[c.table].sheetId,dimension:'ROWS',startIndex:c.row-1,endIndex:c.row}}}));
      const now=new Date().toISOString();
      requests.push({appendCells:{sheetId:auditId,rows:plan.changes.map(c=>({values:[Utilities.getUuid(),token,text(user.usuario),plan.spec.motivo,plan.spec.acao,plan.spec.origem,c.table,c.id,c.field,typeof c.before==='object'?JSON.stringify(c.before):text(c.before),text(c.after),now].map(v=>({userEnteredValue:{stringValue:v}}))})),fields:'userEnteredValue'}});
      batch(requests);SGO_DATA._headersCache={};SGO_DATA._headerMapCache={};
      const qtdDocs=new Set(plan.changes.filter(c=>c.table==='DOC_DOCUMENTOS').map(c=>c.id)).size;
      try{SGO_DATA.log('VINCULOS_'+plan.spec.acao,user.usuario,plan.spec.tipo+' '+plan.spec.origem+(plan.spec.destino?' para '+plan.spec.destino:'')+': '+plan.changes.length+' alteração(ões)'+(qtdDocs?', '+qtdDocs+' documento(s) acompanharam':'')+'. Operação '+token+'. Motivo: '+plan.spec.motivo,'VINCULOS');}catch(eLog){}
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
      const cnpj=digits(c.CNPJ);if(!cnpj||!SGO_UTILS.isCnpj(cnpj))throw new Error('Não foi possível criar a unidade principal: o cliente não tem CNPJ válido. Clique em Abrir / editar cadastro, informe o CNPJ do cliente, salve e tente de novo.');
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
