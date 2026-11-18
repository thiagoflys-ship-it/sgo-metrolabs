'use strict';
// 18/11/2026 (Financeiro, Onda B: B2 Compras no Omie, B3 Caju no Omie, B4 conferência com o Omie). Ambiente comum: o código REAL do SGO+
// com o OMIE SIMULADO (tests/_financeiro_b1c3.cjs: bloco B, onda A e B1), mais os arquivos de Compras e SGO_Financeiro_Espelho.js.
// Nada sai para a rede: nenhum Omie, Caju, Gemini ou e-mail real (SGO_notificar_ grava na memória). Dados e pessoas fictícios.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const B = require('./_financeiro_b1c3.cjs');
const { PASTA, FORN, fornecedorNoOmie } = require('./_financeiro_simulado.cjs');

const COMPRAS = ['SGO_Compras_Config.js', 'SGO_Compras_Fornecedores.js', 'SGO_Compras_Requisicoes.js', 'SGO_Compras_Cotacoes.js', 'SGO_Compras_Pedido.js', 'SGO_Compras_Financeiro.js',
  'SGO_Compras_Faturas.js', 'SGO_Compras_Informar.js', 'SGO_Compras_Relatorios.js', 'SGO_Compras_Painel.js', 'SGO_Frota_Gastos.js', 'SGO_Pendencias_Compras.js'];
const brDe = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4);
const isoDe = (br) => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(br || '')); return m ? m[3] + '-' + m[2] + '-' + m[1] : ''; };

/** Compras, cartão, faturas, viagem, recarga e Caju fictícios (hoje = segunda 16/11/2026). */
function semear(a) {
  const t = a.tabelas, agora = '2026-11-16T10:00';
  t.CMP_FORNECEDORES = [{ ID: 'f1', CODIGO: 'F-001', DOCUMENTO: FORN, RAZAO_SOCIAL: 'PECAS FICTICIAS LTDA', NOME_FANTASIA: 'Pecas Ficticias', ATIVO: 'SIM' }];
  t.CMP_REQUISICOES = [
    { ID: 'r1', NUMERO: 'REQ-2026-0101', TITULO: 'Resistência 220 V da autoclave', VINCULO_TIPO: 'CLIENTE', CLIENTE_ID: 'c1', CLIENTE_NOME: 'Hospital Teste Alfa', COMPRADO_POR_ID: 'u_tec', COMPRADO_POR_NOME: 'TIAGO TECNICO TESTE', SITUACAO: 'ENTREGUE' },
    { ID: 'r2', NUMERO: 'REQ-2026-0102', TITULO: 'Ferramentas da oficina', VINCULO_TIPO: 'INTERNO', USO_INTERNO_MOTIVO: 'Oficina da sede', SITUACAO: 'PEDIDO_FEITO' },
    { ID: 'r3', NUMERO: 'REQ-2026-0090', TITULO: 'Compra antiga já lançada à mão', VINCULO_TIPO: 'INTERNO', SITUACAO: 'ENTREGUE' },
    { ID: 'r4', NUMERO: 'REQ-2026-0103', TITULO: 'Peça no cartão', VINCULO_TIPO: 'INTERNO', SITUACAO: 'ENTREGUE' },
    { ID: 'r5', NUMERO: 'REQ-2026-0104', TITULO: 'Mangueira de silicone', VINCULO_TIPO: 'CLIENTE', CLIENTE_NOME: 'Hospital Teste Alfa', SITUACAO: 'ENTREGUE' }
  ];
  t.CMP_PEDIDOS = [
    { ID: 'p1', NUMERO: 'PC-2026-0101', REQUISICAO_ID: 'r1', REQUISICAO_NUMERO: 'REQ-2026-0101', FORNECEDOR_ID: 'f1', FORNECEDOR_NOME: 'PECAS FICTICIAS LTDA', FORMA_PAGAMENTO: 'BOLETO', VALOR_TOTAL: 850, FIN_SITUACAO: 'CONFERIDA', FIN_POR_NOME: 'FABIO FINANCEIRO TESTE', NF_NUMERO: '4567' },
    { ID: 'p2', NUMERO: 'PC-2026-0102', REQUISICAO_ID: 'r2', REQUISICAO_NUMERO: 'REQ-2026-0102', FORNECEDOR_ID: 'f1', FORNECEDOR_NOME: 'PECAS FICTICIAS LTDA', FORMA_PAGAMENTO: 'FATURADO', VALOR_TOTAL: 300, FIN_SITUACAO: 'AGUARDANDO' },
    { ID: 'p3', NUMERO: 'PC-2026-0090', REQUISICAO_ID: 'r3', REQUISICAO_NUMERO: 'REQ-2026-0090', FORNECEDOR_ID: 'f1', FORNECEDOR_NOME: 'PECAS FICTICIAS LTDA', FORMA_PAGAMENTO: 'BOLETO', VALOR_TOTAL: 99, FIN_SITUACAO: 'CONFERIDA' },
    { ID: 'p4', NUMERO: 'PC-2026-0103', REQUISICAO_ID: 'r4', REQUISICAO_NUMERO: 'REQ-2026-0103', FORMA_PAGAMENTO: 'CARTAO_CREDITO', CARTAO_FINAL: '4321', VALOR_TOTAL: 120, FIN_SITUACAO: 'CONFERIDA' },
    { ID: 'p5', NUMERO: 'PC-2026-0104', REQUISICAO_ID: 'r5', REQUISICAO_NUMERO: 'REQ-2026-0104', FORNECEDOR_ID: 'f1', FORNECEDOR_NOME: 'PECAS FICTICIAS LTDA', FORMA_PAGAMENTO: 'BOLETO', VALOR_TOTAL: 210, FIN_SITUACAO: 'CONFERIDA' }
  ];
  t.CMP_PARCELAS = [
    { ID: 'x1', PEDIDO_ID: 'p1', REQUISICAO_ID: 'r1', REQUISICAO_NUMERO: 'REQ-2026-0101', FORMA: 'BOLETO', PARCELA: 1, PARCELAS: 1, VALOR: 850, DATA_COMPRA: '2026-11-05', COMPETENCIA: '2026-11', VENCIMENTO: '2026-11-25', SITUACAO: 'A_PAGAR', ATUALIZADO_EM: agora },
    { ID: 'x2', PEDIDO_ID: 'p2', REQUISICAO_ID: 'r2', REQUISICAO_NUMERO: 'REQ-2026-0102', FORMA: 'FATURADO', PARCELA: 1, PARCELAS: 1, VALOR: 300, DATA_COMPRA: '2026-11-10', COMPETENCIA: '2026-12', VENCIMENTO: '2026-12-10', SITUACAO: 'A_PAGAR', ATUALIZADO_EM: agora },
    { ID: 'x3', PEDIDO_ID: 'p3', REQUISICAO_ID: 'r3', REQUISICAO_NUMERO: 'REQ-2026-0090', FORMA: 'BOLETO', PARCELA: 1, PARCELAS: 1, VALOR: 99, DATA_COMPRA: '2026-09-20', COMPETENCIA: '2026-10', VENCIMENTO: '2026-10-05', SITUACAO: 'PAGA', ATUALIZADO_EM: agora },
    { ID: 'x4', PEDIDO_ID: 'p4', REQUISICAO_ID: 'r4', REQUISICAO_NUMERO: 'REQ-2026-0103', FORMA: 'CARTAO_CREDITO', CARTAO_FINAL: '4321', PARCELA: 1, PARCELAS: 1, VALOR: 120, DATA_COMPRA: '2026-10-20', COMPETENCIA: '2026-11', VENCIMENTO: '2026-11-10', SITUACAO: 'CONCILIADA', ATUALIZADO_EM: agora },
    { ID: 'x5', PEDIDO_ID: 'p5', REQUISICAO_ID: 'r5', REQUISICAO_NUMERO: 'REQ-2026-0104', FORMA: 'BOLETO', PARCELA: 1, PARCELAS: 1, VALOR: 210, DATA_COMPRA: '2026-11-09', COMPETENCIA: '2026-11', VENCIMENTO: '2026-11-30', SITUACAO: 'A_PAGAR', ATUALIZADO_EM: agora }
  ];
  t.CMP_CARTOES = [{ ID: 'k1', FINAL: '4321', APELIDO: 'Cartão da Logística', TIPO: 'CREDITO', RESPONSAVEL_ID: 'u_tec', RESPONSAVEL_NOME: 'TIAGO TECNICO TESTE', DIA_FECHAMENTO: 3, DIA_VENCIMENTO: 10, ATIVO: 'SIM' }];
  t.CMP_FATURAS = [
    { ID: 'ft1', CARTAO_FINAL: '4321', CARTAO_ID: 'k1', COMPETENCIA: '2026-11', SITUACAO: 'FECHADA', TOTAL_EXTRATO: 1234.5, TOTAL_SISTEMA: 1234.5, FECHADA_POR_NOME: 'FABIO FINANCEIRO TESTE', FECHADA_EM: '2026-11-12T10:00', FECHAMENTO_OBS: '' },
    { ID: 'ft2', CARTAO_FINAL: '4321', CARTAO_ID: 'k1', COMPETENCIA: '2026-12', SITUACAO: 'ABERTA', TOTAL_EXTRATO: '', TOTAL_SISTEMA: '' }
  ];
  t.CAD_CENTROS_CUSTO = (t.CAD_CENTROS_CUSTO || []).concat([{ ID: 'cc9', CODIGO: 'GO-TEC9', NOME: 'Técnica Goiás', CODIGO_OMIE: 'DEP-07', ATIVO: 'SIM' }]);
  t.VIA_SOLICITACOES = (t.VIA_SOLICITACOES || []).concat([{ ID: 's1', NUMERO: 'VG-2026-0007', CENTRO_CUSTO_ID: 'cc9', CENTRO_CUSTO_CODIGO: 'GO-TEC9', RESPONSAVEL_NOME: 'TIAGO TECNICO TESTE', DESTINO_CIDADE: 'Rio Verde', DESTINO_UF: 'GO', SITUACAO: 'CARGA_FEITA' }]);
  t.VIA_CARGAS = [
    { ID: 'c1', SOLICITACAO_ID: 's1', DATA: '2026-11-14', VALOR: 1200, CENTRO_CUSTO_CAJU: 'GO-TEC9', ORIGEM: 'CAJU_API', PEDIDO_CAJU_ID: 'ord-0001', TAXA_CAJU: 1.5, TOTAL_CAJU: 1201.5 },
    { ID: 'c2', SOLICITACAO_ID: 's1', DATA: '2026-11-15', VALOR: 300, CENTRO_CUSTO_CAJU: 'GO-TEC9', ORIGEM: '', PEDIDO_CAJU_ID: '', TAXA_CAJU: '', TOTAL_CAJU: '' }
  ];
  t.CJU_PEDIDOS = [{ ID: 'pd1', SOLICITACAO_ID: 's1', NUMERO: 'VG-2026-0007', PEDIDO_CAJU_ID: 'ord-0001', NOTA_NUMERO: '0001', PAGAMENTO: 'PIX_CODE', VALOR: 1200, TAXA_CENTAVOS: 150, TOTAL_CENTAVOS: 120150, SITUACAO: 'CREDITADO', AMBIENTE: 'producao' }];
  t.RCJ_SOLICITACOES = [{ ID: 'rc1', NUMERO: 'RC-2026-0003', USUARIO_ID: 'u_tec2', USUARIO_NOME: 'PAULO TECNICO TESTE', PERIODO_DE: '2026-11-01', PERIODO_ATE: '2026-11-30', SITUACAO: 'CARREGADA' }];
  t.RCJ_CARGAS = [{ ID: 'rk1', RECARGA_ID: 'rc1', NUMERO: 'RC-2026-0003', USUARIO_ID: 'u_tec2', USUARIO_NOME: 'PAULO TECNICO TESTE', DATA: '2026-11-10', VALOR: 400, ORIGEM: 'MANUAL', PEDIDO_ID: '' }];
}

/** Ambiente da onda B. o.agora (padrão segunda 16/11/2026 10:00), o.semDados (sem semear). */
function montarOndaB(o) {
  o = o || {};
  const a = B.montarB1C3({ agora: o.agora, extras: ['SGO_Financeiro_Espelho.js'] });
  if (typeof a.ctx.Cmp_s_ !== 'function') for (const f of COMPRAS) if (fs.existsSync(path.join(PASTA, f))) vm.runInContext(fs.readFileSync(path.join(PASTA, f), 'utf8').replace(/\r\n/g, '\n'), a.ctx, { filename: f });
  // o Espelho de novo, por último (a central de pendências de Compras pode ter sido montada depois dele)
  vm.runInContext(fs.readFileSync(path.join(PASTA, 'SGO_Financeiro_Espelho.js'), 'utf8').replace(/\r\n/g, '\n'), a.ctx, { filename: 'SGO_Financeiro_Espelho.js' });
  if (!o.semDados) semear(a);
  fornecedorNoOmie(a);
  a.clientes.push({ codigo_cliente_omie: 77, razao_social: 'CAJU BENEFICIOS FICTICIA SA', cnpj_cpf: '00.000.000/0001-91', inativo: 'N', tags: [{ tag: 'Fornecedor' }] });
  a.statusPagar = {}; // codigo_lancamento_omie -> status_titulo no Omie simulado
  const anterior = a.ctx.UrlFetchApp.fetch;
  const resp = (http, j) => ({ getResponseCode: () => http, getContentText: () => JSON.stringify(j) });
  a.ctx.UrlFetchApp.fetch = (url, op) => {
    if (/app\.omie\.com\.br/.test(url)) {
      const b = JSON.parse(op.payload), p = b.param[0];
      if (!(a.falhas[b.call] && a.falhas[b.call].length)) {
        // título lançado pelo teste: a consulta devolve o que foi lançado (e a situação que o teste definir)
        const lanc = b.call === 'ConsultarContaPagar' && a.contasPagar.find((c) => Number(c.codigo_lancamento_omie) === Number(p.codigo_lancamento_omie));
        if (lanc) { a.omie.push({ url, call: b.call, param: p }); return resp(200, Object.assign({}, lanc, { status_titulo: a.statusPagar[lanc.codigo_lancamento_omie] || 'A VENCER' })); }
        if (b.call === 'ConsultarContaPagar' && a.removidos && a.removidos.includes(Number(p.codigo_lancamento_omie))) { a.omie.push({ url, call: b.call, param: p }); return resp(500, { faultstring: 'ERROR: Lançamento não encontrado!', faultcode: 'SOAP-ENV:Client-103' }); }
      }
    }
    const r = anterior(url, op);
    // conta a pagar incluída: entra também na lista do B1 (ListarContasPagar por situação) para a aprovação de pagamentos
    if (/app\.omie\.com\.br/.test(url)) {
      const b = JSON.parse(op.payload), p = b.param[0];
      if (b.call === 'IncluirContaPagar' && r.getResponseCode() === 200) {
        const j = JSON.parse(r.getContentText());
        if (j.codigo_lancamento_omie) a.pagar.push({ codigo_lancamento_omie: j.codigo_lancamento_omie, numero_documento: p.numero_documento, codigo_cliente_fornecedor: p.codigo_cliente_fornecedor, codigo_categoria: p.codigo_categoria, id_conta_corrente: p.id_conta_corrente, venc: isoDe(p.data_vencimento), valor_documento: p.valor_documento, status_titulo: 'A VENCER' });
      }
    }
    return r;
  };
  a.espelho = () => a.tabelas.FIN_ESPELHO_OMIE || [];
  a.tela = (login, dados) => a.F('OmieEsp_apiTela', login || 'wanessa', dados || {});
  a.todos = (r) => [].concat(r.paraLancar, r.aguardando, r.lancados, r.dispensados, r.divergencias);
  a.item = (r, ref) => a.todos(r).find((x) => x.referencia === ref);
  /** Prepara (aba nova), confere a prévia e confirma no Omie. extra: campos do formulário a trocar. Devolve { preparar, previa, confirmar }. */
  a.lancar = (ref, extra, login) => {
    const r = a.tela(login), it = a.item(r, ref);
    if (!it) throw new Error('item ' + ref + ' não está na tela');
    const pr = a.F('OmieEsp_apiPreparar', login || 'wanessa', { chave: it.chave });
    if (!pr.ok) return { preparar: pr };
    const dados = Object.assign({}, pr.previo, { vencimento: isoDe(pr.previo.vencimento) || pr.previo.vencimento, contaId: 5, pessoaId: pr.previo.pessoaId || 55, categoria: pr.previo.categoria || '2.10' }, extra || {});
    const pv = a.F('OmieOps_apiPrevia', login || 'wanessa', { acao: 'criar', tipo: 'pagar', dados });
    if (!pv.ok) return { preparar: pr, previa: pv };
    const c = a.F('OmieOps_apiConfirmar', login || 'wanessa', { token: pv.token });
    return { preparar: pr, previa: pv, confirmar: c };
  };
  a.inclusoes = () => a.omie.filter((x) => x.call === 'IncluirContaPagar');
  return a;
}
module.exports = Object.assign({}, B, { montarOndaB, semear, brDe, isoDe, FORN });
