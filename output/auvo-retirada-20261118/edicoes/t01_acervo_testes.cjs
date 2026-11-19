/* ---------------- testes (18/11/2026: Auvo descontinuado pelo dono) ---------------- */

test('retirada: contar, copiar, pausar, continuar, repetir falhas e conferir recusam sem chamar o Auvo e sem agendar nada', () => {
  const e = ambiente();
  for (const fn of ['apiIniciarContagem', 'apiIniciarCopia', 'apiPausar', 'apiContinuar', 'apiTentarDeNovo', 'apiConferir']) {
    assert.throws(() => e.api('s_adm', fn, { inicio: '2022-01' }), /O Auvo foi descontinuado em 18\/11\/2026/, fn);
  }
  assert.throws(() => e.ctx.AuvoAcervo_getAuvo_('/tasks?page=1'), /descontinuado/);
  e.ctx.AuvoAcervo_agendar_(5000);
  assert.equal(e.pedidos.length, 0, 'nenhuma chamada ao Auvo');
  assert.equal(e.gatilhos.length, 0, 'nenhum gatilho agendado');
  assert.equal(e.fotoAtual, JSON.stringify(e.atual._linhas), 'AUVO_TAREFAS intacta');
});

test('retirada: o gatilho antigo da cópia, se ainda estiver na agenda, só se remove (não lê o Auvo)', () => {
  const e = ambiente();
  e.gatilhos.push({ fn: 'AuvoAcervo_loteGatilho' }, { fn: 'AuvoAcervo_loteGatilho' }, { fn: 'Outra_rotina' });
  const r = e.ctx.AuvoAcervo_loteGatilho();
  assert.equal(r.removidos, 2);
  assert.deepEqual(e.gatilhos.map((g) => g.fn), ['Outra_rotina']);
  assert.equal(e.pedidos.length, 0);
});

test('acesso: só Administrador e Diretoria consultam o histórico; gestor não vê', () => {
  const e = ambiente();
  assert.equal(e.api('s_ges', 'apiPodeVer').pode, false);
  assert.equal(e.api('s_dir', 'apiPodeVer').pode, true);
  assert.throws(() => e.api('s_ges', 'apiStatus'), /Administrador e da Diretoria/);
  assert.throws(() => e.api('s_ges', 'apiConsultarTarefa', { taskId: '1' }), /Administrador e da Diretoria/);
  assert.throws(() => e.api('sessao-falsa', 'apiStatus'), /Sessão inválida/);
  assert.equal(e.ctx.AuvoAcervo_obterConteudo('s_ges'), '');
  assert.match(e.ctx.AuvoAcervo_obterConteudo('s_adm'), /acvCard/);
  assert.equal(e.pedidos.length, 0, 'nenhuma chamada ao Auvo');
});

test('consulta: situação, falhas e tarefa copiada (com fotos e registro completo) continuam abrindo, sem o Auvo', () => {
  const e = ambiente();
  const cfg = e.ctx.AUVO_ACERVO_CFG, cols = e.ctx.AUVO_ACERVO_COLS;
  const raiz = e.ctx.DriveApp.getRootFolder();
  const foto = raiz.createFile(e.ctx.Utilities.newBlob('FOTO', 'image/jpeg', 'foto_1001.jpg'));
  const json = raiz.createFile(e.ctx.Utilities.newBlob(JSON.stringify({ taskID: 1001, orientation: 'Troca de peça' }), 'application/json', 'tarefa_1001.json'));
  const tT = e.ctx.AuvoAcervo_tabela_(cfg.ABA_TAREFAS, cols.TAREFAS, 'AUVO_TASK_ID');
  e.ctx.AuvoAcervo_inserir_(tT, [{ AUVO_TASK_ID: '1001', DATA_TAREFA: '2024-01-05T08:00:00', TIPO_TAREFA: 'Manutenção preventiva', CLIENTE_NOME: 'CLINICA TESTE 0',
    TECNICO_NOME: 'TECNICO TESTE', FINALIZADA: 'SIM', JSON_VERSAO: 1, JSON_TAMANHO: 120, JSON_ARQUIVO_ID: json.getId(), CONFERENCIA: 'OK' }]);
  const tA = e.ctx.AuvoAcervo_tabela_(cfg.ABA_ARQUIVOS, cols.ARQUIVOS, 'CHAVE');
  e.ctx.AuvoAcervo_inserir_(tA, [
    { CHAVE: '1001|f1', AUVO_TASK_ID: '1001', TIPO: 'FOTO', PERGUNTA: 'Foto do equipamento', NOME_ARQUIVO: 'foto_1001.jpg', ARQUIVO_ID: foto.getId(), SITUACAO: 'COPIADO', TAMANHO: 4 },
    { CHAVE: '1001|f2', AUVO_TASK_ID: '1001', TIPO: 'FOTO', PERGUNTA: 'Foto 2', SITUACAO: 'FALHA', MOTIVO: 'HTTP 404', TENTATIVAS: 3, URL_ORIGINAL: IMG + 'x.jpg' }]);
  e.props[cfg.PROP_ESTADO] = JSON.stringify({ modo: 'COPIA', situacao: 'CONCLUIDO', fase: 'FIM', inicio: '2022-01', fim: '2026-10' });
  const st = e.api('s_dir', 'apiStatus');
  assert.equal(st.ok, true); assert.equal(st.estado.situacao, 'CONCLUIDO');
  const f = e.api('s_adm', 'apiListarFalhas', {});
  assert.equal(f.total, 1); assert.equal(f.itens[0].motivo, 'HTTP 404');
  const t = e.api('s_dir', 'apiConsultarTarefa', { taskId: '1001' });
  assert.equal(t.achou, true);
  assert.equal(t.tarefa.tipo, 'Manutenção preventiva');
  assert.match(t.jsonPrevia, /Troca de peça/);
  assert.ok(t.arquivos.some((a) => a.link && /foto_1001/.test(a.nome)));
  assert.equal(e.api('s_dir', 'apiConsultarTarefa', { taskId: '999' }).achou, false);
  assert.equal(e.pedidos.length, 0, 'nada sai para o Auvo');
});

test('tela: "Histórico do Auvo" somente consulta (sem botões que falem com o Auvo), script válido; ajuda "auvo_historico"', () => {
  const src = fs.readFileSync(path.join(base, 'SGO_AuvoAcervo_Tela.js'), 'utf8');
  const corpo = src.slice(src.indexOf('`') + 1, src.lastIndexOf('`'));
  assert.ok(!corpo.includes('\\') && !corpo.includes('`') && !corpo.includes('${'));
  const script = /<script>([\s\S]*?)<\/script>/.exec(corpo)[1];
  assert.doesNotThrow(() => new Function(script));
  for (const fn of ['acv_consultar', 'acv_falhas', 'acv_ajuda', 'acv_atualizar']) assert.ok(script.includes('function ' + fn + '('), fn);
  for (const fn of ['acv_contar', 'acv_copiar', 'acv_repetir', 'acv_acao']) assert.ok(!script.includes('function ' + fn + '('), 'saiu: ' + fn);
  for (const botao of ['Contar o acervo', 'Iniciar cópia', 'Pausar', 'Continuar', 'Tentar de novo as falhas', 'Conferir arquivos']) {
    assert.ok(!corpo.includes('>' + botao + '</button>'), 'botão saiu: ' + botao);
  }
  assert.match(script, /Histórico do Auvo \(sistema descontinuado em 18\/11\/2026\) — somente consulta/);
  assert.match(script, /Ajuda_abrir_\('auvo_historico'\)/);
  const ctx = vm.createContext({});
  vm.runInContext(fs.readFileSync(path.join(base, 'SGO_Ajuda_Auvo.js'), 'utf8'), ctx);
  const a = ctx.SGO_ajudaTelas_Auvo_().auvo_historico;
  assert.ok(a && a.titulo && a.passos.length >= 2);
  const texto = JSON.stringify(a);
  for (const botao of ['Atualizar', 'Consultar']) assert.ok(texto.includes('\\"' + botao + '\\"'), 'ajuda cita o botão ' + botao);
  assert.ok(!/<[a-z]/i.test(texto), 'texto puro');
  const js = fs.readFileSync(path.join(base, 'JS_Auvo.html'), 'utf8');
  assert.match(js, /AuvoAcervo_obterConteudo\(/);
  assert.doesNotMatch(js, /Auvo_obterConteudoModulo/);
});
