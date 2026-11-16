# Relatório — Regras do Financeiro configuráveis (16/11/2026)

Pedido do dono: "deixa tudo organizado de forma que possa ser configurado". Base: `output/financeiro-20261116/cand4` no estado atual, já com as telas do designer e a correção do Conduta. Li os arquivos antes de editar e não desfiz nada disso; os finais de linha CRLF das telas foram mantidos.

Nada foi publicado. Não houve acesso à produção nem ao Omie real, nem commit. `OMIE_EMPRESA_CNPJ` continua sem valor. Todas as configurações novas também ficam sem valor, e sem valor vale o padrão seguro, que é o comportamento de antes.

## 1. O que foi feito

### Chaves e senhas (`SGO_Chaves.js`)

São dois grupos novos, **Regras do Financeiro** e **Conduta**, logo depois de Omie. Cada item tem a sua ajuda, e a validação está em `Chaves_validarValor_`.

| Chave | Opções | Padrão (sem valor) | Validação |
|---|---|---|---|
| `OMIE_NFE_COMPRA_DESTINO` | `FINANCEIRO` "Só financeiro (conta a pagar)" · `FINANCEIRO_FISCAL` "Financeiro e fiscal — combinar com o contador" | FINANCEIRO | só as duas opções |
| `OMIE_NFSE_RETENCOES` | `OBSERVACAO` "Valor líquido, retenções na observação" · `CAMPOS_OMIE` "Retenções nos campos do Omie (a confirmar)" | OBSERVACAO | só as duas opções |
| `OMIE_ALCADA_SEGUNDA_CONFIRMACAO` | valor em R$ | desligada | maior que zero; aceita "10.000,00", "R$ 10000", "10000.5"; grava "10000.00" |
| `OMIE_ALCADA_APROVACAO` | valor em R$ | desligada | idem |
| `CONDUTA_ENVOLVIDO_VE_QUEM_REGISTROU` | `NAO` · `SIM` | NAO | só NAO/SIM (aceita "não") |

Se a propriedade tiver um valor estranho gravado por outro caminho, vale o padrão. A Conduta já lia `CONDUTA_ENVOLVIDO_VE_QUEM_REGISTROU` em `Conduta_envolvidoVeQuemRegistrou_`; agora a chave aparece em Chaves e senhas.

### Servidor

**`SGO_Omie_Regras.js` (novo)** reúne a leitura das configurações e os dois mecanismos novos.

As alçadas valem para a baixa (a pagar e a receber), para o lançamento e a alteração de conta a pagar e para a nota recebida (pelo total que será lançado agora).
- **Segunda confirmação:** acima do valor, a confirmação só passa se a pessoa digitar o mesmo valor de novo (`valorConfirmado`).
- **Aprovação:** acima do valor, a prévia fica "aguardando aprovação" e espera até 24 horas.
  - Só OUTRA conta da lista de sigilo aprova. Quem preparou é recusado com a mensagem "não aprova a própria operação"; quem está fora da lista recebe a mensagem do sigilo.
  - Depois de aprovada, a prévia vale 10 minutos, como hoje.
  - Recusar exige motivo, e quem preparou vê esse motivo ao tentar confirmar.
  - Tudo vai para FIN_OMIE_ACESSOS (APROVADA/RECUSADA), sem valores no log.
- **Pendência para os aprovadores:** `Omie_apiIniciar` devolve `aprovacoesPendentes` só das operações preparadas por outras pessoas. O Painel mostra no topo uma faixa "N operação(ões) aguardando a sua aprovação · Ver aprovações".
- Funções chamadas pela tela: `OmieRegras_apiTela`, `OmieRegras_apiAprovacoes`, `OmieRegras_apiDecidir`, `OmieRegras_apiSalvarDepara`.

O **de-para de categorias** fica na propriedade `OMIE_CATEGORIAS_DEPARA` (JSON validado).
- Cada regra tem tipo (`NFE_COMPRA`, `NFSE`, `RECEBER_PROPOSTA`), CNPJ/CPF opcional (com dígito verificador) e categoria. Duplicata é recusada, e o limite é 200 regras.
- Na gravação, cada categoria é conferida no Omie (`ListarCategorias`): precisa existir, estar ativa e ser de despesa para conta a pagar ou de receita para conta a receber. A descrição gravada vem do Omie.
- Motivo obrigatório. O histórico fica em `FIN_OMIE_REGRAS_HIST` e no registro de acessos.
- JSON ilegível vale como lista vazia.
- A sugestão segue a ordem: regra do CNPJ primeiro, depois a regra geral; na NF-e e na NFS-e, sem regra, a última categoria usada para o fornecedor.
- **Quem altera o de-para:** quem tem a caixa FIN_OMIE_LANCAR e está na lista de sigilo. É quem lança e conhece o plano de contas no dia a dia; o dono está na lista e também pode; a Diretoria vê o histórico com o motivo. Ver o de-para basta estar na lista de sigilo.

Mudanças em arquivos que já existiam:
- **`SGO_Omie_Operacoes.js`:** a prévia aplica as alçadas e o prazo, e devolve `alcada`. A confirmação confere aprovação e valor digitado antes de enviar.
- **`SGO_Omie_Notas.js`:**
  - `OMIE_NFE_COMPRA_DESTINO = FINANCEIRO_FISCAL` põe um aviso no começo dos alertas da leitura e da prévia ("o caminho fiscal ainda não existe no SGO+; esta nota será lançada só no financeiro; combine com o contador") e continua só com `IncluirContaPagar`. Não há chamada fiscal.
  - `OMIE_NFSE_RETENCOES = CAMPOS_OMIE`: o título vai pelo valor do serviço menos o desconto incondicionado. Cada retenção maior que zero vai em `retem_ir/valor_ir`, `retem_pis/valor_pis`, `retem_cofins/valor_cofins`, `retem_csll/valor_csll`, `retem_iss/valor_iss`, `retem_inss/valor_inss`. A prévia diz "a confirmar na primeira operação acompanhada" e mostra o líquido a pagar. Com o padrão, nada muda.
  - A sugestão de categoria vem do de-para (com a origem), e as alçadas valem na prévia e na confirmação.
- **`SGO_Omie_Pedidos.js`:** o preparo da conta a receber de proposta traz a categoria sugerida (`RECEBER_PROPOSTA`) só quando existe regra; sem regra, o retorno é o mesmo de antes.
- **`SGO_Omie.js`:** `aprovacoesPendentes` no início do Painel.

### Telas

- **`JS_Omie_Regras.html` (novo, incluído no Index):** aba **Regras do Financeiro** do Painel (`OMIE_ABAS`, `OmieTela_abrir_`). Tem:
  - as configurações em vigor, só para leitura, dizendo onde se alteram;
  - as aprovações pendentes, com a prévia, Aprovar e Recusar com motivo; na operação da própria pessoa, o aviso de que outra pessoa precisa aprovar;
  - o de-para, com tipo, CNPJ e a categoria escolhida na lista que vem do Omie (filtrada por despesa ou receita conforme o tipo), "Acrescentar à lista", "Tirar", motivo e "Gravar o de-para";
  - o histórico das mudanças.
- O mesmo arquivo traz os pedaços usados nas prévias: a faixa "Aguardando aprovação" e o campo "Digite o valor de novo (R$)".
- **`JS_Omie_Operacoes.html`:**
  - a categoria sugerida vem escolhida, com a nota "sugerida pelas Regras do Financeiro… confira; você pode trocar";
  - a prévia mostra os campos de alçada e a confirmação manda o valor digitado;
  - recusa por alçada mantém a prévia e o token, para tentar de novo.
- **`JS_Omie_Notas.html`:** prévia com os campos de alçada e confirmação com o valor digitado; o aviso do destino fiscal sai na lista de alertas que já existia.
- **`JS_Omie_Gestao.html`:** a aba nova e a faixa de aprovações pendentes. O resto da faixa de gravação é o mesmo.

### Explicações, ajuda e manuais

- **Explicações dos campos (`OMIE_DICAS` em `JS_Omie_Ajuda.html`):** `regraTipo`, `regraCnpj`, `regraCategoria`, `regraMotivo`, `aprovMotivo`, `valorConfirmado`. O guia "Como fazer nesta aba" de `regras` também foi acrescentado.
- **`SGO_Ajuda_Financeiro.js`:** passo novo "Regras do Financeiro".
- **`SGO_Ajuda_Conduta.js`:** diz que o "nome preservado" é configurável em Chaves e senhas > Conduta.
- **`docs/MANUAL_PAINEL_FINANCEIRO.md`:** seção **8c** nova (tabela das configurações, alçadas, de-para, Conduta), três linhas novas em Problemas comuns e seções 10 e 11 regeneradas.
- **`output/financeiro-20261116/gerar-manual-campos.cjs`:** os campos do lançamento seguem a ordem nova do designer (cliente/fornecedor → busca → documento → valor → vencimento → categoria → conta → referência → previsão → emissão → observação), com o grupo novo "Regras do Financeiro" e o nome da aba.

## 2. O que não foi feito, e por quê

- O caminho fiscal da NF-e de compra (`ImportarNFe` com `cOperacao 21`) não foi implementado, como pedido. A opção só avisa.
- A pendência de aprovação aparece no Painel financeiro (faixa e aba), não na central de pendências do Início do SGO+. Levar para lá depende de ligar o módulo de pendências, que fica fora do Financeiro.
- O de-para não cobre lançamento avulso (conta a pagar ou a receber sem documento); cobre os três tipos pedidos. Acrescentar um tipo é uma linha em `OMIE_DEPARA_TIPOS`.
- A regra de alçada não vale para boletos nem para o cadastro de cliente ou fornecedor, porque não envolvem pagamento.

## 3. Testes

`tests/financeiro-config-20261116.test.cjs` (novo): **8 passam, 0 falham**. Cobre:
- cada configuração: padrão, cada opção, valor inválido recusado e valor estranho gravado valendo o padrão;
- o destino fiscal avisando e sem chamada fiscal;
- as retenções nos campos, com o payload exato;
- o de-para: vazio, recusas, gravação, histórico, regra do CNPJ antes da geral, sugestão sem substituir a escolha, JSON estragado;
- a segunda confirmação;
- a aprovação por outra pessoa, recusa da autoaprovação e de quem está fora do sigilo, recusa com motivo e expiração de 10 minutos depois de aprovada;
- as alçadas na nota recebida;
- a página completa a 390 e 320 px: faixa de aprovação, aba, explicações, aprovar pela tela, gravar o de-para, sem rolagem lateral e sem erro de JavaScript.

As capturas estão em `output/financeiro-20261116/capturas-dev/390-regras-financeiro.png` e `320-regras-financeiro.png`.

Auxiliar novo: `tests/_financeiro_simulado.cjs`, cópia do simulador de `tests/financeiro-completo-20261116.test.cjs`, que não foi alterado.

Teste ajustado de propósito: `tests/financeiro-omie-20261114.test.cjs`. O Painel passou de 15 para 16 abas e `SGO_Omie_Regras.js` entrou na lista de arquivos carregados.

Lista relevante (`rodar-lista.sh`, versão final):

| Arquivo | Resultado |
|---|---|
| financeiro-config-20261116 | 8/0 |
| financeiro-completo-20261116 | 23/0 |
| financeiro-omie-20261114 | 25/0 |
| omie-operacoes | 20/0 |
| omie-faturamento | 12/0 |
| omie-financeiro | 13/0 |
| omie-conciliacao | 9/0 |
| ganhos-omie-20261115 | 6/0 |
| financeiro-sigilo-geral-20261116 | 5/0 |
| compras | 17/0 |
| compras-informar-conciliacao | 10/0 |
| conciliacao-caju | 14/0 |
| conduta-relato-20261116 | 10/0 |
| poderes-lote0 | 13/0 |
| poderes-lote3 | 4/0 |

Suíte completa (`output/financeiro-20261116/suite-config.txt`): **242 arquivos, pass 2233 / fail 71** (27 arquivos com saída diferente de zero). Referência `suite-design.txt`: 241 arquivos, pass 2225 / fail 71.

Comparação arquivo a arquivo: **nenhum arquivo piorou**. A única diferença é o arquivo novo `financeiro-config-20261116` (+8 passando). As 71 falhas são as mesmas antigas da referência, em arquivos que esta entrega não tocou.

## 4. Arquivos

**cand4, novos:** `SGO_Omie_Regras.js`, `JS_Omie_Regras.html`.

**cand4, alterados:** `Index.html` (include de JS_Omie_Regras), `SGO_Chaves.js`, `SGO_Omie.js`, `SGO_Omie_Operacoes.js`, `SGO_Omie_Notas.js`, `SGO_Omie_Pedidos.js`, `SGO_Ajuda_Financeiro.js`, `SGO_Ajuda_Conduta.js`, `JS_Omie_Gestao.html`, `JS_Omie_Operacoes.html`, `JS_Omie_Notas.html`, `JS_Omie_Ajuda.html` (os quatro últimos em CRLF, mantido).

**tests/:** `financeiro-config-20261116.test.cjs` (novo), `_financeiro_simulado.cjs` (novo), `financeiro-omie-20261114.test.cjs` (contagem de abas e arquivo carregado).

**docs/:** `MANUAL_PAINEL_FINANCEIRO.md`.

**output/financeiro-20261116/:** `gerar-manual-campos.cjs`, `suite-config.txt`, `capturas-dev/*-regras-financeiro.png`.

## 5. Para o dono

Preencher em Chaves e senhas, quando decidir:
- `OMIE_EMPRESA_CNPJ`;
- as duas alçadas (vazias = desligadas);
- as retenções (trocar para "campos do Omie" só depois da primeira operação acompanhada e com o contador);
- o destino da NF-e.

O de-para inicial é montado pela Wanessa com o contador, na aba Regras do Financeiro.
