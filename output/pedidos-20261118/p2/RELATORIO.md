# Pacote 2 de 18/11/2026 (Comercial): relatório

Base: `output/financeiro-20261116/cand27`, que era igual à cand26 (produção atual com o pacote 1) antes deste trabalho (`diff -rq` vazio). Nada foi publicado e nada foi gravado na produção. Houve uma leitura no banco, com `default_transaction_read_only=on`: as linhas de `CAD_CONTATOS`, para contar os contatos repetidos. Nenhum e-mail, WhatsApp ou chamada de IA real foi feito; os testes usam os simuladores.

Placar: suíte completa **2641 aprovados / 0 falhas, 286 arquivos, todos com saída 0** (referência anterior: 2624 / 0) (`suite.txt`). Testes novos: `tests/pedidos-20261118-p2-{equipamento,contatos,orcamento,telas}.test.cjs`, com 6, 6, 4 e 1 testes, todos verdes. O teste de telas percorre 13 telas a 1366 e a 390 px.

## 1. O que foi feito, por item

### Item 6: equipamento opcional na calibração e na qualificação

- Regra no servidor (`SGO_Comercial_DadosEmissao.js`): com a opção ligada, que é o padrão, o item de **calibração ou de qualificação (QI, QO e QD)** passa na conferência "Faltam dados para emitir" sem nenhum equipamento vinculado. Bastam a quantidade e o **tipo de equipamento**.
- O tipo é o que está escrito no campo novo "Tipo de equipamento" do item. Com o campo vazio, o tipo sai da descrição: "Calibração de termômetro digital" dá "termômetro digital" e "Qualificação de instalação (QI) de termodesinfectora" dá "termodesinfectora".
- Quando a descrição não diz o tipo (por exemplo "Serviço de calibração RBC"), o quadro mostra a falta `EQT.n`, com o quê, o porquê e o que fazer.
- Contam como calibração ou qualificação: o serviço pedido na proposta guiada, o código `CAL-`/`QUA-` ou essas palavras na descrição. Manutenção, NR-13, ensaio e inspeção continuam exigindo o equipamento, um por unidade do item.
- **Configurável:** a propriedade de sempre (`COM_DADOS_EMISSAO_CFG`) ganhou a chave `equipamentoOpcional` (padrão `true`). A gravação faz merge e não mexe na chave `ligada`. A tela fica em Metodologia comercial, no quadro "Equipamento na calibração e na qualificação". Todos veem o quadro; só a Diretoria, o Administrador e o dono alteram, com motivo, e a mudança entra no histórico `CONFIG/EQUIPAMENTO_OPCIONAL`.
- **Nada que depende do equipamento quebra:**
  - **Preço e catálogo oficial:** o preço vem dos pontos, das receitas e dos parâmetros do item, não do vínculo. Não mudou.
  - **Itens repetidos:** dois itens do mesmo serviço para tipos diferentes deixam de ser recusados como repetidos (o tipo entrou na chave).
  - **Documento A4** (`SGO_Comercial_Documento.js`): o item mostra "Tipo de equipamento: …. Os equipamentos são identificados (marca, modelo, número de série e local) na execução do serviço e constam do certificado ou relatório". Com vínculo parcial, aparecem os identificados e a frase vale para os demais.
  - **Escopo da especialista** (modelo e IA): traz a quantidade e o tipo, "identificados na execução do serviço". O tipo escrito entra na marca de validação só quando existe, então os escopos já validados continuam válidos.
  - **Proposta guiada:** o passo 4 ganhou "Sem vincular equipamentos", com tipo, quantidade e serviço por linha. No passo 5, cada linha recebe o serviço do catálogo pela mesma sugestão usada para os equipamentos.
  - **Passagem aos setores:** a atividade da Área técnica traz "Equipamentos: tipo; N equipamentos a identificar na execução (triagem do chamado e certificado)".
  - **Chamado da Assistência** (`SGO_Assistencia_Chamados.js`): leva o tipo e "equipamentos a identificar na triagem". A triagem já tinha o campo "Ligar ao equipamento do cadastro" para chamado sem equipamento, que é onde o vínculo é feito.
  - **Contratos e régua:** não leem o equipamento dos itens (conferido no código). Não mudaram.
- **Tela:** o quadro "Equipamentos identificados na execução" (aviso, não trava) aparece na proposta em qualquer situação, inclusive enviada e aprovada. Ele diz, por item, o tipo e quantos faltam identificar, e explica onde o vínculo será feito. No item, o campo passou a ser "Equipamento (opcional)", ao lado do "Tipo de equipamento".

### Item 7: contato duplicado

Onde ficam os contatos: `CAD_CONTATOS`, o cadastro de contatos do Comercial. A migração de 21/10/2026 trouxe para ele o contato do cliente e o responsável da unidade, e o CRM também importou contatos. As referências estão em `COM_PROPOSTAS.CONTATO_ID`, `COM_OPORTUNIDADES.CONTATO_ID` e `COM_CONTATOS_REGISTRO.CONTATO_ID` (contatos registrados e atividades do CRM). O e-mail integrado identifica o cliente pelo endereço.

- **Contato repetido:** contato ATIVO do MESMO cliente com o mesmo nome (sem acento, sem maiúsculas e sem espaços a mais), o mesmo e-mail ou o mesmo celular (11 dígitos). Fora da regra:
  - o telefone fixo sozinho, porque a central do hospital é de muita gente;
  - os nomes genéricos da migração;
  - contatos de clientes diferentes.
- **(a) Cadastro:** `ComCt_salvar_` recusa o contato repetido, diz o quê, por quê e o que fazer, e devolve o contato existente (`dados.duplicados`).
  - A tela (Novo contato e responsáveis da proposta guiada) mostra o existente e o botão **"Usar o contato existente"**. Ele completa só os campos em branco do existente com o que foi digitado (merge; nada preenchido é trocado) e fica no histórico.
  - Na edição, só a chave nova é recusada, para que o contato que já era repetido continue editável.
  - O "Preencher agora" e a conferência dos dados do cliente usam o existente em vez de criar outro.
- **(b) "Unificar contatos duplicados":**
  - **Onde:** quadro no Painel comercial (gestão) e aviso na oportunidade, "Este cliente tem contatos repetidos". A gestão toca em "Unificar"; o vendedor toca em "Pedir para unificar", que avisa a gestão comercial pelo sistema e por e-mail.
  - **Como se escolhe:** a janela mostra cada contato com as referências. O sugerido para ficar é o de mais referências, depois o de mais campos preenchidos, depois o principal, depois o mais antigo. A **prévia** ("Como fica") não grava nada.
  - **O que a unificação faz** (motivo obrigatório):
    - merge dos campos;
    - o valor diferente vai para as observações do principal;
    - a marca de principal do cliente passa para o que fica;
    - propostas, oportunidades e contatos registrados passam para o que fica;
    - os outros ficam `INATIVO` com `JUNTADO_COM_ID`, nunca apagados;
    - o e-mail deles continua identificando o cliente no e-mail integrado (ajuste de uma linha em `SGO_Email.js`);
    - fica o histórico em cada contato e em `CadQ_registrar_`.
  - **Proteções:** o servidor recusa contatos de clientes diferentes, contatos que não são repetidos entre si e contatos já unificados.
  - Nada é unificado sozinho. O "unifica ao ver" virou sugestão na tela mais um toque, depois da prévia.
- Testado com dados simulados que reproduzem os casos reais (cliente + unidade da migração, nome digitado errado, apelido).

### Item 8: menos tempo para gerar o orçamento

O que entrou (alto impacto, baixo risco; nenhuma regra de preço mudou):

1. **"Do catálogo" com vários itens de uma vez.** Marca-se cada item com a quantidade, a busca pode mudar e as marcas continuam. No topo aparecem **os mais usados** dos últimos 12 meses: os da pessoa, ou os da equipe enquanto ela tem menos de 5 propostas no período. Um botão "Acrescentar N itens" põe tudo no rascunho. Item igual já na proposta soma na quantidade, em vez de cair na recusa de item repetido.
2. **"Nova proposta" na oportunidade** com duas saídas:
   - "Em branco": traz o contato principal (quando a oportunidade não tem contato) e as condições de **pagamento, garantia e frete da última proposta do cliente** (o local também, se for a mesma unidade). Fica no histórico.
   - "Copiar esta": lista as propostas anteriores do cliente.
3. **"Duplicar proposta"**, na proposta aberta: cria uma oportunidade nova do mesmo cliente com um rascunho igual (itens, quantidades, parâmetros, tipo, equipamentos ativos, condições, escopo e viagem), **com os preços da tabela de hoje**. Desconto, aprovações e validação do escopo não são copiados. Item que saiu do catálogo vira avulso e equipamento inativo sai; os dois casos vêm com aviso. A cópia fica no histórico das duas propostas.
4. **Rascunho guardado no aparelho:** o editor guarda localmente o que ainda não foi salvo e, ao reabrir a proposta, oferece "Recuperar e salvar" ou "Descartar". A cópia só vale para a mesma versão gravada e é apagada ao salvar.
   - Escolhi isso em vez de salvar sozinho no servidor porque cada gravação lança histórico, refaz a viagem e confere a política.
5. **Menos campos para emitir:** o vínculo de cada equipamento deixou de ser exigido na calibração e na qualificação (item 6).
   - Os campos do **rascunho** já eram mínimos (descrição com 3 letras, quantidade e preço numérico). O que trava está na conclusão (checklist da viagem e política) e na emissão (dados completos), e são regras do dono. Não mexi nelas.
   - A lista colada continua pelo **Orçamentista** (botão no passo 1), que já separava itens e quantidades.

## 2. Antes × depois: orçamento típico de 10 itens de calibração

Cenário: oportunidade aberta, 10 serviços de calibração do catálogo e 30 instrumentos no total (7 itens com quantidade diferente de 1). A contagem foi feita no código das telas (cand26 × cand27) e conferida no navegador pelo teste de telas (`capturas/medidas.json`: 16 toques do "Nova proposta" ao "Salvar", com 10 itens marcados e 3 quantidades digitadas).

| Etapa | Antes (cand26) | Depois (cand27) |
|---|---|---|
| Abrir a proposta | 1 toque ("Nova proposta") | 2 toques ("Nova proposta" > "Em branco") ou 2 toques para copiar uma anterior |
| Pôr os 10 itens | 10 × ("Do catálogo" + busca digitada + escolher) = 20 toques, 10 buscas e 10 janelas | 1 janela: 1 toque para abrir + 10 marcações + 1 "Acrescentar" = 12 toques, 0 a 2 buscas (os mais usados, ou uma busca "calibração") |
| Quantidades | 7 campos | 7 campos (na própria janela) |
| Condições (pagamento, garantia, frete) | até 3 campos | 0 (vêm da última proposta do cliente; conferir) |
| Equipamentos para emitir | obrigatórios, um por unidade: 10 janelas "Identificar equipamentos" e 30 equipamentos × 5 dados (tipo, marca, modelo, série, setor) = **150 campos** (ou pedir ao cliente e esperar a resposta) | **0 campos** (tipo pela descrição; no pior caso, 10 campos de tipo) |
| Salvar | 1 toque | 1 toque |
| **Total até o rascunho pronto para emitir** | cerca de 52 toques, 10 buscas e cerca de 160 campos | cerca de 15 toques, 0 a 2 buscas e 7 campos |

- Pela proposta guiada, antes: os 30 instrumentos tinham de ser **cadastrados** um a um no passo 4 (7 campos cada, 210 campos). Agora são 2 linhas "Sem vincular equipamentos" (tipo, quantidade e serviço).
- Repetindo um orçamento do cliente: "Duplicar proposta" ou "Copiar esta" levam 2 toques e trazem tudo, inclusive viagem e escopo.

## 3. Arquivos (relativos à cand27)

**Novos:** nenhum.

**Alterados.** O fim de linha foi conferido arquivo a arquivo: os CRLF continuam CRLF e os LF continuam LF.

| Arquivo | Fim de linha | O que mudou |
|---|---|---|
| `SGO_Comercial_Contatos.js` | CRLF | recusa do repetido e "usar existente"; detecção de grupos, prévia, unificação e pedido |
| `SGO_Comercial_DadosEmissao.js` | CRLF | regra do opcional, tipo, configuração, aviso `aIdentificar`, escopo e uso do contato existente |
| `SGO_Comercial_Propostas.js` | LF | tipo no item e na chave de repetidos; padrão do cliente na proposta nova; duplicar; propostas do cliente; mais usados; texto da passagem; `versaoRascunho` |
| `SGO_Comercial_Painel.js` | LF | rotas novas (`contatosDuplicados`, `contatosPrevia`, `contatosUnificar`, `contatosPedirUnificacao`, `duplicarProposta`, `propostasDoCliente`, `itensFrequentes`, `equipamentoOpcionalSalvar`); a recusa leva `dados`; Metodologia com a opção |
| `SGO_Comercial_Oportunidades.js` | LF | `contatosRepetidos` e `podeUnificarContatos` na ficha |
| `SGO_Comercial_Assistente.js` | CRLF | linha sem vínculo no "montar"; "usar existente" no responsável |
| `SGO_Comercial_Documento.js` | LF | tipo e "identificados na execução" no A4 |
| `SGO_Assistencia_Chamados.js` | LF | tipo no chamado do pedido aprovado |
| `SGO_Email.js` | LF | contato unificado continua identificando o cliente pelo e-mail |
| `JS_Comercial.html` | LF | todas as telas acima e o CSS (a janela antiga do catálogo foi trocada) |
| `SGO_Ajuda_Comercial.js` | LF | ajuda de Propostas, Oportunidades, Painel e Metodologia |
| `SGO_AssistenteManuais.js` | LF | base do assistente regerada do `docs/` (versão `d6844ef76c6e`; `--conferir` em dia) |

**Fora da cand27:**

- `docs/MANUAL_MODULO_COMERCIAL.md`, com as seções novas: "Orçamento rápido", "Equipamento na calibração e na qualificação" e "Contatos repetidos", mais o trecho de "Dados completos para emitir".
- Testes novos: os 4 acima.
- Testes ajustados de propósito, com comentário datado:
  - `tests/_comercial_ambiente.cjs`: a segunda oportunidade do mesmo teste usa o contato existente (`usarExistente`), como a vendedora faria.
  - `tests/comercial-dados-completos.test.cjs` e `tests/comercial-proposta-guiada.test.cjs`: tratam do vínculo OBRIGATÓRIO (regra de 11/11, que continua como opção) e fixam `equipamentoOpcional:false`.
  - `tests/comercial-legendas-20261113.test.cjs`: os arquivos do Comercial deste pacote saem da comparação com a base; estão cobertos pelos testes p2.

Diff completo: `legado-p2.patch` (cand26 → cand27). Capturas: `capturas/` (1366 e 390 px, 13 telas cada).

## 4. Decisões

- **Opcional só na calibração e na qualificação**, como pedido. Manutenção, NR-13, ensaio e inspeção continuam exigindo o equipamento: o preço e o plano dependem dele.
- **Onde o vínculo é feito depois:** na triagem do chamado, onde o campo já existia, e no certificado. Não criei um campo novo de vínculo "depois do aceite" na proposta: mexer nos itens da proposta aceita mudaria o que o cliente assinou.
- **Quem altera a opção:** a Diretoria, o Administrador e o dono, porque a trava dos dados completos é decisão do dono de 11/11.
- **Repetido = nome, e-mail ou celular no mesmo cliente;** o telefone fixo não conta. Unificar só com prévia e motivo, e só pela gestão comercial. O vendedor pede.
- **Duplicar com o preço da tabela de hoje** e sem o desconto, para que a cópia passe pela política de novo.
- **O rascunho local fica no aparelho**, sem gravação automática no servidor (motivo no item 8).
- **Condições "do cliente"**: pagamento, garantia e frete da última proposta que saiu do rascunho. O texto do local só é copiado na mesma unidade.

## 5. Riscos

- **Tipo pela descrição:** é uma regra de texto. Descrição atípica pode dar um tipo estranho (por exemplo, a parte depois de "de"). O tipo escrito no item sempre vale, e a tela mostra o tipo deduzido como dica no campo.
- **Proposta antiga que hoje esperava o equipamento:** com a opção ligada, deixa de pedir o vínculo na calibração e na qualificação e passa a emitir com o tipo. É o comportamento pedido.
- **Unificação:** um contato com dois e-mails diferentes fica com um no campo e o outro nas observações. O índice do e-mail integrado continua reconhecendo os dois (o do unificado e o do principal).
- **"Mais usados":** conta as propostas dos últimos 12 meses lendo `COM_PROPOSTAS` a cada abertura da janela (cerca de 1.050 linhas hoje). É leve, mas cresce com o tempo.
- **Rascunho local:** depende do navegador. Em janela privada ou com os dados do site limpos, não guarda; nunca impede salvar.

## 6. Contatos repetidos hoje na produção (leitura de 18/11/2026)

Leitura de `CAD_CONTATOS` (568 linhas, 566 ativas), aplicando a mesma regra do código (`ComCt_gruposBrutos_`):

- **52 grupos de contatos repetidos, com 108 contatos, em 52 clientes** (um grupo por cliente).
  - 48 grupos de dois e 4 grupos de três.
  - Por motivo: o mesmo celular em 39 grupos, o mesmo nome em 23 e o mesmo e-mail em 7 (um grupo pode ter mais de um motivo).
  - Por origem dos contatos envolvidos: 51 "MIGRADO_CLIENTE", 50 "MIGRADO_UNIDADE", 5 do CRM e 2 manuais.
- Quase todos nasceram da migração de 21/10/2026, que trouxe o contato do cadastro do cliente e o responsável da unidade como dois contatos da mesma pessoa. Há também nomes digitados com erro, como "HERNRIQUE" e "HENRIQUE", com o mesmo celular.
- Nada foi unificado. Depois da publicação, a gestão comercial unifica pelo Painel, grupo a grupo, com a prévia.

## 7. Placar

Suíte completa: **2641 aprovados / 0 falhas, 286 arquivos, todos com saída 0** (`suite.txt`, `suite-execucao.log`). Regressão dirigida antes da suíte, com todos os `comercial-*`, CRM, contratos, licitações, compras, assistente e pacote 1: todos com 0 falhas.

## 8. O que depende de dado real inexistente

- **Teste em campo da triagem:** o vínculo de cada equipamento na triagem do chamado já existe na Assistência, mas não houve teste com um chamado real de calibração em lote.
- **Mais usados:** a lista sai das propostas dos últimos 12 meses. Para a equipe nova (os representantes), ela vem da equipe até cada um ter 5 propostas.
- **Contatos:** a escolha de qual contato fica em cada um dos 52 grupos é da gestão comercial. O sistema só sugere.
