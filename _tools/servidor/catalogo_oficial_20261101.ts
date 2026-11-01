/**
 * Catálogo oficial da Diretoria (01/11/2026): prévia e aplicação na produção, sem tela. Roda Comercial_catalogoOficial20261101() do
 * legado (SGO_Comercial_CatalogoOficial.js), como as rotinas do editor (origem "editor"). A mesma coisa existe na tela: Comercial >
 * Produtos e serviços > "Catálogo oficial" (Diretoria e Administrador).
 *
 * Este arquivo vive no repositório do SGO+ (_tools/servidor). Para usar, copie para sgo_servidor/scripts/ junto com a publicação do
 * legado que traz SGO_Comercial_CatalogoOficial.js.
 *
 * Etapas (sempre a prévia antes; aplicar exige a marca que a prévia imprimiu; rodar de novo não duplica):
 *   CATALOGO    cria os 26 serviços (casando pelo código), desativa os serviços da tabela C1 que repetem um dos 26 (com histórico;
 *               nunca apaga) e põe os parâmetros padrão no freezer da C1. A prévia imprime também a sobra de cada serviço.
 *   DESCRICOES  cria a descrição padronizada dos serviços e produtos ativos sem descritivo (só o campo vazio; marca "revisar").
 *
 * Uso no contêiner:
 *   docker exec -w /app sgo-app-1 npx tsx scripts/catalogo_oficial_20261101.ts --etapa CATALOGO
 *   docker exec -w /app sgo-app-1 npx tsx scripts/catalogo_oficial_20261101.ts --etapa CATALOGO --aplicar --marca <marca>
 *   docker exec -w /app sgo-app-1 npx tsx scripts/catalogo_oficial_20261101.ts --etapa DESCRICOES
 *   docker exec -w /app sgo-app-1 npx tsx scripts/catalogo_oficial_20261101.ts --etapa DESCRICOES --aplicar --marca <marca>
 * Opcional na prévia de DESCRICOES: --todas (lista todos os itens, não só os 10 exemplos).
 */
import { join } from "node:path";
import { abrirDb } from "../src/db.js";
import { servicoPlanilhas } from "../src/servicos/planilhas.js";
import { servicoArquivos } from "../src/servicos/arquivos.js";
import { Travas, CacheMemoria } from "../src/servicos/atendente.js";
import { PoolLegado } from "../src/legado/pool.js";

const arg = (nome: string) => { const i = process.argv.indexOf(nome); return i >= 0 ? String(process.argv[i + 1] ?? "") : ""; };
const tem = (nome: string) => process.argv.includes(nome);
const etapa = (arg("--etapa") || "CATALOGO").toUpperCase();
if (etapa !== "CATALOGO" && etapa !== "DESCRICOES") { console.log("Use --etapa CATALOGO ou --etapa DESCRICOES."); process.exit(1); }
const opcoes: Record<string, unknown> = { etapa, aplicar: tem("--aplicar") };
if (arg("--marca")) opcoes.marca = arg("--marca");
if (opcoes.aplicar && !opcoes.marca) { console.log("Para aplicar, rode antes a prévia e passe --marca <marca> que ela imprimiu."); process.exit(1); }

const pastaDados = process.env.PASTA_DADOS ?? "./dados";
const db = await abrirDb({ pasta: join(pastaDados, "pglite") });
const servicos = { db, planilhas: servicoPlanilhas(db), arquivos: servicoArquivos(db, pastaDados), travas: new Travas(), cache: new CacheMemoria(), log: (n: string, t: string) => { if (n !== "info") console.error(n, t.slice(0, 200)); } };
const pool = new PoolLegado(servicos, { tamanho: 1, pastaLegado: process.env.PASTA_LEGADO ?? "legado", urlPublica: process.env.URL_PUBLICA ?? "https://sgo.metrolabs.com.br", emailSistema: "sistema@metrolabs.com.br", limiteMs: 300_000, excluir: [] });
let codigo = 0;
try {
  await pool.pronto();
  const r: any = await pool.executar({ tipo: "executar", fn: "Comercial_catalogoOficial20261101", args: [opcoes], origem: "editor" });
  const v: any = r?.ok ? r.valor : null;
  if (!v || v.ok === false) { console.log("Não rodou: " + String(r?.erro ?? v?.message ?? "sem resposta").slice(0, 400)); codigo = 1; }
  else if (etapa === "CATALOGO" && !v.aplicado) {
    console.log("PRÉVIA DO CATÁLOGO OFICIAL (" + v.versao + ")");
    console.log("Criar " + v.qtdCriar + ": " + v.criar.map((x: any) => x.codigo).join(", "));
    const difere = v.existem.filter((x: any) => x.difere);
    console.log("Já existem (não duplica): " + v.existem.length + (difere.length ? " (preço diferente da tabela do dono: " + difere.map((x: any) => x.codigo + " " + x.precoTxt).join(", ") + ")" : ""));
    for (const c of v.conflitos) console.log("  ! " + c.codigo + " já é o código de \"" + c.existente + "\": não será criado (troque o código do item antigo e rode de novo)");
    console.log("Desativar " + v.qtdDesativar + " da C1 (com histórico, nada apagado):");
    for (const d of v.desativar) console.log("  - " + d.codigo + " " + d.nome + " -> " + d.por.join(", "));
    for (const p of v.parametrizar ?? []) console.log("  + parâmetros padrão em " + p.codigo + " " + p.nome + " (" + p.condicoes + ")");
    console.log("Mantidos: " + v.mantidos);
    console.log("SOBRA PELA FICHA (preço | custo | impostos GO | comissão | sobra R$ | sobra %):");
    for (const l of v.sobra ?? []) console.log("  " + l.codigo + " " + l.nome + " | " + l.precoTxt + " | " + l.custoTxt + " | " + l.impostosTxt + " | " + l.comissaoTxt + " | " + l.sobraTxt + " | " + l.sobraPctTxt + (l.fonte === "estimativa" || l.estimativa ? " (estimativa)" : ""));
    console.log("MARCA " + v.marca);
  } else if (etapa === "DESCRICOES" && !v.aplicado) {
    console.log("PRÉVIA DAS DESCRIÇÕES: " + v.qtd + " itens sem descritivo (" + v.servicos + " serviços e contratos, " + v.produtos + " produtos)");
    for (const l of (tem("--todas") ? v.linhas : v.exemplos)) console.log("  - " + l.codigo + " " + l.nome + " [" + l.familia + "]: " + l.nova);
    console.log("MARCA " + v.marca);
  } else console.log(String(v.message ?? "Aplicado."));
} catch (e: any) {
  console.log("Falhou: " + String(e?.message ?? e).slice(0, 400)); codigo = 1;
} finally {
  await pool.encerrar();
  await db.fechar();
}
process.exit(codigo);
