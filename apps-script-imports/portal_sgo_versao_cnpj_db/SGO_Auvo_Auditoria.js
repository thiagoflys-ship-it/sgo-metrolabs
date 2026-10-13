/****************************************************
 * SGO_Auvo_Auditoria.js
 * INTEGRAÇÃO AUVO — Auditoria (SÓ LEITURA)
 *
 * Relatórios pra o usuário revisar a qualidade do cadastro do Auvo
 * ANTES de decidir importar (Fase A). Nunca grava nada em nenhuma
 * planilha — só consulta a API do Auvo e devolve achados.
 ****************************************************/

// Remove pontuação/sufixo societário comum e acento, pra comparar nomes
// de empresa "no fundo iguais" mesmo escritos diferente (caixa, pontuação,
// "LTDA" vs "S.A" etc).
function Auvo_normalizarNomeEmpresa_(nome) {
  var t = SGO_UTILS.safeUpper(nome).normalize('NFD').replace(/[̀-ͯ]/g, '');
  t = t.replace(/[.,\-\/()]/g, ' ');
  t = t.replace(/\b(LTDA|S\/A|SA|ME|EPP|EIRELI|CIA|LTD)\b/g, ' ');
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

function Auvo_tokensSignificativos_(nomeNormalizado) {
  var STOP = ['DE', 'DA', 'DO', 'DOS', 'DAS', 'E', 'EM', 'PARA', 'COM', 'A', 'O', 'AS', 'OS'];
  return nomeNormalizado.split(' ').filter(function(w) { return w.length >= 3 && STOP.indexOf(w) === -1; });
}

function Auvo_jaccard_(setA, setB) {
  var inter = 0;
  setA.forEach(function(x) { if (setB.has(x)) inter++; });
  var uniao = setA.size + setB.size - inter;
  return uniao === 0 ? 0 : inter / uniao;
}

// ------------------------------------------------------------
// AUDITORIA — clientes do Auvo com nome parecido em CNPJ raiz
// DIFERENTE (o agrupamento normal só mescla por CNPJ igual; isso aqui
// é pra achar os casos que aquela regra não pegou, pro usuário decidir
// se são duplicata de cadastro no Auvo ou empresas genuinamente
// diferentes com nome parecido — ex: franquias, prefeituras).
// Usa índice invertido por token (não é O(n²)) pra ficar rápido mesmo
// com milhares de clientes.
// ------------------------------------------------------------
function Auvo_auditarNomesParecidos_(grupos) {
  var representantes = grupos.map(function(g, idx) {
    var principal = g.customers[0];
    var nome = SGO_UTILS.safe(principal.description) || SGO_UTILS.safe(principal.legalName) || ('#' + principal.id);
    var normalizado = Auvo_normalizarNomeEmpresa_(nome);
    var tokens = Auvo_tokensSignificativos_(normalizado);
    return {
      idx: idx, cnpjRaiz: g.cnpjRaiz || '(sem CNPJ)', nome: nome, normalizado: normalizado,
      tokens: tokens, tokenSet: new Set(tokens), qtdUnidadesAuvo: g.customers.length
    };
  });

  // Palavras genéricas do setor (HOSPITAL, MUNICIPAL, CLINICA, SAUDE...)
  // aparecem em centenas de nomes diferentes — se entrassem no índice de
  // candidatos, a busca vira quase O(n²) e nunca termina a tempo. Conta
  // a frequência de cada palavra primeiro e só usa pra gerar candidatos
  // as palavras raras (continuam entrando no cálculo de similaridade,
  // só não geram candidato sozinhas) — também melhora a precisão, já
  // que 2 hospitais municipais de cidades diferentes não devem ser
  // apontados só por compartilharem "HOSPITAL MUNICIPAL".
  var frequencia = {};
  representantes.forEach(function(r) {
    r.tokens.forEach(function(t) { frequencia[t] = (frequencia[t] || 0) + 1; });
  });
  var LIMITE_FREQUENCIA = 15;

  var indiceExato = {};
  var indicePorToken = {};
  representantes.forEach(function(r) {
    if (!indiceExato[r.normalizado]) indiceExato[r.normalizado] = [];
    indiceExato[r.normalizado].push(r.idx);
    r.tokens.forEach(function(t) {
      if (frequencia[t] > LIMITE_FREQUENCIA) return; // palavra comum demais, não gera candidato
      if (!indicePorToken[t]) indicePorToken[t] = [];
      indicePorToken[t].push(r.idx);
    });
  });

  var achados = [];

  // 1) nome idêntico depois de normalizar, mas CNPJ raiz diferente —
  // forte candidato a duplicata real (mesma empresa cadastrada 2x com
  // CNPJs diferentes, ou erro de digitação no CNPJ).
  Object.keys(indiceExato).forEach(function(chave) {
    if (!chave) return;
    var idxs = indiceExato[chave];
    if (idxs.length < 2) return;
    var raizesDistintas = {};
    idxs.forEach(function(i) { raizesDistintas[representantes[i].cnpjRaiz] = true; });
    if (Object.keys(raizesDistintas).length < 2) return;
    achados.push({
      tipo: 'NOME_IDENTICO_CNPJ_DIFERENTE',
      similaridade: 100,
      itens: idxs.map(function(i) {
        return { cnpjRaiz: representantes[i].cnpjRaiz, nome: representantes[i].nome, qtdUnidadesAuvo: representantes[i].qtdUnidadesAuvo };
      })
    });
  });

  // 2) nomes parecidos (não idênticos) por similaridade de palavras
  var jaVistoPar = {};
  representantes.forEach(function(r) {
    if (r.tokens.length === 0) return;
    var candidatos = {};
    r.tokens.forEach(function(t) {
      (indicePorToken[t] || []).forEach(function(i) { if (i !== r.idx) candidatos[i] = true; });
    });
    Object.keys(candidatos).forEach(function(iStr) {
      var i = Number(iStr);
      if (i <= r.idx) return;
      var outro = representantes[i];
      if (outro.normalizado === r.normalizado) return; // já capturado no passo 1
      if (r.cnpjRaiz === outro.cnpjRaiz) return;
      var sim = Auvo_jaccard_(r.tokenSet, outro.tokenSet);
      if (sim < 0.6) return;
      var chavePar = r.idx + ':' + i;
      if (jaVistoPar[chavePar]) return;
      jaVistoPar[chavePar] = true;
      achados.push({
        tipo: 'NOME_PARECIDO',
        similaridade: Math.round(sim * 100),
        itens: [
          { cnpjRaiz: r.cnpjRaiz, nome: r.nome, qtdUnidadesAuvo: r.qtdUnidadesAuvo },
          { cnpjRaiz: outro.cnpjRaiz, nome: outro.nome, qtdUnidadesAuvo: outro.qtdUnidadesAuvo }
        ]
      });
    });
  });

  achados.sort(function(a, b) { return (b.similaridade || 0) - (a.similaridade || 0); });
  return achados;
}

function Auvo_apiAuditarNomesParecidos(sessionId) {
  Auvo_exigirAdmin_(sessionId);
  var customers = Auvo_listarTudoPaginado_(AUVO_CFG.ENDPOINTS.CUSTOMERS);
  var grupos = Auvo_agruparClientesPorCnpjRaiz_(customers);
  var achados = Auvo_auditarNomesParecidos_(grupos);
  return {
    ok: true,
    totalGruposAnalisados: grupos.length,
    totalAchados: achados.length,
    achados: achados.slice(0, 200)
  };
}
