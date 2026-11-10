# Comercial — Etapa 2: exclusão, atividades da gestão, assinatura cadastrada, repetidos, troca de responsável (10/11/2026)

Estado real: **implementado e testado localmente** sobre `output/comercial-20261110/base` (produção + Etapa 1).
**Nada publicado**, nenhum `ssh`, nenhum `git commit`. Os testes rodam no emulador do projeto (tabelas, Drive e
MailApp em memória; DOM mínimo para as telas); não comprovam a tela num navegador real nem o Drive real.
Nada da Etapa 1 foi desfeito (os 20 testes dela continuam passando).

## Arquivos alterados (somente `base/legado/`)

| Arquivo | Fim de linha | O que mudou |
|---|---|---|
| `SGO_Comercial_Config.js` | CRLF (preservado, conferido: 1005/1005) | Colunas novas; aba `COM_ASSINATURAS_USUARIO` (`COM_ABAS.ASSINATURAS`); `COM_SITUACOES_OPO.EXCLUIDA`; chave de cache **`COM_ABAS_OK_V12_ETAPA2`**; `Com_transferirAtividade_` (troca o responsável de uma atividade pela identidade da rotina). |
| `SGO_Comercial_Oportunidades.js` | LF | Leitor único `ComOpo_lerOportunidades_` / `ComOpo_excluida_`; `ComOpo_obter_` recusa excluída; `ComOpo_podeExcluir_` / `ComOpo_excluir_` (h); atividades da gestão (`ComOpo_criarAtividadeGestao_` reescrita, `ComOpo_atividadesGestao_`, `_encerrar…`, `_transferir…`, `_Tela_`); troca de responsável com propostas (`ComOpo_transferirPropostas_`, D5); `ComOpo_propostaParaAceite_` e `ComOpo_ganhar_` com `daFicha` (D6); perda e ganho cancelam atividades da gestão; ficha devolve `atividadesGestao`, `podeCriarAtividadeGestao`, `podeExcluir`, `motivoSemExcluir`, `propostaParaAceite`; docstring de `ComOpo_registrarContato_` no lugar certo (D7). |
| `SGO_Comercial_Propostas.js` | LF | `ComP_motivoFicaComResponsavel_` (D5); `ComP_aplicarAprovacao_` cancela atividades da gestão ao ganhar; `ComP_voltarRascunho_` com link ativo (D14); `ComP_excluirDuplicado_` reescrita e `repetidoCom` no catálogo (D18); `ComP_conferirRepetidos_` em `ComP_itensDaTela_` (D19); "Minha assinatura" (`ComAss_*`); `ComP_assinarResponsavel_` com `usarCadastrada`; `ComP_gerarPdfAssinado_` usa o tipo da imagem (PNG/JPG); `ComP_detalhe_` devolve `souResponsavel` e `assinaturaCadastrada`; cabeçalho atualizado. |
| `SGO_Comercial_Documento.js` | LF | `ComDoc_assinaturaProposta_` aceita `data:image/jpeg` (até 420 mil caracteres), além de PNG. |
| `SGO_Comercial_Painel.js` | LF | Ações `excluirOportunidade`, `minhaAssinatura`, `salvarMinhaAssinatura`, `removerMinhaAssinatura`; 5 leituras passam pelo leitor único (indicadores, `Comercial_emUso_`, pendências, entrada, ficha do cliente). |
| `SGO_Comercial_Gestora.js`, `_Quadro.js`, `_Especialista.js`, `_Orcamentista.js` | LF | Leituras de oportunidades pelo leitor único (gestora/lista do dia, quadro e Gantt, especialista, Orçamentista). |
| `SGO_Comercial_ImportarCrm.js` | LF | Só comentário: continua lendo também as excluídas, para a importação não recriar o que foi excluído. |
| `SGO_Gestao_RelatoriosEmpresa.js` | LF | "Comercial da semana" ignora oportunidades e propostas excluídas. |
| `SGO_Licitacoes_Contratos.js` | LF | `LicC_opoDaRef_` não considera oportunidade excluída como a existente do contrato. |
| `JS_Comercial.html` | LF | Telas (detalhes abaixo). Textos corridos novos com `text-align:justify`. |
| `SGO_Ajuda_Comercial.js` | LF | Ajuda e manual de tudo desta etapa. |

Testes (fora de `base/`): `tests/comercial-etapa2.test.cjs` (novo, 18 testes) e `tests/comercial-atividade-gestao.test.cjs`
(2 asserções atualizadas, ver "Testes").

## Colunas e tabelas novas (mecanismo `Com_garantirAbas_`, chave `COM_ABAS_OK_V12_ETAPA2`)

- `COM_OPORTUNIDADES`: `EXCLUIDA_EM` (texto), `EXCLUIDA_POR_ID`, `EXCLUIDA_POR_NOME`, `EXCLUIDA_MOTIVO`, `ATIVIDADES_GESTAO_JSON`
  (`[{ id, titulo, porId, porNome, em, prazo }]`).
- `COM_ASSINATURAS_USUARIO` (nova): `ID, USUARIO_ID, USUARIO_NOME, ARQUIVO_ID, ARQUIVO_NOME, TIPO, SHA256, TAMANHO, SITUACAO
  (ATIVA|SUBSTITUIDA|REMOVIDA), ENVIADA_EM, SUBSTITUIDA_EM, REMOVIDA_EM, REMOVIDA_POR_NOME, CRIADO_EM`. Texto: datas e SHA256.
- `COM_ASS_RESP_<id>` (Properties) ganha `assinaturaTipo`, `origem` (CADASTRADA|DESENHO), `cadastradaId`, `cadastradaSha` e, no
  cancelamento por D14, `linkCanceladoEm/PorId/Motivo`.

## O que mudou, por item

**h) Excluir oportunidade (teste ou engano).** Gestão comercial ou o responsável. Só ABERTA ou PERDIDA (GANHA: "a gestão reabre e
depois exclui"). Bloqueia, com o motivo na ficha no lugar do botão: proposta assinada pelo cliente; link de assinatura enviado
(coluna ou Properties); proposta APROVADA/RECUSADA/VENCIDA; passada aos setores; enviada (`ComP_foiEnviada_`, inclui "Enviar
documento"); contrato em `LIC_CONTRATOS.COMERCIAL_OPO_ID`; preço válido no banco como GANHO/PERDIDO (orienta "Desconsiderar").
Motivo ≥ 10. Cancela `ATIVIDADE_ID` e as atividades da gestão; exclui logicamente todas as propostas da oportunidade (todas
nunca enviadas, já conferido), com histórico, `ComBP_marcarProposta_(…,'CANCELADO')` nas linhas EM_ABERTO e retorno/vencimento
cancelados; grava `SITUACAO EXCLUIDA` + colunas; histórico; aviso ao responsável (se foi a gestão); GI01 depois da trava.
Nunca apaga linha. Leitor único usado em listas, quadro/Gantt, painel/indicadores, entrada, gestora, especialista,
Orçamentista, pendências, ficha do cliente e relatório da empresa. Tela: botão "Excluir oportunidade (teste ou engano)" com
motivo e confirmação.

**b) Atividades da gestão (D7/D8).** Criada pela identidade do Comercial (`Com_criarAtividade_` sem sessão) depois de
`Com_exigir_(eu,'GESTAO')`: funciona para gestor comercial sem perfil de gestor em Atividades (testado com perfil COMERCIAL
listado na Caixa de decisões). Título `[OPO-…] ação — cliente`; descrição e histórico com quem pediu; ids em
`ATIVIDADES_GESTAO_JSON`. Ficha: seção "Atividades da gestão" (título, quem pediu, responsável, prazo, situação) e o botão
"Criar atividade para o comercial" em destaque (primário) para a gestão. Ganhar (ficha ou pela proposta), perder e excluir
cancelam as abertas; troca de responsável as transfere (`Atividades_apiEditar` como rotina).

**g) Minha assinatura.** Lugar: botão "Minha assinatura" no topo de Comercial > Hoje (não existe "Minha conta" no Comercial).
Janela: enviar PNG/JPG (até 300 KB), pré-visualizar, trocar, remover, histórico. Servidor confere o tipo pelos bytes (não pelo
nome), tamanho, guarda arquivo privado na pasta "Comercial - Assinaturas", SHA-256 e data; a anterior fica SUBSTITUIDA, a
removida fica REMOVIDA (arquivo e linha guardados). Em "Assinar pela Metrolab": pré-visualização + "Usar minha assinatura
cadastrada" (exige "Li e concordo"; servidor confere pdfId/marca e o SHA do arquivo de novo), quadro de desenho como
alternativa; histórico da proposta registra "assinatura cadastrada … SHA-256 …". JPG aceito no documento (`ComDoc_…`) e no PDF
final. Não é inserida automaticamente no PDF antes do cliente (fora de escopo, mantido).

**a) Repetidos.** Catálogo: "Excluir repetido" só aparece em item `duplicado` (gestão/Financeiro) e abre janela "Qual item
fica?" + motivo; servidor confere outro ativo de mesmo nome, exige `manterId`, grava `JUNTADO_COM_ID/EM/POR_NOME`, arquiva,
histórico nos dois itens; reativar continua barrado. **Mudança de permissão:** o vendedor deixou de poder usar "Excluir
repetido" (antes o botão aparecia para todos e só arquivava; o vendedor continua podendo "Arquivar"). Proposta: escolher do
catálogo item já presente (mesmo produto, equipamento e faixa) pergunta "somar à quantidade"; o servidor recusa salvar itens
iguais (produto + equipamento + faixa + parâmetros técnicos) com o quê/por quê/como corrigir. "Excluir item" já existia e
continua visível em cada item do rascunho.

**D5) Troca de responsável.** Passam ao novo: propostas RASCUNHO/AGUARDANDO_APROVACAO/PRONTA sem assinatura da Metrolab no
documento atual, sem link e nunca enviadas (histórico "passou junto"). Ficam com o antigo (histórico `RESPONSAVEL_MANTIDO`
com o motivo): assinadas pela Metrolab, com link, enviadas e as em andamento depois do envio. Mensagem da tela, histórico da
oportunidade e aviso ao novo dizem o que passou e o que ficou; o antigo é avisado (`OPORTUNIDADE_TRANSFERIDA`, com e-mail no
expediente). Ajuda no campo "Responsável" do formulário.

**D6) "Marcar como ganha".** A ficha recebe `propostaParaAceite` (assinada pelo cliente e não registrada → "Registrar a assinatura
do cliente"; senão ENVIADA/VENCIDA; senão PRONTA com documento → "Registrar resposta do cliente"). O botão abre a proposta e
já a ação certa. Sem proposta: formulário com observação obrigatória (≥ 10) e `GANHA_VIA MANUAL`. Servidor: com `daFicha: true`
recusa ganhar com proposta pendente e exige a observação. Chamadas sem `daFicha` (Licitações e o teste da Etapa 1) continuam
como antes.

**D14) Voltar para rascunho com link ativo.** Exige `cancelarLink: true` (tela: confirmação "o link enviado para X deixa de
abrir"); apaga `COM_ASS_LINK_<hash>`, limpa `linkHash` no registro e registra no histórico e na mensagem. Na prática só ocorre com
link anterior a 10/11 (o link da Etapa 1 já passa a proposta a ENVIADA).

**D16) Botões só do responsável.** "Assinar pela Metrolab" e "Enviar link" só aparecem para o responsável; a gestão vê o texto
explicando que só ele assina/envia e que a gestão pode trocar o responsável.

**Ajuda/manual** (`SGO_Ajuda_Comercial.js`): Hoje (Minha assinatura); Oportunidades (atividades da gestão, troca de
responsável, excluir, ganhar pela proposta, dois problemas novos, seção de manual); Propostas (assinatura cadastrada, D16, D14,
item repetido); Catálogo (Excluir repetido com "qual fica"); "Quem pode" atualizado.

## Testes

Comando: `FASE=candidato node --require ./output/comercial-20261110/fontes-locais.cjs --test tests/<arquivo>`. Placar completo do
candidato salvo em `output/comercial-20261110/etapa2-candidato.txt`.

| Arquivo | Etapa 1 (antes) | Etapa 2 (depois) |
|---|---|---|
| comercial-etapa2 (novo) | — (produção: 0 / 18) | **18 / 0** |
| comercial-assinatura-aprovacao | 20 / 0 | 20 / 0 |
| comercial-atividade-gestao | 5 / 0 | 5 / 0 (2 asserções atualizadas, ver abaixo; produção com o arquivo atualizado: 4 / 1) |
| comercial-busca | 6 / 0 | 6 / 0 |
| comercial-c2-precos | 10 / 0 | 10 / 0 |
| comercial-c2-revisao | 7 / 0 | 7 / 0 |
| comercial-c3-orcamentista | 10 / 0 | 10 / 0 |
| comercial-c3-revisao | 12 / 0 | 12 / 0 |
| comercial-c4-entrada-mercado | 8 / 1 | 8 / 1 (mesma falha da produção: "menu, ajuda, manual…", exige CRLF em JS_Comercial.html) |
| comercial-catalogo-equipe-exclusao | 8 / 0 | 8 / 0 |
| comercial-catalogo-oficial | 14 / 3 | 14 / 3 (os mesmos três da produção) |
| comercial-celular | 3 / 0 | 3 / 0 |
| comercial-decisao-dono | 13 / 0 | 13 / 0 |
| comercial-especialista | 16 / 0 | 16 / 0 |
| comercial-importar-crm | 2 / 0 | 2 / 0 |
| comercial-investimento | 9 / 0 | 9 / 0 |
| comercial-modelo-orcamento | 7 / 0 | 7 / 0 |
| comercial-precificacao | 13 / 0 | 13 / 0 |
| comercial-quadro | 8 / 0 | 8 / 0 |
| comercial-termos-catalogo | 7 / 0 | 7 / 0 |
| comercial | 16 / 0 | 16 / 0 |

**Asserções antigas atualizadas** em `tests/comercial-atividade-gestao.test.cjs` (arquivo não versionado; original guardado no
scratchpad da sessão), porque a decisão desta etapa mudou o comportamento: (1) o título da atividade da gestão agora é
`[código] ação — cliente` e a oportunidade guarda `ATIVIDADES_GESTAO_JSON` (o resto da linha continua igual); (2) "Excluir
repetido" agora exige outro item ativo de mesmo nome e `manterId` (o teste cria o repetido como vem do CRM).

Fora do Comercial (arquivos tocados): `gestao-relatorios-empresa` 9 / 0 na produção e no candidato; `licitacoes_contratos`
21 / 1 na produção e no candidato (a mesma falha antiga).

`node --check` em todos os `.js` de `legado/` e no `<script>` de `JS_Comercial.html`: sem erro.

Os 18 testes novos cobrem, com positivos e negativos: exclusão (efeitos, linha mantida, GI01, mensagem do `obter`; leitor
único em lista, quadro, entrada, indicadores, ficha do cliente, propostas e pendências; recusas por motivo curto, outro
vendedor, Financeiro, enviada, link, ganha, contrato, banco; gestão exclui de outro; perdida sem proposta exclui); atividade
da gestão (título, JSON, ficha, D8 com gestor de perfil COMERCIAL, vendedor recusado; cancelamento no ganhar/perder; transferência
na troca); D5 (passa/fica, históricos, avisos, visibilidade; pronta com e sem assinatura); D6 (recusa com proposta, observação
obrigatória, ganho manual); D14 (recusa sem confirmação, cancelamento do link, link deixa de abrir; sem link volta direto);
Minha assinatura (PNG, troca para JPG com histórico, remover, recusas de formato/conteúdo/tamanho/Financeiro); assinar com a
cadastrada (sem cadastro, sem concordância, PDF errado, SHA adulterado recusado; origem e SHA no histórico; JPG no documento e
no PDF final; GIF fora); repetidos no catálogo e na proposta; telas (D16 gestão × responsável; janela de assinar com a
cadastrada e a concordância; ficha com botão da gestão em destaque, seção de atividades, excluir, ganhar abrindo a resposta da
proposta e formulário com observação; voltar com confirmação; somar à quantidade no editor); ajuda e ausência de leitura direta
nos arquivos trocados.

## Limites e decisões de interpretação

- **Não publicado.** Telas verificadas só com DOM mínimo; Drive/compartilhamento privado e e-mails não foram testados de verdade.
- **SGO_Vinculos.js não mudou de propósito:** na junção de cadastros, as oportunidades excluídas continuam acompanhando o cliente
  que fica (a linha é guardada; se ficasse apontando para o cadastro apagado, travaria a junção). Elas não aparecem em nenhuma
  lista do Comercial.
- `ComOpo_ganhar_` sem `daFicha` continua permissivo (Licitações e o teste da Etapa 1 dependem disso); a regra D6 vale pela ficha.
- Oportunidade PERDIDA pode ser excluída (era o contorno usado para testes), salvo se a perda já levou preços ao banco.
- As propostas que ficam com o responsável antigo (D5) continuam invisíveis para o novo vendedor; a gestão vê todas.
- "Minha assinatura" fica no Hoje do Comercial; o Financeiro (sem o Comercial completo) não usa.
- Vendedor perdeu o botão "Excluir repetido" (só gestão/Financeiro veem duplicados); continua com "Arquivar".
- O e-mail ao antigo responsável (D5) sai pelo aviso agrupado do expediente, como os demais avisos do Comercial.
- Corrida rara: a exclusão confere tudo dentro da trava, mas um envio pelo "Enviar documento" registrado depois do
  `ComP_sincronizarEnvios_` e antes da trava não é visto (mesmo limite do "Excluir proposta").
