# Programa de conduta: pente fino de qualidade e integração com os módulos (19/10/2026)

Não publicado. Testado no servidor próprio em modo ensaio (cópia da base dev em `%TEMP%\sgo_conduta_pf`, porta 8260), com dados de teste.
O cálculo do índice, o farol, o bônus e as regras do fluxo não mudaram.

## 1. Áreas e vínculo com as pessoas

### De onde vinha a "área" (diagnóstico)

| Lugar | O que era | Problema |
|---|---|---|
| `CAD_USUARIOS` (SGO+) | Não tinha área. Só `PERFIL`, `VINCULO_TRABALHO`, `CELULAR` | Ninguém tinha área cadastrada |
| Programa de conduta: lista de colegas e extrato | Lia `SETOR` ou `DEPARTAMENTO` | Essas colunas não existem: o extrato e o relatório mostravam "Área não informada" para todos, inclusive para quem é do Comercial |
| Catálogo `qual_ocorrencia_tipo.AREA` | Área do **código** (Todos, Tecnica, Metrologia, Comercial, Financeiro, Logistica, RH, Qualidade) | Diz a quem o código se aplica, não a área da pessoa |
| COMMAND | Papel único (`USUARIOS.perfil`, `CMD_PAPEIS`) e áreas próprias do Metrolab's Way (`MPS_AREAS`, `MPS_PESSOA`) | Não ligadas ao SGO+. O COMMAND lê `CAD_USUARIOS` (`cmdSgoUsuarios_`), mas não lia área porque não havia |

### O que foi feito

- **Fonte única:** coluna `CAD_USUARIOS.AREA` (guarda o código da área, por exemplo `COMERCIAL`), garantida no fim da aba sem apagar nada, como `CELULAR` e `VINCULO_TRABALHO`. Leitura por `SGO_areaDoUsuario_(u)` (`SGO_Areas.js`), que devolve `{ codigo, nome }`; o relatório da equipe da outra frente já usa essa função.
- **Lista de áreas:** aba `CAD_AREAS` com Diretoria, Administrativo, Comercial, Financeiro, RH, Qualidade, Metrologia, Técnica/Campo e Logística (cobre todas as áreas do catálogo). Área não é apagada; só é inativada quando ninguém ativo está nela.
- **Cadastro do usuário** (Administração > Usuários): campo "Área" na seção Trabalho, coluna "Área", filtro "Todas as áreas", número "Sem área (ativos)" e detalhe. Ao escolher um perfil que diz a área, ela vem marcada se o campo estiver vazio. Área desconhecida ou inativa é recusada com mensagem.
- **Tela "Áreas"** (botão no alto da tela Usuários, para gestão e RH): quem está sem área (escolha na hora), pessoas e áreas, criar, corrigir o nome e inativar. O RH define a área das pessoas mesmo sem poder editar contas.
- **Migração única** (`USR_AREA_MIGRACAO_V1`): só preenche área vazia, pelo perfil quando ele diz a área (Comercial, Financeiro, RH, Diretoria, Metrologia, Técnico → Técnica/Campo) ou por coluna antiga `SETOR/DEPARTAMENTO/CARGO/FUNCAO`, se existir. Administrador e Gestor não dizem a área: vão para a lista "sem área" da tela. O resultado (preenchidas e sem dedução) fica guardado e aparece na tela Áreas. Na base dev só existe a conta do sistema "Administrador", que não precisa de área. Em produção, a lista do que não foi possível deduzir aparece na tela Áreas depois da primeira abertura.
- **Programa de conduta:** área do envolvido na lista e no detalhe das ocorrências (computador e celular), na lista de colegas, nas sugestões, no Kanban e nos indicadores.

## 2. Integração com os outros módulos (sugestões de ocorrência)

Mapa do que existia: nenhum módulo falava com o Conduta. A única ligação era a central de pendências lendo o Conduta.

Agora os módulos geram **sugestões** (aba `qual_sugestao`); nada vira ocorrência sozinho. A gestão aceita (a ocorrência é registrada com a gestora como fiscal e segue o fluxo de sempre: outra pessoa homologa, o colaborador contesta) ou descarta com motivo (mínimo 10 caracteres). Cada sugestão tem chave única (não se repete), o vínculo com o registro de origem e o botão para abrir a origem.

| Origem | Regra | Código sugerido | Sai sozinha da fila |
|---|---|---|---|
| Frota, multas | Condutor `ENCONTRADO` pela retirada ou `MANUAL` (indicado pela gestão); ambíguas continuam na central como "multa sem condutor definido"; cancelada não entra | VEI-06 | não |
| Frota, avarias | Item do checklist em ordem na retirada e com problema na devolução (não existe registro próprio de avaria) | VEI-08 (descartar se não houve imprudência) | não |
| Frota, registro pela gestão | Retirada ou devolução registrada pela gestão no lugar do condutor | VEI-04 | não |
| Frota, KM a conferir | `Frota_kmAConferir_` | VEI-04 | sim, quando o KM é conferido |
| Auvo | O.S. finalizada sem foto (CAM-01), sem relato ou sem check-out (CAM-02); O.S. aberta há 3 dias ou mais (`AUVO_PENDENCIAS`) | CAM-01 / CAM-02 | O.S. aberta: sim, quando finaliza |
| Painel de qualidade | Cobrança (`QUALIDADE_OCORRENCIAS`) para técnico ou condutor com login | CAM-08 (só se procedente) | não |
| Minhas atividades | 3 ou mais atividades atrasadas no mesmo mês (prazo vencido ou concluída depois do prazo) | sem código | não |
| Avisos | Prazo de ciência vencido há 2 dias úteis | sem código | sim, quando a pessoa confirma |
| Assistente do ponto (COMMAND) | Ação nova da ponte `conduta.sugestao` (`SGO_PonteCommand.js`) → sugestão **informativa** | sem código | não |

- Coleta: na rotina diária das 6h, ao abrir a aba (no máximo a cada 3 horas) e no botão "Buscar sugestões agora". Condutor sem login e O.S. sem técnico vinculado aparecem como aviso na fila, com o caminho para corrigir.
- Central de pendências: tipo novo `conduta_sugestao` para a gestão ("N sugestões de ocorrência aguardam a decisão"). O Painel de qualidade passou a mostrar as pendências do Programa de conduta (`QUALIDADE_MODULOS_PENDENCIA`).
- Ocorrência ganhou as colunas `DESCRICAO`, `ORIGEM_MODULO`, `ORIGEM_TIPO`, `ORIGEM_ID`, `ORIGEM_ROTULO`, `ORIGEM_TELA`, `ORIGEM_LINK` e `SUGESTAO_ID` (linhas antigas ficam vazias). O detalhe mostra "O que aconteceu" e "Origem" com o link.
- Permissões: gestão aceita e descarta (nunca a sugestão sobre si); RH consulta; demais perfis não veem (sugestão não é acusação).

## 3. Metodologias

- **Kanban das ocorrências** (aba "Qualidade e planos"): Registrada → Em defesa (homologada no prazo de contestação, contestada, em recurso) → Homologada (firme) → Plano de ação → Concluída (plano concluído, ou firme sem necessidade de plano e com o prazo de recurso encerrado). Rejeitadas, anuladas e descartadas ficam fora, com contador e opção de mostrar. O cartão anda pelo fluxo; não se arrasta. "Plano recomendado" para G, GG e reincidente.
- **Análise de causa** (aba `qual_analise_causa`): problema, 3 a 5 porquês, causa raiz e Ishikawa 6M opcional, ligada a uma ocorrência ou a um código recorrente.
- **Plano de ação 5W2H com PDCA** (aba `qual_plano_acao`, código PA-aaaa-nnn): cada ação é uma atividade de Minhas atividades no módulo `conduta` (aparece em "Atividades do módulo"), com responsável e prazo; não há outro sistema de tarefas. Executar → Verificar só com todas as ações concluídas ou canceladas; verificação da eficácia escrita; "não eficaz" volta a Planejar no ciclo seguinte; concluir exige o que foi padronizado; cancelar exige motivo. Histórico de cada passo no plano.
- **Indicadores por área** (período pela data do fato): pessoas, registradas, firmes, reincidência, tempo médio de homologação em dias úteis, homologadas no prazo, descartadas por prazo, planos (concluídos/total, %, atrasados), eficácia e sugestões pendentes; total da empresa; códigos recorrentes (3 ou mais firmes) com atalho para análise e plano.
- Telas novas em `SGO_Conduta_TelaQualidade.js`, carregadas por `JS_Conduta.html` logo depois do módulo e ligadas às funções `tplConduta_*`; servidor em `SGO_Conduta_Qualidade.js`; APIs novas no despacho do Conduta.
- Celular: na tela rápida do Programa de conduta, a gestão e o RH têm "Sugestões de ocorrência" e "Kanban, planos de ação e indicadores", que abrem o módulo completo na aba certa (Kanban com rolagem lateral só dentro do quadro).

## 4. Relatórios: o que falta (para a frente de relatórios)

Dados novos disponíveis: `SGO_areaDoUsuario_(u)`, `Conduta_apiIndicadoresQualidade`, `Conduta_apiKanbanQualidade`, `Conduta_apiListarPlanos`, `Conduta_apiListarSugestoes`, colunas `DESCRICAO` e `ORIGEM_*` da ocorrência.

| Relatório | O que falta |
|---|---|
| Fechamento mensal | Indicadores por área (reincidência, tempo de homologação, % no prazo, descartadas por prazo); códigos recorrentes do mês; planos de ação abertos, concluídos e eficácia; sugestões do mês por origem (aceitas, descartadas, pendentes); taxa de anulação em contestação (qualidade do registro); comparação com o mês anterior por área |
| Semanal | Sugestões novas da semana e pendentes; ocorrências paradas em "Registrada" perto do prazo de homologação (vão ser descartadas); planos com ação atrasada; ciência de avisos pendente |
| Extrato do colaborador | "O que aconteceu" de cada ocorrência; origem quando veio de sugestão; planos de ação em que a pessoa é responsável e a situação das ações |
| Relatório da equipe | Área pela função `SGO_areaDoUsuario_` (já usa); coluna de reincidência por pessoa; sugestões pendentes sobre a pessoa (só para gestão e RH); totais por área iguais aos indicadores |
| Missões | Área do executante; missões recusadas com o motivo; tempo entre o lançamento e a decisão |
| Novo (sugerido) | Relatório de qualidade do programa: Kanban resumido, indicadores por área, planos 5W2H com PDCA e análises de causa, para revisão pela direção (ISO 9001, 9.3) |

## 5. Pente fino geral

### Corrigido

1. O servidor aceitava registrar ocorrência para conta de cliente ou pessoa inativa (a ocorrência ficava fora do farol de todos). Agora recusa com mensagem.
2. A prévia de "Aplicar agora" anunciava fechar mês com missão aguardando aprovação, mas o fechamento recusava. A prévia usa a mesma regra.
3. Tela Usuários: `podeDarDiretoria` não chegava ao formulário; a Diretoria não via o perfil "Diretoria" para dar a outra pessoa (o servidor permitia).
4. Ocorrência sem campo de descrição: quem homologava só via a legenda da foto, e só quando havia foto. Campo "O que aconteceu" (obrigatório na tela, mínimo 10 caracteres) no computador e no celular; o detalhe mostra o fato e a origem.
5. "Preencha todos os campos." sem dizer qual: agora lista os campos que faltam.
6. Detalhe da ocorrência com dois atributos `style` no mesmo elemento ("Sem foto anexada").
7. Lista de colegas e extrato liam `SETOR/DEPARTAMENTO`, que não existem (ver item 1).
8. Gestão no celular não chegava às sugestões nem aos planos.

### Conferido sem defeito

Permissões por perfil no ensaio: Administrador, Diretoria e Gestor veem e decidem; RH vê as abas novas, sem botões de decisão, e gere as áreas; Técnico e Comercial não veem as abas novas e o servidor recusa as APIs com mensagem. Datas em dd/mm/aaaa e números com vírgula nas telas novas. Sem erro de console nas telas (o único registro é um 404 de arquivo do Drive que não existe na cópia da base, anterior a esta frente). Sem rolagem lateral no celular (390 px).

### Observações não corrigidas (para decidir ou para depois)

- `Conduta_processarPrazosVencidos_` muda para Descartada e Firme sem gravar o passo em `HISTORICO_JSON` e sem avisar quem registrou que a ocorrência foi descartada por falta de homologação.
- A mensagem de erro da tela junta a orientação do campo com o texto padrão ("... toque em Registrar de novo. Confira os dados e tente de novo ...").
- Pendências antigas de 15/10 continuam: n pelo mês sem data de admissão, prompt da IA sem limite do verde, parâmetro 0 vira padrão.

## 6. Decisões do dono

1. **Prazo de registro da sugestão.** Hoje conta da data em que o SGO+ encontrou o caso (multa e falha de O.S. chegam depois dos 2 dias úteis do fato). Para voltar a contar do fato, criar o parâmetro `SUGESTAO_PRAZO_PELA_DESCOBERTA = 0` em `qual_parametro`. Não muda o registro manual.
2. **Catálogo:** não há código para atraso de atividade, ciência de aviso vencida, check-out esquecido nem esquecimento de ponto. Hoje a gestão escolhe um código existente ou descarta. Criar códigos mexe no catálogo (decisão formal).
3. **"O que aconteceu" obrigatório:** obrigatório só na tela; o servidor ainda aceita vazio (registros antigos e integrações). Tornar obrigatório também no servidor?
4. **Área de Administradores e Gestores:** o perfil não diz a área; escolher na tela Áreas.
5. **COMMAND:** para o resumo do 3º esquecimento chegar como sugestão, o COMMAND precisa chamar a ação assinada `conduta.sugestao` em `cmdPontoResumos_` com `{ sgoUsuarioId: USUARIOS.sgo_id, mes, quantidade, texto, chave }`. O COMMAND não foi alterado. Também vale decidir se as áreas do Metrolab's Way (`MPS_AREAS`) passam a ler `CAD_USUARIOS.AREA`.
6. **Sugestão visível ao envolvido?** Hoje não (só a ocorrência registrada e homologada chega a ele).

## 7. Arquivos

Novos: `SGO_Areas.js`, `SGO_Conduta_Qualidade.js`, `SGO_Conduta_TelaQualidade.js`, `tests/conduta-qualidade-areas.test.cjs`.
Alterados: `SGO_Usuarios.js`, `JS_Admin.html`, `SGO_Conduta_Ocorrencias.js`, `SGO_Conduta_Setup.js`, `SGO_Conduta_Ciencia.js`, `SGO_Conduta_ConteudoModulo.js` (por trecho, decodificado e compilado), `JS_Conduta.html`, `JS_Core.html` (celular), `SGO_Alertas_Central.js`, `SGO_PonteCommand.js`, `SGO_Qualidade_Main.js`, `SGO_Qualidade_ConteudoModulo.js`, `SGO_Ajuda_Conduta.js`, `SGO_Ajuda_Administracao.js`, `SGO_Conduta_Biblioteca.js`, `docs/MANUAL_CONDUTA_FISCAL.md`, `docs/MANUAL_CONDUTA_COLABORADOR.md`.

## 8. Como foi testado

- `node --test tests/*.test.cjs`: 110 de 110 (8 novos: migração das áreas, permissões das áreas, coleta sem duplicar, aceitar com origem e prazo, descarte com motivo, KM resolvido, plano 5W2H/PDCA, análise de causa, Kanban e indicadores).
- `npx vitest run` no `sgo_servidor`: 110 de 110.
- Servidor de ensaio com cópia da base dev: usuários de teste por perfil, veículo, condutor, multa com condutor indicado, cobrança, três atividades atrasadas, ocorrências pelo fluxo completo (registro, homologação por outra gestora, contestação, julgamento) e uma reincidência. Playwright em 1366 px (Gestor, Gestor 2, Diretoria, RH, Técnico, Comercial, Administrador) e iPhone 13 (Gestor, Técnico): aceitar e descartar sugestão, análise de causa, plano criado com a atividade em "Atividades do módulo", indicadores, detalhe com origem, ajuda, tela Áreas no computador e no celular. Servidor parado no fim.
