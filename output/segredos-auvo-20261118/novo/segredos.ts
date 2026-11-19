/**
 * Tela /_sgo/segredos (só administradores): grava as chaves e senhas que NÃO vieram do Google na migração
 * (a exportação mascarou os segredos). O valor só entra — nunca é mostrado de volta; a tela diz apenas se está
 * configurado e quando foi alterado.
 */
import type { FastifyInstance } from "fastify";
import type { Db } from "../db.js";
import { gravarProp } from "./propSegredas.js";

export const SEGREDOS: Array<{ chave: string; nome: string; ajuda: string; exemplo?: string }> = [
  { chave: "GEMINI_API_KEY", nome: "Chave da IA (Gemini)", ajuda: "Google AI Studio → Get API key. Usada nas interpretações técnicas, PGT/POP e leitura de documentos." },
  { chave: "OMIE_APP_KEY", nome: "Omie — App Key", ajuda: "Chave do aplicativo Omie da Metrolabs. Use a chave da empresa emissora." },
  { chave: "OMIE_APP_SECRET", nome: "Omie — App Secret", ajuda: "Segredo do mesmo aplicativo Omie da Metrolabs." },
  { chave: "MODO_PERSONALIZADO_SENHA", nome: "Senha do Modo Personalizado (relatórios)", ajuda: "A mesma senha usada hoje no Modo Personalizado dos relatórios técnicos." },
  { chave: "SIMULADOR_ADMIN_SENHA", nome: "Senha do Simulador (relatórios)", ajuda: "A mesma senha usada hoje no Simulador dos relatórios técnicos." },
  { chave: "SMTP_SENHA", nome: "Senha do e-mail sistema@metrolabs.com.br", ajuda: "A senha da caixa sistema@metrolabs.com.br (servidor mail.metrolabs.com.br, porta 465). Os e-mails do SGO+ saem por ela." },
  { chave: "PONTE_COMMAND_SEGREDO", nome: "Segredo da ponte com o COMMAND", ajuda: "O mesmo valor configurado no COMMAND para falar com o SGO+." },
  { chave: "ZAPI_INSTANCIA", nome: "Z-API — ID da instância", ajuda: "No painel da Z-API (app.z-api.io): Instâncias → abra a instância do WhatsApp da Metrolabs → copie o campo \"ID da instância\". Usada nos avisos por WhatsApp (Avisos, Minhas atividades, missões do Conduta). Sem as 3 chaves Z-API, o WhatsApp é pulado e fica registrado \"WhatsApp não configurado\"." },
  { chave: "ZAPI_TOKEN", nome: "Z-API — token da instância", ajuda: "Na mesma tela da instância na Z-API, copie o campo \"Token da instância\" (não é o Client-Token). Se a instância for recriada, o token muda e precisa ser gravado de novo aqui." },
  { chave: "ZAPI_CLIENT_TOKEN", nome: "Z-API — Client-Token (Segurança da conta)", ajuda: "Na Z-API: menu Segurança → \"Token de segurança da conta\" (Client-Token). Ative o token lá e cole aqui o mesmo valor; sem ele a Z-API recusa os envios." },
  { chave: "WHATSAPP_PROVEDOR", nome: "Provedor do WhatsApp: meta ou zapi", exemplo: "meta", ajuda: "Digite meta (WhatsApp oficial da Meta, por modelos aprovados) ou zapi (Z-API). Vazio: usa a Meta se o token da Meta estiver gravado; senão a Z-API, se as 3 chaves dela estiverem gravadas." },
  { chave: "META_WA_TOKEN", nome: "WhatsApp oficial (Meta) — token permanente", ajuda: "No Gerenciador de Negócios da Meta: Configurações do negócio → Usuários → Usuários do sistema → crie (ou abra) um usuário do sistema com acesso ao app e à conta do WhatsApp → Gerar novo token, sem validade, com as permissões whatsapp_business_messaging e whatsapp_business_management. Não use o token temporário de 24 h da tela de teste. As mensagens só saem por modelos aprovados (docs/MODELOS_WHATSAPP_META.md)." },
  { chave: "META_WA_PHONE_ID", nome: "WhatsApp oficial — Phone Number ID", exemplo: "1409597008899044", ajuda: "No painel de desenvolvedores da Meta (developers.facebook.com) → seu app → WhatsApp → Configuração da API: campo \"Identificação do número de telefone\" (Phone Number ID). O da Metrolabs (+55 62 98241-7106) é 1409597008899044. Não é o número de telefone." },
  { chave: "META_WA_WABA_ID", nome: "WhatsApp oficial — WABA ID", exemplo: "1406451067859707", ajuda: "Na mesma tela da Configuração da API: \"Identificação da conta do WhatsApp Business\" (WABA ID). O da Metrolabs é 1406451067859707. Usado para conferir os modelos de mensagem cadastrados." },
];

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
input{flex:1;min-width:200px;background:#0b1220;border:1px solid var(--borda);color:var(--txt);border-radius:6px;padding:8px}
button{background:#1f6feb;color:#fff;border:0;border-radius:6px;padding:8px 14px;font-weight:600;cursor:pointer}button.sec{background:#30363d}
.selo{display:inline-block;padding:1px 8px;border-radius:99px;font-size:12px;font-weight:600;margin-left:6px}.ok{background:rgba(34,197,94,.15);color:var(--ok)}.falta{background:rgba(245,158,11,.15);color:var(--alerta)}
#msg{margin:8px 0;color:var(--alerta)}</style></head><body>
<h1>Chaves e senhas do SGO+</h1><div class="sub">Por segurança, elas não vieram do Google. Cole cada uma e clique em Gravar. O valor nunca é mostrado de novo — para trocar, grave outro por cima.</div>
<div id="msg"></div><div id="lista">carregando…</div>
<script>
var sessao="";try{sessao=sessionStorage.getItem("SGO_SESSION")||""}catch(e){}
var esc=function(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})};
function enviar(corpo){return fetch("/_sgo/segredos",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(Object.assign({sessao:sessao},corpo||{}))}).then(function(r){return r.json()})}
function desenhar(d){var m=document.getElementById("msg");if(!d.ok){m.textContent=d.erro;document.getElementById("lista").innerHTML="";return}m.textContent="";
 document.getElementById("lista").innerHTML=(location.hash==="#omie"?d.itens.filter(function(s){return s.chave.indexOf("OMIE_")===0}):d.itens).map(function(s){return '<div class="card"><h2>'+esc(s.nome)+(s.configurado?'<span class="selo ok">configurado em '+esc(s.em)+'</span>':'<span class="selo falta">falta configurar</span>')+'</h2><div class="ajuda">'+esc(s.ajuda)+'</div><div class="linha"><input type="password" autocomplete="off" id="v_'+s.chave+'" placeholder="'+esc(s.exemplo?"ex.: "+s.exemplo:"cole aqui")+'"><button onclick="gravar(\\''+s.chave+'\\')">Gravar</button>'+(s.configurado?'<button class="sec" onclick="apagar(\\''+s.chave+'\\')">Apagar</button>':'')+'</div></div>'}).join("")}
function gravar(k){var v=document.getElementById("v_"+k).value.trim();if(!v){document.getElementById("msg").textContent="Cole o valor antes de clicar em Gravar.";return}enviar({chave:k,valor:v}).then(desenhar)}
function apagar(k){if(confirm("Apagar esta chave? O que depende dela para de funcionar até você gravar outra."))enviar({chave:k,valor:""}).then(desenhar)}
enviar().then(desenhar).catch(function(){document.getElementById("msg").textContent="Não consegui falar com o servidor. Confira a internet e recarregue a página (F5)."});
</script></body></html>`;
