// PGT/POP (26/10/2026, erro relatado pela equipe: "A IA retornou o documento incompleto"): resposta fora do formato
// tenta de novo em vez de parar, texto com as seções e sem a marca do corpo vale, teto de saída por modelo.
// Código real num contexto isolado; a IA é simulada.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ARQ = path.join(__dirname, '..', 'apps-script-imports', 'portal_sgo_versao_cnpj_db', 'SGO_PgtPop_IA.js');

function ambiente(respostas) {
  const chamadas = [];
  const ctx = vm.createContext({
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'chave-teste' }) },
    Utilities: { sleep: () => {} },
    PGTPOP_CFG: { BASE_NORMATIVA: 'RDC 509/2021; ABNT NBR 15943:2011', ESTRUTURA_PGT_PADRAO: ['Escopo'], ESTRUTURA_POP_PADRAO: ['Objetivo'] },
    PgtPop_apiListarArquivosPdf: () => ({ ok: true, arquivos: [] }),
    UrlFetchApp: {
      fetch: (url, op) => {
        const corpo = JSON.parse(op.payload);
        chamadas.push({ modelo: decodeURIComponent(url.split('/models/')[1].split(':')[0]), tokens: corpo.generationConfig.maxOutputTokens });
        const r = respostas.length > 1 ? respostas.shift() : respostas[0];
        return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ candidates: [{ finishReason: r.fim || 'STOP', content: { parts: r.parts || [{ text: r.texto }] } }] }) };
      }
    }
  });
  vm.runInContext(fs.readFileSync(ARQ, 'utf8'), ctx, { filename: 'SGO_PgtPop_IA.js' });
  return { ctx, chamadas };
}

const certo = (s) => '###TITULO###\nTítulo\n###CORPO###\n## ' + s + ' ##\nTexto da seção.\n###FIM###';
const hospital = { razaoSocial: 'HOSPITAL TESTE LTDA' };

test('resposta fora do formato tenta de novo e o PGT sai completo', () => {
  const { ctx, chamadas } = ambiente([{ texto: 'Desculpe, segue um resumo sem marcas.' }, { texto: certo('Escopo') }]);
  const r = ctx.PgtPop_gerarTextoPGT_(hospital, '', [], [], null);
  assert.match(r.textoGerado, /## Escopo ##/);
  assert.equal(chamadas.length, 7, '1 repetição no bloco 1 + os outros 5 blocos');
  assert.match(r.titulo, /HOSPITAL TESTE LTDA/);
});

test('sem as marcas de título e corpo, mas com as seções: vale o texto e o título vem do sistema', () => {
  const { ctx } = ambiente([{ texto: 'Plano do hospital\n\n## Escopo ##\nTexto.\n\n## Finalidade ##\nMais texto.\n###FIM###' }]);
  const r = ctx.PgtPop_gerarTextoIA_('POP', hospital, '', { nome: 'Recebimento de equipamentos' }, []);
  assert.equal(r.titulo, 'Procedimento Operacional Padrão — Recebimento de equipamentos');
  assert.match(r.textoGerado, /^## Escopo ##/);
  assert.match(r.textoGerado, /## Finalidade ##\nMais texto\.$/);
});

test('raciocínio da IA (thought) não entra no texto', () => {
  const { ctx } = ambiente([{ parts: [{ text: 'pensando em ###CORPO### ...', thought: true }, { text: certo('Objetivo') }] }]);
  const r = ctx.PgtPop_gerarTextoIA_('POP', hospital, '', { nome: 'Teste' }, []);
  assert.equal(r.textoGerado, '## Objetivo ##\nTexto da seção.');
});

test('sempre fora do formato: erro diz que tentou os dois modelos; o reserva recebe o teto dele', () => {
  const { ctx, chamadas } = ambiente([{ texto: 'nada aproveitável' }]);
  assert.throws(() => ctx.PgtPop_gerarTextoIA_('POP', hospital, '', { nome: 'Teste' }, []), /após tentar 2 modelo\(s\).*fora do formato/);
  assert.equal(chamadas.length, 6);
  assert.ok(chamadas.filter((c) => c.modelo === 'gemini-2.0-flash').every((c) => c.tokens === 8192));
  const { ctx: c2, chamadas: ch2 } = ambiente([{ texto: certo('Escopo') }]);
  c2.PgtPop_gerarTextoPGT_(hospital, '', [], [], null);
  assert.ok(ch2.every((c) => c.modelo === 'gemini-2.5-flash' && c.tokens === 32768));
});
