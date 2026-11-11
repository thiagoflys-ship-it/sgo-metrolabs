# Qualificação: "o que falta", simulação didática e código do dono (11/11/2026)

Estado real: **preparado e testado localmente** no espelho `output/poderes-20261110/base/legado` (emulador). **Não publicado**, sem ssh, sem commit. Nada foi verificado em produção.

## Item 1 — "O que falta" no relatório completo de qualificação (concluído)

Caso real (secadora, 10/11/2026): só a planilha de dados REE-2026-00002 (módulo `ESTUFA_DADOS`) foi emitida. O relatório completo só reúne relatórios de ensaio (`ESTUFA`), por isso a lista ficava vazia.

- `SGO_QualifEquipamento.js`: nova `SGO_QEQ_diagnosticoEnsaios_(ident, cfg)` (só leitura). Quando o equipamento não tem relatório de ensaio emitido, ela devolve o diagnóstico exato:
  - (a) `PLANILHA_SEM_RELATORIO`: "Você emitiu a planilha de dados <nº> em <data>, mas o relatório de ensaio deste equipamento ainda não foi emitido…", com o botão que leva à emissão do relatório de ensaio;
  - (b) `ENSAIO_SEM_VINCULO` (reaproveita `SGO_QEQ_emissoesSemVinculo_`, com o botão "Vincular a este equipamento") e `ENSAIO_OUTRO_EQUIPAMENTO` (mesma TAG, ligado a outro equipamento: diz para corrigir em Cadastros › Vínculos);
  - (c) `ENSAIO_AGUARDANDO_APROVACAO` (quem enviou, quando, quem aprova: nomes dos usuários ativos com os perfis aprovadores e os perfis) e `ENSAIO_DEVOLVIDO` (com o motivo);
  - (d) nada emitido: passo a passo de 4 itens.
  - Nova `SGO_QEQ_nomesDosPerfis_` para dizer quem aprova.
- `apiEquipamento` devolve `diagnostico` em Estufa/banho/secadora, Autoclave, Lavadora e Cadeia de frio (Cadeia passou a devolver também `semVinculo` e ganhou `apiVincular`, com a mesma regra comum que só preenche campo vazio).
- Telas: quadro amarelo com texto justificado, botões com quebra de linha no celular (`flex-wrap`): Estufa e Cadeia (seção 6 e "Aguardando aprovação"), Autoclave e Lavadora (aba "Gerar relatório" e "Relatórios sem vínculo"). O aviso antigo ficou como reserva.
- Rótulos: a planilha de dados da estufa passou a dizer "Planilha de dados nº" (antes "Relatório nº"); o número já emitido não muda. Depois de emitir a planilha, a estufa avisa que ela não substitui o relatório de ensaio e oferece o botão "Ir para a seção 6". As listas de aprovação já rotulavam "Planilha de dados" × "Relatório de ensaio".
- Ajuda: `SGO_Ajuda_Qualificacao.js` (Autoclave, Lavadora, Cadeia de frio, Estufa), item novo em "Problemas".
- Baixa temperatura: não tem relatório de ensaio consolidado nem modo de dados reconstituídos; não se aplica.

## Item 2 — Simulação didática (concluído nos quatro módulos com dados reconstituídos)

Novo `SGO_QualifSimulacao.js` (comum):
- marca d'água "SIMULAÇÃO DIDÁTICA", `position:fixed`, rgba(190,30,30,.13), 21pt, -35°, centralizada; tira a faixa `aviso-simulado` e o aviso de tela `sgo-docsalvar-aviso` (sem outro texto de aviso);
- numeração própria `SIM-AAAA-NNNN` (propriedade `SGO_QSIM_SEQ_AAAA`): `-E` relatório de ensaio, `-D` planilha de dados, sem sufixo para o relatório completo. A sequência oficial não anda (antes o modo simulado gastava número REE oficial);
- **aba nova `QUALIF_SIMULACOES`** (colunas ID, MODULO, TIPO, NUMERO, CLIENTE, CNPJ, TAG, CLIENTE_ID, UNIDADE_ID, EQUIPAMENTO_ID, RESULTADO, CRIADO_POR, CRIADO_EM, HTML_ID, RESUMO_JSON, ORIGEM_JSON). Fica separada de `QUALIF_EMISSOES`, por isso não aparece na ficha, no QR code, no Arquivo de documentos, na situação, nas pendências nem em "Enviar ao cliente" (sem PDF). O HTML vai para a pasta própria do Drive "SGO+ - Simulações didáticas (não entregar a clientes)" (propriedade `SGO_QSIM_PASTA_ID`), fora das pastas dos clientes;
- trava dupla contra número SIM no oficial: `SGO_QE_registrar_` (SGO_QualifEmissao.js) e `SGO_DocSalvar_finalizarCertificado_` (SGO_DocSalvar.js) recusam SIM-… fora do modo simulado (antes de salvar qualquer arquivo); a tela da estufa não copia mais o número SIM para o campo do número;
- o número SIM só sai com `modoEntrada = SIMULADO_ADMIN`, e a senha é conferida de novo com o validador do módulo. A estanqueidade reconstituída da autoclave continua como antes.

Módulos:
- emissão do relatório de ensaio e da planilha simulados (Estufa `EstufaQ_emitirEnsaio_`/`EstufaPlanDados_emitir_`; Cadeia `reEmitir_`/`pdEmitir_`; Autoclave `acEmitir_`/`pdEmitir_`; Lavadora `lvEmitir_`/`pdEmitir_`): guardam na simulação com o resumo do ensaio. O caminho oficial (`if (!simulado)`) não mudou;
- relatório completo simulado: `montarContexto_(…, opcoes)` com `opcoes.simulacao` (só o servidor liga) troca a fonte para os ensaios simulados. As APIs novas são `apiSimListar`, `apiSimAbrir` e `apiSimQualificacao` (senha obrigatória, texto padrão sem IA). O oficial recusa o id simulado e o simulado recusa o id oficial;
- telas: lista "Simulações didáticas" (reabrir, marcar ensaios simulados, "Gerar relatório completo de qualificação (simulação)") na Estufa (seção 9), na Cadeia e nos relatórios de qualificação da Autoclave e da Lavadora;
- ajuda atualizada nas quatro telas.

## Item 3 — Código pelo WhatsApp do dono (concluído)

Novo `SGO_SimuladorCodigo.js`:
- código de 6 dígitos (`SegAcesso_gerarCodigo_`), enviado ao celular de `CAD_USUARIOS.CELULAR` do usuário dono (login `admin`; pode ser trocado pela propriedade `SIMULADOR_CODIGO_DONO`), pelo mesmo envio do código de acesso do login (`SegAcesso_enviarWhatsapp_`, modelo de autenticação da Meta);
- vale 10 minutos, uso único, até 5 tentativas (na 5ª errada o pedido é cancelado e o dono é avisado), espera de 1 minuto entre pedidos. Só o hash fica guardado (propriedade `SIMCOD_P_…`);
- liberado, vale 2 horas para a sessão (`SIMCOD_L_…`, chave pelo hash da sessão);
- registro de cada pedido, liberação e recusa: `SegAcesso_registrar_` (aba `SYS_SEGURANCA_ACESSO`) e `SGO_DATA.log`. Eventos: `SIMULADOR_CODIGO_PEDIDO`, `_LIBERADO`, `_RECUSADO`, `_SEM_WHATSAPP`. O dono recebe pelo `SGO_notificar_` (WhatsApp e e-mail) quem pediu e a hora, sem o código;
- quem pode pedir: a regra atual do botão "Relatório interno" (perfil ADMIN ou o Bento autorizado, mesmo ID). Agora a regra também vale no servidor;
- sem WhatsApp configurado, sem celular ou sem dono no cadastro: a tela explica o que falta e não libera;
- trava `SGO_SimCodigo_exigirNaChamada_` nos 8 despachos (Estufa, Cadeia, Autoclave, Lavadora e os 4 de qualificação). Sem liberação, nenhuma chamada do simulador passa: `apiValidarSenhaSimuladorAdmin`, `modoEntrada` SIMULADO_ADMIN/LEAK_TEST_RECONSTITUIDO, `modoRelatorioSimulado` e `apiSimQualificacao`;
- chamadas da tela: `simuladorCodigoSituacao`, `simuladorCodigoPedir` e `simuladorCodigoValidarSenhaCodigo` (o nome com "ValidarSenha" ganha o freio de tentativas do servidor). Ajudante comum `SGO_SimCodigo_garantir()` em `JS_SegurancaAcesso.html`, chamado no início dos 4 botões "Relatório interno", antes da senha.

## Arquivos

Alterados no espelho de produção (`base/legado`), com os finais de linha preservados (conferido arquivo a arquivo):

- Qualificação comum: SGO_QualifEquipamento.js.
- Estufa: SGO_EstufaBanhoRel_ModeloOficialNovo.js, SGO_EstufaBanhoRel_Qualif.js, SGO_EstufaBanhoRel_PlanilhaDados.js, SGO_EstufaBanhoRel_Main.js, SGO_EstufaBanhoRel_ConteudoModulo.js.
- Cadeia de frio: SGO_CadeiaFrioRel_ModeloOficial.js, SGO_CadeiaFrioRel_Emissao.js, SGO_CadeiaFrioRel_PlanilhaDados.js, SGO_CadeiaFrioRel_Main.js, SGO_CadeiaFrioRel_ConteudoModulo.js.
- Autoclave: SGO_AutoRel_ModeloOficialNovo.js, SGO_AutoRel_CertificadoRelatorio.js, SGO_AutoRel_PlanilhaDados.js, SGO_AutoRel_Main.js, SGO_AutoRel_ConteudoModulo.js, JS_TemplateAutoclave.html.
- Lavadora: SGO_LavRel_ModeloOficialNovo.js, SGO_LavRel_CertificadoRelatorio.js, SGO_LavRel_PlanilhaDados.js, SGO_LavRel_Main.js, SGO_LavRel_ConteudoModulo.js, JS_TemplateLavadora.html.
- Comuns: JS_SegurancaAcesso.html, SGO_Ajuda_Qualificacao.js, SGO_QualifEmissao.js, SGO_DocSalvar.js.

Novos: SGO_QualifSimulacao.js, SGO_SimuladorCodigo.js.

Nos `*_ConteudoModulo.js`, a edição foi feita no conteúdo decodificado e regravada por JSON.stringify, com ida e volta conferida antes. Todo .js alterado passou no `node --check`. Os blocos `<script>` dos HTML e dos módulos decodificados também foram compilados.

Testes:
- Novos: `tests/qualif-diagnostico-ensaios.test.cjs` (7), `tests/qualif-simulacao-didatica.test.cjs` (9) e `tests/qualif-simulador-codigo.test.cjs` (7). Na fase produção eles ficam como "skip", porque a função ou o arquivo ainda não existe lá.
- Ambientes: `_autoclave_ambiente.cjs` e `_baixatemp_ambiente.cjs` ganharam um stub de `CadQ_exigirVinculosCompletos_` que aprova, pedido do diagnóstico; o cadastro de teste já é completo. `_modelo_oficial_ambiente.cjs`, `_cadeiafrio_ambiente.cjs` e `_lavadora_ambiente.cjs` carregam `SGO_QualifSimulacao.js` quando ele existe.
- Executor: `output/poderes-20261110/rodar-qualif.cjs` (PRELOAD e TODOS=1 opcionais). Resultados em `output/poderes-20261110/qualif-sim/`.

## Placar de testes

Resultados em `output/poderes-20261110/qualif-sim/`. A comparação foi feita teste por teste (nome por nome), não só pelo total.

**Qualificação (autoclave\*, lavadora\*, cadeiafrio\*, estufa\*, baixatemp\*, qualificacao\*, relatorios-qualificacao\*, seguranca-acesso, qualif-\*):**

| Rodada | Pass | Fail |
|---|---|---|
| Candidato antes (código original, ambientes antigos) | 159 | 40 |
| Candidato antes, só com o stub `CadQ_exigirVinculosCompletos_` | 184 | 15 |
| Candidato depois | 207 | 15 |
| Produção antes | 159 | 40 |
| Produção depois (testes novos em skip) | 184 | 15 |

Candidato depois: mesmas 15 falhas antigas (`estufa-simulado` 14 e `cadeiafrio-motor` 1) e 23 testes novos, todos verdes.

**Suíte inteira (195 arquivos):**

| Fase | Antes | Depois | Falhas novas |
|---|---|---|---|
| Candidato | 1742 pass / 92 fail | 1765 pass / 92 fail | 0 |
| Produção | 1381 pass / 453 fail | 1412 pass / 422 fail | 0 (34 a menos) |

As 92 falhas do candidato são antigas e não têm relação com este trabalho (Omie, Licitações, CertCal, etc.). Na produção, as três diferenças por nome são só o rótulo da pasta da cópia dos testes antigos; são as mesmas falhas.

**Conferências:**

- `node --check`: 26 de 26 arquivos .js alterados ou novos.
- Blocos `<script>` compilados nos HTML alterados e nos módulos decodificados.
- Finais de linha conferidos arquivo a arquivo (CRLF continua CRLF; `JS_SegurancaAcesso.html` continua LF).

## O que ficou

- **Publicar** depois de revisar. Antes, conferir na produção:
  - o celular do usuário `admin` em CAD_USUARIOS;
  - o modelo `sgo_codigo_acesso` aprovado na Meta.
  Sem isso, o modo de dados reconstituídos **fica fechado para todos**, por desenho.
- Só existe teste no emulador: falta um ensaio de verdade na tela completa renderizada pelo servidor, com navegador e celular. Esse ensaio deve passar pela Index com os includes e incluir impressão em PDF para ver a marca em todas as páginas.
- Os manuais longos dentro de cada tela (seções "Erros comuns" nos `*_ConteudoModulo`) não foram reescritos. Só a ajuda "Como usar esta tela" foi atualizada.
- O relatório completo simulado usa a identificação do equipamento escolhido no cadastro. Ensaio simulado sem vínculo é aceito para qualquer equipamento; ensaio simulado de outro equipamento é recusado.
- Os testes antigos do simulador (`autoclave-simulado`, `estufa-simulado`) não carregam `SGO_SimuladorCodigo.js` e por isso não passam pela trava do código. A trava é coberta em `qualif-simulador-codigo` e `qualif-simulacao-didatica`.
- Falhas antigas sem relação com este trabalho continuam:
  - `estufa-simulado` (14): resultado APROVADO/REPROVADO do simulador e janela de datas;
  - `cadeiafrio-motor` (1).
- Observação de segurança, sem correção e não testada contra o servidor: o `/api/run` confere só o nome da função (`podeChamar`). Por isso funções globais `*_api*` sem "_" no fim, que recebem `sessao` como argumento, talvez possam ser chamadas direto com um objeto de sessão montado no navegador, contornando os despachos. Se for o caso, isso já existia antes; vale uma revisão própria.
