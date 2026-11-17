# E-mail "igual ao Outlook": contatos, destinatário em pílulas, excluir pela linha e seguir para a próxima (17/11/2026)

Estado: **preparado e testado localmente. NÃO publicado, sem commit, sem acesso à produção, ao servidor ou ao banco.**

Pedido (equipe, repassado pelo dono): lista de contatos salvos; busca ao preencher o destinatário; ficar igual ao Outlook, com o "X" de excluir na própria linha, sem abrir o e-mail; ao excluir, seguir para a próxima mensagem; mais ferramentas e ajustes.

Base: `output/financeiro-20261116/cand13` (= produção, conferida por sha256 antes). Cópia dos arquivos originais em `base-legado/` (com `SHA256.txt`). Servidor: a partir de `servidor-producao/` (cópia exata da produção); o repositório `sgo_servidor` não foi usado.

## 1. O que mudou

### Lista de mensagens (`JS_Email.html`)
- Cada linha virou um item com caixinha de seleção, envelope (lida/não lida), bandeira (sinalizar) e **×** (excluir sem abrir). Os botões aparecem ao passar o mouse ou com a linha em foco; no celular (`hover: none`) ficam sempre à vista. A bandeira de uma mensagem sinalizada fica sempre visível.
- **Excluir abre a próxima**: `Email_planoProximo_` escolhe a mensagem de baixo; se era a última, a de cima. Funciona com a mensagem aberta (botão "Excluir" da leitura, Delete ou o × da linha dela). A rolagem da lista é mantida (`Email_desenharLista_` salva e restaura `scrollTop`). Excluir pelo × de outra linha não troca a mensagem aberta.
- **Desfazer** (7 s, também Ctrl+Z): a linha some na hora; a exclusão só vai ao servidor depois do prazo (`EM.pend`, `Email_confirmarExclusao_`). Nova exclusão confirma a anterior. Sair da página ou trocar de aba do navegador confirma na hora. Se o servidor recusar, a mensagem volta para a lista com o motivo. Na Lixeira: apagar para sempre, com confirmação e sem desfazer (como antes).
- **Seleção múltipla**: caixinhas, Ctrl+clique, Shift+clique (intervalo), "Selecionar todas"; barra de lote com Excluir, Mover para..., Lida, Não lida, Sinalizar, Tirar sinal, Limpar seleção.
- **Arrastar para a pasta** (computador) e **deslizar** no celular (esquerda exclui, direita marca lida/não lida).
- **Teclas de atalho**: ↓/↑ (próxima/anterior, abrindo como o painel de leitura), Delete, R, Shift+R, F, N, U, I/Insert, /, Esc, Ctrl+Z. Valem só no E-mail, na aba Caixa, sem janela aberta e fora de campos de texto (também com o foco no texto da mensagem).
- **Filtro "Sinalizadas"** e botão Sinalizar/Tirar sinalização na leitura.
- Marcar/sinalizar/mover respondem na hora e voltam ao estado anterior se o servidor recusar (mensagem com o motivo e o que fazer).
- Leitura: botão renomeado de "Apagar" para **"Excluir"** (como no Outlook); proteção contra respostas fora de ordem ao navegar rápido com as setas (`EM.lerSeq`).
- No celular, com a lista na tela, o × não pula para a leitura; na pasta Rascunhos a próxima não abre sozinha (abriria a janela de escrever).

### Escrever: destinatário em pílulas com busca ao digitar
- Para, Cc e Cco viraram campos de pílulas (`Email_campoDest_`, `Email_destIniciar_`, `Email_destTecla_`): sugestões ao digitar (até 8) dos meus contatos e do catálogo da empresa, por nome, e-mail ou empresa, sem acento e sem maiúscula (`Email_sugerir_`); ordem: usados por último, favoritos, meus contatos, empresa; campo vazio mostra os usados por último.
- Setas + Enter/Tab, clique; ";" ou "," fecha o endereço; colar lista cria várias pílulas (`Email_partesEndereco_` respeita vírgula entre aspas e `<>`); Backspace tira a última; dois cliques editam; × tira; endereço inválido fica vermelho e **trava o envio** com mensagem que diz qual corrigir e como.
- Ao servidor vão só os endereços, separados por vírgula (mesmo formato de antes). Rascunho reaberto agora também traz o Cco.
- **Rascunho automático** (padrão ligado, preferência no navegador): a cada minuto com mudança, sem tela de espera; "Enviar" espera o salvamento em curso (senão sobraria rascunho); "Descartar" manda para a Lixeira o rascunho criado só pelo automático; falha para o automático daquela janela e explica. Arquivo anexado durante o salvamento não se perde mais.

### Contatos (`SGO_Email.js` + aba nova "Contatos")
- Aba `EML_CONTATOS` (criada sozinha no 1º uso: ID, USUARIO_ID, NOME, EMAIL, EMPRESA, TELEFONE, OBS, FAVORITO, ORIGEM, USOS, ULTIMO_USO, STATUS, CRIADO_EM, ATUALIZADO_EM).
- APIs novas: `Email_apiContatos`, `Email_apiContatoSalvar`, `Email_apiContatoExcluir`, `Email_apiContatoFavorito`, `Email_apiContatosPrefs`. Internas: `Email_catalogoEmpresa_`, `Email_coletarDestinatarios_`, `Email_contaEhPessoal_`, `Email_enderecosDe_`, `Email_emailValido_`.
- **Privacidade**: o dono vem sempre da sessão; editar/excluir/favoritar contato de outra pessoa é recusado ("não foi encontrado entre os seus"); nem o Administrador vê. Excluir é lógico (STATUS EXCLUIDO). Mesmo e-mail salvo de novo atualiza sem duplicar e sem apagar o que estava preenchido. Limite 2.000 por pessoa.
- **Catálogo da empresa** (só leitura): colegas ativos (sem cliente/representada/AUVO_SYNC, sem a própria pessoa), clientes ativos e contatos ativos dos clientes (endereço @metrolabs no cadastro do cliente fica de fora); fornecedores de Compras só com `Cmp_eu_(...).veValores` (quem já vê fornecedores); contatos das representadas só com `RepI_podeAdministrar_`. **Nenhuma aba do Financeiro/Omie é lida** — o sigilo `OMIE_SIGILO_CONTAS` continua valendo.
- **Coleta automática** ao enviar (`Email_apiEnviar`): só pela **caixa pessoal** (confere com `situacao`), endereço novo vira "Guardado ao enviar" (até 50 por envio), contato usado ganha USOS/ULTIMO_USO (recentes primeiro); excluído não volta; o próprio endereço não entra. Preferência por pessoa em `EMAIL_CONTATOS_PREFS` (padrão ligada). A resposta traz `contatosNovos` e a tela avisa.
- "Salvar remetente nos contatos" na leitura (já é contato: abre para editar).

### Filtro Sinalizadas (`SGO_Email.js` + servidor)
- `Email_apiListar` repassa `sinalizadas`. Servidor atualizado filtra a caixa toda (devolve `filtros.sinalizadas`). **Com o servidor de hoje (sem o patch)** o legado filtra a página e marca `sinalizadasParcial`; a tela avisa que vale só para a página.

### "Como fazer nesta aba", ajuda e manual
- Quadro "Como fazer nesta aba" (texto justificado) em Caixa, Contatos, Minha caixa e assinatura e Caixas compartilhadas; começa aberto no computador e fechado no celular; a escolha fica no navegador.
- Explicação embaixo de cada campo novo (contato: nome, e-mail, empresa, telefone, observação, favorito; coleta automática; destinatários; rascunho automático).
- `SGO_Ajuda_Email.js`: 6 passos novos (Excluir sem abrir e seguir para a próxima, Várias mensagens de uma vez, Teclas de atalho, Destinatário: busca ao digitar, Contatos, Rascunho automático), cores, problemas e perguntas novas.
- `docs/MANUAL_MODULO_EMAIL.md`: seção **6C** completa, com tabela de erros.

## 2. Servidor: precisa publicar?

**Não é obrigatório.** Tudo funciona com o servidor de hoje; só o filtro "Sinalizadas" fica limitado à página aberta (a tela avisa). Para o filtro valer na caixa toda, publicar o patch pequeno em `emailPessoal` (busca IMAP `flagged`, chave do cache e `filtros: { sinalizadas: true }` no retorno):

- `servidor/src/servicos/emailPessoal.ts` e `servidor/dist/servicos/emailPessoal.js` (editados à mão de forma equivalente; `node --check` ok);
- patch unificado: `servidor-sinalizadas.patch` (contra `servidor-producao/`).
- O teste novo confere que, fora do filtro, nenhuma outra linha do arquivo mudou em relação à produção.

## 3. Configurações
- Nenhuma configuração obrigatória. Aba `EML_CONTATOS` criada no primeiro uso.
- `EMAIL_CONTATOS_PREFS` (propriedade): coleta automática por pessoa (padrão ligada), alterada pela própria pessoa na aba Contatos.
- No navegador (`localStorage`, só conveniência): `sgo_email_autorrascunho`, `sgo_email_como_<aba>`.
- Prazo do Desfazer: `EMAIL_DESFAZER_MS = 7000` em `JS_Email.html`.

## 4. Decisões tomadas (padrão seguro)
1. Desfazer por exclusão adiada (nada vai ao servidor nos 7 s) em vez de mover de volta da Lixeira: não depende de UID novo e, se a página fechar antes, a mensagem só continua na caixa.
2. Coleta só pela caixa pessoal; caixa compartilhada (comercial@, financeiro@...) nunca alimenta contato pessoal.
3. Catálogo só com o que a pessoa já vê em outras telas; Financeiro fora por completo.
4. Na Lixeira, exclusão definitiva continua com confirmação e sem desfazer.
5. Ao servidor vão só e-mails (sem nome de exibição) para não mudar o formato aceito pelo envio.
6. Atalhos com letras simples (R, F, N, U, I) e não Ctrl+R/Ctrl+N, que o navegador usa para recarregar/nova janela.
7. Ordem das sugestões: usados por último primeiro (pedido), depois favoritos.
8. Auto-atualização da lista continua sem redesenhar formulário: não roda com janela aberta, com foco em campo, em outra página ou durante o arrastar; ao rodar mantém rolagem, seleção e as linhas do Desfazer.

## 5. Ficou para depois
- Regras de caixa (mover automático por remetente), categorias coloridas, "lembrar depois" (adiar) e agendamento de envio: exigem rotina no servidor.
- Pesquisa no corpo da mensagem e em todas as pastas de uma vez (hoje: remetente, destinatário e assunto da pasta aberta) — exige mudança no servidor IMAP.
- Desfazer envio, conversas agrupadas (thread), mover várias entre caixas diferentes.
- Importar contatos (CSV/vCard) e grupos/listas de distribuição.
- Mostrar o nome de exibição no envio ("Nome <email>").
- Responder a todos / encaminhar com anexos / assinatura já existiam e foram mantidos.
- Base do assistente (`SGO_AssistenteManuais.js`) não foi regerada (é gerada na publicação; o teste `assistente-duvidas` já falhava antes nesse ponto).
- COMMAND (descontinuado) não recebeu as mudanças.

## 6. Riscos
- Fechar o navegador nos 7 s do Desfazer: a mensagem fica na caixa (não some), a pessoa exclui de novo.
- Trocar de aba do navegador confirma a exclusão na hora (o Desfazer some).
- Com o servidor sem patch, "Sinalizadas" filtra só a página (aviso na tela).
- Ícones do Font Awesome não aparecem nas capturas porque o ensaio bloqueia a internet; na produção o CDN é o mesmo de hoje.
- Testes de navegador são sintéticos (servidor de e-mail simulado). Falta teste com caixa real e operador real.

## 7. Testes
- Novo: `tests/email-outlook-20261117.test.cjs` — 14 testes, código de saída 0 (contatos privados, validação, catálogo e sigilo, coleta, filtro Sinalizadas com servidor novo e antigo, patch do servidor, sugestão ao digitar, pílulas, próxima depois de excluir, ajuda/manual; página completa no Chromium: × sem abrir, Desfazer, excluir a aberta abre a próxima, rolagem mantida, última abre a de cima, setas, U/I, lote, bandeira + filtro, arrastar para pasta, pílulas/colar/inválido, coleta, aba Contatos, salvar remetente, rascunho automático, celular 390/320 e 1366 sem rolagem lateral).
- Capturas: `capturas/` (1366, 390 e 320).

### Placar da suíte completa (`suite.txt`, DEST=cand13 com as mudanças)
- **2340 aprovados / 64 falhas, 252 arquivos** (referência `output/portal-cliente-20261116/contratos/suite.txt`: 2326 / 63, 250 arquivos).
- Comparação arquivo a arquivo: **nenhum arquivo piorou**; nenhum arquivo da referência mudou de placar. Diferenças:
  - `email-outlook-20261117.test.cjs` (novo, deste trabalho): 14 aprovados, 0 falhas, saída 0.
  - `pendencias-memo-representada-20261117.test.cjs` (novo, **de outra frente**, criado hoje às 10:59): 0/1. Lê só `SGO_Alertas_Central.js` (não alterado aqui) e espera uma mudança da central de pendências que ainda não está em cand13; não tem relação com o E-mail. As +14 aprovações e a +1 falha vêm desses dois arquivos novos.
- Testes ligados ao E-mail, todos sem mudança de placar: `email-integrado` 17/0, `etapa5-compras-email-cadastros` 10/0, `navegacao-voltar` 18/0, `assistente-duvidas` 10/2 (as 2 falhas já existiam na referência).

## 8. Arquivos
Legado (editados em `output/financeiro-20261116/cand13`, cópia em `legado/`, diff em `legado.patch`):
- `JS_Email.html` — sha256 `f237a304ed2c2ed93db422bf158d92a80ddd931e062429216e720120229e34b0` (antes `b58fff1f137345b4…`)
- `SGO_Email.js` — sha256 `7d690d0d838f0a527d899f2eac5899952d23f386399c40d31307c635b8b13c33` (antes `095d35dbcc1ee274…`)
- `SGO_Ajuda_Email.js` — sha256 `57a04c679f1ec1f4bea3dd7b35474a9ebd6f007b34c9282405d4fe04adae9cde` (antes `be20099920091412…`)

Documentação: `docs/MANUAL_MODULO_EMAIL.md` (seção 6C).

Servidor (opcional, só o filtro Sinalizadas): `servidor/src/servicos/emailPessoal.ts` (`03cf6b2d…`), `servidor/dist/servicos/emailPessoal.js` (`450d58ad…`), `servidor-sinalizadas.patch`.

Testes: `tests/email-outlook-20261117.test.cjs`. Placar: `suite.txt`.

Todos os arquivos são LF (nenhum dos editados era CRLF). Nada de RH360, bloqueio da Frota ou PGT/POP foi tocado.
