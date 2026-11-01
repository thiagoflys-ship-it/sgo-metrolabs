/**
 * Decisão do dono de 01/11/2026 no Comercial (sobra mínima 35%, valores maiores, incentivos, impostos por unidade): prévia e
 * aplicação na produção, sem tela. Roda Comercial_decisaoDono20261101() do legado (SGO_Comercial_Decisao20261101.js), como as
 * rotinas do editor (origem "editor"). A mesma coisa existe na tela: Comercial > Metodologia > Preço e desconto, quadro
 * "Decisão do dono de 01/11/2026" (Diretoria e Administrador).
 *
 * Este arquivo vive no repositório do SGO+ (_tools/servidor). Para usar, copie para sgo_servidor/scripts/ junto com a publicação
 * do legado que traz SGO_Comercial_Decisao20261101.js.
 *
 * Uso no contêiner (sempre a prévia antes; aplicar exige a marca que a prévia imprimiu):
 *   docker exec -w /app sgo-app-1 npx tsx scripts/aplicar_decisao_20261101.ts --etapa POLITICA
 *   docker exec -w /app sgo-app-1 npx tsx scripts/aplicar_decisao_20261101.ts --etapa POLITICA --aplicar --marca <marca>
 *   docker exec -w /app sgo-app-1 npx tsx scripts/aplicar_decisao_20261101.ts --etapa PRECOS
 *   docker exec -w /app sgo-app-1 npx tsx scripts/aplicar_decisao_20261101.ts --etapa PRECOS --aplicar --marca <marca>
 * Nos preços (01/11/2026, catálogo oficial): itens com alta acima de 100% ou com custo cadastrado maior que o preço ficam FORA do lote
 * e são listados como "corrigir o custo antes"; --limite-alta N muda o limite (use o MESMO N na prévia e no aplicar: a marca depende
 * dele). A tabela oficial da Diretoria fica sempre fora.
 * Opcional: --motivo "texto" (padrão: "Decisão do dono 01/11/2026: ...") e, na política, --forcar margemAlvoPct,impostosPct
 * (troca também campos em conflito). Desfazer os preços: Produtos e serviços > Reajustes > "Desfazer o último reajuste".
 */
import { join } from "node:path";
import { abrirDb } from "../src/db.js";
import { servicoPlanilhas } from "../src/servicos/planilhas.js";
import { servicoArquivos } from "../src/servicos/arquivos.js";
import { Travas, CacheMemoria } from "../src/servicos/atendente.js";
import { PoolLegado } from "../src/legado/pool.js";

const arg = (nome: string) => { const i = process.argv.indexOf(nome); return i >= 0 ? String(process.argv[i + 1] ?? "") : ""; };
const tem = (nome: string) => process.argv.includes(nome);
const etapa = (arg("--etapa") || "POLITICA").toUpperCase();
if (etapa !== "POLITICA" && etapa !== "PRECOS") { console.log('Use --etapa POLITICA ou --etapa PRECOS.'); process.exit(1); }
const opcoes: Record<string, unknown> = { etapa, aplicar: tem("--aplicar") };
if (arg("--marca")) opcoes.marca = arg("--marca");
if (arg("--motivo")) opcoes.motivo = arg("--motivo");
if (arg("--limite-alta")) opcoes.limiteAltaPct = Number(arg("--limite-alta").replace(",", "."));
if (arg("--forcar")) opcoes.forcar = arg("--forcar").split(",").map((x) => x.trim()).filter(Boolean);
if (opcoes.aplicar && !opcoes.marca) { console.log("Para aplicar, rode antes a prévia e passe --marca <marca> que ela imprimiu."); process.exit(1); }

const pastaDados = process.env.PASTA_DADOS ?? "./dados";
const db = await abrirDb({ pasta: join(pastaDados, "pglite") });
const servicos = { db, planilhas: servicoPlanilhas(db), arquivos: servicoArquivos(db, pastaDados), travas: new Travas(), cache: new CacheMemoria(), log: (n: string, t: string) => { if (n !== "info") console.error(n, t.slice(0, 200)); } };
const pool = new PoolLegado(servicos, { tamanho: 1, pastaLegado: process.env.PASTA_LEGADO ?? "legado", urlPublica: process.env.URL_PUBLICA ?? "https://sgo.metrolabs.com.br", emailSistema: "sistema@metrolabs.com.br", limiteMs: 300_000, excluir: [] });
let codigo = 0;
try {
  await pool.pronto();
  const r: any = await pool.executar({ tipo: "executar", fn: "Comercial_decisaoDono20261101", args: [opcoes], origem: "editor" });
  const v: any = r?.ok ? r.valor : null;
  if (!v || v.ok === false) { console.log("Não rodou: " + String(r?.erro ?? v?.message ?? "sem resposta").slice(0, 400)); codigo = 1; }
  else if (etapa === "POLITICA" && !v.aplicado) {
    console.log("PRÉVIA DA POLÍTICA (versão gravada hoje: " + v.versaoAtual + ")");
    for (const l of v.linhas) console.log("- " + l.nome + ": " + l.atualTxt + " -> " + l.novoTxt + " [" + l.acao + "] " + l.motivo);
    console.log("Recebem o valor decidido: " + v.aplicar + "; ficam com o valor da Diretoria: " + v.conflitos + ".");
    console.log("MARCA " + v.marca);
  } else if (etapa === "PRECOS" && !v.aplicado) {
    console.log("PRÉVIA DOS PREÇOS (política versão " + v.politicaVersao + ")");
    for (const l of v.linhas) console.log("- " + l.codigo + " " + l.nome + ": " + l.precoAtualTxt + " -> " + l.precoNovoTxt + " (" + l.percentualTxt + "; " + l.fonte + ")");
    console.log(v.qtd + " itens sobem (soma " + v.somaAntesTxt + " -> " + v.somaDepoisTxt + "); sem preço (use a importação da tabela C1): " + v.semPreco + "; já no valor: " + v.iguais + ".");
    console.log("SUSPEITOS fora do lote (limite de alta " + v.limiteAltaPct + "%; corrigir o custo antes): " + v.qtdSuspeitos);
    for (const l of v.suspeitos ?? []) console.log("  ! " + l.codigo + " " + l.nome + ": " + l.precoAtualTxt + " -> " + l.precoNovoTxt + (l.custoTxt ? " (custo " + l.custoTxt + ")" : "") + " - " + l.motivo);
    console.log("Tabela oficial da Diretoria fora do reajuste: " + (v.oficiais ?? 0) + " itens.");
    console.log("MARCA " + v.marca);
  } else console.log(String(v.message ?? "Aplicado."));
} catch (e: any) {
  console.log("Falhou: " + String(e?.message ?? e).slice(0, 400)); codigo = 1;
} finally {
  await pool.encerrar();
  await db.fechar();
}
process.exit(codigo);
