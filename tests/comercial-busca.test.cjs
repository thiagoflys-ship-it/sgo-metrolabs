// Comercial (27/10/2026): "os usuários não conseguem pesquisar produtos, assuntos, clientes e propostas". Causa: a busca só
// passava o texto para minúsculas e exigia o trecho inteiro, na ordem (os cadastros misturam "FUNDACAO" e "FUNDAÇÃO",
// "URUACU" e "Uruaçu"), ficava presa ao filtro "Situação" sem avisar (a maior parte das propostas e oportunidades está
// cancelada, ganha ou perdida) e o catálogo (mais de 1.300 itens do CRM) não tinha busca. Código real num contexto isolado
// (tests/_comercial_ambiente.cjs). Só dados de teste.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ambiente } = require('./_comercial_ambiente.cjs');

const ok = (r) => { assert.equal(r.ok, true, r.message); return r; };
const pasta = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');

function produtos() {
  const l = [
    { ID: 'p1', CODIGO: 'CRM-DF8FC1EA', NOME: 'FONTE CHAVEADA 9V 2A CX TOMADA', TIPO: 'PRODUTO', CATEGORIA: 'Peças', UNIDADE_MEDIDA: 'un', DESCRICAO: 'Fornecedor: Teste', PRECO: 55, CUSTO: 29.9, ATIVO: 'SIM' },
    { ID: 'p2', CODIGO: 'QT-AUTOCLAVE', NOME: 'Qualificação térmica de autoclave', TIPO: 'SERVICO', CATEGORIA: 'Serviços', UNIDADE_MEDIDA: 'un.', DESCRICAO: 'QI, QO e QD', PRECO: 4500, CUSTO: '', ATIVO: 'SIM' },
    { ID: 'p3', CODIGO: 'VENT-01', NOME: 'Ventilômetro Digital Eletrônico', TIPO: 'PRODUTO', CATEGORIA: 'Equipamentos', UNIDADE_MEDIDA: 'un', DESCRICAO: 'Fonte interna recarregável', PRECO: 3200, CUSTO: 2100, ATIVO: 'SIM' },
    { ID: 'p4', CODIGO: 'ARQ-01', NOME: 'Fonte antiga arquivada', TIPO: 'PRODUTO', CATEGORIA: 'Peças', UNIDADE_MEDIDA: 'un', DESCRICAO: '', PRECO: 10, CUSTO: '', ATIVO: 'NAO' }
  ];
  for (let i = 0; i < 260; i++) l.push({ ID: 'pp' + i, CODIGO: 'PECA-' + String(i).padStart(3, '0'), NOME: 'Peça de reposição número ' + i, TIPO: 'PRODUTO', CATEGORIA: 'Peças', UNIDADE_MEDIDA: 'un', DESCRICAO: '', PRECO: 1, CUSTO: '', ATIVO: 'SIM' });
  return l;
}

function amb() {
  return ambiente({ tabelas: {
    CAD_CLIENTES: [
      { ID: 'c1', RAZAO_SOCIAL: 'FUNDACAO TESTE PIO XII', NOME_FANTASIA: 'FUNDACAO TESTE PIO XII', CNPJ: '11.222.333/0001-81', STATUS: 'ATIVO' },
      { ID: 'c2', RAZAO_SOCIAL: 'FUNDAÇÃO TESTE PIO XII - PALMAS', NOME_FANTASIA: 'FUNDAÇÃO TESTE PIO XII - PALMAS', CNPJ: '', STATUS: 'ATIVO' },
      { ID: 'c3', RAZAO_SOCIAL: 'INSTITUTO TESTE IMED', NOME_FANTASIA: 'IMED TESTE - URUACU', CNPJ: '', STATUS: 'ATIVO' },
      { ID: 'c4', RAZAO_SOCIAL: 'CLINICA TESTE GAMA', NOME_FANTASIA: 'Clínica Teste Gama', CNPJ: '', STATUS: 'ATIVO' },
      { ID: 'c5', RAZAO_SOCIAL: 'FUNDACAO TESTE INATIVA', NOME_FANTASIA: 'Fundação Teste Inativa', CNPJ: '', STATUS: 'INATIVO' }
    ],
    CAD_UNIDADES: [{ ID: 'un4', CLIENTE_ID: 'c4', NOME_UNIDADE: 'Unidade Anápolis', CIDADE: 'Anápolis', UF: 'GO', STATUS: 'ATIVO' }],
    COM_PRODUTOS: produtos(),
    COM_OPORTUNIDADES: [
      { ID: 'o1', CODIGO: 'CRM-0001', TITULO: 'Manopla de foco cirúrgico', CLIENTE_ID: 'c1', CLIENTE_NOME: 'FUNDACAO TESTE PIO XII', FUNIL: 'PRODUTOS', ETAPA: 'PRO_1', RESPONSAVEL_ID: 'u_ven', RESPONSAVEL_NOME: 'VERA VENDEDORA TESTE', SITUACAO: 'GANHA', CRIADO_EM: '2026-09-01T10:00', OBSERVACOES: 'Vendedor no CRM: Fulano Teste' },
      { ID: 'o2', CODIGO: 'CRM-0002', TITULO: 'Peças de autoclave', CLIENTE_ID: 'c3', CLIENTE_NOME: 'IMED TESTE - URUACU', FUNIL: 'PRODUTOS', ETAPA: 'PRO_1', RESPONSAVEL_ID: 'u_ven', RESPONSAVEL_NOME: 'VERA VENDEDORA TESTE', SITUACAO: 'ABERTA', CRIADO_EM: '2026-10-01T10:00', PROXIMA_ACAO: 'Ligar', PROXIMA_ACAO_EM: '2026-10-20T10:00' },
      { ID: 'o3', CODIGO: 'CRM-0003', TITULO: 'Peso padrão', CLIENTE_ID: 'c3', CLIENTE_NOME: 'IMED TESTE - URUACU', FUNIL: 'PRODUTOS', ETAPA: 'PRO_1', RESPONSAVEL_ID: 'u_ven2', RESPONSAVEL_NOME: 'VITO VENDEDOR TESTE', SITUACAO: 'PERDIDA', CRIADO_EM: '2026-09-01T10:00' }
    ],
    COM_PROPOSTAS: [
      { ID: 'pr1', NUMERO: 'ORC-20261021-2008', REVISAO: 0, CLIENTE_ID: 'c3', CLIENTE_NOME: 'IMED TESTE - URUACU', CONTATO_NOME: 'JOÃO TESTE', RESPONSAVEL_ID: 'u_ven', RESPONSAVEL_NOME: 'VERA VENDEDORA TESTE', TITULO: 'Orçamento - cotação 70579',
        ITENS_JSON: JSON.stringify([{ codigo: 'CRM-023DE941', descricao: 'Acionador manual resetável com chave', quantidade: 10, precoUnitario: 79.9 }]), SITUACAO: 'CANCELADA', CRIADO_EM: '2026-10-21T10:00' },
      { ID: 'pr2', NUMERO: 'PROP-2026-0001', REVISAO: 0, CLIENTE_ID: 'c1', CLIENTE_NOME: 'FUNDAÇÃO TESTE PIO XII', RESPONSAVEL_ID: 'u_ven', RESPONSAVEL_NOME: 'VERA VENDEDORA TESTE', TITULO: 'Qualificação térmica',
        ITENS_JSON: '[]', SITUACAO: 'RASCUNHO', CRIADO_EM: '2026-10-22T10:00' },
      { ID: 'pr3', NUMERO: 'PROP-2026-0002', REVISAO: 0, CLIENTE_ID: 'c3', CLIENTE_NOME: 'IMED TESTE - URUACU', RESPONSAVEL_ID: 'u_ven2', RESPONSAVEL_NOME: 'VITO VENDEDOR TESTE', TITULO: 'Peso padrão',
        ITENS_JSON: '[]', SITUACAO: 'APROVADA', CRIADO_EM: '2026-10-22T10:00' }
    ]
  } });
}

test('normalização: sem acento, sem maiúscula, por partes e números sem pontuação', () => {
  const a = amb();
  const casa = (q, t) => a.ctx.Com_casaBusca_(a.ctx.Com_termosBusca_(q), t);
  assert.equal(casa('uruaçu', 'IMED - URUACU'), true);
  assert.equal(casa('URUACU', 'Hospital de Uruaçu'), true);
  assert.equal(casa('fundacao', 'FUNDAÇÃO PIO XII'), true);
  assert.equal(casa('pio fund', 'FUNDAÇÃO PIO XII'), true, 'palavras em qualquer ordem');
  assert.equal(casa('pio palmas', 'FUNDAÇÃO PIO XII'), false, 'todas as palavras precisam aparecer');
  assert.equal(casa('11222333', ['Cliente', '11.222.333/0001-81']), true, 'CNPJ só com os dígitos');
  assert.equal(casa('prop-2026-0001', 'PROP-2026-0001 rev.00'), true);
  assert.equal(casa('20260001', 'PROP-2026-0001'), true);
  assert.equal(casa('', 'qualquer coisa'), true, 'sem busca, tudo passa');
  assert.equal(casa('   ', 'qualquer coisa'), true);
});

test('clientes: acha com ou sem acento, pela unidade e nunca o inativo', () => {
  const a = amb();
  const nomes = (q) => ok(a.api('s_vera', 'clientes', { busca: q })).clientes.map((c) => c.nome);
  assert.deepEqual(nomes('fundação teste'), ['FUNDACAO TESTE PIO XII', 'FUNDAÇÃO TESTE PIO XII - PALMAS'], 'grafias misturadas no cadastro');
  assert.deepEqual(nomes('fundacao teste'), ['FUNDACAO TESTE PIO XII', 'FUNDAÇÃO TESTE PIO XII - PALMAS']);
  assert.deepEqual(nomes('uruaçu'), ['IMED TESTE - URUACU']);
  const g = ok(a.api('s_vera', 'clientes', { busca: 'anapolis' })).clientes;
  assert.equal(g.length, 1);
  assert.equal(g[0].nome, 'Clínica Teste Gama');
  assert.match(g[0].unidade, /Anápolis/, 'diz por qual unidade achou');
  assert.deepEqual(nomes('inativa'), [], 'cliente inativo não aparece');
  assert.deepEqual(nomes('11222333'), ['FUNDACAO TESTE PIO XII'], 'CNPJ só com os dígitos');
  assert.deepEqual(nomes('f'), [], 'uma letra só não busca');
});

test('oportunidades: sem acento, no contato/observações e avisa quantas a situação esconde', () => {
  const a = amb();
  let r = ok(a.api('s_vera', 'oportunidades', { situacao: 'ABERTA', busca: 'uruaçu' }));
  assert.deepEqual(r.oportunidades.map((o) => o.codigo), ['CRM-0002']);
  assert.equal(r.foraDoFiltro, 0, 'a perdida do Vito não é da Vera: não conta');
  r = ok(a.api('s_vera', 'oportunidades', { situacao: 'ABERTA', busca: 'cirurgico' }));
  assert.equal(r.oportunidades.length, 0);
  assert.equal(r.foraDoFiltro, 1, 'a ganha aparece no aviso');
  r = ok(a.api('s_vera', 'oportunidades', { situacao: 'TODAS', busca: 'CIRÚRGICO manopla' }));
  assert.deepEqual(r.oportunidades.map((o) => o.codigo), ['CRM-0001']);
  assert.equal(ok(a.api('s_vera', 'oportunidades', { situacao: 'TODAS', busca: 'fulano' })).oportunidades.length, 1, 'observações (vendedor do CRM)');
  r = ok(a.api('s_gaspar', 'oportunidades', { situacao: 'ABERTA', busca: 'uruacu' }));
  assert.equal(r.oportunidades.length, 1);
  assert.equal(r.foraDoFiltro, 1, 'gestão vê a perdida do Vito no aviso');
  assert.equal(ok(a.api('s_vera', 'oportunidades', { situacao: 'ABERTA' })).foraDoFiltro, 0, 'sem busca não há aviso');
  assert.equal(ok(a.api('s_gaspar', 'quadro', { busca: 'uruaçu peças' })).filtros.busca, 'uruaçu peças');
  const q = ok(a.api('s_gaspar', 'quadro', { funil: 'PRODUTOS', busca: 'uruacu pecas' }));
  assert.equal(q.colunas.reduce((s, c) => s + c.qtd, 0), 1, 'quadro do funil usa a mesma busca');
});

test('propostas: acha pelos itens, pelo contato, sem acento, e avisa as que estão em outras situações', () => {
  const a = amb();
  let r = ok(a.api('s_vera', 'propostas', { situacao: 'ABERTAS', busca: 'acionador resetavel' }));
  assert.equal(r.propostas.length, 0);
  assert.equal(r.foraDoFiltro, 1, 'a cancelada com o item aparece no aviso');
  r = ok(a.api('s_vera', 'propostas', { situacao: 'TODAS', busca: 'acionador resetavel' }));
  assert.deepEqual(r.propostas.map((p) => p.numero), ['ORC-20261021-2008']);
  assert.equal(ok(a.api('s_vera', 'propostas', { situacao: 'TODAS', busca: 'CRM-023DE941' })).propostas.length, 1, 'código do item');
  assert.equal(ok(a.api('s_vera', 'propostas', { situacao: 'TODAS', busca: 'joao' })).propostas.length, 1, 'contato sem acento');
  assert.deepEqual(ok(a.api('s_vera', 'propostas', { situacao: 'ABERTAS', busca: 'fundacao' })).propostas.map((p) => p.numero), ['PROP-2026-0001']);
  assert.equal(ok(a.api('s_vera', 'propostas', { situacao: 'TODAS', busca: 'uruacu' })).propostas.length, 1, 'a aprovada do Vito não é da Vera');
  assert.equal(ok(a.api('s_gaspar', 'propostas', { situacao: 'TODAS', busca: 'uruacu' })).propostas.length, 2);
  r = ok(a.api('s_fabio', 'propostas', { busca: 'uruaçu' }));
  assert.deepEqual(r.propostas.map((p) => p.numero), ['PROP-2026-0002'], 'Financeiro: só aprovadas');
  assert.equal(r.foraDoFiltro, 0, 'o Financeiro não vê as outras nem no aviso');
});

test('catálogo: busca no banco por código, nome, descrição e categoria; filtros, ordem e limite', () => {
  const a = amb();
  let r = ok(a.api('s_vera', 'catalogo', { busca: 'fonte 9v', limite: 200 }));
  assert.deepEqual(r.produtos.map((p) => p.codigo), ['CRM-DF8FC1EA'], 'arquivado não aparece para o vendedor');
  assert.equal(r.encontrados, 1);
  assert.equal(r.total, 263, 'vendedor conta só os ativos');
  assert.equal(r.produtos[0].custo, undefined, 'vendedor não vê custo');
  r = ok(a.api('s_vera', 'catalogo', { busca: 'fonte' }));
  assert.deepEqual(r.produtos.map((p) => p.codigo), ['CRM-DF8FC1EA', 'VENT-01'], 'nome começando com a busca vem antes do que achou só na descrição');
  assert.deepEqual(ok(a.api('s_vera', 'catalogo', { busca: 'ventilometro eletronico' })).produtos.map((p) => p.codigo), ['VENT-01'], 'sem acento');
  assert.deepEqual(ok(a.api('s_vera', 'catalogo', { busca: 'crm-df8f' })).produtos.map((p) => p.codigo), ['CRM-DF8FC1EA'], 'parte do código');
  assert.deepEqual(ok(a.api('s_vera', 'catalogo', { busca: 'qualificacao termica' })).produtos.map((p) => p.codigo), ['QT-AUTOCLAVE']);
  assert.deepEqual(ok(a.api('s_vera', 'catalogo', { busca: 'pecas', tipo: 'SERVICO' })).produtos.length, 0, 'filtro de tipo');
  assert.equal(ok(a.api('s_vera', 'catalogo', { categoria: 'servicos' })).produtos.length, 1, 'filtro de categoria sem acento');
  r = ok(a.api('s_vera', 'catalogo', { busca: 'peca', limite: 200 }));
  assert.equal(r.encontrados, 261, '260 peças pelo nome e a fonte pela categoria "Peças"');
  assert.equal(r.produtos.length, 200);
  assert.equal(r.limitado, true, 'avisa que há mais');
  assert.equal(r.produtos[0].codigo, 'PECA-000', 'começo do código vem antes');
  assert.deepEqual(r.categorias, ['Equipamentos', 'Peças', 'Serviços']);
  r = ok(a.api('s_vera', 'catalogo', {}));
  assert.equal(r.produtos.length, 263, 'sem limite (chamada antiga): lista inteira de ativos');
  assert.equal(r.limitado, false);
  // gestão: arquivados e custo
  r = ok(a.api('s_gaspar', 'catalogo', { incluirArquivados: true, busca: 'fonte', limite: 200 }));
  assert.deepEqual(r.produtos.map((p) => p.codigo), ['CRM-DF8FC1EA', 'ARQ-01', 'VENT-01']);
  assert.equal(r.produtos[0].custo, 29.9);
  assert.deepEqual(ok(a.api('s_gaspar', 'catalogo', { incluirArquivados: true, situacao: 'ARQUIVADOS' })).produtos.map((p) => p.codigo), ['ARQ-01']);
  assert.equal(ok(a.api('s_gaspar', 'catalogo', { incluirArquivados: true, situacao: 'ATIVOS', busca: 'arquivada' })).produtos.length, 0);
  // antes, o vendedor que pedia arquivados recebia a lista vazia
  assert.equal(ok(a.api('s_vera', 'catalogo', { incluirArquivados: true })).produtos.length, 263);
  assert.equal(a.api('s_tiago', 'catalogo', { busca: 'fonte' }).ok, false, 'técnico não abre o catálogo');
  assert.equal(ok(a.api('s_fabio', 'catalogo', { busca: 'fonte' })).produtos.length >= 1, true, 'Financeiro mantém o catálogo');
});

test('tela: campo de busca do catálogo chama o banco, ignora resposta atrasada e a ajuda explica', () => {
  const js = fs.readFileSync(path.join(pasta, 'JS_Comercial.html'), 'utf8');
  assert.match(js, /id="cmCatBusca"/);
  assert.match(js, /Com_chamar_\("catalogo", \{ incluirArquivados: gere, busca:/);
  assert.match(js, /chave: "catalogo"/);
  assert.match(js, /id="cmEscBusca"/, '"Do catálogo" da proposta tem busca');
  assert.match(js, /Ver em todas as situações/);
  assert.match(js, /if \(velha\(\)\) \{ fim\(\); return; \}/, 'resposta atrasada não apaga a mais nova');
  const ajuda = fs.readFileSync(path.join(pasta, 'SGO_Ajuda_Comercial.js'), 'utf8');
  assert.match(ajuda, /Buscar um produto ou serviço/);
  assert.match(ajuda, /Ver em todas as situações/);
  const manual = fs.readFileSync(path.join(__dirname, '../docs/MANUAL_MODULO_COMERCIAL.md'), 'utf8');
  assert.match(manual, /## Como a busca funciona no Comercial/);
  assert.match(manual, /Buscar no catálogo/);
});
