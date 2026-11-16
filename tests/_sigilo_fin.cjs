'use strict';
// 16/11/2026 (sigilo do Financeiro): carrega SGO_Omie_Sigilo.js no contexto do teste e, se o teste não definir a lista,
// a propriedade OMIE_SIGILO_CONTAS passa a ser as contas de teste com perfil FINANCEIRO, DIRETORIA ou ADMIN (ou área
// FINANCEIRO), calculada na hora da leitura. Espelha a produção, onde a lista é exatamente a Diretoria e o Financeiro.
// Um teste que grava a propriedade (props.OMIE_SIGILO_CONTAS = '[...]') passa a valer o que gravou.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');

function sigiloFin(ctx, props, usuarios, pasta, semPadrao) {
  const arq = path.join(pasta, 'SGO_Omie_Sigilo.js');
  if (!fs.existsSync(arq)) return false;
  vm.runInContext(fs.readFileSync(arq, 'utf8').replace(/\r\n/g, '\n'), ctx, { filename: 'SGO_Omie_Sigilo.js' });
  // 16/11/2026: identificação das planilhas e marca d'água do Financeiro (SGO_Financeiro_Marca.js), quando existir na pasta
  const marca = path.join(pasta, 'SGO_Financeiro_Marca.js');
  if (fs.existsSync(marca)) vm.runInContext(fs.readFileSync(marca, 'utf8'), ctx, { filename: 'SGO_Financeiro_Marca.js' });
  if (semPadrao || Object.prototype.hasOwnProperty.call(props, 'OMIE_SIGILO_CONTAS')) return true;
  let gravado;
  Object.defineProperty(props, 'OMIE_SIGILO_CONTAS', {
    enumerable: true, configurable: true,
    get() {
      if (gravado !== undefined) return gravado;
      return JSON.stringify((usuarios() || []).filter((u) => {
        const p = String(u.PERFIL || '').toUpperCase(), a = String(u.AREA || '').toUpperCase();
        return String(u.STATUS || 'ATIVO').toUpperCase() === 'ATIVO' && (['FINANCEIRO', 'DIRETORIA', 'ADMIN'].includes(p) || a === 'FINANCEIRO');
      }).map((u) => String(u.ID)));
    },
    set(v) { gravado = v; }
  });
  return true;
}
module.exports = { sigiloFin };
