/* =====================================================================
   DADOS FICTÍCIOS do protótipo do Financeiro v2.
   Nenhum nome, CNPJ, conta ou valor aqui é real. Os nomes de clientes e
   fornecedores foram inventados; CNPJs usam a sequência de exemplo.
   Os valores têm ordem de grandeza plausível para orientar o desenho.
   ===================================================================== */
var FV_HOJE = new Date(2026, 10, 19, 10, 42); // quinta, 19/11/2026 10:42

var FV_DADOS = (function () {
  var semente = 20261119;
  function rnd() { semente = (semente * 1103515245 + 12345) % 2147483648; return semente / 2147483648; }
  function escolhe(l) { return l[Math.floor(rnd() * l.length)]; }
  function dia(d) { var x = new Date(FV_HOJE); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() + d); return x; }
  function cent(v) { return Math.round(v * 100) / 100; }

  var empresas = [
    { id: "MATRIZ", apelido: "Matriz", classe: "matriz", nome: "Empresa Exemplo Matriz (fictícia)", cnpj: "12.345.678/0001-90", cidade: "Goiânia/GO", regime: "Lucro Presumido (exemplo)", omie: "PROPRIO", omieTxt: "Omie próprio (app atual)" },
    { id: "FILIAL", apelido: "Filial", classe: "filial", nome: "Empresa Exemplo Filial (fictícia)", cnpj: "12.345.678/0002-71", cidade: "Rio de Janeiro/RJ", regime: "Lucro Presumido (exemplo)", omie: "COMPARTILHADO", omieTxt: "Dentro do Omie da Matriz (contas + departamento)" },
    { id: "PRESTADORA", apelido: "Prestadora", classe: "prestadora", nome: "Prestadora Exemplo Serviços (fictícia)", cnpj: "98.765.432/0001-10", cidade: "Goiânia/GO", regime: "Simples Nacional (exemplo)", omie: "PROPRIO", omieTxt: "Omie próprio (chave a gravar)" }
  ];

  // contas bancárias por empresa; estado do conector: ligado | falta | manual | erro
  var contas = [
    { id: "c1", emp: "MATRIZ", banco: "748", bancoNome: "Sicredi", apelido: "Sicredi Matriz", ag: "0000", conta: "00000-0", conector: "ligado", saldo: 412380.55, saldoEm: "10:30", fonte: "API do banco", caps: ["saldo", "extrato", "Pix", "boleto", "pagar"], naoConc: 7, extratoEm: "hoje 10:30" },
    { id: "c2", emp: "MATRIZ", banco: "756", bancoNome: "Sicoob", apelido: "Sicoob Matriz", ag: "0000", conta: "00000-1", conector: "falta", falta: "SICOOB_MATRIZ_CLIENT_ID, SICOOB_MATRIZ_CERT_PFX", saldo: 96410.12, saldoEm: "ontem 18:00", fonte: "saldo do Omie", caps: [], naoConc: 12, extratoEm: "OFX de ontem" },
    { id: "c3", emp: "MATRIZ", banco: "341", bancoNome: "Itaú", apelido: "Itaú Matriz", ag: "0000", conta: "00000-2", conector: "falta", falta: "ITAU_MATRIZ_CLIENT_ID, ITAU_MATRIZ_CERT", saldo: 58220.9, saldoEm: "17/11 17:40", fonte: "saldo do Omie", caps: [], naoConc: 31, extratoEm: "OFX de 17/11", atrasado: true },
    { id: "c4", emp: "MATRIZ", banco: "104", bancoNome: "Caixa", apelido: "Caixa Matriz", ag: "0000", conta: "00000-3", conector: "manual", saldo: 23110.4, saldoEm: "ontem 17:00", fonte: "OFX manual", caps: [], naoConc: 0, extratoEm: "OFX de ontem" },
    { id: "c5", emp: "MATRIZ", banco: "104", bancoNome: "Caixa", apelido: "Aplicação Matriz", ag: "0000", conta: "00000-4", conector: "manual", saldo: 300000, saldoEm: "31/10", fonte: "aplicação (separada)", caps: [], naoConc: 0, extratoEm: "mensal", aplicacao: true },
    { id: "c6", emp: "FILIAL", banco: "748", bancoNome: "Sicredi", apelido: "Sicredi Filial", ag: "0000", conta: "00000-5", conector: "ligado", saldo: 64870.33, saldoEm: "10:30", fonte: "API do banco", caps: ["saldo", "extrato", "Pix", "boleto", "pagar"], naoConc: 2, extratoEm: "hoje 10:30" },
    { id: "c7", emp: "FILIAL", banco: "104", bancoNome: "Caixa", apelido: "Caixa Filial", ag: "0000", conta: "00000-6", conector: "manual", saldo: 4180, saldoEm: "14/11", fonte: "OFX manual", caps: [], naoConc: 0, extratoEm: "OFX de 14/11" },
    { id: "c8", emp: "PRESTADORA", banco: "748", bancoNome: "Sicredi", apelido: "Sicredi Prestadora", ag: "0000", conta: "00000-7", conector: "ligado", saldo: 38940.18, saldoEm: "10:30", fonte: "API do banco", caps: ["saldo", "extrato", "Pix", "boleto", "pagar"], naoConc: 1, extratoEm: "hoje 10:30" },
    { id: "c9", emp: "PRESTADORA", banco: "341", bancoNome: "Itaú", apelido: "Itaú Prestadora", ag: "0000", conta: "00000-8", conector: "falta", falta: "ITAU_PRESTADORA_CLIENT_ID, ITAU_PRESTADORA_CERT", saldo: 1250.77, saldoEm: "17/11", fonte: "saldo do Omie", caps: [], naoConc: 0, extratoEm: "OFX de 17/11" }
  ];

  var clientes = ["Hospital Vale do Cerrado", "Clínica Horizonte Azul", "Laboratório Pinheiral", "Hospital São Jerônimo do Norte", "Policlínica Três Rios", "Centro Médico Aurora",
    "Hospital Municipal de Campo Alto", "Clínica Odonto Serra Verde", "Instituto de Olhos Lago Sul", "Maternidade Bela Vista", "Hospital Regional Planalto", "Clínica Vida Plena"];
  var fornecedores = ["Distribuidora Ômega Peças", "TransCerrado Logística", "Papelaria Ipê Amarelo", "Metalúrgica Vale Forte", "Software Nuvem Clara", "Posto Rota 60",
    "Calibra Instrumentos Ltda.", "Imobiliária Jardim Goiás", "Contabilidade Exata", "Energia Distribuidora (conta de luz)", "Telefonia Conecta", "Laboratório Parceiro RBC"];
  var categoriasDesp = ["Compras de mercadorias para revenda", "Serviço contratado", "Salários", "Pró-labore", "Uso e consumo", "Aluguel", "Frete", "Impostos sobre vendas", "Software", "Tarifas bancárias"];
  var empIds = ["MATRIZ", "MATRIZ", "MATRIZ", "MATRIZ", "FILIAL", "FILIAL", "PRESTADORA"];

  var receber = [];
  for (var i = 0; i < 46; i++) {
    var dv = Math.round(rnd() * 70) - 40; var v = cent(800 + rnd() * rnd() * 38000); var emp = escolhe(empIds);
    var recebido = dv < -3 && rnd() < 0.35;
    receber.push({ id: "R" + (1000 + i), emp: emp, cliente: escolhe(clientes), doc: (rnd() < 0.5 ? "NFS-e " : "NF-e ") + (2200 + i), venc: dia(dv), valor: v, saldo: recebido ? 0 : v,
      forma: rnd() < 0.55 ? "Boleto" : "Pix", cobranca: recebido ? "Liquidado" : (dv < 0 ? (rnd() < 0.2 ? "Erro no banco" : "Vencido") : (rnd() < 0.15 ? "A emitir" : "Registrado")),
      situacao: recebido ? "Recebido" : dv < 0 ? "Vencido" : "A vencer", atraso: dv < 0 && !recebido ? -dv : 0 });
  }
  // casos fixos usados na narrativa
  receber.push({ id: "R2001", emp: "MATRIZ", cliente: "Hospital Regional Planalto", doc: "NFS-e 2281", venc: dia(0), valor: 18450, saldo: 18450, forma: "Boleto", cobranca: "Registrado", situacao: "A vencer", atraso: 0 });
  receber.push({ id: "R2002", emp: "FILIAL", cliente: "Clínica Horizonte Azul", doc: "NFS-e 2290", venc: dia(0), valor: 6230.5, saldo: 6230.5, forma: "Pix", cobranca: "Registrado", situacao: "A vencer", atraso: 0 });

  var formas = ["Pix", "Boleto", "Boleto", "Pix", "TED", "Débito automático"];
  var pagar = [];
  for (var j = 0; j < 52; j++) {
    var d2 = Math.round(rnd() * 40) - 14; var v2 = cent(120 + rnd() * rnd() * 24000); var forma = escolhe(formas);
    var est = d2 < 0 ? (rnd() < 0.5 ? "Pago" : "Vencido") : d2 === 0 ? escolhe(["Aprovado", "Aguardando aprovação", "Aprovado"]) : escolhe(["A enviar", "Aguardando aprovação", "Aprovado", "A enviar"]);
    var dados = forma === "Débito automático" ? "Débito na conta" : rnd() < 0.18 ? "Sem dados de pagamento" : forma === "Pix" ? "Chave conferida" : forma === "Boleto" ? "Linha digitável conferida" : "Conta conferida";
    pagar.push({ id: "P" + (3000 + j), emp: escolhe(empIds), fornecedor: escolhe(fornecedores), categoria: escolhe(categoriasDesp), venc: dia(d2), valor: v2, forma: forma, dados: dados, estado: est, anexo: rnd() < 0.8, enviadoPor: "Wanessa" });
  }

  var aprovacoes = [
    { id: "A1", tipo: "Pagamento", emp: "MATRIZ", quem: "Distribuidora Ômega Peças", desc: "Peças para revenda · NF-e 55120", venc: dia(0), valor: 18760.0, forma: "Boleto", dados: "Linha digitável conferida · beneficiário confere (CIP)", anexo: "boleto-55120.pdf", enviado: "Wanessa, hoje 08:12", etapa: 2 },
    { id: "A2", tipo: "Pagamento", emp: "MATRIZ", quem: "Calibra Instrumentos Ltda.", desc: "Calibração de padrões · NFS-e 812", venc: dia(1), valor: 4320.0, forma: "Pix", dados: "Chave CNPJ conferida · titular é o fornecedor", anexo: "nfse-812.pdf", enviado: "Wanessa, hoje 08:15", etapa: 2 },
    { id: "A3", tipo: "Pagamento", emp: "FILIAL", quem: "Imobiliária Jardim Goiás", desc: "Aluguel da filial · novembro", venc: dia(1), valor: 7800.0, forma: "Boleto", dados: "Linha digitável conferida", anexo: "aluguel-nov.pdf", enviado: "Wanessa, ontem 16:40", etapa: 2 },
    { id: "A4", tipo: "Pagamento", emp: "PRESTADORA", quem: "Folha da Prestadora · 9 colaboradores", desc: "Salários de novembro (lote)", venc: dia(1), valor: 27940.62, forma: "Pix (lote)", dados: "9 chaves CPF conferidas", anexo: "folha-nov.pdf", enviado: "Wanessa, hoje 09:02", etapa: 2, lote: 9 },
    { id: "A5", tipo: "Tarifa ou débito", emp: "MATRIZ", quem: "Sicredi Matriz", desc: "Tarifa de pacote de serviços · débito de 18/11", venc: dia(-1), valor: 89.9, forma: "Débito já feito", dados: "Categoria sugerida: Tarifas bancárias (regra TARIFA)", anexo: "", enviado: "Conciliação, hoje 06:31", etapa: 2 },
    { id: "A6", tipo: "Tarifa ou débito", emp: "MATRIZ", quem: "Sicredi Matriz", desc: "IOF · débito de 18/11", venc: dia(-1), valor: 12.47, forma: "Débito já feito", dados: "Categoria sugerida: IOF", anexo: "", enviado: "Conciliação, hoje 06:31", etapa: 2 },
    { id: "A7", tipo: "Transferência", emp: "MATRIZ", quem: "Matriz → Prestadora (mútuo)", desc: "Repasse para a folha da Prestadora", venc: dia(1), valor: 25000.0, forma: "Pix entre CNPJs", dados: "Entre empresas: sempre com aprovação", anexo: "", enviado: "Wanessa, hoje 09:05", etapa: 2 },
    { id: "A8", tipo: "Dados bancários", emp: "MATRIZ", quem: "TransCerrado Logística", desc: "Troca da chave Pix do fornecedor", venc: null, valor: 0, forma: "—", dados: "Nova chave é de outro CNPJ: exige justificativa", anexo: "", enviado: "Wanessa, ontem 17:20", etapa: 2, risco: true }
  ];

  var extrato = [
    { id: "E1", conta: "c1", emp: "MATRIZ", data: "19/11", hora: "09:58", desc: "PIX RECEBIDO · HOSPITAL VALE DO CERRADO", doc: "CNPJ 11.111.111/0001-11", valor: 12480.0, nivel: "certo", pts: 100,
      cands: [{ t: "R1007 · NFS-e 2207 · Hospital Vale do Cerrado", v: 12480.0, venc: "19/11", por: ["txid emitido pelo SGO+ (SGO1007)"], pts: 100 }] },
    { id: "E2", conta: "c1", emp: "MATRIZ", data: "19/11", hora: "08:41", desc: "LIQUIDAÇÃO BOLETO · POLICLÍNICA TRÊS RIOS", doc: "CNPJ 22.222.222/0001-22", valor: 3925.4, nivel: "sug", pts: 75,
      cands: [{ t: "R1013 · NFS-e 2213 · Policlínica Três Rios", v: 3850.0, venc: "12/11", por: ["CNPJ igual", "valor = saldo + juros/multa (R$ 75,40)"], dif: "juros e multa de R$ 75,40", pts: 75 }, { t: "R1031 · NF-e 2231 · Policlínica Três Rios", v: 3850.0, venc: "28/11", por: ["CNPJ igual"], dif: "vence só em 28/11", pts: 40 }] },
    { id: "E3", conta: "c1", emp: "MATRIZ", data: "18/11", hora: "15:12", desc: "PAGAMENTO BOLETO · CODIGO 23790.00000...", doc: "", valor: -2140.0, nivel: "sug", pts: 95,
      cands: [{ t: "P3017 · Papelaria Ipê Amarelo · Uso e consumo", v: 2140.0, venc: "18/11", por: ["linha digitável igual à do título"], pts: 95 }] },
    { id: "E4", conta: "c1", emp: "MATRIZ", data: "18/11", hora: "11:03", desc: "PIX RECEBIDO · MARIA EXEMPLO DA SILVA", doc: "CPF ***.456.789-**", valor: 640.0, nivel: "conferir", pts: 20,
      cands: [] },
    { id: "E5", conta: "c1", emp: "MATRIZ", data: "18/11", hora: "07:00", desc: "DEBITO AUTOMATICO · ENERGIA DISTRIBUIDORA", doc: "", valor: -3412.66, nivel: "conferir", pts: 55,
      cands: [{ t: "P3040 · Energia Distribuidora · Uso e consumo", v: 3398.1, venc: "20/11", por: ["nome confere", "data a 2 dias"], dif: "diferença de R$ 14,56", pts: 55 }] },
    { id: "E6", conta: "c6", emp: "FILIAL", data: "19/11", hora: "09:20", desc: "PIX RECEBIDO · CLINICA HORIZONTE AZUL", doc: "CNPJ 33.333.333/0001-33", valor: 6230.5, nivel: "sug", pts: 90,
      cands: [{ t: "R2002 · NFS-e 2290 · Clínica Horizonte Azul", v: 6230.5, venc: "19/11", por: ["CNPJ igual", "valor igual ao saldo"], pts: 90 }] }
  ];

  var transferencias = [
    { id: "TRF-0041", data: dia(1), de: "Matriz · Sicredi Matriz", para: "Prestadora · Sicredi Prestadora", caso: "Entre empresas (mútuo)", valor: 25000, estado: "Aguardando aprovação", etapa: 2 },
    { id: "TRF-0040", data: dia(-2), de: "Matriz · Sicredi Matriz", para: "Matriz · Caixa Matriz", caso: "Mesma empresa", valor: 15000, estado: "Concluída", etapa: 5 },
    { id: "TRF-0039", data: dia(-6), de: "Matriz · Itaú Matriz", para: "Matriz · Sicredi Matriz", caso: "Mesma empresa", valor: 40000, estado: "Concluída (já feita no banco)", etapa: 5 },
    { id: "TRF-0038", data: dia(-9), de: "Matriz · Sicredi Matriz", para: "Filial · Sicredi Filial", caso: "Entre empresas (mútuo)", valor: 12000, estado: "Concluída", etapa: 5 }
  ];

  var notas = [];
  for (var k = 0; k < 24; k++) {
    var tipoN = k % 3 === 0 ? "NF-e saída" : k % 3 === 1 ? "NFS-e" : "NF-e entrada";
    notas.push({ num: String(2300 - k), tipo: tipoN, emp: escolhe(empIds), quem: tipoN === "NF-e entrada" ? escolhe(fornecedores) : escolhe(clientes), emissao: dia(-k), valor: cent(500 + rnd() * 22000),
      situacao: k === 5 ? "Cancelada" : "Autorizada", titulo: k === 7 || k === 11 ? "Sem título" : "Com título", enviada: tipoN === "NF-e entrada" ? "—" : (k % 4 === 0 ? "Não enviada" : "Enviada") });
  }

  var cadastros = fornecedores.map(function (f, n) {
    return { nome: f, cnpj: "12.345.6" + (10 + n) + "/0001-" + (20 + n), tags: n === 8 ? "Fornecedor · Contador" : "Fornecedor", pix: n % 3 === 0 ? "—" : "CNPJ conferida", banco: n % 4 === 0 ? "—" : "748 · ag. 0000", pago90: cent(3000 + rnd() * 90000), cidade: escolhe(["Goiânia/GO", "Aparecida de Goiânia/GO", "Rio de Janeiro/RJ", "Anápolis/GO"]) };
  }).concat(clientes.slice(0, 6).map(function (c, n) {
    return { nome: c, cnpj: "98.765.4" + (10 + n) + "/0001-" + (30 + n), tags: "Cliente", pix: "—", banco: "—", pago90: 0, cidade: escolhe(["Goiânia/GO", "Brasília/DF", "Rio de Janeiro/RJ"]) };
  }));

  var guias = [
    { trib: "ISS", emp: "MATRIZ", comp: "10/2026", venc: dia(1), quem: "Contador", valor: 7820.44, situacao: "Falta guia", alerta: "Guia não chegou. Vence amanhã." },
    { trib: "DAS (Simples)", emp: "PRESTADORA", comp: "10/2026", venc: dia(1), quem: "Contador", valor: 3104.9, situacao: "Aguardando aprovação" },
    { trib: "INSS (DCTFWeb)", emp: "MATRIZ", comp: "10/2026", venc: dia(1), quem: "Contador", valor: 18412.33, situacao: "Aprovada · sai 09:00" },
    { trib: "FGTS", emp: "MATRIZ", comp: "10/2026", venc: dia(1), quem: "Contador", valor: 6540.1, situacao: "Aprovada · sai 09:00" },
    { trib: "FGTS", emp: "PRESTADORA", comp: "10/2026", venc: dia(1), quem: "Contador", valor: 2210.0, situacao: "Lançada" },
    { trib: "IRRF", emp: "MATRIZ", comp: "10/2026", venc: dia(1), quem: "Contador", valor: 2980.75, situacao: "Lançada" },
    { trib: "PIS/COFINS", emp: "MATRIZ", comp: "10/2026", venc: dia(6), quem: "Contador", valor: 11870.0, situacao: "Falta guia" },
    { trib: "ICMS", emp: "MATRIZ", comp: "10/2026", venc: dia(-4), quem: "Contador", valor: 4120.55, situacao: "Paga" },
    { trib: "ISS", emp: "FILIAL", comp: "10/2026", venc: dia(-9), quem: "Contador", valor: 1830.0, situacao: "Paga" }
  ];

  var caju = [
    { pedido: "CJ-2026-118", data: dia(0), colab: 14, valor: 8400, estado: "Aguardando aprovação", forma: "Pix do Caju" },
    { pedido: "CJ-2026-117", data: dia(-7), colab: 3, valor: 1500, estado: "Crédito liberado", forma: "Pix do Caju" },
    { pedido: "CJ-2026-116", data: dia(-14), colab: 15, valor: 9100, estado: "Crédito liberado", forma: "Pix do Caju" },
    { pedido: "CJ-2026-115", data: dia(-21), colab: 2, valor: 900, estado: "Crédito liberado", forma: "Boleto do Caju" }
  ];

  var meses = ["jun", "jul", "ago", "set", "out", "nov"];
  var resultado = [
    { m: "jun", rec: 428100, pag: 382600 }, { m: "jul", rec: 455300, pag: 471900 }, { m: "ago", rec: 467700, pag: 435700 },
    { m: "set", rec: 359600, pag: 404300 }, { m: "out", rec: 512900, pag: 466200 }, { m: "nov", rec: 336900, pag: 332600, parcial: true }
  ];

  var despesas = [
    { cat: "Compras de mercadorias para revenda", mes: 148200, media: 131500 },
    { cat: "Serviço contratado", mes: 61400, media: 41800 },
    { cat: "Salários", mes: 49800, media: 47300 },
    { cat: "Pró-labore", mes: 25000, media: 25000 },
    { cat: "Impostos sobre vendas", mes: 21900, media: 23600 },
    { cat: "Aluguel", mes: 14600, media: 14600 },
    { cat: "Uso e consumo", mes: 11200, media: 9900 },
    { cat: "Frete", mes: 7300, media: 8100 }
  ];

  var orcamento = [
    { g: "Receita de serviços", orc: 420000, real: 398500 }, { g: "Revenda de mercadorias", orc: 160000, real: 171300 },
    { g: "Mercadorias (custo)", orc: 140000, real: 148200, despesa: true }, { g: "Pessoal", orc: 118000, real: 121900, despesa: true },
    { g: "Serviços de terceiros", orc: 44000, real: 61400, despesa: true }, { g: "Ocupação (aluguel, energia)", orc: 26000, real: 25400, despesa: true },
    { g: "Administrativas", orc: 21000, real: 19800, despesa: true }
  ];

  var trilha = [
    { quando: "19/11 09:05", quem: "Wanessa", emp: "MATRIZ", onde: "SGO+", op: "Transferência TRF-0041 enviada para aprovação", res: "OK", cod: "TRF-0041" },
    { quando: "19/11 09:00", quem: "Rotina 09:00", emp: "MATRIZ", onde: "Banco · Sicredi", op: "Lote de pagamentos aprovados (12 itens)", res: "OK", cod: "LOTE-20261119" },
    { quando: "19/11 09:00", quem: "Rotina 09:00", emp: "MATRIZ", onde: "Banco · Sicredi", op: "Pix para Telefonia Conecta (P3022)", res: "A conferir", cod: "PAG-P3022" },
    { quando: "19/11 08:47", quem: "Charles", emp: "MATRIZ", onde: "SGO+", op: "Aprovou 9 pagamentos (R$ 31.402,18)", res: "OK", cod: "APR-0918" },
    { quando: "19/11 08:12", quem: "Wanessa", emp: "MATRIZ", onde: "Omie", op: "Incluiu conta a pagar P3049 (Distribuidora Ômega Peças)", res: "OK", cod: "SGO-P3049" },
    { quando: "19/11 06:31", quem: "Rotina extrato", emp: "MATRIZ", onde: "Banco · Sicredi", op: "Extrato lido: 23 movimentos, 16 sugeridos", res: "OK", cod: "EXT-c1-1119" },
    { quando: "19/11 06:30", quem: "Rotina fotografia", emp: "Todas", onde: "SGO+", op: "Fotografia diária das 3 empresas", res: "OK", cod: "FOTO-20261119" },
    { quando: "18/11 17:20", quem: "Wanessa", emp: "MATRIZ", onde: "SGO+", op: "Pediu troca da chave Pix de TransCerrado Logística", res: "Aguardando aprovação", cod: "FORN-0112" },
    { quando: "18/11 16:02", quem: "Dono", emp: "FILIAL", onde: "Omie", op: "Estorno da baixa R1022 (motivo: valor creditado em outra conta)", res: "OK", cod: "EST-0007" }
  ];

  // previsão de caixa (90 dias), consolidado
  var previsao = (function () {
    var s = 999372.0 - 300000, lista = [];
    for (var d = 0; d <= 90; d++) {
      var ent = d % 7 === 5 || d % 7 === 6 ? 0 : 9000 + 14000 * Math.abs(Math.sin(d * 1.7)) + (d % 15 === 4 ? 70000 : 0);
      var sai = d % 7 === 5 || d % 7 === 6 ? 0 : 11000 + 12000 * Math.abs(Math.cos(d * 1.3)) + (d % 30 === 1 ? 140000 : 0) + (d % 30 === 19 ? 60000 : 0);
      s += ent * 0.85 - sai;
      lista.push({ d: d, saldo: Math.round(s), min: Math.round(s - 18000 - d * 900), max: Math.round(s + 14000 + d * 700) });
    }
    return lista;
  })();

  return { empresas: empresas, contas: contas, receber: receber, pagar: pagar, aprovacoes: aprovacoes, extrato: extrato, transferencias: transferencias, notas: notas,
    cadastros: cadastros, guias: guias, caju: caju, resultado: resultado, despesas: despesas, orcamento: orcamento, trilha: trilha, previsao: previsao, meses: meses, dia: dia };
})();
