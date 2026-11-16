// Acessos por caixas — LOTE 3 (15/11/2026): Financeiro em Compras. Espelho: a regra de cada trava continua a de hoje; só a
// alteração gravada para a pessoa em Administração > Acessos (SIM dá, NÃO tira) muda o resultado. Motor do lote 5
// (Cmp_aplicarCaixas_ / Cmp_cx_ / Cmp_msgCaixa_, SGO_Compras_Config.js). eu.financeiro NÃO é sobrescrito (cada trava pergunta
// a própria caixa), para a alteração de uma caixa não mudar o padrão das outras.
// Caixas ligadas: FIN_CONFERIR_COMPRAS, FIN_FATURAS_CONCILIAR, FIN_A_PAGAR, FIN_FATURA_REABRIR, FIN_CARTOES_VER, FIN_CARTOES_EDITAR.
// Ficam desligadas: FIN_VER_CONTAS e FIN_CONCILIAR_BANCO (eram da página /financeiro do servidor, aposentada em 15/11; o Painel
// financeiro tem as caixas FIN_OMIE_*).
// Uso: node patch-lote3.cjs <pasta do legado>
const fs = require('fs');
const path = require('path');
const pasta = process.argv[2];
function ed(f, a, b) {
  f = path.join(pasta, f);
  let t = fs.readFileSync(f, 'utf8'); const nl = t.includes('\r\n') ? '\r\n' : '\n';
  a = a.replace(/\r?\n/g, nl); b = b.replace(/\r?\n/g, nl);
  if (t.split(a).length !== 2) throw new Error('trecho não encontrado uma vez em ' + f + ': ' + a.slice(0, 80));
  fs.writeFileSync(f, t.replace(a, () => b));
}
ed('SGO_Poderes.js', `  'FROTA_LOCALIZAR', 'FROTA_RASTREADOR_CONFIGURAR', 'FROTA_BLOQUEAR_PARTIDA', 'FROTA_LIBERAR_PARTIDA', 'FROTA_BLOQUEIO_ROUBO', 'FROTA_ODOMETRO_CORRIGIR'];`,
  `  'FROTA_LOCALIZAR', 'FROTA_RASTREADOR_CONFIGURAR', 'FROTA_BLOQUEAR_PARTIDA', 'FROTA_LIBERAR_PARTIDA', 'FROTA_BLOQUEIO_ROUBO', 'FROTA_ODOMETRO_CORRIGIR',
  // Lote 3 (15/11/2026, Financeiro em Compras): Cmp_cx_ / Cmp_exigirFinCx_ (SGO_Compras_Config.js) nas travas de SGO_Compras_Financeiro.js,
  // SGO_Compras_Faturas.js, SGO_Compras_Relatorios.js e nos sinais de SGO_Compras_Painel.js. FIN_VER_CONTAS e FIN_CONCILIAR_BANCO ficam
  // desligadas: eram da página /financeiro do servidor, aposentada (o Painel financeiro usa FIN_OMIE_*).
  'FIN_CONFERIR_COMPRAS', 'FIN_FATURAS_CONCILIAR', 'FIN_A_PAGAR', 'FIN_FATURA_REABRIR', 'FIN_CARTOES_VER', 'FIN_CARTOES_EDITAR'];`);
ed('SGO_Compras_Config.js', `var CMP_CAIXAS = ['COMPRAS_PEDIR', 'COMPRAS_VER_FILA', 'COMPRAS_VER_VALORES', 'COMPRAS_COMPRAR', 'COMPRAS_APROVAR_ATE_LIMITE', 'COMPRAS_APROVAR_DA_AREA',
  'COMPRAS_APROVAR_SEM_LIMITE', 'COMPRAS_GESTAO', 'COMPRAS_REGRAS_EDITAR', 'COMPRAS_CIENCIA_GESTAO'];`, `var CMP_CAIXAS = ['COMPRAS_PEDIR', 'COMPRAS_VER_FILA', 'COMPRAS_VER_VALORES', 'COMPRAS_COMPRAR', 'COMPRAS_APROVAR_ATE_LIMITE', 'COMPRAS_APROVAR_DA_AREA',
  'COMPRAS_APROVAR_SEM_LIMITE', 'COMPRAS_GESTAO', 'COMPRAS_REGRAS_EDITAR', 'COMPRAS_CIENCIA_GESTAO',
  // Lote 3 (15/11/2026): Financeiro em Compras. Só entram em eu.cx (alteração gravada); eu.financeiro não é sobrescrito.
  'FIN_CONFERIR_COMPRAS', 'FIN_FATURAS_CONCILIAR', 'FIN_A_PAGAR', 'FIN_FATURA_REABRIR', 'FIN_CARTOES_VER', 'FIN_CARTOES_EDITAR'];`);
ed('SGO_Compras_Config.js', `var CMP_NIVEL_CAIXA = {`, `/**
 * Lote 3 (15/11/2026): trava do Financeiro com caixa. padrao = a expressão de antes. Com SIM gravado passa; com NÃO gravado
 * recusa com o nome da caixa; sem alteração, recusa com a mensagem de antes (Cmp_exigir_ FINANCEIRO).
 */
function Cmp_exigirFinCx_(eu, codigo, padrao, acao) {
  if (Cmp_cx_(eu, codigo, padrao)) return eu;
  if (eu && eu.cx && eu.cx[codigo] === 'NAO') throw new Error(Cmp_msgCaixa_(eu, codigo, '', acao));
  return Cmp_exigir_(eu, 'FINANCEIRO', acao);
}
var CMP_NIVEL_CAIXA = {`);
ed('SGO_Compras_Financeiro.js', `  Cmp_exigir_(eu, 'FINANCEIRO', 'conferir a compra');`, `  Cmp_exigirFinCx_(eu, 'FIN_CONFERIR_COMPRAS', eu.financeiro, 'conferir a compra'); // lote 3`);
ed('SGO_Compras_Financeiro.js', `  Cmp_exigir_(eu, 'FINANCEIRO', 'ver a conferência das compras');`, `  Cmp_exigirFinCx_(eu, 'FIN_CONFERIR_COMPRAS', eu.financeiro, 'ver a conferência das compras'); // lote 3`);
ed('SGO_Compras_Financeiro.js', `  a.conferir = !!p && eu.financeiro && Cmp_up_(p.FIN_SITUACAO) === 'AGUARDANDO'`, `  a.conferir = !!p && Cmp_cx_(eu, 'FIN_CONFERIR_COMPRAS', eu.financeiro) && Cmp_up_(p.FIN_SITUACAO) === 'AGUARDANDO'`);
ed('SGO_Compras_Faturas.js', `function CmpCart_podeEditar_(eu) { return !!(eu.financeiro || eu.diretoria || eu.admin); }
function CmpCart_podeVer_(eu) { return !!(eu.financeiro || eu.comprador || eu.gestao || eu.gestor); }`, `// Lote 3 (15/11/2026): cartões com caixa (padrão = a regra de antes; SIM/NÃO gravado em Administração > Acessos muda).
function CmpCart_podeEditar_(eu) { return Cmp_cx_(eu, 'FIN_CARTOES_EDITAR', !!(eu.financeiro || eu.diretoria || eu.admin)); }
function CmpCart_podeVer_(eu) { return Cmp_cx_(eu, 'FIN_CARTOES_VER', !!(eu.financeiro || eu.comprador || eu.gestao || eu.gestor)); }`);
ed('SGO_Compras_Faturas.js', `  if (!CmpCart_podeVer_(eu)) Cmp_exigir_(eu, 'FINANCEIRO', 'ver os cartões da empresa');`, `  if (!CmpCart_podeVer_(eu)) { if (eu.cx && eu.cx.FIN_CARTOES_VER === 'NAO') throw new Error(Cmp_msgCaixa_(eu, 'FIN_CARTOES_VER', '', 'ver os cartões da empresa')); Cmp_exigir_(eu, 'FINANCEIRO', 'ver os cartões da empresa'); }`);
ed('SGO_Compras_Faturas.js', `  if (!CmpCart_podeEditar_(eu)) throw new Error('Não foi possível salvar o cartão: o cadastro dos cartões é do Financeiro, da Diretoria e do Administrador. Peça a eles');`,
  `  if (!CmpCart_podeEditar_(eu)) throw new Error(Cmp_msgCaixa_(eu, 'FIN_CARTOES_EDITAR', 'Não foi possível salvar o cartão: o cadastro dos cartões é do Financeiro, da Diretoria e do Administrador. Peça a eles', 'salvar o cartão'));`);
ed('SGO_Compras_Faturas.js', `function CmpFat_exigirFin_(eu, acao) {
  if (!(eu.financeiro || eu.diretoria || eu.admin || eu.gestao)) Cmp_exigir_(eu, 'FINANCEIRO', acao);
}`, `// Lote 3 (15/11/2026): conciliação das faturas (FIN_FATURAS_CONCILIAR) e A pagar (FIN_A_PAGAR), com a regra de antes como padrão.
function CmpFat_exigirFin_(eu, acao, codigo) {
  Cmp_exigirFinCx_(eu, codigo || 'FIN_FATURAS_CONCILIAR', !!(eu.financeiro || eu.diretoria || eu.admin || eu.gestao), acao);
}`);
ed('SGO_Compras_Faturas.js', `  CmpFat_exigirFin_(eu, 'ver o que há a pagar');`, `  CmpFat_exigirFin_(eu, 'ver o que há a pagar', 'FIN_A_PAGAR');`);
ed('SGO_Compras_Faturas.js', `  CmpFat_exigirFin_(eu, 'marcar como pago');`, `  CmpFat_exigirFin_(eu, 'marcar como pago', 'FIN_A_PAGAR');`);
ed('SGO_Compras_Faturas.js', `    if (!(eu.diretoria || eu.admin)) throw new Error('Não foi possível reabrir: reabrir fatura fechada é da Diretoria. Peça com o motivo');`,
  `    if (!Cmp_cx_(eu, 'FIN_FATURA_REABRIR', !!(eu.diretoria || eu.admin))) throw new Error(Cmp_msgCaixa_(eu, 'FIN_FATURA_REABRIR', 'Não foi possível reabrir: reabrir fatura fechada é da Diretoria. Peça com o motivo', 'reabrir a fatura')); // lote 3`);
ed('SGO_Compras_Relatorios.js', `  if (tipo === 'CONCILIACAO' && !(eu.financeiro || eu.gestao || eu.diretoria || eu.admin)) Cmp_exigir_(eu, 'FINANCEIRO', 'gerar o relatório da conciliação');`,
  `  if (tipo === 'CONCILIACAO') Cmp_exigirFinCx_(eu, 'FIN_CONFERIR_COMPRAS', !!(eu.financeiro || eu.gestao || eu.diretoria || eu.admin), 'gerar o relatório da conciliação'); // lote 3`);
// sinais da tela: conciliação das faturas segue a caixa (cartões já seguem por CmpCart_podeVer_)
let t = fs.readFileSync(path.join(pasta, 'SGO_Compras_Painel.js'), 'utf8');
const de = `podeConciliar = !!(eu.financeiro || eu.gestao || eu.diretoria || eu.admin)`, para = `podeConciliar = Cmp_cx_(eu, 'FIN_FATURAS_CONCILIAR', !!(eu.financeiro || eu.gestao || eu.diretoria || eu.admin))`;
const de2 = `podeConciliar: !!(eu.financeiro || eu.gestao || eu.diretoria || eu.admin)`, para2 = `podeConciliar: Cmp_cx_(eu, 'FIN_FATURAS_CONCILIAR', !!(eu.financeiro || eu.gestao || eu.diretoria || eu.admin))`;
if (t.split(de).length !== 2 || t.split(de2).length !== 2) throw new Error('Painel: sinais não encontrados');
t = t.replace(de, () => para).replace(de2, () => para2);
fs.writeFileSync(path.join(pasta, 'SGO_Compras_Painel.js'), t);
console.log('ok');
