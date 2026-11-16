# Relatório de desenvolvimento — Financeiro no SGO+ (16/11/2026)

Base: `output/financeiro-20261116/cand4` (cópia da produção). Especificação: `especialistas/ESPEC_FINANCEIRO.md`.
Nada foi publicado, nenhum acesso ao servidor de produção nem ao Omie real, nenhum commit. Todo o Omie dos testes é simulado.

## 1. O que foi feito

### 1.1 Achados que bloqueiam uso real (seção 1)

| Achado | Onde | O que mudou |
|---|---|---|
| **B1** juros/multa/desconto | `SGO_Omie_Operacoes.js` (`OMIE_OPS_BAIXA_ACRESCIMO_CONFIRMADO = false`, `OmieOps_preparar_`), `JS_Omie_Operacoes.html`, `JS_Omie_Ajuda.html` | Opção mais segura da especificação: até a primeira baixa acompanhada, o servidor recusa juros, multa ou desconto diferentes de zero, com a mensagem do quê/por quê/o que fazer. Na tela os três campos ficam somente leitura em zero e aparece o aviso "Baixa com acréscimo ou desconto: confirmar no primeiro uso acompanhado". A prévia tem a linha "Efeito na conta corrente: R$ X entram/saem". As duas dicas foram corrigidas (o valor do documento não fala mais que "juros entram na baixa"). Para liberar depois: trocar a constante, fixar a regra na prévia e ajustar as dicas. |
| **B2** saldo e situação | `OmieOps_saldo_`, `OmieOps_preparar_`, `OmieOps_titulo_` (campo `fechado`), lista em `JS_Omie_Operacoes.html` | A prévia da baixa lê o saldo em aberto em `ListarMovimentos` (`resumo.nValAberto`, sem memória) e recusa: valor + desconto > saldo + 0,01; título PAGO/RECEBIDO/LIQUIDADO/CANCELADO; saldo não lido. Prévia mostra "Saldo antes · Esta baixa · Saldo depois (parcial/quitado)". Na lista, título fechado não tem "Editar" nem "Registrar baixa". O filtro `nCodTitulo` do `ListarMovimentos` está **a confirmar** no Omie real; se o Omie o ignorar, o título é procurado na resposta e, não achado, a baixa é recusada (nunca às cegas). |
| **B3** Editar | `OmieOps_temRateio_`, `OmieOps_preparar_` | Recusa título com `categorias` > 1 ou `distribuicao` preenchida ("altere no Omie") e título pago/cancelado. O `AlterarConta*` leva só o código do título e os campos que mudaram em relação ao consultado; sem mudança, recusa. A prévia lista os campos alterados. |
| **B4** categorias | `OmieOps_categoriaUsavel_`, `OmieOps_conferirCategoria_`, `OmieOps_apiApoios` (`natureza`), `OmieOps_rotulos_` | Lista filtra `conta_inativa`, `totalizadora`, `transferencia`, `nao_exibir` e o tipo (a pagar só `conta_despesa = S`; a receber só `conta_receita = S`). A prévia confere de novo com `ConsultarCategoria`. |
| **B5** recusa × incerto | `SGO_Omie.js` (`Omie_requisitar_`: `e.omieRecusado` quando há `faultstring` e `faultcode` de cliente), `OmieOps_apiConfirmar`, `OmieFat_apiConfirmar`; novas `OmieOps_apiIncertos`, `OmieOps_apiResolverIncerto`; tela "Envios a conferir no Omie" | Recusa clara = nada feito: a operação volta a pendente, o marcador de envio é apagado (no faturamento também) e a tela mostra o motivo e manda corrigir. Sem resposta/ilegível/erro do servidor = incerto, como antes. Os incertos (operações e marcadores `OMIEFAT_OP_`) aparecem numa lista; "Conferi: não foi feito" libera o envio, "Conferi: foi feito" encerra; motivo obrigatório (10 letras), caixa FIN_OMIE_LANCAR, registro em FIN_OMIE_ACESSOS. O marcador do faturamento agora guarda o que foi enviado (sem valor). |
| **B6** CNPJ da empresa | `SGO_Chaves.js` (item `OMIE_EMPRESA_CNPJ`, grupo Omie, tipo aberto, com ajuda; validação de 14 dígitos e dígito verificador em `Chaves_validarValor_`) | Sem valor preenchido. Sem ele, importação de NF-e de saída e lançamento/recepção de notas recusam com "Falta o CNPJ da empresa em Administração > Chaves e senhas > Omie". A conferência com o cadastro da empresa no Omie ficou só no formato (a chamada que devolve o CNPJ da empresa é **a confirmar**). |
| **B7** tamanho do XML | `SGO_Omie_Faturamento.js` (`OMIEFAT_XML_MAX`, `OmieFat_documento_`, `OmieFat_apiPreviaDocumento`, `OmieFat_salvarXml_`, `OmieFat_apiGuardarDocumento`), `JS_Omie_Faturamento.html` | Compra e NFS-e até 1 MB. O token guarda os campos lidos e o SHA-256, não o XML; a confirmação reenvia o XML e confere o hash. O XML original vai para um arquivo da pasta "SGO+ Financeiro - notas recebidas" (`SGO_DocSalvar_pastaPersistente_`, propriedade `FIN_PASTA_NOTAS_ID`); a tabela guarda ID do arquivo, SHA-256 e resumo. NF-e de saída continua em 40 KB (vai inteira ao `ImportarNFe`). |
| **B8** NFS-e | `SGO_Omie_Notas.js` (`OmieNota_lerNfse_`, `OmieNota_completarNfse_`), usado pela recepção documental | Tomador obrigatório = empresa; uma nota por arquivo; líquido calculado (serviço − retenções federais − ISS retido − desconto incondicionado), nunca o bruto; diferença para o líquido do XML vai para conferência manual; chave = `NFSE-<prestador>-<município>-<número>` (Nacional: `NFSE-<50 dígitos>`), igual para o mesmo documento com espaços diferentes. |
| **B9** busca | `SGO_Omie_Cadastro.js` (`OmieCad_apiBuscar`), `JS_Omie_Cadastro.html` (`OmieCad_campoPessoa_`, `OmieCad_buscar_`), `JS_Omie_Operacoes.html` | O formulário de lançamento troca a lista de 100 em 100 por busca por CNPJ/CPF (`clientesFiltro.cnpj_cpf`, conferido pelos dígitos) ou nome (`razao_social`; busca parcial **a confirmar**). Resultado com razão social, CNPJ formatado, cidade/UF, tags e "inativo". Sem resultado: "Cadastrar no Omie". Vindo de Pedidos aprovados, o cliente já vem escolhido. |

Também entraram, por serem baratos e do mesmo trecho: **M4** (observação sem quebra de linha; `|` digitado sai) e **M5** (razão social acima de 60 letras é cortada com aviso, no cadastro).

### 1.2 (a) Cadastro de cliente e fornecedor no Omie — `SGO_Omie_Cadastro.js`, `JS_Omie_Cadastro.html`

- `OmieCad_apiPrevia` (caixa FIN_OMIE_LANCAR, sigilo por `Omie_exigirAcesso_`): valida CNPJ/CPF (dígitos, zerado/repetido), recusa o CNPJ da própria empresa, junta os dados (digitado ou lido da nota; vazios completados por `CAD_CLIENTES`, `CMP_FORNECEDORES` e, se existir no servidor, `SGO_CNPJ_consultarDados_`), mostra a origem de cada campo. Procura por CNPJ no Omie **sem memória**: ativo com a tag → "já cadastrado", sem token; ativo sem a tag → `AlterarCliente` com a lista de tags **somada** (lida antes com `ConsultarCliente`); só inativo → recusa e orienta reativar no Omie; mais de um ativo → recusa; nenhum → `IncluirCliente` com `codigo_cliente_integracao = SGO-<dígitos>`, CNPJ formatado, tags, endereço (cidade pelo código IBGE quando vem da nota), e-mail, telefone, IE, Simples. Nunca `Upsert`.
- `OmieCad_apiConfirmar`: token de uso único ligado à sessão e à empresa (10 min), `Omie_exigirGravacao_`, espera o minuto do Omie (`Omie_faltaReconsulta_`), relê por CNPJ sem memória (se alguém cadastrou entretanto, não envia), envia; recusa clara = pendente com o motivo; sem resposta = incerto ("busque o CNPJ de novo"). Grava `OMIE_CODIGO` só nessa coluna em `CAD_CLIENTES`/`CMP_FORNECEDORES` (garante a coluna), registra em FIN_OMIE_ACESSOS (só o final do documento) e esquece a leitura guardada da busca (`Omie_esquecerLeitura_`, novo em `SGO_Omie.js`), para o lançamento ver o cadastro na hora.
- Tela: busca no formulário de lançamento, formulário de cadastro com prévia em tabela (campo · vai para o Omie · de onde veio), volta ao lançamento com o cadastro escolhido; na nota recebida, cadastro direto do emitente (`OmieCad_daNota_`).

### 1.3 (b) NF-e de compra e NFS-e viram conta a pagar — `SGO_Omie_Notas.js`, `JS_Omie_Notas.html`

- Leitura por nome local (ignora namespace), sem DTD, até 1 MB. NF-e: modelo 55, `finNFe = 1` (complementar, ajuste e devolução recusadas com orientação), protocolo 100 com a mesma chave, destinatário = `OMIE_EMPRESA_CNPJ`, duplicatas, fatura, `detPag`, itens. NFS-e ABRASF (1.0/2.x) e Padrão Nacional, com a lista do que não foi lido.
- `OmieNota_apiLer`: leitura, fornecedor no Omie, alertas e bloqueios: tabela local pela chave (LANCADA/SEM_TITULO bloqueia), `recebimentonfe/ConsultarRecebimento` (com títulos bloqueia; sem títulos avisa; "não encontrado" vira aviso **a confirmar**; falha de comunicação bloqueia), `ListarContasPagar` do fornecedor no dia da emissão (mesmo número fora do SGO+ bloqueia; mesma referência = parcela já no Omie).
- `OmieNota_apiPrevia`: categoria só de despesa (B4), conta, vencimento (obrigatório sem duplicata, sugestão à vista; obrigatório na NFS-e), soma das parcelas × total (diferença exige motivo, não bloqueia), `tPag 90`/`vNF 0` = "Registrada sem título", alerta de vencimento no passado (M3 **a confirmar**). Um título por duplicata: `codigo_lancamento_integracao = NFE-<chave>-<nDup>` (NFS-e: a chave da nota), `numero_parcela 001/00N`, `chave_nfe`, `numero_documento_fiscal`, `numero_documento = NF n/série`, `data_emissao`, observação "Fornecedor | NF n série s | parcela i/n | lançada pelo SGO+ (nome)". NFS-e: valor = líquido; retenções na observação.
- `OmieNota_apiConfirmar`: confere o SHA-256 do XML, guarda o XML em arquivo, envia um título por vez; se um falha, os anteriores ficam (LANCADA_PARCIAL) e a mensagem diz "1 de 2 parcela(s) lançada(s)"; a nova prévia reconhece pela referência e envia só o que falta. Recusa = pendente; sem resposta = incerto (nova prévia obrigatória). Tabela nova `FIN_OMIE_NOTAS_LANC` (colunas da especificação + CHAVE, STATUS, CAMPOS_MANUAIS, MOTIVO, CATEGORIA); `OmieNota_apiHistorico` lista as notas.
- Conferência manual da NFS-e: cada campo aparece como "lido do XML" ou "não encontrado" (com campo para digitar); o digitado só vale para o não lido, exige motivo (10 letras) e fica em `CAMPOS_MANUAIS`. Layout desconhecido abre a conferência manual em vez de recusar. Tomador digitado também precisa ser a empresa.
- "Nota já paga": depois de lançar, cada parcela tem "Registrar o pagamento", que abre a baixa (prévia própria) em Lançamentos e baixas.

### 1.4 (c) Explicação embaixo de cada campo

- `JS_Compras.html`: mapa `CP_DICAS_FIN` com os textos da seção 4.1 a 4.4 (Conferência, registro do pagamento, Cartões, Conciliação das faturas, A pagar; sem o `apValor`, que depende do M9). Aplicado por `Cp_dicasFin_` com observador nas telas e nas janelas (`Cp_modal_` envolvido), inclusive nos campos que aparecem ao trocar a forma de pagamento. `cpTxtPedido` e `cfMot` recebem o texto pelo título da janela (Conferida, Divergente, Ciente, Fechar com ressalva, Reabrir a fatura; Casar, Justificar...). Mesmo estilo `.cp-ajuda-campo`, justificado. Em vez de editar as ~40 chamadas de `Cp_campo_`/`Cp_pedirTexto_` num arquivo CRLF, o texto é aplicado por id (um lugar só, igual ao padrão do `JS_Omie_Ajuda.html`).
- `JS_ConciliacaoCaju.html`: mapa `CJ_DICAS` (seção 4.5) aplicado por `CjT_dicas_` com observador em `#cjTela`, no padrão `<span class="vg-dica">`; ids com sufixo usam o prefixo; motivos pela ação em `CjT_caixaMotivo_` (`CJ_DICAS_MOTIVO`). As dicas que já existiam na Configuração foram mantidas.
- `JS_Omie_Ajuda.html` (`OMIE_DICAS`): textos da seção 4.6 e dos campos novos (`omieCadBusca`, `cad:*`, `nota:*`, `nfse:*`, `incertoMotivo`, `pagar:categoria`/`receber:categoria`), contextos `cad` e `nota`, guias das abas Lançamentos e Notas atualizados.

### 1.5 (d) Marca d'água, planilha e impressão identificadas

- `SGO_Financeiro_Marca.js`: `Fin_marca_` (nome, login, hora do servidor, da sessão conferida) e `Fin_planilhaIdentificada_` (código único XXXX-XXXX, linha "Gerado por Nome (login) em dd/mm/aaaa hh:mm · uso interno do Financeiro · código" e rodapé com o código; registro em FIN_OMIE_ACESSOS com nome do arquivo, linhas, código e 16 primeiros caracteres do SHA-256; nenhum valor).
- `JS_Financeiro_Marca.html`: camada `.fin-marca` em diagonal repetida ("Nome · login · data hora · SIGILOSO", opacidade 7 %, `pointer-events: none`, sem rolagem lateral, atualizada a cada minuto) e `@media print` com a marca e o rodapé "Impresso por …". Aplicada no Painel (`OmieTela_render_`, marca de `Omie_apiIniciar`), nas quatro telas do Financeiro em Compras (marca de `Cmp_inicio_`) e na Conciliação Caju (marca do `iniciar`).
- Planilhas: `Omie_apiCsv` agora registra antes e devolve as linhas de identificação; a tela (`OmieGest_csv_`) só baixa depois do registro e mostra o código na tela (sem `alert`). `CmpFin_planilha_` (Compras) sai identificada e registrada.

### 1.6 Ajuda e manuais

`SGO_Ajuda_Financeiro.js` (passos novos: cadastro, envios a conferir, nota recebida, marca/planilhas; baixa e edição atualizadas; problemas novos), `SGO_Ajuda_Compras.js` e `SGO_Ajuda_ConciliacaoCaju.js` (explicação dos campos e marca d'água). `docs/MANUAL_PAINEL_FINANCEIRO.md`: seção 8a nova, tabela de problemas, seções 10 e 11 regeneradas pelo `gerar-manual-campos.cjs` (estendido para os grupos novos). `docs/MANUAL_COMPRAS_FINANCEIRO.md` e `docs/MANUAL_CONCILIACAO_CAJU.md`: seção "O que preencher em cada campo (16/11/2026)" gerada dos mesmos mapas da tela.

## 2. O que ficou de fora e por quê

- **Termo de sigilo, aviso ao dono por e-mail fora do horário, caixa própria de exportação (FIN_OMIE_EXPORTAR)** (seção 5, itens 4 a 6): o item 6 é decisão do dono; 4 e 5 não foram pedidos no escopo (d) e mexem em Conduta/avisos.
- **Rodapé identificado nos A4 do Caju**: só a tela e a impressão da tela foram identificadas; o gerador dos A4 não foi alterado.
- **Pontos de entrada (ii) do cadastro** (Ficha do cliente e Pedidos aprovados com "Cadastrar no Omie"): o cadastro está pronto e é chamado pelo lançamento e pela nota; esses dois botões não foram colocados.
- **Gravar o fornecedor vindo da nota em `CMP_FORNECEDORES` (ORIGEM = NOTA)**: não feito (a tabela de Compras tem regras próprias de código e categoria).
- **Tabela da especificação**: o lançamento de notas usa `FIN_OMIE_NOTAS_LANC` em vez de colunas novas na `FIN_OMIE_NOTAS`, porque a antiga é gravada por API de planilha com cabeçalho fixo de 10 colunas e guardava o XML inteiro; a recepção documental continua nela (agora sem o XML).
- **Retenções da NFS-e nos campos `retem_*` do Omie (opção i)**: ficou a opção (ii) (título pelo líquido, retenções na observação) até a decisão do dono com o contador e a confirmação no Omie; a constante `OMIE_NOTA_RETENCAO_NOS_CAMPOS` marca o ponto.
- **Anexar o PDF na conferência manual da NFS-e, status DESCARTADA, sugestão de categoria por de-para de Compras**: não feitos (o de-para é decisão do dono; a sugestão usa a última categoria do mesmo fornecedor).
- **Achados M1, M2, M3, M6–M10 e itens 2 e 5–14 da seção 6** (código determinístico da baixa, tabela FIN_OMIE_OPERACOES e estorno, conciliação com tolerância, estornos de fatura, valor pago no A pagar, fila em propriedades): fora do escopo pedido.
- **Conferência anti-duplicidade e memória de 60 s**: as consultas do Omie continuam guardadas 60 s (regra do Omie de uma consulta igual por minuto). Uma conta lançada fora do SGO+ no último minuto pode não aparecer na leitura; o código de integração por parcela e a tabela local cobrem o lançamento pelo SGO+.

## 3. Decisões pendentes do dono

1. NF-e de compra: só financeiro (caminho B, feito) ou também fiscal no Omie (caminho A).
2. NFS-e: retenções nos campos do Omie (opção i, recomendada pela especificação, depende de confirmação) ou só líquido (opção ii, em uso).
3. De-para inicial de categorias por tipo de fornecedor, com o contador.
4. Importação de NF-e de saída continua sem gerar título (M7)?
5. Caixa própria para cadastrar no Omie (FIN_OMIE_CADASTRAR) e para exportar planilhas (FIN_OMIE_EXPORTAR).
6. Limite para segunda confirmação de valor e alçada de pagamento com segunda pessoa.
7. Compras e Caju passarem a lançar no Omie (itens 8 e 9 da seção 6).
8. Preencher `OMIE_EMPRESA_CNPJ` em Chaves e senhas antes de usar notas.

Para a primeira operação acompanhada (além da lista da especificação): filtro `nCodTitulo` do `ListarMovimentos`; resposta do `ConsultarRecebimento` para chave inexistente; filtros `filtrar_cliente`/`filtrar_por_emissao_de/ate` do `ListarContasPagar`; busca parcial por `razao_social`; formato de `tags` no `IncluirCliente`/`AlterarCliente`; caminhos do Padrão Nacional e das prefeituras com 3 a 5 XMLs reais.


## 4. Testes

Por arquivo relevante (`sh output/financeiro-20261116/rodar-lista.sh output/financeiro-20261116/cand4 ...`), versão final:

| Arquivo | Referência (suite-pente-fino.txt) | Agora |
|---|---|---|
| financeiro-completo-20261116 (novo) | — | 23 passam / 0 falham |
| financeiro-omie-20261114 | 25/0 | 25/0 (ajustado ao comportamento novo) |
| omie-operacoes | 20/0 | 20/0 (ajustado) |
| omie-faturamento | 12/0 | 12/0 |
| omie-financeiro | 13/0 | 13/0 (ajustado: cartão Omie com o CNPJ da empresa) |
| omie-conciliacao | 9/0 | 9/0 |
| ganhos-omie-20261115 | 6/0 | 6/0 |
| financeiro-sigilo-geral-20261116 | 5/0 | 5/0 |
| compras | 17/0 | 17/0 |
| compras-informar-conciliacao | 10/0 | 10/0 |
| conciliacao-caju | 14/0 | 14/0 |
| deposito-viagem | 21/1 | 21/1 (a mesma falha antiga da página completa) |
| poderes-lote0 | 13/0 | 13/0 |
| poderes-lote3 | 4/0 | 4/0 |

Suíte completa (`output/financeiro-20261116/suite-dev.txt`): **241 arquivos, pass 2215 / fail 80**. Referência: 239 arquivos, pass 2192 / fail 71.

Comparação arquivo a arquivo com `suite-pente-fino.txt`: **nenhum arquivo piorou**. As diferenças são duas. Primeira: +23 passando do arquivo novo `financeiro-completo-20261116`. Segunda: +9 falhas de `conduta-relato-20261116.test.cjs`, um teste de Conduta criado hoje às 14:35, que não entra na referência. Ele falha igual (0/9) contra o cand4 original, sem nenhuma mudança minha (`Conduta_apiObterRelatoOcorrencia is not a function`): testa uma função que não existe no cand4. As 71 falhas antigas continuam as mesmas.

Testes ajustados ao comportamento novo (de propósito):
- `omie-operacoes`: simulador com tipo de categoria e saldo; a edição precisa mudar um campo; a baixa vai sem juros.
- `financeiro-omie-20261114`: simulador com tipo de categoria e saldo; planilha com linha de identificação; busca no lugar da lista; dicas novas da baixa e do cliente.
- `omie-financeiro`: o cartão Omie agora traz também `OMIE_EMPRESA_CNPJ`.
- `_sigilo_fin.cjs`: carrega `SGO_Financeiro_Marca.js` quando o arquivo existe.

O arquivo novo cobre:
- B1 a B9.
- Cadastro: incluir, acrescentar tag, já cadastrado, inativo, duplicado, CNPJ inválido e o CNPJ da empresa, gravação desligada, recusa do Omie, corte em 60 letras, código guardado, nunca Upsert, sigilo.
- NF-e: 2 duplicatas, idempotência, nota de outra empresa, devolução, sem protocolo, Recebimento de NF-e com títulos, número já lançado fora do SGO+, soma diferente, nota sem título, nota sem duplicata, falha na 2ª parcela e retomada.
- NFS-e: ABRASF, padrão Nacional e formato desconhecido com conferência manual.
- Planilhas identificadas.
- Três páginas completas a 390, 320 e 1366 px (Painel com busca, cadastro, baixa, nota e impressão; Compras; Caju), sem rolagem lateral e sem erro de JavaScript.

Capturas em `output/financeiro-20261116/capturas-dev/`: `*-cadastro-omie.png`, `*-nota-recebida.png`, `*-compras-conferencia.png`, `*-compras-pagamento.png`, `*-caju-extrato.png`, `*-caju-configuracao.png`.

## 5. Arquivos

**cand4, novos:** SGO_Financeiro_Marca.js, SGO_Omie_Cadastro.js, SGO_Omie_Notas.js, JS_Financeiro_Marca.html, JS_Omie_Cadastro.html, JS_Omie_Notas.html.

**cand4, alterados:** Index.html (includes de JS_Financeiro_Marca, JS_Omie_Cadastro, JS_Omie_Notas), SGO_Omie.js, SGO_Omie_Operacoes.js, SGO_Omie_Faturamento.js, SGO_Omie_Sigilo.js, SGO_Chaves.js, SGO_Compras_Financeiro.js (CRLF preservado), SGO_Compras_Painel.js (CRLF preservado), SGO_Caju.js, SGO_Ajuda_Financeiro.js, SGO_Ajuda_Compras.js (CRLF preservado), SGO_Ajuda_ConciliacaoCaju.js, JS_Omie_Operacoes.html, JS_Omie_Faturamento.html, JS_Omie_Gestao.html, JS_Omie_Ajuda.html, JS_Compras.html (CRLF preservado), JS_ConciliacaoCaju.html.

**tests/, novos:** financeiro-completo-20261116.test.cjs, _xmlservice_teste.cjs (XmlService igual ao do servidor, para ler os XMLs).

**tests/, alterados:** financeiro-omie-20261114.test.cjs, omie-operacoes.test.cjs, omie-financeiro.test.cjs, _sigilo_fin.cjs.

**docs/:** MANUAL_PAINEL_FINANCEIRO.md (seção 8a, tabela de problemas, seções 10 e 11 regeneradas), MANUAL_COMPRAS_FINANCEIRO.md, MANUAL_CONCILIACAO_CAJU.md.

**output/financeiro-20261116/:** gerar-manual-campos.cjs (grupos novos: busca e cadastro, envios a conferir, nota recebida), suite-dev.txt, capturas-dev/.
