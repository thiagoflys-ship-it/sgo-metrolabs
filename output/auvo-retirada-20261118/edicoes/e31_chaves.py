import sys, os, subprocess, tempfile
BLOCOS = [
(r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Chaves.js', [
("var CHV_GRUPOS = ['Inteligência artificial', 'Auvo', 'Omie',",
 "// 18/11/2026: o grupo Auvo saiu da tela (Auvo descontinuado pelo dono). Os valores gravados não são lidos nem apagados.\nvar CHV_GRUPOS = ['Inteligência artificial', 'Omie',"),
("""  { chave: 'AUVO_API_KEY', grupo: 'Auvo', tipo: 'chave', teste: 'auvo', nome: 'Auvo: chave de acesso',
    ajuda: 'No Auvo: Menu → Integrações → API, campo da chave de acesso (API Key).' },
  { chave: 'AUVO_API_TOKEN', grupo: 'Auvo', tipo: 'chave', teste: 'auvo', nome: 'Auvo: token de acesso',
    ajuda: 'No Auvo, na mesma tela da chave de acesso, campo do token (API Token).' },
  { chave: 'AUVO_AVISOS_WHATSAPP', grupo: 'Auvo', tipo: 'aberto', exemplo: '1', opcoes: CHV_LIGA_DESLIGA, vazio: 'Desligado', nome: 'Avisos de O.S. do Auvo por WhatsApp e e-mail',
    ajuda: 'Ligado, a sincronização do Auvo avisa o técnico, a gestão e o contato do cliente quando um chamado é aberto e quando é concluído (modelos sgo_chamado_aberto e sgo_chamado_concluido; ligue depois que a Meta aprovar os dois). Cada evento avisa uma vez. Na primeira sincronização com os avisos ligados, o SGO+ grava a data de corte AUVO_AVISOS_DESDE; O.S. abertas ou concluídas antes dela não geram aviso.' },
  { chave: 'AUVO_AVISAR_GESTAO', grupo: 'Auvo', tipo: 'aberto', exemplo: 'joao, maria', nome: 'Avisos de O.S.: quem da gestão recebe (logins)',
    ajuda: 'Logins (campo Usuário do cadastro de usuários) separados por vírgula. Vazio = todos os usuários ativos com perfil Gestor ou Diretoria.' },
""", ""),
("""  if (item.chave === 'AUVO_AVISOS_WHATSAPP' && v !== '1' && v !== '0') {
    throw new Error('Não foi possível gravar: os avisos de O.S. aceitam só 1 (liga) ou 0 (desliga).');
  }
  if (item.chave === 'AUVO_AVISAR_GESTAO' && !/^[A-Za-z0-9._@-]+([\\s,;]+[A-Za-z0-9._@-]+)*$/.test(v)) {
    throw new Error('Não foi possível gravar: informe os logins separados por vírgula (ex.: joao, maria), sem outros sinais.');
  }
""", ""),
("""/** Depois de trocar credenciais do Auvo, o token guardado em cache deixa de valer. */
function Chaves_aposAlterar_(chave) {
  if (chave === 'AUVO_API_KEY' || chave === 'AUVO_API_TOKEN') {
    try { if (typeof Auvo_invalidarTokenCache_ === 'function') Auvo_invalidarTokenCache_(); } catch (e) {}
  }
""", """/** Depois de trocar uma credencial, o token guardado em cache deixa de valer. */
function Chaves_aposAlterar_(chave) {
"""),
("  ['gemini', 'auvo', 'omie', 'email', 'whatsapp', 'rastreador', 'tuya', 'caju'].forEach(function (t) {",
 "  ['gemini', 'omie', 'email', 'whatsapp', 'rastreador', 'tuya', 'caju'].forEach(function (t) {"),
(" * Testes: payload.tipo = 'gemini' | 'auvo' | 'email' | 'whatsapp' (whatsapp pede payload.telefone).",
 " * Testes: payload.tipo = 'gemini' | 'email' | 'whatsapp' (whatsapp pede payload.telefone). 18/11/2026: o teste do Auvo saiu."),
("""    else if (tipo === 'auvo') r = Chaves_testarAuvo_();
""", ""),
('__RE__', r"function Chaves_testarAuvo_\(\) \{.*?\n}\n\n(function Chaves_testarEmail_)", r"\1", 1),
]),
(r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\JS_Chaves.html', [
("""    "Auvo": { icone: "fa-arrows-rotate", teste: "auvo", obrig: [["AUVO_API_KEY", "AUVO_API_TOKEN"]], resumo: "Sincronização de clientes, equipamentos e ordens de serviço com o Auvo." },
""", ""),
("""    auvo: "Entra na API do Auvo com a chave e o token gravados.",
""", ""),
("(inteligência artificial, Auvo, e-mail, WhatsApp, rastreador)", "(inteligência artificial, e-mail, WhatsApp, rastreador)"),
]),
(r'C:\Users\venda\projetos\google-script-dev\output\financeiro-20261116\cand31\SGO_Poderes.js', [
('"Grava ou apaga chaves da IA, Omie, Auvo, e-mail do sistema, Z-API e Meta na tela do servidor."',
 '"Grava ou apaga chaves da IA, Omie, e-mail do sistema, Z-API e Meta na tela do servidor."'),
]),
]
rep = r'C:\Users\venda\AppData\Local\Temp\claude\b22c3c2c767b0e1f\e1d0539f-743d-4268-a74e-8dbd5da7591b\scratchpad\rep.py'
for arq, pares in BLOCOS:
    fd, tmp = tempfile.mkstemp(suffix='.py'); os.close(fd)
    open(tmp, 'w', encoding='utf-8').write('ARQ = %r\nPARES = %r\n' % (arq, pares))
    r = subprocess.run([sys.executable, rep, tmp], capture_output=True, text=True)
    print((r.stdout + r.stderr).strip()); os.remove(tmp)
    if r.returncode: sys.exit(1)
