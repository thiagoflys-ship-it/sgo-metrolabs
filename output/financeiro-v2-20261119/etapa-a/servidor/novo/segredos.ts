/**
 * Tela /_sgo/segredos (só administradores): grava as chaves e senhas que NÃO vieram do Google na migração
 * (a exportação mascarou os segredos). O valor só entra — nunca é mostrado de volta; a tela diz apenas se está
 * configurado e quando foi alterado.
 */
import type { FastifyInstance } from "fastify";
import type { Db } from "../db.js";
import { gravarProp } from "./propSegredas.js";

/**
 * 19/11/2026 (Financeiro v2, etapa a): grupos na tela e as chaves novas do Financeiro (Omie da filial e da prestadora, Sicredi, Sicoob,
 * Itaú e o opcional SERPRO; a Caju continua em Administração > Chaves e senhas > Caju, um lugar só por chave), uma por empresa (MATRIZ, FILIAL, PRESTADORA). Nomes de output/financeiro-v2-20261119/CREDENCIAIS_PARA_O_DONO.md.
 * tipo "pem": certificado ou chave privada colados inteiros (campo de várias linhas, ou "Escolher arquivo" .pem/.crt/.cer/.key);
 * tipo "pfx": certificado A1 em arquivo .pfx/.p12, convertido em texto (base64) no próprio navegador. O valor continua só entrando.
 */
type Segredo = { chave: string; nome: string; ajuda: string; exemplo?: string; grupo?: string; tipo?: "texto" | "pem" | "pfx" };
const BASE: Segredo[] = [
  { chave: "GEMINI_API_KEY", grupo: "IA", nome: "Chave da IA (Gemini)", ajuda: "Google AI Studio → Get API key. Usada nas interpretações técnicas, PGT/POP e leitura de documentos." },
  { chave: "OMIE_APP_KEY", grupo: "Omie (matriz)", nome: "Omie — App Key", ajuda: "Chave do aplicativo Omie da Metrolabs. Use a chave da empresa emissora." },
  { chave: "OMIE_APP_SECRET", grupo: "Omie (matriz)", nome: "Omie — App Secret", ajuda: "Segredo do mesmo aplicativo Omie da Metrolabs." },
  { chave: "MODO_PERSONALIZADO_SENHA", grupo: "Sistema", nome: "Senha do Modo Personalizado (relatórios)", ajuda: "A mesma senha usada hoje no Modo Personalizado dos relatórios técnicos." },
  { chave: "SIMULADOR_ADMIN_SENHA", grupo: "Sistema", nome: "Senha do Simulador (relatórios)", ajuda: "A mesma senha usada hoje no Simulador dos relatórios técnicos." },
  { chave: "SMTP_SENHA", grupo: "Sistema", nome: "Senha do e-mail sistema@metrolabs.com.br", ajuda: "A senha da caixa sistema@metrolabs.com.br (servidor mail.metrolabs.com.br, porta 465). Os e-mails do SGO+ saem por ela." },
  { chave: "PONTE_COMMAND_SEGREDO", grupo: "Sistema", nome: "Segredo da ponte com o COMMAND", ajuda: "O mesmo valor configurado no COMMAND para falar com o SGO+." },
  { chave: "ZAPI_INSTANCIA", grupo: "WhatsApp", nome: "Z-API — ID da instância", ajuda: "No painel da Z-API (app.z-api.io): Instâncias → abra a instância do WhatsApp da Metrolabs → copie o campo \"ID da instância\". Usada nos avisos por WhatsApp (Avisos, Minhas atividades, missões do Conduta). Sem as 3 chaves Z-API, o WhatsApp é pulado e fica registrado \"WhatsApp não configurado\"." },
  { chave: "ZAPI_TOKEN", grupo: "WhatsApp", nome: "Z-API — token da instância", ajuda: "Na mesma tela da instância na Z-API, copie o campo \"Token da instância\" (não é o Client-Token). Se a instância for recriada, o token muda e precisa ser gravado de novo aqui." },
  { chave: "ZAPI_CLIENT_TOKEN", grupo: "WhatsApp", nome: "Z-API — Client-Token (Segurança da conta)", ajuda: "Na Z-API: menu Segurança → \"Token de segurança da conta\" (Client-Token). Ative o token lá e cole aqui o mesmo valor; sem ele a Z-API recusa os envios." },
  { chave: "WHATSAPP_PROVEDOR", grupo: "WhatsApp", nome: "Provedor do WhatsApp: meta ou zapi", exemplo: "meta", ajuda: "Digite meta (WhatsApp oficial da Meta, por modelos aprovados) ou zapi (Z-API). Vazio: usa a Meta se o token da Meta estiver gravado; senão a Z-API, se as 3 chaves dela estiverem gravadas." },
  { chave: "META_WA_TOKEN", grupo: "WhatsApp", nome: "WhatsApp oficial (Meta) — token permanente", ajuda: "No Gerenciador de Negócios da Meta: Configurações do negócio → Usuários → Usuários do sistema → crie (ou abra) um usuário do sistema com acesso ao app e à conta do WhatsApp → Gerar novo token, sem validade, com as permissões whatsapp_business_messaging e whatsapp_business_management. Não use o token temporário de 24 h da tela de teste. As mensagens só saem por modelos aprovados (docs/MODELOS_WHATSAPP_META.md)." },
  { chave: "META_WA_PHONE_ID", grupo: "WhatsApp", nome: "WhatsApp oficial — Phone Number ID", exemplo: "1409597008899044", ajuda: "No painel de desenvolvedores da Meta (developers.facebook.com) → seu app → WhatsApp → Configuração da API: campo \"Identificação do número de telefone\" (Phone Number ID). O da Metrolabs (+55 62 98241-7106) é 1409597008899044. Não é o número de telefone." },
  { chave: "META_WA_WABA_ID", grupo: "WhatsApp", nome: "WhatsApp oficial — WABA ID", exemplo: "1406451067859707", ajuda: "Na mesma tela da Configuração da API: \"Identificação da conta do WhatsApp Business\" (WABA ID). O da Metrolabs é 1406451067859707. Usado para conferir os modelos de mensagem cadastrados." },
];
const EMPRESAS_FIN: Array<[string, string]> = [["MATRIZ", "Matriz"], ["FILIAL", "Filial"], ["PRESTADORA", "Prestadora"]];
const ONDE_SICREDI = "Cada produto (Pix, Boletos, Extrato e saldo, Pagamentos) tem a própria credencial e funciona sozinho: grave só o que o Sicredi já liberou. Peça ao gerente da cooperativa e pegue no portal developer.sicredi.com.br (passo a passo no documento Credenciais para o dono, item 2).";
const ONDE_SICOOB = "Gerado no portal developers.sicoob.com.br depois que o gerente de Cash libera as APIs (documento Credenciais para o dono, item 3).";
const ONDE_ITAU = "O Client ID vem do Analista de Operações do Itaú; o certificado é gerado com o desenvolvedor na sessão marcada (documento Credenciais para o dono, item 4).";
function chavesFinanceiro(): Segredo[] {
  const l: Segredo[] = [];
  for (const [e, n] of EMPRESAS_FIN.slice(1)) {
    l.push({ chave: "OMIE_APP_KEY_" + e, grupo: "Omie da filial e da prestadora", nome: "Omie da " + n + " — App Key", ajuda: "Só se a " + n + " tiver Omie próprio (login e notas separados). No Omie da " + n + ": Configurações → Aplicativos → Desenvolvedor → App Key. Sem Omie próprio, deixe em branco: o SGO+ separa a " + n + " pelas contas correntes dentro do Omie da matriz." });
    l.push({ chave: "OMIE_APP_SECRET_" + e, grupo: "Omie da filial e da prestadora", nome: "Omie da " + n + " — App Secret", ajuda: "O App Secret do mesmo aplicativo do Omie da " + n + "." });
  }
  l.push({ chave: "SICREDI_AMBIENTE", grupo: "Sicredi", nome: "Sicredi — ambiente", exemplo: "homologacao", ajuda: "Digite homologacao (testes) ou producao. Vazio: as integrações do Sicredi ficam desligadas." });
  for (const [e, n] of EMPRESAS_FIN) {
    const g = "Sicredi · " + n, p = "SICREDI_" + e + "_";
    l.push({ chave: p + "CONTA_CLIENT_ID", grupo: g, nome: "Sicredi " + n + " — extrato e saldo: Client ID", ajuda: "Credencial das APIs de Extrato e Saldo de Conta Corrente. " + ONDE_SICREDI });
    l.push({ chave: p + "CONTA_CLIENT_SECRET", grupo: g, nome: "Sicredi " + n + " — extrato e saldo: Client Secret", ajuda: "O segredo da mesma credencial de extrato e saldo." });
    l.push({ chave: p + "CONTA_CERT", grupo: g, tipo: "pem", nome: "Sicredi " + n + " — extrato e saldo: certificado (se for outro)", ajuda: "Só se o portal der um certificado próprio para extrato e saldo. Se for o mesmo do Pix, deixe em branco: o SGO+ usa o do Pix." });
    l.push({ chave: p + "CONTA_CHAVE_PRIVADA", grupo: g, tipo: "pem", nome: "Sicredi " + n + " — extrato e saldo: chave privada (se for outra)", ajuda: "A chave privada do certificado de extrato e saldo, quando ele não for o do Pix. Fica cifrada no cofre." });
    l.push({ chave: p + "PIX_CLIENT_ID", grupo: g, nome: "Sicredi " + n + " — Pix: Client ID", ajuda: "Gerado no portal depois do chamado \"Acesso à API Pix\" com o CNPJ e o ID da adesão." });
    l.push({ chave: p + "PIX_CLIENT_SECRET", grupo: g, nome: "Sicredi " + n + " — Pix: Client Secret", ajuda: "O segredo da credencial do Pix." });
    l.push({ chave: p + "PIX_CERT", grupo: g, tipo: "pem", nome: "Sicredi " + n + " — Pix: certificado (.cer ou .pem)", ajuda: "Cole inteiro, do -----BEGIN ao -----END, ou escolha o arquivo. O SGO+ avisa 30 dias antes de vencer." });
    l.push({ chave: p + "PIX_CHAVE_PRIVADA", grupo: g, tipo: "pem", nome: "Sicredi " + n + " — Pix: chave privada (.key)", ajuda: "A chave privada do mesmo certificado. Cole inteira ou escolha o arquivo. Fica cifrada no cofre do servidor." });
    l.push({ chave: p + "PIX_CHAVE", grupo: g, nome: "Sicredi " + n + " — chave Pix aleatória da conta", ajuda: "A chave Pix aleatória cadastrada na conta (o boleto híbrido exige uma chave aleatória)." });
    l.push({ chave: p + "COB_API_KEY", grupo: g, nome: "Sicredi " + n + " — boletos: Developer Key (x-api-key)", ajuda: "No portal: aplicação com \"API COBRANÇA BOLETO\"; a Developer Key aparece em Tokens de Acesso." });
    l.push({ chave: p + "COB_CODIGO_ACESSO", grupo: g, nome: "Sicredi " + n + " — boletos: Código de Acesso", ajuda: "Gerado no Internet Banking: Cobrança → Código de Acesso → Gerar." });
    l.push({ chave: p + "COOPERATIVA", grupo: g, nome: "Sicredi " + n + " — número da cooperativa", ajuda: "Informado pelo gerente." });
    l.push({ chave: p + "POSTO", grupo: g, nome: "Sicredi " + n + " — número do posto", ajuda: "Informado pelo gerente." });
    l.push({ chave: p + "BENEFICIARIO", grupo: g, nome: "Sicredi " + n + " — código do beneficiário", ajuda: "Informado pelo gerente (cobrança)." });
    l.push({ chave: p + "PAG_CLIENT_ID", grupo: g, nome: "Sicredi " + n + " — pagamentos (Multipag): Client ID", ajuda: "Só depois que o gerente liberar o Multipag. Pergunte se o pagamento enviado fica esperando aprovação no Internet Banking." });
    l.push({ chave: p + "PAG_CLIENT_SECRET", grupo: g, nome: "Sicredi " + n + " — pagamentos (Multipag): Client Secret", ajuda: "O segredo da credencial do Multipag." });
    l.push({ chave: p + "PAG_CERT", grupo: g, tipo: "pem", nome: "Sicredi " + n + " — pagamentos: certificado (se for outro)", ajuda: "Só se o Multipag tiver certificado próprio; senão o SGO+ usa o do Pix." });
    l.push({ chave: p + "PAG_CHAVE_PRIVADA", grupo: g, tipo: "pem", nome: "Sicredi " + n + " — pagamentos: chave privada (se for outra)", ajuda: "A chave privada do certificado do Multipag, quando ele não for o do Pix. Fica cifrada no cofre." });
  }
  l.push({ chave: "SICOOB_AMBIENTE", grupo: "Sicoob", nome: "Sicoob — ambiente", exemplo: "homologacao", ajuda: "Digite homologacao ou producao. Vazio: as integrações do Sicoob ficam desligadas." });
  for (const [e, n] of EMPRESAS_FIN) {
    const g = "Sicoob · " + n, p = "SICOOB_" + e + "_";
    l.push({ chave: p + "CLIENT_ID", grupo: g, nome: "Sicoob " + n + " — Client ID", ajuda: ONDE_SICOOB });
    l.push({ chave: p + "CERT_PFX", grupo: g, tipo: "pfx", nome: "Sicoob " + n + " — certificado A1 (.pfx)", ajuda: "O certificado digital e-CNPJ A1 da empresa (o mesmo da nota fiscal serve). Escolha o arquivo .pfx: o navegador converte em texto e grava. Fica cifrado no cofre." });
    l.push({ chave: p + "CERT_SENHA", grupo: g, nome: "Sicoob " + n + " — senha do certificado A1", ajuda: "A senha do arquivo .pfx." });
    l.push({ chave: p + "NUMERO_CLIENTE", grupo: g, nome: "Sicoob " + n + " — número do cliente (cooperado)", ajuda: "Informado pelo gerente." });
    l.push({ chave: p + "CONTA", grupo: g, nome: "Sicoob " + n + " — conta corrente", ajuda: "O número da conta corrente no Sicoob." });
    l.push({ chave: p + "PIX_CHAVE", grupo: g, nome: "Sicoob " + n + " — chave Pix aleatória da conta", ajuda: "Para o boleto com Pix." });
  }
  l.push({ chave: "ITAU_AMBIENTE", grupo: "Itaú", nome: "Itaú — ambiente", exemplo: "homologacao", ajuda: "Digite homologacao ou producao. Vazio: as integrações do Itaú ficam desligadas." });
  for (const [e, n] of EMPRESAS_FIN) {
    const g = "Itaú · " + n, p = "ITAU_" + e + "_";
    l.push({ chave: p + "CLIENT_ID", grupo: g, nome: "Itaú " + n + " — Client ID", ajuda: ONDE_ITAU });
    l.push({ chave: p + "CLIENT_SECRET", grupo: g, nome: "Itaú " + n + " — Client Secret", ajuda: "Aparece uma única vez, na geração do certificado. Grave na hora." });
    l.push({ chave: p + "CERT", grupo: g, tipo: "pem", nome: "Itaú " + n + " — certificado (.crt)", ajuda: "Cole inteiro, do -----BEGIN ao -----END, ou escolha o arquivo. Vence em até 1 ano; o SGO+ avisa." });
    l.push({ chave: p + "CHAVE_PRIVADA", grupo: g, tipo: "pem", nome: "Itaú " + n + " — chave privada (.key)", ajuda: "A chave privada do mesmo certificado. Fica cifrada no cofre do servidor." });
    l.push({ chave: p + "AGENCIA", grupo: g, nome: "Itaú " + n + " — agência", ajuda: "Só os números." });
    l.push({ chave: p + "CONTA", grupo: g, nome: "Itaú " + n + " — conta", ajuda: "Só os números, com o dígito." });
    l.push({ chave: p + "PIX_CHAVE", grupo: g, nome: "Itaú " + n + " — chave Pix aleatória", ajuda: "Para o BolePix." });
  }
  // Caju: as chaves continuam só em Administração > Chaves e senhas > Caju do SGO+ (SGO_Chaves.js); um lugar só por chave.
  l.push({ chave: "SERPRO_CONSUMER_KEY", grupo: "Guias de imposto (opcional, SERPRO)", nome: "SERPRO Integra Contador — Consumer Key", ajuda: "Só se o dono contratar a emissão automática de guias (tem custo por guia). Sem ela, as guias continuam pelo PDF do contador." });
  l.push({ chave: "SERPRO_CONSUMER_SECRET", grupo: "Guias de imposto (opcional, SERPRO)", nome: "SERPRO Integra Contador — Consumer Secret", ajuda: "O segredo da mesma credencial." });
  return l;
}
export const SEGREDOS: Segredo[] = [...BASE, ...chavesFinanceiro()];

export function rotasSegredos(app: FastifyInstance, db: Db, ehAdmin: (sessao: string) => Promise<boolean>) {
  app.get("/_sgo/segredos", async (_req, rep) => rep.type("text/html; charset=utf-8").header("Cache-Control", "no-store").send(PAGINA));
  app.post("/_sgo/segredos", async (req, rep) => {
    const c = (req.body ?? {}) as { sessao?: string; chave?: string; valor?: string };
    // sessão da aba (sessionStorage) ou, em outra aba, o cookie do login (sgo_sessao)
    const cookie = String((req.cookies as Record<string, string | undefined> | undefined)?.sgo_sessao ?? "");
    const valida = (c.sessao && (await ehAdmin(String(c.sessao)))) || (cookie && (await ehAdmin(cookie)));
    if (!valida)
      return rep.code(403).send({ ok: false, erro: "Só administradores. Entre no SGO+ (https://sgo.metrolabs.com.br) com um usuário de perfil Administrador e abra de novo este endereço. Se já entrou e continua aparecendo, o seu usuário não é Administrador: peça a quem é para mudar o perfil em Administração → Usuários." });
    if (c.chave !== undefined) {
      const s = SEGREDOS.find((x) => x.chave === c.chave);
      if (!s) return rep.code(400).send({ ok: false, erro: "Chave desconhecida." });
      const valor = String(c.valor ?? "").trim();
      if (!valor) await db.query("DELETE FROM propriedades WHERE escopo = 'script' AND chave = $1", [s.chave]);
      else await gravarProp(db, "script", s.chave, valor);   // 11/11/2026 (D-04): cifrado em repouso (propSegredas.ts)
    }
    const atuais = new Map((await db.query<{ chave: string; em: string }>("SELECT chave, to_char(atualizado_em AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') AS em FROM propriedades WHERE escopo = 'script' AND chave = ANY($1)", [SEGREDOS.map((x) => x.chave)])).map((r) => [r.chave, r.em]));
    return { ok: true, itens: SEGREDOS.map((s) => ({ ...s, configurado: atuais.has(s.chave), em: atuais.get(s.chave) ?? "" })) };
  });
}

const PAGINA = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Chaves e senhas</title>
<style>:root{--bg:#0d1117;--card:#161b22;--borda:#30363d;--txt:#e5e7eb;--fraco:#94a3b8;--ok:#22c55e;--alerta:#f59e0b}
body{margin:0;background:var(--bg);color:var(--txt);font:14px/1.5 system-ui,"Segoe UI",sans-serif;padding:16px;max-width:760px}
h1{font-size:20px;margin:0 0 4px}.sub{color:var(--fraco);margin-bottom:16px}.card{background:var(--card);border:1px solid var(--borda);border-radius:8px;padding:14px;margin-bottom:12px}
.card h2{font-size:15px;margin:0 0 4px}.ajuda{color:var(--fraco);font-size:13px;margin-bottom:8px}.linha{display:flex;gap:8px;flex-wrap:wrap}
input,textarea{flex:1;min-width:200px;background:#0b1220;border:1px solid var(--borda);color:var(--txt);border-radius:6px;padding:8px;font:inherit}
textarea{width:100%;min-height:96px;font-family:ui-monospace,Consolas,monospace;font-size:12px;box-sizing:border-box}
input[type=file]{flex:1 1 100%;min-width:0;padding:6px}
button{background:#1f6feb;color:#fff;border:0;border-radius:6px;padding:8px 14px;font-weight:600;cursor:pointer}button.sec{background:#30363d}
.selo{display:inline-block;padding:1px 8px;border-radius:99px;font-size:12px;font-weight:600;margin-left:6px}.ok{background:rgba(34,197,94,.15);color:var(--ok)}.falta{background:rgba(245,158,11,.15);color:var(--alerta)}
details.grupo{margin:0 0 14px}details.grupo>summary{cursor:pointer;font-weight:700;font-size:15px;padding:8px 0}details.grupo>summary span{font-weight:400;color:var(--fraco);font-size:13px;margin-left:6px}
.arquivo{color:var(--fraco);font-size:12px;width:100%}
#msg{margin:8px 0;color:var(--alerta)}</style></head><body>
<h1>Chaves e senhas do SGO+</h1><div class="sub">Por segurança, elas não vieram do Google. Cole cada uma e clique em Gravar. O valor nunca é mostrado de novo — para trocar, grave outro por cima. Certificados e chaves privadas se colam inteiros (do -----BEGIN ao -----END) ou se escolhem pelo arquivo; o certificado .pfx é convertido em texto aqui mesmo, no navegador.</div>
<div id="msg"></div><div id="lista">carregando…</div>
<script>
var sessao="";try{sessao=sessionStorage.getItem("SGO_SESSION")||""}catch(e){}
var esc=function(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})};
var abertos={};
function enviar(corpo){return fetch("/_sgo/segredos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(Object.assign({sessao:sessao},corpo||{}))}).then(function(r){return r.json()})}
function filtro(s){var h=(location.hash||"").slice(1).toLowerCase();if(!h)return true;if(h==="omie")return s.chave.indexOf("OMIE_")===0;
 if(h==="bancos")return ["SICREDI_","SICOOB_","ITAU_","CAJU_","SERPRO_"].some(function(p){return s.chave.indexOf(p)===0});
 return String(s.grupo||"").toLowerCase().normalize("NFD").replace(/[^a-z]/g,"").indexOf(h)===0}
function campo(s){var id="v_"+s.chave;
 if(s.tipo==="pem")return '<textarea autocomplete="off" spellcheck="false" id="'+id+'" placeholder="-----BEGIN ... -----END ..."></textarea><input type="file" accept=".pem,.crt,.cer,.key,.txt" data-arq="'+esc(s.chave)+'" data-tipo="pem"><div class="arquivo">Ou escolha o arquivo: o conteúdo entra no campo acima; confira e clique em Gravar.</div>';
 if(s.tipo==="pfx")return '<input type="file" accept=".pfx,.p12" data-arq="'+esc(s.chave)+'" data-tipo="pfx"><input type="hidden" id="'+id+'"><div class="arquivo" id="a_'+esc(s.chave)+'">Escolha o arquivo .pfx: ele vira texto (base64) aqui no navegador e só sai daqui quando você clicar em Gravar.</div>';
 return '<input type="password" autocomplete="off" id="'+id+'" placeholder="'+esc(s.exemplo?"ex.: "+s.exemplo:"cole aqui")+'">'}
function cartao(s){return '<div class="card"><h2>'+esc(s.nome)+(s.configurado?'<span class="selo ok">configurado em '+esc(s.em)+'</span>':'<span class="selo falta">falta configurar</span>')+'</h2><div class="ajuda">'+esc(s.ajuda)+'</div><div class="linha">'+campo(s)+'<button data-gravar="'+esc(s.chave)+'">Gravar</button>'+(s.configurado?'<button class="sec" data-apagar="'+esc(s.chave)+'">Apagar</button>':'')+'</div></div>'}
function desenhar(d){var m=document.getElementById("msg");if(!d.ok){m.textContent=d.erro;document.getElementById("lista").innerHTML="";return}m.textContent="";
 var itens=d.itens.filter(filtro),grupos=[],por={};
 itens.forEach(function(s){var g=s.grupo||"Outras";if(!por[g]){por[g]=[];grupos.push(g)}por[g].push(s)});
 var muitos=grupos.length>3;
 document.getElementById("lista").innerHTML=grupos.map(function(g){var l=por[g],n=l.filter(function(s){return s.configurado}).length,aberto=!muitos||abertos[g]||(n>0&&n<l.length);
  return '<details class="grupo" data-grupo="'+esc(g)+'"'+(aberto?" open":"")+'><summary>'+esc(g)+'<span>'+n+' de '+l.length+' configurada(s)</span></summary>'+l.map(cartao).join("")+'</details>'}).join("")||'<div class="card">Nenhuma chave neste filtro. Tire o final do endereço (depois do #) para ver todas.</div>';
 Array.prototype.forEach.call(document.querySelectorAll("details.grupo"),function(x){x.addEventListener("toggle",function(){abertos[x.getAttribute("data-grupo")]=x.open})});
 Array.prototype.forEach.call(document.querySelectorAll("[data-gravar]"),function(b){b.onclick=function(){gravar(b.getAttribute("data-gravar"))}});
 Array.prototype.forEach.call(document.querySelectorAll("[data-apagar]"),function(b){b.onclick=function(){apagar(b.getAttribute("data-apagar"))}});
 Array.prototype.forEach.call(document.querySelectorAll("[data-arq]"),function(inp){inp.onchange=function(){lerArquivo(inp)}})}
function lerArquivo(inp){var f=inp.files&&inp.files[0],k=inp.getAttribute("data-arq"),alvo=document.getElementById("v_"+k);if(!f||!alvo)return;
 if(f.size>200000){document.getElementById("msg").textContent="Arquivo grande demais para um certificado ("+Math.round(f.size/1024)+" KB). Confira se escolheu o arquivo certo.";return}
 var r=new FileReader();
 if(inp.getAttribute("data-tipo")==="pfx"){r.onload=function(){var b=new Uint8Array(r.result),t="";for(var i=0;i<b.length;i++)t+=String.fromCharCode(b[i]);alvo.value=btoa(t);var a=document.getElementById("a_"+k);if(a)a.textContent="Arquivo "+f.name+" pronto ("+Math.round(f.size/1024)+" KB). Clique em Gravar."};r.readAsArrayBuffer(f)}
 else{r.onload=function(){alvo.value=String(r.result||"")};r.readAsText(f)}}
function gravar(k){var v=document.getElementById("v_"+k).value.trim();if(!v){document.getElementById("msg").textContent="Cole o valor (ou escolha o arquivo) antes de clicar em Gravar.";return}enviar({chave:k,valor:v}).then(desenhar)}
function apagar(k){if(confirm("Apagar esta chave? O que depende dela para de funcionar até você gravar outra."))enviar({chave:k,valor:""}).then(desenhar)}
window.addEventListener("hashchange",function(){enviar().then(desenhar)});
enviar().then(desenhar).catch(function(){document.getElementById("msg").textContent="Não consegui falar com o servidor. Confira a internet e recarregue a página (F5)."});
</script></body></html>`;
