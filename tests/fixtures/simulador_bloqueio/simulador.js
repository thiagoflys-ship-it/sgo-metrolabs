'use strict';
/*
 * CÓPIA PARA TESTE (tests/fixtures/simulador_bloqueio): o simulador do estudo de 21/10/2026, com a variante "SGO"
 * em que a decisão do servidor é a função REAL do SGO+ (FrotaBlq_decidir_ de SGO_Frota_Bloqueio.js), ligada por
 * usarMotor(). O resto do simulador (carro, fila da iTracker, pessoas, sinal) é o do estudo, sem mudança.
 *
 * Simulador do bloqueio/liberação da partida (estudo, 21/10/2026). Sem dado real.
 * Passo de 1 minuto. Cada cenário é um roteiro de passos (retirar, devolver, trocar, dirigir...)
 * com quedas de servidor, da plataforma do rastreador, de sinal do carro e de internet do celular.
 * O mesmo cenário (mesma semente) roda em cada variante de regra; os invariantes são conferidos a cada minuto.
 */

// ---------- sorteio com semente ----------
function rngFrom(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const between = (r, a, b) => a + Math.floor(r() * (b - a + 1));

// ---------- variantes de regra ----------
const VARIANTES = {
  V0: { nome: 'Regra literal: devolveu, bloqueia na hora', imediato: true, idadeMaxPos: Infinity, exigeParado: false, esperaDesligadoMin: 0,
    devolucaoSoParado: false, gestaoRestrita: false, troca: false, offline: false, central24h: false, rfid: false, cancelaPendenteNaRetirada: false },
  V1: { nome: 'Como está hoje no SGO+ (bloqueio pendente até parar e desligar; posição de até 30 min)', imediato: false, idadeMaxPos: 30, exigeParado: true, esperaDesligadoMin: 0,
    devolucaoSoParado: false, gestaoRestrita: false, troca: false, offline: false, central24h: false, rfid: false, cancelaPendenteNaRetirada: true },
  V2: { confere: true, transfereEsquecida: true, nome: 'V1 + só com sinal confirmado (posição de até 2 min) + devolução só parado + gestão restrita', imediato: false, idadeMaxPos: 2, exigeParado: true, esperaDesligadoMin: 0,
    devolucaoSoParado: true, gestaoRestrita: true, troca: false, offline: false, central24h: false, rfid: false, cancelaPendenteNaRetirada: true },
  V3: { confere: true, transfereEsquecida: true, nome: 'V2 + "passar o carro" (troca de condutor sem devolução e sem comando)', imediato: false, idadeMaxPos: 2, exigeParado: true, esperaDesligadoMin: 0,
    devolucaoSoParado: true, gestaoRestrita: true, troca: true, offline: false, central24h: false, rfid: false, cancelaPendenteNaRetirada: true },
  V4: { confere: true, transfereEsquecida: true, nome: 'V3 + aplicativo sem internet (devolução, troca e retirada guardadas no celular)', imediato: false, idadeMaxPos: 2, exigeParado: true, esperaDesligadoMin: 0,
    devolucaoSoParado: true, gestaoRestrita: true, troca: true, offline: true, central24h: false, rfid: false, cancelaPendenteNaRetirada: true },
  V5: { confere: true, transfereEsquecida: true, nome: 'V4 + emergência 24 h (central do rastreador) + bloqueio de roubo', imediato: false, idadeMaxPos: 2, exigeParado: true, esperaDesligadoMin: 0,
    devolucaoSoParado: true, gestaoRestrita: true, troca: true, offline: true, central24h: true, rfid: false, cancelaPendenteNaRetirada: true },
  V6: { confere: true, transfereEsquecida: true, soDesligado: true, nome: 'V5 + rastreador ajustado para só cortar com a ignição desligada (a confirmar com a iTracker)', imediato: false, idadeMaxPos: 2, exigeParado: true, esperaDesligadoMin: 0,
    devolucaoSoParado: true, gestaoRestrita: true, troca: true, offline: true, central24h: true, rfid: false, cancelaPendenteNaRetirada: true },
  V7: { confere: true, transfereEsquecida: true, soDesligado: true, nome: 'V6 + leitor de cartão no carro (futuro)', imediato: false, idadeMaxPos: 2, exigeParado: true, esperaDesligadoMin: 0,
    devolucaoSoParado: true, gestaoRestrita: true, troca: true, offline: true, central24h: true, rfid: true, cancelaPendenteNaRetirada: true },
  // Teste: as regras da V6 com a decisão do servidor feita pela função do SGO+ (usarMotor)
  SGO: { motor: true, transfereEsquecida: true, soDesligado: true, nome: 'SGO+ (FrotaBlq_decidir_) com o rastreador cortando só desligado', imediato: false, idadeMaxPos: 2, exigeParado: true, esperaDesligadoMin: 0,
    devolucaoSoParado: true, gestaoRestrita: true, troca: true, offline: true, central24h: true, rfid: false, cancelaPendenteNaRetirada: true },
  SGO_SEM_AJUSTE: { motor: true, transfereEsquecida: true, soDesligado: false, nome: 'SGO+ (FrotaBlq_decidir_) com o rastreador de hoje (corta abaixo de 20 km/h)', imediato: false, idadeMaxPos: 2, exigeParado: true, esperaDesligadoMin: 0,
    devolucaoSoParado: true, gestaoRestrita: true, troca: true, offline: true, central24h: true, rfid: false, cancelaPendenteNaRetirada: true },
};
let MOTOR = null;
function usarMotor(fn) { MOTOR = fn; }

/** Uma rodada do servidor pela regra do SGO+: o estado que a função real recebe, montado do mundo simulado. */
function rodadaMotor(w) {
  const s = w.srv, p = s.ultPos;
  if (!MOTOR) throw new Error('usarMotor() não chamado');
  // relé lido na posição (attributes.blocked) e confirmação do último comando
  if (p) {
    s.releLido = p.bloqueado ? 'BLOQUEADO' : 'LIBERADO';
    const u = s.ultimoMotor;
    if (u && ['ENTREGUE', 'NA_FILA'].includes(u.resultado) && p.t * 60000 > u.emMs && s.releLido === (u.acao === 'BLOQUEAR' ? 'BLOQUEADO' : 'LIBERADO')) {
      u.resultado = 'CONFIRMADO';
      if (u.acao === 'BLOQUEAR') s.pedidoMotor = null;
    }
  }
  if (s.resp || s.emergencia) s.pedidoMotor = null; // retirada (ou emergência) cancela o pedido de bloqueio
  const e = { agora: w.t * 60000, modo: 'ATIVO', triagem: 'BLOQUEIO_ATIVO', aberta: !!s.resp, emergencia: !!s.emergencia, desdeRetiradaMs: (s.retiradaEm || 0) * 60000,
    pedido: s.pedidoMotor, naBase: p ? BASES.has(p.loc) : null, rele: s.releLido || '',
    pos: p ? { quandoMs: p.t * 60000, quandoTexto: 'min ' + p.t, kmh: p.kmh, ignicao: p.ign, movimento: p.kmh > 0 } : null,
    // 22/10/2026: "conectado" vem da lista de aparelhos da iTracker (situação e último contato), lida pela plataforma
    conexao: plataformaNoAr(w) ? (carroConectado(w) ? (s.ultimoContato = w.t, { online: true, ultimoMs: w.t * 60000 }) : { online: false, ultimoMs: (s.ultimoContato || 0) * 60000 }) : null,
    ultimo: s.ultimoMotor || null };
  const d = MOTOR(e);
  w.decisoes = (w.decisoes || 0) + 1;
  if (d.decisaoGestao && s.pedidoMotor && s.pedidoMotor.situacao === 'AGUARDANDO') { s.pedidoMotor.situacao = 'AGUARDANDO_GESTAO'; s.pedidoMotor.desde = w.t; }
  // a gestão (no expediente) só autoriza o bloqueio fora da base depois de confirmar por telefone que o carro foi devolvido
  // (modelo da pessoa: decide depois de 30 min de pedido, com o carro parado há 30 min e ninguém com ele de fato)
  if (s.pedidoMotor && s.pedidoMotor.situacao === 'AGUARDANDO_GESTAO') s.pedidoMotor.desde = s.pedidoMotor.desde ?? w.t;
  if (s.pedidoMotor && s.pedidoMotor.situacao === 'AGUARDANDO_GESTAO' && w.t - s.pedidoMotor.desde >= 30 && p && !p.ign && w.t - p.desligadoDesde >= 30 && gestaoAlcancavel(w) && w.verdade.dono === null) s.pedidoMotor.situacao = 'AUTORIZADO';
  if (!d.acao) return;
  if (d.acao === 'BLOQUEAR' && d.conferencia) s.pedidoMotor = { situacao: 'AGUARDANDO', origem: 'CONFERENCIA' };
  const cmd = { acao: d.acao === 'BLOQUEAR' ? 'BLOQ' : 'LIB', desde: w.t };
  const aceito = enviar(w, cmd);
  if (!aceito) return; // recusado (servidor ou plataforma fora): nada registrado, a próxima rodada decide de novo
  s.ultimoMotor = { acao: d.acao, emMs: w.t * 60000, resultado: cmd.naFila ? 'NA_FILA' : 'ENTREGUE' };
  w.comandosMotor = (w.comandosMotor || []).concat([{ t: w.t, acao: d.acao, naFila: !!cmd.naFila }]);
}

// ---------- ambiente ----------
// probabilidade de o carro ter sinal de celular e de a pessoa ter internet, por local (sorteado por estadia)
const SINAL_CARRO = { base: 0.995, rua: 0.97, rodovia: 0.8, posto: 0.75, hotel: 0.7, garagem_sub: 0.03, cliente: 0.9, remoto: 0.1, casa: 0.95, oficina: 0.95 };
const NET_PESSOA = { base: 0.99, rua: 0.96, rodovia: 0.75, posto: 0.7, hotel: 0.85, garagem_sub: 0.3, cliente: 0.9, remoto: 0.15, casa: 0.98, oficina: 0.95 };
const BASES = new Set(['base']);
const HABILITADOS = new Set(['A', 'B', 'C', 'M']);

const INVARIANTES = {
  I1: 'Bloqueio executado com o carro nas mãos de quem tem direito (retirada aberta ou troca válida)',
  I2: 'Carro devolvido (o sistema sabia) e parado ficou liberado por mais de 30 min com sinal, servidor e plataforma no ar',
  I2b: 'Carro devolvido, mas o registro ainda não chegou ao sistema: ficou liberado mais de 30 min (risco que sobra)',
  I3: 'Alguém tirou o carro de quem estava com ele (responsabilidade encerrada ou trocada sem o condutor)',
  I4a: 'Pessoa sem direito ligou o carro quando o sistema podia ter impedido (havia sinal)',
  I4b: 'Pessoa sem direito ligou o carro sem sinal (risco que sobra)',
  I5: 'Quem tem direito ficou preso fora da base mais de 30 min por causa do sistema',
  I6: 'Registro perdido: ação feita no celular que nunca chegou ao sistema (falha de auditoria)',
  I8: 'Comando antigo da fila executado contra o que o sistema queria naquele momento',
  I7: 'Carro andando mais de 30 min com uma pessoa e o sistema registrando outra (ou ninguém)',
  I9: 'Motor cortado com o carro em trânsito (andando ou parado no semáforo) com um funcionário dirigindo',
  I9x: 'Motor cortado em trânsito com pessoa sem direito dirigindo (informativo)',
};

function novoMundo(sc, V) {
  const r = rngFrom(sc.seed * 7919 + 13);
  const w = {
    V, sc, r, t: 0,
    carro: { loc: 'base', ign: false, kmh: 0, rele: 'B', pendenteNoAparelho: null, energia: true, sinalEstadia: true, chave: 'base', motorista: null,
      desligadoDesde: 0, cartoes: new Set(), ultimoMovimento: -1e9, fioCortado: false },
    fila: [], // fila da plataforma do rastreador (comandos aguardando conexão)
    srv: { resp: null, co: new Set(), manut: false, pend: [], ultPos: null, log: [], cancelOffline: [] },
    pessoas: {},
    verdade: { dono: null, co: new Set(), cnhVencida: new Set(), devolvidoReal: true, usando: null },
    v: {}, metr: { minutosPreso: 0, rouboParadoMin: null, rouboInicio: null },
    estadiaNet: {},
  };
  for (const p of ['A', 'B', 'C', 'X', 'T', 'M', 'G']) w.pessoas[p] = { loc: 'base', fila: [], net: true };
  w.carro.sinalEstadia = r() < SINAL_CARRO.base;
  return w;
}

function viola(w, k, det) { if (!w.v[k]) w.v[k] = det || true; }
function hora(w) { return ((w.sc.horaInicio || 8) * 60 + w.t) % (24 * 60) / 60; }
function noAr(intervalos, t) { return !(intervalos || []).some(([a, b]) => t >= a && t < b); }
function servidorNoAr(w) { return w.t >= (w.servForaAte || 0) && noAr(w.sc.servidorFora, w.t); }
function plataformaNoAr(w) { return w.t >= (w.platForaAte || 0) && noAr(w.sc.plataformaFora, w.t); }
function carroConectado(w) {
  const c = w.carro;
  if (!c.energia || c.fioCortado) return false;
  if (w.sinalCarroAte > w.t) return w.sinalCarroVal;
  return c.sinalEstadia;
}
function locPessoa(w, p) { return w.carro.motorista === p ? w.carro.loc : w.pessoas[p].loc; }
function temNet(w, p) {
  if (w.fimForcado) return true;
  const pf = w.pessoas[p]; if (pf.netAte > w.t) return pf.netVal;
  const loc = locPessoa(w, p);
  const k = p + '|' + loc + '|' + (w.pessoas[p].estadia || 0);
  if (!(k in w.estadiaNet)) {
    let prob = NET_PESSOA[loc] ?? 0.9;
    if (loc === w.carro.loc && !w.carro.sinalEstadia) prob = loc === 'hotel' ? 0.6 : 0.25; // mesmo lugar sem cobertura
    w.estadiaNet[k] = w.r() < prob;
  }
  return w.estadiaNet[k];
}
function gestaoAlcancavel(w) {
  const h = hora(w);
  const dia = Math.floor(((w.sc.horaInicio || 8) * 60 + w.t) / 1440) % 7;
  if (w.sc.gestaoNunca) return false;
  if (dia < 5 && h >= 8 && h < 18) return true;
  return w.r() < 0.02; // fora do expediente: às vezes alguém atende
}
function moverCarro(w, loc) {
  const c = w.carro;
  if (c.loc !== loc) { c.loc = loc; c.sinalEstadia = w.r() < (SINAL_CARRO[loc] ?? 0.9); }
}
function moverPessoa(w, p, loc) { w.pessoas[p].loc = loc; w.pessoas[p].estadia = (w.pessoas[p].estadia || 0) + 1; }
function log(w, txt) { w.srv.log.push(w.t + ' ' + txt); }

// ---------- aparelho do rastreador ----------
function aplicarNoAparelho(w, cmd) {
  const c = w.carro;
  // comando antigo: o que o sistema quer agora é outra coisa
  const desejado = desejadoAgora(w);
  if (desejado && desejado !== cmd.acao && !cmd.emergencia) viola(w, 'I8', 'comando ' + cmd.acao + ' antigo executado em ' + w.t);
  if (cmd.acao === 'LIB') { c.rele = 'L'; c.pendenteNoAparelho = null; return; }
  if (w.V.soDesligado ? !c.ign : c.kmh < 20) efetivarBloqueio(w, cmd); else c.pendenteNoAparelho = cmd;
}
function efetivarBloqueio(w, cmd) {
  const c = w.carro;
  if (c.rele === 'B') { c.pendenteNoAparelho = null; return; }
  c.rele = 'B'; c.pendenteNoAparelho = null;
  if (cmd.emergencia && w.metr.rouboInicio !== null && w.metr.rouboParadoMin === null) w.metr.rouboParadoMin = w.t - w.metr.rouboInicio;
  const d = w.verdade.dono;
  const legit = d && (registrado(w, d) || (c.ign && c.motorista === d));
  if (legit && !cmd.emergencia) viola(w, 'I1', 'bloqueio em ' + w.t + ' com ' + w.verdade.dono);
  if (c.ign) {
    const emTransito = c.motorista && (c.kmh > 0 || w.t - c.ultimoMovimento <= 2);
    if (emTransito && !cmd.emergencia) viola(w, HABILITADOS.has(c.motorista) ? 'I9' : 'I9x', 'motor cortado em trânsito em ' + w.t + ' (' + c.motorista + ')');
    if (emTransito && cmd.emergencia) w.metr.rouboParadoMin = w.t - w.metr.rouboInicio;
    c.ign = false; c.kmh = 0; c.desligadoDesde = w.t; c.cortado = true;
  }
}
function registrado(w, p) {
  const s = w.srv;
  if (s.resp === p || s.co.has(p) || s.emergencia === p) return true;
  return Object.values(w.pessoas).some(pp => pp.fila.some(o => (o.tipo === 'retirar' && o.p === p) || (o.tipo === 'troca' && o.para === p)));
}
function desejadoAgora(w) {
  if (w.V.rfid) return null;
  return (w.srv.resp || w.srv.emergencia) ? 'LIB' : 'BLOQ';
}

// ---------- servidor: envio de comandos ----------
function enviar(w, cmd) {
  // devolve true se a plataforma aceitou (entregue ou na fila)
  if (!servidorNoAr(w) && !cmd.peloAppDoRastreador) return false;
  if (!plataformaNoAr(w)) return false;
  if (carroConectado(w)) { aplicarNoAparelho(w, cmd); cmd.entregue = true; }
  else { w.fila.push(cmd); cmd.naFila = true; }
  log(w, 'comando ' + cmd.acao + (cmd.naFila ? ' (na fila)' : ' (entregue)'));
  return true;
}
function podeBloquear(w) {
  const p = w.srv.ultPos, V = w.V;
  if (V.imediato) return true;
  if (!p) return false;
  if (w.t - p.t > V.idadeMaxPos) return false;
  if (V.exigeParado && (p.ign || p.kmh >= 5)) return false;
  if (V.esperaDesligadoMin && (p.ign || w.t - p.desligadoDesde < V.esperaDesligadoMin)) return false;
  return true;
}
function rodadaServidor(w) {
  if (!servidorNoAr(w)) return;
  if (w.t % 2 !== 0) return; // rotina a cada 2 min
  if (w.V.motor) return rodadaMotor(w);
  const s = w.srv;
  s.pend = s.pend.filter(cmd => {
    if (cmd.acao === 'BLOQ' && (s.resp || s.emergencia) && (w.V.cancelaPendenteNaRetirada)) { log(w, 'bloqueio pendente cancelado (nova retirada)'); return false; }
    if (cmd.acao === 'LIB' && !s.resp && !cmd.emergencia) { return false; }
    if (cmd.acao === 'BLOQ' && !podeBloquear(w)) return true;
    return !enviar(w, cmd);
  });
  const p = s.ultPos;
  if (w.V.confere && !w.V.rfid && p && w.t - p.t <= 2 && !w.fila.length) {
    if (!s.resp && !s.emergencia && !p.bloqueado && !s.pend.some(c => c.acao === 'BLOQ') && podeBloquear(w)) { s.pend.push({ acao: 'BLOQ', desde: w.t, conferencia: true }); log(w, 'conferência: devolvido e livre, bloqueio reenviado'); }
    if (s.resp && p.bloqueado && !s.pend.some(c => c.acao === 'LIB')) { s.pend.push({ acao: 'LIB', desde: w.t, conferencia: true }); log(w, 'conferência: retirada aberta e bloqueado, liberação reenviada'); }
  }
}

// ---------- ações registradas no sistema ----------
function aoRetirar(w, p, co) {
  const s = w.srv;
  s.emergencia = null;
  s.resp = p; s.co = new Set(co || []);
  log(w, 'retirada ' + p);
  if (w.V.motor) { s.pedidoMotor = null; s.retiradaEm = w.t; if (servidorNoAr(w)) rodadaMotor(w); return; }
  if (w.V.rfid) return; // o cartão libera no carro
  if (w.V.cancelaPendenteNaRetirada) s.pend = s.pend.filter(c => c.acao !== 'BLOQ');
  s.pend.push({ acao: 'LIB', desde: w.t });
  rodadaServidorForcada(w);
}
function aoDevolver(w, p, porGestao, daFila) {
  const s = w.srv;
  const c = w.carro;
  if (carroConectado(w) && plataformaNoAr(w)) s.ultPos = { t: w.t, ign: c.ign, kmh: c.kmh, loc: c.loc, desligadoDesde: c.desligadoDesde, bloqueado: c.rele === 'B' }; // leitura nova na devolução (como o SGO+ faz)
  log(w, 'devolução ' + s.resp + (porGestao ? ' pela gestão' : ''));
  s.devolvidoEm = w.t; s.emergencia = null;
  s.resp = null; s.co = new Set();
  if (w.V.motor) { s.pedidoMotor = { situacao: 'AGUARDANDO', origem: 'DEVOLUCAO' }; if (servidorNoAr(w)) rodadaMotor(w); return; }
  if (w.V.rfid) return;
  s.pend = s.pend.filter(c => c.acao !== 'LIB');
  s.pend.push({ acao: 'BLOQ', desde: w.t });
  if (!daFila) rodadaServidorForcada(w);
}
function rodadaServidorForcada(w) { const t = w.t; w.t = t - (t % 2); rodadaServidor(w); w.t = t; }

function sincronizarFilaCelular(w, p) {
  const f = w.pessoas[p].fila;
  if (!f.length || !temNet(w, p) || !servidorNoAr(w)) return;
  while (f.length) {
    const op = f.shift();
    if (op.tipo === 'devolver') {
      if (w.srv.resp === op.de) aoDevolver(w, op.de, false, true);
      else if (!w.srv.resp && w.srv.emergencia === op.de) { w.srv.emergencia = null; aoDevolver(w, op.de, false, true); }
      else if (w.srv.resp) log(w, 'conflito para a gestão: devolução de ' + op.de + ' com o carro registrado para ' + w.srv.resp);
    } else if (op.tipo === 'troca') {
      if (w.srv.resp === op.de) { w.srv.resp = op.para; log(w, 'troca ' + op.de + '->' + op.para + ' (sincronizada)'); }
      else if (!w.srv.resp) aoRetirar(w, op.para, []);
    } else if (op.tipo === 'retirar') {
      if (!w.srv.resp) aoRetirar(w, op.p, op.co);
      else if (w.srv.resp !== op.p) {
        // há outra retirada aberta: se a devolução dela ainda está num celular, espera; senão é conflito para a gestão
        const devolucaoAGuardar = Object.values(w.pessoas).some(pp => pp.fila.some(o => o.tipo === 'devolver' && o.de === w.srv.resp));
        if (devolucaoAGuardar && !op.esperando) { op.esperando = true; f.unshift(op); break; }
        if (devolucaoAGuardar) { f.unshift(op); break; }
        viola(w, 'I3', 'duas retiradas guardadas no celular em conflito'); log(w, 'conflito de retirada offline de ' + op.p);
      }
    }
  }
}

// ---------- cartão no carro (futuro) ----------
function sincronizarCartoes(w) {
  if (!w.V.rfid || !carroConectado(w) || !servidorNoAr(w) || !plataformaNoAr(w)) return;
  const set = new Set();
  if (w.srv.resp) { set.add(w.srv.resp); for (const q of w.srv.co) set.add(q); }
  w.carro.cartoes = set;
}
function cartaoAutoriza(w, p) {
  if (w.carro.cartoes.has(p)) return true;
  if (!carroConectado(w) && HABILITADOS.has(p) && !w.verdade.cnhVencida.has(p)) { log(w, 'cartão de ' + p + ' aceito sem sinal (anotado no carro)'); return true; }
  return false;
}

// ---------- tentativa de ligar ----------
function podeLigar(w, p) {
  const c = w.carro;
  if (!c.energia) return false;
  if (c.chave !== p && !(c.chave === 'base' && locPessoa(w, p) === c.loc)) return false;
  if (c.fioCortado) return true; // aparelho sem energia: relé fica solto (ligação típica)
  if (w.V.rfid) {
    // o cartão decide no próprio carro; o relé do bloqueio remoto só em roubo
    if (c.rele === 'B' && c.roubo) return false;
    return cartaoAutoriza(w, p) || (w.verdade.emergenciaLiberada === p);
  }
  return c.rele === 'L';
}

// ---------- execução dos passos do roteiro ----------
function iniciarPasso(w, passo) { passo.inicio = w.t; passo.tent = 0; }

function tentarRetirar(w, p, co, permitirOffline) {
  const vd = w.verdade;
  if (!HABILITADOS.has(p) || vd.cnhVencida.has(p)) return 'recusado';
  if (w.srv.manut && p !== 'M') return 'recusado';
  if (temNet(w, p) && servidorNoAr(w)) {
    sincronizarFilaCelular(w, p);
    if (w.srv.resp && w.srv.resp !== p) return 'ocupado';
    if (w.srv.resp === p) return 'ok';
    aoRetirar(w, p, co); return 'ok';
  }
  const visto = w.pessoas[p].visto;
  if (permitirOffline && w.V.offline && visto && w.t - visto.t < 1440 && (visto.resp === null || visto.resp === p)) { w.pessoas[p].fila.push({ tipo: 'retirar', p, co, t: w.t }); return 'offline'; }
  return 'semrede';
}
function tentarDevolver(w, p) {
  if (w.V.devolucaoSoParado) {
    const pos = w.srv.ultPos;
    if (pos && w.t - pos.t <= 3 && (pos.ign || pos.kmh >= 5)) return 'carroLigado';
  }
  if (temNet(w, p) && servidorNoAr(w)) {
    sincronizarFilaCelular(w, p);
    if (w.srv.resp === p) { aoDevolver(w, p); return 'ok'; }
    if (!w.srv.resp && w.srv.emergencia === p) { aoDevolver(w, p); return 'ok'; }
    if (!w.srv.resp) return 'ok';
    return 'naoEhSeu';
  }
  if (w.V.offline) { w.pessoas[p].fila.push({ tipo: 'devolver', de: p, t: w.t }); return 'offline'; }
  return 'semrede';
}

function passoConcluido(w, passo) {
  const vd = w.verdade, c = w.carro;
  const dur = w.t - passo.inicio;
  switch (passo.a) {
    case 'mover': moverPessoa(w, passo.p, passo.loc); return true;
    case 'cnhVence': vd.cnhVencida.add(passo.p); return true;
    case 'manut': w.srv.manut = passo.on; return true;
    case 'chave': c.chave = passo.p; return true;
    case 'bateria': c.energia = passo.on; if (!passo.on) { c.ign = false; c.kmh = 0; } return true;
    case 'cortaFio': c.fioCortado = true; return true;
    case 'esperar': return dur >= passo.min;
    case 'sinalCarro': w.sinalCarroVal = passo.val; w.sinalCarroAte = w.t + passo.por; return true;
    case 'netPessoa': w.pessoas[passo.p].netVal = passo.val; w.pessoas[passo.p].netAte = w.t + passo.por; return true;
    case 'servidor': w.servForaAte = w.t + passo.por; return true;
    case 'plataforma': w.platForaAte = w.t + passo.por; return true;
    case 'desligar': if (c.ign) { c.ign = false; c.kmh = 0; c.desligadoDesde = w.t; c.chave = c.motorista || c.chave; c.motorista = null; } return true;
    case 'inicio': moverCarro(w, passo.loc); c.rele = passo.rele || c.rele; c.chave = passo.chave || c.chave; for (const q in w.pessoas) if (passo.pessoasEm) moverPessoa(w, q, passo.pessoasEm); return true;
    case 'esquecer': // a pessoa acha que terminou, mas não registra nada
      if (vd.dono === passo.p) { vd.dono = null; vd.co = new Set(); vd.devolvidoReal = true; vd.devolvidoEm = w.t; }
      return true;
    case 'retirar': {
      if (dur === 0) {
        if (vd.dono === null && HABILITADOS.has(passo.p) && !vd.cnhVencida.has(passo.p) && (!w.srv.manut || passo.p === 'M')) {
          vd.dono = passo.p; vd.co = new Set(passo.co || []); vd.devolvidoReal = false;
        }
      }
      if (w.t % 3 !== 0 && dur > 0) return false;
      const r = tentarRetirar(w, passo.p, passo.co, true);
      if (r === 'ok' && vd.dono !== passo.p && w.srv.resp === passo.p) { vd.dono = passo.p; vd.co = new Set(passo.co || []); vd.devolvidoReal = false; }
      if (r === 'recusado' && vd.dono === passo.p) { vd.dono = null; vd.devolvidoReal = true; }
      if (r === 'ok' || r === 'offline' || r === 'recusado') { passo.res = r; return true; }
      if (r === 'ocupado') {
        // pede para a gestão encerrar a retirada antiga (só se a antiga ficou esquecida)
        if (gestaoAlcancavel(w) && servidorNoAr(w) && vd.dono === passo.p) {
          if (w.V.transfereEsquecida && gestaoTransfere(w, w.srv.resp, passo.p)) { passo.res = 'ok'; return true; }
          if (gestaoDevolve(w, w.srv.resp, true)) return false;
        }
      }
      if (dur >= (passo.ate || 90)) { passo.res = 'desistiu'; return true; }
      return false;
    }
    case 'devolver': {
      if (dur === 0 && vd.dono === passo.p) { vd.dono = null; vd.co = new Set(); vd.devolvidoReal = true; vd.devolvidoEm = w.t; }
      if (w.t % 3 !== 0 && dur > 0) return false;
      if (c.motorista === passo.p && c.ign && w.V.devolucaoSoParado) { c.ign = false; c.kmh = 0; c.desligadoDesde = w.t; } // o app pede para desligar
      const r = tentarDevolver(w, passo.p);
      if (r === 'ok' || r === 'offline') { passo.res = r; return true; }
      if (dur >= (passo.ate || 120)) { passo.res = 'desistiu:' + r; return true; }
      return false;
    }
    case 'gestaoDevolve': {
      if (dur > (passo.ate || 240)) return true;
      if (!gestaoAlcancavel(w) || !servidorNoAr(w)) return false;
      gestaoDevolve(w, w.srv.resp, false); return true;
    }
    case 'trocar': return passoTrocar(w, passo, dur);
    case 'dirigir': return passoDirigir(w, passo, dur);
    case 'roubo': return passoDirigir(w, Object.assign(passo, { p: 'T', ladrao: true }), dur);
    default: throw new Error('passo desconhecido ' + passo.a);
  }
}

function gestaoDevolve(w, emNomeDe, porPedidoDeOutro) {
  const vd = w.verdade;
  if (!emNomeDe) return false;
  if (w.V.gestaoRestrita) {
    // só encerra a retirada de outro se o carro está na base, ou parado e desligado há mais de 2 h e o condutor não respondeu
    const pos = w.srv.ultPos;
    const naBase = pos && BASES.has(pos.loc) && !pos.ign && w.t - pos.desligadoDesde >= 60;
    const paradoLongo = pos && !pos.ign && w.t - pos.desligadoDesde > 120 && w.t - pos.t < 30;
    const condutorConfirma = vd.dono !== emNomeDe; // o condutor, quando alcançado, confirma que terminou
    if (!(naBase || (paradoLongo && condutorConfirma))) return false;
  }
  if (vd.dono === emNomeDe) viola(w, 'I3', 'gestão encerrou a retirada de ' + emNomeDe + ' que ainda estava com o carro');
  aoDevolver(w, emNomeDe, true);
  return true;
}

function gestaoTransfere(w, de, para) {
  const pos = w.srv.ultPos, vd = w.verdade;
  const naBase = pos && BASES.has(pos.loc) && !pos.ign;
  if (!naBase && vd.dono === de) return false;
  if (!naBase && !(pos && !pos.ign && w.t - pos.desligadoDesde > 120)) return false;
  if (vd.dono === de) viola(w, 'I3', 'gestão passou a retirada de ' + de + ' que ainda estava com o carro');
  log(w, 'gestão encerrou a retirada esquecida de ' + de + ' e abriu a de ' + para + ' (sem bloquear)');
  w.srv.resp = para; w.srv.co = new Set(); sincronizarCartoes(w);
  if (!w.V.rfid && pos && pos.bloqueado) w.srv.pend.push({ acao: 'LIB', desde: w.t });
  return true;
}

function passoTrocar(w, passo, dur) {
  const vd = w.verdade, de = passo.de, para = passo.para;
  if (dur === 0 && vd.dono === de && HABILITADOS.has(para) && !vd.cnhVencida.has(para)) { vd.dono = para; vd.co = new Set([de]); vd.devolvidoReal = false; }
  if (w.t % 3 !== 0 && dur > 0) return false;
  if (w.V.troca) {
    // qualquer um dos dois registra; com o segundo condutor listado na retirada não precisa da gestão
    const listado = w.srv.co.has(para) || (passo.listado !== false);
    const quem = [para, de].filter(q => passo.presentes ? passo.presentes.includes(q) : true);
    for (const q of quem) {
      if (temNet(w, q) && servidorNoAr(w)) {
        sincronizarFilaCelular(w, q);
        if (w.srv.resp === de && (listado || gestaoAlcancavel(w))) { w.srv.resp = para; w.srv.co = new Set([de]); log(w, 'troca ' + de + '->' + para); sincronizarCartoes(w); return true; }
        if (w.srv.resp === para) return true;
        if (!w.srv.resp) { aoRetirar(w, para, [de]); return true; }
      }
    }
    if (w.V.offline && listado) {
      const q = quem[0] || para;
      w.pessoas[q].fila.push({ tipo: 'troca', de, para, t: w.t });
      if (w.V.rfid) w.carro.cartoes.add(para); // segundo condutor já estava no cartão da viagem
      return true;
    }
    if (dur >= (passo.ate || 60)) { passo.res = 'desistiu'; return true; }
    return false;
  }
  // sem a função "passar o carro": o primeiro devolve, o segundo retira
  if (!passo.devolveu) {
    const presenteDe = !passo.presentes || passo.presentes.includes(de);
    const r = presenteDe ? tentarDevolver(w, de) : 'ausente';
    if (r === 'ok') passo.devolveu = true;
    else if (dur >= 30 && gestaoAlcancavel(w) && servidorNoAr(w)) { if (gestaoDevolve(w, de, true)) passo.devolveu = true; }
  }
  if (passo.devolveu || !w.srv.resp) {
    const r = tentarRetirar(w, para, [de], false);
    if (r === 'ok') return true;
  }
  if (dur >= (passo.ate || 60)) { passo.res = 'desistiu'; return true; }
  return false;
}

function passoDirigir(w, passo, dur) {
  const c = w.carro, vd = w.verdade, p = passo.p;
  if (!passo.andando) {
    if (c.ign && c.motorista === p) { passo.andando = true; passo.t0 = w.t; }
    else if (podeLigar(w, p)) {
      c.ign = true; c.motorista = p; c.chave = p; c.cortado = false; passo.andando = true; passo.t0 = w.t;
      if (p === 'T') { w.metr.rouboInicio = w.t; }
      const direito = vd.dono === p || vd.co.has(p);
      if (!direito) {
        const sistemaPodia = !w.V.rfid && !w.srv.resp && (w.srv.devolvidoEm ?? 1e9) < w.t - 30 && c.rele === 'L' && !c.fioCortado &&
          plataformaNoAr(w) && servidorNoAr(w) && condicoesBoasDesde(w) >= 30;
        viola(w, sistemaPodia ? 'I4a' : 'I4b', p + ' ligou o carro em ' + w.t);
      }
    } else {
      // preso: quem tem direito tenta resolver
      const direito = vd.dono === p || vd.co.has(p);
      if (passo.ladrao || !direito) { return dur >= (passo.desiste || 15); }
      w.metr.minutosPreso++;
      if (!BASES.has(c.loc) && dur > 30) viola(w, 'I5', p + ' preso em ' + c.loc + ' desde ' + passo.inicio);
      if (dur % 5 === 0) {
        if (w.srv.resp !== p && !w.srv.co.has(p)) {
          const r = tentarRetirar(w, p, [...vd.co], true);
          if (r === 'ocupado' && w.V.troca && w.srv.resp && vd.co.has(w.srv.resp)) {
            /* o primeiro condutor está listado: segundo assume */ w.srv.resp = p; log(w, 'troca automática');
          }
        } else if (!w.V.rfid && w.srv.resp === p && !w.srv.pend.some(x => x.acao === 'LIB') && !w.fila.some(x => x.acao === 'LIB')) {
          w.srv.pend.push({ acao: 'LIB', desde: w.t }); // reenvia a liberação
        }
        if (dur >= 15 && !(w.verdade.ajudaPedida > w.t - 15)) {
          w.verdade.ajudaPedida = w.t;
          const central = w.V.central24h && plataformaNoAr(w);
          const gestao = gestaoAlcancavel(w) && servidorNoAr(w);
          if ((gestao || central) && !w.fila.some(x => x.acao === 'LIB')) {
            // liberação de emergência: pela gestão no SGO+ ou pela central 24 h do rastreador
            if (w.V.rfid) { if (carroConectado(w)) { w.verdade.emergenciaLiberada = p; log(w, 'liberação de emergência por cartão (' + p + ')'); } }
            else if (gestao && !w.srv.resp) { aoRetirar(w, p, [...vd.co]); log(w, 'gestão abriu a retirada de ' + p + ' por telefone'); }
            else { if (enviar(w, { acao: 'LIB', emergencia: true, peloAppDoRastreador: central, desde: w.t })) { w.srv.emergencia = p; log(w, 'liberação de emergência para ' + p); } }
            if (central && !servidorNoAr(w)) log(w, 'liberação pela central 24 h (anotada no rastreador)');
          }
        }
      }
      return dur >= (passo.desiste || 240);
    }
  }
  // andando
  const k = w.t - passo.t0;
  for (const d of (passo.durante || [])) if (d.k === k && !d.feito) { d.feito = true; acaoDurante(w, d); }
  if (!c.ign) {
    // motor cortado no caminho: volta para a tentativa de ligar
    passo.andando = false; c.motorista = p; return false;
  }
  if (k >= passo.dur) {
    moverCarro(w, passo.dest);
    if (!passo.deixaLigado) { c.ign = false; c.kmh = 0; c.desligadoDesde = w.t; c.motorista = null; c.chave = passo.chaveFica || (passo.dest === 'base' ? 'base' : p); }
    else { c.kmh = 0; }
    if (!c.ign) moverPessoa(w, p, passo.dest);
    return true;
  }
  moverCarro(w, passo.via || 'rua');
  const estrada = (passo.via || 'rua') === 'rodovia' || passo.via === 'remoto';
  c.kmh = estrada ? (w.r() < 0.06 ? between(w.r, 0, 19) : between(w.r, 40, 110)) : (w.r() < 0.4 ? between(w.r, 0, 19) : between(w.r, 20, 60));
  if (c.kmh > 0) c.ultimoMovimento = w.t;
  // na rodovia o sinal oscila por trechos
  if (estrada && w.r() < 0.05) c.sinalEstadia = w.r() < (SINAL_CARRO[passo.via] ?? 0.8);
  return false;
}

function acaoDurante(w, d) {
  const vd = w.verdade;
  if (d.a === 'devolver') { if (vd.dono === d.p) { const m = w.carro.motorista; if (m && HABILITADOS.has(m) && m !== d.p) { vd.dono = m; vd.co = new Set(); } else { vd.dono = null; vd.co = new Set(); vd.devolvidoReal = true; vd.devolvidoEm = w.t; } } tentarDevolver(w, d.p); }
  else if (d.a === 'gestaoDevolve') { if (gestaoAlcancavel(w) && servidorNoAr(w)) gestaoDevolve(w, w.srv.resp, false); }
  else if (d.a === 'cnhVence') vd.cnhVencida.add(d.p);
  else if (d.a === 'sinalCarro') { w.sinalCarroVal = d.val; w.sinalCarroAte = w.t + d.por; }
  else if (d.a === 'servidor') w.servForaAte = w.t + d.por;
  else if (d.a === 'plataforma') w.platForaAte = w.t + d.por;
}
function condicoesBoasDesde(w) { return w._boas || 0; }

// ---------- laço principal ----------
function rodar(sc, nomeV) {
  const V = VARIANTES[nomeV];
  const w = novoMundo(sc, V);
  const passos = sc.passos.map(p => Object.assign({}, p, p.durante ? { durante: p.durante.map(d => Object.assign({}, d)) } : {}));
  let i = 0, passo = null, estavaConectado = carroConectado(w);
  let minutosLivreDevolvido = 0, minutosDiscordia = 0;
  const H = sc.horizonte;
  w._boas = 0;
  let fimRoteiro = null;
  for (w.t = 0; w.t < H; w.t++) {
    const c = w.carro;
    if (!passo && i >= passos.length) { if (fimRoteiro === null) fimRoteiro = w.t; else if (w.t - fimRoteiro > 180) break; }
    // roteiro
    let guarda = 0;
    while (guarda++ < 5) {
      if (!passo) {
        if (i >= passos.length) break;
        const prox = passos[i];
        if (w.t < (prox._pronto ?? 0) + (prox.depois || 0)) break;
        passo = Object.assign({}, prox); i++; iniciarPasso(w, passo);
      }
      if (passoConcluido(w, passo)) { passo = null; if (i < passos.length) passos[i]._pronto = w.t; continue; }
      break;
    }
    // aparelho: conexão, fila e bloqueio pendente
    const con = carroConectado(w);
    if (con && plataformaNoAr(w) && w.fila.length) { const f = w.fila; w.fila = []; for (const cmd of f) aplicarNoAparelho(w, cmd); }
    if (c.pendenteNoAparelho && (V.soDesligado ? !c.ign : c.kmh < 20)) efetivarBloqueio(w, c.pendenteNoAparelho);
    estavaConectado = con;
    // posições (a cada minuto, aproximação de 30 s a 2 min)
    if (con && plataformaNoAr(w)) {
      w.srv.ultPos = { t: w.t, ign: c.ign, kmh: c.kmh, loc: c.loc, desligadoDesde: c.desligadoDesde, bloqueado: c.rele === 'B' };
    }
    sincronizarCartoes(w);
    for (const p of ['A', 'B', 'C', 'M']) { sincronizarFilaCelular(w, p); if (w.t % 5 === 0 && servidorNoAr(w) && temNet(w, p)) w.pessoas[p].visto = { t: w.t, resp: w.srv.resp }; }
    rodadaServidor(w);
    // roubo: o condutor percebe e chama
    if (c.motorista === 'T' && w.metr.rouboInicio !== null && w.t - w.metr.rouboInicio === (sc.percebeRouboMin || 20)) {
      c.roubo = true;
      const central = V.central24h && plataformaNoAr(w);
      if (central || (gestaoAlcancavel(w) && servidorNoAr(w))) enviar(w, { acao: 'BLOQ', emergencia: true, peloAppDoRastreador: central, desde: w.t });
    }
    // invariantes por minuto
    const boas = con && servidorNoAr(w) && plataformaNoAr(w);
    w._boas = boas ? w._boas + 1 : 0;
    const vd = w.verdade;
    if (!V.rfid && vd.dono === null && vd.devolvidoReal && !c.ign && boas && c.rele === 'L' && !w.srv.manut && w.t - (vd.devolvidoEm ?? 0) > 0) {
      const naoSabe = w.srv.resp || w.srv.emergencia;
      if (naoSabe) { minutosLivreDevolvido = 0; w._livreB = (w._livreB || 0) + 1; if (w._livreB > 30) viola(w, 'I2b', 'carro devolvido livre em ' + c.loc + ' (registro não chegou)'); }
      else { minutosLivreDevolvido++; if (minutosLivreDevolvido > 30) viola(w, 'I2', 'carro devolvido livre em ' + c.loc); }
    } else { minutosLivreDevolvido = 0; w._livreB = 0; }
    sincronizarCartoes(w);
    if (V.rfid && vd.dono === null && vd.devolvidoReal && !c.ign && boas && c.cartoes.size) { w._cart = (w._cart || 0) + 1; if (w._cart > 30) viola(w, w.srv.resp ? 'I2b' : 'I2', 'cartão ainda autorizado após devolução'); } else w._cart = 0;
    if (c.ign && c.motorista && c.motorista !== 'T' && c.motorista !== 'X') {
      const reg = w.srv.resp === c.motorista || w.srv.emergencia === c.motorista || w.srv.co.has(c.motorista) || w.pessoas[c.motorista].fila.some(o => (o.tipo === 'retirar' && o.p === c.motorista) || (o.tipo === 'troca' && o.para === c.motorista));
      if (!reg) { minutosDiscordia++; if (minutosDiscordia > 30) viola(w, 'I7', c.motorista + ' dirigindo registrado como ' + w.srv.resp); }
    }
  }
  // fim: registro que nunca chegou ao servidor
  for (const p of ['A', 'B', 'C', 'M']) if (w.pessoas[p].fila.length) {
    // dá mais 3 dias de chance com internet normal (o celular volta a ter sinal)
    w.fimForcado = true; w.estadiaNet = {}; w.servForaAte = 0; w.sc = Object.assign({}, w.sc, { servidorFora: [] }); for (const q in w.pessoas) { w.pessoas[q].loc = 'base'; w.pessoas[q].netAte = 0; }
    for (let k = 0; k < 3; k++) for (const q of ['A', 'B', 'C', 'M']) sincronizarFilaCelular(w, q);
    if (w.pessoas[p].fila.length) viola(w, 'I6', 'registro de ' + p + ' ficou só no celular');
  }
  return { v: w.v, metr: w.metr, log: w.srv.log, releFinal: w.carro.rele };
}

module.exports = { rodar, VARIANTES, INVARIANTES, rngFrom, pick, between, usarMotor };
