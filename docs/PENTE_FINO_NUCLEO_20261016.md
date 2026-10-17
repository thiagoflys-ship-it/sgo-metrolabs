# Pente fino — núcleo e cadastros do SGO+ (16/10/2026)

Escopo: núcleo (SGO_Main, SGO_Data, SGO_Config, SGO_Utilis, SGO_Auth, JS_Core fora do menu), Clientes, Unidades,
Vínculos, Equipamentos, Inventário, CnpjConsulta, Documentos, Padrões (cadastro), Alertas, AlertasPadrões, Usuários,
Admin (JS_Admin), Chaves, Avisos, Atividades, Notificar, Comunicação, PonteCommand, QRCode, Setup/DriverSetup,
Limpeza, MigracaoExportar.

## Como foi testado

- Cópia do banco de desenvolvimento em `%TEMP%\sgo_nucleo\pglite` (nunca o banco real).
- Chamadas diretas pelo pool do legado (mesmo caminho do navegador), com sessões reais de cada perfil
  (Admin, Gestor, Diretoria, Técnico, Comercial, Cliente) criadas só na cópia: 4 baterias, cerca de 200 chamadas
  (criar, editar parcial, inativar, reativar, excluir, buscar, permissões, vínculos entre execuções).
- Servidor de teste (`SGO_ENSAIO=1`, `SGO_AGENDADOR=0`, porta 8119) e Playwright clicando de verdade: login por
  perfil, abertura de cada página do núcleo, cadastro completo cliente → unidade → equipamento → documento →
  usuário pelas telas (autocompletar, selects em cascata, alertas), publicação de aviso, lançamento de atividade
  pela gestão e janela de atraso/ciência do técnico. Erros de console, alertas e respostas `ok:false` registrados.
- Varredura de funções públicas (sem `_` no fim, chamáveis pelo navegador) sem conferência de sessão.

## Achados graves (corrigidos)

| # | Módulo | Defeito | Correção |
|---|---|---|---|
| 1 | Usuários | Gestor/Diretoria criava usuário ADMIN, promovia qualquer um a ADMIN, trocava a senha do admin e entrava como dono do sistema (inclusive no módulo Chaves). Testado: senha do admin trocada por um Gestor, login funcionou. | Conta/perfil Administrador só é criado, editado, inativado, reativado ou excluído por Administrador; não deixa ficar sem nenhum Admin ativo; o combo de perfis não oferece ADMIN a quem não é Admin. |
| 2 | Auth | Usuário inativado/excluído continuava usando a sessão aberta por até 6 h; perfil trocado não valia. | `validarSessao` reconfere o cadastro a cada 5 min (inativo/removido = sessão encerrada com mensagem; perfil e cliente atualizados). |
| 3 | Clientes, Unidades, Equipamentos, Documentos, Usuários | Edição apagava campos: qualquer pedido sem um campo (outro módulo, integração, formulário incompleto) zerava CNPJ, endereço, e-mail, telefone etc. Testado: editar só a razão social apagou CNPJ, endereço, contato e e-mail. Documentos e Usuários ainda zeravam todas as colunas fora do formulário. | `SGO_DATA.mesclarCampos_`: campo ausente mantém o valor atual; campo enviado vazio continua limpando (o operador limpou). Documentos e Usuários gravam sobre o registro atual. |
| 4 | Inventário | Perfil Cliente via contato, e-mail e telefone de outra empresa (`clienteInfo`) pedindo outro `clienteId`, listava todos os clientes e todos os PDFs de inventário de todas as empresas. | Cliente fica sempre preso à própria empresa no gerar, na lista de clientes, no salvar e na lista de documentos salvos. |
| 5 | Rotinas | `configurarPastasSGO`, `Atividades_rotinaAtrasos`, `SGO_comSincronizarPessoasDiario` e `dispararSincronizacaoTotal` podiam ser chamadas pela internet sem login (a primeira trocava as pastas do Drive do sistema). | `SGO_execucaoInterna_()` (SGO_Main.js): recusa chamada sem usuário ativo (navegador); gatilho e editor seguem funcionando. |
| 6 | Usuários | Coluna EMAIL de CAD_USUARIOS só nascia quando a integração Auvo rodava: o e-mail obrigatório era descartado em silêncio e toda edição seguinte falhava com "E-mail é obrigatório". | A coluna EMAIL é garantida junto com CELULAR. |
| 7 | Setup | `setupSGO` limpa todas as abas; se rodado numa base com dados, apagava a produção. Precedência errada no `if` de renomear "Sheet1". | Recusa quando há dados (nada é alterado); parênteses corrigidos. |
| 8 | Configuração | Perfil DIRETORIA é tratado como gestão em todo o sistema, mas não podia ser cadastrado ("Perfil de acesso inválido"). | DIRETORIA incluído em `PROFILES` (e no combo da tela). |

## Por módulo

### Clientes (SGO_Clientes.js, JS_Cadastros.html)
- Testado: criar com unidade principal, CNPJ duplicado (mensagem aponta o cadastro existente), sem razão social, CNPJ e
  e-mail inválidos, agrupador sem CNPJ, perfil Cliente (lista só a própria empresa, não cria nem vê outra),
  busca por nome e por parte do CNPJ, editar pela tela (formulário carrega todos os campos), excluir com vínculos.
- Corrigido: edição com merge (#3); excluir cadastro com vínculos agora responde só a regra ("...Transfira os vínculos
  antes de excluir, ou inative o cadastro"), sem o "Tente de novo" que induzia a repetir.
- Ficou: Técnico/Comercial/Metrologia podem criar e editar clientes (regra atual da operação, não alterei).

### Unidades (SGO_Unidades.js)
- Testado: criar, CNPJ repetido, nome repetido no mesmo cliente, UF inválida, cliente inexistente, edição parcial.
- Corrigido: merge (#3); trocar o cliente pela tela de edição agora diz para usar Gestão de vínculos (Transferir);
  cliente inativo diz o que fazer (reativar o cliente); excluir com vínculos com mensagem limpa.

### Equipamentos (SGO_Equipamentos.js)
- Testado: criar vazio, unidade de outro cliente, TAG repetida no cliente, edição parcial, mover de unidade,
  inativar/excluir inexistente, excluir com documento ligado, Técnico excluindo, QR por Comercial/Cliente/Técnico.
- Corrigido: validação de cliente e unidade com mensagem ("Selecione o cliente...", "A unidade escolhida não pertence
  a este cliente..."); edição com merge; mudar cliente/unidade pela edição orienta para Gestão de vínculos;
  inativar/reativar/excluir conferem se o registro existe (antes respondiam "sucesso" para ID inexistente) e gravam log;
  reativar não reativa equipamento de cliente/unidade inativos; excluir recusa equipamento com documento, certificado,
  laudo ou atendimento ligado (orienta Inativar — antes apagava e deixava o prontuário órfão); mensagens de falha sem
  "Erro: " + texto técnico.
- Ficou: TIPO não é obrigatório no servidor (a tela exige; CertCal e NR-13 chamam a mesma função).

### Documentos (SGO_Documentos.js, aba Documentos em JS_Admin.html)
- Testado: criar sem arquivo (fica PENDENTE), criar com arquivo PDF (pasta Cliente > Unidade > TAG > categoria),
  registrar documento já existente, edição parcial, inativar, reativar, excluir inexistente, Cliente vendo só os seus.
- Corrigido: merge (#3); status sem registro inexistente "com sucesso"; log de criação e exclusão (exclusão guarda nome
  e link: o arquivo no Drive não é apagado, a mensagem diz isso); documento sem arquivo explica como concluir;
  pasta do equipamento com o mesmo nome que o QR Code abre (TAG vazia ia para pastas diferentes); mensagens de pasta do
  Drive não configurada sem citar função interna; edição de documento com vencimento gravado em dd/mm/aaaa por outro
  módulo deixava o campo de data vazio e salvar apagava o vencimento (tela do computador e do celular).
- Ficou (decisão de projeto, registrar): na transferência de unidade/equipamento, DOC_DOCUMENTOS fica no cliente
  antigo ("histórico preservado"). Consequência: o Portal do Cliente novo não vê documentos antigos do equipamento, e
  editar esse documento falha em `SGO_VINCULOS.relation` (cliente/unidade não batem). Precisa de decisão do dono.

### Vínculos (SGO_Vinculos.js, JS_Vinculos.html)
- Testado: painel, prévia por Técnico (recusada), prévia e confirmação por Gestor, confirmação por outra sessão
  (recusada), resultado conferido em execução seguinte (unidade e equipamento no cliente novo, auditoria gravada),
  excluir cliente com vínculos (bloqueado), unidade principal para cliente sem CNPJ.
- Corrigido: mensagem da unidade principal sem CNPJ diz onde corrigir.

### Usuários (SGO_Usuarios.js, JS_Admin.html)
- Corrigido: #1, #2, #6, #8; edição com merge; log com troca de senha/perfil; Técnico/Cliente que abriam
  Administração viam formulário e lista de usuários que só davam "Acesso negado" — a seção agora explica quem gere.

### Inventário (SGO_Inventario_Main.js)
- Corrigido: #4. Testado: gerar por perfil, salvar e listar (no teste local o PDF não é gerado: o harness não tem o
  conversor; no servidor ele existe).

### Alertas e painel (SGO_Alertas.js, SGO_Main.js)
- Corrigido: vencimento em dd/mm/aaaa (gravado por outros módulos) nunca gerava alerta nem aparecia em "Documentos a
  vencer"; "aaaa-mm-dd" era lido como UTC; ordenação com alerta sem data (NaN) — vai para o topo.
- AlertasPadrões: Gestor recusado na configuração; valores fora da faixa normalizados. OK.

### Atividades (SGO_Atividades.js, JS_Atividades.html)
- Testado: opções por perfil, título/prazo inválidos, Técnico lançando para outro (recusado), Gestor lançando para
  Técnico, início depois do prazo, Kanban por módulo, edição por quem não pode, justificativa curta/no passado/válida,
  fazendo agora, percentual 150 e "40,5", aguardando sem motivo, concluir, reabrir por quem não lançou, comentário,
  avisos lidos, painel da equipe por Técnico e Diretoria, perfil Cliente. Pela tela: Gestor lança, Técnico entra e
  recebe a janela de atraso por cima do aviso.
- Corrigido: rotina de atraso protegida (#5); mensagem "Esta tela é dos perfis Gestor..." e "O perfil Cliente não usa
  o módulo" ficavam invisíveis (classe `avisos-wrap` é escondida pelo `UI_Estilos.html`), deixando tela em branco.

### Avisos (SGO_Avisos.js, JS_Avisos.html)
- Testado: publicar sem texto, prazo vencido, anexo de tipo proibido, publicar para todos e por perfil, pendentes com
  exibição, abrir anexo, ciente (e de novo), leitura (quem leu), reenviar, arquivar, perfil Cliente. Pela tela: Gestor
  publica, painel mostra "0 de 3 leram".
- Corrigido: mensagem para o perfil Cliente estava invisível (mesma classe escondida).

### Chaves (SGO_Chaves.js)
- Testado: dono e não dono, gravar provedor inválido, gravar e mascarar chave ("••••7890"), apagar, chave desconhecida.
  Sem defeito. A proteção de "dono" depende do login `admin`; com o #1 corrigido um Gestor não consegue mais assumir
  essa conta.

### Notificar (SGO_Notificar.js)
- Testado indiretamente (Atividades e Avisos): sem e-mail/WhatsApp configurado registra PULADO com motivo em NTF_ENVIOS.
  Sem defeito.

### Comunicação (Comunicacao.js, SGO_ComunicacaoAdaptador.js, ComunicacaoWidget.html)
- Testado: sem planilha compartilhada (SEM_BANCO com mensagem), perfil Cliente (SEM_ACESSO).
- Corrigido no adaptador do SGO+: Diretoria entrava como colaborador comum (gestão era só ADMIN/GESTOR); rotina diária
  protegida (#5). `Comunicacao.js` não foi alterado (arquivo idêntico ao do COMMAND).

### PonteCommand, QRCode, CnpjConsulta, Padrões, MigracaoExportar, Setup_Seguranca, Limpeza
- Ponte: assinatura HMAC + janela de 5 min; atualizações só com campos preenchidos (sem apagar). OK.
- QR: Comercial/Financeiro recusados; Cliente só o próprio equipamento; pasta aberta corretamente após configurar o Drive.
- CnpjConsulta, Padrões, MigracaoExportar (só editor), Setup_Seguranca (bloqueado pelo nome): sem defeito.
- Limpeza: rotina protegida (#5).

### JS_Core (fora do menu)
- Corrigido: farol do Conduta no painel chamava o servidor sem sessão ("Sessão não informada" no registro do servidor);
  formulário de documento no celular (vencimento, ver Documentos).

## Para outros agentes (não editei)

- Frota/Qualidade: em base sem a aba CAD_CONDUTORES, `Qualidade_apiDispatch` (avisos de login) e `Frota_apiDispatch`
  (situação da frota no painel) dão erro técnico "Aba não encontrada: CAD_CONDUTORES" a cada login; o painel mostra
  "Não foi possível carregar a situação da frota". Deveriam criar a aba sob demanda ou tratar a ausência.
- `UI_Estilos.html` (design): `.avisos-wrap { display:none !important }` esconde qualquer mensagem que use essa classe;
  troquei nas minhas telas, mas vale conferir os outros módulos.
- Logotipo (`LOGO_URL`) aponta para miniatura do Drive do Google; no servidor dá 404 se o arquivo não foi migrado.
- `INV_obterConteudoModulo` é pedido sem sessão (conteúdo estático, sem dado; não é vazamento).

## O que ficou e por quê

- Documentos que ficam no cliente antigo após transferência (decisão de projeto; ver Documentos).
- Permissão de Técnico/Comercial para criar/editar clientes, unidades e equipamentos: regra atual, não mudei sem
  pedido.
- Comunicação compartilhada: `comUsuarioDoToken_` lê a sessão sem renovar; o encerramento por inativação (#2) chega
  a ela quando qualquer outra tela reconferir a sessão (até 5 min).
- Nada foi publicado no Google.
