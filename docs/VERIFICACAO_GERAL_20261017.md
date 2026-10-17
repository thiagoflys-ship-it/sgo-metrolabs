# Verificação geral integrada do SGO+ (17/10/2026)

Verificação feita depois das frentes de 16 e 17/10 (pente fino, design, alertas unificados, relatórios A4, Frota/Conduta/cadastros). Nada foi publicado.

## Como foi testado

- Cópia de `sgo_servidor/dados/dev/pglite` em `%TEMP%\sgo_verif\pglite`. Servidor com `SGO_ENSAIO=1 SGO_AGENDADOR=0`, porta 8130, 3 workers, portal lido direto da pasta do portal. Nenhuma chave de IA. O servidor foi parado no fim.
- Dados de teste criados só na cópia: HOSPITAL MODELO DE TESTE LTDA e CLINICA EXEMPLO DE TESTE LTDA (com unidade principal), equipamentos AUT-TST-01 e TH-TST-01, usuários gestor.teste, tecnico.teste, metro.teste, comercial.teste e cliente.teste. As pastas do Drive da cópia foram criadas por `configurarPastasSGO` rodada como editor (sem isso, todo documento com arquivo é recusado com a mensagem certa: "a pasta de documentos do sistema ainda não foi configurada").
- Varredura de telas com Playwright: os 6 perfis em 1440 e 390 px, todos os módulos abertos um a um (inclusive os que o perfil não vê no menu), com registro de erro de JavaScript, erro de console, diálogos, respostas `ok:false`, texto em inglês, emoji, "undefined/NaN" na tela, rolagem horizontal e tempo de cada chamada. 12 rodadas, 29 módulos cada.
- Fluxos de ponta a ponta pelo mesmo caminho do navegador (`/api/run`), com a sessão de cada perfil: 92 verificações.
- Celular (390 px) clicado de verdade para as sobras (b) e (c).
- Documentos A4 gerados e salvos de cada módulo pelo caminho sem IA.
- `npx vitest run` no `sgo_servidor` e numa cópia temporária do `sgo_servidor` com o portal atual no lugar do `legado`.

Scripts: `...\scratchpad\vg\` (`fluxos.mjs`, `telas.mjs`, `movel.mjs`, `medir.mjs`, `doc\todos.mjs`, `gerar_qual.mjs`). Saídas: `%TEMP%\sgo_verif\` (`telas`, `fluxos`, `movel`, `qualificacao`, `tempos_a.json`).

## 1. Carregamento e conflitos de nomes

- **Funções globais do servidor:** levantamento por instanciação de cada arquivo `.js` (2.461 nomes globais). **Nenhum nome repetido** entre arquivos e nenhum `const`/`let` declarado duas vezes (que travaria a carga). Os arquivos novos (`SGO_Alertas_Central.js`, `SGO_RelTecA4.js`, `SGO_RelTecIA.js`, `SGO_Documentos_RelatorioA4.js`, `SGO_Conduta_Extrato.js`, `SGO_DocA4.js`) não colidem com nada.
- **Funções globais do navegador:** os `<script>` de todos os `.html` e os scripts que os `*_ConteudoModulo.js` injetam na página (681 nomes). Três nomes aparecem em quatro módulos (`SGO_senhaMascarada_`, `SGO_mostrarRelatorioInterno_`, `SGO_erroNoTopo_`, nos módulos Autoclave, Lavadora, Cadeia de Frio e Estufa). O corpo das quatro cópias foi comparado e é **idêntico**, então a sobrescrita não muda nada. Fica o registro: se uma cópia for alterada, alterar as quatro.
- **Carga no servidor:** o log de início não registrou nenhum aviso de carga.
- **Parciais HTML:** este portal não usa lista de liberados. `include(file)` serve qualquer `.html` do projeto. Todos os 29 `include('...')` de `Index.html` apontam para arquivos que existem. Não há parcial novo sem uso.

## 2. Matriz fluxo × perfil

Legenda: **P** = passou; **C** = corrigido nesta verificação e conferido depois; **–** = o perfil não participa do fluxo e a recusa sai com a mensagem certa (conferida); **n/a** = fora do escopo do perfil.

| Fluxo | ADMIN | GESTOR | TÉCNICO | METROLOGIA | COMERCIAL | CLIENTE |
|---|---|---|---|---|---|---|
| F1 Cliente → unidade → equipamento → documento → alerta na central | P | P | – (não vê, regra) | P | – (não vê, regra) | P (só o dele) |
| F1 Renovação some do alerta **na hora** | C | C | n/a | C | n/a | C |
| F1 Visão do cliente (lista só o próprio; documento de outro: "Documento não encontrado") | n/a | n/a | n/a | n/a | n/a | P |
| F2 Padrão vencido: alerta crítico na central | P | P | P | P | P | – (não vê) |
| F2 Bloqueio na emissão do certificado | n/a | n/a | P | P | – ("consulta, não emite") | – |
| F2 Renovação do padrão some do alerta na hora | C | n/a | C | C | n/a | n/a |
| F2 Emissão depois da renovação (resolução deduzida e informada) | n/a | n/a | P | P | n/a | n/a |
| F3 Frota: veículo, condutor, retirada, devolução | n/a | P | P | n/a | n/a | – |
| F3 Abastecimento e despesas (só gestão) | n/a | P | – (recusa clara) | n/a | n/a | – |
| F3 Relatório A4 da Frota (sem IA) | n/a | P | n/a | n/a | n/a | n/a |
| F3 CNH vencida → alerta | P | P | P (a própria) | – (não vê) | n/a | n/a |
| F4 Missão do colaborador nasce pendente | n/a | n/a | P | n/a | n/a | – |
| F4 Missão da gestão para outro nasce aprovada | n/a | P | n/a | n/a | n/a | n/a |
| F4 Fechamento travado por missão pendente → aprovação → fechamento | n/a | P | – (não aprova) | n/a | n/a | n/a |
| F4 Extrato A4 (gestão; próprio; de outro recusado) | n/a | P | P | n/a | n/a | – |
| F4 Ciência do aviso do Conduta | n/a | n/a | P | n/a | n/a | n/a |
| F4 Missão pelo celular (registrar, pendente, aprovar) | n/a | C | C | n/a | n/a | n/a |
| F5 Atividade atrasada → bloqueio no login → justificativa | n/a | P (lança e recebe a justificativa) | P | n/a | n/a | – |
| F6 Aviso com ciência (publicar, receber, Início, ciência, sai do Início) | n/a | P | P | P | P | – (avisos são internos) |
| F7 Vínculos: prévia, transferência, documentos acompanham | P (conferência) | P | – ("exige gestor") | n/a | n/a | P (deixa de ver) |
| Exclusão de cadastro no celular (botão só para a gestão; aviso de a quem pedir) | n/a | C | C | n/a | n/a | n/a |
| Telas: todos os módulos em 1440 e 390 px | P | P | P | P | P | P |

Detalhes da varredura de telas:

- **Nenhum erro de JavaScript** em nenhum perfil e largura, nenhum texto em inglês, emoji, "undefined" ou "NaN" na tela, nenhuma rolagem horizontal em 390 px.
- Em todos os perfis, o único erro de console é o logotipo (`/arquivos/1z_mcZjLJdbcPy0RTtOsQVEryinWSudT4`, 404). Esse arquivo do Drive não está nesta cópia do banco de desenvolvimento, o que já estava registrado no pente fino do núcleo. É coisa do ambiente, não do código.
- `comApi` responde "Comunicação ainda não ativada: abra o COMMAND uma vez." Esperado na cópia, porque o COMMAND não está ligado nela.
- CLIENTE: ao abrir à força, os módulos internos (Frota, Conduta, Padrões, Certificado, Registros etc.) recusam com mensagem clara. O menu do cliente mostra só **Início, Unidades, Equipamentos e Documentos**, então ele não chega a essas telas. "Chaves e senhas" segue o mesmo padrão para quem não é o responsável pelo sistema: fica oculto no menu e a recusa é clara.

## 3. Documentos A4 gerados e salvos (caminho sem IA)

Todos foram gerados sem chave de IA. Em cada um aparece o aviso "texto padrão, sem a redação da IA… Peça ao administrador…", e o documento sai com texto justificado e numeração "Página X de Y".

| Módulo | Perfil | Resultado |
|---|---|---|
| Certificado de calibração (2, um com resolução informada) | METROLOGIA, TÉCNICO | P, nº 202600001 e 202600002, registrados em Documentos |
| Relatório de calibração | METROLOGIA | P, PDF + HTML salvos |
| Laudo NR-13 | METROLOGIA | P, nº 202600001; sem PLH recusa com "Selecione o Profissional Legalmente Habilitado" |
| Declaração de execução | METROLOGIA | P, salvo |
| QI/QO/QD | METROLOGIA | P |
| POP com roteiro | METROLOGIA | P; PGT e POP sem roteiro recusam explicando que dependem da IA (decisão do dono) |
| Planejamento CME (vapor e ultrassônica) | METROLOGIA | P, salvo, sem nome de fabricante |
| Cronograma de execução | METROLOGIA | P, salvo, equipamentos trazidos do cadastro |
| Registro operacional | METROLOGIA | P, salvo |
| Inventário e orçamento de padrões | METROLOGIA | P |
| Autoclave (121 °C) + memória do F0 | ADMIN (pela tela) | P, PDF salvo na pasta do cliente |
| Lavadora (semicrítico) | ADMIN (pela tela) | P, PDF salvo |
| Cadeia de Frio | ADMIN (pela tela) | P, PDF salvo |
| Estufa de incubação | ADMIN (pela tela) | P, PDF salvo |
| Relatório da Frota | GESTOR | P |
| Extrato do colaborador (Conduta) | GESTOR e TÉCNICO | P |

## 4. Correções feitas

1. **Central de pendências não atualizava depois de documentos, padrões, certificados, laudos e vínculos** (`SGO_Alertas_Central.js`, `SGO_Documentos.js`, `SGO_Equipamentos.js`, `SGO_Clientes.js`, `SGO_Unidades.js`, `SGO_CertCal_Main.js`, `SGO_NR13_Main.js`, `SGO_Vinculos.js`). A central guarda o resultado de cada pessoa por 60 s, e só Avisos, Atividades, Qualidade, Frota e Conduta avisavam a central depois de gravar. Assim, o documento renovado, o padrão renovado ou o equipamento transferido ficavam até um minuto no Início e no balão. Criei `SGO_Pendencias_aposGravar_` e passei a chamá-la:
   - nos invólucros de gravação de documentos (criar, atualizar, inativar, reativar, excluir, registrar existente);
   - nos de equipamentos (atualizar, inativar, reativar, excluir) e nos de clientes e unidades (inativar, reativar, excluir);
   - nas funções de emissão e de padrões do Certificado (a mesma lista que só emissores podem chamar);
   - na emissão do laudo NR-13 e na confirmação de vínculos.

   As cópias irmãs foram conferidas: Certificado e NR-13 registram em Documentos por `SGO_DOCUMENTOS.registrarDocumentoExistente`, que fica coberto pela chamada da própria emissão. O RelCal usa `documentosRegistrarExistente`, que também ficou coberto. Teste: o renovado sai do Início, na chamada seguinte, para ADMIN, GESTOR, METROLOGIA e CLIENTE.
2. **Aviso repetido barrava aviso diferente com o mesmo texto** (`SGO_Notificar.js`). A proteção "não repete a mesma mensagem em 10 minutos" comparava só título e texto. Duas atividades diferentes com o mesmo título, ou dois avisos distintos com a mesma frase, saíam só uma vez. Agora a comparação inclui o registro de origem (`refId`): o mesmo registro continua sem repetir (duplo clique, rotina de hora em hora, duas sincronizações), e registros diferentes saem. Isso quebrava o teste `whatsappMeta.test.ts` ("modo ensaio continua bloqueando…") na cópia do servidor com o portal atual; com a correção, ele passa.
3. **(a) Segurança:** o `doGet` de `SGO_Main.js` já estava limpo desde o commit b110c1b. Ele só serve a página e não tem ramo `diag*`, `teste` nem parâmetro de URL. A Frota já não tem `apiDiagLogTempoCliente`. A única sobra pública era `DIAG_forcarAutorizacaoCompleta` (`SGO_Auth.js`), que agora recusa a chamada que não vem do editor (`SGO_execucaoInterna_`). O servidor próprio já bloqueia nomes `DIAG`, `teste`, `setup` etc. em `src/sistemas.ts` (`BLOQUEADAS_SGO`). O `doPost` da ponte com o COMMAND exige assinatura HMAC, então foi mantido.
4. **(b) Celular, assistente do certificado** (`JS_Core.html`): campo "Resolução do instrumento (na unidade do bloco)" em cada bloco, igual ao computador, com a explicação "Em branco, o sistema usa o menor incremento das leituras e informa isso no certificado". O valor vai no envio (`resolucao`) e se mantém ao editar o bloco. Conferido em 390 px e na emissão (nº 202600002 com resolução 0,1).
5. **(c) Celular, missões** (`JS_Core.html`): o celular não tinha como registrar missão. Foram acrescentados:
   - o botão "Registrar missão" (destino com km, data limitada a hoje, 1º executante já preenchido com quem está logado, 2º opcional) e a frase da regra de aprovação, igual ao computador;
   - a lista "Minhas missões" (para a gestão, "Missões"), com a situação ("Aguardando aprovação da gestão", "Aprovada", "Recusada" com o motivo, "Sem incentivo");
   - os botões Aprovar e Recusar (com motivo de pelo menos 8 letras) para a gestão, nas pendentes em que ela não é executante; quem é executante lê a quem pedir.

   O erro do servidor aparece com o texto dele (exemplo: "Já existe missão lançada para este destino, nesta data, com este executante. A missão não foi registrada. Corrija e tente de novo."), e não com a mensagem genérica de conexão. Sem destino cadastrado, o celular diz a quem pedir. Conferido: técnico registra (pendente), gestor aprova pelo celular, situação atualiza.
6. **(c) Celular, exclusão de cadastros** (`JS_Core.html`): o botão "Excluir" de cliente e de unidade já aparecia só para a gestão. Agora quem não é da gestão lê, no formulário de edição: "Para excluir este cadastro ou trocar vínculos, peça à gestão (Gestor, Diretoria ou Administrador)." Conferido com técnico (sem botão, com aviso) e gestor (com botão).

Arquivos LF, sem CRLF; editados com Edit/sed e conferidos com grep. Nenhum dado foi sobrescrito ou apagado.

## 5. Desempenho (d)

Tempos medidos pelo mesmo caminho do navegador (`/api/run`), 3 chamadas seguidas por função, com ADMIN, TÉCNICO e CLIENTE. Foram medidas as funções do Início, da central, dos cadastros, do Certificado e dos padrões, do Conduta, da Frota, da Qualidade e do Auvo, que são as mesmas do `medir_telas.ts` mais a central, as atividades e os avisos (`%TEMP%\sgo_verif\tempos_a.json`).

**Nenhuma chamada passou de 1,5 s.** As mais lentas:

| Função | 1ª / 2ª / 3ª (ms) |
|---|---|
| Conduta.apiObterAvisos (ADMIN) | 120 / 39 / 43 |
| vinculosPainel (ADMIN) | 113 / 124 / 108 |
| Conduta.apiObterFarolAtual (ADMIN) | 82 / 74 / 78 |
| Inicio_apiPendencias (ADMIN) | 40 / 7 / 7 (cache da central) |
| Qualidade.apiObterPainel (ADMIN) | 56 / 57 / 76 |

Na varredura de telas, com 12 sessões e 3 workers ocupados ao mesmo tempo, o pior tempo visto pelo navegador foi 682 ms (`Conduta.apiObterFarolAtual`), seguido de `Frota.apiSituacaoFrota` (541 ms) e `Inicio_apiPendencias` (523 ms).

**Limite desta medida:** a cópia de desenvolvimento tem poucos registros. Para confirmar com o volume real, rode `npx tsx scripts/medir_telas.ts` no contêiner de produção. Pelo crescimento com o volume, os primeiros a vigiar são `vinculosPainel` (lê todas as tabelas de cadastro) e a central (`Inicio_apiPendencias` sem cache).

## 6. Testes automatizados

- `sgo_servidor`: `npx vitest run`, com **20 arquivos e 100 testes, todos passando** (antes e depois).
- Os testes do `sgo_servidor` usam a cópia `sgo_servidor/legado`, que é um retrato anterior do portal. Por isso também rodei os mesmos testes numa cópia temporária do servidor com o portal atual no lugar do `legado` (`%TEMP%\sgo_verif\vitest`). Antes da correção 2 deu 1 falha (`whatsappMeta.test.ts`). Depois, **100 de 100 passaram**. Quando o dono do servidor atualizar o `legado`, os testes continuam verdes.

## 7. Observações para outros donos (não alterado)

- **Servidor (`sgo_servidor`):** nenhum defeito encontrado na camada nesta rodada. O pendente do relatório de documentos técnicos (aba criada por `Sheets.batchUpdate` invisível na mesma execução) já foi tratado no commit e250f0b do servidor.
- **Logotipo** (`LOGO_URL`): o arquivo do Drive não está no armazenamento do servidor de desenvolvimento e dá 404 em todas as telas. Conferir se ele foi migrado no servidor de produção.
- **Funções duplicadas idênticas** nos 4 módulos de qualificação (seção 1): manter as quatro iguais ao alterar.
- **Frota:** a renovação da CNH pela tela não foi exercitada aqui (o fluxo de alerta foi). A regra "vence hoje = vencido" já está em `Frota_statusDocumento_`.
