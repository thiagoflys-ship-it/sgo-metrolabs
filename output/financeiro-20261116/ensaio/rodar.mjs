import { abrirDb } from '/app/dist/db.js';
import { PoolLegado } from '/app/dist/legado/pool.js';
import { Travas, CacheMemoria } from '/app/dist/servicos/atendente.js';
import { servicoPlanilhas } from '/app/dist/servicos/planilhas.js';
import { servicoArquivos } from '/app/dist/servicos/arquivos.js';
import { configurarPropSegredas } from '/app/dist/servicos/propSegredas.js';
const pastaDados = process.env.PASTA_DADOS || '/dados';
const log = (n, t, o) => { if (n !== 'info') console.log('[' + n + '] ' + (o || '') + ' ' + String(t).slice(0, 200)); };
configurarPropSegredas({ pastaDados, log });
const db = await abrirDb(); let pool;
try {
  pool = new PoolLegado({ db, planilhas: servicoPlanilhas(db), arquivos: servicoArquivos(db, pastaDados), travas: new Travas(), cache: new CacheMemoria(), log },
    { tamanho: 1, pastaLegado: '/tmp/ens16/legado', urlPublica: 'http://127.0.0.1:8080', emailSistema: '', limiteMs: 600000, excluir: [] });
  await pool.pronto();
  const r = await pool.executar({ tipo: 'executar', fn: process.argv[2], args: JSON.parse(process.argv[3] || '[]') });
  console.log(JSON.stringify(r.ok ? r.valor : { erro: r.erro }, null, 1));
} finally { await pool?.encerrar(); await db.fechar(); }
