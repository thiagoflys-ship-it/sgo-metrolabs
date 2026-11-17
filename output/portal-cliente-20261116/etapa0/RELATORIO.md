# Portal do cliente — Etapa 0: relatório de implementação

**Data:** 17/11/2026. **Onde:** `output/financeiro-20261116/cand11` (cópia da produção). Nada foi publicado, nada foi commitado, não houve acesso à produção nem ao banco.
**Especificação:** `output/portal-cliente-20261116/ESPEC_PORTAL_CLIENTE.md`, itens 0.1 a 0.6 e 3.3, com as decisões aceitas pelo dono.

## 1. O que mudou

### 1.1 Arquivos novos no legado

| Arquivo | Funções e conteúdo |
|---|---|
| `SGO_PortalCliente_Config.js` | Tabelas `CLI_CONTRATOS`, `CLI_CONTRATOS_HIST`, `PCL_ACESSOS`, `PCL_FUNCOES_OBSERVADAS` e `PCL_REGRAS_HIST` (`PCl_garantirAbas_`, com as colunas de data como texto). Regras do portal (`PCl_regras_`, propriedade `PCL_REGRAS`: carência de 30 dias, consulta de 12 meses, transição CONSULTA e contato comercial). Quatro caixas registradas pelo próprio módulo: `PORTAL_CLIENTE_CONTRATOS_VER`, `_CONTRATOS_EDITAR`, `_SUSPENDER` e `_REGRAS`. Registro de acessos `PCl_registrarAcesso_`. **Projeção pública** por lista branca: `PCL_CAMPOS_PUBLICOS`, `PCl_projetar_`, `PCl_eqPublico_`, `PCl_unPublica_`, `PCl_docPublico_`, `PCl_cliPublico_` e `PCl_publicoSeCliente_`. O link de documento vira `/arquivos/<id>`, nunca o link do Drive. |
| `SGO_PortalCliente_Contratos.js` | `PCl_situacaoAcesso_(clienteId, unidadeId, hojeIso)`: a função única da situação (PLENO, CARENCIA, CONSULTA, SUSPENSO, SEM_ACESSO), que vale o melhor contrato da unidade. `PCl_contratosDoCliente_` lê CLI e LIC; os contratos de Licitações são só lidos (VIGENTE, ENCERRADO e RESCINDIDO). Transição da decisão 4: o cliente que já tem conta e ainda não tem contrato fica em CONSULTA até a revisão. `PCl_motivoLogin_`. Tela interna: `PClC_lista_`, `PClC_ficha_`, `PClC_salvar_` (as faltas voltam por campo; cada gravação gera uma versão e uma linha no histórico; o PDF do contrato vai para uma pasta interna), `PClC_encerrar_`, `PClC_suspender_`, `PClC_preCarga_` e `PClC_revisar_`. |
| `SGO_PortalCliente_Seguranca.js` | **Trava de arquivo** `PortalCliente_arquivoPermitido_`: nega por padrão. Abre só por regra explícita (`PCL_REGRAS_ARQUIVO`): Arquivo de documentos do cliente, relatório da O.S. encerrada, versões emitidas do relatório (sem rascunho nem versão interna), orçamento enviado e o comprovante, foto liberada (`PUBLICO=SIM`), anexo liberado ao cliente, documento A4 com `PUBLICO=CLIENTE`, relatório do ciclo da lavadora e relatório de ronda. Com SUSPENSO ou SEM_ACESSO, nada abre. Cada recusa grava `ESCOPO_RECUSADO`. **Lista fechada:** `PCL_FUNCOES_CLIENTE`, a lista fixa de funções que nunca entram `PCL_FUNCOES_NUNCA` e `PortalCliente_portaoFuncao_` (modo OBSERVAR ou RECUSAR, com o registro agregado por dia, função e pessoa). Resumo e gravação da chave: `PClS_resumo_` e `PClS_salvar_`. |
| `SGO_PortalCliente.js` | Entrada única `PortalCliente_api(sessionId, acao, dados)`. O cliente só tem a ação `situacao`, que devolve o texto neutro. Cada ação interna confere a sua caixa. `PCl_salvarRegras_`. |
| `SGO_Ajuda_PortalCliente.js` | Ajuda da tela `portal_cliente_contratos`. |
| `JS_PortalCliente.html` | Tela interna com as abas Contratos (lista, ficha e formulário), Pré-carga, Segurança e Regras. |
| `JS_PortalCliente_Ajuda.html` | Explicação de cada campo (`PCL_DICAS`) e o bloco "Como fazer nesta aba" (`PCL_GUIAS`), no padrão OMIE_DICAS. |

### 1.2 Arquivos alterados no legado

| Arquivo | O que mudou |
|---|---|
| `SGO_Auth.js` | `login`: a conta CLIENTE passa por `motivoClienteAuth_`, que recusa conta sem cliente, cliente inativo, SUSPENSO e SEM_ACESSO e grava `LOGIN_RECUSADO`. `validarSessao`: na reconferência de 5 minutos, a sessão de cliente nessas situações cai. `motivoRepresentadaAuth_` passa a respeitar a vigência, por meio do novo `vigenciaEncerradaAuth_`, com a carência das regras ou 30 dias. |
| `SGO_Representacao_Config.js` | `Rep_ativa_` considera `VIGENCIA_FIM` mais a carência (achado L11). Funções novas: `Rep_vigenciaEncerrada_` e `Rep_motivoInativa_`. |
| `SGO_Representacao.js` | As duas mensagens `REP_INATIVA` passam a dizer o motivo real: suspensão ou contrato terminado. |
| `SGO_Representacao_Documentos.js` | `Representacao_arquivoClientePermitido_` entrega a decisão a `PortalCliente_arquivoPermitido_`. O caminho de reserva também nega (`return false` no lugar de `return true`). |
| `SGO_Equipamentos.js`, `SGO_Documentos.js`, `SGO_Unidades.js`, `SGO_Clientes.js` | As funções listar, obter e pesquisar entregam à conta de cliente só os campos públicos (`PCl_publicoSeCliente_`). |
| `SGO_CadastrosPainel.js` | `CadPainel_base_` aplica a projeção quando a sessão é de cliente. Isso cobre `cadastrosPainel` e `cadastrosDetalhe`. |
| `SGO_Ajuda.js`, `Index.html`, `JS_Core.html` | Menu "Portal do cliente > Contratos de clientes", visível só para quem tem a caixa VER. Inclusão dos dois arquivos JS, a rota `abrir('portal_cliente_contratos')`, `PortalCli_iniciar_` nos dois pontos de início e o título da tela. |

Os arquivos `SGO_Equipamentos.js`, `SGO_Documentos.js` e `SGO_CadastrosPainel.js` misturam ou usam CRLF. As edições preservaram o fim de linha de cada arquivo, e a sintaxe de todos foi conferida.

### 1.3 Testes e documentos

- `tests/portal-cliente-etapa0-20261117.test.cjs` (novo, 11 testes): T0.1 a T0.7 e T0.9, os contratos, o piloto, os perfis internos e a representada sem mudança, a tela, a ajuda e o manual.
- `tests/representacao-documentos.test.cjs`: uma linha afirmava o defeito, que um arquivo de outro módulo abria para o cliente (`true`). Ela passa a esperar `false`, com um comentário explicando o motivo.
- `docs/MANUAL_MODULO_PORTAL_CLIENTE.md` (novo): manual interno completo, com o passo a passo do piloto e a instrução da chave.
- `docs/MANUAL_MODULO_REPRESENTACAO.md`: vigência da representada (seção 2).
- `docs/MANUAL_SEGURANCA_ACESSO.md`: o que fazer quando a mensagem de entrada fala do acesso da empresa.
- `docs/MANUAL_CLIENTES_UNIDADES_VINCULOS.md`: o que a conta de cliente recebe e o que ela abre.

## 2. O que ficou no servidor como patch, e por quê

**A trava de arquivo não precisa do servidor.** O servidor já chama `Representacao_arquivoClientePermitido_` para a sessão CLIENTE (`servidor.ts`, por volta da linha 553), e essa função agora delega a decisão. Ela vale assim que o legado for publicado.

**A lista fechada precisa do servidor.** O legado não sabe qual função o `/api/run` chamou, porque o worker chama a função direto. O patch fica em `etapa0/servidor/`:

- `etapa0-servidor.patch`: diff unificado. A base é o `src/servidor.ts` da cópia de trabalho de `c:\Users\venda\projetos\sgo_servidor` (commit `b1fd0b9`, com alterações locais), sha256 `a4f38b73…7ec`, e o `src/sistemas.ts`, sha256 `68145a21…d0b`. As cópias exatas dessas bases estão em `etapa0/servidor/base/` e o resultado em `etapa0/servidor/novo/`. Como o repositório pode divergir da produção, **aplique sobre o arquivo do contêiner pelos pontos de ancoragem**: o import de `./sistemas.js`, a linha `const perfilDaSessao = …`, o comentário "31/10/2026 (pedido do dono): sessão com troca de senha pendente…" e a mensagem 403 do CLIENTE em `/arquivos`.
- **O que o patch faz.** `sistemas.ts` ganha `PERFIL_CLIENTE`, `PORTAO_CLIENTE_FN`, `FUNCOES_CLIENTE_BASICAS` e `MSG_CLIENTE_RECUSADA`. No `servidor.ts`, a sessão CLIENTE (vinda no 1º argumento, no `sessionId` dentro dele ou no cookie) consulta `PortalCliente_portaoFuncao_` no legado. A decisão fica guardada 60 s por sessão e função. O servidor responde 403 com a mensagem do legado só quando o legado diz `permitir:false`. Sem a função no legado, ou com erro, a chamada passa, porque a chave só é ligada depois do legado publicado. O texto do 403 de `/arquivos` para cliente também foi atualizado.
- **Teste do servidor.** O patch também cria `testes/portalCliente.test.ts` e o simulador `testes/fixtures/simulador_portal_cliente/`.
- **Verificação feita numa cópia temporária** (fora do repositório):
  - `tsc --noEmit`: código de saída 0;
  - `vitest` com `portalCliente`, `representacao`, `sistemas`, `segurancaAcesso`, `loginEmail` e `repeticao`: todos passaram;
  - `git apply --check`: o patch aplica limpo sobre a base.
- **Ordem recomendada:** publicar o legado, depois aplicar o patch e reiniciar o servidor. A observação começa sozinha na primeira chamada de uma conta de cliente.

Há também `etapa0/legado-etapa0.patch`, com o diff do legado desta etapa. A base é `financeiro-20261116/cand10`, idêntica à cand11 original nos arquivos tocados (conferido pela contagem de linhas).

## 3. Configurações e padrões

| Chave | Onde | Padrão |
|---|---|---|
| `PCL_FUNCOES_CFG` | Script Property | `modo: OBSERVAR` (**recusa desligada**), `dias: 7` (de 1 a 60), `desde` na primeira chamada, `extras: []` |
| `PCL_REGRAS` | Script Property | `carenciaDias: 30`, `consultaMeses: 12`, `transicao: CONSULTA` (alternativa: PLENO por 60 dias), `contatoComercial: "o Comercial da Metrolabs"` |

**Como ligar a recusa.** O caminho é Portal do cliente > Contratos de clientes > aba Segurança, sempre com motivo e por Administrador ou Diretoria. Antes de ligar, revise as funções "fora da lista" e acrescente as que o cliente usa. Depois escolha "Chave de recusa = Ligada", escreva o motivo e toque em Gravar. O efeito vale em até 1 minuto, desde que o patch do servidor esteja aplicado. As funções dos módulos internos nunca entram na lista.

**Ponto de atenção.** Na inicialização, a casca chama vários `*_iniciar_` de módulos internos para todos os perfis. Na observação, esses módulos vão aparecer como "fora da lista". Com a recusa ligada, essas chamadas recebem 403 e a casca só esconde o menu. Confira na observação se alguma tela do cliente depende de uma delas (por exemplo, a central de pendências ou os vencimentos).

## 4. Como cadastrar o contrato do piloto

O piloto é a CENTRAL DE REPROCESSAMENTO DE MATERIAIS LTDA, CNPJ 01129614000130, id `f680a58b-ae58-4b83-b1ba-8a250f7cc76d`. Hoje ela fica em **SEM_ACESSO**, porque não tem conta nem contrato.

1. Abra Portal do cliente > Contratos de clientes > Registrar contrato e busque "01129614".
2. Em Unidades, deixe "Todas".
3. Preencha número, origem (contrato assinado com o PDF, ou proposta aprovada), objeto, serviços com a frequência, início e fim, responsável e o motivo "Contrato do piloto do Portal do cliente".
4. Grave. A situação passa a PLENO.
5. Envie o convite em Cadastros > Clientes > Mais > Enviar acesso ao portal.

O mesmo passo a passo está em `docs/MANUAL_MODULO_PORTAL_CLIENTE.md`, seção 3.1.

## 5. Placar

| Verificação | Resultado |
|---|---|
| Lista dirigida, primeira rodada (`rodar-lista.sh`) | 31 arquivos verdes. Duas exceções: `cadastro-equipamento-campos`, com 7 aprovados e 1 falha que já existia na referência (`SGO_textoFalhaOperador_` não definido no teste), e o teste novo, com 10/1 por falta do manual. O manual foi escrito depois e o teste novo ficou em 11/0, código de saída 0 |
| Suíte completa (`etapa0/suite.txt`) | **2316 aprovados / 63 falhas** em 249 arquivos. Referência `suite-opcaoB.txt`: 2305/63. A diferença de +11 é o teste novo |
| Comparação arquivo a arquivo com a referência | **Nenhum arquivo piorou** |
| Servidor | tsc 0; vitest com 6 arquivos, todos aprovados |

## 6. O que ficou de fora desta etapa, com o motivo

- **CONSULTA não bloqueia a abertura de pedido nesta etapa.** A conta em CONSULTA entra e o pedido ainda abre normalmente. O "Pedir atendimento avulso" (`SEM_CONTRATO`) é a etapa 2. Hoje, CONSULTA só muda o texto da situação; SUSPENSO e SEM_ACESSO bloqueiam a entrada e os arquivos.
- **Ainda não foram feitos:**
  - 0.5 (contas de cliente fora das listas internas, item T0.8): só avaliado;
  - a trava de `exigirSessao` por `SGO_PCL_MODULO`: fica para a etapa 6, como diz a espec;
  - a rotina diária e os avisos PI01/PC10;
  - as capturas de tela reais (a pasta `capturas/` está vazia).
- **Riscos que pedem conferência antes de publicar:**
  - **Vigência das representadas:** confira o `VIGENCIA_FIM` de cada representada, inclusive a Brasmedical. Se a data estiver no passado há mais de 30 dias, a representada deixa de entrar;
  - **Cliente inativo:** conta de cliente ligada a cliente com cadastro inativo passa a ser recusada no login;
  - **Responsável da unidade:** `RESPONSAVEL` da unidade saiu da projeção do cliente, como "responsável interno" na espec. Se esse campo for o contato do hospital, recoloque-o na lista branca.

## 7. Lista exata de arquivos

**Legado, arquivos novos (cand11):**
- `SGO_PortalCliente.js`
- `SGO_PortalCliente_Config.js`
- `SGO_PortalCliente_Contratos.js`
- `SGO_PortalCliente_Seguranca.js`
- `SGO_Ajuda_PortalCliente.js`
- `JS_PortalCliente.html`
- `JS_PortalCliente_Ajuda.html`

**Legado, arquivos alterados (cand11):**
- `SGO_Auth.js`
- `SGO_Representacao_Config.js`
- `SGO_Representacao.js`
- `SGO_Representacao_Documentos.js`
- `SGO_Equipamentos.js`
- `SGO_Documentos.js`
- `SGO_Unidades.js`
- `SGO_Clientes.js`
- `SGO_CadastrosPainel.js`
- `SGO_Ajuda.js`
- `Index.html`
- `JS_Core.html`

**Testes:**
- `tests/portal-cliente-etapa0-20261117.test.cjs` (novo)
- `tests/representacao-documentos.test.cjs` (alterado)

**Documentos:**
- `docs/MANUAL_MODULO_PORTAL_CLIENTE.md` (novo)
- `docs/MANUAL_MODULO_REPRESENTACAO.md`
- `docs/MANUAL_SEGURANCA_ACESSO.md`
- `docs/MANUAL_CLIENTES_UNIDADES_VINCULOS.md`

**Entregas (`output/portal-cliente-20261116/etapa0/`):**
- `RELATORIO.md`
- `suite.txt`
- `suite-execucao.log`
- `legado-etapa0.patch`
- `servidor/etapa0-servidor.patch`
- `servidor/base/`
- `servidor/novo/`
- `servidor/testes/portalCliente.test.ts`
- `servidor/testes/fixtures/simulador_portal_cliente/SimuladorPortalCliente.js`
- `capturas/` (vazia)
