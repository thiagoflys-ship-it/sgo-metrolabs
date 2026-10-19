const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const path = require('node:path');
const dir = path.join(__dirname, '../apps-script-imports/portal_sgo_versao_cnpj_db');
const gas = require('./_simulacros_gas.cjs');
function context(opcoes = {}) {
  const props = { GEMINI_API_KEY: opcoes.semChaveIA ? '' : 'chave-de-teste' };
  const c = { exigirSessao: sid => ({ perfil: sid === 'cliente' ? 'CLIENTE' : 'ADMIN' }), Utilities: gas.criarUtilities({
    DigestAlgorithm: { SHA_256: 'sha256' }, computeDigest: (_, value) => crypto.createHash('sha256').update(value).digest(), base64Encode: x => Buffer.from(x).toString('base64')
  }), Session: gas.criarSession(),
    // Chave da IA cadastrada por padrão (as leituras da IA são simuladas em cada caso); semChaveIA testa o texto padrão.
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || '' }) } };
  vm.createContext(c);
  // Em produção todos os .js são carregados juntos: a moldura A4 (SGO_DocA4, SGO_RelTecA4), a parte comum da
  // Declaração (SGO_DeclaracaoExec_Documento.js: DeclExecA4_*, DeclExec_finalizarHtml_) e a configuração da IA.
  for (const file of ['SGO_DocA4.js', 'SGO_RelTecA4.js', 'SGO_DocSalvar.js', 'SGO_DeclaracaoExec_Config.js', 'SGO_DeclaracaoExec_IA.js', 'SGO_DeclaracaoExec_Documento.js', 'SGO_DeclaracaoExec_Main.js', 'SGO_DeclaracaoExec_DocumentoQIQO.js']) vm.runInContext(fs.readFileSync(path.join(dir, file), 'utf8'), c);
  return c;
}
test('formatacao de medidas preserva sinal, fonte, IDs e datas', () => {
  const c = context();
  // Desde 16/10 (docs/PENTE_FINO_CALIBRACAO_DOCUMENTOS_20261016.md): mínimo de 2 casas, sem cortar as que o valor tem, milhar pt-BR.
  assert.equal(c.DeclExecQIQO_formatarMedicoes_('Certificado 202600250, TAG A123, data 09/10/2026; -0,1234 °C; 1.234,567 rpm; 0.122 s; 2 bar'), 'Certificado 202600250, TAG A123, data 09/10/2026; -0,1234 °C; 1.234,567 rpm; 0,122 s; 2,00 bar');
});
test('vereditos bloqueados e observacoes tecnicas preservadas', () => {
  const c = context();
  assert.throws(() => c.DeclExecQIQO_validarTextos_({ conclusao: 'Equipamento aprovado' }), /qualidade/);
  assert.equal(c.DeclExecQIQO_validarTextos_({ qiTexto: 'Achado registrado; avaliar pela qualidade.' }).qiTexto, 'Achado registrado; avaliar pela qualidade.');
});
test('APIs QIQO e persistencia exigem equipe inclusive chamada direta', () => {
  const c = context();
  for (const name of ['DeclExec_apiGerarRascunhoQIQO', 'DeclExec_apiMontarDocumentoQIQO', 'DeclExec_apiSalvarDocumento', 'DeclExec_apiListarDocumentosSalvos']) {
    assert.throws(() => c[name]({}), /Sessão/);
    assert.throws(() => c[name]({}, 'cliente'), /equipe interna/);
  }
});
test('QD nao continua quando leitura falha e hash acompanha a evidencia', () => {
  const c = context();
  const cfg = [{ codigo: 'rpm', label: 'Rotação' }], arquivos = [{ codigo: 'rpm', base64: 'original' }];
  c.DeclExecIA_lerCertificado_ = () => '';
  assert.throws(() => c.DeclExec_resolverCertificadosQD_(cfg, arquivos, 'centrifuga'), /evidência/);
  // Sem a chave da IA a leitura vazia não trava: sai o texto padrão que remete ao certificado anexado (17/10, geram sem IA).
  const semChave = context({ semChaveIA: true });
  semChave.DeclExecIA_lerCertificado_ = () => '';
  assert.match(semChave.DeclExec_resolverCertificadosQD_(cfg, arquivos, 'centrifuga')[0].leituraIA, /consultados no próprio certificado/);
  c.DeclExecIA_lerCertificado_ = () => 'Certificado 202600250: 1000,123 rpm.';
  const resultado = c.DeclExec_resolverCertificadosQD_(cfg, arquivos, 'centrifuga');
  assert.equal(resultado[0].leituraIA, 'Certificado 202600250: 1.000,123 rpm.');
  assert.equal(resultado[0].arquivoHash, c.DeclExecQIQO_hashArquivo_('original'));
  assert.notEqual(resultado[0].arquivoHash, c.DeclExecQIQO_hashArquivo_('substituido'));
});
test('montagem rejeita arquivo substituido depois do rascunho', () => {
  const c = context();
  c.DeclExec_montarDadosContextoQIQO_ = () => ({ usaQD: true, itensCalibraveis: [{ codigo: 'rpm', label: 'Rotação' }] });
  assert.throws(() => c.DeclExec_apiMontarDocumentoQIQO({ textos: {}, leiturasQD: [{ codigo: 'rpm', temCertificado: true, leituraIA: '1000 rpm', contextoEquipamento: '', arquivoHash: c.DeclExecQIQO_hashArquivo_('original') }], certificadosQD: [{ codigo: 'rpm', base64: 'substituido' }] }, 'admin'), /rascunho novamente/);
});
test('todos os 15 perfis reais resolvem contexto, anexos e montam documento', () => {
  const c = context();
  const perfis = Object.values(c.DECLEXEC_CFG.PERFIS);
  assert.equal(perfis.length, 15);
  c.DeclExecIA_lerCertificado_ = (_, __, label) => label + ': 1,234 bar; certificado 202600250.';
  c.DeclExecIA_criarTextosQIQO_ = () => ({ introducao: 'Atendimento registrado.', objetivo: 'Registrar dados.', qiTexto: 'Itens verificados.', qoTexto: 'Operação observada.', qdTexto: 'Dados da fonte: 1,234 bar.', conclusao: 'Avaliação pela qualidade do cliente.' });
  c.DeclExecIA_analisarFoto_ = () => 'Indicador em 1,234 bar.';
  for (const perfil of perfis) {
    const payload = { perfil: perfil.codigo, cliente: 'Cliente', tagEquipamento: 'TAG-123', dataInicio: '09/10/2026', tecnicoExecutor: 'Técnico', itensQI: perfil.itensQI.map(x => ({ codigo: x.codigo, marcado: true })), itensQO: perfil.itensQO.map(x => ({ codigo: x.codigo, marcado: true })), certificadosQD: perfil.itensCalibraveis.map(x => ({ codigo: x.codigo, base64: 'pdf-' + x.codigo, mimeType: 'application/pdf' })) };
    const rascunho = c.DeclExec_apiGerarRascunhoQIQO(payload, 'admin');
    assert.equal(rascunho.dados.perfilCodigo, perfil.codigo);
    assert.equal(rascunho.dados.certificadosQD.length, perfil.usaQD ? perfil.itensCalibraveis.length : 0);
    const final = c.DeclExec_apiMontarDocumentoQIQO({ ...payload, leiturasQD: rascunho.dados.certificadosQD, textos: rascunho.textos }, 'admin');
    assert.ok(final.html.includes(perfil.label), perfil.codigo);
    assert.ok(final.html.includes('1,234 bar'), perfil.codigo);
    assert.ok(final.html.includes('TAG-123'), perfil.codigo);
  }
});
test('ramos sem QO/QD omitem etapas e nao leem certificados', () => {
  const c = context(), base = Object.values(c.DECLEXEC_CFG.PERFIS)[0];
  c.DECLEXEC_CFG = { PERFIS: { SEM_ETAPAS: { ...base, codigo: 'SEM_ETAPAS', usaQO: false, usaQD: false } } };
  c.DeclExecIA_lerCertificado_ = () => { throw Error('Nao deveria ler'); };
  c.DeclExecIA_criarTextosQIQO_ = () => ({ qiTexto: 'Instalação verificada.' });
  const payload = { perfil: 'SEM_ETAPAS', dataInicio: '09/10/2026', itensQI: base.itensQI.map(x => ({ codigo: x.codigo, marcado: true })), certificadosQD: [] };
  const r = c.DeclExec_apiGerarRascunhoQIQO(payload, 'admin');
  assert.equal(r.dados.itensQO.length, 0);
  assert.equal(r.dados.certificadosQD.length, 0);
  const html = c.DeclExec_apiMontarDocumentoQIQO({ ...payload, textos: r.textos }, 'admin').html;
  assert.ok(!html.includes('QUALIFICAÇÃO DE OPERAÇÃO'));
  assert.ok(!html.includes('QUALIFICAÇÃO DE DESEMPENHO'));
});
test('anexos e leituras duplicados ou desconhecidos sao rejeitados', () => {
  const c = context(), cfg = [{ codigo: 'rpm', label: 'Rotação' }];
  for (const lista of [[{ codigo: 'x' }], [{ codigo: 'rpm' }, { codigo: 'rpm' }], [null]]) {
    assert.throws(() => c.DeclExecQIQO_indexarCertificados_(cfg, lista), /desconhecido|duplicado/);
    assert.throws(() => c.DeclExec_resolverCertificadosQD_(cfg, lista, ''), /desconhecido|duplicado/);
  }
});
test('legendas e observacoes nao permitem veredito e QD exige leitura', () => {
  const c = context();
  // Desde 18/10 (157d735) as fotos saem pela parte comum DeclExecA4_fotos_ com o filtro DeclExecQIQO_limpo_ (no lugar de
  // DeclExecQIQO_montarFotos_) e as tabelas/figuras recebem o numerador do documento (RelTecA4_numerador_).
  const num = () => c.RelTecA4_numerador_();
  assert.throws(() => c.DeclExecA4_fotos_([{ base64: 'AAAA', legendaIA: 'Equipamento aprovado' }], num(), 'Registro fotográfico da QI', c.DeclExecQIQO_limpo_), /qualidade/);
  assert.throws(() => c.DeclExecA4_fotos_([{ base64: 'AAAA', legendaTecnico: 'Equipamento aprovado' }], num(), 'Registro fotográfico da QI', c.DeclExecQIQO_limpo_), /qualidade/);
  assert.throws(() => c.DeclExecQIQO_montarCertificadosQD_([{ temCertificado: true, leituraIA: '' }], num()), /ausente/);
  assert.throws(() => c.DeclExecQIQO_montarCertificadosQD_([{ temCertificado: true, leituraIA: '1 bar', observacao: 'aprovado' }], num()), /qualidade/);
});
