# Relatório — Onda 2 do Financeiro, etapas E1 a E5 (16/11/2026)

Base: `output/financeiro-20261116/cand5` (cópia da produção recém-publicada). Especificação: `especialistas/ESPEC_ONDA2_FINANCEIRO.md`.
Nada foi publicado. Não houve acesso à produção, ao banco nem ao Omie real, e nenhum commit. Todo o Omie dos testes é simulado.
Entrou também, na mesma rodada, a decisão nova do dono sobre a **alçada de aprovação** (seção 6).

## 1. E1 — sigilo das atividades do Financeiro e assistente geral

**Atividades** (`SGO_Atividades.js`):
- `ATV_MODULOS_FINANCEIRO` reúne financeiro, omie, caju, conciliacao_caju e compras_financeiro, a mesma lista de `RELDIA_FIN_MODULOS`. `Atividades_doFinanceiro_(a)` diz se a atividade é de um desses módulos.
- `Atividades_noSigiloFin_(id)` usa `Omie_contaNoSigilo_`. Sem a trava carregada, ninguém passa.
- `Atividades_restrita_`: a atividade do Financeiro é sempre restrita.
- `Atividades_podeVer_`: a atividade do Financeiro só é vista pelo responsável, por quem lançou e por quem está na lista de sigilo.
- `Atividades_gestaoSobre_`: na atividade do Financeiro, a gestão só vale para quem é gestor e está na lista de sigilo. O RH e a gestão fora da lista perdem a lista, o detalhe e as ações. As restritas do Programa de conduta continuam como antes: RH e gestão de decisões veem.
- `Atividades_apiCriar` recusa responsável fora da lista com a mensagem da especificação e grava `RESTRITA = SIM`. `Atividades_apiEditar` recusa trocar o responsável para alguém fora da lista.

**Outros leitores de atividades** (eles mostrariam o título a gestores fora da lista):
- **SEDNA** (`SGO_Sedna.js`): nova `Sedna_veEsta_(u, a)`, usada no escalonamento de nível 2 e 3 e no resumo do dia da gestão.
- **Central de pendências** (`SGO_Alertas_Central.js`):
  - o item `ATV:` de atividade do Financeiro leva `extra.sigiloFin`;
  - `Pend_podeVer_` só mostra esse item à lista de sigilo e ao responsável. A visão interna da Caixa filtra de novo.
- **Caixa de decisões** (`SGO_Gestao_Decisoes.js`):
  - o pedido de nova data (`ATV:PEDIDO:`) leva `sigiloFin`;
  - `Ges_rotear_` virou um envoltório de `Ges_rotearBase_` que tira dos responsáveis quem está fora da lista;
  - `Ges_montarCaixa_` esconde esses itens de quem está fora da lista;
  - função nova `Ges_noSigiloFin_`.
- O relatório diário da empresa já tratava a restrita só na contagem e passa a pegar estas pelo `Atividades_restrita_`.

**Assistente geral** (`SGO_Assistente.js`, CRLF mantido):
- `SGO_Assist_base_` deixa de fora a ajuda das telas omie, conciliacao_caju e compras_financeiro (e recarga_caju_gestao, para o futuro).
- Também saem os manuais `MANUAL_PAINEL_FINANCEIRO`, `MANUAL_COMPRAS_FINANCEIRO` e `MANUAL_CONCILIACAO_CAJU` e as entradas "Onde fica a tela" desses módulos.
- O Depósito de viagem, que é do colaborador, continua na base.
- O arquivo gerado `SGO_AssistenteManuais.js` não foi alterado: o filtro é feito ao montar a base. Quem está na lista também deixa de ter essas respostas no assistente geral, que é a opção preferida pela especificação. Até o especialista (E10), o lugar dessas dúvidas é o "Como usar esta tela" do Painel.

## 2. E2 — leituras do Omie reutilizáveis (`SGO_Omie_Gestao.js`)

- Laço único de paginação: `OmieLer_movimentos_(filtro, o)`. Aceita `limite`, `msgFormato`, `msgLimite`, `aCada`, `dePagina` e `maxNesta` (para a rotina continuar na rodada seguinte). A ordem dos campos do Omie é a mesma de antes, para a leitura guardada de 60 s ser compartilhada entre a tela e a rotina.
- Miolos sem sessão: `OmieLer_resumo_`, `OmieLer_agenda_`, `OmieLer_resultado_`, `OmieLer_posicao_`, `OmieLer_vencidos_` e `OmieLer_orcamento_`.
  - `OmieLer_resultado_` aceita `{ categorias, aCada }` e devolve `paginas`, para a rotina.
  - `OmieLer_vencidos_` aceita `{ semNomes }`.
  - As api (`Omie_apiResumo` etc.) chamam o miolo depois de `Omie_exigirAcesso_`.
- **Nome diferente da especificação:** `OmieLer_*_` no lugar de `OmieGest_*_`, porque `OmieGest_resumo_`, `OmieGest_agenda_` e outras já existem na tela (`JS_Omie_Gestao.html`).
- O teste de equivalência roda as mesmas consultas contra a cópia anterior (`cand4/SGO_Omie_Gestao.js`). Saídas iguais e chamadas ao Omie iguais, na mesma ordem e com os mesmos parâmetros.

## 3. E3 — fotografia diária (`SGO_Financeiro_Foto.js`, novo)

**Rotina.** `FinFoto_rodada_(quando)` é chamada por `Ges_rodada_` (`SGO_Gestao_Escada.js`) antes da trava do expediente, para poder rodar às 06:00.
- Passos, com cursor em `FIN_FOTO_CURSOR`:
  1. posicao;
  2. categorias (uma vez por dia, na memória do servidor);
  3. titulos (vencimento de hoje − 365 a hoje + 90);
  4. meses (o atual e os 3 anteriores todo dia; os 12 do gráfico só se faltarem ou, no domingo, se não fecharam);
  5. orcamento;
  6. fechar.
- Uma fotografia por dia, a partir de `FIN_FOTO_HORA` (padrão 06:00). Depois de feita, a rodada não chama o Omie no mesmo dia.
- Limite de páginas por rodada: 20 fora do expediente e 8 no expediente.
  - O limite é conferido antes de cada página de títulos e antes de cada mês.
  - **Um mês começado é lido inteiro**, porque o miolo do Resultado agrega o mês todo. A rodada pode passar do limite pelo tamanho de um mês, no máximo 40 páginas no pior caso; no teste foram 4 contra um limite de 3.
- No expediente, se a tela chamou o Omie nos últimos 3 minutos, a rodada é adiada. A marca `FIN_OMIE_TELA_EM` é gravada em `Omie_requisitar_` (`SGO_Omie.js`) só em chamada real e fora da rotina (variável `OMIE_EM_ROTINA`).
- "Omie ocupado" e "consulta repetida" fazem a rodada esperar a seguinte, até 3 vezes. Depois disso, a fonte fica de fora e o indicador mostra "não calculado: motivo".

**Tabelas novas** (lidas só pela api sob sigilo):
- `FIN_FOTOS`: ID, DIA, INICIADA_EM, CONCLUIDA_EM, SITUACAO, INDICADORES_JSON, AGING_JSON, TOP_CLIENTES_JSON, TITULOS_N, FALHAS_JSON, ORIGEM e EXTRA_JSON. EXTRA_JSON é coluna a mais em relação à especificação e guarda o orçamento do mês e o G8. Fica uma linha por dia; o refazer do mesmo dia substitui a linha.
- `FIN_FOTO_MES`: recebido, pago, transferências e despesas por categoria.

**O que não é gravado:**
- Nenhum nome, CNPJ ou documento. Os maiores clientes ficam pelo código do Omie.
- Os nomes dos clientes ficam só na memória do servidor por 6 h (`FIN_FOTO_NOMES_<dia>`).
- O log não leva valores.

**Diferença da especificação:** a lista de títulos **não** fica na memória para a Agenda e a Régua, que são E6 e E7. A rotina guarda só os acumuladores, na memória por 6 h, enquanto a fotografia está em andamento.

**"Atualizar agora".** `Fin_apiFotoPedir` só marca `FIN_FOTO_PEDIDO` e nunca chama o Omie. Ele recusa, dizendo o motivo, quando:
- há uma fotografia em andamento;
- já há um pedido;
- a última fotografia tem menos de 15 minutos;
- a fotografia diária está desligada;
- o Omie não está configurado.

## 4. E4 — aba Indicadores

**Servidor** (`SGO_Financeiro_Indicadores.js`, novo):
- `FIN_IND_DEF` traz, para I01 a I19 e para I01M "Folga sobre o saldo mínimo", o nome, "como é calculado", "o que é e como ler" e se melhor é maior ou menor.
- `FinInd_montar_` calcula a partir dos acumuladores, em centavos. `FinInd_local_` calcula I17 a I19 e o G8 com as tabelas do próprio SGO+.
- `Fin_apiIndicadores` passa por `Omie_exigirAcesso_` e entra no registro como "Indicadores do Financeiro" (nome acrescentado em `OMIE_SIGILO_NOMES`). Lê só a fotografia, compara com a de 7 ou 30 dias atrás (seta e melhor/pior) e monta os gráficos G1 a G8 em SVG.
  - Os gráficos usam `RelA4_barras_`, `RelA4_barrasEmpilhadas_` e duas funções novas no mesmo padrão: `FinInd_svgColunas_` e `FinInd_svgLinha_`.
  - O G2 (previsão de 90 dias) ficou como aviso: entra com a E7.
  - O G8 mostra só viagem.
- A folga sobre o saldo mínimo e a nota são calculadas na leitura, com a configuração em vigor.

**Tela** (`JS_Financeiro_Indicadores.html`, novo; include no `Index.html`; aba `indicadores` antes de "Sigilo e acessos" em `JS_Omie_Gestao.html`):
- No topo, a faixa com a data da fotografia, as falhas e o motivo do botão parado.
- Depois, o cartão da nota de saúde e os 20 cartões, cada um com as duas linhas de explicação.
- Por fim, os 8 gráficos com a frase de cada um.
- Texto justificado, sem rolagem lateral a 1366, 390 e 320 px, marca d'água do Painel.

**Indicadores que ficaram "não calculado" de propósito:**
- I16: depende da régua de cobrança (E6).
- I09 e I11: se o Omie não devolver `dDtEmissao` (a confirmar), mostram o motivo e indicam o atraso médio.

## 5. E5 — nota de saúde (`SGO_Financeiro_Saude.js`, novo)

- `FinSaude_calcular_(ind, cfg)` é pura e segue a seção 3.3.
  - Interpolação linear entre ruim e bom, nos dois sentidos.
  - C2 sem contas a pagar em 30 dias vale a pontuação cheia.
  - C6 tem quatro conferências; a que não pôde ser feita sai da conta proporcionalmente.
  - Critério sem dado sai da nota e os pesos são reescalados ("calculada com 5 de 6 critérios: …").
  - Faixas 80, 60 e 40.
  - Cada critério traz uma frase escrita pelo sistema.
- `FinSaude_config_` lê os pesos e os limites em Chaves e senhas; valor estranho vale o padrão.

## 6. Decisão nova do dono: só o dono e a Diretoria aprovam (alçada `OMIE_ALCADA_APROVACAO`)

**Servidor** (`SGO_Omie_Regras.js`):
- `OmieRegras_podeAprovar_(eu)`: aprova quem está na lista de sigilo **e** é o dono (`Chaves_ehDonoUsuario_`) ou da Diretoria (perfil ou área), por meio de `OmieSig_ehDiretoria_`.
- `OmieRegras_apiDecidir` recusa aprovar **e** recusar a quem não pode. A recusa diz o quê, por quê e o que fazer e fica registrada como NEGADO em FIN_OMIE_ACESSOS.
- Quem preparou continua sem decidir a própria operação: se o dono preparou, decide o Charles, e vice-versa.
- `OmieRegras_pendentes_` traz `podeDecidir`. A faixa "aguardando a sua aprovação" (`OmieRegras_contarPendentesPara_`) só aparece para quem pode decidir. `OmieRegras_apiTela` traz `podeAprovar`.
- Textos das prévias e da confirmação: "aguardando a aprovação do dono do sistema ou da Diretoria".

**Telas, ajuda e manual:**
- `JS_Omie_Regras.html`: o Financeiro vê a operação com "Aguardando a decisão do dono do sistema ou da Diretoria", sem os botões.
- Explicações e guia: `OMIE_DICAS.aprovMotivo` e `OMIE_GUIAS.regras`.
- `SGO_Ajuda_Financeiro.js`.
- Ajuda da chave em `SGO_Chaves.js`.
- Manual: seção 8c, tabela de problemas (linha nova "Você não aprova nem recusa…") e seção 10 regenerada.

## 7. Configurações novas (Chaves e senhas > Regras do Financeiro; sem valor = padrão)

| Chave | Formato | Padrão (vazio) |
|---|---|---|
| `FIN_SALDO_MINIMO` | R$ ≥ 0 | "a definir" (o cartão I01M mostra "a definir") |
| `FIN_SAUDE_PESOS` | 6 inteiros C1..C6 somando 100 | 25;20;20;20;5;10 |
| `FIN_SAUDE_LIMITES` | "Cn: ruim a bom; …" (C1 a C5) | C1 10 a 60 dias; C2 0,8 a 1,3; C3 15 a 3 %; C4 0 a 15 %; C5 70 a 35 % |
| `FIN_FOTO_HORA` | hh:mm | 06:00 |
| `FIN_FOTO_ROTINA` | Ligada / Desligada | Ligada |

As cinco são validadas em `Chaves_validarValor_`. Os pesos e os limites são validados por `FinSaude_validarPesos_` e `FinSaude_validarLimites_`. A aba Regras do Financeiro mostra o saldo mínimo, a nota e a fotografia em vigor.

## 8. Ajuda e manual

**Ajuda:**
- `OMIE_GUIAS.indicadores` e `OMIE_DICAS.finIndComparar` (em `JS_Omie_Ajuda.html`, CRLF mantido).
- `SGO_Ajuda_Financeiro.js`: passo "Indicadores e saúde financeira" e três problemas novos.

**Manual** (`docs/MANUAL_PAINEL_FINANCEIRO.md`):
- Tabela das abas com Regras e Indicadores.
- Seção **8d** nova: rotina, os 20 indicadores com as duas linhas, a nota com a tabela de critérios, as configurações, os gráficos, as atividades e o assistente.
- Seções 10 e 11 regeneradas.

**Gerador do manual.** O gerador `output/financeiro-20261116/gerar-manual-campos.cjs` fica fora da área permitida e não conhece a aba nova: escreveria "undefined". Por isso as seções foram geradas com uma cópia ampliada: `especialistas/gerar-manual-campos-onda2.cjs`, que acrescenta a aba Indicadores aos nomes e o grupo "Indicadores". Convém trocar o original por ela.

## 9. O que ficou de fora

- E6 em diante: régua de cobrança, agenda e previsão de 90 dias (G2), relatório semanal e especialista. A Recarga Caju também ficou de fora, como pedido.
- A caixa nova `FIN_CONFIGURAR` (seção 1.7) não foi criada: as configurações ficam em Chaves e senhas, que já é só do responsável pelo sistema.
- G8 só com viagem; I16 aguarda a E6.
- **A confirmar no Omie real:** os campos `dDtEmissao` e `dDtPagamento` do `ListarMovimentos`. Sem a emissão, o PMR e o PMP mostram o motivo.
- O e-mail de atividade nova continua levando o título digitado pela pessoa. Não foi mexido.

## 10. Testes

`tests/financeiro-onda2-e1e5.test.cjs` (novo): **12 passam, 0 falham**. Cobre:
- **E1:** a atividade do Financeiro some para o RH, a gestão e o técnico fora da lista, na lista e no detalhe; quem está na lista vê. O responsável fora da lista é recusado, na criação e na troca. O Conduta segue igual: o RH e a gestão veem, o técnico não. A SEDNA, a central e o roteamento da Caixa também foram conferidos. O assistente geral fica sem trechos do Financeiro.
- **E2:** equivalência com a cópia anterior.
- **E3:**
  - a fotografia só com agregados, sem nomes nem CNPJ;
  - nenhuma consulta repetida e o plano de contas lido uma vez;
  - não repete no mesmo dia; no dia seguinte relê só os 4 meses recentes;
  - limite por rodada com cursor, dando os mesmos números da rodada única;
  - "Omie ocupado" espera a rodada seguinte;
  - adiada quando a tela está em uso;
  - fonte que falha deixa o indicador "não calculado" e a fotografia INCOMPLETA;
  - o pedido "Atualizar agora": 15 minutos, sigilo, nenhuma chamada ao Omie e substituição da fotografia do dia.
- **E4:** cada indicador com números calculados à mão:
  - I01 30.000; I02 21.000; I03 9.000; I04 42,9 %; I05 23,8 %; I06 11.500;
  - I07 3.000; I08 37,5 %; I09 34,5 dias; I10 4,6 dias; I11 30 dias;
  - I12 128,6 dias; I13 4,05 vezes; I14 97,6 %; I15 50 %; I18 0; I19 0.
  - Também: "a definir", folga negativa com o mínimo, comparação de 7 dias, gráficos, sigilo com registro, cenário sem fotografia e cenário sem a data de emissão.
- **E5:** a nota 70 (Atenção) com os pontos 25/20/0/18,1/0/6,7 e as frases; casos-limite; reescala; faixas; validação e efeito das configurações; rotina desligada.
- **Alçada:** o Financeiro não aprova nem recusa; a Diretoria aprova; a autoaprovação é recusada; o dono aprova o que a Diretoria preparou e vice-versa.
- **Página completa** a 1366, 390 e 320 px, sem rolagem lateral e sem erro de JavaScript. Capturas em `output/financeiro-20261116/capturas-onda2/{1366,390,320}-indicadores.png`.

**Testes ajustados de propósito:**
- `tests/financeiro-omie-20261114.test.cjs`: 17 abas.
- `tests/financeiro-config-20261116.test.cjs`: quem aprova passa a ser a Diretoria (dora). Na página, a Wanessa vê a operação sem os botões.

**Lista** (`rodar-lista.sh`):

| Arquivo | Resultado |
|---|---|
| financeiro-onda2-e1e5 | 12/0 |
| financeiro-config-20261116 | 8/0 |
| financeiro-completo-20261116 | 23/0 |
| financeiro-omie-20261114 | 25/0 |
| financeiro-sigilo-geral-20261116 | 5/0 |
| omie-operacoes | 20/0 |
| conduta-relato-20261116 | 10/0 |
| atividades-equipe-avisos | 12/1 (mesma falha antiga da referência) |
| atividades-pedido-nova-data | 14/0 |
| sedna | 11/0 |
| gestao-decisoes | 18/0 |
| assistente-duvidas | 10/2 (mesmas 2 falhas antigas da referência) |
| app-tecnico-atividades | 3/0 |
| comercial-atividade-gestao | 5/0 |
| servico-tecnico-atividade | 5/0 |

## 11. Suíte completa

Resultado em `output/financeiro-20261116/suite-onda2.txt`: **243 arquivos, pass 2245 / fail 71**, com 27 arquivos de saída diferente de zero. Referência `suite-config.txt`: 242 arquivos, pass 2233 / fail 71.

Comparação arquivo a arquivo: **nenhum arquivo piorou**. A única diferença é o arquivo novo `financeiro-onda2-e1e5` (+12 passando). As 71 falhas são as mesmas antigas.

## 12. Arquivos

**cand5, novos:** `SGO_Financeiro_Foto.js`, `SGO_Financeiro_Indicadores.js`, `SGO_Financeiro_Saude.js`, `JS_Financeiro_Indicadores.html`.

**cand5, alterados:**
- `Index.html`
- `SGO_Atividades.js`
- `SGO_Sedna.js`
- `SGO_Alertas_Central.js`
- `SGO_Gestao_Decisoes.js`
- `SGO_Gestao_Escada.js`
- `SGO_Assistente.js` (CRLF)
- `SGO_Omie_Gestao.js`
- `SGO_Omie.js`
- `SGO_Omie_Sigilo.js`
- `SGO_Omie_Regras.js`
- `SGO_Chaves.js`
- `SGO_Ajuda_Financeiro.js` (finais de linha misturados, como já era)
- `JS_Omie_Gestao.html` (CRLF)
- `JS_Omie_Ajuda.html` (CRLF)
- `JS_Omie_Regras.html`

**tests/:** `financeiro-onda2-e1e5.test.cjs` (novo); `financeiro-config-20261116.test.cjs` e `financeiro-omie-20261114.test.cjs` (ajustados).

**docs/:** `MANUAL_PAINEL_FINANCEIRO.md`.

**output/financeiro-20261116/:**
- `especialistas/gerar-manual-campos-onda2.cjs`
- `especialistas/RELATORIO_ONDA2_E1E5.md`
- `capturas-onda2/*.png`
- `suite-onda2.txt`
