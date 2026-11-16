# Especificação do Financeiro no SGO+ — auditoria, cadastros no Omie e lançamento de notas recebidas

Data: 16/11/2026. Autor: especialista de Finanças e API Omie (rodada de auditoria e especificação; nenhum código foi alterado).
Base auditada: `output/financeiro-20261116/cand4` (cópia igual à produção). Linhas citadas são do arquivo indicado.
Documentação Omie consultada: páginas públicas `app.omie.com.br/api/v1/...` (clientes, contapagar, contareceber, categorias,
nfe, recebimentonfe, contacorrentelancamentos, anexo) e a central de ajuda do Omie. O que a documentação não diz está marcado
**a confirmar** e deve ser verificado na primeira operação acompanhada, nunca presumido.

Convenções: **[BLOQUEIA]** = deve ser resolvido antes de a Wanessa operar sozinha pelo SGO+; **[MELHORIA]** = pode vir depois.
**[DONO DECIDE]** = escolha de negócio que o código não pode fazer sozinho.

---

## 1. Auditoria de domínio do que existe

### 1.1 Achados que bloqueiam uso real

**B1. Significado do "valor" na baixa (juros, multa, desconto) não confirmado e a dica da tela pode levar a lançar em dobro.**
- Onde: `SGO_Omie_Operacoes.js:95-98` (monta `LancarPagamento`/`LancarRecebimento` com `valor`, `desconto`, `juros`, `multa`);
  `JS_Omie_Ajuda.html:53` (dica: "Valor da baixa: o valor que de fato entrou ou saiu, como está no extrato") e
  `JS_Omie_Ajuda.html:46` (dica do valor do documento: "sem desconto, juros ou multa (esses entram na baixa)").
- Problema: a documentação do Omie descreve `valor` só como "Valor a ser baixado" e `juros`/`multa`/`desconto` como valores à
  parte; não diz se o movimento na conta corrente é `valor` ou `valor + juros + multa − desconto`. Se o Omie somar os juros ao
  `valor` (comportamento da tela do Omie, em que o "valor líquido" é calculado), a orientação atual ("valor = o do extrato") faz
  o banco no Omie receber os juros duas vezes e o título ficar com saldo negativo ou baixado a maior.
- Risco concreto: saldo da conta corrente no Omie diferente do extrato; conciliação bancária quebrada; DRE com receita
  financeira (juros) dobrada.
- Correção: (1) enquanto não confirmado, a tela só aceita juros, multa e desconto iguais a 0 e mostra "baixa com acréscimo ou
  desconto: confirmar no primeiro uso acompanhado"; (2) na primeira baixa acompanhada com juros, conferir em `ConsultarContaReceber`
  e no extrato do Omie (`ListarExtrato`) qual valor entrou na conta; (3) fixar a regra no código e na prévia, com a linha
  "Efeito na conta corrente: R$ X" calculada; (4) corrigir as duas dicas para a regra confirmada.

**B2. A baixa não confere o saldo em aberto nem a situação do título.**
- Onde: `SGO_Omie_Operacoes.js:77-107` (`OmieOps_preparar_`, ação `baixar`); `JS_Omie_Operacoes.html:34` (botões "Editar" e
  "Registrar baixa" para qualquer situação).
- Problema: aceita baixa de título já PAGO/RECEBIDO/LIQUIDADO/CANCELADO e valor maior que o saldo. A tela não mostra o saldo em
  aberto (só o valor original), então a baixa parcial é feita às cegas: na segunda parcela de um pagamento parcial a pessoa
  digita o valor sem saber quanto falta.
- Risco: baixa em duplicidade, título com pagamento a maior, saldo bancário inflado no Omie.
- Correção: na prévia, ler o saldo em aberto (o mesmo dado `resumo.nValAberto` de `ListarMovimentos` já usado com sucesso em
  `SGO_Omie_Cliente.js:357`) e recusar quando `valor + desconto > saldo + 0,01` ou quando `status_titulo` estiver em
  PAGO, RECEBIDO, LIQUIDADO ou CANCELADO. A prévia mostra "Saldo antes: R$ A · Esta baixa: R$ B · Saldo depois: R$ C (parcial)".
  Na lista, esconder "Registrar baixa" e "Editar" para essas situações.

**B3. "Editar" reescreve o título sem trava de situação e pode desfazer rateio de categorias e departamentos.**
- Onde: `SGO_Omie_Operacoes.js:88-94` (`AlterarContaPagar/Receber` com `codigo_categoria` único).
- Problema: a documentação do `conta_pagar_cadastro` tem `categorias` (rateio) e `distribuicao` (departamentos). Um título
  lançado no Omie com rateio, alterado pelo SGO+ com uma categoria só, pode perder o rateio (**a confirmar** se o Omie substitui
  ou mantém). Também permite alterar título já pago.
- Risco: DRE e orçamento por categoria errados sem que ninguém perceba.
- Correção: bloquear "Editar" quando o título consultado tiver `categorias` com mais de um item ou `distribuicao` preenchida
  ("Este título tem rateio; altere no Omie") e quando estiver pago/cancelado. Enviar no `AlterarConta*` só os campos que a
  pessoa mudou (comparar com o consultado), nunca o formulário inteiro (regra do projeto: nunca sobrescrever sem juntar).

**B4. Lista de categorias não separa despesa de receita e mostra categorias inativas.**
- Onde: `SGO_Omie_Operacoes.js:65` (`i.inativo !== 'S' && ... i.totalizadora !== 'S'`).
- Problema: no Omie o campo de categoria inativa é `conta_inativa` (não `inativo`), então categorias inativas aparecem. E a lista
  é a mesma para a pagar e a receber: nada impede lançar conta a pagar em categoria de receita.
- Risco: despesa classificada como receita (resultado do mês invertido), lançamento em categoria desativada pela contabilidade.
- Correção: filtrar `conta_inativa !== 'S'`, `totalizadora !== 'S'`, `transferencia !== 'S'`, `nao_exibir !== 'S'` e, pelo tipo:
  a pagar só `conta_despesa === 'S'`; a receber só `conta_receita === 'S'`. Repetir a checagem no servidor na prévia
  (`ConsultarCategoria`, já chamado em `OmieOps_rotulos_`, linha 108) para não confiar só na lista.

**B5. Recusa clara do Omie é tratada como "envio incerto" e o faturamento fica travado para sempre.**
- Onde: `SGO_Omie_Operacoes.js:184-193` (qualquer erro que não seja "não executado" vira `incerta`, e a mesma operação fica
  bloqueada 24 h); `SGO_Omie_Faturamento.js:577-591` (o marcador `OMIEFAT_OP_...` com estado `enviado` nunca é apagado quando o
  Omie recusa com motivo; não há tela para liberar).
- Problema: quando o Omie responde com `faultstring` de validação (ex.: "Categoria não cadastrada", "Cliente não encontrado"),
  a operação não foi executada. Hoje a mensagem diz "pode ter sido processada", e no faturamento o pedido/O.S. ou a chave da
  NF-e nunca mais pode ser enviado pelo SGO+ (só apagando a propriedade no servidor).
- Risco: operadora no limbo (contra a regra do projeto), reenvio fora do sistema, ou desistência do SGO+.
- Correção: separar três desfechos em `Omie_requisitar_` (`SGO_Omie.js:144-147`): (a) resposta HTTP com `faultstring` e
  `faultcode` de cliente = **recusado, nada feito** (volta a `pendente`, mostra o motivo, libera corrigir e enviar);
  (b) sem resposta, resposta ilegível ou erro de servidor = **incerto** (fica como hoje); (c) sucesso. No faturamento, apagar o
  marcador no caso (a). Para os incertos antigos, uma ação "Conferi no Omie: não foi feito / foi feito" (caixa FIN_OMIE_LANCAR,
  com motivo, no registro) que libera ou conclui o marcador.

**B6. CNPJ da empresa (OMIE_EMPRESA_CNPJ) não tem campo em Chaves e senhas.**
- Onde: lido em `SGO_Omie_Faturamento.js:207-219` e `:293-297`; não aparece em `SGO_Chaves.js` (só `OMIE_APP_KEY`,
  `OMIE_APP_SECRET`, `OMIE_GRAVACAO_LIGADA`).
- Problema: sem essa propriedade, a importação de NF-e de saída e a recepção de NF-e de compra sempre recusam. É também a base
  para (b) (conferir que a nota recebida é da Metrolabs).
- Correção: incluir `OMIE_EMPRESA_CNPJ` no grupo Omie de `SGO_Chaves.js` (validação de 14 dígitos com dígito verificador), com
  o teste "conferir com o CNPJ da empresa no Omie" (**a confirmar** qual chamada devolve o CNPJ da empresa da chave; se não
  houver, só validar o formato).

**B7. Limite de tamanho do XML recebido impede notas reais.**
- Onde: `SGO_Omie_Faturamento.js:265` (30.000 caracteres para compra e NFS-e; a mensagem e a tela dizem 40 KB:
  linha 268 e `JS_Omie_Faturamento.html:67`) e `:433` (o JSON gravado na célula precisa caber em 49.000 caracteres).
- Problema: NF-e de compra com 15 a 30 itens passa facilmente de 30 KB. O limite vem do tamanho de célula da planilha.
- Correção: aceitar até 1 MB; guardar o XML original em arquivo (Drive, pasta do Financeiro, mesmo padrão de
  `Cmp_salvarArquivo_`) e gravar na tabela só o ID do arquivo, o SHA-256 e os campos lidos. O token da prévia guarda os campos
  lidos e o hash, não o XML inteiro (o cache tem limite de ~100 KB, `OmieFat_token_`, linha 128).

**B8. Recepção de NFS-e não confere o tomador e usa o valor bruto quando falta o líquido.**
- Onde: `SGO_Omie_Faturamento.js:316-329`.
- Problema: (1) não confere se o tomador é a Metrolabs (qualquer NFS-e de qualquer empresa é aceita); (2) se o XML não tiver
  `ValorLiquidoNfse`, usa `ValorServicos` (bruto), que é maior que o devido quando há retenção; (3) arquivo de consulta da
  prefeitura com várias notas (`ListaNfse` com vários `CompNfse`) é lido como se fosse uma só; (4) a chave de idempotência é o
  hash do XML inteiro (`:413`), então o mesmo documento baixado duas vezes (espaços, assinatura) entra duas vezes.
- Correção: está especificada na seção 3.2 (tomador obrigatório, líquido calculado e conferido, uma nota por arquivo, chave
  = CNPJ do prestador + município + número).

**B9. Escolha de cliente/fornecedor por páginas de 100, sem busca.**
- Onde: `SGO_Omie_Operacoes.js:58-69` (`OmieOps_apiApoios`, tipo `pessoas`) e `JS_Omie_Operacoes.html:44-75`.
- Problema: a Wanessa precisa achar o fornecedor rolando listas de 100 nomes, "Carregar mais" a cada página. Com centenas de
  cadastros, a chance de escolher um homônimo ou o cadastro inativo errado é alta, e é o campo mais crítico do título.
- Correção: busca por CNPJ/CPF (filtro `clientesFiltro.cnpj_cpf`, já usado e conferido no Omie real em
  `SGO_Omie_Pedidos.js:259`) e por nome (`clientesFiltro.razao_social`, **a confirmar** se é busca parcial). O resultado mostra
  razão social, CNPJ formatado, cidade/UF e se é inativo. Quando não acha, o botão "Cadastrar no Omie" abre o fluxo (a).

### 1.2 Achados de risco médio (fazer logo depois)

**M1. Idempotência da baixa depende de uma janela de 24 h.** `SGO_Omie_Operacoes.js:174` gera `codigo_baixa_integracao` a partir
do token da prévia: uma nova prévia gera outro código, então o Omie não tem como recusar a repetição. O bloqueio é só o índice
local de 24 h (`:132-137`). Correção: código determinístico `B` + 19 primeiros caracteres do SHA-256 de
`empresa|título|data|valor|conta|sequência` (string20, conforme documentação). Duas baixas iguais legítimas no mesmo dia exigem
a pessoa marcar "é outra baixa" (sequência 2). O mesmo raciocínio vale para títulos novos: a "Referência única" livre
(`:90`) funciona, mas quando o título nasce de documento (proposta, NF-e, NFS-e) a referência deve ser gerada pelo sistema.

**M2. Código da baixa não é guardado.** A resposta de `LancarPagamento/LancarRecebimento` traz `codigo_baixa`, que é o que
`CancelarPagamento`/`CancelarRecebimento` exigem para estornar. Hoje só fica um `SGO_DATA.log` sem valor (`:180`). Correção:
tabela `FIN_OMIE_OPERACOES` (ID, EM, USUARIO, ACAO, TIPO, TITULO_OMIE, CODIGO_BAIXA, CODIGO_INTEGRACAO, VALOR, DATA, CONTA,
RESULTADO, MOTIVO_OMIE). Serve de trilha de auditoria (quem lançou/baixou o quê e quanto) e de base para o estorno (seção 6).

**M3. Vencimento retroativo.** A documentação de `IncluirContaPagar` diz que `data_vencimento` e `data_previsao` "devem ser
informadas com uma data igual ou superior à data corrente". Notas de compra chegam vencidas e contas já pagas precisam ser
lançadas com a data real. **A confirmar** na primeira operação se o Omie recusa data passada pela API. Se recusar: lançar com
`data_vencimento` real em `observacao` e previsão hoje, ou incluir e baixar na sequência (decisão do dono com o contador).

**M4. Observação com quebra de linha.** O Omie usa `|` como separador de linhas em `observacao`. O SGO+ envia `\n`
(`OmieOps_texto_`, linha 8). Correção: trocar quebras por ` | ` antes de enviar e tirar `|` digitado pela pessoa.

**M5. Razão social acima de 60 caracteres.** `razao_social` é string60 no Omie. Vale para (a). Cortar com aviso na prévia.

**M6. Conferência de extrato só casa data e valor exatos.** `SGO_Omie_Conciliacao.js:106`: a data do extrato do banco e a data do
lançamento no Omie costumam diferir em 1 dia útil (compensação). Hoje vira "Sem correspondência". Correção: tolerância de até
2 dias úteis, desempate pela menor diferença e pelo nome; manter "Ambíguo" quando houver mais de um.

**M7. Importação de NF-e de saída sem título.** `SGO_Omie_Faturamento.js:572` força `lNaoGerarTitulo: true`. Correto se a conta a
receber nasce do pedido aprovado (aba Pedidos aprovados); errado se a nota foi emitida fora do Omie e ninguém lança o
recebível. **[DONO DECIDE]**: manter sem título (e a tela avisar "lance a conta a receber em Pedidos aprovados") ou gerar o
título na importação (com `nCliente`, `cCategoria`, `nContaCorrente`).

**M8. Fatura de cartão ignora estornos.** `SGO_Compras_Faturas.js:308`: crédito/estorno na fatura é descartado, então a soma
conciliada não fecha com o total da fatura quando há estorno, e a compra estornada continua como despesa. Correção: importar
estorno como linha própria, casar com a parcela de origem (mesmo valor, mesma descrição) e marcar a compra como estornada.

**M9. "Marcar como pago" no A pagar não registra valor pago.** `SGO_Compras_Faturas.js:621-640`: só data e comprovante; boleto
pago com juros ou desconto fica com o valor original. Correção: campo "Valor pago" (pré-preenchido com o valor da parcela) e
diferença explicada (juros, multa, desconto) quando diferente.

**M10. Propriedades do script como fila de operações.** `SGO_Omie_Operacoes.js:131-142` grava cada prévia inteira em
ScriptProperties e só limpa ao abrir outra prévia. Com a Wanessa fazendo tudo pelo SGO+, o volume cresce. **A confirmar** o
limite no servidor Node (o Apps Script original tem ~500 KB no total). Correção: mover para tabela própria ou limpar por rotina.

### 1.3 Melhorias

- **Valores grandes:** pedir segunda confirmação (digitar o valor de novo) acima de um limite. **[DONO DECIDE]** o limite.
- **Segregação de funções:** hoje a mesma pessoa cadastra o fornecedor, lança o título e baixa. Em Compras já existe a regra
  "quem registra não confere a própria" (`SGO_Compras_Financeiro.js:77`). **[DONO DECIDE]**: acima de um valor, baixa de conta a
  pagar exige aprovação de outra pessoa da lista de sigilo (Diretoria).
- **Parcelamento no novo lançamento:** hoje é um título por vez; propor "Parcelas: N, primeiro vencimento, intervalo" gerando N
  títulos com referência `REF-1..N` e `numero_parcela` `001/00N`.
- **Código de barras do boleto a pagar** (`codigo_barras_ficha_compensacao`) no lançamento da conta a pagar.
- **Compras e Omie em mundos separados:** compra conferida e "A pagar" marcado como pago em Compras não chegam ao Omie. Ver item
  6.1.

---

## 2. Especificação (a): cadastrar cliente e fornecedor no Omie pelo SGO+

### 2.1 Endpoints e decisão de método

- Serviço: `geral/clientes/` (no Omie, cliente e fornecedor são o mesmo cadastro; a ajuda oficial diz que a diferença é feita
  por **tags**, e que a tag precisa existir na conta: "Cliente", "Fornecedor" etc.).
- Consultar antes: `ListarClientes` com `clientesFiltro: { cnpj_cpf: "<formatado>" }` (já conferido no Omie real em
  `SGO_Omie_Pedidos.js:259`; o filtro não é exato, por isso comparar só os dígitos, como em `:260`).
- Incluir: `IncluirCliente` ("Inclui um novo cliente ou fornecedor"). Resposta: `codigo_cliente_omie`,
  `codigo_cliente_integracao`, `codigo_status`, `descricao_status`.
- Acrescentar a tag "Fornecedor" (ou "Cliente") num cadastro que já existe: `AlterarCliente` com o `codigo_cliente_omie` e a lista
  de tags **somada** à atual (ler antes com `ConsultarCliente`). **A confirmar** se `AlterarCliente` substitui a lista de tags
  inteira (por isso mandar a lista completa).
- **Não usar** `UpsertCliente` nem `UpsertClienteCpfCnpj`: atualizam por cima o cadastro feito à mão no Omie (endereço, e-mail de
  cobrança) com o dado do SGO+, sem juntar. Contra a regra do projeto.
- O caminho `geral/clientes/` já passa na validação de `Omie_requisitar_` (`SGO_Omie.js:109`). Incluir `IncluirCliente` e
  `AlterarCliente` só como escrita (não entram no cache de leitura, que só cobre Listar/Consultar/Obter/Pesquisar).

### 2.2 Campos

Mínimo enviado (tipos da documentação):

| Campo Omie | Tipo | Origem | Observação |
|---|---|---|---|
| `codigo_cliente_integracao` | string60 | gerado: `SGO-` + dígitos do CNPJ/CPF | Determinístico: o mesmo documento gera o mesmo código e o Omie recusa a segunda inclusão (**a confirmar** que o Omie recusa código de integração repetido). |
| `razao_social` | string60 | cadastro | Obrigatório na prática. Cortar em 60 com aviso. |
| `nome_fantasia` | string100 | cadastro | Se vazio, repetir a razão social. |
| `cnpj_cpf` | string20 | cadastro | Enviar formatado (`00.000.000/0000-00` ou `000.000.000-00`), como no exemplo oficial. |
| `tags` | tagsArray | escolha da tela | `[{ "tag": "Fornecedor" }]` ou `[{ "tag": "Cliente" }]` (ou as duas). O exemplo da ajuda mostra objeto; a referência diz array: **a confirmar** o formato aceito na primeira inclusão. |
| `endereco`, `endereco_numero`, `complemento`, `bairro` | string60 cada | cadastro | |
| `cidade` | string40 | cadastro | Aceita nome ou código IBGE. Preferir código IBGE quando vier da NF-e (`cMun`). |
| `estado` | string2 | cadastro | |
| `cep` | string10 | cadastro | Só dígitos ou `00000-000`. |
| `email` | string500 | cadastro | Cliente: e-mail de cobrança; fornecedor: e-mail de pedidos. |
| `telefone1_ddd`, `telefone1_numero` | string5 / string15 | cadastro | |
| `inscricao_estadual`, `inscricao_municipal` | string20 | XML da nota ou cadastro | Opcional. |
| `optante_simples_nacional` | S/N | XML (`CRT` 1 ou 4 = S) | Opcional; ajuda a contabilidade nas retenções. |
| `contribuinte` | S/N | XML (`indIEDest`/IE presente) | Opcional; **a confirmar** uso. |

Campos "característica" obrigatórios da conta: a ajuda do Omie avisa que, se a conta tiver características obrigatórias, a
inclusão é recusada com erro. O SGO+ mostra o motivo devolvido (com o B5 resolvido, como "recusado, nada feito").

### 2.3 De onde vêm os dados

- **Cliente**: aba `CAD_CLIENTES` (`SGO_CFG.SHEETS.CAD_CLIENTES`). Colunas usadas no código: `ID`, `CNPJ`, `CPF`, `RAZAO_SOCIAL`,
  `NOME_FANTASIA`, `CEP`, `LOGRADOURO`, `NUMERO`, `COMPLEMENTO`, `BAIRRO`, `CIDADE`, `UF`, `ENDERECO` (antigo, campo único),
  `EMAIL`, `TELEFONE`, `STATUS`. Antes de enviar, rodar `CadQ_problemasCliente_` (`SGO_CadastroQualidade.js:111`): se houver
  `CNPJ_INVALIDO`, `RAZAO_FALTA` ou `ENDERECO_INCOMPLETO`, a prévia lista o que falta e oferece "Corrigir em Cadastros".
- **Fornecedor**: aba `CMP_FORNECEDORES` (`SGO_Compras_Config.js:54`): `ID`, `CODIGO`, `TIPO_PESSOA`, `DOCUMENTO`, `RAZAO_SOCIAL`,
  `NOME_FANTASIA`, `ENDERECO` (campo único), `CIDADE`, `UF`, `CONTATO`, `TELEFONE`, `WHATSAPP`, `EMAIL_PEDIDOS`, `ATIVO`.
  O endereço é um campo só: completar pela consulta pública de CNPJ já existente no servidor (`SGO_CNPJ_consultarDados_`, usada em
  `SGO_Assistencia_App.js:419-434`), mostrando na prévia a origem de cada campo ("cadastro de Compras" ou "consulta do CNPJ").
- **Fornecedor vindo de nota (fluxo b)**: emitente da NF-e (`emit`: `CNPJ`/`CPF`, `xNome`, `xFant`, `IE`, `CRT`,
  `enderEmit/xLgr, nro, xCpl, xBairro, cMun, xMun, UF, CEP, fone`) ou prestador da NFS-e. É o dado mais confiável (assinado).
  Se o fornecedor não existir em `CMP_FORNECEDORES`, oferecer também gravá-lo lá (com `ORIGEM = 'NOTA'`), para Compras usar.
- Guardar o vínculo: nova coluna `OMIE_CODIGO` em `CAD_CLIENTES` e em `CMP_FORNECEDORES` (gravar com `SGO_DATA.update` só nessa
  coluna). Nas próximas vezes, o SGO+ já sabe o código do Omie (e ainda confere por CNPJ antes de lançar, porque alguém pode
  ter inativado ou unificado o cadastro no Omie).

### 2.4 Validação

- CNPJ: `CadQ_cnpjOk_` / `SGO_UTILS.isCnpj` (dígitos verificadores). CPF: `CadQ_cpfOk_` / `SGO_UTILS.isCpf`. Recusar documento
  zerado ou repetido (`00000000000000`, `11111111111111`).
- Fornecedor estrangeiro (sem CNPJ): fora do escopo; a tela orienta cadastrar no Omie (`exterior`, `codigo_pais`).
- Recusar cadastrar o próprio CNPJ da empresa (`OMIE_EMPRESA_CNPJ`) como fornecedor ou cliente.

### 2.5 Fluxo (prévia + confirmação, igual às operações existentes)

1. Pontos de entrada: (i) botão "Cadastrar no Omie" na busca de cliente/fornecedor do formulário de lançamento (B9);
   (ii) na Ficha do cliente e em Pedidos aprovados, quando a mensagem atual diz "não tem cadastro ativo no Omie"
   (`SGO_Omie_Pedidos.js:261`); (iii) no lançamento de nota recebida (seção 3), quando o emitente não existe no Omie.
2. Prévia (`OmieCad_apiPrevia`, caixa `FIN_OMIE_LANCAR`, mesma estrutura de `OmieOps_apiPrevia`: token de uso único, vínculo à
   sessão, hash da empresa, expira em 10 min). No servidor:
   - consulta `ListarClientes` por CNPJ **sem cache** (`Omie_semCache_`);
   - **achou ativo com a tag certa** → não cadastra; devolve o código e "já cadastrado no Omie como …";
   - **achou ativo sem a tag** → a prévia vira "Acrescentar a tag Fornecedor ao cadastro existente" (AlterarCliente);
   - **achou só inativo** → não cadastra; orienta reativar no Omie (`AlterarSituacaoCliente` existe, mas reativar é decisão do
     Financeiro; fica para depois);
   - **achou mais de um ativo** → recusa, como já faz `SGO_Omie_Pedidos.js:262`;
   - **não achou** → monta o `IncluirCliente` e mostra campo a campo o que será enviado, com a origem.
3. Confirmação (`OmieCad_apiConfirmar`): exige `Omie_exigirGravacao_()`, relê por CNPJ sem cache (respeitando o minuto do Omie
   com `Omie_faltaReconsulta_`), envia, grava `OMIE_CODIGO` no SGO+ e registra em `FIN_OMIE_OPERACOES` (M2) e no registro de
   acessos. Recusa clara do Omie = nada feito, mostra o motivo (B5).
4. Volta para o formulário de origem com o cadastro já selecionado.

Quem pode: caixa `FIN_OMIE_LANCAR` e lista de sigilo (como o lançamento). Opção **[DONO DECIDE]**: caixa própria
`FIN_OMIE_CADASTRAR`, se quiser que alguém do Comercial cadastre cliente sem poder lançar títulos (hoje o sigilo impede).

---

## 3. Especificação (b): lançar no Omie a NF-e de compra e a NFS-e recebidas

### 3.1 NF-e de compra (modelo 55)

**Caminhos possíveis no Omie (confirmados na documentação):**

| Caminho | Como | Prós | Contras |
|---|---|---|---|
| A. `produtos/nfe/ImportarNFe` com `cOperacao: "21"` (Compra de produtos), `lNaoGerarTitulo: false` | registra a nota no Omie e gera os títulos a pagar (`nCliente`, `cCategoria`, `nContaCorrente`, `parcelas` complementares) | a nota fica no Omie (fiscal + financeiro) | mexe em produtos e estoque (`lNaoMovEstoque`, `lNaoIncluirProduto`): comportamento com itens não cadastrados **a confirmar**; o Omie pode já ter a mesma nota pelo "Recebimento de NF-e" (captura automática da SEFAZ), gerando duplicidade; mais pontos de falha |
| B. `financas/contapagar/IncluirContaPagar`, um título por duplicata | conta a pagar com `chave_nfe`, `numero_documento_fiscal`, `data_emissao`, `numero_parcela` | só financeiro, previsível, reaproveita o fluxo já testado de lançamento | a nota não entra no módulo fiscal do Omie (a contabilidade normalmente recebe o XML por outro meio) |
| C. `produtos/recebimentonfe/` | a API só lista, consulta, altera e conclui recebimentos que já estão no Omie; **não há método de inclusão de XML** | aproveita a nota capturada pelo Omie | só funciona se a conta Omie captura notas da SEFAZ (certificado configurado) |

**Recomendação: caminho B como padrão, com a checagem do caminho C antes.** Para uma empresa de serviços, sem estoque de
revenda, o que o Financeiro precisa é a obrigação de pagar correta. **[DONO DECIDE]** com o contador se a nota também precisa
estar no módulo fiscal do Omie (caminho A); se sim, fazer A em etapa separada, depois de testar em uma nota acompanhada.

**Checagem anti-duplicidade antes de lançar (obrigatória):**
1. Local: tabela `FIN_OMIE_NOTAS` (já existe) pela chave de 44 dígitos; se já está "LANCADA", recusa e mostra os títulos.
2. Omie, recebimento: `recebimentonfe/ConsultarRecebimento` com `cChaveNfe`. Se existir e tiver `parcelas.parcelasLista[].nIdTitulo`
   preenchido, **não lança**: "Esta nota já está no Omie (Recebimento de NF-e) com títulos gerados". Se existir sem títulos,
   avisar: "A nota está no Omie aguardando conclusão do recebimento; se concluírem lá, os títulos serão gerados em dobro".
   **A confirmar** a resposta do Omie quando a chave não existe (erro ou lista vazia) e se a conta usa esse recurso.
3. Omie, contas a pagar: `ListarContasPagar` com `filtrar_por_cpf_cnpj` (fornecedor) e `filtrar_por_emissao_de/ate` (data da nota);
   se algum título tiver o mesmo `numero_documento_fiscal` ou `chave_nfe`, recusa.

**Dados lidos do XML** (`nfeProc/NFe/infNFe`, sem DTD/entidades, como hoje):

| Dado | Caminho no XML | Uso |
|---|---|---|
| Chave | atributo `infNFe/@Id` sem "NFe" (44 dígitos) e igual a `protNFe/infProt/chNFe` | `chave_nfe`, idempotência |
| Autorização | `protNFe/infProt/cStat = 100` | recusar sem protocolo |
| Modelo / finalidade | `ide/mod = 55`; `ide/finNFe` | só `finNFe = 1` (normal). 2 complementar, 3 ajuste, 4 devolução: recusar com orientação |
| Emitente | `emit/CNPJ` ou `emit/CPF`, `xNome`, endereço | fornecedor (busca/cadastro pela seção 2) |
| Destinatário | `dest/CNPJ` = `OMIE_EMPRESA_CNPJ` | recusar nota de outra empresa |
| Número e série | `ide/nNF`, `ide/serie` | `numero_documento_fiscal` = nNF; `numero_documento` = `NF nNF/série` (até 20) |
| Emissão | `ide/dhEmi` (data) | `data_emissao` |
| Total | `total/ICMSTot/vNF` | conferência |
| Fatura | `cobr/fat/nFat`, `vOrig`, `vDesc`, `vLiq` | conferência da soma das duplicatas |
| Duplicatas | `cobr/dup[]`: `nDup`, `dVenc`, `vDup` | um título por duplicata |
| Forma de pagamento | `pag/detPag[]`: `indPag`, `tPag`, `vPag` | nota sem duplicata; `tPag = 90` (sem pagamento) não gera título |
| Itens | `det[]` (só contagem e descrição na prévia) | ajudar a escolher a categoria |

**Regras de valor:**
- Com duplicatas: soma de `vDup` deve ser igual a `cobr/fat/vLiq` (ou a `vNF` se não houver `fat`), tolerância R$ 0,01. Diferente:
  a prévia mostra a diferença e exige motivo (ex.: desconto negociado), sem bloquear.
- Sem duplicatas: um título só, valor `vNF` (ou soma de `detPag/vPag` sem troco), vencimento escolhido na tela (sugestão:
  `dhEmi` se `indPag = 0` à vista; senão em branco obrigatório). Se `tPag = 90` ou `vNF = 0` (remessa, bonificação), não gera título
  e a nota fica "Registrada sem título".
- Nota já paga (cartão, PIX no ato): oferecer "lançar e registrar o pagamento" (inclui o título e, em seguida, a baixa com a
  data do pagamento, em duas operações com prévia própria). Se a compra existir em Compras, puxar o comprovante de lá.

**Campos da conta a pagar (por duplicata):**
`codigo_lancamento_integracao` = `NFE-` + chave (44) + `-` + `nDup` (até 60, cabe; string60 confirmada);
`codigo_cliente_fornecedor` = código do Omie do emitente; `codigo_categoria` e `id_conta_corrente` = escolhidos na tela
(a lista de categorias só de despesa, B4); `data_vencimento` = `dVenc`; `data_previsao` = `dVenc` ou a escolhida;
`valor_documento` = `vDup`; `numero_documento_fiscal` = `nNF`; `numero_documento` = `NF nNF`; `numero_parcela` = `i/n` com 3
dígitos (`001/003`, string7); `chave_nfe` = chave; `data_emissao` = data de `dhEmi`; `observacao` = `Fornecedor · NF nNF série S ·
parcela i/n · lançada pelo SGO+ (nome)`.

Categoria e conta na tela: sugerir a última categoria usada para o mesmo fornecedor (ler na `FIN_OMIE_NOTAS`) e, se a nota veio
de uma compra do SGO+, a categoria correspondente à categoria do fornecedor em Compras (`CMP_CATEGORIAS_FORNECEDOR`) por uma
tabela de-para mantida pelo Financeiro. **[DONO DECIDE]** com o contador o de-para inicial.

**Fluxo:** Recebidos (aba atual "Faturamento e notas") → enviar o XML → prévia com: fornecedor (achado no Omie / a cadastrar),
nota, duplicatas em tabela, alertas (nota já no Omie, soma diferente, vencida) → escolher categoria e conta → "Conferir prévia" →
"Confirmar no Omie". Os títulos são enviados um por vez, cada um com seu código de integração; se o 2º falhar, o 1º fica
registrado e a tela mostra "1 de 3 lançados; tente de novo os que faltam" (o código de integração impede duplicar o 1º).
Caixa: `FIN_OMIE_LANCAR` (lançamento financeiro), mantendo `FIN_OMIE_FATURAR` para a recepção documental.

Status em `FIN_OMIE_NOTAS`: `RECEBIDA` → `LANCADA` (com os `codigo_lancamento_omie`) ou `LANCADA_PARCIAL` ou `SEM_TITULO`
(com motivo) ou `DESCARTADA` (com motivo; nunca apagar). Colunas novas: `EMITENTE_CNPJ`, `EMITENTE_NOME`, `EMISSAO`,
`ARQUIVO_ID`, `XML_SHA256`, `TITULOS_JSON`, `LANCADA_POR`, `LANCADA_EM`.

Limite conhecido: a autenticidade e a situação atual da nota (cancelada depois de autorizada) não são verificadas na SEFAZ.
A prévia diz isso. Se a conta Omie usa o Recebimento de NF-e, `ConsultarRecebimento` cobre parte do risco.

### 3.2 NFS-e recebida

O Omie não captura NFS-e de prefeituras pela SEFAZ; o caminho é B (`IncluirContaPagar`).

**Leitura tolerante.** Ler por nome local do elemento (ignorando namespace), em uma nota por arquivo:

| Dado | ABRASF 1.0/2.x (`CompNfse/Nfse/InfNfse`) | Padrão Nacional (`NFSe/infNFSe`) |
|---|---|---|
| Identificação única | `Numero` + `CodigoVerificacao` + `OrgaoGerador/CodigoMunicipio` ou `PrestadorServico/Endereco/CodigoMunicipio` | atributo `infNFSe/@Id` ("NFS" + 50 dígitos) |
| Número | `InfNfse/Numero` (não o `IdentificacaoRps/Numero`) | `nNFSe` |
| Emissão / competência | `DataEmissao`; `Competencia` | `dhProc` ou `DPS/infDPS/dhEmi`; `dCompet` |
| Prestador (fornecedor) | `PrestadorServico/IdentificacaoPrestador/Cnpj` (1.0) ou `Prestador/CpfCnpj/Cnpj` (2.x); `RazaoSocial` | `emit/CNPJ`, `emit/xNome` |
| Tomador (Metrolabs) | `Tomador.../CpfCnpj/Cnpj` (ou `IdentificacaoTomador/CpfCnpj/Cnpj`) | `DPS/infDPS/toma/CNPJ` |
| Valor dos serviços | `ValorServicos` | `DPS/infDPS/valores/vServPrest/vServ` |
| Retenções federais | `ValorPis`, `ValorCofins`, `ValorInss`, `ValorIr`, `ValorCsll` | `.../trib/tribFed/vRetIRRF`, `vRetCSLL`, `vRetCP`, `piscofins/vPis`, `vCofins` (com `tpRetPisCofins`) |
| ISS retido | `IssRetido = 1` e `ValorIss`/`ValorIssRetido` | `.../tribMun/tpRetISSQN = 2` (retido pelo tomador) e `infNFSe/valores/vISSQN` |
| Valor líquido | `ValorLiquidoNfse` | `infNFSe/valores/vLiq` |

Os caminhos do padrão Nacional e as variações de prefeitura devem ser **conferidos com 3 a 5 XMLs reais** que a Wanessa já
recebeu (**a confirmar**; não presumir).

**Regras:**
1. Uma nota por arquivo: se houver mais de um `CompNfse`/`infNFSe`, recusar e pedir o XML da nota.
2. Tomador obrigatório e igual a `OMIE_EMPRESA_CNPJ`.
3. Líquido calculado = serviço − retenções federais − ISS retido − descontos incondicionados. Se o XML trouxer o líquido,
   comparar: diferença acima de R$ 0,01 vai para conferência manual. Nunca usar o bruto como valor a pagar quando houver retenção.
4. **Conferência manual do que não foi lido:** a prévia mostra cada campo com a marca "lido do XML" ou "não encontrado" e
   permite digitar o que faltou (número, prestador, valores), com o motivo. O que foi digitado fica marcado no registro
   (`CAMPOS_MANUAIS`). Sem número, prestador e valor, não lança. Layout não reconhecido: em vez de recusar (hoje,
   `SGO_Omie_Faturamento.js:318-321`), abrir o formulário manual com o PDF anexado.
5. Idempotência: `codigo_lancamento_integracao` = `NFSE-` + CNPJ do prestador (14) + `-` + código do município (7) + `-` + número
   (até 60). No Nacional, `NFSE-` + os 50 dígitos da chave. Tabela local pela mesma chave.

**Retenções no Omie [DONO DECIDE com o contador]:** a conta a pagar do Omie tem `retem_ir/valor_ir`, `retem_pis/valor_pis`,
`retem_cofins/valor_cofins`, `retem_csll/valor_csll`, `retem_iss/valor_iss`, `retem_inss/valor_inss` (aba "Impostos Retidos").
Duas opções: (i) `valor_documento` = valor bruto e as retenções nesses campos (o Omie calcula o líquido; **a confirmar** que a
baixa e o saldo ficam pelo líquido); (ii) `valor_documento` = líquido e as retenções só na observação, com os DARF/ISS
lançados à parte. A opção (i) é a contabilmente correta e a recomendada, desde que confirmada na primeira operação. Em ambas,
os impostos retidos viram obrigação da Metrolabs a recolher; propor (etapa seguinte) gerar as contas a pagar das guias no mês
seguinte.

Vencimento: NFS-e não traz duplicata; usar o vencimento da fatura/boleto do prestador (campo obrigatório na tela; sugestão:
condição de pagamento do fornecedor em `CMP_FORNECEDORES.CONDICAO_PAGAMENTO` ou `PRAZO_MEDIO_DIAS`).

---

## 4. Textos de explicação por campo

Estilo igual ao de `OMIE_DICAS`: começa pelo nome do campo, diz o que preencher e para que serve, frases curtas, sem jargão.
Onde o mesmo `id` serve a ações diferentes, a chave leva o contexto (como `ops-baixar:valor`).

### 4.1 Compras — Conferência do Financeiro (`JS_Compras.html`, `Compras_renderFinanceiro_`, linha 789)

Em Compras o componente `Cp_campo_(rotulo, html, ajuda)` (linha 110) já aceita o texto de ajuda como terceiro parâmetro; para
`Cp_pedirTexto_` (linha 149), acrescentar um parâmetro de ajuda em vez de reaproveitar o texto fixo de mínimo de letras.

| Campo (id) | Texto |
|---|---|
| `fnMes` | Mês: o mês das compras a conferir, pela data do pagamento (ou da emissão do pedido, se ainda não foi pago). |
| `fnCartao` | Final do cartão: os 4 últimos números de um cartão da empresa. Use para conferir as compras de uma fatura. Em branco, mostra todas as formas de pagamento. |
| `fnSit` | Situação: "Aguardando conferência" é o que falta você conferir; "Divergentes" voltaram ao comprador para corrigir; "Sem pagamento registrado" são pedidos ainda não pagos. |
| `fnPlanilha` (botão) | Baixar a planilha: gera um arquivo com a lista filtrada, para uso interno do Financeiro. O download fica registrado com seu nome. |
| `cpTxtPedido` em "Conferida" | Observação (opcional): algo que vale registrar na conferência (ex.: nota fiscal chegou depois, conferida pelo e-mail do fornecedor). Fica no histórico da compra. |
| `cpTxtPedido` em "Divergente" | O que não bate: escreva o que está errado e o que o comprador deve fazer (ex.: valor pago R$ 50 maior que o pedido; anexar a nota). O comprador recebe este texto. Mínimo de 10 letras. |
| `cpTxtPedido` em "Ciente" | Observação (opcional): o que a gestão combinou com quem comprou fora do sistema. A compra sai da Caixa de decisões. |

Registro do pagamento pelo comprador (o Financeiro confere estes dados):

| Campo (id) | Texto |
|---|---|
| `pgValor` | Valor pago: o valor exatamente como está no comprovante, com frete e descontos. Se for diferente do pedido, o Financeiro vê a diferença. |
| `pgData` | Data do pagamento: o dia em que o dinheiro saiu (data do comprovante), não o dia de hoje. Boleto a vencer: registre só quando pagar. |
| `pgForma` | Forma de pagamento: como foi pago. Cartão de crédito gera as parcelas que serão conferidas na fatura; boleto e faturado entram no "A pagar"; reembolso vai para quem pagou do próprio bolso. |
| `pgFinal` | 4 últimos números do cartão: só os 4 finais, nunca o número inteiro. É por eles que a compra é encontrada na fatura. |
| `pgParc` | Parcelas: em quantas vezes a compra foi feita no cartão (1 para à vista). Cada parcela aparece numa fatura. |
| `pgVenc` | Vencimento do boleto: a data impressa no boleto. Entra no "A pagar" do Financeiro nesta data. |
| `pgCond` | Condição do faturamento: o prazo combinado com o fornecedor (ex.: 28 dias da nota fiscal). O Financeiro usa para saber quando pagar. |
| `pgReemb` | Quem pagou: a pessoa que pagou do próprio bolso e vai receber o reembolso. Ela não pode marcar o próprio reembolso como pago. |
| `pgArq` | Comprovante: recibo, cupom, extrato ou boleto pago, em PDF ou foto legível. É por ele que o Financeiro confere. |
| `pgCorr` | O que foi corrigido: responda ao que o Financeiro apontou (ex.: anexei a nota; valor corrigido para R$ 320,00). Mínimo de 10 letras. |

### 4.2 Compras — Cartões da empresa (`Cp_formCartao_`, linha 1204)

| Campo (id) | Texto |
|---|---|
| `ckFinal` | 4 últimos números: os 4 finais do cartão impresso. Nunca o número inteiro. Não pode repetir o final de outro cartão ativo. |
| `ckApelido` | Apelido: um nome fácil de reconhecer (ex.: Cartão da Logística). Aparece nas listas e nos relatórios. |
| `ckTipo` | Tipo: crédito (gera fatura mensal e parcelas) ou débito (sai da conta na hora, sem fatura). |
| `ckResp` | Responsável: quem guarda e usa o cartão. Recebe a cobrança quando há lançamento na fatura sem compra informada. |
| `ckFech` | Dia do fechamento: o dia do mês em que a fatura fecha. Compras depois desse dia vão para a fatura seguinte. |
| `ckVenc` | Dia do vencimento: o dia do mês em que a fatura vence. Define o "mês da fatura". |
| `ckLim` | Limite (opcional): o limite de crédito do cartão, em reais. Só informativo. |
| `ckObs` | Observações: o que ajuda a identificar ou usar o cartão (ex.: só para combustível). |
| `ckAtivo` | Cartão ativo: desmarque quando o cartão for cancelado ou substituído. O histórico continua guardado. |
| `ckMotivo` | O que mudou e por quê: obrigatório ao editar (ex.: troca de responsável, cartão novo com outro final). Fica no histórico do cartão. |

### 4.3 Compras — Conciliação das faturas (`Compras_renderConciliacao_`, linha 1221)

| Campo (id) | Texto |
|---|---|
| `cfFinal` | Cartão: o cartão da fatura que você vai conferir. |
| `cfMes` | Mês da fatura (vencimento): o mês em que a fatura vence, não o mês das compras. |
| `cfArq` | Arquivo: o extrato da fatura exportado pelo banco (OFX, CSV ou Excel .xlsx), deste cartão e deste mês. Não altere as colunas. Primeiro aparece a prévia; nada é gravado antes de "Importar e conciliar". |
| `cfParc` (Casar) | Parcela: a compra informada que corresponde a este lançamento da fatura. Confira valor, data e quem comprou. |
| `cfMot` em Casar | Motivo: por que este lançamento e esta compra são a mesma coisa (ex.: valor com frete; data do lançamento diferente da compra). Mínimo de 15 letras. |
| `cfMot` em Justificar | Motivo: o que é este lançamento, já que não é uma compra a informar (ex.: anuidade do cartão; tarifa; assinatura do software X). A cobrança ao responsável é encerrada. |
| `cfMot` em Desfazer | Motivo: por que a ligação estava errada. O lançamento volta a "Não informada" e a compra a "A conciliar". |
| `cfMot` em Reabrir | Motivo: por que a justificativa não vale mais. O responsável do cartão volta a ser cobrado. |
| `cfMot` em Próxima fatura | Motivo: por que a compra vai aparecer na fatura seguinte (ex.: compra feita depois do fechamento). |
| `cfMot` em Divergente | Motivo: o que está errado com esta compra informada (ex.: não aparece em nenhuma fatura; valor diferente do cobrado). |
| `cfMot` em Voltar a conciliar | Motivo: o que foi resolvido e por que a compra volta a ser conferida. |
| `cpTxtPedido` em Fechar com ressalva | Motivo: o que ficou aberto e por quê (ex.: 2 lançamentos aguardando comprovante do responsável). O que ficou aberto continua na lista. Mínimo de 20 letras. |
| `cpTxtPedido` em Reabrir a fatura | Motivo: por que a fatura fechada precisa ser reaberta. Só a Diretoria reabre. Mínimo de 15 letras. |

### 4.4 Compras — A pagar (`Compras_renderAPagar_`, linha 1313)

| Campo (id) | Texto |
|---|---|
| `apSit` | Mostrar: "A pagar" são os vencimentos de boleto, faturado e reembolso ainda não pagos; "Pagos" mostra os dos últimos 60 dias. |
| `apData` | Data do pagamento: o dia em que o dinheiro saiu da conta (data do comprovante), hoje ou antes. |
| `apArq` | Comprovante: o comprovante da transferência, do PIX ou do boleto pago. Fica junto da compra. Quem recebe o reembolso é avisado. |
| `apValor` (novo, M9) | Valor pago: o valor que saiu da conta. Se for diferente do vencimento (juros, multa ou desconto), explique abaixo. |

### 4.5 Conciliação Caju (`JS_ConciliacaoCaju.html`)

Os campos usam `<label class="vg-campo">` com `<span class="vg-dica">`; acrescentar a dica no mesmo padrão onde falta.

| Campo (id) | Texto |
|---|---|
| `cjArq` | Extrato do Caju (CSV): o arquivo de transações exportado no portal do Caju, do período que você quer conferir. Linhas já importadas são puladas. |
| `cjMap_data` | Data da transação: a coluna com o dia da compra ou da carga. Obrigatória. |
| `cjMap_hora` | Hora: a coluna com o horário, se o arquivo tiver. Ajuda a separar duas compras iguais no mesmo dia. |
| `cjMap_valor` | Valor: a coluna com o valor de cada transação. Obrigatória. |
| `cjMap_pessoa` | Colaborador (nome): a coluna com o nome de quem usou o cartão. Usada quando o arquivo não traz o CPF. |
| `cjMap_cpf` | CPF do colaborador: a coluna com o CPF do portador. É a forma mais segura de saber de quem é cada transação. |
| `cjMap_estabelecimento` | Estabelecimento: a coluna com o nome da loja. Ajuda a ligar o gasto ao comprovante da prestação de contas. |
| `cjMap_descricao` | Descrição: a coluna com o histórico da transação. |
| `cjMap_tipo` | Tipo da operação: a coluna que diz se é compra, carga, estorno ou recolhimento. Necessária se o sinal do valor não separar isso. |
| `cjMap_cnpj` | CNPJ do estabelecimento: a coluna com o CNPJ da loja, se houver. Confirma a ligação com o comprovante. |
| `cjMap_cartao` | Final do cartão: a coluna com os últimos números do cartão Caju. |
| `cjMap_centro` | Centro de custo: a coluna com o centro de custo usado no Caju. É comparado com o da viagem. |
| `cjMap_categoria` | Categoria (MCC): a coluna com o tipo de estabelecimento ou a carteira do Caju. |
| `cjMap_identificador` | Identificador da transação: a coluna com o código único (NSU, autorização). Evita importar a mesma transação duas vezes. |
| `cjSinal` | Sinal do valor: como o arquivo mostra gastos e créditos. Confira numa linha de compra conhecida: se a compra aparece negativa, escolha "Gasto vem com sinal de menos". |
| `cjDesM_` | Por que desfazer: o motivo de retirar esta importação (ex.: arquivo do mês errado). As linhas saem da conciliação; o arquivo original continua guardado. Mínimo de 15 letras. |
| `cjLinSit` | Situação: filtra as transações por resultado da conciliação (conciliadas, divergentes, pendentes). |
| `cjPes_` | De quem é esta transação: escolha o colaborador dono do cartão quando o arquivo não permitiu reconhecer. |
| `cjLem_` | Lembrar este nome: marcado, as próximas importações reconhecem sozinhas o mesmo nome do extrato como esta pessoa. |
| `cjLig_` | Ligar a um gasto da prestação: escolha o gasto lançado na prestação de contas que corresponde a esta transação do cartão. |
| `cjLigM_` | Motivo: obrigatório se o valor do gasto for diferente do cartão (ex.: gorjeta paga à parte). Fica no histórico. |
| `cjMot_` em Desconsiderar | Por que desconsiderar: por que esta transação não é gasto da viagem (ex.: compra pessoal já descontada com acordo). Fica no histórico e no A4. |
| `cjDivSit` | Situação: abertas precisam de ação; resolvidas foram fechadas com motivo; sanadas sumiram sozinhas porque a condição deixou de existir. |
| `cjRes_` | Como foi resolvida: aceita com justificativa, corrigida (na prestação, no extrato ou no cadastro), vai para glosa (desconto do colaborador na conferência) ou não é gasto de viagem. |
| `cjMot_` em Resolver | Motivo: o que foi verificado e decidido (ex.: comprovante apresentado; diferença é taxa do estabelecimento). Vai para o histórico e para o A4 do fechamento. Mínimo de 15 letras. |
| `cjMot_` em Reabrir divergência | Por que reabrir: o que mudou (ex.: o comprovante apresentado não confere). |
| `cjFDe` / `cjFAte` | De / Até: o primeiro e o último dia do período que será fechado. Depois de fechado, nada do período muda sem reabrir. |
| `cjFCc` | Centro de custo: feche um centro de custo por vez ou deixe vazio para fechar todos. |
| `cjFRess` | Ressalva: o que ficou pendente no fechamento e o encaminhamento (ex.: divergências repassadas ao gestor para cobrança dos comprovantes). Mínimo de 20 letras. Sai no A4. |
| `cjMot_` em Reabrir fechamento | Por que reabrir o fechamento: o que chegou ou mudou depois (ex.: comprovante do hotel chegou depois). |
| `cjFCentro` / `cjFPessoa` | Centro de custo / Colaborador: filtram o painel. Em "Todos", mostra tudo. |
| `cjRelTipo` | Relatório: escolha o tipo de A4 (fechamento, divergências, créditos, individual ou geral). |
| `cjRDe` / `cjRAte` / `cjRCc` | Período e centro de custo do relatório. Centro vazio = todos. |
| `cjRPes` | Colaborador: de quem é o relatório individual. |
| `cjPix_` | Código PIX: o código para pagar o pedido de crédito no banco. Copie e cole no aplicativo do banco da empresa. |
| `cjCancM_` | Motivo do cancelamento: por que o pedido de crédito será cancelado (ex.: viagem adiada pelo cliente). O pedido é cancelado também no Caju. |
| `cjCpf_` / `cjNcpf_` | CPF: o CPF do colaborador, só os números. É o que liga a pessoa do SGO+ ao cartão Caju. |
| `cjNnome_` | Nome completo: exatamente como no documento. O Caju confere. |
| `cjNmail_` / `cjNcel_` | E-mail / Celular: o Caju exige pelo menos um dos dois para o colaborador acessar o app. Celular com DDD e o 9. |
| `cjNnasc_` | Nascimento: data de nascimento do colaborador, se o Caju pedir. |
| `cjMot_` em Arquivar/Desfazer vínculo | Motivo: por que arquivar a pessoa no Caju (ex.: saiu da empresa) ou desfazer o vínculo (ex.: CPF informado errado). |
| `cjModo` | Modo de carga: "pelo Caju" cria o pedido de crédito pela integração; "manual" é quando o Financeiro carrega direto no portal do Caju e só registra aqui. |
| `cjCfgCat`, `cjCfgTol`, `cjCfgAntes`, `cjCfgHoras` | Já têm dica na tela (manter). |
| `cjCfgDepois` | Dias depois da chegada: gasto até N dias depois do retorno ainda conta como da viagem (ex.: estacionamento cobrado no dia seguinte). |
| `cjCfgMot` | Motivo da mudança: por que a configuração mudou (ex.: categoria confirmada com o Caju). Fica no histórico. |

### 4.6 Campos novos de (a) e (b) — para `OMIE_DICAS`

| Chave | Texto |
|---|---|
| `omieCadBusca` | Buscar no Omie: digite o CNPJ (ou CPF) ou parte do nome. Se não aparecer, use "Cadastrar no Omie". |
| `cad:tipo` | Cadastrar como: Cliente (quem paga a empresa), Fornecedor (a quem a empresa paga) ou os dois. Se o CNPJ já existe no Omie, o SGO+ só acrescenta o que falta. |
| `cad:cnpj` | CNPJ ou CPF: o documento de quem será cadastrado. O SGO+ confere os dígitos e procura no Omie antes, para não cadastrar duas vezes. |
| `cad:razao` | Razão social: o nome oficial, como no cartão CNPJ. O Omie aceita até 60 letras. |
| `cad:fantasia` | Nome fantasia: o nome pelo qual a empresa é conhecida. Em branco, vale a razão social. |
| `cad:endereco` | Endereço: rua, número, bairro, cidade, UF e CEP. Vem do cadastro do SGO+, da nota fiscal ou da consulta do CNPJ; a origem aparece ao lado. |
| `cad:email` | E-mail: cliente, o e-mail que recebe cobrança e boleto; fornecedor, o de pedidos. |
| `nota:arquivo` | XML da nota: o arquivo .xml que o fornecedor enviou (o PDF não serve). NF-e de compra ou NFS-e de um serviço contratado pela empresa. |
| `nota:fornecedor` | Fornecedor: lido da nota. Se não estiver cadastrado no Omie, cadastre aqui antes de lançar. |
| `nota:categoria` | Categoria: em que despesa esta nota entra no plano de contas (ex.: peças para manutenção, serviços de terceiros). Só aparecem categorias de despesa. Vale para todas as parcelas. |
| `nota:conta` | Conta corrente: de qual banco a empresa vai pagar. |
| `nota:duplicatas` | Parcelas: os vencimentos e valores que vieram na nota. Confira com o boleto. Se a soma não bate com o total, explique abaixo. |
| `nota:vencimento` | Vencimento: a nota não traz parcelas; informe a data do boleto ou a combinada com o fornecedor. |
| `nota:jaPaga` | Nota já paga: marque se o pagamento já foi feito (cartão, PIX no ato). O SGO+ lança a conta e registra o pagamento em seguida, cada um com prévia. |
| `nota:diferenca` | Motivo da diferença: por que o valor a pagar difere do total da nota (ex.: desconto negociado após a emissão). |
| `nfse:manual` | Campo não lido do XML: a prefeitura usa um formato diferente. Digite o valor como está na nota (PDF) e confira. Fica registrado que foi digitado. |
| `nfse:retencoes` | Retenções: impostos que a empresa desconta do prestador e recolhe ela mesma (IR, PIS, COFINS, CSLL, INSS, ISS). O valor a pagar ao prestador é o líquido. |

---

## 5. Recomendação para (d): foto de tela e repasse de planilha

O navegador não impede foto de tela nem foto pelo celular. O que funciona é **identificar quem vazou e lembrar a pessoa disso
no momento do uso**. Recomendo:

**Sensato (fazer):**
1. **Marca d'água na tela** de todo o Financeiro (Painel financeiro, Conferência do Financeiro, A pagar, Cartões, Conciliação Caju):
   texto em diagonal repetido, "Nome · login · dd/mm/aaaa hh:mm · SIGILOSO", opacidade baixa (~6–8%), `pointer-events: none`,
   atualizado a cada minuto. Não atrapalha a leitura e aparece em qualquer foto. Gerar o nome e a hora a partir da sessão
   devolvida pelo servidor, não de campo editável.
2. **Planilhas geradas no servidor**, não no navegador (hoje o CSV do Painel é montado no navegador em `JS_Omie_Gestao.html:227-233`
   e o registro é só um aviso que pode falhar). Primeira linha: "Gerado por Nome (login) em dd/mm/aaaa hh:mm · uso interno ·
   código XXXX-XXXX"; última linha repete o código. O código é único por download e fica no registro (`FIN_OMIE_ACESSOS`) com a
   quantidade de linhas e o hash do conteúdo. Uma planilha repassada é rastreável até o download. Vale para a planilha da
   Conferência de Compras (`CmpFin_planilha_`, `SGO_Compras_Financeiro.js:121`, hoje sem registro) e para os A4 do Caju (rodapé
   com o mesmo texto).
3. **Impressão com identificação**, não bloqueio: `@media print` imprime a marca d'água e o rodapé "impresso por … em …".
4. **Termo de sigilo** na primeira entrada (e a cada 6 meses): "Estes dados são sigilosos; foto, cópia e repasse são
   rastreados e tratados pelo Programa de Conduta". Aceite registrado (o projeto já tem ciência no Conduta).
5. **Aviso ao dono** por e-mail quando houver download de planilha do Financeiro fora do horário comercial ou mais de N por dia.
6. **Exportação como caixa própria** (`FIN_OMIE_EXPORTAR`), separada da consulta. **[DONO DECIDE]** quem tem.

**Não sensato (não fazer):** bloquear botão direito, tecla PrintScreen ou seleção de texto (contornável em segundos e atrapalha o
trabalho); escurecer a tela quando a janela perde o foco (atrapalha quem usa dois monitores); DRM ou marca d'água invisível
esteganográfica (custo alto, valor baixo neste tamanho de equipe); impedir a impressão (ela vira foto, que é pior de rastrear).

---

## 6. O que mais falta para o Financeiro rodar 100% pelo SGO+ (priorizado)

1. **Corrigir B1 a B9** (antes de qualquer item novo). B1 e B5 primeiro.
2. **Trilha de operações e estorno de baixa** (M2): guardar `codigo_baixa` e oferecer "Estornar baixa" com
   `CancelarPagamento`/`CancelarRecebimento` (aceitam `codigo_baixa` ou `codigo_baixa_integracao`, confirmado na documentação),
   com prévia e motivo. Sem isso, um erro de baixa só se corrige no Omie.
3. **(a) Cadastro de cliente e fornecedor** (seção 2) e **busca por CNPJ/nome** (B9).
4. **(b) NF-e de compra e NFS-e** (seção 3). **[DONO DECIDE]**: caminho B ou A; retenções opção (i) ou (ii); de-para de categorias.
5. **Excluir/cancelar título lançado errado**: `ExcluirContaPagar` (confirmado) e o equivalente a receber (**a confirmar** o
   método em `contareceber`). Só para título sem baixa, com motivo.
6. **Anexar comprovante e nota ao título** no Omie: `geral/anexo/IncluirAnexo` (`cTabela` `conta-pagar`/`conta-receber`, `nId`,
   arquivo em zip base64, `cMd5`; limite de tamanho **a confirmar**). Reaproveitar os comprovantes já guardados em Compras.
7. **Transferência entre contas e lançamentos avulsos de conta corrente** (tarifa bancária, rendimento, aporte):
   `financas/contacorrentelancamentos/IncluirLancCC` (`cabecalho.nCodCC`, `dDtLanc`, `nValorLanc`; `detalhes.cCodCateg`, `cTipo`;
   `transferencia.nCodCCDestino`). Necessário para a conferência de extrato fechar sem abrir o Omie.
8. **Compras → Omie (uma só fonte de verdade das contas a pagar)** **[DONO DECIDE]**: hoje "A pagar" e "Conferida" em Compras não
   existem no Omie, e o Omie não sabe das compras no cartão. Proposta: ao conferir uma compra faturada/boleto, gerar a conta a
   pagar no Omie (referência `CMP-<pedido>-<parcela>`); ao marcar como pago, registrar a baixa no Omie; fatura do cartão fechada
   vira uma conta a pagar ao banco do cartão. Sem isso, ou a Wanessa lança em dobro, ou o Omie fica incompleto.
9. **Caju no Omie** **[DONO DECIDE]**: cargas pagas ao Caju (com taxa) como conta a pagar/baixa no Omie na categoria de despesas de
   viagem.
10. **Parcelamento e rateio** no novo lançamento (várias parcelas; categorias e departamentos com percentual).
11. **Saldo em aberto e baixa parcial visíveis** na lista de títulos (parte do B2).
12. **Guias de impostos retidos** (consequência do item 4, opção i): gerar as contas a pagar do DARF e do ISS no mês seguinte.
13. **Alçada de pagamento** **[DONO DECIDE]**: valor acima do qual a baixa de conta a pagar exige uma segunda pessoa da lista de
    sigilo.
14. **Conciliação dentro do Omie**: a documentação consultada não mostra método para marcar a conciliação; os campos `dDtConc`
    aparecem só como leitura (`ConsultaLancCC`/`ListarLancCC`). Manter a conferência local e marcar no Omie à mão até haver
    método (**a confirmar**).
15. **Manuais**: atualizar `docs/MANUAL_PAINEL_FINANCEIRO.md`, `MANUAL_COMPRAS_FINANCEIRO.md` e `MANUAL_CONCILIACAO_CAJU.md` com
    os textos da seção 4 no mesmo commit de cada mudança (regra do projeto).

### Decisões pendentes do dono (resumo)

- (b) NF-e de compra: só financeiro (caminho B, recomendado) ou também fiscal no Omie (A).
- NFS-e: retenções nos campos do Omie (recomendado) ou só líquido.
- De-para inicial de categorias por tipo de fornecedor (com o contador).
- Importação de NF-e de saída: continua sem gerar título (M7)?
- Caixa própria para cadastrar no Omie e para exportar planilhas.
- Limite para segunda confirmação de valor e alçada de pagamento com segunda pessoa.
- Compras e Caju passarem a lançar no Omie (itens 8 e 9).

### O que confirmar na primeira operação acompanhada (lista para o roteiro)

1. Baixa com juros: qual valor entra na conta corrente (B1).
2. `IncluirContaPagar` com vencimento passado é aceito? (M3)
3. `IncluirCliente`: formato de `tags` (array ou objeto) e recusa de `codigo_cliente_integracao` repetido.
4. `AlterarCliente` substitui ou soma as tags.
5. `AlterarConta*` mantém ou apaga o rateio quando se envia uma categoria só (B3).
6. `ConsultarRecebimento` por `cChaveNfe` de nota inexistente: erro ou vazio; a conta Omie captura notas da SEFAZ?
7. Conta a pagar com `retem_*`: o saldo e a baixa ficam pelo líquido?
8. Limite de tamanho de `IncluirAnexo`.
