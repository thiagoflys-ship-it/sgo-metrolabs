'use strict';
const fs = require('fs'), path = require('path');
const OUT = process.argv[2];
const c = JSON.parse(fs.readFileSync(path.join(OUT, 'catalogo.json'), 'utf8'));
const csv = fs.readFileSync(path.join(OUT, 'INVENTARIO_TRAVAS.csv'), 'utf8').split(/\r?\n/).slice(1).filter(Boolean).map(l => l.split(';'));
const TEC = ['hidelbrandosampaio', 'paulohenrique', 'gabrielpereira', 'gabrieldias', 'joaopedro', 'rafael.marques'];
const quem = p => { const s = Object.keys(p.hoje).filter(k => p.hoje[k]); const t = s.filter(x => TEC.includes(x)); let r = s.filter(x => !TEC.includes(x)); if (t.length === 6) r.push('6 técnicos'); else r = r.concat(t); return r.length ? r.join(', ') : '— (ninguém)'; };
const tipos = {}; csv.forEach(l => tipos[l[7]] = (tipos[l[7]] || 0) + 1);
const travasLeg = csv.filter(l => l[7] === 'trava' && l[0].startsWith('base/legado')).length;
const travasNode = csv.filter(l => l[7] === 'trava' && l[0].startsWith('base/src')).length;
const NOMES_LOTE = { 1: 'Contas, senhas e acessos', 2: 'Programa de conduta (só travas de acesso)', 3: 'Financeiro', 4: 'Aprovação de relatório técnico', 5: 'Compras', 6: 'Frota: localização e bloqueio', 7: 'Comercial', 8: 'Assistência técnica e Representação', 9: 'Frota (uso e gestão), Caixa de decisões, Assistente do ponto', 10: 'Atividades, avisos, Início e comunicação', 11: 'Cadastros, documentos técnicos, Auvo e qualidade, Licitações, automação predial' };
const porLote = {};
c.poderes.forEach(p => { (porLote[p.lote] = porLote[p.lote] || []).push(p); });
// travas por lote: cada linha do CSV conta uma vez, no lote do primeiro poder
const loteDe = {}; c.poderes.forEach(p => loteDe[p.codigo] = p.lote);
const tpl = {}; csv.filter(l => l[7] === 'trava').forEach(l => { const lt = loteDe[l[6].split('+')[0]]; tpl[lt] = (tpl[lt] || 0) + 1; });
const defl = {}; csv.filter(l => l[7] === 'definicao').forEach(l => { const lt = loteDe[l[6].split('+')[0]]; if (lt) defl[lt] = (defl[lt] || 0) + 1; });
const cat = { ver: 'ver', operar: 'operar', aprovar: 'aprovar', excluir: 'excluir', administrar: 'administrar', valores: 'valores', sigiloso: 'sigiloso' };
const porCat = {}; c.poderes.forEach(p => porCat[p.categoria] = (porCat[p.categoria] || 0) + 1);
const esc = s => String(s).replace(/\|/g, '\\|');
const curto = s => esc(s.length > 110 ? s.slice(0, 107) + '…' : s);

let tabelas = '';
Object.keys(porLote).sort((a, b) => a - b).forEach(l => {
  tabelas += `\n### Lote ${l} — ${NOMES_LOTE[l]}\n\n${porLote[l].length} poderes, ${tpl[l] || 0} travas no servidor (mais ${defl[l] || 0} linhas de definição de regra).\n\n| Código | Módulo | Nome para o dono | Categoria | Regra padrão (espelho de hoje) | Quem tem hoje | Travas |\n|---|---|---|---|---|---|:-:|\n`;
  porLote[l].forEach(p => {
    const extras = [p.escopo ? 'escopo: ' + p.escopo : '', p.limite ? 'limite: ' + p.limite : '', p.lista ? 'lista: ' + p.lista : '', p.nova ? 'NOVO' : ''].filter(Boolean).join('; ');
    tabelas += `| \`${p.codigo}\` | ${esc(p.modulo)} | ${esc(p.nome)}${extras ? ' *(' + esc(extras) + ')*' : ''} | ${cat[p.categoria]} | \`${curto(p.padrao)}\` | ${quem(p)} | ${p.travas.filter(t => t.acao !== '(definição da regra)').length} |\n`;
  });
});
// matriz por pessoa (contagem de poderes)
const contas = c.usuarios.map(u => u.login);
let matriz = '| Pessoa | Perfil / área | Poderes hoje |\n|---|---|:-:|\n';
c.usuarios.forEach(u => { const n = c.poderes.filter(p => p.hoje[u.login]).length; matriz += `| ${u.login} | ${u.perfil} / ${u.area || '—'} | ${n} |\n`; });

const tela = c.travasSoTela.map(t => `| ${t.arquivo.replace('base/legado/', '')}:${t.linha} | ${esc(t.funcao)} | ${esc(t.acao)} | ${esc(t.regraAtual)} | ${esc(t.poder)} | ${esc(t.servidor)} |`).join('\n');
const div = c.divergencias.map(d => `| ${d.id} | ${esc(d.titulo)} | ${esc(d.onde)} | ${esc(d.efeito)} |`).join('\n');
const fora = c.foraDasCaixas.map(f => `| ${esc(f.caso)} | ${esc(f.regraHoje)} | ${esc(f.onde)} | ${esc(f.proposta)} |`).join('\n');
const prem = c.premissas.map(p => '- ' + p).join('\n');

const md = fs.readFileSync(path.join(__dirname, 'md-modelo.md'), 'utf8')
  .replace('{{NPODERES}}', c.poderes.length).replace(/{{NTRAVAS}}/g, travasLeg + travasNode).replace('{{NLEG}}', travasLeg).replace('{{NNODE}}', travasNode)
  .replace('{{NTELA}}', c.travasSoTela.length).replace('{{NDEF}}', tipos.definicao || 0).replace('{{NROT}}', tipos.roteamento || 0).replace('{{NFORA}}', tipos.fora_caixas || 0).replace('{{NNAO}}', tipos.nao_trava || 0)
  .replace('{{NDIV}}', c.divergencias.length).replace('{{PORCAT}}', Object.keys(porCat).map(k => k + ' ' + porCat[k]).join(', '))
  .replace('{{LOTES_RESUMO}}', Object.keys(porLote).sort((a, b) => a - b).map(l => `| ${l} | ${NOMES_LOTE[l]} | ${porLote[l].length} | ${tpl[l] || 0} |`).join('\n'))
  .replace('{{TABELAS}}', tabelas).replace('{{MATRIZ}}', matriz).replace('{{TELA}}', tela).replace('{{DIV}}', div).replace('{{FORA}}', fora).replace('{{PREMISSAS}}', prem)
  .replace('{{REGRAS_BASE}}', c.regrasBase);
fs.writeFileSync(path.join(OUT, 'CATALOGO_PODERES.md'), md);
console.log('ok', md.length, 'caracteres; travas', travasLeg, '+', travasNode, 'tela', c.travasSoTela.length, tipos);
