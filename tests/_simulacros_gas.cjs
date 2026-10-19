// Simulacros fiéis dos serviços do Apps Script usados pelos testes (Session e Utilities).
// Em produção o fuso do script é America/Sao_Paulo; Utilities.formatDate segue o padrão
// SimpleDateFormat do Java nos marcadores que o SGO+ usa (yyyy, yy, MM, dd, HH, mm, ss, texto entre aspas).
'use strict';

function partesNoFuso(data, fuso) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: fuso, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  });
  const p = {};
  for (const x of fmt.formatToParts(data)) p[x.type] = x.value;
  return p;
}

function formatDate(data, fuso, formato) {
  if (!(data instanceof Date) && !(data && typeof data.getTime === 'function')) {
    throw new Error('Exception: Invalid argument: date');
  }
  if (!isFinite(data.getTime())) throw new Error('Exception: Invalid argument: date');
  const p = partesNoFuso(data, fuso || 'America/Sao_Paulo');
  const mapa = { yyyy: p.year, yy: p.year.slice(-2), MM: p.month, dd: p.day, HH: p.hour, mm: p.minute, ss: p.second };
  return String(formato).replace(/'([^']*)'|yyyy|yy|MM|dd|HH|mm|ss/g, (m, lit) => (lit !== undefined ? lit : mapa[m]));
}

function criarSession(fuso) {
  return { getScriptTimeZone: () => fuso || 'America/Sao_Paulo' };
}

function criarUtilities(extra) {
  return Object.assign({
    formatDate,
    sleep() {},
    getUuid: () => require('node:crypto').randomUUID(),
    // String → bytes UTF-8; Byte[] do Apps Script vem com sinal (-128..127).
    base64Encode: dados => (typeof dados === 'string'
      ? Buffer.from(dados, 'utf8')
      : Buffer.from(Array.from(dados, b => b & 255))).toString('base64')
  }, extra || {});
}

module.exports = { formatDate, criarSession, criarUtilities };
