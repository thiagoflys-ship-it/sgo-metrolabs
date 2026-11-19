/* =====================================================================
   PAINEL (dashboard) — duas visões na mesma página:
   "Diretoria" (dono e Charles: decisão) e "Meu dia" (Wanessa: trabalho).
   Cada cartão abre a lista que deu origem ao número.
   ===================================================================== */
function FinPainel_render_(div) {
  var D = FV_DADOS, podeAprovar = FV.papel !== "WANESSA";
  var aba = FV.abaPainel || (podeAprovar ? "diretoria" : "dia");
  var botoes = Fin_btn_("Relatório A4", "fa-file-pdf") + Fin_btn_("Atualizar agora", "fa-rotate", "btn-primary");
  div.innerHTML = '<div class="module-shell">' + Fin_cabecalho_("Painel financeiro", "Caixa, compromissos, previsão e o que precisa de decisão hoje. O número de cada cartão abre a lista de onde ele veio.", botoes) +
    Fin_barra_({ periodo: false }) +
    '<div class="cm-tabs" role="tablist"><button type="button" role="tab" class="cm-tab' + (aba === "diretoria" ? " active" : "") + '" data-aba="diretoria" aria-selected="' + (aba === "diretoria") + '">Visão da diretoria</button>' +
    '<button type="button" role="tab" class="cm-tab' + (aba === "dia" ? " active" : "") + '" data-aba="dia" aria-selected="' + (aba === "dia") + '">Meu dia</button></div>' +
    '<div id="fvPainelCorpo"></div></div>';
  div.querySelectorAll("[data-aba]").forEach(function (b) { b.onclick = function () { FV.abaPainel = b.getAttribute("data-aba"); FinPainel_render_(div); }; });
  var corpo = Fin_$_("fvPainelCorpo");
  if (aba === "diretoria") FinPainel_diretoria_(corpo); else FinPainel_dia_(corpo);
}

function FinPainel_riscos_() {
  var r = [
    ["critico", "fa-building-columns", "Itaú Matriz sem extrato há 2 dias úteis (31 movimentos a conciliar)", "bancos"],
    ["aviso", "fa-file-invoice", "Guia do ISS de outubro (Matriz) não chegou · vence amanhã", "impostos"],
    ["aviso", "fa-certificate", "Certificado do Sicredi Matriz vence em 24 dias (13/12)", "empresas"],
    ["aviso", "fa-paper-plane", "1 pagamento do lote 09:00 está \"a conferir\" no banco", "trilha"],
    ["ok", "fa-camera", "Fotografia diária das 3 empresas rodou às 06:30", "trilha"]
  ];
  return '<div class="fv-riscos" aria-label="Riscos e avisos">' + r.map(function (x) { return '<button type="button" class="fv-risco ' + x[0] + '" data-fv-ir="' + x[3] + '"><i class="fas ' + x[1] + '" aria-hidden="true"></i>' + Fin_esc_(x[2]) + "</button>"; }).join("") + '<button type="button" class="fv-risco fv-riscos-mais" onclick="this.parentNode.classList.add(&quot;aberto&quot;);this.remove()"><i class="fas fa-plus" aria-hidden="true"></i>mais ' + (r.length - 2) + ' avisos</button></div>';
}

function FinPainel_diretoria_(alvo) {
  var D = FV_DADOS, contas = Fin_daEmpresa_(D.contas), disp = contas.filter(function (c) { return !c.aplicacao; }), apl = contas.filter(function (c) { return c.aplicacao; });
  var total = Fin_soma_(disp, "saldo"), totApl = Fin_soma_(apl, "saldo");
  var porEmp = D.empresas.map(function (e) { return { nome: e.apelido, c: e.classe, v: Fin_soma_(disp.filter(function (c) { return c.emp === e.id; }), "saldo") }; }).filter(function (p) { return p.v > 0; });
  var aprov = Fin_daEmpresa_(D.aprovacoes), aprovValor = Fin_soma_(aprov, "valor");
  var rec = Fin_daEmpresa_(D.receber).filter(function (r) { return r.saldo > 0; }), pag = Fin_daEmpresa_(D.pagar).filter(function (p) { return p.estado !== "Pago"; });
  var noPrazo = function (l, ini, fim) { return Fin_soma_(l.filter(function (x) { var d = Fin_difDias_(x.venc); return d >= ini && d <= fim; }), l === rec ? "saldo" : "valor"); };
  var recVenc = rec.filter(function (r) { return r.atraso > 0; }), pagVenc = pag.filter(function (p) { return Fin_difDias_(p.venc) < 0; });
  var podeAprovar = FV.papel !== "WANESSA";

  var h = FinPainel_riscos_();
  // 1. caixa agora + aprovações
  h += '<div class="fv-grade fv-g-hero">' +
    Fin_caixa_("Caixa disponível agora", (FV.emp === "TODAS" ? "Três empresas somadas" : FV_EMP_NOME[FV.emp]) + " · aplicações à parte",
      '<div class="fv-hero"><div class="v">' + Fin_moeda_(total) + '</div><div class="linha"><span>Aplicações <b>' + Fin_moeda_(totApl) + "</b></span><span>Contas com API <b>" + disp.filter(function (c) { return c.conector === "ligado"; }).length + " de " + disp.length + "</b></span><span>Saldo do Omie (sem API) <b>" + Fin_moeda_(Fin_soma_(disp.filter(function (c) { return c.conector !== "ligado"; }), "saldo")) + "</b></span></div>" +
      (porEmp.length > 1 ? Graf_pilha_(porEmp) : "") + '</div><div class="fv-contas" style="margin-top:10px">' + disp.slice(0, 6).map(FinPainel_linhaConta_).join("") + "</div>", ["Bancos e saldos", "bancos"]) +
    '<section class="fv-caixa fv-aprov-dest"><div class="fv-caixa-cab"><h3>Aprovações pendentes<span class="s">Toda saída de dinheiro passa pelo dono ou pelo Charles</span></h3></div>' +
      '<div class="v fv-num">' + Fin_moeda_(aprovValor) + '</div><div class="cm-meta">' + aprov.length + " itens · o mais antigo é de ontem 16:40 · próximo lote às 09:00 de amanhã</div>" +
      '<div class="fv-aprov-lista">' + ["Pagamento", "Tarifa ou débito", "Transferência", "Dados bancários"].map(function (t) { var l = aprov.filter(function (a) { return a.tipo === t; }); return l.length ? "<div><span>" + Fin_esc_(t === "Dados bancários" ? "Troca de dados bancários" : t === "Tarifa ou débito" ? "Tarifas e débitos automáticos" : t + (l.length > 1 ? "s" : "")) + " (" + l.length + ")</span><b>" + (t === "Dados bancários" ? "risco de fraude" : Fin_moeda_(Fin_soma_(l, "valor"))) + "</b></div>" : ""; }).join("") + "</div>" +
      '<div class="cm-acoes">' + (podeAprovar ? Fin_btn_("Revisar e aprovar", "fa-check-double", "btn-primary", 'data-fv-ir="aprovacoes"') : '<span class="cm-meta">Você prepara e envia; quem aprova é o dono ou o Charles.</span>' + Fin_btn_("Ver a fila", "fa-list", "btn-secondary", 'data-fv-ir="aprovacoes"')) + "</div></section></div>";

  // 2. compromissos
  h += '<div class="fv-grade fv-g4">' +
    Fin_kpi_({ rotulo: "A receber", trio: [["Hoje", Fin_moedaCurta_(noPrazo(rec, 0, 0))], ["7 dias", Fin_moedaCurta_(noPrazo(rec, 0, 7))], ["Mês", Fin_moedaCurta_(noPrazo(rec, 0, 11))]], detalhe: "Taxa de realização <b>67,7 %</b> (o que costuma entrar no prazo)", ir: "receber", sit: "neutro" }) +
    Fin_kpi_({ rotulo: "A pagar", trio: [["Hoje", Fin_moedaCurta_(noPrazo(pag, 0, 0))], ["7 dias", Fin_moedaCurta_(noPrazo(pag, 0, 7))], ["Mês", Fin_moedaCurta_(noPrazo(pag, 0, 11))]], detalhe: "Aprovado para o lote: <b>" + Fin_moedaCurta_(Fin_soma_(pag.filter(function (p) { return p.estado === "Aprovado"; }), "valor")) + "</b>", ir: "pagar", sit: "neutro" }) +
    Fin_kpi_({ rotulo: "Vencido a receber", valor: Fin_moeda_(Fin_soma_(recVenc, "saldo")), detalhe: recVenc.length + " títulos · <b>" + Fin_pct_(Fin_soma_(recVenc, "saldo") / (Fin_soma_(rec, "saldo") || 1) * 100, 1) + "</b> do aberto · atraso médio 11 dias", sit: "critico", ir: "cobranca" }) +
    Fin_kpi_({ rotulo: "Vencido a pagar", valor: Fin_moeda_(Fin_soma_(pagVenc, "valor")), detalhe: "Deveria ser zero: " + pagVenc.length + " títulos, a maioria paga e não baixada", sit: "aviso", ir: "pagar" }) + "</div>";

  // 3. previsão + resultado
  h += '<div class="fv-grade fv-g-hero"><section class="fv-caixa"><div class="fv-caixa-cab"><h3>Previsão de caixa<span class="s">Realizado até hoje + a receber × taxa de realização − a pagar. Sem as aplicações.</span></h3>' +
    Fin_seletorPeriodo_("90", [["30", "30 dias"], ["60", "60 dias"], ["90", "90 dias"]]) + '</div><div id="fvGrafPrev"></div></section>' +
    '<section class="fv-caixa"><div class="fv-caixa-cab"><h3>Resultado por mês<span class="s">Regime de caixa, sem transferências entre contas e entre empresas</span></h3><button type="button" class="fv-link" data-fv-ir="relatorios">DRE <i class="fas fa-arrow-right" aria-hidden="true"></i></button></div><div id="fvGrafRes"></div></section></div>';

  // 4. a receber (aging) + inadimplência + concentração
  var aging = [{ nome: "A vencer", c: "s0", v: 396649.77 }, { nome: "1–30 dias", c: "s1", v: 164886.12 }, { nome: "31–60", c: "s2", v: 21900.4 }, { nome: "61–90", c: "s3", v: 15513.28 }, { nome: "+90", c: "s4", v: 91065.16 }];
  var devedores = [["Hospital São Jerônimo do Norte", 48210.5, 64], ["Policlínica Três Rios", 31880, 22], ["Maternidade Bela Vista", 19420.75, 41], ["Centro Médico Aurora", 12300, 9], ["Clínica Vida Plena", 8840.2, 13]];
  h += '<div class="fv-grade fv-g3">' +
    Fin_caixa_("A receber por idade", "Em aberto " + Fin_moeda_(690014.73) + " · vencido há mais de 30 dias <b>18,6 %</b>", Graf_pilha_(aging) + '<p class="cm-meta" style="margin-top:10px">Cores do claro ao escuro: quanto mais escuro, mais antigo. A faixa cinza ainda não venceu.</p>', ["Contas a receber", "receber"]) +
    Fin_caixa_("Inadimplência", "Maiores devedores vencidos", devedores.map(function (d) { return '<div class="fv-hbar"><span class="nome">' + Fin_esc_(d[0]) + '</span><span class="cm-meta">' + d[2] + ' dias</span><span class="val">' + Fin_moedaCurta_(d[1]) + "</span></div>"; }).join("") +
      '<div class="fv-legenda"><span>Realização <b>67,7 %</b></span><span>Atraso médio <b>11 dias</b></span><span>Prazo médio <b>25 dias</b></span></div>', ["Cobrança", "cobranca"]) +
    Fin_caixa_("Concentração", "Os 5 maiores clientes somam <b>57,3 %</b> do aberto", Graf_hbar_([{ nome: "Hospital Regional Planalto", v: 142300 }, { nome: "Hospital São Jerônimo do Norte", v: 98100 }, { nome: "Hospital Vale do Cerrado", v: 61900 }, { nome: "Policlínica Três Rios", v: 51200 }, { nome: "Maternidade Bela Vista", v: 41800 }]) +
      '<p class="cm-sec" style="margin-top:12px">Maiores fornecedores do mês</p>' + Graf_hbar_([{ nome: "Distribuidora Ômega Peças", v: 88400 }, { nome: "Laboratório Parceiro RBC", v: 37900 }, { nome: "TransCerrado Logística", v: 18200 }], "saida"), ["Fornecedores e clientes", "cadastros"]) + "</div>";

  // 5. despesas + orçamento
  h += '<div class="fv-grade fv-g2">' +
    Fin_caixa_("Despesas por categoria", "Novembro até hoje × média dos últimos 12 meses. Acima de 30 % da média vira alerta.", D.despesas.map(function (d) {
      var v = (d.mes - d.media) / d.media * 100;
      return '<div class="fv-hbar"><span class="nome" title="' + Fin_esc_(d.cat) + '">' + Fin_esc_(d.cat) + '</span><span class="trilho saida"><i style="width:' + (d.mes / 148200 * 100).toFixed(1) + '%"></i></span><span class="val">' + Fin_moedaCurta_(d.mes) + '<small class="' + (v > 30 ? "fv-var-alta" : v < -5 ? "fv-var-baixa" : "") + '">' + (v > 30 ? '<i class="fas fa-triangle-exclamation" aria-hidden="true"></i> ' : "") + (v >= 0 ? "+" : "") + Fin_pct_(v, 0) + " da média</small></span></div>";
    }).join(""), ["Relatórios", "relatorios"]) +
    Fin_caixa_("Orçamento × realizado", "Novembro, por grupo de categoria", Graf_orcamento_(D.orcamento), ["Orçamento", "orcamento"]) + "</div>";

  // 6. DRE resumida
  var dre = [["Receita bruta", [428.1, 455.3, 467.7, 359.6, 512.9, 336.9]], ["(−) Impostos sobre vendas", [-31.2, -33.0, -34.1, -26.2, -37.4, -24.6]], ["Receita líquida", [396.9, 422.3, 433.6, 333.4, 475.5, 312.3]], ["(−) Custos (mercadoria e serviço contratado)", [-171.4, -188.0, -176.3, -169.9, -201.2, -122.4]], ["(−) Despesas operacionais", [-171.0, -238.6, -209.4, -194.6, -221.8, -170.9]], ["Resultado operacional", [54.5, -4.3, 47.9, -31.1, 52.5, 19.0]]];
  h += Fin_caixa_("DRE resumida (R$ mil)", "Últimos 6 meses · gerencial, regime de caixa · transferências e mútuos fora", '<div class="fv-tab-wrap fv-rolar"><table class="cm-tabela"><thead><tr><th>Linha</th>' + D.meses.map(function (m) { return '<th class="n">' + m + (m === "nov" ? "*" : "") + "</th>"; }).join("") + "</tr></thead><tbody>" +
    dre.map(function (l) { var forte = /^Receita líquida|^Resultado/.test(l[0]); return "<tr" + (forte ? ' style="font-weight:700"' : "") + '><td data-r="Linha">' + Fin_esc_(l[0]) + "</td>" + l[1].map(function (v, i) { return '<td class="n ' + (v < 0 && forte ? "fv-neg" : "") + '" data-r="' + D.meses[i] + '">' + v.toLocaleString("pt-BR", { minimumFractionDigits: 1 }) + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>", ["DRE completa", "relatorios"]);

  alvo.innerHTML = h;
  Graf_previsao_(Fin_$_("fvGrafPrev"), D.previsao, 90);
  Graf_pareadas_(Fin_$_("fvGrafRes"), D.resultado.map(function (r) { return { rot: r.m, a: r.rec, b: r.pag, parcial: r.parcial }; }), ["Recebido", "Pago"]);
  alvo.querySelectorAll("[data-fv-per]").forEach(function (b) { b.onclick = function () { alvo.querySelectorAll("[data-fv-per]").forEach(function (x) { x.setAttribute("aria-pressed", x === b); }); Graf_previsao_(Fin_$_("fvGrafPrev"), D.previsao, +b.getAttribute("data-fv-per")); }; });
}

function FinPainel_linhaConta_(c) {
  return '<div class="fv-conta"><span class="fv-banco" title="' + Fin_esc_(c.bancoNome) + '">' + c.banco + '</span><span><span class="n">' + Fin_esc_(c.apelido) + '</span><span class="m">' + Fin_emp_(c.emp) + Fin_conector_(c.conector, c.falta) + "</span></span>" +
    '<span class="s">' + Fin_moeda_(c.saldo) + "<small>" + Fin_esc_(c.fonte + " · " + c.saldoEm) + "</small></span></div>";
}

function FinPainel_dia_(alvo) {
  var D = FV_DADOS, pag = Fin_daEmpresa_(D.pagar), hoje = pag.filter(function (p) { return Fin_difDias_(p.venc) === 0; });
  var tarefa = function (sit, ic, t, m, q, qsub, ir) { return '<div class="fv-tarefa"><span class="ic ' + sit + '"><i class="fas ' + ic + '" aria-hidden="true"></i></span><span><span class="t">' + t + '</span><br><span class="m">' + m + '</span></span><span class="q">' + q + "<small>" + (qsub || "") + "</small></span></div>"; };
  var h = Fin_faixa_("", '<b>Bom dia, Wanessa.</b> Hoje há <b>' + hoje.length + (hoje.length === 1 ? " conta a pagar</b>" : " contas a pagar</b>") + ", 2 recebimentos previstos, 1 guia sem chegar e 16 movimentos sugeridos na conciliação. A lista abaixo está na ordem em que convém fazer.");
  h += '<div class="fv-grade fv-g4">' +
    Fin_kpi_({ rotulo: "Conciliação pendente", valor: "53 movimentos", detalhe: "<b>16 sugeridos</b> · 9 para conferir · meta zero", sit: "aviso", ir: "conciliacao" }) +
    Fin_kpi_({ rotulo: "Pago e não baixado", valor: "6 títulos", detalhe: "Saída no extrato sem baixa no Omie", sit: "critico", ir: "conciliacao" }) +
    Fin_kpi_({ rotulo: "Fornecedores sem dados", valor: "4 de hoje", detalhe: "Sem Pix nem conta: o pagamento não sai", sit: "aviso", ir: "cadastros" }) +
    Fin_kpi_({ rotulo: "Fechamento de outubro", valor: "9 de 12", detalhe: "Faltam extrato do Itaú, Caju e XMLs", sit: "neutro", ir: "fechamento" }) + "</div>";
  h += '<div class="fv-grade fv-g2">' +
    Fin_caixa_("Fazer hoje", "Em ordem de prioridade", '<div class="fv-tarefas">' +
      tarefa("critico", "fa-file-invoice", "Guia do ISS de outubro (Matriz) não chegou", "Vence amanhã. Peça ao contador ou anexe o PDF em Impostos e guias.", "R$ 7.820,44", "estimado", "impostos") +
      tarefa("aviso", "fa-scale-balanced", "Confirmar 16 sugestões da conciliação", "Sicredi Matriz 12 · Sicredi Filial 2 · Sicredi Prestadora 2", "16", "um toque cada") +
      tarefa("aviso", "fa-money-check-dollar", "Completar dados de pagamento de 4 fornecedores", "Vencem até sexta e não têm Pix nem conta conferida", "R$ 9.412,00", "travados") +
      tarefa("info", "fa-paper-plane", "Enviar 7 contas para aprovação", "Vencem até segunda; o lote das 09:00 só leva o que foi aprovado", "R$ 21.380,90", "a enviar") +
      tarefa("info", "fa-barcode", "Emitir 3 boletos de faturamento de ontem", "Sicredi Matriz · boleto com Pix (híbrido)", "R$ 14.920,00", "3 clientes") +
      tarefa("ok", "fa-circle-check", "Lote das 09:00 enviado ao banco", "11 efetivados e baixados no Omie · 1 a conferir", "R$ 48.230,00", "12 itens") + "</div>") +
    Fin_caixa_("Conciliação por conta", "Movimentos do extrato ainda sem par no Omie", '<div class="fv-contas">' + Fin_daEmpresa_(D.contas).filter(function (c) { return !c.aplicacao; }).map(function (c) {
      return '<div class="fv-conta"><span class="fv-banco">' + c.banco + '</span><span><span class="n">' + Fin_esc_(c.apelido) + '</span><span class="m">' + Fin_conector_(c.conector) + " Extrato: " + Fin_esc_(c.extratoEm) + (c.atrasado ? ' <span class="cm-selo vermelho">atrasado</span>' : "") + '</span></span><span class="s">' + c.naoConc + "<small>a conciliar</small></span></div>";
    }).join("") + "</div>", ["Abrir a conciliação", "conciliacao"]) + "</div>";
  // semana
  var dias = [0, 1, 2, 3, 4].map(function (k) { var d = FV_DADOS.dia(k + (k >= 2 ? 2 : 0)); return d; });
  h += Fin_caixa_("Semana", "A receber e a pagar por dia, com o saldo projetado no fim do dia (todas as contas da seleção)", '<div class="fv-semana">' + dias.map(function (d, i) {
    var r = Fin_soma_(Fin_daEmpresa_(D.receber).filter(function (x) { return x.saldo > 0 && Fin_difDias_(x.venc) === Fin_difDias_(d); }), "saldo"), p = Fin_soma_(pag.filter(function (x) { return x.estado !== "Pago" && Fin_difDias_(x.venc) === Fin_difDias_(d); }), "valor");
    return '<div class="fv-dia' + (i === 0 ? " hoje" : "") + '"><h5>' + Fin_diaSemana_(d) + " " + Fin_data_(d) + '</h5><div class="l"><span>Receber</span><b>' + Fin_moedaCurta_(r) + '</b></div><div class="l"><span>Pagar</span><b>' + Fin_moedaCurta_(p) + '</b></div><div class="sp">Saldo no fim do dia<b>' + Fin_moedaCurta_(D.previsao[Fin_difDias_(d)].saldo) + "</b></div></div>";
  }).join("") + "</div>");
  h += '<div class="fv-grade fv-g2">' +
    Fin_caixa_("Cobrança de hoje", "Régua de cobrança", '<div class="fv-tarefas">' + tarefa("info", "fa-handshake", "3 promessas de pagamento para hoje", "Confira no extrato à tarde; o SGO+ avisa se cair", "R$ 21.300,00", "") + tarefa("critico", "fa-heart-crack", "2 promessas quebradas ontem", "Hospital São Jerônimo do Norte · Maternidade Bela Vista", "R$ 67.631,25", "") + tarefa("aviso", "fa-phone-slash", "5 vencidos sem contato há mais de 7 dias", "Mande a 2ª via pelo próprio título", "R$ 22.140,20", "") + "</div>", ["Cobrança", "cobranca"]) +
    Fin_caixa_("Pendências que travam o fechamento", "", '<div class="fv-tarefas">' + tarefa("critico", "fa-building-columns", "Itaú Matriz: extrato de 18 e 19/11 não importado", "Falta credencial da API. Até lá: baixe o OFX no Internet Banking e solte em Conciliação.", "31", "movimentos") + tarefa("aviso", "fa-question", "2 recebimentos sem título", "Pix de pessoa física; o SGO+ sugere o cliente pelo CPF", "R$ 1.280,00", "") + tarefa("aviso", "fa-rotate-left", "1 envio a conferir no banco", "Pix P3022 sem resposta: não reenviar; consultar pelo código", "R$ 389,90", "") + "</div>", ["Fechamento", "fechamento"]) + "</div>";
  alvo.innerHTML = h;
}
