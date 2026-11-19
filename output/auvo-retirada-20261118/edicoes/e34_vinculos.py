ARQ = r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Vinculos.js'
PARES = [
("""      if(avisosAuvo.length)warnings.push('A ligação desta unidade com o Auvo (cliente Auvo nº '+[...new Set(avisosAuvo)].join(', ')+') continua guardada com a unidade. Enquanto ela estiver sem cliente, tarefa nova do Auvo nesse endereço fica pendente em Integração Auvo. Para ligar a unidade a outro cliente, use Unidade → Transferir; para tirá-la de uso, Inativar ou Excluir.');""",
 """      // 18/11/2026: Auvo descontinuado pelo dono; a ligação antiga com o Auvo fica guardada com a unidade, só como histórico.
      if(avisosAuvo.length)warnings.push('A ligação desta unidade com o histórico do Auvo (cliente Auvo nº '+[...new Set(avisosAuvo)].join(', ')+') continua guardada com a unidade, só para consulta. Para ligar a unidade a outro cliente, use Unidade → Transferir; para tirá-la de uso, Inativar ou Excluir.');"""),
("""        // 2026-10-15: a maioria das tarefas nunca é finalizada no Auvo (160 de 224), então a trava antiga
        // tornava o painel inutilizável. Só trava quando o CLIENTE do equipamento/unidade muda (aí a tarefa
        // aberta ficaria apontando o cliente antigo); juntar/mover dentro do mesmo cliente vira aviso.
        if(name==='AUVO_TAREFAS'){
          const abertas=matches.filter(r=>text(r.FINALIZADA)!=='SIM');
          const clienteMuda=changes.some(c=>c.field==='CLIENTE_ID'&&(c.table==='CAD_EQUIPAMENTOS'||c.table==='CAD_UNIDADES'));
          const lista=abertas.map(r=>text(r.AUVO_TASK_ID)).filter(Boolean).slice(0,15).join(', ');
          if(abertas.length&&clienteMuda)blocks.push('Há '+abertas.length+' tarefa(s) do Auvo em aberto ligadas a este cadastro'+(lista?' (nº '+lista+')':'')+'. Como o cliente vai mudar, finalize ou exclua essas tarefas no Auvo, sincronize e confira de novo.');
          else if(abertas.length)warnings.push(abertas.length+' tarefa(s) do Auvo em aberto'+(lista?' (nº '+lista+')':'')+' continuam válidas: o cliente e os equipamentos não mudam de cadastro.');
        }
""",
 """        // 18/11/2026: Auvo descontinuado pelo dono. Tarefa do Auvo (aberta ou não) não trava mais nada: é histórico e fica com o
        // cadastro original, como os demais registros históricos (contados em "historical").
"""),
("""      // 21/10/2026: duas referências deixam de impedir a exclusão, sem apagar nada:
      // - a ligação com o Auvo criada pelo próprio SGO+ (CHAVE sem ":AUVOID:") fica guardada, marcada CADASTRO_EXCLUIDO;
      //   a ligação que veio do Auvo (o cadastro original, "vale o original") ou com tarefa do Auvo nesse cliente impede;""",
 """      // 21/10/2026: duas referências deixam de impedir a exclusão, sem apagar nada:
      // - a ligação com o Auvo fica guardada, marcada CADASTRO_EXCLUIDO (18/11/2026: o Auvo foi descontinuado pelo dono, então a
      //   ligação que veio do Auvo, "vale o original", e a tarefa do Auvo nesse cliente deixaram de impedir: são só histórico);"""),
("""      const presos=[...new Set(originais.concat(spec.tipo==='UNIDADE'?comTarefa:[]))];""",
 """      const presos=[]; // 18/11/2026: Auvo descontinuado; nenhuma ligação com o Auvo prende mais o cadastro (originais e comTarefa ficam só para o registro)"""),
("""AUVO_SYNC:'Integração com o Auvo',AUVO_TAREFAS:'Atendimentos do Auvo',""", """AUVO_SYNC:'Histórico do Auvo (ligações)',AUVO_TAREFAS:'Histórico do Auvo (atendimentos)',"""),
("""        if(nAuvo.length)warnings.push('A ligação deste cadastro com o Auvo (cliente Auvo nº '+nAuvo.join(', ')+') fica guardada como de cadastro excluído, para consulta. Se esse cliente não existe de fato, exclua ou inative também no Auvo; se o Auvo abrir tarefa nele, ela aparece pendente em Integração Auvo.');""",
 """        if(nAuvo.length)warnings.push('A ligação deste cadastro com o histórico do Auvo (cliente Auvo nº '+nAuvo.join(', ')+') fica guardada como de cadastro excluído, só para consulta.');"""),
("depois da sua prévia (ou a sincronização do Auvo rodou). Por segurança", "depois da sua prévia. Por segurança"),
]
