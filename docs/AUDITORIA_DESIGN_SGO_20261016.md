# Auditoria de design do SGO+ — 16/10/2026

Revisão de produto e experiência de uso do SGO+ (Metrolabs) rodando no servidor próprio. O código é o legado `apps-script-imports/portal_sgo_versao_cnpj_db`, e o visual é o "Bancada" (tokens `--bc-*` em `UI_Estilos.html`).

**Como foi feito**
- O sistema rodou numa cópia descartável do banco de desenvolvimento (`sgo_servidor`, `SGO_ENSAIO=1`).
- Login como ADMIN e como usuários de teste TECNICO, GESTOR, METROLOGIA e COMERCIAL.
- Navegação com Playwright em 1440 px e 390 px, abrindo todos os itens do menu e cada aba, modal e formulário dos módulos.
- Para ver as listas preenchidas, a cópia recebeu dados de teste: cliente, unidade, equipamento, padrão THM-900, veículo, condutor, atividade e aviso.
- As capturas estão em `docs/auditoria_design_20261016/`.

**Prioridades**
- **P1**: quebra o trabalho, engana o usuário ou bloqueia.
- **P2**: confunde, está fora do lugar ou é inconsistente.
- **P3**: acabamento.

**Regras do dono usadas como critério**
- Nada com cara de IA: sem emoji, sem frase motivacional, sem marketing e sem inglês na interface.
- Tom profissional.
- Números em pt-BR.
- Documentos em A4.
- O operador nunca fica no limbo.
- Não redesenhar a barra superior nem a organização geral, que o dono aprovou.

**Situação**
- A navegação global (seção 1) foi corrigida nesta rodada.
- As seções 2 a 6 são a lista de trabalho da **fase 2**: nenhum arquivo de módulo foi alterado nesta auditoria.
- Itens que já estavam corrigidos na cópia de trabalho por outros agentes e ainda não foram publicados aparecem como "já corrigido, falta publicar".
- Fase 2 do núcleo, cadastros, calibração e documentos técnicos: commit 78a0405 (não publicado). Os itens feitos estão riscados com a nota "Feito na fase 2". Também nesse commit, fora da lista: logo embutida nos documentos de PGT/POP, Planejamento CME, Cronograma e Registros (antes lida pelo ID do Drive, saía em branco), TAG de padrão duplicada recusada com mensagem, botão "Escolher arquivo" em português em todo o sistema e confirmação da rotina da Conduta pela prévia (`apiPreverRotina`).

## Resumo

| Bloco | Itens | P1 | P2 | P3 |
|---|---|---|---|---|
| 1. Navegação global (menu, Início, busca, celular) | 42 (31 corrigidos nesta rodada, 11 para a fase 2) | 4 | 27 | 11 |
| 2. Qualificação (Autoclaves, Lavadoras, Cadeia de frio, Estufa) | 33 | 6 | 18 | 9 |
| 3. Calibração e declarações (Certificado, Padrões, Relatório de calibração, Declaração, QI/QO/QD) | 36 | 2 | 21 | 13 |
| 4. Documentos técnicos (PGT/POP, Planejamento CME, Cronograma, Registros, NR-13, Inventário) | 52 | 9 | 28 | 15 |
| 5. Campo e gestão (Frota, Auvo, Qualidade, Conduta) | 45 | 3 | 24 | 18 |
| 6. Principal, cadastros e administração | 64 | 4 | 34 | 26 |
| **Total** | **272** | **28** | **152** | **92** |

Nos blocos 2 a 6, 14 itens de navegação já foram corrigidos nesta rodada e aparecem riscados. O resto é a lista da fase 2.

### Os 10 mais graves (fase 2)

1. **[P1] Conduta: "Aplicar agora: fechamentos pendentes e ajustes do programa" fecha e congela meses sem confirmação.** O botão é verde e primário, fica no Início do ADMIN e o resultado só aparece num `alert`. *Onde:* `JS_Core.html › Conduta_aplicarRotinaAgora_`.
2. **[P1] Qualificação (os 4 módulos): "Relatório interno" (dados reconstituídos) é o botão mais destacado da tela.** Aparece para todos os perfis e pede a senha num `window.prompt`, que mostra o que se digita.
3. **[P1] Cadeia de frio: o rótulo "Responsável pelo aceite (TPLCADEIAFRIOREL_CLIENTE)" mostra um identificador interno cru na seção 6.**
4. **[P1] Qualificação: erro de geração escondido.** O erro só aparece no "Histórico da operação", no pé de uma página de cerca de 4.000 px, enquanto o selo do topo continua "Pronto".
5. **[P1] Clientes e Unidades (computador): a lista de cadastros sumiu.** Os botões Inativar, Reativar e Excluir sumiram junto, porque o painel de vínculos esconde a tabela. *Onde:* `JS_Vinculos.html › attach()`.
6. **[P1] Painel de qualidade diz "0 itens / OK" com CNH vencida na Frota.** O bloco da Frota some quando não há movimentação. *Onde:* `tplQualidade_montarFrota_`.
7. **[P1] Celular, Novo equipamento e Novo documento: o seletor de cliente aparece sem nome ("— 11222333000181").** A tela lê `RAZAO_SOCIAL`, mas o servidor devolve `NOME`.
8. **[P1] Certificado de calibração mistura a emissão com a gestão do laboratório.** São cerca de 1.400 px de padrões, inventário, orçamento e relatórios de IA antes de "1. Cliente". Proposta: página própria "Padrões de referência", com três abas.
9. **[P1] Lavadora, aba "Gerar relatório": dezenas de rótulos sem acento** ("INSTITUICAO", "PARAMETROS", "(C)", "Mantem", "oscilacoes").
10. **[P2] Avisos: "Publicar" manda e-mail e WhatsApp para todos sem confirmar.** A janela do aviso ainda abre por cima de formulário em uso, e a mensagem final cita a tabela interna `NTF_ENVIOS`.

### Problemas que se repetem em quase todos os módulos (corrigir uma vez, aplicar em todos)

- **Título duplicado.** O casco mostra o título da página e o módulo repete um H1 com outro subtítulo, relógio próprio e selo "Pronto" ou "pronto". Tirar o cabeçalho interno e levar "Manual do Operador" para o lado de "Atividades do módulo".
- **Textos do Google desatualizados.** "Google Docs", "Drive", "planilha Google", "Config.gs", "Propriedades do script", "template", "placeholder". No servidor próprio os arquivos ficam no armazenamento do SGO+ (`sgo_servidor/src/compat/drive.ts`).
- **"Histórico da operação".** É um quadro de registro técnico, vazio, com 300 a 700 px e título duplicado. Remover, ou trocar por "Detalhes técnicos da última geração" recolhido.
- **CAIXA ALTA forçada por estilo** em títulos de seção, rótulos e até opções de rádio e listas de verificação. Tirar o `text-transform` dos módulos.
- **Situações em código cru.** "DISPONIVEL", "ATIVO", "REGULAR", "TECNICO", "Status". Mostrar "Disponível", "Técnico", "Situação", mantendo o valor gravado.
- **Ações destrutivas sem confirmação.** Inativar padrão, remover bloco de ensaio, publicar aviso, sincronizar em lote no Auvo, fechar o mês da Conduta.
- **Seletor de arquivo nativo em inglês** ("Choose File / No file chosen"). Usar um botão próprio "Escolher arquivo".
- **CNPJ sem máscara** nas listas, cartões e sugestões. Exibir no formato 11.222.333/0001-81.

## 1. Navegação global: menu lateral, Início, busca e cabeçalhos

Esta parte já foi **corrigida nesta rodada** (arquivos de navegação: `Index.html`, `JS_Inicio.html`, `UI_Estilos.html` e os trechos de menu/Início/cabeçalho de `JS_Core.html`). Abaixo, o diagnóstico que motivou cada mudança e o que ficou para a fase 2.

### 1.1 Menu lateral: antes e depois

**Antes** (5 grupos + Principal, 31 itens):

| Grupo | Itens |
|---|---|
| Principal | Início, Minhas atividades, Avisos, Atividades da equipe |
| Qualificação térmica | Autoclave, Lavadoras, Cadeia de frio, Estufa, banho-maria e secadora |
| Calibração e documentos (11) | Certificado de calibração, Relatório de calibração, Padrões, Declaração de execução, Relatório de qualificação (QI/QO/QD), PGT e POP, Planejamento CME, Cronograma de execução, Registros operacionais, Laudo NR-13 (vaso de pressão), Inventário de equipamentos |
| Operação e campo | Frota, Integração Auvo, Painel de qualidade, Programa de conduta |
| Cadastros | Clientes, Unidades, Equipamentos, **Técnicos**, Documentos, **Usuários**, Vínculos |
| Administração | Administração, Chaves e senhas |

**Depois** (7 grupos + Principal, 31 itens, na ordem do trabalho: planejar e executar o serviço técnico, documentar, campo, gestão, cadastros, sistema):

| Grupo | Itens |
|---|---|
| Principal | Início, Minhas atividades, Atividades da equipe, Avisos |
| Qualificação | Autoclaves, Lavadoras, Cadeia de frio, Estufa, banho-maria e secadora, Relatório QI/QO/QD, Planejamento CME |
| Calibração | Certificado de calibração, Relatório de calibração, Padrões de referência |
| Documentos técnicos | Declaração de execução, Laudo NR-13, Cronograma de execução, PGT e POP, Registros operacionais, Inventário de equipamentos |
| Operação de campo | Integração Auvo, Frota |
| Gestão | Painel de qualidade, Programa de conduta |
| Cadastros | Clientes, Unidades, Equipamentos, Vínculos, Arquivo de documentos |
| Administração | Usuários, Configurações, Chaves e senhas |

**Quem vê o quê (perfil)** — regra única em `aplicarRegrasDeAcesso_` (JS_Core) mais as regras de cada módulo:

| Item | ADMIN | GESTOR / DIRETORIA | TECNICO, METROLOGIA, COMERCIAL, FINANCEIRO | CLIENTE |
|---|---|---|---|---|
| Início | sim | sim | sim | sim |
| Minhas atividades, Avisos | sim | sim | sim | não |
| Atividades da equipe | sim | sim | não | não |
| Qualificação, Calibração, Documentos técnicos, Frota, Programa de conduta | sim | sim | sim | não |
| Clientes, Vínculos | sim | sim | sim | não |
| Unidades, Equipamentos, Arquivo de documentos | sim | sim | sim | sim (só os dele) |
| Usuários, Integração Auvo, Painel de qualidade | sim | sim | **não (novo)** | não |
| Configurações | sim | sim | sim | não |
| Chaves e senhas | só o dono (SGO_DONOS) | não | não | não |

### 1.2 Problemas encontrados no menu (todos corrigidos)

- [P1] **"Técnicos" era item morto** — o módulo Técnicos foi removido; o item em Cadastros abria o Certificado de calibração inteiro e rolava até um seletor no meio do formulário de emissão (`certcal-tecnico`). Prometia um cadastro e entregava um campo de formulário. **Feito:** item e atalho removidos. *Onde:* Index.html (menu), JS_Inicio.html › `Menu_atalho_`.
- [P1] **"Usuários" aparecia para todos os perfis** — o servidor só deixa ADMIN, GESTOR e DIRETORIA gerir usuários (`SGO_Usuarios.js › verificarPermissaoAdmin_`); para TECNICO o item levava a uma tela que só devolve "Acesso negado". **Feito:** item escondido para os demais perfis. *Onde:* JS_Core › `aplicarRegrasDeAcesso_`.
- [P2] **Grupo "Calibração e documentos" com 11 itens sem relação** — misturava calibração (certificado, relatório, padrões), qualificação (QI/QO/QD, Planejamento CME), inspeção (NR-13) e documentos entregues ao cliente (PGT/POP, registros, inventário, cronograma). O nome nem cabia no menu ("CALIBRAÇÃO E DOCUMENT…"). **Feito:** dividido em Qualificação, Calibração e Documentos técnicos.
- [P2] **Painel de qualidade e Programa de conduta em "Operação e campo"** — são ferramentas de gestão da equipe, não de campo. **Feito:** grupo próprio "Gestão"; "Operação de campo" ficou com Auvo e Frota.
- [P2] **"Usuários" em Cadastros e "Administração" dentro de "Administração"** — Usuários duplicava a página Administração e ficava longe dela; o item tinha o mesmo nome do grupo. **Feito:** Usuários foi para Administração; o item da página ficou "Configurações". *Fase 2:* renomear o título da página (JS_Admin › `renderAdminModulo_`, H2 "Administração") para "Configurações" e pôr "Gestão de usuários" como primeiro bloco (hoje está no fim, depois de ociosidade, alertas e "Limpar sessão travada").
- [P2] **Relatório QI/QO/QD no grupo de calibração** — é relatório de qualificação. Rótulo de 2 linhas ("Relatório de qualificação (QI/QO/QD)"). **Feito:** foi para Qualificação como "Relatório QI/QO/QD".
- [P2] **Contador de padrões vencidos no item errado** — o balão `menuBadgePadroes` (padrões vencendo/vencidos) ficava em "Certificado de calibração". **Feito:** passou para "Padrões de referência".
- [P2] **"Documentos" (cadastro) confundia com o novo grupo de documentos técnicos** — é o arquivo de anexos por cliente (categorias NBR 15943). **Feito:** "Arquivo de documentos" no menu e no título da página; textos da página revisados ("Equipamento (opcional)", "Situação", sem "enviado ao Drive", estado vazio orientando a pesquisa).
- [P2] **Menu e título da página não batiam** — "Autoclave" no menu x "Autoclaves" na página; títulos em Caixa Alta de Título ("Cadeia de Frio", "Laudo NR-13 (Vaso de Pressão)", "Registros Operacionais"...). **Feito:** menu "Autoclaves"; títulos do casco em maiúscula só na primeira palavra, iguais ao menu (JS_Core › `abrirModulo_`).
- [P2] **"Atividades da equipe" separada de "Minhas atividades" por "Avisos"** — **Feito:** as duas ficam juntas.
- [P3] **Ícones repetidos ou enganosos** — `fa-list-check` em Minhas atividades e em QI/QO/QD; Clientes com ícone de pessoa (cliente é empresa); Auvo com ícone de "link"; Equipamentos com chave inglesa (o Início usa fábrica). **Feito:** QI/QO/QD `fa-file-circle-check`, Clientes `fa-building`, Unidades `fa-location-dot`, Equipamentos `fa-industry`, Auvo `fa-arrows-rotate`, Arquivo `fa-folder-open` (desktop e celular).
- [P2] **Tela desconhecida mostrava só "Módulo não encontrado."** — operador no limbo. **Feito:** tela "Tela não encontrada" com explicação e botão "Voltar ao Início" (JS_Core › `abrirModulo_`).
- [P1] **Integração Auvo e Painel de qualidade abertos no menu para todos** — o servidor bloqueia quem não é ADMIN, GESTOR ou DIRETORIA (`Auvo_exigirAdmin_`, `Qualidade_exigirGestor_`), então o técnico entrava numa tela em que cada botão responde "Acesso restrito". **Feito:** os dois itens seguem a mesma regra de "Usuários".
- [P2] **Item ativo errado no menu** — em Integração Auvo, Painel de qualidade, Programa de conduta e Laudo NR-13 o menu continuava com "Início" aceso, porque só os módulos que chamavam `atualizarBadgeModulo_` marcavam o item. **Feito:** `abrir()` marca sempre o item da tela aberta.
- [P3] **Programa de conduta com três nomes** — "Programa de conduta" (menu), "Programa de Conduta, Pontuação e Bonificação" (página), "Conduta" (celular). **Feito:** título "Programa de conduta"; o subtítulo explica a pontuação e o bônus.
- [P2] **Estilo global escondia mensagens de módulo** — a regra `.avisos-wrap { display:none !important }` (criada para sumir com a faixa antiga "Módulo atual: X") escondia qualquer aviso com essa classe, como "Os links … ainda não foram configurados" em `renderMotorModulo_`; Atividades e Avisos tiveram de contornar. **Feito:** só `#areaAvisos` fica escondido; `.avisos-wrap` virou faixa de aviso visível (UI_Estilos.html).
- [P3] **Logo quebrado mostrava o texto "Logo Metrolabs" sobre a marca** quando a imagem não carrega. **Feito:** a imagem some sozinha se falhar (Index.html › `#logoTopo`).

### 1.3 Busca rápida (Ctrl K)

- [P2] **A busca de telas só achava pelo rótulo exato** — "nr13", "vaso", "QI", "termodesinfectora", "geladeira", "veículo" não achavam nada. **Feito:** cada item do menu tem `data-busca` com siglas e sinônimos; a busca também ignora hífen e espaço ("nr13" acha "Laudo NR-13"). *Onde:* Index.html, JS_Inicio › `Busca_telas_`.
- [P3] **Sem termo, a lista "Ir para" sugeria a própria tela aberta** (começava por "Início" estando no Início). **Feito:** a tela atual não é sugerida.

### 1.4 Início (desktop)

Corrigido:
- [P2] Títulos em Caixa Alta de Título ("Equipamentos por Tipo", "Documentos por Mês", "Últimos Documentos", "Atendimentos por Técnico") e links "Ver Mais >" — **Feito:** "Equipamentos por tipo"... e "Ver todos".
- [P2] Chip "4 Motores de relatório ativos" — jargão interno da época do Google, sem utilidade para quem usa. **Feito:** removido.
- [P2] Painel "Alertas e pendências" no rodapé repetia o nome da faixa de pendências do topo e, vazio, dizia "Nenhum documento vencido ou a vencer nos próximos 30 dias" — mas o painel também cobre padrões e frota. **Feito:** "Alertas de vencimento"; vazio: "Nenhum alerta de vencimento: documentos, padrões e frota em dia."; falha com orientação.
- [P2] "Documentos a vencer" listava 60 dias sem dizer (o card ao lado diz 30). **Feito:** título "Documentos a vencer (60 dias)"; prazo "em 12 dias" em vez de "em 12d".
- [P2] Erro técnico cru na tela ("Não foi possível atualizar a situação da frota. Aba não encontrada: CAD_CONDUTORES"). **Feito:** mensagem orientativa; o detalhe vai para o console.

Fica para a fase 2:
- [P2] **Três blocos falando de vencimento** — card "Vencimentos (30 dias)", tabela "Documentos a vencer (60 dias)" e painel "Alertas de vencimento" no rodapé, com janelas diferentes. **Fazer:** um único bloco "Vencimentos" com abas 30/60 dias e a lista de alertas (documentos, padrões, frota) e remover o círculo grande. *Onde:* JS_Core › `montarDashboardHtml_`, `preencherDashboardDetalhado_`, `carregarAlertasDashboard_`; SGO_Main.js › `obterDashboardDetalhado` (30 e 60 dias fixos).
- [P2] **Ação administrativa no alto do Início** — o farol de conduta do ADMIN traz o botão verde "Aplicar agora: fechamentos pendentes e ajustes do programa" como primeira coisa da tela. Ação de manutenção do programa não é o assunto do Início. **Fazer:** virar item da faixa "o que depende de você hoje" (rótulo "Conduta", título "Fechamento do mês pendente", ação abrir Conduta › Fechamentos) e o card do farol ficar só informativo. *Onde:* JS_Conduta/JS_Core › `Conduta_montarFarolCardHtml_`; SGO_Inicio.js › `Inicio_apiPendencias`.
- [P3] **Gráficos vazios sem mensagem** — "Equipamentos por tipo" fica um quadro em branco e "Documentos por mês" mostra eixo 0–1 sem barras quando não há dados. **Fazer:** mensagem "Sem equipamentos cadastrados" / "Nenhum documento nos últimos 12 meses" no lugar do gráfico. *Onde:* JS_Core › `preencherDashboardDetalhado_`.
- [P3] **"Clientes recentes" para o ADMIN** tem pouco valor diário. **Fazer:** trocar por "Últimos certificados emitidos" ou "O.S. abertas no Auvo" (já existe a seção Auvo escondida `dashcAuvoSecao`).
- [P3] Chip "Alertas críticos" repete o painel de alertas. **Fazer:** levar "Unidades" para os cartões de números e apagar a linha de chips.

### 1.5 Celular (390 px)

Corrigido:
- [P1] **Atalho "Planejamento CME" na tela inicial do celular abria "disponível apenas na versão para computador"** — item morto na primeira tela. **Feito:** removido da grade (JS_Core › `renderMobileHome_`).
- [P2] **Tela inicial com título "Menu" e botão "← Voltar" sem destino.** **Feito:** título "Início", botão Voltar escondido só na tela inicial.
- [P2] **Barra do topo mostrava "Menu" em telas sem título próprio** (Atividades da equipe, Configurações...). **Feito:** `abrir()` põe na barra o nome do item do menu; as telas com título próprio continuam sobrescrevendo.
- [P2] **Configurações (Administração) abria a página inteira de computador no celular.** **Feito:** mostra a mesma mensagem "disponível apenas na versão para computador" dos demais recursos avançados.
- [P3] **A mensagem "disponível apenas na versão para computador" não dizia o que fazer.** **Feito:** "Abra o SGO+ num computador para usar esta tela." e botão "Voltar ao Início" (JS_Core › `renderMotorModulo_`).
- [P3] Títulos "Retirar Veículo" / "Devolver Veículo" em Caixa Alta de Título — **Feito:** "Retirar veículo" / "Devolver veículo".
- [P2] **A lupa do celular oferecia todas as telas do menu**, e escolher uma sem versão de celular levava a "disponível apenas na versão para computador". **Feito:** no celular a busca de telas só oferece as que têm tela própria (`MENU_TELAS_CELULAR` em JS_Inicio; manter igual à grade de `renderMobileHome_`).

Fica para a fase 2:
- [P3] **Janela entre 600 e 900 px no computador (sem modo celular)** — o menu vira uma faixa com os 31 botões soltos no topo. **Fazer:** manter o menu recolhível também nessa faixa. *Onde:* UI_Estilos › `@media (max-width: 900px)` (`.sidebar`).

### 1.6 Problemas globais que se repetem nos módulos (fase 2)

- ~~[P2] **Título duplo em quase todos os módulos**~~ — o casco mostra o título da página (H2 com ponto verde e botão "Atividades do módulo") e o módulo repete outro cabeçalho logo abaixo (H1 "Autoclave" com relógio e "Pronto"; H1 "Certificado de Calibração"; "Integração Auvo — Manual do Operador"...). **Fazer:** manter só o cabeçalho do casco; no módulo, tirar o H1/cartão de cabeçalho e levar o botão "Manual do Operador" para o lado de "Atividades do módulo". Detalhes por módulo nas seções abaixo. **Feito na fase 2 (78a0405) nos módulos de calibração e documentos técnicos** (Certificado, Padrões, Relatório de calibração, Declaração, QI/QO/QD, NR-13, PGT/POP, Planejamento CME, Cronograma, Registros, Inventário): o cabeçalho interno some e "Manual do operador" vai para a barra do casco (JS_Core › `SGO_cascoAjustar_`). Qualificação, Frota, Auvo, Qualidade e Conduta ficam com as outras frentes.
- [P2] **Manual do Operador montado dentro da página** em ~12 módulos (o texto inteiro fica no HTML, escondido ou embaixo do formulário). **Fazer:** abrir o manual em painel lateral ou nova aba, carregado só ao clicar.
- ~~[P2] **"Atividades do módulo" aparece em telas onde não faz sentido**~~ (Configurações, Chaves e senhas). **Fazer:** lista de exceções em `Atividades_aoAbrirModulo_` (JS_Atividades). **Feito na fase 2 (78a0405).**
- ~~[P3] **Títulos de seção em CAIXA ALTA**~~ em quase todos os formulários ("1. CLIENTE", "DADOS DO RELATÓRIO DE AUTOCLAVE"), misturados com seções em caixa normal na mesma tela ("2. Equipamento"). **Fazer:** padronizar em maiúscula só na primeira palavra, via estilo, sem mexer em texto. **Feito na fase 2 (78a0405):** rótulos e títulos de seção sem caixa alta forçada no estilo global (UI_Estilos) e nos módulos técnicos.
- ~~[P2] **Vínculos abre por cima da última tela**~~ e o menu marca "Vínculos" como ativo; ao fechar, o menu continua marcando Vínculos sobre outra página. **Fazer:** ao fechar o painel, devolver o destaque ao item da página de baixo. *Onde:* JS_Vinculos › fechamento do painel, chamando `Menu_aoAbrirModulo_`. **Feito na fase 2 (78a0405).**

## 2. Qualificação (Autoclaves, Lavadoras, Cadeia de frio, Estufa/Banho-maria/Secadora)

Os quatro módulos repetem o mesmo padrão herdado dos sistemas avulsos:
- um segundo cabeçalho dentro da tela, com título, subtítulo, relógio e um selo "Pronto" que não muda;
- textos de Google Docs, Drive, planilha Google, template e placeholder;
- o botão "Relatório interno" (dados reconstituídos, com senha) como o mais destacado da tela;
- erro de geração escondido no histórico, no pé de uma página de cerca de 4.000 px.

**Conferido no código:** "Preencher modelo" (Autoclave e Lavadora) chama por proxy o antigo webapp avulso (`SGO_TemplateAutoclave.js` / `SGO_TemplateLavadora.js`). No servidor novo esse webapp roda dentro do próprio servidor (`sgo_servidor/src/servicos/modelos.ts`) e grava em disco (`compat/drive.ts`, `compat/documento.ts`). Não há mais "Google Docs" nem "Drive".

Contagem: 33 itens (P1 6, P2 18, P3 9).

### Casco e cabeçalho interno (os 4 módulos)
- ~~[P2] **Título duplicado.**~~ — **feito em a0b91b7: o cabeçalho interno (H1, subtítulo, relógio e selo) saiu dos 4 módulos e do "Preencher modelo"; o manual foi para a barra do casco (Cadeia de frio e Estufa) e a norma da Cadeia de frio foi para o subtítulo do casco.**
  - O casco mostra o H2 "Autoclaves" com subtítulo, e logo abaixo o módulo repete o H1 "Autoclave" com outro subtítulo.
  - Lavadoras tem três subtítulos diferentes: casco, Preencher modelo e Gerar relatório.
  - **Fazer:** remover o `header-card` interno (h1 e subtítulo) e manter só o casco. Se a norma precisar aparecer (por exemplo "ABNT NBR 16328:2023, Anexo G" na Cadeia de frio), ela vai para o subtítulo do casco.
  - *Onde:* `JS_TemplateAutoclave.html › header-card (tplAppTitle)`, `JS_TemplateLavadora.html › tplLavAppTitle`, `SGO_AutoRel/LavRel/CadeiaFrioRel/EstufaBanhoRel_ConteudoModulo.js › <h1>`; subtítulos do casco em `JS_Core.html › renderMotorModulo_`.
  - (Captura: autoclave_preencher_1440.png, estufa_topo_1440.png)
- ~~[P2] **Relógio duplicado.**~~ — **feito em a0b91b7: relógio removido (Autoclave, Lavadora e "Preencher modelo").** A barra superior já mostra data e hora, e o módulo mostra um segundo relógio em formato diferente.
  - **Fazer:** remover o relógio do módulo.
  - *Onde:* `tplClockWidget` + `setInterval` (Template Autoclave/Lavadora); `atualizarClockEStatus` (AutoRel/LavRel).
- ~~[P1] **O selo "Pronto" engana.**~~ — **feito em 0d26929 + a0b91b7: o erro aparece na faixa vermelha do topo (pente fino) e o selo saiu com o cabeçalho; erro escrito no histórico também vai para a faixa.** Depois de uma falha ao gerar, o selo continua verde "Pronto" e a página não rola. A mensagem só entra no "Histórico da operação", cerca de 3.000 px abaixo, e o operador acha que deu certo.
  - **Fazer:** remover o selo e mostrar o erro numa faixa logo acima do botão clicado, dizendo o que falta e em qual seção (ex.: "Falta o arquivo do registrador: seção 4, Arquivo do registrador"). Rolar a página até a faixa.
  - *Onde:* `setStatusBadge` / `writeLog` dos 4 ConteudoModulo.
  - (Captura: autoclave_relatorio_1440.png)
- ~~[P3] Menu "Autoclave" × título "Autoclaves"; "Cadeia de Frio" com maiúscula~~ — **corrigido nesta rodada** (menu e casco). Falta tirar o H1 interno (item acima).
- ~~[P3] Celular sem saída ("disponível apenas na versão para computador")~~ — **corrigido nesta rodada**: a mensagem orienta abrir no computador e tem o botão "Voltar ao Início".

### Autoclaves › Preencher modelo
- ~~[P2] **Botão "Carregar Exemplo" em produção.**~~ — **feito em a0b91b7: botão e função de exemplo removidos.** Preenche dados fictícios ("Hospital Exemplo Ltda."), e um clique a mais em Gerar produz um relatório falso.
  - **Fazer:** remover o botão e `tplAutoclave_preencherExemplo`.
  - *Onde:* `JS_TemplateAutoclave.html › .action-bar`.
- ~~[P2] **"Gerar Google Docs + PDF" / "Abrir Google Docs" / "pasta configurada".**~~ — **feito em 0d26929 + a0b91b7: "Gerar documento e PDF", "Abrir documento", "Abrir PDF", "Abrir pasta do cliente" e o subtítulo pedido.**
  - **Fazer:** botão "Gerar documento e PDF"; links "Abrir documento", "Abrir PDF" e "Abrir pasta dos relatórios"; subtítulo "Preencha os campos para gerar o relatório no modelo oficial."
  - *Onde:* `tplBtnGerarLabel`, `tplAutoclave_setLoading`, `tplDocLink`, `.panel-subtitle`.
- ~~[P2] **Jargão "template/placeholders".**~~ — **feito em a0b91b7: bloco de placeholders e cartões removidos; ajuda "Aparece no relatório e no nome do arquivo".** Aparece em "PLACEHOLDERS DO TEMPLATE", "valide o template", "substitui os placeholders rastreados".
  - **Fazer:** remover o bloco "Placeholders do template" e o cartão que explica a cópia do template. Trocar "Usado no template e no nome final do arquivo" por "Aparece no relatório e no nome do arquivo".
  - *Onde:* `.terminal-header`, `.card-note`, `tplAutoclave_renderPlaceholders`.
- ~~[P3] **Chip técnico `RELATORIO_AUTOCLAVE_NUMERO_CLIENTE_DATA`.**~~ — **feito em a0b91b7: chip removido.**
  - **Fazer:** remover o chip e deixar só a frase. *Onde:* `.tpl-code-chip`.
- ~~[P2] **Erro cru do proxy**~~ — **feito em a0b91b7: a aba não chama mais o aplicativo antigo; erro com orientação (ver "Preencher modelo no servidor", abaixo).** ("Erro ao chamar Template Autoclave: <mensagem técnica>").
  - **Fazer:** "Não foi possível ler o modelo do relatório. Tente de novo em alguns minutos; se continuar, avise o administrador."
  - *Onde:* `SGO_TemplateAutoclave.js › chamarProxy_` (e o mesmo em `SGO_TemplateLavadora.js`).
- ~~[P3] **"Status final" com opções "APROVADO/REPROVADO".**~~ — **feito em a0b91b7: rótulo "Resultado", opções "Aprovado"/"Reprovado" (valor gravado igual) e sem valor pré-escolhido.**
  - **Fazer:** rótulo "Resultado"; opções "Aprovado" / "Reprovado" (o valor gravado continua o mesmo). *Onde:* `tplStatus`.
- ~~[P2] **Data do ciclo em texto livre**~~ — **feito em a0b91b7: máscara DD/MM/AAAA, validação de data real e a ajuda pedida.** ("Informe como deseja que apareça no relatório").
  - **Fazer:** campo com máscara DD/MM/AAAA e a ajuda "Data em que o ciclo foi executado". *Onde:* `tplData`.

### Autoclaves e Lavadoras › Gerar relatório
- ~~[P1] **"Relatório interno" em destaque e senha à mostra.**~~ — **feito em 0d26929 + a0b91b7: botão só para Admin e senha mascarada (pente fino); a opção saiu do seletor "Como enviar os dados" para os demais perfis nos 4 módulos.**
  - É o botão mais forte da tela (marrom cheio; verde nos módulos vizinhos).
  - A senha é pedida por `window.prompt`, que mostra o que se digita.
  - A mesma opção aparece para qualquer perfil no seletor "Modo de leitura".
  - **Fazer:**
    - mostrar o botão só para Admin, em estilo secundário, no fim da tela;
    - trocar o `prompt` por um modal com campo de senha mascarado, com a mensagem de erro "Senha incorreta. Peça a senha ao administrador." e o botão Cancelar;
    - tirar a opção do seletor.
  - *Onde:* `tplAutoRel_btnRelatorioInterno`, `ativarModoSimuladoAdmin`, `configurarModoEntrada` (AutoRel e LavRel).
- ~~[P2] **Textos do Google desatualizados.**~~ — **feito em 0d26929.** "Ler por ID / Link do Google Sheets (Recomendado)", "enviado para a pasta do Drive", "Cole o ID da Planilha Google", "Verifique o Config.gs".
  - **Fazer:**
    - opção "Arquivo do registrador (enviado ou já na pasta)";
    - alerta "A pasta ainda não está configurada. Avise o administrador (Administração › Configurações)."
  - *Onde:* `configurarModoEntrada`, `abrirLinkPasta`, `boxUpload`.
- ~~[P1] **Lavadora sem acentos.**~~ — **feito em 0d26929.** "CLIENTE / INSTITUICAO", "CICLO N", "LOCALIZACAO (SETOR)", "PARAMETROS DE PROCESSO E RECEITA", "TEMP. ALVO DA RECEITA (C)", "20C a 100C", "ROBUSTEZ DA DETECCAO DA EXPOSICAO", "TOLERANCIA", "inicio", "Mantem", "oscilacoes", "Ponto e Virgula".
  - **Fazer:** corrigir para "Cliente / instituição", "Ciclo nº", "Localização (setor)", "Parâmetros de processo e receita", "Temp. alvo da receita (°C)", "20 °C a 100 °C", "início", "Mantém", "oscilações", "Ponto e vírgula".
  - *Onde:* `SGO_LavRel_ConteudoModulo.js`.
  - (Captura: lavadora_relatorio_1440.png)
- ~~[P2] **Decimal com ponto**~~ — **feito em 0d26929 + a0b91b7: "134,0 °C" (pente fino) e "Temperatura programada".** ("134.0 °C").
  - **Fazer:** "134,0 °C" e trocar "Setpoint" por "Temperatura programada". *Onde:* `SGO_AutoRel_ConteudoModulo.js › <option>`.
- ~~[P2] **Inglês e jargão.**~~ — **feito em a0b91b7: "Teste de estanqueidade", "Correção de temperatura (°C)", "Identificação do registrador", "Dados do registrador", "Prévia dos dados lidos", sem "(Beta)".** "LEAK TEST", "OFFSET", "DTL", "Ingestão de dados do logger", "PREVIEW TÉCNICO DOS DADOS", "(BETA)".
  - **Fazer:** "Teste de estanqueidade", "Correção de temperatura (°C)", "Identificação do registrador", "Importação dos dados do registrador", "Prévia dos dados lidos", e tirar "(BETA)".
- ~~[P2] **Numeração quebrada.**~~ — **feito em a0b91b7: Autoclave e Lavadora com 1 Cliente e ensaio, 2 Equipamento, 3 Parâmetros, 4 Dados do registrador, 5 Interpretação técnica; ajustes avançados (correções, detecção da exposição e janela manual) recolhidos num bloco próprio.** No Autoclave só a primeira seção tem número; a Lavadora não tem nenhuma; Cadeia de frio e Estufa numeram de 1 a 6.
  - **Fazer:** 1 Identificação, 2 Parâmetros, 3 Dados do registrador, 4 Gerar relatório, 5 Interpretação técnica.
- ~~[P2] **"Operador logado no sistema" digitado à mão.**~~ — **feito em a0b91b7: preenchido com o usuário da sessão, sem edição; rótulo "Operador".**
  - **Fazer:** preencher sozinho com o usuário da sessão, sem permitir edição; rótulo "Operador".
- ~~[P2] **Caixa explicativa da IA com 5 linhas em tom de conversa.**~~ — **feito em a0b91b7: texto pedido nos 4 módulos.**
  - **Fazer:** "Documento complementar com a interpretação técnica deste ciclo. Os textos de análise e conclusão são redigidos por IA a partir dos números calculados; revise antes de confirmar." (vale para os 4 módulos).
- ~~[P3] **Histórico com título duplicado e cerca de 700 px vazios.**~~ — **feito em a0b91b7: virou "Detalhes técnicos da operação", recolhido, com altura limitada; erro aparece também na faixa do topo.**
  - **Fazer:** remover o cabeçalho interno e limitar a altura, com rolagem.
- ~~[P3] **Mensagens com ponto duplo**~~ — **feito em 0d26929.** ("…faça o upload do arquivo.. Confira…").
  - **Fazer:** não acrescentar ponto quando a mensagem já termina em ponto; "envie o arquivo" no lugar de "faça o upload". *Onde:* `normalizarErro_`.
- ~~[P2] **Alarme sonoro de ociosidade só em Autoclave e Lavadora**~~ — **feito em a0b91b7: alarme e cronômetro do módulo desligados (Autoclave e Lavadora).** ("bip estridente" depois de 5 min). O cronômetro é global e pode continuar contando fora do módulo; confirmar em teste.
  - **Fazer:** remover o alarme. Se o aviso ficar, parar o cronômetro ao sair do módulo.
  - *Onde:* `tocarBipEstridente`, `IDLE_LIMIT`.

### Lavadoras › Preencher modelo
- ~~[P2] **"Exemplo Lavadora" / "Exemplo Termodesinfectora"**~~ — **feito em a0b91b7: exemplos removidos; "Limpar campos" junto do botão de gerar.** são os únicos botões da barra de ações.
  - **Fazer:** remover os dois e pôr "Limpar campos" na barra. *Onde:* `JS_TemplateLavadora.html`, linhas 110-111.
- ~~[P2] **"Gerar Lavadora" / "Gerar Termodesinfectora"**~~ — **feito em a0b91b7: "Gerar relatório da lavadora ultrassônica" / "Gerar relatório da termodesinfectora".** não dizem o que sai.
  - **Fazer:** "Gerar relatório da lavadora ultrassônica" / "Gerar relatório da termodesinfectora".
- ~~[P2] **Jargão: "Módulo ativo", "Google Docs", "PLACEHOLDERS DO MÓDULO ATIVO".**~~ — **feito em a0b91b7: subtítulo e mensagem pedidos; bloco de placeholders removido.**
  - **Fazer:** subtítulo "Escolha o tipo de equipamento e preencha os dados para gerar o relatório."; mensagem "Equipamento selecionado: Termodesinfectora."; remover o bloco de placeholders.
- ~~[P3] **Os dois formulários não batem**~~ — **feito em a0b91b7: um formulário só para os dois tipos (Tipo de equipamento em lista), com Marca, Modelo e Nº de série separados, "Tipo de ensaio" em lista e "Resultado" nos dois.** (Marca/Modelo/NS juntos num e separados no outro; "Resultado" só num).
  - **Fazer:** usar os mesmos campos e rótulos nos dois, com "Tipo de ensaio" como lista.
- ~~[P3] **Divisor "TERMODESINFECTORA" repete a aba.**~~ — **feito em a0b91b7: divisor removido (as abas viraram a lista "Tipo de equipamento").** **Fazer:** remover. (Captura: lavadora_preencher_1440.png)

### Cadeia de frio
- ~~[P1] **Identificador interno no rótulo:**~~ — **feito em 0d26929.** "RESPONSÁVEL PELO ACEITE (TPLCADEIAFRIOREL_CLIENTE)". É uma troca de prefixo que atingiu a palavra "cliente".
  - **Fazer:** "Responsável pelo aceite (cliente)", e procurar outros "(tplCadeiaFrioRel_" no mesmo arquivo.
  - *Onde:* `SGO_CadeiaFrioRel_ConteudoModulo.js › label for="tplCadeiaFrioRel_certResponsavelAceite"`.
  - (Captura: cadeiafrio_secao6_1440.png)
- ~~[P1] **"Relatório interno" como botão principal verde e senha em `prompt`.**~~ — **feito em 0d26929 + a0b91b7: botão discreto, à direita, só para Admin.**
  - **Fazer:** o mesmo do Autoclave. (Captura: cadeiafrio_topo_1440.png)
- ~~[P2] **"Limpar histórico" ao lado de "Gerar Relatório"**~~ — **feito em a0b91b7: virou o link "Limpar detalhes" dentro de "Detalhes técnicos da operação".**, sem confirmação.
  - **Fazer:** levar para dentro do bloco "Histórico da operação", como link pequeno.
- ~~[P2] **Nomes de documento desencontrados.**~~ — **feito em a0b91b7: "Relatório de dados (planilha)" com a ajuda pedida e "Certificado de qualificação térmica" (Cadeia de frio e Estufa); Autoclave e Lavadora com "Gerar relatório de dados (planilha)". A "Interpretação técnica" da Autoclave/Lavadora manteve o nome, porque é outro documento.** A Cadeia de frio fala em "Relatório em Planilha" e "Certificado"; o Autoclave, em "Relatório de Auditoria" e "Interpretação Técnica".
  - **Fazer:** nos 4 módulos, "Relatório de dados (planilha)" e "Certificado de qualificação térmica", com a ajuda "Gera a planilha com gráficos, estatísticas e veredito de cada estudo."
- ~~[P2] **Ajuda da rampa longa e informal**~~ — **feito em a0b91b7: texto pedido (Cadeia de frio e Estufa).** ("…então dá pra conferir sem depender do log").
  - **Fazer:** "Preencha só se o equipamento começou fora da faixa. Leituras antes deste horário aparecem no gráfico, mas não contam para o veredito." (igual na Estufa).
- ~~[P2] **Textos de Drive na seção 4.**~~ — **feito em a0b91b7: "Arquivo do registrador" e a ajuda pedida (Cadeia de frio e Estufa).** "ID / link do arquivo no Drive", "faz upload automático para o Drive".
  - **Fazer:** "Arquivo do registrador"; "Ao escolher o arquivo do computador, ele é enviado e o campo acima é preenchido."
- ~~[P3] **Manual do operador.**~~ — **feito em a0b91b7: "← Voltar ao formulário"; a seção 12 passou a explicar o "Relatório interno"; o "↑ Topo" subiu acima da bolha do chat; o manual cita "Detalhes técnicos" e a faixa de erro.**
  - "← Voltar ao sistema" deve ser "← Voltar ao formulário".
  - Remover a seção 12 "Modo Personalizado", que explica um recurso que não existe neste módulo.
  - Falta uma seção sobre o "Relatório interno".
  - O botão "voltar ao topo" fica embaixo da bolha do chat.
  - (Captura: cadeiafrio_manual_1440.png)

### Estufa, banho-maria e secadora
- ~~[P2] **A ajuda da secadora aparece em todos os perfis.**~~ — **feito em a0b91b7: a ajuda geral dos sensores não fala mais da secadora; a da secadora fica só no bloco dela.**
  - **Fazer:** mostrar só no perfil secadora, dentro do bloco dela na seção 3.
- ~~[P2] **Secadora: "informe 60 nos dois limites".**~~ — **feito em a0b91b7: no perfil secadora a faixa vira "Temperatura de trabalho (°C)" + "Tolerância (± °C)" (o valor vai para os dois limites).**
  - **Fazer:** no perfil secadora, trocar a faixa mínima/máxima por "Temperatura de trabalho (°C)" + "Tolerância (± °C)". (Captura: estufa_secadora_1440.png)
- ~~[P2] **Mensagem cita um estudo que não existe ("Autonomia"), não indica a seção e tem ponto duplo.**~~ — **feito em a0b91b7: texto pedido, sem ponto duplo (prévia e geração).**
  - **Fazer:** "Nenhum estudo selecionado. Na seção 3, escolha Sim em pelo menos um estudo (Distribuição, Abertura de porta ou Queda de energia) e gere de novo."
  - *Onde:* `SGO_EstufaBanhoRel_Main.js`, linha 205.
- ~~[P3] **Ordem dos perfis.**~~ — **feito em a0b91b7: Estufa de Incubação, Banho-maria, Estufa de Esterilização/Despirogenização, Secadora.** A secadora aparece em primeiro, mas o perfil padrão é "Estufa de Incubação".
  - **Fazer:** pôr o perfil padrão em primeiro e os demais em ordem alfabética.
- ~~[P3] **Subtítulos diferentes entre o casco e o cabeçalho interno.**~~ — **feito em a0b91b7: some com o cabeçalho interno.** Some junto com o item do título duplicado.

### Fase 2 — situação e pendências deste bloco (16–17/10, commit a0b91b7)
- **"Preencher modelo" no servidor (Autoclave e Lavadora).** As abas chamavam por UrlFetch o aplicativo antigo do Google (`SGO_CFG.MOTORES.*_TEMPLATE`). No servidor esse caminho depende da pasta `legado_modelos` e do documento-modelo importado; no modo ensaio a chamada é bloqueada, e o banco de desenvolvimento não tem os documentos-modelo. Agora a geração é feita pelo próprio SGO+ (`SGO_TemplateAutoclave.js`, motor `SGO_TPLMODELO`, também usado por `SGO_TemplateLavadora.js`):
  1. se o documento-modelo oficial está no armazenamento do SGO+ (mesmo ID do Google, ou o ID gravado em `TPL_<AUTOCLAVE|LAVADORA|TERMO>_MODELO_ID`), copia, preenche os campos `{{...}}`, salva o documento e o PDF na pasta do cliente (subpasta por CNPJ dentro da pasta de saída do modelo);
  2. se o modelo existe mas este ambiente não abre documentos (Google sem a permissão de Documentos), usa o aplicativo antigo como antes;
  3. sem o modelo, gera a folha de identificação do relatório no modelo padrão do SGO+ (HTML A4 justificado + PDF, mesma pasta) e avisa o motivo e o caminho para voltar ao oficial (pedir ao administrador para importar o documento-modelo).
  A tela mostra, antes de gerar, se o modelo oficial está disponível. Testado no servidor: Autoclave com um documento-modelo de teste (campos preenchidos, PDF de 48 KB) e Termodesinfectora sem modelo (folha padrão + PDF na pasta do cliente).
- **Pendências fora dos arquivos deste bloco (para a frente do núcleo):** `JS_Core › renderMotorModulo_` — subtítulo do casco da Lavadora ainda diz só "termodesinfectoras" (o módulo também cobre lavadora ultrassônica).

### Nota fora do design (para o responsável pela segurança)
- `tplAutoclaveGerarRelatorio(payload)` e o equivalente da Lavadora não chamam `exigirSessao`, ao contrário das outras funções do mesmo arquivo (`SGO_TemplateAutoclave.js`, `SGO_TemplateLavadora.js`).


## 3. Calibração e declarações (Certificado, Padrões de referência, Relatório de calibração, Declaração de execução, Relatório QI/QO/QD)

**Problemas centrais deste bloco:**
- A página do Certificado de calibração junta dois trabalhos. Em cima ficam relatórios gerenciais, controle e orçamento dos padrões e o cadastro dos padrões; embaixo, o formulário de emissão.
- Os mesmos padrões aparecem em duas tabelas, com rótulos de situação diferentes.
- Relatório de calibração, Declaração e Relatório QI/QO/QD repetem os mesmos defeitos: título duplicado, selo "pronto", painel "Histórico da operação" vazio e botão "Salvar no Drive".

Contagem: 36 itens (P1 2, P2 21, P3 13). Desses, 3 já foram corrigidos nesta rodada (menu).

### Proposta: separar "Padrões de referência" do Certificado (ponto central)
O item "Padrões de referência" do menu passa a abrir uma página própria, `abrir('padroes')`. Hoje ele é um atalho que rola a página do Certificado. A página nova teria três abas:

1. **Padrões** (aba inicial):
   - uma lista única, juntando as tabelas `#certcal-panel-padroes` e `#pd-lista`;
   - colunas: Marcar, Padrão, Localização, Identificação, Validade e situação, Certificado (PDF), Ações (Editar, Dados/localização/foto, Inativar);
   - filtros: busca, localização e situação;
   - botão "Cadastrar novo padrão";
   - bloco "Atualizar dados pelos certificados" (hoje "Preparação automática do acervo").
2. **Inventário e orçamento**: trabalha sobre os padrões marcados na aba 1. Reúne Laboratório destinatário, Orientações, Serviços e faixas, "Gerar inventário", "Pesquisar faixas e gerar orçamento" e "Documentos e rascunhos salvos".
3. **Relatórios gerenciais**: "Plano de renovação e auditoria" e "Relatório de desempenho". Os dois tratam de padrões e do laboratório, não de emissão.

O Certificado de calibração fica só com:
- **Emitir certificado**: seções 1 a 6, renumeradas;
- **Certificados emitidos**: a busca por CNPJ que hoje está no topo.

O subtítulo do casco passa a "Emissão do certificado de calibração e consulta dos emitidos." O texto atual está em `JS_Core › renderMotorModulo_`.

*Onde:*
- `SGO_CertCal_ConteudoModulo.js › tplCertCal_renderReal_` (`certcal-panel-relatorios-gestao`, `certcal-panel-padroes`);
- `JS_Padroes_Documentos.html › pdMount`;
- `JS_Core › abrirModulo_` (novo `mod === "padroes"`);
- `Index.html › #menu-btn-padroes` (trocar `Menu_atalho_('padroes')` por `abrir('padroes')`);
- `JS_Inicio › Menu_atalho_`;
- `SGO_Inicio.js` (as pendências de padrão usam `{ tipo: 'atalho', alvo: 'padroes' }`).

### "Técnicos" no menu
- ~~[P1] O item "Técnicos" do menu não fazia nada: rolava até `#certcal-tecnico`, que fica oculto até haver cliente e equipamento.~~ **Corrigido nesta rodada:** item removido.
- **Para o futuro:** o cadastro de técnicos guarda só o nome e não tem tela própria. O Relatório de calibração, a Declaração e o QI/QO/QD usam texto livre. O certo é o seletor listar os usuários com perfil técnico, em vez de manter uma terceira lista de nomes.

### Certificado de calibração › estrutura e atalhos
- ~~[P1] **A página mistura emissão com gestão do laboratório.**~~ **Feito na fase 2 (78a0405):** página própria "Padrões de referência" (`abrir('padroes')`) com as abas Padrões, Inventário e orçamento e Relatórios gerenciais; o Certificado começa em "1. Cliente" e termina em "Certificados emitidos".
  - Antes do "1. Cliente" há quatro painéis de gestão, cerca de 1.400 px na tela de 1440 px.
  - **Fazer:** aplicar a separação proposta acima.
- ~~[P2] **O atalho "Padrões" cai no meio de um painel**~~, entre "Atualizar lista" e o cadastro, porque a página acaba antes. Enquanto isso o título continua "Certificado de calibração". **Fazer:** a página própria. (Captura: certcal_atalho-padroes_1440.png) **Feito na fase 2 (78a0405).**
- ~~[P2] Selo de padrões vencendo no item "Certificado de calibração"~~ — **corrigido nesta rodada:** foi para "Padrões de referência".
- ~~[P2] **Título repetido.**~~ O casco mostra "Certificado de calibração" e o cartão do módulo repete o H1 com outro subtítulo ("…GUM/EA-4/02 + relatório interpretativo…"). **Feito na fase 2 (78a0405).**
  - **Fazer:** remover o `<h1>` do `.header-card` e levar "Manual do Operador" para a barra do casco.

### Certificado › padrões (lista, cadastro e controle)
- ~~[P2] **Mesmo padrão em duas tabelas, com situações escritas de forma diferente.**~~ O THM-900 aparece como "Vence em até 30 dias / Dados pendentes" numa tabela e como "Vencendo" na outra. Os rótulos vêm de dois dicionários. **Feito na fase 2 (78a0405):** uma lista só (com Editar, Inativar e PDF) e o vocabulário Vigente / Vence em até 30 dias / Vencido / Sem validade informada / Data inválida.
  - **Fazer:** uma lista só e um único vocabulário: "Vigente", "Vence em até 30 dias", "Vencido", "Sem validade informada", "Data inválida".
  - *Onde:* `JS_Padroes_Documentos.html › pdSituacao/pdList`; `CERTCAL_STATUS_VALIDADE_LABELS_`, `tplCertCal_renderPadroesTabela_`.
  - (Captura: certcal_padroes-duas-listas_1440.png)
- ~~[P2] **A orientação manda cadastrar "acima", mas o cadastro fica abaixo.**~~ **Feito na fase 2 (78a0405).**
  - **Fazer:** "Nenhum padrão neste filtro. Use 'Cadastrar novo padrão' ou limpe a busca." *Onde:* `pdList`.
- ~~[P2] **"Inativar" age na hora, sem confirmação**~~, e o padrão some do seletor dos ensaios. **Feito na fase 2 (78a0405).**
  - **Fazer:** perguntar antes: "Inativar o padrão THM-900? Ele deixa de aparecer na escolha de padrões dos ensaios; o histórico é mantido e você pode reativá-lo depois."
  - *Onde:* `tplCertCal_inativarPadrao`.
- ~~[P2] **Alerta vermelho para padrão ainda vigente.**~~ "Vencendo em 25 dias" aparece igual a vencido. **Feito na fase 2 (78a0405).**
  - **Fazer:** separar por gravidade. Vermelho: "Padrões vencidos ou com data inválida — não use em certificado até atualizar a validade." Amarelo: "1 padrão vence nos próximos 30 dias." O selo "VENCIDO" passa a "Vencido".
- ~~[P3] **Seletor de arquivo nativo em cada linha**~~, em fonte de 10 px. **Fazer:** botão "Anexar PDF" ou "Substituir PDF". **Feito na fase 2 (78a0405).**
- ~~[P3] **Linguagem informal no rótulo**~~ "(PDF, opcional — pra consulta futura)". **Fazer:** "(PDF, opcional)". **Feito na fase 2 (78a0405).**
- ~~[P3] **Inglês e códigos crus.**~~ "setpoints", "INVENTARIO · EMITIDO", "Baixar HTML A4". **Feito na fase 2 (78a0405).**
  - **Fazer:** "pontos de ajuste", "Inventário · Emitido", "Imprimir / salvar PDF".

### Certificado › formulário de emissão
- ~~[P2] **A numeração pula o 4**~~ (1, 2, 3, 5, 6, 7, 8) e não bate com o manual nem com o celular ("Passo X de 7"). **Feito na fase 2 (78a0405) no computador e no manual** (1 Cliente … 6 Gerar). Falta alinhar o celular ("Passo X de 7").
  - **Fazer:** renumerar como 1 Cliente, 2 Equipamento, 3 Dados da calibração, 4 Ensaios, 5 Fotos, 6 Gerar, e alinhar o manual e o celular.
  - *Onde:* `tplCertCal_renderReal_`, `tplCertCal_manualHtml_`, `JS_Core › mobileCertCalPasso_`.
  - (Captura: certcal_formulario-secoes_1440.png)
- ~~[P2] **"6. Avaliação pelo cliente" é uma seção sem nada para preencher.**~~ No celular vira um passo inteiro só com texto. **Feito na fase 2 (78a0405) no computador** (virou nota em "6. Gerar"). O passo do celular continua.
  - **Fazer:** virar uma nota dentro de "Gerar" e retirar a seção e o passo.
  - *Onde:* `#certcal-panel-responsabilidade`, `renderMobileCertCalVeredito_`.
- ~~[P2] **Mensagens dizem "salvo no Drive".**~~ **Feito na fase 2 (78a0405).**
  - **Fazer:** "Certificado nº X emitido e salvo no SGO+ — aberto em nova aba."
- ~~[P2] **"Remover bloco" e "Remover" (ponto) apagam dados sem confirmar.**~~ **Feito na fase 2 (78a0405).**
  - **Fazer:** se houver valores digitados, perguntar "Remover o bloco … e os N pontos digitados?".
- ~~[P3] **CAIXA ALTA até em opções de rádio.**~~ **Fazer:** tirar o `text-transform` de `.checkbox-row label`. **Feito na fase 2 (78a0405).**
- ~~[P3] **Nome da empresa grafado "Metrolab's"**~~ no Certificado, Relatório de calibração, Declaração, QI/QO/QD e nos manuais. **Fazer:** "Realizado no laboratório da Metrolabs". **Feito na fase 2 (78a0405).**
- [P3] **O cadastro de equipamento novo continua aberto depois de escolher um existente.** **Fazer:** recolher atrás de "+ Cadastrar equipamento novo".

### Certificado › Manual do operador
- [P2] **O manual não cobre metade da página** (controle de padrões, inventário, orçamento, relatórios gerenciais) e usa "Dashboard", "upload" e "pra sempre".
  - **Fazer:** dividir em "Manual — Emissão de certificado" e "Manual — Padrões", em português.

### Certificado › celular (390 px)
- ~~[P2] **No celular o padrão aparece só pela TAG, sem situação de validade.**~~ O técnico pode marcar um padrão vencido sem aviso. **Feito na fase 2 (78a0405):** selo de situação e validade em cada padrão; vencido na data da calibração ou com data inválida fica bloqueado, com o motivo e onde corrigir.
  - **Fazer:** mostrar o selo de situação ao lado da TAG e bloquear padrão vencido.
  - *Onde:* `JS_Core › mobileCertCalEditarBloco_`.
- [P2] **Local da calibração com padrão diferente** (computador "laboratório", celular "no cliente").
  - **Fazer:** decidir um padrão e mostrar a escolha no resumo do passo final.
- [P2] **No celular o certificado é emitido sem ver os resultados** (não há "Calcular").
  - **Fazer:** no passo Gerar, chamar `apiCalcularPreview` e mostrar a tabela resumida por bloco. *Onde:* `renderMobileCertCalGerar_`.
- [P3] **CNPJ sem máscara na lista de clientes do celular.** *Onde:* `mobileCertCalBuscarCliente_`.

### Relatório de calibração
- ~~[P2] **Título duplicado e selo "pronto".**~~ **Fazer:** remover o H1 do `.header-card` e o `#tplRelCal_statusBadge`. (Captura: relcal_pagina_1440.png) **Feito na fase 2 (78a0405).**
- ~~[P2] **"Histórico da operação" é um registro técnico vazio**~~, com título duplicado e cerca de 300 px. **Fazer:** remover, ou trocar por "Detalhes técnicos da última geração" recolhido. **Feito na fase 2 (78a0405):** virou "Detalhes técnicos da operação", recolhido; erro ou aviso aparece numa faixa visível (vale para os módulos técnicos).
- [P2] **O documento só fica guardado se o operador clicar "Salvar no Drive".** Fechar a aba perde a cópia.
  - **Fazer:** salvar automaticamente na pasta do cliente ao gerar e mostrar "Relatório salvo no SGO+ (pasta do cliente)".
- [P2] **Técnico em texto livre**, diferente do Certificado. **Fazer:** a mesma fonte de técnicos nos quatro módulos.
- [P3] **Máscara "dd/MM/aaaa"**, também na Declaração e no QI/QO/QD. **Fazer:** "dd/mm/aaaa".
- [P3] **Divisor e rótulo repetem o mesmo texto** ("NÚMERO DO DOCUMENTO" seguido de "NÚMERO DO DOCUMENTO (OPCIONAL — NÃO É UMA DATA)"). **Fazer:** deixar só o rótulo.
- [P3] **Manual com "dropdown", "slots", "upload" e uma nota interna** ("tal como implementado em 2026-07-27…"). **Fazer:** traduzir os termos e remover a nota.

### Declaração de execução
- ~~[P2] **Mesmos defeitos do Relatório de calibração:**~~ título duplicado, "pronto", histórico vazio e "Salvar no Drive". *Onde:* `TPL_DECLEXEC_HTML_` e manual. **Feito na fase 2 (78a0405)**, exceto salvar sozinho: o botão passou a "Salvar na pasta do cliente".
- [P3] **Botão "Gerar Declaração com IA" e "EXECUÇÃO" em caixa alta no meio do texto.**
  - **Fazer:** botão "Gerar texto da declaração para revisão"; texto "Descreva o que foi feito. Este documento registra a execução do serviço, sem aprovação ou reprovação."
- [P3] **Dica longa no número do documento.** **Fazer:** "Código interno do documento, se houver. A data já sai no documento."

### Relatório de qualificação (QI/QO/QD)
- [P2] **O nome do documento muda de um lugar para outro.** O menu diz "QI/QO/QD", a seção 3 diz "QI/QO" (mas contém a QD) e os botões dizem "Relatório de QI/QO".
  - **Fazer:** seções "3. Qualificação de instalação (QI)", "4. Qualificação de operação (QO)", "5. Qualificação de desempenho (QD)", "6. Revisão"; botões "Gerar textos para revisão" e "Confirmar e gerar relatório de qualificação".
- ~~[P2] **Lista de verificação inteira em CAIXA ALTA**~~, com frases de 3 a 4 linhas. **Fazer:** tirar o `text-transform` de `.check-grid`. (Captura: qiqo_checklist-caixa-alta_1440.png) **Feito na fase 2 (78a0405).**
- ~~[P2] **Mesmos defeitos do Relatório de calibração.**~~ **Feito na fase 2 (78a0405)**, exceto salvar sozinho.
- [P3] **Tom de propaganda** ("texto extenso e tecnicamente rico") e fonte de terminal nas caixas de texto.
  - **Fazer:** "Marque os itens verificados neste atendimento; o texto de cada seção é gerado para revisão antes de emitir."; usar a fonte padrão.


## 4. Documentos técnicos (PGT e POP, Planejamento CME, Cronograma de execução, Registros operacionais, Laudo NR-13, Inventário de equipamentos)

Cada um dos seis módulos funciona do seu jeito. Variam o padrão de etapas, os nomes dos botões, o uso de "hospital" ou "cliente", a caixa dos títulos, o lugar do histórico, a forma de consultar o que já foi gerado e a forma de salvar.

O que vale para todos:
- todos repetem o título do casco;
- todos falam em "Drive", embora os arquivos fiquem no servidor próprio;
- em 390 px, todos mostram apenas "disponível apenas na versão para computador".

O ambiente de teste não tem a chave da IA. Por isso as etapas finais de geração foram avaliadas pelo código e pelas mensagens de erro.

Contagem: 52 itens (P1 9, P2 28, P3 15). Desses, 2 já foram corrigidos nesta rodada (destaque do NR-13 no menu e a mensagem do celular).

### PGT e POP
- ~~[P2] **Título duplicado.**~~ **Feito na fase 2 (78a0405).**
  - **Fazer:** remover o `header.header-card` e levar o "Manual do Operador" para o casco.
  - Subtítulo do casco: "Gera o PGTS e os POPs personalizados para cada cliente."
  - *Onde:* `SGO_PgtPop_ConteudoModulo.js › TPL_PGTPOP_HTML_`.
- [P3] **Sigla dupla (PGT e PGTS) e "no padrão real da Metrolabs".**
  - **Fazer:** usar uma sigla só e tirar a expressão de propaganda.
- [P2] **"Avançar" não confere nada, e o erro só aparece no fim, no histórico.**
  - **Fazer:** conferir razão social, responsável técnico e "Elaborado por" no "Avançar" da etapa 1, com a mensagem ao lado do botão.
  - No "Gerar Tudo", mostrar um alerta no resumo com o link "Ir para a etapa 1".
  - (Captura: pgtpop_gerar-erro-so-no-historico_1440.png)
- [P2] **O manual põe "Elaborado por" na etapa 2, mas o campo fica na etapa 1.** *Onde:* `#tplPgtPop_ms4`, `#tplPgtPop_ms8`.
- [P3] **Nome de pessoa escrito direto no texto de ajuda** ("Charles Hytley…") e "ESTE" em caixa alta.
  - **Fazer:** "O campo 'Revisado por' sai automaticamente com o responsável técnico da Metrolabs", com o nome vindo da configuração.
- [P3] **Catálogo de 28 POPs em CAIXA ALTA e "até 4+ imagens".**
  - **Fazer:** nomes em caixa normal e a frase "Cada POP aceita um roteiro e imagens opcionais."
- ~~[P2] **"Salvar no Drive" / "salvo no Drive".**~~ **Feito na fase 2 (78a0405) na tela e no manual.**
  - **Fazer:** "Salvar PDF na pasta do cliente" / "PDF salvo na pasta do cliente". Corrigir também o manual.
- [P2] **"Salvar no Drive" exige "Abrir" antes.**
  - **Fazer:** salvar o PDF ao gerar e remover o botão.
- [P3] **"Gerar Tudo" / "Ver Documentos".**
  - **Fazer:** "Gerar todos os documentos" / "Ver documentos gerados".
- ~~[P3] **Histórico com título duplo, "Log limpo" e hora sem pt-BR.**~~ **Feito na fase 2 (78a0405)** em PGT/POP, Registros, Planejamento CME, Cronograma e NR-13.
  - **Fazer:** um título só, "Histórico limpo." e `toLocaleTimeString('pt-BR')`. Vale também para Registros operacionais, Planejamento CME e NR-13.

### Planejamento CME
- ~~[P2] **Título duplicado, com o sobrenome "METROLABS CME".**~~ **Feito na fase 2 (78a0405).**
  - **Fazer:** remover o `.topo`. Subtítulo: "Quantitativo de insumos e planejamento da qualificação de equipamentos da CME".
  - (Captura: plancme_titulo-duplicado-sem-etapas_1440.png)
- [P2] **Não tem a faixa de etapas que os outros módulos têm.**
  - **Fazer:** acrescentar "1. Cliente · 2. Equipamento · 3. Escopo contratado · 4. Receitas · 5. Resultado".
- [P2] **Campos marcados com * não são conferidos, e os erros chegam por `alert()` só no fim.**
  - **Fazer:** conferir no "Próximo" de cada etapa e mostrar a mensagem abaixo do campo.
- [P2] **"Tipo de equipamento" fica fixo em "Autoclave", mesmo quando o processo é de lavadora.**
  - **Fazer:** derivar o tipo do processo escolhido.
- [P3] **Fabricante na lista de processos ("Brasmedical", "Sanders")**, e o nome vai para o WhatsApp.
  - **Fazer:** confirmar com o dono; no documento e na mensagem, usar o nome genérico.
- [P3] **"O que foi vendido?"** **Fazer:** "3. Escopo contratado".
- ~~[P1] **O cálculo das quantidades depende da IA.**~~ Sem a chave, aparece o alerta "A chave GEMINI_KEY não foi configurada nas propriedades do script." e nenhum número é mostrado. **Feito na fase 2 (78a0405):** o quantitativo sai sempre; sem a IA volta um aviso e o documento sai sem os parágrafos de fundamentação (`PlanCME_calcularPlanejamento`).
  - **Fazer:** o cálculo sai sempre; a fundamentação é gerada em separado.
  - Se a IA falhar: "O texto de fundamentação não pôde ser gerado agora. O quantitativo está correto; tente de novo em alguns minutos ou avise o administrador."
  - *Onde:* `tplPlanCME_calcular`; `SGO_PlanCME_* › apiCalcular`.
- [P2] **"Voltar" da etapa 5 apaga o cálculo sem avisar**, e calcular de novo chama a IA de novo.
  - **Fazer:** apagar o cálculo só quando algum dado mudar. *Onde:* `tplPlanCME_irParaEtapa`.
- [P2] **O WhatsApp manda um link interno (`/arquivos/{id}`), que fica restrito ao IP do escritório, e exige "Salvar no Drive" antes.**
  - **Fazer:** conferir se o link abre de fora da rede, salvar automaticamente e avaliar o envio pelo WhatsApp oficial.
- [P3] **Abreviações e inglês** ("Ind. Biológicos", "KPIs").
- [P2] **O manual traz uma nota de programador e "Google Drive".**
  - **Fazer:** remover a nota e escrever "pasta do cliente no SGO+".

### Cronograma de execução
- ~~[P2] **Título duplicado.**~~ **Fazer:** remover o `header-card`. **Feito na fase 2 (78a0405).**
- [P2] **Gera cronograma sem cliente.**
  - **Fazer:** conferir a razão social no "Avançar" da etapa 1. *Onde:* `tplCronExec_finalizar`.
- [P2] **Os equipamentos são digitados à mão, embora já estejam no cadastro.**
  - **Fazer:** botão "Trazer equipamentos do cadastro deste cliente".
- [P2] **Cartão de grupo sem rótulos, com um select de largura total.**
  - **Fazer:** uma linha por equipamento: nome · "Qtd." · "Mover para" [Grupo ▼]. (Captura: cronograma_grupos_1440.png)
- [P3] **Explicação da divisão escrita com "o(s) primeiro(s) grupo(s) recebe(m)".**
  - **Fazer:** uma frase curta.
- ~~[P1] **"Abrir Documento" abre a aba depois da chamada ao servidor.**~~ O navegador bloqueia a aba, aparece "Cannot read properties of null", e por isso o documento também não é salvo. **Já corrigido na revisão de lógica (3520fd1).**
  - **Fazer:** abrir a aba vazia no clique, como o PGT e POP já faz. *Onde:* `tplCronExec_abrirDocumento`.
- [P2] **"Abrir WhatsApp" manda só uma frase, sem documento.**
  - **Fazer:** incluir o link do PDF ou remover o botão.
- [P2] **Histórico só na etapa 4, sem título, e "Salvar no Drive".**
- [P3] **Cartão "Modo: Único/Múltiplo".** **Fazer:** remover.

### Registros operacionais
- ~~[P1] **A etapa "4. Consultar" não abre por nenhum caminho.**~~ Pendências, histórico e "Registrar Fechamento" ficam inacessíveis. **Já corrigido na revisão de lógica (3520fd1)**: botão "Consultar registros e pendências" nas etapas 1 e 3; conferido na fase 2.
  - **Fazer:** pôr a consulta no topo: "Consultar registros e pendências deste cliente".
  - *Onde:* `SGO_RegOp_ConteudoModulo.js › #tplRegOp_step4`, `#tplRegOp_nav4`.
- ~~[P1] **Um tipo novo de documento só pode ser criado pela IA.**~~ **Já corrigido na revisão de lógica (3520fd1)** ("Montar os campos manualmente").
  - **Fazer:** mostrar a montagem manual desde o início, e a falha da IA junto ao botão.
  - (Captura: regop_novo-tipo-so-com-ia_1440.png)
- ~~[P2] **Avisos aparecem só no histórico, no pé da página.**~~ **Fazer:** mostrar ao lado do botão. **Feito na fase 2 (78a0405):** faixa visível com o erro ou aviso.
- [P2] **"Registrar Fechamento" leva só o CNPJ**, e depois o sistema pede de novo os dados do cliente.
  - **Fazer:** levar os dados completos. *Onde:* `tplRegOp_registrarFechamento_`.
- [P3] **Datas em texto livre.**
- [P3] **Títulos com Cada Palavra em Maiúscula.**
- [P1] **Bloqueado no celular, sendo o módulo de campo** (rondas, checklists, assinaturas).
  - **Fazer:** liberar o preenchimento no celular e pôr o ícone na grade.
  - (Captura: regop_celular-bloqueado_390.png. A mensagem já orienta abrir no computador, corrigido nesta rodada.)
- [P2] **O manual promete coisas que a tela não mostra.**

### Laudo NR-13
- ~~[P2] O menu não destacava o NR-13~~ — **corrigido nesta rodada** (`abrir()` marca o item ativo).
- ~~[P2] **Título duplicado**~~, com nome diferente do menu. **Fazer:** remover o `header-card`. **Feito na fase 2 (78a0405).**
- ~~[P1] **Ao escolher um equipamento já cadastrado, o "Tipo de vaso" fica vazio e a emissão trava.**~~ O cadastro grava "AUTOCLAVE" e a lista tem "Autoclave". **Já corrigido na revisão de lógica (3520fd1)** (comparação sem diferenciar maiúsculas); conferido na fase 2.
  - **Fazer:** comparar sem diferenciar maiúsculas e esconder o formulário "cadastre um novo" depois da escolha.
  - *Onde:* `tplNR13_confirmarEquipamento_`, `tplNR13_montarPayload_`.
  - (Captura: nr13_equipamento-tipo-vazio_1440.png)
- [P2] **O formulário de cadastro continua aberto depois da escolha.**
- ~~[P1] **As fotos de um rascunho reaberto apontam para `drive.google.com`**~~ e aparecem quebradas. **Feito na fase 2 (78a0405).**
  - **Fazer:** usar `f.link` ou `'/arquivos/' + f.fileId`. *Onde:* `tplNR13_renderFotosLista_`.
  - Trocar também "(Gemini vision)" e "Enviando … para o Drive" no histórico.
- ~~[P1] **"Aprovado" já vem marcado, e "Emitir Laudo Final" não pede confirmação.**~~ **Feito na fase 2 (78a0405):** começa sem veredito, emitir sem veredito explica o que falta e a emissão pede confirmação com veredito e PH.
  - **Fazer:** começar sem veredito e confirmar antes de emitir: "Emitir o laudo nº … como APROVADO, assinado por …? Depois de emitido ele não pode ser alterado."
- ~~[P2] **Texto de contorno de erro sempre visível**~~ ("Recebeu o erro 'Este laudo já foi emitido…'?"). **Feito na fase 2 (78a0405).**
  - **Fazer:** mostrar só quando o erro acontecer.
- [P2] **Lista de profissionais escrita no código** (`NR13_ASSINANTES`), enquanto o servidor confere contra outra lista.
  - **Fazer:** carregar a lista do servidor.
- [P3] **Datas em texto livre**, e o mapa do manual (1 a 8) não bate com a tela (1 a 9).

### Inventário de equipamentos
É a tela mais limpa do bloco.
- ~~[P2] **Título duplicado.**~~ *Onde:* `tplInv_irParaTela_`. **Feito na fase 2 (78a0405).**
- ~~[P2] **"Salvar no Drive" / "já salvos no Drive"**~~, também no manual (seção 7). **Feito na fase 2 (78a0405).**
- [P3] **Avisos por `alert()` do navegador.**
- [P3] **"1 equipamentos" e "Sem doc / Sem documento".**
- [P3] **Títulos com Cada Palavra em Maiúscula.**

### Consistência entre os seis módulos

| | PGT e POP | Planej. CME | Cronograma | Registros | NR-13 | Inventário |
|---|---|---|---|---|---|---|
| Faixa de etapas | 5 | não tem | 5 | 4 (a 4ª não abre) | 9 painéis | filtro + relatório |
| Botão para seguir | Avançar | Próximo | Avançar | Avançar | — | — |
| Etapa 1 | "Dados do Hospital" | "Dados do cliente" | "Dados do Cliente" | "Dados do Hospital" | "Cliente" | "Cliente" |
| De onde vem o cliente | CNPJ público | CNPJ público | CNPJ público | CNPJ público | cadastro de Clientes | cadastro |
| Consultar já gerados | etapa 1 | não tem | não tem | etapa 4 (não abre) | painel no topo | rodapé |
| Salvar PDF | automático + "Salvar no Drive" | manual | manual, exige abrir antes | automático | automático | manual |
| Histórico | todas as etapas, título duplo | todas, título duplo | só na etapa 4 | todas, título duplo | todas, título duplo | não tem |

- ~~[P2] **"Hospital" ou "cliente".**~~ **Fazer:** "Cliente" nos seis módulos. **Feito na fase 2 (78a0405) nas telas de PGT/POP e Registros** (etapa 1 "Cliente").
- [P2] **Quatro módulos ignoram o cadastro de Clientes:** o documento gerado não fica ligado ao cliente nem à pasta dele.
  - **Fazer:** buscar primeiro no cadastro, como o NR-13 faz.
  - *Onde:* `tplPgtPop_buscarCNPJ`, `tplPlanCME_buscarCNPJ`, `tplCronExec_buscarCNPJ`, `tplRegOp_buscarCNPJ`.
- [P2] **Botões e títulos com nomes diferentes.** **Fazer:** um padrão só:
  - "Avançar" / "Voltar";
  - "Gerar documento";
  - "Salvar PDF na pasta do cliente";
  - "← Voltar ao módulo".
- [P2] **Consulta e histórico em lugares diferentes.** **Fazer:** consulta no topo e histórico no rodapé, nos seis.
- [P2] **Celular:** Registros operacionais e NR-13 são trabalho de campo e deveriam ter versão para o celular.

### Grupo do menu
A proposta do auditor deste bloco difere um pouco da adotada nesta rodada. A versão adotada mantém o número de grupos baixo:

| Módulo | Grupo adotado | Alternativa do auditor |
|---|---|---|
| Planejamento CME | Qualificação | "Planejamento de serviços" (grupo novo) ou topo de Qualificação |
| Cronograma de execução | Documentos técnicos | "Planejamento de serviços" ou Operação de campo |
| PGT e POP, Registros operacionais | Documentos técnicos | "Gestão de tecnologia do cliente" |
| Laudo NR-13 | Documentos técnicos | Qualificação, renomeada "Qualificação e inspeção" |
| Inventário de equipamentos | Documentos técnicos | Cadastros, abaixo de Equipamentos |

Se o dono preferir a alternativa, a mudança é só mover os botões em `Index.html` (as chaves `data-mod` não mudam).


## 5. Operação de campo e gestão (Frota, Integração Auvo, Painel de qualidade, Programa de conduta)

Durante a auditoria, outros agentes estavam alterando os arquivos destes módulos. Itens já corrigidos na cópia de trabalho, mas ainda não publicados, estão listados à parte e não entram na contagem.

Contagem: 45 itens (P1 3, P2 24, P3 18). Desses, 4 já foram corrigidos nesta rodada (navegação).

### Itens de navegação deste bloco — corrigidos nesta rodada
- ~~[P2] O menu marcava "Início" em Auvo, Qualidade e Conduta~~ — `abrir()` passou a marcar o item ativo.
- ~~[P1] Integração Auvo e Painel de qualidade abertos a todos no menu, mas bloqueados no servidor~~ — escondidos para quem não é ADMIN, GESTOR ou DIRETORIA.
- ~~[P3] Os ids `menu-secao-gestao` e `menu-secao-documentos` não existiam~~ — os grupos "Gestão" e "Documentos técnicos" foram criados.
- ~~[P3] Programa de conduta com três nomes~~ — título "Programa de conduta" no casco.

### Frota
A tela do computador é uma página única com 12 painéis empilhados: 3.632 px mesmo com o banco vazio. O relatório vem em primeiro lugar e "Retirar veículo", a ação do dia a dia, fica no 6.º painel.

Já corrigido na cópia de trabalho (falta publicar):
- "Fotos (opcional)" com envio que recusava sem foto;
- confirmação ao excluir multa, documento e abastecimento e ao inativar veículo e condutor;
- botões só para gestor (`.so-gestor`);
- km e valores em pt-BR;
- "Cópia salva no Drive".

**Estrutura**
- ~~[P2] **Página única gigante.**~~ — **feito em a0b91b7: abas "Situação e retiradas", "Veículos e condutores", "Manutenção e paradas" (só gestão), "Documentos e multas", "Abastecimentos" e "Histórico e relatório".**
  - **Fazer:** abas no estilo do Programa de conduta:
    - "Situação e retiradas" (avisos, retiradas em andamento, retirar, devolver);
    - "Veículos e condutores";
    - "Manutenção e paradas";
    - "Documentos e multas";
    - "Abastecimentos";
    - "Histórico e relatório".
  - *Onde:* `SGO_Frota_ConteudoModulo.js › tplFrota_renderReal_`.
  - (Captura: frota_pagina_inteira_1440.png)
- ~~[P2] **Título duplicado**~~ — **feito em a0b91b7: cabeçalho removido; "Manual do operador" na barra do casco.** (H2 do casco e H1 "Frota" no `header-card`).
  - **Fazer:** remover o `header-card` e levar o "Manual do Operador" para a barra do casco. (Captura: frota_topo_1440.png)
- ~~[P3] **CAIXA ALTA em todos os títulos de painel e rótulos.**~~ — **feito em a0b91b7 (computador); a vistoria do celular é do JS_Core (ver pendências).**
  - **Fazer:** tirar o `text-transform` de `#tplFrotaContainer .panel h2` e dos rótulos.

**Relatório**
- ~~[P2] **O subtítulo ainda diz "fica salvo no Drive".**~~ — **feito em 63123cf.**
  - **Fazer:** "Por veículo ou de toda a frota, em A4, pronto para imprimir; uma cópia fica guardada no SGO+."
- ~~[P2] **"Despesas" é citada no subtítulo, no relatório e no manual (seções 3 e 10), mas o painel não existe mais.**~~ — **feito em a0b91b7: a palavra saiu do manual (seções 2, 10, 12, 13 e 14) e do histórico quando não há registro; despesas antigas continuam aparecendo no histórico. Decisão sobre trazer o painel de volta fica com o dono.**
  - **Fazer:** decidir com o dono se o painel volta. Se não voltar, tirar a palavra dos textos.

**Avisos e retiradas**
- ~~[P2] **"Avisos de manutenção" também mostra CNH vencida.**~~ — **feito em 63123cf (título); o formato da linha vem do servidor e ficou como está.**
  - **Fazer:** título "Avisos de vencimento" e linha no formato "CNH de João da Silva vencida em 10/10/2026".
- ~~[P2] **"Retiradas em andamento" junta duas coisas:**~~ — **feito em a0b91b7: painéis "Situação da frota" e "Retiradas em andamento" separados. O texto "0 disponível(is) · 0 em uso" é montado no JS_Core (frotaSituacaoHtml_) — pendência registrada.** o quadro de situação da frota e a lista de retiradas.
  - **Fazer:** separar em "Situação da frota" e "Retiradas em andamento", e escrever "1 disponível · 0 em uso".
- ~~[P2] **Situações cruas e "Status".**~~ — **feito em 63123cf + a0b91b7: rótulos legíveis e colunas "Situação"; "em andamento" em caixa normal no histórico.** "DISPONIVEL", "EM USO", "ABERTA/PAGA/RECORRIDA".
  - **Fazer:** "Disponível", "Em uso", "Aberta", "Paga"…, e coluna "Situação".
  - *Onde:* `tplFrota_renderVeiculosTabela_`, `tplFrota_renderMultasTabela_`, `tplFrota_buscarHistorico`, `renderMobileFrotaOperacional_`.

**Veículos, retirada e histórico**
- ~~[P3] **Condutor aparece como "JOÃO DA SILVA (ATIVO)".**~~ — **conferido em a0b91b7: a tela atual não mostra mais "(ATIVO)".**
  - **Fazer:** mostrar o nome sem forçar maiúsculas e sinalizar só quando estiver inativo.
- ~~[P3] **Seletor de arquivo nativo em inglês**~~ — **feito pela frente do núcleo (JS_Core › SGO_melhorarSeletorArquivo_, ainda não publicado): todo campo de arquivo ganha "Escolher arquivo" em português.** em 6 campos.
  - **Fazer:** botão "Escolher fotos" ou "Escolher arquivo".
- ~~[P3] **Histórico do veículo: select sem rótulo e botão "Buscar" com meia largura.**~~ — **feito em a0b91b7: rótulo "Veículo" e o histórico carrega ao escolher (sem botão "Buscar").**
  - **Fazer:** rótulo "Veículo" e carregar o histórico ao escolher.

**Manual e celular**
- ~~[P2] **A seção 3 do manual diz que gestor vê a tela completa no celular.**~~ — **feito em 63123cf.** No código, todos os perfis veem só retirar e devolver.
  - **Fazer:** corrigir o texto. *Onde:* `tplFrota_manualHtml_ › #tplFrota_ms3`.
- [P3] **Os 31 itens da vistoria no celular estão em CAIXA ALTA.** **Fazer:** tirar o uppercase. (Captura: frota_celular_retirar_390.png)

### Integração Auvo
No uso diário a tela tem Conexão, Sincronização, Pendências e Relatório. Atrás de "Mostrar ferramentas avançadas" ficam 5 ferramentas de implantação.

Já corrigido na cópia de trabalho: a mensagem de "Testar Conexão" mandava para "Propriedades do script" e agora aponta para "Chaves e senhas".

- ~~[P2] **Ferramentas de implantação na mesma tela do uso diário.**~~ — **feito em a0b91b7: só o Administrador vê "Ferramentas de implantação"; o servidor também recusa essas funções para os outros perfis, com mensagem que diz a quem pedir.** "Sincronizar todos (lote)", "Importação completa", "Auditoria do cadastro" e "Enviar cadastro pendente" ficam a um clique de qualquer gestor.
  - **Fazer:** deixar só para ADMIN, em Administração. *Onde:* `SGO_Auvo_ConteudoModulo.js › #tplAuvo_avancado`. (Captura: auvo_painel_1440.png)
- ~~[P2] **"Conexão" mostra nomes de variáveis**~~ — **feito em a0b91b7: "Confere se a conta do Auvo está conectada ao SGO+…".** (AUVO_API_KEY/AUVO_API_TOKEN).
  - **Fazer:** "Confere se a conta do Auvo está conectada ao SGO+.", ou levar o teste para Chaves e senhas.
- ~~[P2] **Título duplicado**~~ — **feito em a0b91b7: cabeçalho removido; manual na barra do casco.** (casco e H1 interno). **Fazer:** remover o H1. *Onde:* `tplAuvo_paintPainel_`.
- ~~[P2] **Jargão e notas de desenvolvedor.**~~ — **feito em 63123cf + a0b91b7: "SGO+" no lugar de "Portal" no painel e no manual.** "testado e confirmado", "pro Portal", "dashboard principal", "Rodar agora (manual)", "(Portal → Auvo)".
  - **Fazer:** "SGO+" em vez de "Portal", "Início" em vez de "dashboard", "Sincronizar agora", e o texto "O Auvo não permite encerrar a O.S. pelo SGO+; esta lista mostra o que falta e o link para encerrar no Auvo."
- ~~[P2] **Erro cru na tela:**~~ — **feito em 63123cf.** "Aba não encontrada: AUVO_TAREFAS".
  - **Fazer:** estado vazio "Ainda não há atendimentos sincronizados do Auvo. Ligue a sincronização automática acima ou clique em Sincronizar agora."
- ~~[P3] **Escolha de colaboradores por Ctrl+clique num select múltiplo.**~~ — **feito em a0b91b7: caixas de marcação com busca.** **Fazer:** caixas de marcação com busca.
- ~~[P3] **Colunas "Status".**~~ — **feito em a0b91b7: colunas "Situação" e situações legíveis ("Sincronizado", "Com erro", "Pendente").** **Fazer:** "Situação".
- ~~[P2] **Sincronização em lote grava no Auvo sem confirmação.**~~ — **feito em 63123cf.**
  - **Fazer:** perguntar "Enviar N clientes ativos para o Auvo? Os cadastros que já existem lá serão atualizados."
  - *Onde:* `tplAuvo_sincronizarTodosClientes`, `tplAuvo_sincronizarTodosTecnicos`.
- ~~[P2] **Importação pendurada deixa o operador no limbo.**~~ — **feito em a0b91b7: o servidor guarda quando o lote rodou e o motivo da parada; a tela diz "Importação parada desde dd/mm/aaaa hh:mm na fase Clientes e unidades. Motivo: … Para continuar, clique em Retomar…", ou "Nenhuma importação completa foi feita ainda" quando nunca rodou.** Mostra "Em andamento — fase CLIENTES… gatilho automático" sem credenciais e sem data.
  - **Fazer:** "Parada desde dd/mm/aaaa hh:mm na fase Clientes. Motivo: … Para continuar, clique em Retomar." *Onde:* `tplAuvo_renderStatusReverso_`.
- ~~[P2] **Manual com nomes internos.**~~ — **feito em a0b91b7: trechos reescritos (5b, 5c, 6 e a nota de origem).** "aba AUVO_TAREFAS", "futuro módulo de indicadores", "gatilho", "runs", "planilha".
  - **Fazer:** reescrever esses trechos. *Onde:* `tplAuvo_manualHtml_` (5b, 5c, 6).

### Painel de qualidade
- ~~[P1] **Diz "0 itens que exigem ação / OK" com CNH vencida na Frota.**~~ — **feito em 63123cf.** `tplQualidade_montarFrota_` retorna cedo sem movimentação, e documentos, CNH e multas ficam fora das pendências.
  - **Fazer:** mostrar sempre o bloco "Documentos, CNH e multas" e contar esses itens nas pendências.
  - (Captura: qualidade_painel_1440.png)
- ~~[P2] **"OK — integrações respondendo" com o Auvo sem credenciais.**~~ — **feito em 63123cf.**
  - **Fazer:** basear no estado real e escrever "Auvo: conexão não configurada — peça ao administrador (Chaves e senhas)".
- ~~[P3] **Cartões em 1/3 da largura e dois títulos "Resumo".**~~ — **feito em a0b91b7: grade em largura total; títulos "Atendimentos do Auvo" e "Uso da frota".** **Fazer:** grade em largura total, com títulos "Atendimentos do Auvo" e "Uso da frota".
- ~~[P3] **Select de período ocupando 70% da barra**~~ — **feito em a0b91b7: select com largura do conteúdo e barra que quebra linha sem espremer.** e botões quebrando linha.
- ~~[P3] **Plurais com parênteses ("integração(ões)"), CAIXA ALTA e "Erro: …" cru.**~~ — **feito em a0b91b7: plural pelo número nos totais e cartões principais (as linhas de detalhe dos rankings ainda usam "(s)"); sem caixa alta; erros dizem o que fazer.** **Fazer:** plural de acordo com o número e mensagem que diga o que fazer.
- ~~[P2] **"Ocorrência" tem três sentidos no sistema**~~ — **feito em a0b91b7: "Cobranças e elogios de campo" (botão, histórico e modal).** (aqui, no Auvo e no Programa de conduta).
  - **Fazer:** chamar aqui de "Cobranças e elogios de campo" e alinhar o vocabulário com a Conduta.
- ~~[P3] **Estado vazio sem orientação.**~~ — **feito em a0b91b7: cada bloco vazio diz de onde vêm os dados e o que fazer.**

### Programa de conduta
- ~~[P1] **"Aplicar agora: fechamentos pendentes e ajustes do programa" fecha competências sem confirmação.**~~ — **feito em 63123cf (servidor exige confirmação) + JS_Core pela frente do núcleo (pede confirmação com a lista de meses; não publicado).**
  - O fechamento congela o mês, e o resultado só aparece num `alert()`.
  - O botão também aparece no Início do ADMIN (ver 1.4).
  - **Fazer:** perguntar antes: "Fechar setembro/2026 e aplicar N prazos vencidos? O fechamento congela o resultado do mês e não pode ser desfeito por aqui." Mostrar o resultado no próprio cartão.
  - *Onde:* `JS_Core.html › Conduta_aplicarRotinaAgora_`.
  - (Captura: conduta_farol_1440.png)
- ~~[P2] **Jargão da fórmula.**~~ — **feito em a0b91b7: "Índice de conduta", "Pontos de demérito", "Pessoas no cálculo" e o texto do período de teste.** "ICO", "Demérito (D)", "Divisor (n)", "Modo sombra ativo".
  - **Fazer:** "Índice de conduta", "Pontos de demérito", "Pessoas no cálculo", e "Período de teste: o índice é calculado, mas o bônus ainda não é pago."
- [P3] **Velocímetro com o número sobre o ponteiro**, ilegível no celular. **Fazer:** número abaixo do arco. *Onde:* `Conduta_montarFarolCardHtml_`.
- ~~[P2] **"Como usar esta tela" ocupa um cartão inteiro em cada aba**~~ — **feito em a0b91b7: link discreto à direita; abre o manual do gestor para a gestão e o do colaborador para os demais.** e sempre abre o manual do colaborador, inclusive nas abas da gestão.
  - **Fazer:** link discreto e o manual certo para cada papel. (Captura: conduta_ocorrencias_1440.png)
- ~~[P2] **Botões principais em quatro cores sem regra.**~~ — **feito em a0b91b7: verde para a ação principal, contorno para as secundárias, vermelho só para "Rejeitar" e "Manter (firme)".**
  - **Fazer:** verde para a ação principal, contorno para as secundárias, vermelho só para ações destrutivas.
- ~~[P2] **Erros crus**~~ — **feito em a0b91b7: erro aparece dentro da aba (ou do modal aberto) dizendo o que fazer.** ("Erro: …", "Falha ao carregar.").
  - **Fazer:** mensagem dentro da aba dizendo o que fazer. *Onde:* `tplConduta_chamarApi_`.
- ~~[P2] **"Tipo" é um select com cerca de 90 itens**~~ — **feito em a0b91b7: a lista já tinha grupos; ganhou busca por código ou descrição.**, sem grupos.
  - **Fazer:** `optgroup` por área e campo de busca.
- ~~[P3] **Situações cruas e coluna "Status".**~~ — **feito em a0b91b7: "Registrada", "Homologada", "Em recurso"…; coluna "Situação".** **Fazer:** "Registrada", "Homologada"…, e coluna "Situação".
- ~~[P3] **Estados vazios sem o próximo passo.**~~ — **feito em a0b91b7: cada lista vazia diz o próximo passo.**
- ~~[P3] **Aba "Eventos Positivos"**~~ — **feito em a0b91b7.** destoa dos botões "Reconhecer…". **Fazer:** "Reconhecimentos".
- ~~[P3] **Relatórios semanais: campo de data sem rótulo.**~~ — **feito em a0b91b7: "Semana terminando em" e "Competência".** **Fazer:** rótulo "Semana terminando em".
- [P2] **No celular não há como abrir os manuais.** **Fazer:** botão "Manual do colaborador" em `renderMobileConduta_`.
- [P3] **Título "Minhas ocorrências recentes" desalinhado no celular.** (Captura: conduta_celular_390.png)


### Fase 2 — pendências deste bloco que dependem do JS_Core (frente do núcleo)
- `frotaSituacaoHtml_`: "0 disponível(is) · 0 em uso" → "1 disponível · 0 em uso" (plural pelo número).
- `renderMobileFrotaOperacional_`: títulos em caixa alta ("RETIRADAS EM ANDAMENTO") e os 31 itens da vistoria em caixa alta (item [P3] acima).
- `Conduta_montarFarolCardHtml_`: número do velocímetro abaixo do arco (item [P3] acima).
- `renderMobileConduta_`: botão "Manual do colaborador" no celular e alinhamento de "Minhas ocorrências recentes" (itens [P2] e [P3] acima).

## 6. Principal, cadastros e administração

Contagem: 64 itens (P1 4, P2 34, P3 26). Desses, 3 já foram corrigidos nesta rodada (navegação e títulos).

### Minhas atividades e Atividades da equipe
As telas são bem resolvidas: o estado vazio orienta e os erros dizem o que fazer.

- [P3] **O mesmo ato tem três nomes:** "Nova atividade", "Lançar atividade" e "Lançar".
  - **Fazer:** "Nova atividade" no botão e no título; "Salvar atividade" no envio.
  - *Onde:* `JS_Atividades.html › Atividades_renderMinhas_, Atividades_abrirFormulario_, Atividades_renderEquipe_`.
- [P2] **"Unidade" aparece antes de "Cliente" e fica travada ("Escolha um cliente primeiro").**
  - **Fazer:** Cliente e Unidade lado a lado, com Cliente primeiro. *Onde:* `Atividades_abrirFormulario_`.
- [P3] **"Fazendo agora" × "Estou fazendo agora" × "Iniciar".**
  - **Fazer:** um rótulo só, e uma dica no botão "Iniciar": "Muda a situação para Em andamento".
- [P3] **Dois botões primários verdes no detalhe.** **Fazer:** só "Concluir" fica primário.
- [P3] **"Andamento (%)" vazio**, sem faixa nem valor atual. **Fazer:** placeholder "0 a 100" e preencher com o valor gravado.
- [P3] **Coluna "Selo".** **Fazer:** "Situação do prazo".
- ~~[P2] **Configurações e Chaves e senhas aparecem como "módulo ligado"**~~ e ganham o botão "Atividades do módulo". **Feito na fase 2 (78a0405).**
  - **Fazer:** tirar `admin` e `chaves` de `Atividades_modulosDoMenu_` e de `Atividades_aoAbrirModulo_`.
- [P2] **Celular: tabela de 6 colunas cortada** (prazo "19/10/2026 01:2", ações fora da tela).
  - **Fazer:** cartões no modo celular. *Onde:* `Atividades_listaHtml_`. (Captura: atividades_lista_390.png)
- [P3] **Celular: título repetido e abas empilhadas (cerca de 150 px).** **Fazer:** abas numa linha.
- ~~[P2] Celular: o topo mostrava "Menu" em Atividades da equipe~~ — **corrigido nesta rodada** (`abrir()` põe o nome da tela).
- [P3] **Filtro "Gantt por" aparece nas abas Kanban e Lista.** **Fazer:** mostrar só no Gantt.
- [P3] **Marca "hoje" do Gantt parece cair no dia seguinte à noite.** **Fazer:** rótulo "hoje 16/10". *Onde:* `JS_Atividades.html`, perto da linha 1053.
- [P3] **Agenda: botões Semana e Mês com altura diferente de "‹ Hoje ›".**

### Avisos
- ~~[P2] **A janela do aviso abre por cima de um formulário em uso.**~~ **Feito na fase 2 (78a0405):** a janela espera 30 s enquanto houver janela aberta ou campo em uso.
  - **Fazer:** adiar a janela enquanto houver modal ou overlay aberto, ou campo com foco.
  - *Onde:* `JS_Avisos.html › AvisosTela_verificar_`. (Captura: atividades_aviso_sobre_formulario_1440.png)
- ~~[P2] **"Publicar" dispara e-mail e WhatsApp para todos sem confirmar.**~~ **Feito na fase 2 (78a0405):** confirmação com o número de pessoas e quantas recebem por e-mail e por WhatsApp.
  - **Fazer:** perguntar "Publicar para N pessoas? Cada uma recebe e-mail e WhatsApp agora." *Onde:* `AvisosTela_publicar_`.
- ~~[P2] **A mensagem cita a tabela interna**~~ ("O detalhe fica na aba NTF_ENVIOS."). **Feito na fase 2 (78a0405).**
  - **Fazer:** tirar a frase, ou dizer "Publicados › Quem leu". *Onde:* `AvisosTela_resumoEnvio_`.
- ~~[P2] **Perfis em código ("TECNICO") e opções em CAIXA ALTA.**~~ **Feito na fase 2 (78a0405).**
  - **Fazer:** nomes por extenso e tirar o `text-transform` de `.avs-publico label.op` e de `.avs-checks label`. (Captura: avisos_novo_1440.png)
- ~~[P2] **"Choose Files / No file chosen".**~~ **Fazer:** botão próprio "Escolher arquivos". *Onde:* `#avsF_arq`. **Feito na fase 2 (78a0405).**
- ~~[P3] **"MOSTRAR ARQUIVADOS" em caixa alta.**~~ **Feito na fase 2 (78a0405).**
- ~~[P3] **Aba "Publicados (gestão)".**~~ **Fazer:** "Publicados". **Feito na fase 2 (78a0405).**

### Clientes
- ~~[P1] **A lista de clientes sumiu, e com ela Inativar, Reativar e Excluir.**~~ O script de vínculos esconde a tabela e a pesquisa (`old.hidden=true`). **Feito na fase 2 (78a0405):** a lista carrega ao abrir e a pesquisa filtra; a consulta de vínculos fica recolhida abaixo da lista.
  - **Fazer:** manter a tabela carregada ao abrir e deixar os vínculos como apoio ao lado.
  - *Onde:* `JS_Vinculos.html › attach()`. O mesmo vale para Unidades.
  - (Captura: clientes_pagina_1440.png)
- ~~[P2] **Faixa "Cadastre com segurança" acima do título**~~, com um segundo "Como usar". **Feito na fase 2 (78a0405).**
  - **Fazer:** remover a faixa (`bar.id='vincEntry'`).
- ~~[P2] **Caixa "Criar unidade principal…" abaixo dos botões e em CAIXA ALTA.**~~ **Feito na fase 2 (78a0405).**
  - **Fazer:** mover para depois do Endereço. *Onde:* `JS_Cadastros.html › renderClientesModulo_`.
- [P2] **CNPJ sem máscara** em cartões, sugestões, vínculos e listas do celular.
  - **Fazer:** formato 11.222.333/0001-81. *Onde:* `vincCards_`, `SGO_montarBuscaClienteLike_`, `renderMobileListaClientes_/Unidades_`.
- ~~[P2] **Dois botões "Buscar" com sentidos diferentes**~~ (Receita × SGO+). **Feito na fase 2 (78a0405).**
  - **Fazer:** botão do CNPJ "Preencher pela Receita".
- ~~[P3] **"+ Novo Cliente".**~~ **Fazer:** "+ Novo cliente". **Feito na fase 2 (78a0405).**
- ~~[P3] **Campo "Situação: ATIVO" travado num cadastro novo.**~~ **Fazer:** mostrar a situação só na edição, como selo. Vale também para Unidades, Equipamentos, Documentos e Usuários. **Feito na fase 2 (78a0405) em Clientes e Unidades** (a situação aparece só na edição).
- [P3] **Tudo gravado em MAIÚSCULAS.** **Fazer:** confirmar com o dono se a normalização é desejada.
- ~~[P2] **Celular: duas buscas e o painel de vínculos já aberto, com título repetido.**~~ **Feito na fase 2 (78a0405):** o painel de vínculos vem fechado.
  - **Fazer:** painel fechado no celular. (Captura: clientes_lista_390.png)
- [P2] **CNPJ obrigatório no celular, mas não no computador.**
  - **Fazer:** igualar a regra. *Onde:* `JS_Core › renderMobileFormClientes_` × `JS_Cadastros › clientesSalvar_`.

### Unidades
- ~~[P1] **Lista e ações escondidas**~~ (mesma causa de Clientes). **Feito na fase 2 (78a0405).**
- ~~[P2] **A dica está colada no rótulo do CNPJ:**~~ "CNPJ DA UNIDADE NA UNIDADE PRINCIPAL, PODE SER O MESMO DO CLIENTE." **Feito na fase 2 (78a0405).**
  - **Fazer:** rótulo "CNPJ da unidade" e a dica abaixo do campo. *Onde:* `JS_Cadastros.html`, perto da linha 489. (Captura: unidades_formulario_1440.png)
- [P3] **As sugestões de cliente continuam abertas depois de salvar** (também em Equipamentos).

### Equipamentos
- ~~[P1] **Celular: clientes sem nome no seletor**~~ ("— 11222333000181"). A tela lê `RAZAO_SOCIAL`/`NOME_FANTASIA`, mas o servidor devolve `NOME`. **Feito na fase 2 (78a0405):** nome e CNPJ com máscara (JS_Core › `mobileRotuloCliente_`).
  - **Fazer:** usar `c.NOME || c.RAZAO_SOCIAL || c.NOME_FANTASIA`.
  - *Onde:* `JS_Core › renderMobileFormEquipamentos_` e `renderMobileFormDocumentos_`. (Captura: equipamentos_formulario_390.png)
- ~~[P2] **Coluna Ações cortada em 1440 px**~~ ("QR C", "Inativ"). **Feito na fase 2 (78a0405):** botões empilhados na coluna Ações das listas ao lado do formulário.
  - **Fazer:** Editar e QR Code visíveis; Inativar e Excluir num menu "Mais". (Captura: equipamentos_lista_1440.png)
- ~~[P2] **Lista vazia ao abrir**~~ (também em Documentos e Usuários). **Feito na fase 2 (78a0405)** em Equipamentos, Arquivo de documentos, Usuários, Clientes e Unidades (50 mais recentes sem filtro).
  - **Fazer:** carregar os 50 mais recentes e usar a pesquisa como filtro.
- [P2] **Rótulos diferentes entre computador e celular** ("TAG (Identificador)" × "TAG / Patrimônio"; "Número de Série" × "Série").
- [P3] **Sucesso genérico** ("Criado com sucesso."). **Fazer:** "Equipamento AUT-TESTE-01 cadastrado."
- [P3] **A exclusão não diz qual equipamento.** **Fazer:** "Excluir o equipamento AUT-TESTE-01? Não pode ser desfeito."

### Arquivo de documentos
A página é montada em `Index.html › renderDocumentosModulo_` e a lógica está em `JS_Admin.html`.

Corrigido nesta rodada em `Index.html`:
- título "Arquivo de documentos";
- "(enviado ao Drive)" removido;
- "Status" passou a "Situação";
- "Equipamento (opcional)", "Data de vencimento (opcional)" e "Novo documento";
- estado vazio orientando a pesquisa.

Fica para a fase 2:
- ~~[P2] **"Visualizar no Drive" na lista.**~~ **Fazer:** "Abrir arquivo". *Onde:* `JS_Admin.html`, perto da linha 940. **Feito na fase 2 (78a0405).**
- ~~[P2] **"Choose File / No file chosen"**~~ no computador e no celular. **Fazer:** botão "Escolher arquivo". **Feito na fase 2 (78a0405).**
- [P2] **Categoria em lista fechada no computador e em texto livre no celular.**
  - **Fazer:** o mesmo select no celular. *Onde:* `renderMobileFormDocumentos_ (mob_doc_tipo)`.
- ~~[P2] **Coluna Ações cortada ("AÇ").**~~ **Feito na fase 2 (78a0405).**
- [P2] **Erro de programador pode chegar ao operador** ("Execute a função configurarPastasSGO() no arquivo SGO_DriverSetup").
  - **Fazer:** "O envio de arquivos não está configurado. Avise o administrador do sistema; nada foi gravado." *Onde:* `SGO_Documentos.js`, perto da linha 127.
- ~~[P1] **Celular: clientes sem nome no seletor**~~ (mesmo item de Equipamentos). **Feito na fase 2 (78a0405).**
- [P3] **Categorias com numeração parcial** ("1. Relatórios de Manutenção"… "Outros Documentos").
- [P3] **Celular: a lista vazia diz só "Nenhum registro encontrado."**
  - **Fazer:** "Nenhum documento cadastrado. Toque em + Novo para enviar o primeiro."

### Vínculos (painel em sobreposição)
- ~~[P2] **"CONSOLIDAR" já vem escolhido**~~, e a ação inativa a origem. **Feito na fase 2 (78a0405).**
  - **Fazer:** primeira opção vazia "Escolha a ação" e nomes em caixa normal.
  - *Onde:* `JS_Vinculos.html › vincSelected_`. (Captura: vinculos_painel_1440.png)
- ~~[P2] **Códigos internos na tela**~~ ("REGULAR", nomes de tabela e campo). **Em parte na fase 2 (78a0405):** diagnóstico em texto ("Regular"); a prévia ainda mostra nomes de tabela e campo.
  - **Fazer:** "Situação: regular" e nomes de tela. *Onde:* `vincSelected_`, `vincPreview_`.
- [P3] **Botões cinza chapados e "Fechar" no meio.** **Fazer:** ordem "Atualizar · Como usar" e "Fechar" no canto.
- [P3] **Legenda densa no topo**, antes de qualquer seleção. **Fazer:** mover para "Como usar".
- [P3] **Confirmação confusa** ("…somente se ainda não existir?").
- ~~[P2] **Ao fechar o painel, o menu continua marcando "Vínculos".**~~ Ver 1.6. **Feito na fase 2 (78a0405).**

### Configurações (página "Administração")
- ~~[P2] **O menu agora diz "Configurações", e a página ainda se chama "Administração".**~~ **Feito na fase 2 (78a0405).**
  - **Fazer:** título "Configurações" e "Gestão de usuários" como primeiro bloco. *Onde:* `JS_Admin.html › renderAdminModulo_`.
- ~~[P1] **Perfis sem permissão veem a seção "Gestão de usuários"**~~, com "+ Novo usuário", e o servidor recusa tudo. O item "Usuários" do menu já foi escondido nesta rodada. **Já corrigido na revisão do núcleo (e4c1238).**
  - **Fazer:** esconder a seção para quem não é ADMIN, GESTOR ou DIRETORIA. (Captura: admin_usuarios_perfil_tecnico_1440.png)
- ~~[P2] **"Limpar Sessão Travada (Logout Forçado)".**~~ Mistura inglês e Title Case, é um botão vermelho sem explicação e só limpa este navegador. **Feito na fase 2 (78a0405).**
  - **Fazer:** cartão "Sessão neste navegador", com o texto "Sai do SGO+ neste navegador e recarrega a página. Use quando a tela travar após uma atualização." e o botão "Sair e recarregar".
  - (Captura: admin_pagina_1440.png)
- ~~[P2] **Som de ociosidade em dois cartões**~~, com "Ativado" em fonte de terminal. **Fazer:** um cartão com chave e "Testar". **Feito na fase 2 (78a0405).**
- ~~[P2] **Jargão nos alertas de calibração**~~ ("Intervalo do balão", "Aviso vermelho central") e selo "ATIVO" duplicado. **Feito na fase 2 (78a0405).**
  - **Fazer:** "Repetir o lembrete a cada (minutos)", "Janela de alerta no centro da tela".
- ~~[P2] **Perfis em código no combo; DIRETORIA não aparece.**~~ **Feito na fase 2 (78a0405)** (nomes por extenso; Diretoria entrou em e4c1238).
  - **Fazer:** nomes por extenso. *Onde:* `preencherComboPerfis_`.
- ~~[P2] **Usuários: tabela vazia até pesquisar e coluna "AÇÕ" cortada.**~~ **Feito na fase 2 (78a0405).**
- ~~[P3] **"Gestão de Usuários", "Nome ou Login…", "O Nome Completo é obrigatório."**~~ **Fazer:** escrever em caixa normal. **Feito na fase 2 (78a0405).**
- ~~[P3] Celular: página de computador inteira~~ — **corrigido nesta rodada** (mensagem "disponível apenas na versão para computador").

### Chaves e senhas
- [P2] **Texto do Google:** "(a mesma usada no SGO+ do Google)". **Fazer:** "No Auvo: Menu → Integrações → API." (Captura: chaves_pagina_1440.png)
- [P2] **Liga/desliga e escolha de provedor por digitação livre** ("Digite 1…", "Digite meta ou zapi").
  - **Fazer:** chave Ligado/Desligado e um select "Automático / WhatsApp oficial (Meta) / Z-API". *Onde:* `JS_Chaves.html › ChavesTela_htmlItem_`.
- [P3] **Nomes de variáveis e caminho de arquivo do repositório nos títulos.**
- [P3] **Títulos em inglês** ("API Key", "Phone Number ID", "Client-Token").
- [P3] **Página com cerca de 3.300 px.** **Fazer:** recolher o bloco do provedor de WhatsApp que não estiver em uso.


## 7. Capturas

Pasta `docs/auditoria_design_20261016/`. Os nomes seguem `<módulo>_<página>_<largura>.png`. As capturas `global_*` mostram o menu e o Início antes e depois desta rodada.
