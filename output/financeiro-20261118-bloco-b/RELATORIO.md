# Relatório — Bloco B da onda 3 do Financeiro: E6, E7, E8 e E9 (18/11/2026)

Base: `output/financeiro-20261116/cand20` (cópia da produção atual; antes da mudança, idêntica à `cand19`). Especificação:
`output/financeiro-20261116/especialistas/ESPEC_ONDA2_FINANCEIRO.md`, seções 1.5 a 1.9, seção 3 e a parte E6 a E9 da seção 6.

Nada foi publicado. Não houve acesso à produção, ao banco, ao Omie, ao Caju nem ao Gemini reais, e nenhum e-mail real saiu. Não houve
commit. O Omie, a IA e o e-mail dos testes são simulados (`tests/_financeiro_bloco_b.cjs`).

## 1. O que foi feito

### E6 — Régua de cobrança (aba nova "Régua de cobrança")

- **Quadro (Kanban) de 8 colunas.** As colunas são as da tabela 1.5:
  - a vencer em 5 dias;
  - vencido sem contato;
  - em contato;
  - promessa;
  - promessa quebrada;
  - acordo ou renegociação;
  - com a Diretoria;
  - recebido (7 dias).
- **A etapa é calculada.** A função pura `FinCob_etapa_` usa a fotografia diária e as ações registradas. Ninguém arrasta cartão.
- **Promessa quebrada.** Vale a data prometida mais N dias úteis, pelo calendário do expediente (feriados nacionais, móveis e cadastrados).
- **Cartão.** Mostra:
  - cliente (nome do Omie);
  - documento e parcela;
  - saldo e dias de atraso;
  - atraso médio do cliente em 12 meses, ponderado pelo valor;
  - próxima ação e promessa;
  - decisão da Diretoria;
  - última ação e quem a registrou.
- **Painel do título** (aberto pelo toque no cartão):
  - histórico;
  - atalhos para a Ficha do cliente e para Cobranças (segunda via ou prorrogação);
  - formulário com explicação embaixo de cada campo (`regAcao` … `regMotivoDir`, textos da especificação).
- **Decisão.** Protesto, negativação, cobrança jurídica, perda ou voltar à cobrança: **só o dono e a Diretoria decidem** (`OmieSig_ehDiretoria_`), com motivo de pelo menos 15 letras. Quando a Wanessa tenta, a recusa diz o quê, por quê e o que fazer, e fica registrada como NEGADO.
- **Tabelas novas.**
  - `FIN_COBRANCA`: merge campo a campo. A próxima ação e a promessa não são apagadas por uma ação seguinte.
  - `FIN_COBRANCA_ACOES`: histórico imutável.
  - Não guardam CNPJ, e-mail do cliente nem valor do título (só a promessa).
  - E-mails e números longos digitados nos textos são retirados.
- **Caixa nova `FIN_COBRANCA_REGISTRAR`.** Padrão: perfis ADMIN, DIRETORIA e FINANCEIRO dentro da lista de sigilo. Cai sozinha na trava `PODERES_SIGILO_FIN`.
- **Pendências** (central), só para a lista de sigilo e **só por contagem**, sem nome de cliente nem valor. Ids `OMIE:COB:`, para o relatório diário da empresa mostrar só a contagem.
  - lembretes do dia: vão para quem registrou a última ação;
  - promessas quebradas: Financeiro e Diretoria;
  - títulos com a Diretoria: dono e Diretoria.
- **I16 (execução da cobrança).** Passa a ser calculado na fotografia e mostrado no quadro.
- **Régua externa (e-mail ao cliente).** Chave `FIN_COBRANCA_EXTERNA`, **desligada por padrão**. Ligá-la ainda não envia nada: a tela avisa que o texto, o dia de início e o boleto dependem do dono.
- **Nada vai ao Omie** pela régua.

### E7 — Agenda financeira (aba nova "Agenda financeira")

**Gantt.**
- **Janela:** 30, 60 ou 90 dias (padrão 60), com a semana anterior à vista.
- **Linhas:**
  - a receber por cliente: os 10 maiores e "Outros clientes";
  - a pagar por categoria do Omie: as 10 maiores e "Outras categorias";
  - provisões internas;
  - prazos de prestação de contas de viagem (Caju).
- **Marcas:** losango cheio é vencido e vazado é a vencer. Barra amarela é promessa; barra roxa é acordo.
- **Desenho:** SVG no servidor, com a régua de `SGOGantt_fabrica_`. Toque mostra o detalhe.

**Previsão de caixa de 90 dias** (`FinAg_previsao_`, pura).
- **Curva otimista:** pelo vencimento ou pela previsão do título.
- **Curva realista:**
  - aplica a taxa de recebimento em até 15 dias depois do vencimento;
  - desloca pelo atraso médio;
  - aplica a recuperação observada aos vencidos até 90 dias.
- **Vencido há mais de 90 dias:** fica fora das duas curvas.
- **Saídas:** tabela semanal (13 semanas), gráfico G2 e o alerta do mínimo. O mesmo G2 entra na aba Indicadores e no relatório.

**Fotografia** (`SGO_Financeiro_Foto.js`).
- A lista enxuta dos títulos fica **só na memória do servidor** (`FIN_FOTO_TIT_<dia>`, 6 horas). Ela é renovada a cada rodada de 15 minutos enquanto a fotografia é a de hoje.
- Junto dela ficam as taxas da previsão, o recebido e o pago por dia (90 dias, em `EXTRA_JSON`, só números) e os nomes de mais clientes (régua e fornecedores vencidos).
- Nenhum nome, CNPJ ou documento vai para tabela.

### E8 — Relatório semanal de saúde financeira (aba nova "Relatórios semanais")

**Rotina `FinRel_rodada_`.** É chamada por `Ges_rodada_`, logo depois da fotografia e antes da trava do expediente.
- Gera a **semana fechada** (segunda a domingo, chave ISO `AAAA-Sww`) no dia e na hora configurados. Padrão: **segunda, 07:00**.
- Se o dia não for útil, gera no primeiro dia útil seguinte.
- Gera um relatório por semana. Se o servidor ficou parado, recupera na primeira rodada da mesma semana.
- Espera a fotografia do dia até as 10:00. Depois disso usa a última fotografia e avisa na capa.

**A4** (moldura `RelA4_documento_`).
- **Índice clicável.**
- **Seções:**
  1. Resumo executivo (nota com seta, 6 indicadores, 3 parágrafos);
  2. Saúde (critérios e gráfico da nota por semana);
  3. Caixa (início e fim, entradas e saídas, G2, alerta, premissas, tabela semanal);
  4. Recebimentos e cobrança (G3, 10 maiores vencidos com nome, promessas quebradas, I16, prazos médios com tendência);
  5. Pagamentos (30 dias por categoria, vencidos);
  6. Resultado (G1, G5, G7);
  7. Caju (I19, G8);
  8. Disciplina;
  9. Comparação com as 4 semanas anteriores (variação absoluta e percentual);
  10. Conclusão;
  11. Anexo com a fórmula de cada número.
- **Numeração:** figuras e tabelas numeradas automaticamente.
- **Marca de sigilo:** cada página impressa leva "gerado para <nome> (login) em … · código XXXX-XXXX".

**Guarda.**
- HTML e PDF ficam na pasta própria **não compartilhada** "SGO+ Financeiro - Relatórios semanais".
- Tabela `FIN_RELATORIOS`. Colunas a mais em relação à especificação: `FOTO_DIA`, `AVISOS_JSON` e `HTML_RESERVA` (esta guarda o HTML só se o Drive falhar).

**Abertura** (`FinRel_apiAbrir`).
- Passa pela trava de sigilo.
- Grava `PERMITIDO` e `ABERTO` (com o código) em `FIN_OMIE_ACESSOS`.
- O link do Drive **nunca** vai para a tela nem para o e-mail.
- A tela mostra o relatório num quadro, com "Imprimir ou salvar em PDF".

**Aviso.**
- **Só o link** (`FIN_RELATORIO_ENVIO` = `LINK`, padrão), sem nenhum valor nem a nota. `LINK_NOTA` acrescenta só a faixa. **Não há opção de anexo.**
- **Quem recebe por padrão:** o dono e a Diretoria da lista de sigilo, na hora.
- **A Wanessa não recebe.** Outras pessoas só recebem se configuradas em `FIN_RELATORIO_DESTINOS`, e só dentro do expediente.
- O sistema **só envia a quem está na lista de sigilo** na hora do envio. Os ignorados aparecem na aba.
- O envio usa `SGO_notificar_` (canal e-mail, origem `FINANCEIRO_RELATORIO`, registro em `NTF_ENVIOS`) e grava `ENVIOS_JSON`.

**"Gerar agora"** (caixa nova `FIN_RELATORIO_GERAR`, padrão ADMIN, DIRETORIA e FINANCEIRO): gera a semana em curso, **parcial**, sem aviso.

### E9 — IA no relatório (`SGO_Financeiro_RelatorioIA.js`)

- **Autorização.** `FIN_IA_AUTORIZADA`, padrão **Sim** (decisão do dono). Com Não, ou sem a chave, nenhum dado sai e entra o texto padrão (`FinRel_padrao_`).
- **Pseudonimização** (`FinIa_contexto_`).
  - Clientes e fornecedores viram `Cliente 01` e `Fornecedor 01`.
  - Não vão documento, CNPJ, CPF, e-mail, telefone nem nome de colaborador. `ASN_mascarar_` é aplicado ao texto inteiro.
  - Os valores das listas vão em reais inteiros.
  - O que vem do Omie (nomes de categoria) vai entre `<<<DADOS … DADOS>>>`, com a instrução de ignorar ordens escritas ali.
- **Conferência** (`FinRel_conferirNumeros_`).
  - Confere moeda, percentual, decimal, inteiro com 2 dígitos ou mais, "mil" e datas, aceitando o arredondamento para inteiro ou para uma casa.
  - Um parágrafo com número fora do contexto, ou com nome próprio que não veio dele (`FinRel_nomesEstranhos_`), é trocado pelo texto padrão.
  - O relatório registra "análise parcialmente substituída".
  - Os códigos só são trocados pelos nomes reais (reidratação) depois da conferência.

### Configuração (Chaves e senhas > Regras do Financeiro; sem valor = padrão)

- `FIN_COBRANCA_AVENCER_DIAS` (5)
- `FIN_COBRANCA_CONTATO_DIAS` (7)
- `FIN_COBRANCA_TOLERANCIA` (2 dias úteis)
- `FIN_COBRANCA_EXTERNA` (desligada)
- `FIN_RELATORIO_SEMANAL` (ligado)
- `FIN_RELATORIO_DIA` (segunda)
- `FIN_RELATORIO_HORA` (07:00)
- `FIN_RELATORIO_DESTINOS` (vazio = o dono e a Diretoria da lista)
- `FIN_RELATORIO_ENVIO` (só o link)
- `FIN_IA_AUTORIZADA` (sim)

Todas são validadas em `Chaves_validarValor_`. O texto de ajuda de `FIN_SALDO_MINIMO` foi atualizado.

### Ajuda, manual e assistente

- **`JS_Omie_Ajuda.html`:** `OMIE_GUIAS` das três abas ("Como fazer nesta aba") e `OMIE_DICAS` de cada campo.
- **`SGO_Ajuda_Financeiro.js`:** três passos e cinco problemas novos.
- **`docs/MANUAL_PAINEL_FINANCEIRO.md`:**
  - tabela das abas;
  - caixas;
  - seções novas **8f** (régua), **8g** (agenda e previsão) e **8h** (relatório);
  - 5 problemas novos;
  - as três abas na seção 10 e os campos na seção 11 (texto igual ao da tela);
  - linhas do I16 e do G2 corrigidas.
- **Base do assistente** (`SGO_AssistenteManuais.js`): regenerada com `_tools/gerar_base_assistente.cjs`. O manual do Painel continua marcado `acesso: sigilo`, então só a lista de sigilo vê. A ajuda das telas do Financeiro continua fora da base geral.
- **`SGO_AssistenteErros.js`:** as três telas novas foram mapeadas para `omie`. As funções `Fin*_` já eram tratadas como sigilosas.

## 2. Arquivos (relativos à cand20)

**Novos:**
- `SGO_Financeiro_Cobranca.js`
- `SGO_Financeiro_Agenda.js`
- `SGO_Financeiro_Relatorio.js`
- `SGO_Financeiro_RelatorioIA.js`
- `JS_Financeiro_Cobranca.html`
- `JS_Financeiro_Agenda.html`
- `JS_Financeiro_Relatorios.html`

**Alterados** (fim de linha preservado; conferido arquivo a arquivo):
- `Index.html` (LF)
- `JS_Omie_Gestao.html` (CRLF): 3 abas, rotas e `?aba=` do link do aviso
- `JS_Omie_Ajuda.html` (CRLF)
- `SGO_Ajuda_Financeiro.js`: misto, como já era; a linha 37 continua só LF
- `SGO_AssistenteErros.js`
- `SGO_AssistenteManuais.js` (gerado)
- `SGO_Chaves.js`
- `SGO_Financeiro_Foto.js`
- `SGO_Financeiro_Indicadores.js`
- `SGO_Gestao_Escada.js`: `FinRel_rodada_` em `Ges_rodada_`, sem cron novo
- `SGO_Omie_Sigilo.js`: nomes das consultas no registro de acessos

**Fora da cand20:**
- `docs/MANUAL_PAINEL_FINANCEIRO.md`
- `tests/_financeiro_bloco_b.cjs` (novo)
- `tests/financeiro-cobranca-agenda.test.cjs` (novo)
- `tests/financeiro-relatorio-semanal.test.cjs` (novo)
- `tests/financeiro-omie-20261114.test.cjs`: ajustado de propósito, de 18 para 21 abas

Diff completo: `legado-bloco-b.patch` (cand19 → cand20).

## 3. Testes

**`financeiro-cobranca-agenda` — 7 passam, 0 falham.** Cobre:
- **Transições** da tabela 1.5, incluindo a promessa de quinta 19/11 com o feriado de 20/11 e o fim de semana: quebra só em 25/11, e com tolerância 0 quebra em 20/11.
- **Quadro e ações:**
  - validações e merge;
  - decisão só da Diretoria, com NEGADO registrado;
  - histórico;
  - I16 de 66,7 % calculado à mão;
  - nenhuma chamada ao Omie.
- **Pendências:** só a lista de sigilo, por contagem, sem nome nem valor; RH e gestor não veem.
- **Régua externa** desligada.
- **Sigilo:** recusa e registro nas quatro APIs, e a caixa nova.
- **Previsão** com números à mão:
  - 10.500 e 8.500 hoje; 5.500 em 25/11, que cruza o mínimo de 6.000; 4.500 e 5.300 no fim;
  - mínimo "a definir";
  - sem histórico.
- **Gantt:**
  - losangos cheio e vazado;
  - barra de promessa;
  - janelas de 30 e 90 dias;
  - G2 em Indicadores;
  - memória perdida e renovação da memória.
- **Página completa** a 1366, 390 e 320 px, com ação registrada pela tela, guia e explicações.

**`financeiro-relatorio-semanal` — 8 passam, 0 falham.** Cobre:
- **3.9-1:** nota de saúde nos casos-limite e com reescala.
- **3.9-2:**
  - 06:50 ainda não gera; 07:05 gera a S47; não gera duas vezes;
  - segunda 30/11 cadastrada como feriado: sai na terça, S48;
  - espera a fotografia e, às 10:05, usa a última.
- **3.9-3:**
  - Rita e um login inexistente são ignorados;
  - Wanessa configurada fica pendente às 07:05 e recebe às 08:30;
  - por padrão, só o dono e a Dora recebem.
- **3.9-4:** sem "R$", sem "%", sem valores nem a nota no modo LINK; `LINK_NOTA` só com a faixa; nunca anexo.
- **3.9-5:**
  - fora da lista, recusa e NEGADO;
  - dentro, a marca com o código, PERMITIDO e ABERTO;
  - nenhum endereço do Drive;
  - "Gerar agora" parcial e sem aviso.
- **3.9-6:**
  - parágrafo com número inventado e parágrafo com nome de fora são trocados pelo padrão (origem PARCIAL);
  - "Cliente 01" reidratado para o nome real;
  - tudo certo dá origem IA.
- **2.8-3:**
  - o contexto não leva nomes, CNPJ, CPF, e-mail, documentos nem colaboradores;
  - a instrução escondida fica dentro de `<<<DADOS`.
- **3.9-7 e 2.8-2:** sem a chave, ou com Não, o relatório sai completo e nenhuma chamada vai à IA.
- **3.9-8:**
  - âncoras válidas;
  - figuras e tabelas numeradas em ordem;
  - `@page A4`;
  - PDF de impressão;
  - 1366 px sem rolagem lateral;
  - aba a 1366 e 390 px;
  - prévia gravada.

**Regressão** (`rodar-lista.sh`):

| Arquivo | Passam | Falham |
|---|---|---|
| financeiro-onda2-e1e5 | 12 | 0 |
| financeiro-omie-20261114 | 25 | 0 |
| financeiro-config-20261116 | 8 | 0 |
| financeiro-completo-20261116 | 23 | 0 |
| financeiro-sigilo-geral-20261116 | 5 | 0 |
| financeiro-onda3-a | 7 | 0 |
| assistente-duvidas | 12 | 0 |
| assistente-manuais-acesso-20261117 | 6 | 0 |

**Suíte completa:** ver `suite.txt` (seção 7 deste relatório).

**Capturas** (`capturas/`):
- `1366-`, `390-` e `320-regua-kanban.png`
- `1366-` e `390-regua-painel.png`
- `1366-`, `390-` e `320-agenda-gantt-previsao.png`
- `1366-relatorio-a4.png`
- `1366-` e `390-relatorios-semanais.png`

**Prévia do A4 com dados simulados:** `previa-relatorio-semanal.html`.

## 4. Decisões adotadas

- Segui as decisões do dono: só ele e a Diretoria aprovam; sigilo; Gemini liberado; só link; Wanessa fora do aviso; régua externa desligada; protesto e perda só da Diretoria.
- **Saldo mínimo:** nenhum valor inventado. Sem ele, a previsão avisa só o saldo negativo e a tela diz que o mínimo está "a definir".
- **Nomes das APIs:** os da especificação (`FinCob_apiQuadro`, `FinCob_apiAcao`, `FinCob_apiHistorico`, `FinRel_apiAbrir`), mais `FinAg_apiAgenda`, `FinRel_apiLista` e `FinRel_apiGerar`.
- **`FIN_CONFIGURAR` não foi criada.** Como na onda 2, a configuração fica em Chaves e senhas, que já é do responsável pelo sistema. A aba Relatórios mostra a configuração só para leitura.
- **Sem evento novo na matriz de avisos (FN01).** O aviso usa a origem `FINANCEIRO_RELATORIO` sem evento, então sai na hora para a Diretoria. Motivos:
  - não expor um evento financeiro na tela da matriz, que a gestão vê;
  - manter a regra própria: Diretoria a qualquer hora, outros só no expediente.
- **Vista do Gantt:** Semana para 30 dias e Mês (marca semanal) para 60 e 90 dias. A especificação dizia Semana; com 90 dias o quadro teria cerca de 3,6 m de largura.
- **Decisão da Diretoria na régua:** a decisão (ex.: perda) devolve o título a "Em contato", com a decisão visível no cartão, para o Financeiro executar.
- **Página fora do PDF:** "Baixar PDF" é a impressão da cópia identificada no navegador. Não há PDF gerado por download no servidor.

## 5. O que ficou para depois (exige decisão ou dado real que não existe)

- **Valores que o dono ainda não deu:** saldo mínimo, limites e pesos da nota (com o contador). Ficam configuráveis.
- **Régua externa por e-mail ao cliente:** texto, dia de início, se vai boleto; e conferir se o plano do Omie já faz essa régua.
- **Atalho "Criar atividade" na régua:** depende da E11 (especialista).
- **"Notas recebidas aguardando lançamento"** no relatório: o sistema não acompanha; aparece como "não acompanhado".
- **Recarga Caju na seção 7 do relatório:** o G8 mostra só viagem (bloco C).
- **A confirmar no Omie real:**
  - o campo `dDtPrevisao` do `ListarMovimentos` (sem ele, a previsão usa o vencimento);
  - `dDtEmissao`, como já estava pendente.

## 6. Riscos a conferir antes de publicar

1. **Primeira segunda-feira, 07:00.** Na primeira rodada a partir das 07:00 de **segunda 23/11/2026** (se publicado antes), sai o relatório da semana **47 (16 a 22/11)**, desde que a fotografia do dia esteja pronta. Se não estiver, a rotina espera até as 10:00.
   - **Recebem o e-mail (só o link):** o dono do sistema e o Charles, isto é, as contas da lista de sigilo que `OmieSig_ehDiretoria_` reconhece (dono por `SGO_DONOS`/`Chaves_ehDonoUsuario_`, ou perfil/área DIRETORIA).
   - **Não recebem:** a Wanessa e ninguém fora da lista.
   - **Conferir antes:** o e-mail cadastrado de `admin` e de `charles` em CAD_USUARIOS (sem e-mail o envio fica "não avisado" com o motivo) e o perfil ou a área DIRETORIA do Charles.
   - **Publicação numa segunda depois das 07:00:** o relatório da semana anterior sai na primeira rodada. Para evitar, publicar com `FIN_RELATORIO_SEMANAL = DESLIGADO` e ligar depois.
   - **Sem histórico:** a primeira semana não tem comparação nem gráfico da nota por semana; a tela e o A4 dizem isso.
2. **IA ligada por padrão.** A primeira geração já envia o contexto pseudonimizado ao Gemini, com a chave existente. Conferir que a chave é a paga, conforme decidido.
3. **Memória do servidor.** A lista de títulos fica no cache em memória do servidor Node, sem limite de tamanho. No Apps Script o limite seria de 100 KB por valor; aqui não se aplica.
   - Um reinício do contêiner depois das 06:00 deixa a Régua e a Agenda pedindo nova fotografia.
   - Se isso acontecer entre 06:00 e 07:00 de uma segunda, o relatório sai sem a previsão e sem as promessas quebradas, e diz isso.
4. **Caixas novas.** `FIN_COBRANCA_REGISTRAR` e `FIN_RELATORIO_GERAR` aparecem em Administração > Acessos (lote 3, Financeiro), com o padrão ADMIN, DIRETORIA e FINANCEIRO dentro da lista de sigilo.
5. **Pasta do Drive.** É criada na primeira geração (`FIN_PASTA_RELATORIOS_ID`), não compartilhada. Conferir no servidor que o compat do Drive grava na pasta do sistema.
6. **I16 e G2 na aba Indicadores.** Passam a ser calculados a partir da primeira fotografia depois da publicação. A fotografia anterior continua com "não calculado" no I16.
7. **Promessa e feriados.** Feriados estaduais ou municipais precisam estar cadastrados no expediente (Atividades da equipe > Avisos e horários); senão contam como dia útil na tolerância da promessa.

## 7. Suíte completa

O resultado está em `suite.txt`:

| | Arquivos | Passam | Falham | Saída diferente de zero |
|---|---|---|---|---|
| Esta rodada | 264 | 2517 | 0 | 0 |
| Referência | — | 2502 | 0 | — |

A diferença são os 15 testes dos dois arquivos novos (7 + 8).

O teste ajustado de propósito (`financeiro-omie-20261114`, 21 abas) passa com 25 de 25.

A regressão de `assistente-ia-eficaz-20261117` passa com 12 de 12.
