'use strict';
// Famílias de cenários dirigidos (cada uma com sorteio de tempos, sinais e quedas) + cenários aleatórios.
const { rngFrom, pick, between } = require('./simulador');

const S = (val, por) => ({ a: 'sinalCarro', val, por });
const N = (p, val, por) => ({ a: 'netPessoa', p, val, por });

const FAMILIAS = {
  F01: { nome: 'Viagem com duas pessoas: troca de condutor no hotel sem sinal (o primeiro fica no hotel)', gerar(r) {
    const semSinalCarro = r() < 0.6, semNetA = r() < 0.5, semNetB = r() < 0.5, aDevolveAntes = r() < 0.5;
    const p = [
      { a: 'retirar', p: 'A', co: r() < 0.7 ? ['B'] : [] },
      { a: 'dirigir', p: 'A', dest: 'hotel', via: 'rodovia', dur: between(r, 120, 400) },
      { a: 'mover', p: 'B', loc: 'hotel' },
      S(semSinalCarro ? false : true, 2000),
      N('A', !semNetA, 2000), N('B', !semNetB, 2000),
      { a: 'esperar', min: between(r, 300, 700) },
    ];
    if (aDevolveAntes) p.push({ a: 'devolver', p: 'A', ate: 20 }); // o que a regra literal manda: o primeiro devolve, o segundo retira
    p.push({ a: 'chave', p: 'B' }, { a: 'trocar', de: 'A', para: 'B', presentes: ['B'], ate: 40 },
      { a: 'retirar', p: 'B', ate: 30 },
      { a: 'dirigir', p: 'B', dest: 'cliente', via: 'rua', dur: between(r, 15, 60), desiste: 120 },
      { a: 'esperar', min: between(r, 60, 240) },
      { a: 'dirigir', p: 'B', dest: 'base', via: 'rodovia', dur: between(r, 120, 400) },
      { a: 'devolver', p: 'B' }, { a: 'esperar', min: 120 });
    return p;
  } },
  F02: { nome: 'Devolução no posto sem sinal; outro colega pega o carro lá depois', gerar(r) {
    return [
      { a: 'retirar', p: 'A' }, { a: 'dirigir', p: 'A', dest: 'posto', via: 'rodovia', dur: between(r, 30, 200) },
      S(false, between(r, 30, 900)), N('A', r() < 0.3, 60),
      { a: 'devolver', p: 'A', ate: 30 }, { a: 'mover', p: 'A', loc: 'casa' }, { a: 'chave', p: 'C' },
      { a: 'esperar', min: between(r, 20, 600) }, { a: 'mover', p: 'C', loc: 'posto' },
      { a: 'retirar', p: 'C', ate: 60 }, { a: 'dirigir', p: 'C', dest: 'base', via: 'rodovia', dur: between(r, 30, 200) },
      { a: 'devolver', p: 'C' }, { a: 'esperar', min: 90 },
    ];
  } },
  F03: { nome: 'Devolução com o carro ainda ligado (parado na vaga, motor funcionando)', gerar(r) {
    return [
      { a: 'retirar', p: 'A' }, { a: 'dirigir', p: 'A', dest: pick(r, ['base', 'cliente']), via: 'rua', dur: between(r, 10, 90), deixaLigado: true },
      { a: 'devolver', p: 'A' }, { a: 'esperar', min: between(r, 1, 6) }, { a: 'desligar' }, { a: 'esperar', min: 90 },
    ];
  } },
  F04: { nome: 'Devolução na garagem subterrânea e nova retirada logo depois (bloqueio na fila)', gerar(r) {
    return [
      { a: 'retirar', p: 'A' }, { a: 'dirigir', p: 'A', dest: 'garagem_sub', via: 'rua', dur: between(r, 10, 60) },
      { a: 'devolver', p: 'A', ate: 30 }, { a: 'esperar', min: between(r, 3, 40) }, { a: 'mover', p: 'B', loc: 'garagem_sub' },
      { a: 'chave', p: 'B' }, { a: 'retirar', p: 'B', ate: 30 },
      { a: 'dirigir', p: 'B', dest: 'cliente', via: 'rua', dur: between(r, 15, 60) }, { a: 'devolver', p: 'B' }, { a: 'esperar', min: 90 },
    ];
  } },
  F05: { nome: 'Carro sem sinal por dias (região remota), depois volta', gerar(r) {
    const p = [{ a: 'retirar', p: 'A', co: ['B'] }, { a: 'dirigir', p: 'A', dest: 'remoto', via: 'rodovia', dur: between(r, 120, 300) },
      S(false, between(r, 1440, 4320)), N('A', false, between(r, 600, 3000))];
    const n = between(r, 2, 6);
    for (let i = 0; i < n; i++) p.push({ a: 'esperar', min: between(r, 60, 700) }, { a: 'dirigir', p: 'A', dest: 'remoto', via: 'remoto', dur: between(r, 10, 120) });
    if (r() < 0.3) p.push({ a: 'devolver', p: 'A', ate: 30 }, { a: 'esperar', min: between(r, 60, 600) }, { a: 'chave', p: 'B' }, { a: 'retirar', p: 'B', ate: 60 },
      { a: 'dirigir', p: 'B', dest: 'base', via: 'rodovia', dur: between(r, 200, 500) }, { a: 'devolver', p: 'B' });
    else p.push({ a: 'dirigir', p: 'A', dest: 'base', via: 'rodovia', dur: between(r, 200, 500) }, { a: 'devolver', p: 'A' });
    p.push({ a: 'esperar', min: 120 });
    return p;
  } },
  F06: { nome: 'Servidor do SGO+ fora na hora da retirada (na base ou em viagem)', gerar(r) {
    const fora = r() < 0.5;
    const p = [];
    if (fora) p.push({ a: 'retirar', p: 'A', co: ['B'] }, { a: 'dirigir', p: 'A', dest: 'hotel', via: 'rodovia', dur: between(r, 100, 300) }, { a: 'devolver', p: 'A' },
      { a: 'esperar', min: between(r, 300, 600) });
    p.push({ a: 'servidor', por: between(r, 10, 600) }, { a: 'retirar', p: fora ? 'B' : 'A', ate: 60 },
      { a: 'dirigir', p: fora ? 'B' : 'A', dest: 'cliente', via: 'rua', dur: between(r, 20, 90), desiste: 300 },
      { a: 'devolver', p: fora ? 'B' : 'A', ate: 600 }, { a: 'esperar', min: 120 });
    if (fora) p.splice(4, 0, { a: 'chave', p: 'B' }, { a: 'mover', p: 'B', loc: 'hotel' });
    return p;
  } },
  F07: { nome: 'Plataforma do rastreador fora (na devolução ou na retirada)', gerar(r) {
    if (r() < 0.5) return [
      { a: 'retirar', p: 'A' }, { a: 'dirigir', p: 'A', dest: 'base', via: 'rua', dur: between(r, 20, 80) },
      { a: 'plataforma', por: between(r, 30, 600) }, { a: 'devolver', p: 'A' }, { a: 'esperar', min: between(r, 20, 300) },
      { a: 'chave', p: 'X' }, { a: 'dirigir', p: 'X', dest: 'rua', via: 'rua', dur: 30, desiste: 10 }, { a: 'esperar', min: 120 }];
    return [
      { a: 'inicio', loc: 'hotel', rele: 'B', chave: 'A', pessoasEm: 'hotel' },
      { a: 'plataforma', por: between(r, 30, 600) }, { a: 'retirar', p: 'A' },
      { a: 'dirigir', p: 'A', dest: 'cliente', via: 'rua', dur: between(r, 20, 90), desiste: 600 }, { a: 'devolver', p: 'A' }, { a: 'esperar', min: 120 }];
  } },
  F08: { nome: 'Celular sem internet na hora da devolução (na base); depois outra pessoa pega a chave', gerar(r) {
    return [
      { a: 'retirar', p: 'A' }, { a: 'dirigir', p: 'A', dest: 'base', via: 'rua', dur: between(r, 20, 120) },
      N('A', false, between(r, 30, 1440)), { a: 'devolver', p: 'A', ate: 20 }, { a: 'mover', p: 'A', loc: 'casa' },
      { a: 'esperar', min: between(r, 30, 900) }, { a: 'chave', p: pick(r, ['X', 'C']) },
      { a: 'dirigir', p: 'X', dest: 'rua', via: 'rua', dur: 30, desiste: 10 }, { a: 'esperar', min: 60 }];
  } },
  F09: { nome: 'Esqueceu de devolver; no dia seguinte outro precisa do carro', gerar(r) {
    return [
      { a: 'retirar', p: 'A' }, { a: 'dirigir', p: 'A', dest: 'cliente', via: 'rua', dur: between(r, 20, 80) },
      { a: 'esperar', min: between(r, 30, 200) }, { a: 'dirigir', p: 'A', dest: 'base', via: 'rua', dur: between(r, 20, 80), chaveFica: 'base' },
      { a: 'esquecer', p: 'A' }, { a: 'mover', p: 'A', loc: 'casa' }, { a: 'esperar', min: between(r, 300, 900) },
      { a: 'retirar', p: 'B', ate: 240 }, { a: 'dirigir', p: 'B', dest: 'cliente', via: 'rua', dur: 40, desiste: 120 }, { a: 'devolver', p: 'B' }, { a: 'esperar', min: 60 }];
  } },
  F10: { nome: 'Devolveu e alguém sem retirada pegou a chave', gerar(r) {
    const local = pick(r, ['base', 'base', 'cliente', 'garagem_sub', 'posto']);
    return [
      { a: 'retirar', p: 'A' }, { a: 'dirigir', p: 'A', dest: local, via: 'rua', dur: between(r, 15, 90) },
      { a: 'devolver', p: 'A', ate: 30 }, { a: 'esperar', min: between(r, 1, 90) }, { a: 'chave', p: 'X' }, { a: 'mover', p: 'X', loc: local },
      { a: 'dirigir', p: 'X', dest: 'rua', via: 'rua', dur: 30, desiste: 15 }, { a: 'esperar', min: 60 }];
  } },
  F11: { nome: 'Tentou usar sem fazer a retirada', gerar(r) {
    return [
      { a: 'chave', p: 'A' }, { a: 'dirigir', p: 'A', dest: 'cliente', via: 'rua', dur: 30, desiste: 10 },
      { a: 'retirar', p: 'A' }, { a: 'dirigir', p: 'A', dest: 'cliente', via: 'rua', dur: between(r, 20, 60), desiste: 120 },
      { a: 'devolver', p: 'A' }, { a: 'esperar', min: 60 }];
  } },
  F12: { nome: 'Gestão devolve em nome do condutor (ele ainda usando, ou esqueceu)', gerar(r) {
    if (r() < 0.6) return [
      { a: 'retirar', p: 'A' }, { a: 'dirigir', p: 'A', dest: 'cliente', via: 'rodovia', dur: between(r, 60, 200), durante: [{ k: between(r, 5, 50), a: 'gestaoDevolve' }] },
      { a: 'esperar', min: between(r, 30, 180) }, { a: 'gestaoDevolve', ate: 60 }, { a: 'esperar', min: between(r, 10, 200) },
      { a: 'dirigir', p: 'A', dest: 'base', via: 'rodovia', dur: between(r, 60, 200), desiste: 300 }, { a: 'devolver', p: 'A' }, { a: 'esperar', min: 60 }];
    return [
      { a: 'retirar', p: 'A' }, { a: 'dirigir', p: 'A', dest: 'base', via: 'rua', dur: between(r, 30, 120) }, { a: 'esquecer', p: 'A' },
      { a: 'esperar', min: between(r, 30, 600) }, { a: 'gestaoDevolve', ate: 600 }, { a: 'esperar', min: 90 }];
  } },
  F13: { nome: 'Reserva de outra pessoa começando com o carro ainda fora', gerar(r) {
    return [
      { a: 'retirar', p: 'A' }, { a: 'dirigir', p: 'A', dest: 'cliente', via: 'rodovia', dur: between(r, 60, 200) }, { a: 'esperar', min: between(r, 60, 200) },
      { a: 'retirar', p: 'B', ate: 20 }, ...(r() < 0.5 ? [{ a: 'gestaoDevolve', ate: 30 }] : []),
      { a: 'dirigir', p: 'A', dest: 'base', via: 'rodovia', dur: between(r, 60, 200), desiste: 300 }, { a: 'devolver', p: 'A' },
      { a: 'retirar', p: 'B' }, { a: 'dirigir', p: 'B', dest: 'cliente', via: 'rua', dur: 30, desiste: 60 }, { a: 'devolver', p: 'B' }, { a: 'esperar', min: 60 }];
  } },
  F14: { nome: 'Manutenção: carro na oficina, mecânico precisa manobrar', gerar(r) {
    return [
      { a: 'manut', on: true }, { a: 'retirar', p: 'A', ate: 10 }, { a: 'retirar', p: 'M' },
      { a: 'dirigir', p: 'M', dest: 'oficina', via: 'rua', dur: between(r, 10, 40) }, { a: 'esperar', min: between(r, 60, 1440) },
      { a: 'dirigir', p: 'M', dest: 'base', via: 'rua', dur: between(r, 10, 40) }, { a: 'devolver', p: 'M' }, { a: 'manut', on: false }, { a: 'esperar', min: 60 }];
  } },
  F15: { nome: 'Roubo (com a retirada aberta no posto, ou carro devolvido na base)', gerar(r) {
    if (r() < 0.6) return [
      { a: 'retirar', p: 'A' }, { a: 'dirigir', p: 'A', dest: 'posto', via: 'rodovia', dur: between(r, 30, 200) }, { a: 'chave', p: 'T' },
      { a: 'roubo', dest: 'remoto', via: 'rodovia', dur: between(r, 60, 300), desiste: 10 }, { a: 'esperar', min: 120 }];
    return [{ a: 'chave', p: 'T' }, { a: 'roubo', dest: 'remoto', via: 'rodovia', dur: 120, desiste: 20 }, { a: 'esperar', min: 60 }];
  } },
  F16: { nome: 'Bateria desligada logo depois da devolução', gerar(r) {
    return [
      { a: 'retirar', p: 'A' }, { a: 'dirigir', p: 'A', dest: pick(r, ['base', 'oficina']), via: 'rua', dur: between(r, 20, 90) },
      { a: 'devolver', p: 'A' }, { a: 'esperar', min: between(r, 0, 6) }, { a: 'bateria', on: false }, { a: 'esperar', min: between(r, 30, 600) },
      { a: 'bateria', on: true }, { a: 'chave', p: 'X' }, { a: 'dirigir', p: 'X', dest: 'rua', via: 'rua', dur: 20, desiste: 10 }, { a: 'esperar', min: 60 }];
  } },
  F17: { nome: 'Retirada com o carro bloqueado na garagem subterrânea (fora da base)', gerar(r) {
    return [
      { a: 'inicio', loc: 'garagem_sub', rele: 'B', chave: 'A', pessoasEm: 'garagem_sub' }, { a: 'retirar', p: 'A', co: ['B'], ate: 60 },
      { a: 'dirigir', p: 'A', dest: 'cliente', via: 'rua', dur: between(r, 20, 60), desiste: 600 }, { a: 'devolver', p: 'A' }, { a: 'esperar', min: 60 }];
  } },
  F18: { nome: 'Duas retiradas quase ao mesmo tempo (uma delas sem internet)', gerar(r) {
    const quem = pick(r, ['A', 'B']);
    return [
      N('A', r() < 0.4, between(r, 5, 300)), { a: 'retirar', p: 'A', ate: 5 }, { a: 'retirar', p: 'B', ate: 30 },
      { a: 'chave', p: quem }, { a: 'dirigir', p: quem, dest: 'cliente', via: 'rua', dur: between(r, 20, 90), desiste: 60 },
      { a: 'devolver', p: quem }, { a: 'esperar', min: 400 }];
  } },
  F19: { nome: 'CNH vence no meio da viagem', gerar(r) {
    return [
      { a: 'retirar', p: 'A', co: ['B'] }, { a: 'dirigir', p: 'A', dest: 'hotel', via: 'rodovia', dur: between(r, 60, 300), durante: [{ k: between(r, 5, 50), a: 'cnhVence', p: 'A' }] },
      { a: 'esperar', min: between(r, 300, 700) }, { a: 'dirigir', p: 'A', dest: 'base', via: 'rodovia', dur: between(r, 60, 300), desiste: 600 },
      { a: 'devolver', p: 'A' }, { a: 'retirar', p: 'A', ate: 10 }, { a: 'esperar', min: 60 }];
  } },
  F20: { nome: 'Troca de condutor sem o primeiro presente (foi embora, sem internet)', gerar(r) {
    const listado = r() < 0.5;
    return [
      { a: 'retirar', p: 'A', co: listado ? ['B'] : [] }, { a: 'dirigir', p: 'A', dest: 'cliente', via: 'rodovia', dur: between(r, 60, 200) },
      { a: 'mover', p: 'A', loc: 'casa' }, N('A', false, 2000), { a: 'esperar', min: between(r, 10, 900) }, { a: 'chave', p: 'B' }, { a: 'mover', p: 'B', loc: 'cliente' },
      { a: 'trocar', de: 'A', para: 'B', presentes: ['B'], listado, ate: 90 },
      { a: 'dirigir', p: 'B', dest: 'base', via: 'rodovia', dur: between(r, 60, 200), desiste: 240 }, { a: 'devolver', p: 'B' }, { a: 'esperar', min: 60 }];
  } },
  F21: { nome: 'Viagem de vários dias: o carro dorme na rua com a retirada aberta', gerar(r) {
    const p = [{ a: 'retirar', p: 'A', co: ['B'] }];
    const dias = between(r, 2, 4);
    for (let d = 0; d < dias; d++) p.push({ a: 'dirigir', p: 'A', dest: pick(r, ['hotel', 'cliente', 'rua']), via: pick(r, ['rodovia', 'rua']), dur: between(r, 30, 300) },
      { a: 'esperar', min: between(r, 400, 900) });
    p.push({ a: 'dirigir', p: 'A', dest: 'base', via: 'rodovia', dur: between(r, 100, 400) }, { a: 'devolver', p: 'A' }, { a: 'esperar', min: 60 });
    return p;
  } },
  F22: { nome: 'Devolução na rua (no cliente): o carro fica lá para o próximo', gerar(r) {
    return [
      { a: 'retirar', p: 'A' }, { a: 'dirigir', p: 'A', dest: 'cliente', via: 'rodovia', dur: between(r, 30, 200) },
      { a: 'devolver', p: 'A' }, { a: 'mover', p: 'A', loc: 'base' }, { a: 'chave', p: 'C' }, { a: 'esperar', min: between(r, 60, 1440) },
      { a: 'mover', p: 'C', loc: 'cliente' }, { a: 'retirar', p: 'C', ate: 60 },
      { a: 'dirigir', p: 'C', dest: 'base', via: 'rodovia', dur: between(r, 30, 200), desiste: 300 }, { a: 'devolver', p: 'C' }, { a: 'esperar', min: 60 }];
  } },
  F23: { nome: 'O primeiro condutor devolve pelo celular enquanto o colega está dirigindo', gerar(r) {
    return [
      { a: 'retirar', p: 'A', co: r() < 0.5 ? ['B'] : [] }, { a: 'chave', p: 'B' }, { a: 'mover', p: 'A', loc: 'hotel' },
      { a: 'dirigir', p: 'B', dest: 'cliente', via: pick(r, ['rua', 'rodovia']), dur: between(r, 40, 200), durante: [{ k: between(r, 5, 35), a: 'devolver', p: 'A' }], desiste: 300 },
      { a: 'esperar', min: 60 }];
  } },
  F24: { nome: 'Roubo com corte do fio do rastreador', gerar(r) {
    return [{ a: 'chave', p: 'T' }, { a: 'cortaFio' }, { a: 'roubo', dest: 'remoto', via: 'rodovia', dur: 120, desiste: 20 }, { a: 'esperar', min: 30 }];
  } },
  F25: { nome: 'Sinal oscilando no pátio na devolução; outra pessoa retira em seguida', gerar(r) {
    return [
      { a: 'retirar', p: 'A' }, { a: 'dirigir', p: 'A', dest: 'base', via: 'rua', dur: between(r, 20, 80) },
      S(r() < 0.5, between(r, 1, 6)), { a: 'devolver', p: 'A' }, S(false, between(r, 2, 20)), { a: 'esperar', min: between(r, 1, 10) },
      { a: 'chave', p: 'B' }, { a: 'retirar', p: 'B' }, { a: 'dirigir', p: 'B', dest: 'cliente', via: 'rua', dur: between(r, 20, 60), desiste: 120 },
      { a: 'devolver', p: 'B' }, { a: 'esperar', min: 60 }];
  } },
  F26: { nome: 'Servidor cai logo depois da devolução e alguém pega a chave', gerar(r) {
    return [
      { a: 'retirar', p: 'A' }, { a: 'dirigir', p: 'A', dest: 'base', via: 'rua', dur: between(r, 20, 80) },
      { a: 'devolver', p: 'A' }, { a: 'servidor', por: between(r, 30, 600) }, { a: 'esperar', min: between(r, 5, 120) },
      { a: 'chave', p: 'X' }, { a: 'dirigir', p: 'X', dest: 'rua', via: 'rua', dur: 30, desiste: 10 }, { a: 'esperar', min: 60 }];
  } },
  F27: { nome: 'Carro devolvido e bloqueado em local remoto sem sinal; outro colega vai buscar', gerar(r) {
    return [
      { a: 'inicio', loc: 'remoto', rele: 'B', chave: 'C', pessoasEm: 'base' }, S(false, between(r, 300, 3000)), { a: 'mover', p: 'C', loc: 'remoto' },
      { a: 'retirar', p: 'C', ate: 60 }, { a: 'dirigir', p: 'C', dest: 'base', via: 'rodovia', dur: between(r, 100, 300), desiste: 720 },
      { a: 'devolver', p: 'C' }, { a: 'esperar', min: 60 }];
  } },
  F28: { nome: 'Noite no hotel: o primeiro devolve, o segundo sai cedo sem gestão disponível', gerar(r) {
    return [
      { a: 'retirar', p: 'A' }, { a: 'dirigir', p: 'A', dest: 'hotel', via: 'rodovia', dur: between(r, 100, 300) }, { a: 'mover', p: 'B', loc: 'hotel' },
      S(r() < 0.5, 1500), { a: 'devolver', p: 'A' }, { a: 'chave', p: 'B' }, { a: 'esperar', min: between(r, 500, 700) },
      N('B', r() < 0.5, 300), { a: 'retirar', p: 'B', ate: 30 },
      { a: 'dirigir', p: 'B', dest: 'cliente', via: 'rua', dur: between(r, 20, 90), desiste: 300 }, { a: 'devolver', p: 'B' }, { a: 'esperar', min: 60 }];
  } },
};

// cenários aleatórios: sequência de ações plausíveis com erros humanos misturados
function aleatorio(r) {
  const pessoas = ['A', 'B', 'C'];
  const locs = ['base', 'cliente', 'posto', 'hotel', 'garagem_sub', 'remoto', 'rua'];
  const p = [];
  let dono = null;
  const n = between(r, 6, 16);
  for (let i = 0; i < n; i++) {
    const x = r();
    if (x < 0.06) p.push({ a: 'servidor', por: between(r, 5, 400) });
    else if (x < 0.1) p.push({ a: 'plataforma', por: between(r, 5, 400) });
    else if (x < 0.18) p.push(S(r() < 0.3, between(r, 5, 800)));
    else if (x < 0.24) p.push(N(pick(r, pessoas), false, between(r, 5, 600)));
    else if (x < 0.3) p.push({ a: 'chave', p: pick(r, ['X', 'C', 'B']) }, { a: 'dirigir', p: 'X', dest: 'rua', via: 'rua', dur: 20, desiste: 10 });
    else if (!dono || x < 0.4) {
      dono = pick(r, pessoas);
      p.push({ a: 'chave', p: dono }, { a: 'retirar', p: dono, co: r() < 0.5 ? [pick(r, pessoas)] : [], ate: 60 });
    } else if (x < 0.7) {
      const d = pick(r, locs);
      p.push({ a: 'dirigir', p: dono, dest: d, via: pick(r, ['rua', 'rodovia', 'remoto']), dur: between(r, 10, 300), desiste: 120, deixaLigado: r() < 0.1 },
        { a: 'esperar', min: between(r, 0, 600) });
      p.push({ a: 'mover', p: pick(r, pessoas), loc: d });
    } else if (x < 0.8) { const novo = pick(r, pessoas.filter(q => q !== dono)); p.push({ a: 'chave', p: novo }, { a: 'trocar', de: dono, para: novo, presentes: r() < 0.5 ? [novo] : [dono, novo], ate: 60 }); dono = novo; }
    else if (x < 0.86) { p.push({ a: 'esquecer', p: dono }); dono = null; }
    else if (x < 0.9) p.push({ a: 'gestaoDevolve', ate: 60 });
    else { p.push({ a: 'devolver', p: dono, ate: 60 }); dono = null; }
  }
  p.push({ a: 'esperar', min: 120 });
  return p;
}

function gerarTodos(porFamilia, aleatorios) {
  const lista = [];
  let seed = 1;
  for (const [id, f] of Object.entries(FAMILIAS)) {
    for (let k = 0; k < porFamilia; k++) {
      const r = rngFrom(seed * 104729 + 7);
      const sc = { id: id + '-' + k, familia: id, seed, horaInicio: between(r, 0, 23), passos: f.gerar(r) };
      fundo(r, sc); lista.push(sc); seed++;
    }
  }
  for (let k = 0; k < aleatorios; k++) {
    const r = rngFrom(seed * 104729 + 7);
    const sc = { id: 'R-' + k, familia: 'R', seed, horaInicio: between(r, 0, 23), passos: aleatorio(r) };
    fundo(r, sc); lista.push(sc); seed++;
  }
  return lista;
}
// quedas de fundo, sem aviso: servidor e plataforma
function fundo(r, sc) {
  sc.horizonte = 6 * 1440;
  sc.servidorFora = r() < 0.08 ? [[between(r, 0, 3000), 0]].map(([a]) => [a, a + between(r, 5, 240)]) : [];
  sc.plataformaFora = r() < 0.06 ? [[between(r, 0, 3000), 0]].map(([a]) => [a, a + between(r, 5, 240)]) : [];
  sc.percebeRouboMin = between(r, 5, 60);
}

module.exports = { FAMILIAS, gerarTodos };
