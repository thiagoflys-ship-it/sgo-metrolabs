/* =====================================================================
   FINANCEIRO v2 — páginas (exceto o Painel, em fv-painel.js).
   Cada página: cabeçalho (título, objetivo, botões) → barra da empresa →
   indicadores → conteúdo principal → ações. Dados fictícios.
   ===================================================================== */
function FinPag_inicio_(div, titulo, sub, botoes, barraOpc) {
  div.innerHTML = '<div class="module-shell">' + Fin_cabecalho_(titulo, sub, botoes) + Fin_barra_(barraOpc) + '<div id="fvCorpo"></div></div>';
  return Fin_$_("fvCorpo");
}
function FinPag_podeAprovar_() { return FV.papel !== "WANESSA"; }

/* ---------------- CONTAS A RECEBER ---------------- */
function FinPag_receber_(div) {
  var c = FinPag_inicio_(div, "Contas a receber", "Títulos de clientes das três empresas, com a situação da cobrança no banco. Recebimento por Pix ou boleto do próprio banco é baixado sozinho pela conciliação; o resto se resolve daqui, sem abrir o Omie.",
    Fin_btn_("Nova conta a receber", "fa-plus", "btn-primary") + Fin_btn_("Emitir boletos", "fa-barcode"), { periodo: true });
  var L = Fin_daEmpresa_(FV_DADOS.receber), ab = L.filter(function (r) { return r.saldo > 0; }), venc = ab.filter(function (r) { return r.atraso > 0; });
  c.innerHTML = '<div class="fv-grade fv-g4">' +
    Fin_kpi_({ rotulo: "Em aberto", valor: Fin_moeda_(Fin_soma_(ab, "saldo")), detalhe: ab.length + " títulos", sit: "neutro" }) +
    Fin_kpi_({ rotulo: "Vencido", valor: Fin_moeda_(Fin_soma_(venc, "saldo")), detalhe: venc.length + " títulos · " + Fin_pct_(Fin_soma_(venc, "saldo") / (Fin_soma_(ab, "saldo") || 1) * 100, 1) + " do aberto", sit: "critico" }) +
    Fin_kpi_({ rotulo: "Recebido no mês", valor: Fin_moeda_(336870.66), detalhe: "62 % baixado sozinho pela conciliação", sit: "ok" }) +
    Fin_kpi_({ rotulo: "Cobrança com problema", valor: L.filter(function (r) { return r.cobranca === "Erro no banco" || r.cobranca === "A emitir"; }).length + " títulos", detalhe: "Boleto a emitir ou recusado pelo banco", sit: "aviso" }) + "</div>" +
    '<div class="cm-tabs"><button class="cm-tab active" type="button">Em aberto</button><button class="cm-tab" type="button">Vencidos</button><button class="cm-tab" type="button">Recebidos</button><button class="cm-tab" type="button">Todos</button></div><div id="fvTabRec"></div>';
  Fin_tabela_(Fin_$_("fvTabRec"), { id: "fvRec", csv: "contas-a-receber", selecao: true, grupos: [{ k: "cliente", t: "Cliente" }, { k: "emp", t: "Empresa" }, { k: "situacao", t: "Situação" }],
    linhas: ab.slice().sort(function (a, b) { return a.venc - b.venc; }),
    colunas: [{ k: "emp", t: "Empresa", fmt: function (v) { return Fin_emp_(v); } }, { k: "cliente", t: "Cliente", mob: "titulo", fmt: function (v, l) { return "<b>" + Fin_esc_(v) + '</b><br><span class="cm-meta">' + Fin_esc_(l.doc) + "</span>"; } },
      { k: "venc", t: "Vencimento", fmt: function (v, l) { return Fin_esc_(Fin_data_(v)) + (l.atraso ? '<br><span class="cm-meta fv-neg">' + l.atraso + " dias</span>" : ""); } },
      { k: "valor", t: "Valor", n: true, soma: true, mob: "oculto" }, { k: "saldo", t: "Saldo", n: true, soma: true, mob: "valor" },
      { k: "forma", t: "Forma" }, { k: "cobranca", t: "Cobrança", fmt: function (v) { return Fin_seloSit_(v); } }, { k: "situacao", t: "Situação", fmt: function (v) { return Fin_seloSit_(v); } }],
    acoes: function (l) { return l.saldo ? '<button type="button" class="btn-secondary">2ª via</button><button type="button" class="btn-secondary">Baixar</button>' : '<button type="button" class="btn-secondary">Ver</button>'; },
    lote: function (sel) { return '<div class="fv-sel-lote"><span>' + sel.length + " selecionados · <b>" + Fin_moeda_(Fin_soma_(sel, "saldo")) + '</b></span><span style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn-secondary">Enviar 2ª via por e-mail</button><button type="button" class="btn-secondary">Emitir boleto</button></span></div>'; } });
}

/* ---------------- CONTAS A PAGAR ---------------- */
function FinPag_pagar_(div) {
  var c = FinPag_inicio_(div, "Contas a pagar", "Tudo o que a empresa deve, do lançamento ao comprovante. A conta só vai para o lote das 09:00 depois de aprovada pelo dono ou pelo Charles e com os dados de pagamento conferidos.",
    Fin_btn_("Ler boleto ou nota (PDF)", "fa-wand-magic-sparkles") + Fin_btn_("Nova conta a pagar", "fa-plus", "btn-primary", 'data-fv-acao="nova-pagar"'), { periodo: true });
  var L = Fin_daEmpresa_(FV_DADOS.pagar), ab = L.filter(function (p) { return p.estado !== "Pago"; });
  var hoje = ab.filter(function (p) { return Fin_difDias_(p.venc) === 0; }), venc = ab.filter(function (p) { return Fin_difDias_(p.venc) < 0; }), sem = ab.filter(function (p) { return p.dados === "Sem dados de pagamento"; });
  var aprovados = ab.filter(function (p) { return p.estado === "Aprovado"; });
  c.innerHTML = Fin_faixa_("ok", '<b>Próximo lote: amanhã, 09:00.</b> ' + aprovados.length + " contas aprovadas · " + Fin_moeda_(Fin_soma_(aprovados, "valor")) + " · limite diário da Matriz " + Fin_moeda_(150000) + " (" + Fin_pct_(Fin_soma_(aprovados, "valor") / 150000 * 100, 0) + " usado). O que passar do limite volta para nova aprovação.") +
    '<div class="fv-grade fv-g4">' +
    Fin_kpi_({ rotulo: "Vence hoje", valor: Fin_moeda_(Fin_soma_(hoje, "valor")), detalhe: hoje.length + " contas · " + hoje.filter(function (p) { return p.estado === "Aprovado"; }).length + " aprovadas", sit: "neutro" }) +
    Fin_kpi_({ rotulo: "Aguardando aprovação", valor: Fin_moeda_(Fin_soma_(ab.filter(function (p) { return p.estado === "Aguardando aprovação"; }), "valor")), detalhe: ab.filter(function (p) { return p.estado === "Aguardando aprovação"; }).length + " contas com o dono ou o Charles", sit: "aviso" }) +
    Fin_kpi_({ rotulo: "Vencido (deveria ser zero)", valor: Fin_moeda_(Fin_soma_(venc, "valor")), detalhe: venc.length + " contas; confira se foram pagas fora do SGO+", sit: "critico" }) +
    Fin_kpi_({ rotulo: "Sem dados de pagamento", valor: sem.length + " contas", detalhe: "Não entram no lote até ter Pix, boleto ou conta conferida", sit: "aviso" }) + "</div>" +
    '<div class="cm-tabs"><button class="cm-tab active" type="button">A pagar</button><button class="cm-tab" type="button">Aguardando aprovação</button><button class="cm-tab" type="button">Aprovados (lote 09:00)</button><button class="cm-tab" type="button">Pagos</button><button class="cm-tab" type="button">Recusados pelo banco</button></div><div id="fvTabPag"></div>';
  Fin_tabela_(Fin_$_("fvTabPag"), { id: "fvPag", csv: "contas-a-pagar", selecao: true, grupos: [{ k: "fornecedor", t: "Fornecedor" }, { k: "categoria", t: "Categoria" }, { k: "emp", t: "Empresa" }, { k: "estado", t: "Situação" }],
    linhas: ab.slice().sort(function (a, b) { return a.venc - b.venc; }),
    colunas: [{ k: "emp", t: "Empresa", fmt: function (v) { return Fin_emp_(v); } }, { k: "fornecedor", t: "Fornecedor", larg: "22%", mob: "titulo", fmt: function (v, l) { return "<b>" + Fin_esc_(v) + '</b><br><span class="cm-meta">' + Fin_esc_(l.categoria) + "</span>"; } },
      { k: "venc", t: "Vencimento", fmt: function (v) { var d = Fin_difDias_(v); return Fin_esc_(Fin_data_(v)) + (d < 0 ? '<br><span class="cm-meta fv-neg">vencida</span>' : d === 0 ? '<br><span class="cm-meta">hoje</span>' : ""); } },
      { k: "valor", t: "Valor", n: true, soma: true, mob: "valor" }, { k: "forma", t: "Forma" }, { k: "dados", t: "Dados de pagamento", fmt: function (v) { return Fin_seloSit_(v); } },
      { k: "estado", t: "Situação", fmt: function (v) { return Fin_seloSit_(v); } }, { k: "anexo", t: "Anexo", filtro: false, mob: "oculto", fmt: function (v) { return v ? '<i class="fas fa-paperclip" aria-label="tem anexo"></i>' : '<span class="cm-meta">—</span>'; } }],
    acoes: function (l) { return l.estado === "A enviar" ? '<button type="button" class="btn-secondary">Enviar</button>' : '<button type="button" class="btn-secondary">Ver</button>'; },
    lote: function (sel) { return '<div class="fv-sel-lote"><span>' + sel.length + " selecionadas · <b>" + Fin_moeda_(Fin_soma_(sel, "valor")) + '</b></span><span style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn-primary">Enviar para aprovação</button><button type="button" class="btn-secondary">Mudar conta pagadora</button></span></div>'; } });
}

/* ---------------- APROVAÇÕES ---------------- */
function FinPag_aprovacoes_(div) {
  var pode = FinPag_podeAprovar_();
  var c = FinPag_inicio_(div, "Aprovações", "Toda saída de dinheiro passa por aqui: pagamentos, tarifas e débitos automáticos, transferências e troca de dados bancários de fornecedor. Só o dono e o Charles aprovam; quem enviou não aprova o próprio item.",
    pode ? Fin_btn_("Aprovar selecionados", "fa-check-double", "btn-primary", 'data-fv-acao="aprovar-lote"') : "");
  var L = Fin_daEmpresa_(FV_DADOS.aprovacoes);
  var h = Fin_faixa_("", "<b>Regra em vigor:</b> limite sem aprovação <b>R$ 0,00</b> (tudo é aprovado). Aprovados saem no lote das <b>09:00</b> do dia do vencimento. Mudar a regra: Empresas e bancos › Regras (só o dono).");
  if (!pode) h += Fin_trava_("Você vê a fila, mas os botões Aprovar e Recusar não aparecem para você.", "A aprovação de pagamentos é exclusiva do dono e do Charles (decisão de 16/11), e quem prepara não aprova.", "Confira se cada item tem anexo e dados de pagamento conferidos. Se algo estiver errado, use \"Retirar da fila\" e corrija antes que o dono ou o Charles abram.");
  h += '<div class="cm-tabs">' + [["Todos", L.length], ["Pagamentos", 4], ["Tarifas e débitos", 2], ["Transferências", 1], ["Dados bancários", 1]].map(function (t, i) { return '<button type="button" class="cm-tab' + (i === 0 ? " active" : "") + '">' + t[0] + " (" + t[1] + ")</button>"; }).join("") + "</div>";
  h += '<div class="cm-lista">' + L.map(function (a) {
    var etapas = a.tipo === "Dados bancários" ? [["Pedido", "Wanessa"], ["Conferência", "automática"], ["Aprovação", "dono ou Charles"], ["Gravado no Omie", "histórico"]] : a.tipo === "Tarifa ou débito" ? [["Débito no extrato", "banco"], ["Categoria sugerida", "regra"], ["Aprovação", "dono ou Charles"], ["Lançado e conciliado", "Omie"]] : FV_ETAPAS_PAG;
    return '<article class="fv-card-op' + (a.risco ? " erro" : "") + '"><div class="fv-card-op-cab">' + (pode ? '<input type="checkbox" aria-label="Selecionar ' + Fin_esc_(a.quem) + '"' + (a.risco ? "" : " checked") + ">" : '<span></span>') +
      '<div><div class="t">' + Fin_esc_(a.quem) + '</div><div class="cm-meta">' + Fin_emp_(a.emp) + " · " + Fin_esc_(a.tipo) + " · " + Fin_esc_(a.desc) + "</div></div>" +
      '<div class="valor">' + (a.valor ? Fin_moeda_(a.valor) : "—") + "<small>" + (a.venc ? "vence " + Fin_data_(a.venc) : "sem valor") + "</small></div></div>" +
      '<p class="cm-txt" style="margin:8px 0 0"><i class="fas fa-shield-halved" aria-hidden="true" style="color:var(--success)"></i> ' + Fin_esc_(a.forma + " · " + a.dados) + (a.anexo ? ' · <a class="fv-link" href="#" onclick="return false"><i class="fas fa-paperclip" aria-hidden="true"></i> ' + Fin_esc_(a.anexo) + "</a>" : "") + "</p>" +
      (a.risco ? Fin_trava_("A nova chave Pix pertence a outro CNPJ, não ao fornecedor.", "Troca de dados bancários por terceiro é o golpe mais comum em pagamento a fornecedor.", "Ligue para o fornecedor no telefone do cadastro (não no da mensagem) antes de aprovar. Sem confirmação, recuse.", true) : "") +
      Fin_tempo_(etapas, a.etapa, null, a.tipo === "Pagamento" ? ["Wanessa", "conferido", "aguardando", "09:00 de " + Fin_data_(a.venc || FV_HOJE), "Omie"] : null) +
      '<div class="cm-meta" style="margin-top:6px">Enviado por ' + Fin_esc_(a.enviado) + "</div>" +
      '<div class="cm-acoes">' + (pode ? Fin_btn_("Aprovar", "fa-check", "btn-primary", 'data-fv-acao="aprovar-um"') + Fin_btn_("Recusar", "fa-xmark", "btn-secondary") + Fin_btn_("Pedir ajuste", "fa-comment", "btn-secondary") : Fin_btn_("Retirar da fila", "fa-rotate-left", "btn-secondary")) + "</div></article>";
  }).join("") + "</div>";
  c.innerHTML = h;
}

/* ---------------- BANCOS E SALDOS ---------------- */
function FinPag_bancos_(div) {
  var c = FinPag_inicio_(div, "Bancos e saldos", "Saldo e extrato de cada conta, por empresa. Contas com a API do banco ligada atualizam sozinhas a cada 30 minutos; as demais mostram o último saldo do Omie ou do arquivo OFX, sempre com a hora.",
    Fin_btn_("Importar OFX ou CSV", "fa-file-import") + Fin_btn_("Ler saldos agora", "fa-rotate", "btn-primary"), { atualizado: "Sicredi às 10:30 · próxima leitura 11:00" });
  var D = FV_DADOS, emps = FV.emp === "TODAS" ? D.empresas : D.empresas.filter(function (e) { return e.id === FV.emp; });
  var h = "";
  emps.forEach(function (e) {
    var cs = D.contas.filter(function (x) { return x.emp === e.id; });
    h += '<section class="fv-caixa" style="margin-bottom:12px"><div class="fv-caixa-cab"><h3><span class="fv-emp ' + e.classe + '" style="font-size:14px">' + Fin_esc_(e.apelido) + '</span><span class="s">' + Fin_esc_(e.nome + " · CNPJ " + e.cnpj) + '</span></h3><span class="fv-num" style="font-size:18px;font-weight:600">' + Fin_moeda_(Fin_soma_(cs.filter(function (x) { return !x.aplicacao; }), "saldo")) + "</span></div>" +
      '<div class="fv-grade fv-g3" style="margin:0">' + cs.map(function (x) {
        var corpo = '<div class="fv-conta" style="border:0;padding-top:0"><span class="fv-banco">' + x.banco + '</span><span><span class="n">' + Fin_esc_(x.apelido) + '</span><span class="m">ag. ' + x.ag + " · c/c " + x.conta + '</span></span><span class="s">' + Fin_moeda_(x.saldo) + "<small>" + Fin_esc_(x.fonte) + "</small></span></div>" +
          '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">' + Fin_conector_(x.conector) + (x.conector === "ligado" ? Graf_sparkline_([380, 395, 372, 410, 402, 420, 398, 405, 412]) : "") + "</div>";
        if (x.conector === "ligado") corpo += '<div class="fv-cap" style="margin-top:8px">' + ["saldo", "extrato", "Pix", "boleto", "pagar"].map(function (k) { return "<span>" + k + "</span>"; }).join("") + '</div><p class="cm-meta" style="margin:8px 0 0">Extrato: ' + Fin_esc_(x.extratoEm) + " · " + x.naoConc + " a conciliar</p>";
        else if (x.conector === "falta") corpo += Fin_estado_("credencial", "Falta credencial do " + x.bancoNome, "Sem a chave, o saldo vem do Omie e o extrato precisa de arquivo OFX. Falta gravar: <b>" + Fin_esc_(x.falta) + "</b>. O dono grava em Chaves e senhas; nenhum valor de chave aparece aqui.", Fin_btn_("Importar OFX", "fa-file-import") + Fin_btn_("O que pedir ao banco", "fa-circle-question"));
        else corpo += '<p class="cm-meta fv-just" style="margin:8px 0 0">' + (x.aplicacao ? "Aplicação: fica fora do caixa disponível e da previsão. Resgate e aplicação viram transferência, nunca receita." : "Este banco não oferece API para a conta. O extrato entra por arquivo OFX; o último foi " + Fin_esc_(x.extratoEm) + ".") + "</p>";
        return '<div class="fv-caixa" style="background:var(--bc-surface-2)">' + corpo + "</div>";
      }).join("") + "</div></section>";
  });
  h += Fin_caixa_("Extrato · Sicredi Matriz (últimos movimentos)", "Lido pela API às 10:30 · conciliado = já tem par baixado no Omie", '<div id="fvTabExt"></div>');
  c.innerHTML = h;
  Fin_tabela_(Fin_$_("fvTabExt"), { id: "fvExt", csv: "extrato-sicredi-matriz", linhas: FV_DADOS.extrato.filter(function (e) { return e.conta === "c1"; }).map(function (e) { return { data: e.data + " " + e.hora, desc: e.desc, doc: e.doc || "—", valor: e.valor, sit: e.nivel === "certo" ? "Conciliado" : e.nivel === "sug" ? "Sugerido" : "Para conferir" }; }),
    colunas: [{ k: "data", t: "Data" }, { k: "desc", t: "Descrição", mob: "titulo" }, { k: "doc", t: "CPF/CNPJ" }, { k: "valor", t: "Valor", n: true, soma: true, mob: "valor", fmt: function (v) { return '<span class="fv-num ' + (v < 0 ? "fv-neg" : "fv-pos") + '">' + Fin_moeda_(v) + "</span>"; } }, { k: "sit", t: "Conciliação", fmt: function (v) { return Fin_selo_(v, v === "Conciliado" ? "verde" : v === "Sugerido" ? "azul" : "laranja"); } }] });
}

/* ---------------- CONCILIAÇÃO ---------------- */
function FinPag_conciliacao_(div) {
  var c = FinPag_inicio_(div, "Conciliação", "Cada movimento do extrato ao lado do título que o SGO+ acha que é o par, com o motivo e a pontuação. Confirmar baixa e concilia no Omie com o mesmo código, sem lançar duas vezes.",
    Fin_btn_("Importar OFX ou CSV", "fa-file-import") + Fin_btn_("Confirmar todos os sugeridos (3)", "fa-check-double", "btn-primary"));
  var L = Fin_daEmpresa_(FV_DADOS.extrato);
  var h = Fin_faixa_("aviso", "<b>Modo sugerir até 03/12/2026.</b> Nas duas primeiras semanas nada é baixado sozinho, nem com 100 pontos: tudo espera o seu toque, e o SGO+ mede quantas sugestões você confirmou sem mudar (hoje 94 % de 212). Depois disso o dono decide se liga o automático para os casos de certeza.");
  h += '<div class="fv-grade fv-g4">' + Fin_kpi_({ rotulo: "Certeza (100 pontos)", valor: "4", detalhe: "Pix e boleto emitidos pelo SGO+ · esperando confirmação no modo sugerir", sit: "ok" }) + Fin_kpi_({ rotulo: "Sugeridos", valor: "12", detalhe: "60 a 95 pontos, um candidato", sit: "neutro" }) + Fin_kpi_({ rotulo: "Para conferir", valor: "9", detalhe: "Empate, parcial ou sem candidato", sit: "aviso" }) + Fin_kpi_({ rotulo: "Conciliados hoje", valor: "23", detalhe: "Desfazer: só o dono ou o Charles, pela trilha", sit: "ok" }) + "</div>";
  h += '<div class="cm-filtros"><div><label for="fvConta">Conta</label><select id="fvConta"><option>Todas as contas da seleção</option><option>Sicredi Matriz (7)</option><option>Sicoob Matriz (12, OFX)</option><option>Itaú Matriz (31, OFX atrasado)</option></select></div><div><label for="fvNivel">Mostrar</label><select id="fvNivel"><option>Sugeridos e para conferir</option><option>Só certeza</option><option>Só para conferir</option></select></div></div>';
  h += L.map(function (e) {
    var cls = e.nivel === "certo" ? "certo" : e.nivel === "sug" ? "sug" : "conferir";
    var cands = e.cands.length ? e.cands.map(function (k, i) {
      return '<div class="fv-cand' + (i === 0 ? " escolhido" : "") + '"><span><b>' + Fin_esc_(k.t) + '</b><br><span class="cm-meta">vence ' + k.venc + "</span></span><span class=\"fv-num\" style=\"text-align:right;font-weight:600\">" + Fin_moeda_(k.v) + '<br><span class="cm-meta">' + k.pts + ' pontos<span class="fv-barra-pts"><i style="width:' + k.pts + '%"></i></span></span></span><span class="por">' + k.por.map(function (p) { return '<b><i class="fas fa-check" aria-hidden="true"></i> ' + Fin_esc_(p) + "</b>"; }).join(" · ") + (k.dif ? ' · <s><i class="fas fa-triangle-exclamation" aria-hidden="true"></i> ' + Fin_esc_(k.dif) + "</s>" : "") + "</span></div>";
    }).join("") : Fin_estado_("vazio", "Nenhum título combina", "Pix de pessoa física sem cobrança emitida. Pelo CPF, o SGO+ não achou cliente. Escolha o que este dinheiro é:", Fin_btn_("Lançar título novo", "fa-plus") + Fin_btn_("Recebimento avulso", "fa-hand-holding-dollar") + Fin_btn_("Devolver o Pix", "fa-rotate-left"));
    return '<div class="fv-conc ' + cls + '"><div class="fv-conc-lado"><h4>Extrato · ' + Fin_esc_(FV_DADOS.contas.filter(function (x) { return x.id === e.conta; })[0].apelido) + "</h4>" + '<div class="fv-mov-v ' + (e.valor < 0 ? "fv-neg" : "fv-pos") + '">' + Fin_moeda_(e.valor) + '</div><div class="cm-txt"><b>' + Fin_esc_(e.desc) + '</b></div><div class="cm-meta">' + e.data + " às " + e.hora + (e.doc ? " · " + Fin_esc_(e.doc) : "") + " · " + Fin_emp_(e.emp) + "</div></div>" +
      '<div class="fv-conc-meio" aria-label="' + e.pts + ' pontos"><span class="pts">' + (cls === "certo" ? "certeza" : cls === "sug" ? "sugerido" : "conferir") + " · " + e.pts + "</span></div>" +
      '<div class="fv-conc-lado"><h4>Título no Omie</h4>' + cands + (e.cands.length ? '<div class="cm-acoes">' + Fin_btn_(e.cands[0].dif && e.valor > 0 ? "Confirmar com juros" : "Confirmar", "fa-check", "btn-primary") + (e.cands.length > 1 ? Fin_btn_("Escolher o outro", "fa-right-left") : "") + Fin_btn_("Não é este", "fa-xmark") + "</div>" : "") + "</div></div>";
  }).join("");
  c.innerHTML = h;
}

/* ---------------- TRANSFERÊNCIAS ---------------- */
function FinPag_transferencias_(div) {
  var c = FinPag_inicio_(div, "Transferências", "Entre contas da mesma empresa e entre as empresas do grupo. Entre empresas não é transferência contábil: o SGO+ registra o mútuo nos dois lados com o mesmo código, e o consolidado tira o valor da receita e da despesa.", "");
  var emp = FV.emp === "TODAS" ? "MATRIZ" : FV.emp;
  var h = '<div class="fv-grade fv-g2"><section class="fv-caixa"><div class="fv-caixa-cab"><h3>Nova transferência</h3></div>' +
    (FV.emp === "TODAS" ? Fin_faixa_("aviso", "Você está vendo <b>Todas</b>. Para transferir, a origem precisa de uma empresa: o formulário já começa na Matriz e mostra a cor dela.") : "") +
    '<div class="fv-form-empresa ' + emp.toLowerCase() + '"><span class="fv-pt ' + emp.toLowerCase() + '"></span><span>Saindo de <b>' + FV_EMP_NOME[emp] + "</b></span></div>" +
    '<div class="cm-grade2"><div class="cm-campo"><label for="tOrig">Conta de origem</label><select id="tOrig"><option>Sicredi Matriz · saldo R$ 412.380,55</option><option>Itaú Matriz · saldo do Omie R$ 58.220,90</option></select></div>' +
    '<div class="cm-campo"><label for="tDest">Conta de destino</label><select id="tDest"><option>Prestadora · Sicredi Prestadora</option><option>Matriz · Caixa Matriz</option><option>Filial · Sicredi Filial</option></select></div>' +
    '<div class="cm-campo"><label for="tVal">Valor</label><input id="tVal" inputmode="decimal" value="25.000,00"></div><div class="cm-campo"><label for="tData">Data</label><input id="tData" type="date" value="2026-11-20"></div></div>' +
    '<div class="cm-campo"><label for="tMot">Motivo (aparece na trilha e no Omie)</label><input id="tMot" value="Repasse para a folha da Prestadora de novembro"></div>' +
    '<div class="cm-caixa" style="background:var(--bc-surface-2)"><h3>Prévia</h3><dl class="cm-det"><dt>Caso</dt><dd>Entre empresas: <b>mútuo</b> (conta a pagar na Matriz e a receber na Prestadora, código TRF-0042)</dd><dt>No banco</dt><dd>Pix pela API do Sicredi Matriz, depois da aprovação</dd><dt>Aprovação</dt><dd>Obrigatória (entre empresas, sempre): dono ou Charles</dd><dt>Saldo depois</dt><dd class="fv-num">R$ 387.380,55 no Sicredi Matriz</dd></dl></div>' +
    '<div class="cm-acoes">' + Fin_btn_("Enviar para aprovação", "fa-paper-plane", "btn-primary") + Fin_btn_("Já transferi no banco (só registrar)", "fa-pen") + "</div></section>" +
    Fin_caixa_("Como cada caso é registrado", "", '<table class="cm-tabela"><thead><tr><th>Caso</th><th>No Omie</th><th>Aprovação</th></tr></thead><tbody>' +
      '<tr><td data-r="Caso">Mesma empresa, duas contas</td><td data-r="No Omie">Transferência entre contas (categoria de transferência)</td><td data-r="Aprovação">Sim (limite sem aprovação: R$ 0,00)</td></tr>' +
      '<tr><td data-r="Caso">Empresas diferentes, mesmo Omie</td><td data-r="No Omie">Mútuo: título a pagar na origem e a receber no destino, baixados no mesmo dia</td><td data-r="Aprovação">Sempre</td></tr>' +
      '<tr><td data-r="Caso">Empresas diferentes, Omies diferentes</td><td data-r="No Omie">Conta a pagar baixada em um, conta a receber baixada no outro, mesmo código</td><td data-r="Aprovação">Sempre</td></tr></tbody></table>') + "</div>";
  h += Fin_caixa_("Últimas transferências", "", '<div class="cm-lista">' + FV_DADOS.transferencias.map(function (t) {
    return '<article class="fv-card-op ' + (t.etapa >= 5 ? "ok" : "") + '"><div class="fv-card-op-cab"><span></span><div><div class="t">' + Fin_esc_(t.de) + ' <i class="fas fa-arrow-right" aria-hidden="true"></i> ' + Fin_esc_(t.para) + '</div><div class="cm-meta">' + t.id + " · " + Fin_esc_(t.caso) + " · " + Fin_data_(t.data) + '</div></div><div class="valor">' + Fin_moeda_(t.valor) + "<small>" + Fin_esc_(t.estado) + "</small></div></div>" +
      Fin_tempo_([["Pedido", "Wanessa"], ["Aprovação", "dono ou Charles"], ["Banco", "Pix/TED"], ["Omie", "dois lados"], ["Conciliado", "extrato"]], t.etapa >= 5 ? 5 : 1) + "</article>";
  }).join("") + "</div>");
  c.innerHTML = h;
}

/* ---------------- COBRANÇA ---------------- */
function FinPag_cobranca_(div) {
  var c = FinPag_inicio_(div, "Cobrança (Pix e boleto)", "Boletos com Pix (híbridos) e cobranças Pix com vencimento emitidos pelo banco da conta de recebimento, e a régua de cobrança dos vencidos. O pagamento do cliente baixa o título sozinho pelo código da cobrança.",
    Fin_btn_("Pix com vencimento", "fa-qrcode") + Fin_btn_("Emitir boleto", "fa-barcode", "btn-primary"), { periodo: true });
  var L = Fin_daEmpresa_(FV_DADOS.receber).filter(function (r) { return r.saldo > 0; });
  c.innerHTML = '<div class="fv-grade fv-g4">' + Fin_kpi_({ rotulo: "Emitidas no mês", valor: "84", detalhe: "52 boletos com Pix · 32 Pix com vencimento", sit: "neutro" }) + Fin_kpi_({ rotulo: "Pagas hoje", valor: Fin_moeda_(22640.5), detalhe: "4 cobranças, já baixadas", sit: "ok" }) +
    Fin_kpi_({ rotulo: "A emitir", valor: L.filter(function (r) { return r.cobranca === "A emitir"; }).length + " títulos", detalhe: "Faturados sem cobrança no banco", sit: "aviso" }) + Fin_kpi_({ rotulo: "Recusadas pelo banco", valor: L.filter(function (r) { return r.cobranca === "Erro no banco"; }).length + "", detalhe: "Motivo do banco em cada linha", sit: "critico" }) + "</div>" +
    '<div class="fv-grade fv-g3">' + Fin_caixa_("Promessas para hoje", "", '<div class="fv-tarefas"><div class="fv-tarefa"><span class="ic info"><i class="fas fa-handshake"></i></span><span><span class="t">Centro Médico Aurora</span><br><span class="m">Prometeu Pix até 16h (falou com o financeiro)</span></span><span class="q">R$ 12.300,00</span></div><div class="fv-tarefa"><span class="ic info"><i class="fas fa-handshake"></i></span><span><span class="t">Clínica Vida Plena</span><br><span class="m">Boleto da 2ª via enviado ontem</span></span><span class="q">R$ 8.840,20</span></div></div>') +
    Fin_caixa_("Promessas quebradas", "", '<div class="fv-tarefas"><div class="fv-tarefa"><span class="ic critico"><i class="fas fa-heart-crack"></i></span><span><span class="t">Hospital São Jerônimo do Norte</span><br><span class="m">Prometido para 18/11 · 64 dias de atraso</span></span><span class="q">R$ 48.210,50</span></div></div>') +
    Fin_caixa_("Sem contato há 7 dias", "", '<div class="fv-tarefas"><div class="fv-tarefa"><span class="ic aviso"><i class="fas fa-phone-slash"></i></span><span><span class="t">5 clientes</span><br><span class="m">O e-mail de cobrança sai do SGO+; WhatsApp só no expediente</span></span><span class="q">R$ 22.140,20</span></div></div>') + "</div>" +
    '<div id="fvTabCob"></div>';
  Fin_tabela_(Fin_$_("fvTabCob"), { id: "fvCob", csv: "cobrancas", grupos: [{ k: "cobranca", t: "Situação da cobrança" }, { k: "cliente", t: "Cliente" }], linhas: L,
    colunas: [{ k: "emp", t: "Empresa", fmt: function (v) { return Fin_emp_(v); } }, { k: "cliente", t: "Cliente", mob: "titulo" }, { k: "doc", t: "Documento" }, { k: "venc", t: "Vencimento" }, { k: "saldo", t: "Valor", n: true, soma: true, mob: "valor" }, { k: "forma", t: "Forma" }, { k: "cobranca", t: "Cobrança no banco", fmt: function (v) { return Fin_seloSit_(v) + (v === "Erro no banco" ? '<br><span class="cm-meta">CEP do pagador inválido</span>' : ""); } }],
    acoes: function (l) { return l.cobranca === "A emitir" ? '<button type="button" class="btn-primary">Emitir</button>' : l.cobranca === "Erro no banco" ? '<button type="button" class="btn-secondary">Corrigir e reenviar</button>' : '<button type="button" class="btn-secondary">2ª via</button><button type="button" class="btn-secondary">Prorrogar</button>'; } });
}

/* ---------------- NOTAS FISCAIS ---------------- */
function FinPag_notas_(div) {
  var c = FinPag_inicio_(div, "Notas fiscais", "NF-e e NFS-e de saída e de entrada das três empresas, com PDF, XML, envio ao cliente e cancelamento. A coluna Título mostra se cada nota tem a conta correspondente: nota sem título trava o fechamento do mês.",
    Fin_btn_("Importar XML de compra", "fa-file-import") + Fin_btn_("Faturar pedido aprovado", "fa-file-invoice-dollar", "btn-primary"), { periodo: true });
  var L = Fin_daEmpresa_(FV_DADOS.notas);
  c.innerHTML = '<div class="fv-grade fv-g4">' + Fin_kpi_({ rotulo: "Emitidas no mês", valor: L.filter(function (n) { return n.tipo !== "NF-e entrada"; }).length + "", detalhe: "NF-e e NFS-e de saída", sit: "neutro" }) + Fin_kpi_({ rotulo: "Recebidas no mês", valor: L.filter(function (n) { return n.tipo === "NF-e entrada"; }).length + "", detalhe: "NF-e de fornecedores", sit: "neutro" }) +
    Fin_kpi_({ rotulo: "Sem título", valor: L.filter(function (n) { return n.titulo === "Sem título"; }).length + "", detalhe: "Trava o fechamento", sit: "aviso" }) + Fin_kpi_({ rotulo: "Não enviadas ao cliente", valor: L.filter(function (n) { return n.enviada === "Não enviada"; }).length + "", detalhe: "PDF + XML + boleto num e-mail só", sit: "aviso" }) + "</div>" +
    '<div class="cm-tabs"><button type="button" class="cm-tab active">Todas</button><button type="button" class="cm-tab">NF-e de saída</button><button type="button" class="cm-tab">NFS-e</button><button type="button" class="cm-tab">NF-e de entrada</button></div><div id="fvTabNf"></div>';
  Fin_tabela_(Fin_$_("fvTabNf"), { id: "fvNf", csv: "notas-fiscais", grupos: [{ k: "tipo", t: "Tipo" }, { k: "quem", t: "Cliente ou fornecedor" }], linhas: L,
    colunas: [{ k: "emp", t: "Empresa", fmt: function (v) { return Fin_emp_(v); } }, { k: "tipo", t: "Tipo" }, { k: "num", t: "Número" }, { k: "quem", t: "Cliente ou fornecedor", mob: "titulo" }, { k: "emissao", t: "Emissão" }, { k: "valor", t: "Valor", n: true, soma: true, mob: "valor" },
      { k: "situacao", t: "Situação", fmt: function (v) { return Fin_seloSit_(v); } }, { k: "titulo", t: "Título", fmt: function (v) { return Fin_seloSit_(v); } }, { k: "enviada", t: "Envio", fmt: function (v) { return v === "—" ? '<span class="cm-meta">—</span>' : Fin_seloSit_(v); } }],
    acoes: function () { return '<button type="button" class="btn-secondary" title="PDF">PDF</button><button type="button" class="btn-secondary" title="XML">XML</button><button type="button" class="btn-secondary">Enviar</button>'; } });
}

/* ---------------- FORNECEDORES E CLIENTES ---------------- */
function FinPag_cadastros_(div) {
  var c = FinPag_inicio_(div, "Fornecedores e clientes", "Cadastro único (o mesmo do Omie, separado por etiqueta), com endereço, contato e dados de pagamento. Pagamento automático depende de Pix ou conta conferida: o mutirão abaixo começa pelos fornecedores que mais recebem.",
    Fin_btn_("Novo cadastro pelo CNPJ", "fa-plus", "btn-primary", 'data-fv-acao="novo-cadastro"'));
  var L = FV_DADOS.cadastros;
  c.innerHTML = '<div class="fv-grade fv-g4">' + Fin_kpi_({ rotulo: "Cadastros", valor: "3.912", detalhe: "3.374 fornecedores · 394 clientes (Omie)", sit: "neutro" }) + Fin_kpi_({ rotulo: "Sem dados de pagamento", valor: "87 %", detalhe: "dos fornecedores pagos nos últimos 90 dias", sit: "critico" }) +
    Fin_kpi_({ rotulo: "Completados esta semana", valor: "38", detalhe: "Meta: os 100 que mais recebem até 30/11", sit: "ok" }) + Fin_kpi_({ rotulo: "Troca de dados bancários", valor: "1", detalhe: "Aguardando o dono ou o Charles", sit: "aviso" }) + "</div>" +
    Fin_caixa_("Mutirão: fornecedores sem dados de pagamento", "Ordem: quanto foi pago a cada um nos últimos 90 dias", '<div class="fv-tarefas">' + L.filter(function (x) { return x.pix === "—" && x.tags !== "Cliente"; }).slice(0, 4).map(function (x) {
      return '<div class="fv-tarefa"><span class="ic aviso"><i class="fas fa-building"></i></span><span><span class="t">' + Fin_esc_(x.nome) + '</span><br><span class="m">CNPJ ' + x.cnpj + " · " + Fin_esc_(x.cidade) + '</span></span><span class="q">' + Fin_moedaCurta_(x.pago90) + '<small><button type="button" class="fv-link">Completar</button></small></span></div>';
    }).join("") + "</div>") + '<div style="height:12px"></div><div id="fvTabCad"></div>';
  Fin_tabela_(Fin_$_("fvTabCad"), { id: "fvCad", csv: "fornecedores-clientes", grupos: [{ k: "tags", t: "Etiqueta" }, { k: "cidade", t: "Cidade" }], linhas: L,
    colunas: [{ k: "nome", t: "Nome", mob: "titulo", fmt: function (v) { return "<b>" + Fin_esc_(v) + "</b>"; } }, { k: "cnpj", t: "CNPJ" }, { k: "tags", t: "Etiquetas" }, { k: "cidade", t: "Cidade" }, { k: "pix", t: "Pix", fmt: function (v) { return v === "—" ? Fin_selo_("falta", "vermelho") : Fin_selo_(v, "verde"); } }, { k: "banco", t: "Conta" }, { k: "pago90", t: "Pago em 90 dias", n: true, soma: true, mob: "valor" }],
    acoes: function () { return '<button type="button" class="btn-secondary">Abrir ficha</button>'; } });
}

/* ---------------- IMPOSTOS E GUIAS ---------------- */
function FinPag_impostos_(div) {
  var c = FinPag_inicio_(div, "Impostos e guias", "Calendário fiscal de cada empresa e as guias da competência. A guia chega em PDF do contador; o SGO+ lê tributo, CNPJ, competência, vencimento, valor e código de barras, e você confere antes de lançar.",
    Fin_btn_("Calendário fiscal", "fa-calendar-days") + Fin_btn_("Anexar guia (PDF)", "fa-paperclip", "btn-primary"));
  var L = Fin_daEmpresa_(FV_DADOS.guias);
  c.innerHTML = Fin_faixa_("", "Guias pelo <b>PDF do contador</b> (decisão de 19/11). A emissão direta pela Receita (Integra Contador) fica desligada; se o dono ligar no futuro, esta tela não muda.") +
    '<div class="fv-grade fv-g4">' + Fin_kpi_({ rotulo: "Vencem em 5 dias", valor: Fin_moeda_(Fin_soma_(L.filter(function (g) { var d = Fin_difDias_(g.venc); return d >= 0 && d <= 5; }), "valor")), detalhe: L.filter(function (g) { var d = Fin_difDias_(g.venc); return d >= 0 && d <= 5; }).length + " guias", sit: "neutro" }) +
    Fin_kpi_({ rotulo: "Falta guia", valor: L.filter(function (g) { return g.situacao === "Falta guia"; }).length + "", detalhe: "Pedir ao contador · aviso automático 5 dias úteis antes", sit: "critico" }) + Fin_kpi_({ rotulo: "Retenções sofridas (out)", valor: Fin_moeda_(9412.8), detalhe: "ISS, PIS, COFINS, CSLL, IR nas notas de saída", sit: "neutro" }) + Fin_kpi_({ rotulo: "Pagas na competência", valor: "2 de 9", detalhe: "Outubro/2026", sit: "neutro" }) + "</div>" +
    '<div class="fv-grade fv-g-hero"><div id="fvTabImp"></div><section class="fv-caixa"><div class="fv-caixa-cab"><h3>Conferir guia lida pelo SGO+</h3></div><div class="fv-anexar"><i class="fas fa-file-pdf"></i>Solte aqui o PDF da guia ou toque para escolher</div>' +
    '<dl class="cm-det" style="margin-top:12px"><dt>Arquivo</dt><dd>das-prestadora-10-2026.pdf</dd><dt>Tributo</dt><dd>DAS (Simples Nacional)</dd><dt>CNPJ da guia</dt><dd>98.765.432/0001-10 ' + Fin_selo_("confere com a Prestadora", "verde") + "</dd><dt>Competência</dt><dd>10/2026</dd><dt>Vencimento</dt><dd>20/11/2026</dd><dt>Valor</dt><dd class=\"fv-num\">R$ 3.104,90 " + Fin_selo_("+4 % sobre a média de 3 meses", "cinza") + "</dd><dt>Código de barras</dt><dd style=\"font-family:var(--fv-cod);font-size:11.5px\">85800000031 0 04900328 1 ...</dd></dl>" +
    Fin_trava_("Se o CNPJ da guia for de outra empresa, o SGO+ não deixa lançar.", "Guia de uma empresa paga pela conta de outra é o erro que gerou o DAS da Prestadora dentro do Omie da Matriz.", "Escolha a empresa certa no topo ou peça ao contador a guia correta.") +
    '<div class="cm-acoes">' + Fin_btn_("Lançar e enviar para aprovação", "fa-paper-plane", "btn-primary") + Fin_btn_("Corrigir campos", "fa-pen") + "</div></section></div>";
  Fin_tabela_(Fin_$_("fvTabImp"), { id: "fvImp", csv: "guias", grupos: [{ k: "emp", t: "Empresa" }, { k: "trib", t: "Tributo" }], linhas: L.slice().sort(function (a, b) { return a.venc - b.venc; }),
    colunas: [{ k: "emp", t: "Empresa", fmt: function (v) { return Fin_emp_(v); } }, { k: "trib", t: "Tributo", mob: "titulo", fmt: function (v, l) { return "<b>" + Fin_esc_(v) + '</b><br><span class="cm-meta">comp. ' + l.comp + "</span>"; } }, { k: "venc", t: "Vencimento" }, { k: "valor", t: "Valor", n: true, soma: true, mob: "valor" }, { k: "situacao", t: "Situação", fmt: function (v, l) { return Fin_seloSit_(v) + (l.alerta ? '<br><span class="cm-meta fv-neg">' + Fin_esc_(l.alerta) + "</span>" : ""); } }] });
}

/* ---------------- CAJU ---------------- */
function FinPag_caju_(div) {
  var c = FinPag_inicio_(div, "Caju", "Recargas de benefício e da rotina dos técnicos, pagas pelo Pix do próprio Caju depois da aprovação, e a conferência dos gastos pelo arquivo do portal (a API do Caju não traz o extrato dos cartões).",
    Fin_btn_("Importar CSV do portal", "fa-file-import") + Fin_btn_("Nova recarga", "fa-plus", "btn-primary"));
  c.innerHTML = '<div class="fv-grade fv-g4">' + Fin_kpi_({ rotulo: "Conector Caju", valor: "Ligado", detalhe: "Homologação conferida · produção desde 20/11 (exemplo)", sit: "ok" }) + Fin_kpi_({ rotulo: "Recargas no mês", valor: Fin_moeda_(11500), detalhe: "3 pedidos · 20 colaboradores", sit: "neutro" }) +
    Fin_kpi_({ rotulo: "Aguardando aprovação", valor: Fin_moeda_(8400), detalhe: "CJ-2026-118 · 14 colaboradores", sit: "aviso" }) + Fin_kpi_({ rotulo: "Gastos sem comprovante", valor: "7", detalhe: "Conciliação do CSV de 15/11", sit: "aviso" }) + "</div>" +
    Fin_caixa_("Pedidos de recarga", "Rascunho → aprovação → Pix do Caju pago pela API do banco → crédito liberado → lançado no Omie (valor e taxa separados)", '<div class="cm-lista">' + FV_DADOS.caju.map(function (p) {
      var et = p.estado === "Crédito liberado" ? 5 : 1;
      return '<article class="fv-card-op ' + (et === 5 ? "ok" : "") + '"><div class="fv-card-op-cab"><span></span><div><div class="t">' + p.pedido + '</div><div class="cm-meta">' + Fin_emp_("MATRIZ") + " · " + p.colab + " colaboradores · " + Fin_data_(p.data) + " · " + p.forma + '</div></div><div class="valor">' + Fin_moeda_(p.valor) + "<small>" + p.estado + "</small></div></div>" +
        Fin_tempo_([["Pedido", "rotina"], ["Aprovação", "dono ou Charles"], ["Pix pago", "Sicredi"], ["Crédito", "Caju"], ["Omie", "lançado"]], et) + "</article>";
    }).join("") + "</div>");
}

/* ---------------- ORÇAMENTO ---------------- */
function FinPag_orcamento_(div) {
  var c = FinPag_inicio_(div, "Orçamento", "Orçamento anual por empresa e grupo de categoria (o SGO+ é a fonte; o Omie não tem orçamento). O realizado vem dos títulos baixados, em regime de caixa.", Fin_btn_("Editar orçamento 2027", "fa-pen") + Fin_btn_("Relatório A4", "fa-file-pdf"), { periodo: false });
  var meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov"];
  c.innerHTML = '<div class="fv-grade fv-g4">' + Fin_kpi_({ rotulo: "Receita no ano", valor: Fin_moeda_(5372800), detalhe: "<b>96 %</b> do orçado até novembro", sit: "aviso" }) + Fin_kpi_({ rotulo: "Despesa no ano", valor: Fin_moeda_(5704300), detalhe: "<b>104 %</b> do orçado até novembro", sit: "critico" }) + Fin_kpi_({ rotulo: "Grupos acima do orçado", valor: "3 de 7", detalhe: "Serviços de terceiros +40 %", sit: "aviso" }) + Fin_kpi_({ rotulo: "Comentários do mês", valor: "1 de 3", detalhe: "Grupos com desvio pedem explicação", sit: "neutro" }) + "</div>" +
    '<div class="fv-grade fv-g2">' + Fin_caixa_("Novembro por grupo", "", Graf_orcamento_(FV_DADOS.orcamento)) + '<section class="fv-caixa"><div class="fv-caixa-cab"><h3>Despesa mês a mês (R$ mil)<span class="s">Orçado × realizado</span></h3></div><div id="fvGrafOrc"></div></section></div>' +
    Fin_caixa_("Orçamento × realizado por grupo e mês (R$ mil)", "", '<div class="fv-tab-wrap fv-rolar"><table class="cm-tabela"><thead><tr><th>Grupo</th>' + meses.map(function (m) { return '<th class="n">' + m + "</th>"; }).join("") + '<th class="n">Ano</th></tr></thead><tbody>' +
      FV_DADOS.orcamento.map(function (g) { var tot = 0; return '<tr><td data-r="Grupo"><b>' + Fin_esc_(g.g) + "</b></td>" + meses.map(function (m, i) { var v = Math.round(g.real / 1000 * (0.8 + ((i * 37) % 9) / 20)); tot += v; var o = Math.round(g.orc / 1000); var ruim = g.despesa ? v > o * 1.1 : v < o * 0.9; return '<td class="n' + (ruim ? " fv-neg" : "") + '" data-r="' + m + '">' + v + "</td>"; }).join("") + '<td class="n" data-r="Ano"><b>' + tot.toLocaleString("pt-BR") + "</b></td></tr>"; }).join("") + '</tbody></table></div><p class="cm-meta">Em vermelho: despesa mais de 10 % acima ou receita mais de 10 % abaixo do orçado no mês.</p>');
  Graf_pareadas_(Fin_$_("fvGrafOrc"), ["jun", "jul", "ago", "set", "out", "nov"].map(function (m, i) { return { rot: m, a: [440, 450, 455, 450, 470, 470][i] * 1000, b: [382.6, 471.9, 435.7, 404.3, 466.2, 332.6][i] * 1000, parcial: m === "nov" }; }), ["Orçado", "Realizado"], ["var(--fv-saida)", "var(--fv-entrada)"]);
}

/* ---------------- FECHAMENTO DO MÊS ---------------- */
function FinPag_fechamento_(div) {
  var pode = FinPag_podeAprovar_();
  var c = FinPag_inicio_(div, "Fechamento do mês", "Checklist de cada empresa com a situação conferida pelo próprio SGO+. Fechado o mês, lançamentos com data anterior ficam bloqueados no SGO+ e no Omie. Só o dono ou o Charles fecham.",
    '<select aria-label="Mês"><option>Outubro/2026</option><option>Setembro/2026 (fechado)</option></select>');
  var itens = [["ok", "Extratos de todas as contas importados até 31/10", ""], ["pend", "100 % dos movimentos conciliados ou justificados", "Itaú Matriz: 31 movimentos sem par", "conciliacao"], ["ok", "Nenhum título pago e não baixado", ""], ["ok", "Faturas de cartão lançadas", ""], ["pend", "Caju conciliado", "CSV de 31/10 ainda não importado", "caju"], ["ok", "Guias da competência lançadas", ""],
    ["ok", "Folha lançada", ""], ["pend", "Notas do mês × títulos", "2 notas sem título", "notas"], ["ok", "Saldo do banco igual ao do Omie em 31/10", ""], ["ok", "Orçamento × realizado comentado", ""], ["bloq", "XMLs enviados ao contador", "Depende dos itens acima", ""], ["ok", "Resumo do contador conferido no Omie", ""]];
  var ok = itens.filter(function (i) { return i[0] === "ok"; }).length;
  var h = '<div class="fv-grade fv-g3">' + FV_DADOS.empresas.filter(function (e) { return FV.emp === "TODAS" || e.id === FV.emp; }).map(function (e, k) {
    var n = k === 0 ? ok : k === 1 ? 11 : 12;
    return '<section class="fv-caixa"><div class="fv-caixa-cab"><h3><span class="fv-emp ' + e.classe + '" style="font-size:14px">' + e.apelido + '</span><span class="s">Outubro/2026</span></h3>' + (n === 12 ? Fin_selo_("pronto para fechar", "verde") : Fin_selo_(n + " de 12", "laranja")) + '</div><div class="fv-prog"><i style="width:' + (n / 12 * 100) + '%"></i></div>' +
      (k === 0 ? '<ul class="fv-check">' + itens.map(function (i) { return '<li class="' + i[0] + '"><i class="fas ' + (i[0] === "ok" ? "fa-check" : i[0] === "pend" ? "fa-exclamation" : "fa-lock") + '" aria-hidden="true"></i><span>' + Fin_esc_(i[1]) + (i[2] ? "<small>" + Fin_esc_(i[2]) + "</small>" : "") + "</span>" + (i[3] ? '<button type="button" class="fv-link" data-fv-ir="' + i[3] + '">resolver</button>' : "<span></span>") + "</li>"; }).join("") + "</ul>" : '<p class="cm-txt">' + (n === 12 ? "Todos os 12 itens conferidos." : "Falta: notas do mês × títulos (1 nota de serviço sem título).") + "</p>") +
      '<div class="cm-acoes">' + (pode ? (n === 12 ? Fin_btn_("Fechar outubro", "fa-lock", "btn-primary") : Fin_btn_("Fechar outubro", "fa-lock", "btn-primary", "disabled")) : "") + "</div></section>";
  }).join("") + "</div>";
  h += pode ? Fin_trava_("O botão Fechar outubro da Matriz está desligado.", "Ainda há 3 itens pendentes e 1 bloqueado no checklist; fechar assim travaria lançamentos que ainda precisam entrar.", "Resolva os itens marcados com ! (cada um tem o atalho \"resolver\"). O botão liga sozinho quando os 12 estiverem conferidos.") :
    Fin_trava_("Você não vê o botão Fechar.", "Fechar o mês é decisão do dono ou do Charles.", "Deixe os 12 itens conferidos; o dono e o Charles recebem o aviso de que o mês está pronto para fechar.");
  c.innerHTML = h;
}

/* ---------------- RELATÓRIOS ---------------- */
function FinPag_relatorios_(div) {
  var c = FinPag_inicio_(div, "Relatórios", "Todos com filtro de empresa, consolidado sem as transferências e os mútuos do grupo, PDF A4 com texto justificado e CSV.", Fin_btn_("CSV", "fa-file-csv") + Fin_btn_("PDF A4", "fa-file-pdf", "btn-primary"), { periodo: true });
  var abas = ["DRE gerencial", "Fluxo realizado × previsto", "Aging", "Por empresa", "Por centro de custo", "Extrato por conta", "Pagamentos feitos pelo SGO+"];
  var D = FV_DADOS;
  var dre = [["Receita bruta", 2560500, true], ["  Serviços prestados", 1912300], ["  Revenda de mercadorias", 648200], ["(−) Impostos sobre vendas", -186500], ["Receita líquida", 2374000, true], ["(−) Custo das mercadorias", -612400], ["(−) Serviços contratados", -317700], ["Margem de contribuição", 1443900, true], ["(−) Pessoal", -598200], ["(−) Ocupação", -128400], ["(−) Administrativas", -142900], ["(−) Tarifas bancárias (conferidas)", -24300], ["Resultado operacional", 550100, true], ["(+/−) Financeiro (empréstimos, juros, rendimentos)", -61800], ["Resultado do período", 488300, true]];
  c.innerHTML = '<div class="cm-tabs">' + abas.map(function (a, i) { return '<button type="button" class="cm-tab' + (i === 0 ? " active" : "") + '">' + a + "</button>"; }).join("") + "</div>" +
    Fin_faixa_("aviso", "Tarifas bancárias: em outubro R$ 275.100,85 estavam nessa categoria, mas só R$ 4.755 eram tarifas. O DRE abaixo usa a categoria revista; o original fica no Omie até o contador confirmar.") +
    '<div class="fv-grade fv-g-hero">' + Fin_caixa_("DRE gerencial · jun a nov/2026", (FV.emp === "TODAS" ? "Consolidado das três empresas" : FV_EMP_NOME[FV.emp]) + " · regime de caixa", '<div class="fv-tab-wrap"><table class="cm-tabela cm-conta"><thead><tr><th>Linha</th><th class="n">Valor</th><th class="n">% da receita</th></tr></thead><tbody>' +
      dre.map(function (l) { return "<tr" + (l[2] ? ' style="font-weight:700;background:var(--bc-surface-2)"' : "") + '><td data-r="Linha" style="white-space:pre">' + Fin_esc_(l[0]) + '</td><td class="n ' + (l[1] < 0 ? "" : "") + '" data-r="Valor">' + Fin_moeda_(l[1]) + '</td><td class="n" data-r="% da receita">' + Fin_pct_(l[1] / 2374000 * 100, 1) + "</td></tr>"; }).join("") + "</tbody></table></div>") +
    '<div><section class="fv-caixa" style="margin-bottom:12px"><div class="fv-caixa-cab"><h3>Resultado por empresa<span class="s">No mesmo período</span></h3></div>' + Graf_hbar_([{ nome: "Matriz", v: 401200 }, { nome: "Filial", v: 63400 }, { nome: "Prestadora", v: 23700 }]) + '<p class="cm-meta">Mútuo Matriz → Prestadora de R$ 37.000 fora das duas.</p></section>' +
    '<section class="fv-caixa"><div class="fv-caixa-cab"><h3>Fluxo: realizado × previsto<span class="s">Novembro</span></h3></div><div id="fvGrafFluxo"></div></section></div></div>';
  Graf_pareadas_(Fin_$_("fvGrafFluxo"), [{ rot: "sem 1", a: 98000, b: 91200 }, { rot: "sem 2", a: 121000, b: 113400 }, { rot: "sem 3", a: 117900, b: 102600 }, { rot: "sem 4", a: 132000, b: 0, parcial: true }], ["Previsto", "Realizado"], ["var(--fv-saida)", "var(--fv-entrada)"]);
}

/* ---------------- EMPRESAS E BANCOS (configuração) ---------------- */
function FinPag_empresas_(div) {
  var pode = FV.papel === "DONO";
  var c = FinPag_inicio_(div, "Empresas e bancos", "Cadastro das três empresas, contas bancárias, situação de cada integração e as regras do Financeiro. As chaves ficam no servidor: aqui aparece só o nome do que falta, nunca o valor.", pode ? Fin_btn_("Testar todas as conexões", "fa-plug-circle-check", "btn-primary") : "");
  var D = FV_DADOS;
  var h = pode ? "" : Fin_trava_("Você vê a configuração, mas não pode mudar regras nem empresas.", "Regras de aprovação, limites e chaves de emergência são decisão do dono.", "Se algo estiver errado, peça ao dono pelo bate-papo; o histórico de cada mudança fica nesta página.");
  h += '<div class="fv-grade fv-g3">' + D.empresas.map(function (e) {
    return '<section class="fv-caixa" style="border-top:4px solid var(--fv-' + e.classe + ')"><div class="fv-caixa-cab"><h3>' + e.apelido + '<span class="s">' + Fin_esc_(e.nome) + "</span></h3>" + Fin_btn_("Editar", "fa-pen", "btn-secondary") + '</div><dl class="cm-det"><dt>CNPJ</dt><dd class="fv-num">' + e.cnpj + "</dd><dt>Cidade</dt><dd>" + e.cidade + "</dd><dt>Regime</dt><dd>" + e.regime + "</dd><dt>Omie</dt><dd>" + Fin_esc_(e.omieTxt) + " " + (e.id === "PRESTADORA" ? Fin_conector_("falta") : Fin_conector_("ligado")) + '</dd><dt>Cor nos gráficos</dt><dd><span class="fv-pt ' + e.classe + '"></span> fixa</dd></dl></section>';
  }).join("") + "</div>";
  h += Fin_caixa_("Integrações por conta", "Teste = lê o CNPJ devolvido pelo banco e compara com o cadastro", '<div id="fvTabInt"></div>');
  h += '<div class="fv-grade fv-g2" style="margin-top:12px">' + Fin_caixa_("Regras do Financeiro", "Quem muda: só o dono · cada mudança pede motivo e vai para o histórico", '<dl class="cm-det"><dt>Limite sem aprovação</dt><dd class="fv-num">R$ 0,00 <span class="cm-meta">(toda saída é aprovada)</span></dd><dt>Lote de pagamentos</dt><dd>Ligado · 09:00 · só itens aprovados que vencem no dia</dd><dt>Limite diário</dt><dd class="fv-num">Matriz R$ 150.000,00 · Filial R$ 40.000,00 · Prestadora R$ 60.000,00</dd><dt>Conciliação automática</dt><dd>Modo sugerir até 03/12/2026 · depois: decisão do dono</dd><dt>Transferência entre empresas</dt><dd>Sempre com aprovação</dd><dt>Débito acima de</dt><dd class="fv-num">R$ 500,00 nunca vira "tarifa" sozinho</dd></dl>' + (pode ? '<div class="cm-acoes">' + Fin_btn_("Mudar regras", "fa-sliders") + "</div>" : "")) +
    Fin_caixa_("Chaves de emergência", "Desligam a gravação na hora, sem publicar nada", '<dl class="cm-det"><dt>Gravação no Omie</dt><dd>' + Fin_conector_("ligado") + "</dd><dt>Pagamento pelo banco</dt><dd>" + Fin_conector_("ligado") + "</dd><dt>Avisos por WhatsApp</dt><dd>Só dono e Charles, no expediente</dd></dl>" + (pode ? '<div class="cm-acoes">' + Fin_btn_("Desligar pagamentos agora", "fa-power-off", "btn-outline-danger") + "</div>" : "")) + "</div>";
  c.innerHTML = h;
  Fin_tabela_(Fin_$_("fvTabInt"), { id: "fvInt", linhas: D.contas.map(function (x) { return { emp: x.emp, conta: x.apelido, banco: x.banco + " " + x.bancoNome, estado: x.conector, falta: x.falta || (x.conector === "ligado" ? "—" : "sem API no banco"), cert: x.conector === "ligado" ? (x.emp === "MATRIZ" ? "vence 13/12 (24 dias)" : "vence 02/2027") : "—" }; }),
    colunas: [{ k: "emp", t: "Empresa", fmt: function (v) { return Fin_emp_(v); } }, { k: "conta", t: "Conta", mob: "titulo" }, { k: "banco", t: "Banco" }, { k: "estado", t: "Situação", fmt: function (v) { return Fin_conector_(v); } }, { k: "falta", t: "O que falta gravar" }, { k: "cert", t: "Certificado", fmt: function (v) { return /24 dias/.test(v) ? Fin_selo_(v, "laranja") : Fin_esc_(v); } }],
    acoes: function (l) { return l.estado === "ligado" ? '<button type="button" class="btn-secondary">Testar</button>' : l.estado === "falta" ? '<button type="button" class="btn-secondary">Como obter</button>' : ""; } });
}

/* ---------------- TRILHA ---------------- */
function FinPag_trilha_(div) {
  var c = FinPag_inicio_(div, "Trilha", "Tudo o que foi gravado no Omie e no banco pelo SGO+: quem, quando, em qual empresa, o antes e o depois e o resultado. Envios sem resposta ficam \"a conferir\" e nunca são reenviados sozinhos.", Fin_btn_("Acessos ao Financeiro", "fa-user-shield"), { periodo: true });
  c.innerHTML = Fin_caixa_("Envios a conferir", "Sem resposta do banco ou do Omie: consultar pelo código antes de qualquer nova tentativa", '<div class="fv-tarefas"><div class="fv-tarefa"><span class="ic aviso"><i class="fas fa-rotate-left"></i></span><span><span class="t">Pix para Telefonia Conecta · P3022 · R$ 389,90</span><br><span class="m">Enviado no lote das 09:00 · o Sicredi não respondeu em 30 s · código PAG-P3022</span></span><span class="q"><button type="button" class="btn-primary">Consultar no banco</button></span></div></div>') +
    '<div style="height:12px"></div><div id="fvTabTri"></div>';
  Fin_tabela_(Fin_$_("fvTabTri"), { id: "fvTri", csv: "trilha-financeiro", grupos: [{ k: "quem", t: "Quem" }, { k: "onde", t: "Onde" }, { k: "res", t: "Resultado" }], linhas: FV_DADOS.trilha,
    colunas: [{ k: "quando", t: "Quando" }, { k: "quem", t: "Quem" }, { k: "emp", t: "Empresa", fmt: function (v) { return v === "Todas" ? "Todas" : Fin_emp_(v); } }, { k: "onde", t: "Onde" }, { k: "op", t: "Operação", mob: "titulo" }, { k: "res", t: "Resultado", fmt: function (v) { return Fin_selo_(v, v === "OK" ? "verde" : "laranja"); } }, { k: "cod", t: "Código", fmt: function (v) { return '<span style="font-family:var(--fv-cod);font-size:11.5px">' + Fin_esc_(v) + "</span>"; } }],
    acoes: function () { return '<button type="button" class="btn-secondary">Antes e depois</button>'; } });
}

/* ---------------- SEM PERMISSÃO (quem não é dono, Charles ou Wanessa) ---------------- */
function FinPag_semAcesso_(div) {
  div.innerHTML = '<div class="module-shell">' + Fin_cabecalho_("Financeiro", "") + Fin_estado_("permissao", "O Financeiro é restrito", "Esta área mostra saldos, salários e pagamentos das três empresas e é aberta só para o dono, o Charles e a Wanessa. Se o seu trabalho precisa de alguma informação daqui, peça a um deles pelo bate-papo. Pedidos de compra e de reembolso continuam em Compras e em Depósito de viagem.", Fin_btn_("Abrir o bate-papo", "fa-comments") + Fin_btn_("Voltar ao Início", "fa-house")) + "</div>";
}

/* ---------------- CATÁLOGO DE COMPONENTES E ESTADOS ---------------- */
function FinPag_componentes_(div) {
  var c = FinPag_inicio_(div, "Componentes e estados (protótipo)", "Página só do protótipo: cada componente do COMPONENTES.md desenhado com os estilos reais, e os cinco estados que toda página precisa ter.", "");
  c.innerHTML = '<div class="fv-grade fv-g4">' + Fin_kpi_({ rotulo: "Cartão neutro", valor: Fin_moeda_(123456.78), detalhe: "detalhe com <b>destaque</b>", sit: "neutro" }) + Fin_kpi_({ rotulo: "Em dia", valor: "12", detalhe: "situação ok", sit: "ok" }) + Fin_kpi_({ rotulo: "Atenção", valor: "3", detalhe: "situação aviso", sit: "aviso" }) + Fin_kpi_({ rotulo: "Crítico", trio: [["Hoje", "R$ 1 mil"], ["7 dias", "R$ 9 mil"], ["Mês", "R$ 40 mil"]], detalhe: "com trio", sit: "critico" }) + "</div>" +
    '<div class="fv-grade fv-g2">' + Fin_caixa_("Selos de banco", "", Fin_conector_("ligado") + " " + Fin_conector_("falta") + " " + Fin_conector_("manual") + " " + Fin_conector_("erro") + " " + Fin_conector_("homolog") + '<p class="cm-meta" style="margin-top:10px">Chips de empresa: ' + Fin_emp_("MATRIZ") + " " + Fin_emp_("FILIAL") + " " + Fin_emp_("PRESTADORA") + "</p>") +
    Fin_caixa_("Linha do tempo", "", Fin_tempo_(FV_ETAPAS_PAG, 2) + Fin_tempo_(FV_ETAPAS_PAG, 3, 3, ["Wanessa", "conferido", "Charles 08:47", "recusado: saldo", "—"])) + "</div>" +
    '<div class="fv-grade fv-g2">' + Fin_caixa_("Estado: vazio", "", Fin_estado_("vazio", "Nenhuma conta a pagar nesta semana", "Nada vence entre 19 e 25/11 na Matriz. Para ver outro período, use o seletor no topo.", Fin_btn_("Ver o mês", "fa-calendar"))) +
    Fin_caixa_("Estado: carregando", "", Fin_estado_("carregando", "Carregando as contas")) +
    Fin_caixa_("Estado: erro", "", Fin_estado_("erro", "O Omie não respondeu", "A leitura das contas a pagar passou de 30 segundos e foi interrompida. Nada foi gravado. Os números da tela são da fotografia das 06:30.", Fin_btn_("Tentar de novo", "fa-rotate", "btn-primary") + Fin_btn_("Ver a fotografia", "fa-camera"))) +
    Fin_caixa_("Estado: sem credencial", "", Fin_estado_("credencial", "Sicoob Matriz sem credencial", "Falta gravar SICOOB_MATRIZ_CLIENT_ID e SICOOB_MATRIZ_CERT_PFX. Até lá, o saldo vem do Omie e o extrato entra por arquivo OFX.", Fin_btn_("Importar OFX", "fa-file-import"))) +
    Fin_caixa_("Estado: sem permissão", "", Fin_estado_("permissao", "Aprovar é do dono ou do Charles", "Você vê a fila para conferir anexos e dados de pagamento. Os botões de aprovar não aparecem para quem prepara o pagamento.")) +
    Fin_caixa_("Trava (o quê, por quê, o que fazer)", "", Fin_trava_("O pagamento não entrou no lote das 09:00.", "O fornecedor não tem Pix nem conta conferida.", "Complete os dados em Fornecedores e clientes; o item volta para a próxima aprovação.")) + "</div>" +
    '<div class="cm-acoes">' + Fin_btn_("Abrir: confirmar pagamento", "fa-money-bill-transfer", "btn-primary", 'data-fv-acao="aprovar-lote"') + Fin_btn_("Abrir: nova conta a pagar", "fa-plus", "btn-secondary", 'data-fv-acao="nova-pagar"') + "</div>";
}

/* ---------------- JANELAS ---------------- */
/** Janela de confirmação de aprovação/pagamento: resumo por conta pagadora, limite do dia, digitar o total para confirmar acima de R$ 50 mil. */
function FinJanela_confirmarPagamento_() {
  var itens = FV_DADOS.aprovacoes.filter(function (a) { return a.tipo === "Pagamento" || a.tipo === "Transferência"; });
  var tot = Fin_soma_(itens, "valor");
  var corpo = '<p class="cm-txt fv-just">Você vai aprovar <b>' + itens.length + " saídas</b> que somam <b class=\"fv-num\">" + Fin_moeda_(tot) + "</b>. Elas entram no lote das <b>09:00</b> do dia do vencimento e saem pela conta pagadora de cada empresa. Nada é enviado ao banco agora.</p>" +
    '<table class="cm-tabela cm-conta"><tbody>' + [["Sicredi Matriz", "MATRIZ", 18760 + 4320 + 25000, "limite do dia R$ 150.000,00"], ["Sicredi Filial", "FILIAL", 7800, "limite do dia R$ 40.000,00"], ["Sicredi Prestadora", "PRESTADORA", 27940.62, "limite do dia R$ 60.000,00"]].map(function (l) {
      return '<tr><td data-r="Conta">' + Fin_emp_(l[1]) + " " + l[0] + '<br><span class="cm-meta">' + l[3] + '</span></td><td class="n" data-r="Valor"><b class="fv-num">' + Fin_moeda_(l[2]) + "</b></td></tr>";
    }).join("") + "</tbody></table>" +
    Fin_tempo_(FV_ETAPAS_PAG, 2) +
    '<div class="cm-campo" style="margin-top:12px"><label for="fvConfTot">Para confirmar acima de R$ 50.000,00, digite o total</label><input id="fvConfTot" inputmode="decimal" placeholder="' + Fin_moeda_(tot).replace("R$", "").trim() + '"></div>' +
    '<p class="cm-meta fv-just">A aprovação fica na trilha com o seu nome, a hora e o valor. Até as 09:00 você ainda pode retirar um item do lote.</p>';
  Fin_modal_("Confirmar aprovação", corpo, Fin_btn_("Cancelar", "", "btn-secondary", 'onclick="this.closest(\'.atv-overlay\').remove()"') + Fin_btn_("Aprovar " + Fin_moeda_(tot), "fa-check", "btn-primary"), 560);
}
function FinJanela_novaPagar_() {
  var emp = FV.emp === "TODAS" ? "MATRIZ" : FV.emp;
  var corpo = '<div class="fv-form-empresa ' + emp.toLowerCase() + '"><span class="fv-pt ' + emp.toLowerCase() + '"></span><span>Lançando na <b>' + FV_EMP_NOME[emp] + '</b> <button type="button" class="fv-link">trocar</button></span></div>' +
    '<div class="fv-anexar" style="margin-bottom:12px"><i class="fas fa-wand-magic-sparkles"></i>Solte o boleto ou a nota em PDF: o SGO+ preenche fornecedor, valor, vencimento e linha digitável</div>' +
    '<div class="cm-grade2"><div class="cm-campo"><label>Fornecedor</label><input value="Calibra Instrumentos Ltda."></div><div class="cm-campo"><label>Categoria</label><select><option>Serviço contratado</option></select></div>' +
    '<div class="cm-campo"><label>Valor</label><input inputmode="decimal" value="4.320,00"></div><div class="cm-campo"><label>Vencimento</label><input type="date" value="2026-11-20"></div>' +
    '<div class="cm-campo"><label>Forma de pagamento</label><select><option>Pix (chave do cadastro)</option><option>Boleto</option><option>TED</option></select></div><div class="cm-campo"><label>Centro de custo</label><select><option>Calibração</option></select></div></div>' +
    Fin_faixa_("ok", '<i class="fas fa-shield-halved"></i> Chave Pix CNPJ conferida no banco: titular <b>Calibra Instrumentos Ltda.</b>, igual ao cadastro.');
  Fin_modal_("Nova conta a pagar", corpo, Fin_btn_("Cancelar", "", "btn-secondary", 'onclick="this.closest(\'.atv-overlay\').remove()"') + Fin_btn_("Ver prévia do envio ao Omie", "fa-eye", "btn-primary"), 640);
}
